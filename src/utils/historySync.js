// Logika rekonsiliasi history antara state lokal, baseline (kondisi terakhir yang diketahui
// tersimpan di server), dan snapshot server. Dipisah dari App.jsx supaya bisa dites —
// ini jalur yang kalau salah, sesi latihan user hilang permanen tanpa pesan error.

// Serialisasi kanonik (key di-sort) supaya perbandingan tidak terpengaruh urutan key
// antara objek buatan lokal vs hasil decode Firestore.
export const stableStringify = (val) => {
  if (val === null || typeof val !== 'object') return JSON.stringify(val) ?? 'null';
  if (Array.isArray(val)) return '[' + val.map(v => stableStringify(v === undefined ? null : v)).join(',') + ']';
  const keys = Object.keys(val).filter(k => val[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(val[k])).join(',') + '}';
};

// Serialisasi satu hari history untuk diff auto-save (tanpa _activeSession yang per-device)
export const serializeDay = (val) => {
  if (val && typeof val === 'object') {
    const { _activeSession, ...dayData } = val;
    return stableStringify(dayData);
  }
  return stableStringify(val ?? null);
};

// ── Sidik jari hari (baseline) ──────────────────────────────────────────────────────────────
//
// Baseline dulu menyimpan serializeDay UTUH per tanggal — artinya salinan KEDUA dari seluruh
// riwayat, di localStorage yang jatahnya cuma ~5 MB dan sudah dipakai __CACHED_HISTORY. Begitu
// jatahnya habis, setItem gagal dan baseline MEMBEKU di versi lama. Akibatnya bukan sekadar
// "boot lebih lambat": rekonsiliasi lalu membaca salinan basi sebagai "perubahan lokal belum
// terkirim", menolak snapshot server, dan mengirim salinan basi itu menimpa data yang lebih
// baru dari device lain. Kehilangan data lintas device, dipicu semata-mata oleh penyimpanan penuh.
//
// Baseline tidak pernah dibaca isinya — cuma DIBANDINGKAN. Jadi yang perlu disimpan cukup sidik
// jarinya. Satu-satunya bagian yang benar-benar dibaca adalah daftar id sesi (buat mendeteksi
// penghapusan), dan itu ikut disertakan apa adanya.
//
// Bentuknya: "<panjang36>.<hash36>|<id1>,<id2>,..." — dari beberapa KB per hari jadi puluhan byte.
//
// TRADEOFF YANG DISENGAJA: hash 32-bit bisa bertabrakan, dan tabrakan berarti satu perubahan
// dianggap "tidak ada" lalu tidak pernah terkirim. Panjang string ikut dimasukkan supaya dua isi
// yang berbeda harus sama panjang DAN sama hash — peluangnya jauh di bawah peluang penyimpanan
// penuh yang jadi sebab perubahan ini. Kalau kelak terasa kurang, perlebar ke dua hash (32 bit
// dari awal + 32 bit dari akhir), jangan kembali menyimpan JSON utuh.
const hash32 = (s) => {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};

export const dayFingerprint = (day) => {
  const json = serializeDay(day);
  const ids = (day && Array.isArray(day.workouts) ? day.workouts : [])
    .map(w => String(w?.id))
    .filter(id => id !== 'undefined' && id !== 'null');
  return `${json.length.toString(36)}.${hash32(json)}|${ids.join(',')}`;
};

/**
 * Ubah baseline format lama (serializeDay utuh) jadi sidik jari.
 *
 * Tanpa ini, baseline lama di localStorage tidak akan pernah cocok dengan sidik jari yang baru:
 * SEMUA tanggal terlihat berubah dan seluruh riwayat setahun dikirim ulang sekali. Tulisannya
 * idempoten jadi tidak merusak, tapi mahal dan tidak perlu — nilai lamanya PERSIS serializeDay,
 * jadi sidik jarinya bisa dihitung langsung dari situ.
 */
export const migrateBaseline = (base) => {
  if (!base) return base;
  const out = {};
  let migrated = 0;
  Object.keys(base).forEach(d => {
    const v = base[d];
    if (typeof v !== 'string') return;
    if (v.includes('|') && /^[0-9a-z]+\.[0-9a-z]+\|/.test(v)) { out[d] = v; return; } // sudah baru
    const ids = (() => { try { return (JSON.parse(v)?.workouts || []).map(w => String(w?.id)).filter(id => id !== 'undefined'); } catch { return []; } })();
    out[d] = `${v.length.toString(36)}.${hash32(v)}|${ids.join(',')}`;
    migrated++;
  });
  if (migrated > 0) console.log(`[Baseline] ${migrated} tanggal dimigrasi ke sidik jari ringkas.`);
  return out;
};

// ── Format kabel `workouts` ────────────────────────────────────────────────────────────────
// Di dalam app, `day.workouts` itu ARRAY (93 titik baca bergantung pada itu — jangan diubah).
// Tapi di Firestore array TIDAK bisa di-merge: setDoc({merge:true}) mengganti seluruh array.
// Artinya device yang cuma mau menambah bioData ikut mengirim daftar sesi versi dia, dan
// kalau versinya basi, sesi dari device lain lenyap. Maka di kabel bentuknya MAP ber-key id,
// supaya Firestore bisa menggabungkan per-sesi. Konversinya cuma di dua fungsi ini.
//
// `_i` menyimpan urutan tampil, karena map tidak punya urutan. Tidak pernah bocor ke state app.

/** Server -> app. Menerima bentuk lama (array) maupun baru (map), supaya riwayat lama tetap terbaca. */
export const workoutsToArray = (w) => {
  if (w === undefined || w === null) return w; // hari tanpa workouts (mis. cuma bioData) — biarkan apa adanya
  if (Array.isArray(w)) return w;
  if (typeof w !== 'object') return [];
  return Object.values(w)
    .filter(v => v && typeof v === 'object')
    .sort((a, b) => (a._i ?? 0) - (b._i ?? 0))
    .map(({ _i, ...rest }) => rest);
};

/**
 * App -> server. `removedIds` diisi id sesi yang TADINYA ada di server tapi sekarang tidak lagi;
 * dengan merge map, key yang tidak disebut itu dibiarkan hidup, jadi penghapusan harus eksplisit.
 * @param {Array} list - day.workouts versi app
 * @param {string[]} removedIds
 * @param {*} deleteSentinel - deleteField() dari Firestore (di-inject supaya file ini bisa dites)
 */
export const workoutsToMap = (list, removedIds = [], deleteSentinel = null) => {
  const map = {};
  (Array.isArray(list) ? list : []).forEach((w, i) => {
    if (w && w.id !== undefined && w.id !== null) map[String(w.id)] = { ...w, _i: i };
  });
  removedIds.forEach(id => { if (!(String(id) in map)) map[String(id)] = deleteSentinel; });
  return map;
};

/**
 * Ambil daftar id sesi dari sebuah entri baseline.
 *
 * Menerima sidik jari baru ("len.hash|id1,id2") maupun serializeDay utuh dari versi lama —
 * baseline lama masih hidup di localStorage sampai migrateBaseline sempat jalan, dan salah baca
 * di sini berarti penghapusan sesi tidak pernah terkirim (sesi yang dihapus muncul lagi).
 */
export const workoutIdsFromBaseline = (entry) => {
  if (!entry || typeof entry !== 'string') return [];
  const bar = entry.indexOf('|');
  if (bar >= 0 && /^[0-9a-z]+\.[0-9a-z]+$/.test(entry.slice(0, bar))) {
    return entry.slice(bar + 1).split(',').filter(Boolean);
  }
  try {
    const day = JSON.parse(entry);
    return (day?.workouts || []).map(w => String(w?.id)).filter(id => id !== 'undefined');
  } catch { return []; }
};

/**
 * Membersihkan data secara rekursif dari nilai `undefined` sebelum dikirim ke Firestore.
 * Firestore melempar error fatal jika ada properti bersarang bernilai `undefined`.
 * FieldValue spesial (seperti deleteField()) tetap dipertahankan.
 */
export const cleanFirestoreData = (obj) => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj._methodName || (obj.constructor && obj.constructor.name === 'FieldValue')) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanFirestoreData(item));
  }
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned;
};

/**
 * Diff per-field untuk dokumen utama (programs, exerciseLibrary, settings.*, userAchievements).
 *
 * Dokumen utama dulu ditulis UTUH setiap kali menyimpan: seluruh isi `settings` versi device
 * ini dikirim, termasuk field yang device ini tidak pernah sentuh. Kalau nilainya basi, dia
 * menimpa perubahan device lain — mis. gym yang baru dibuat di HP hilang karena PWA menyimpan
 * preferensi lain sambil membawa daftar gym versi lamanya.
 *
 * Dengan diff ini, yang terkirim hanya field yang benar-benar berubah di device ini.
 *
 * @param {object} local - map nama field -> nilai sekarang
 * @param {object|null} baseline - map nama field -> stableStringify terakhir yang tersimpan
 * @returns {{ changed: object, nextBaseline: object, changedKeys: string[] }}
 */
export const diffFields = (local, baseline) => {
  const base = baseline || {};
  const changed = {};
  const changedKeys = [];
  const nextBaseline = { ...base };

  Object.keys(local || {}).forEach(k => {
    if (local[k] === undefined) return; // Firestore menolak undefined — jangan pernah kirim
    const cleanedVal = cleanFirestoreData(local[k]);
    const json = stableStringify(cleanedVal);
    if (base[k] === json) return;
    changed[k] = cleanedVal;
    changedKeys.push(k);
    nextBaseline[k] = json;
  });

  return { changed, nextBaseline, changedKeys };
};

// Berapa tanggal yang boleh dihapus otomatis dalam SATU snapshot. Di atas ini, penghapusannya
// ditahan dan dilaporkan ke user — lihat alasannya di reconcileHistory.
// Ini knob kalibrasi: 3 muat untuk "hapus beberapa sesi sekaligus" tapi jauh di bawah bentuk
// kehilangan massal, yang selalu puluhan sampai ratusan tanggal.
export const MAX_AUTO_DELETE = 3;

/**
 * Gabungkan snapshot server ke state lokal, per tanggal.
 *
 * Aturannya berbasis ISI, bukan waktu:
 * - Tanggal yang versi lokalnya masih sama dengan baseline = tidak ada perubahan lokal yang
 *   belum terkirim → ambil versi server, dan geser baselinenya ke versi server itu.
 * - Tanggal yang versi lokalnya BEDA dari baseline = ada perubahan lokal yang belum sampai
 *   server → pertahankan versi lokal, dan baselinenya sengaja TIDAK digeser supaya auto-save
 *   masih melihatnya sebagai perlu dikirim.
 *
 * Versi lama memutuskan berdasarkan stempel waktu "baru saja menulis" lalu membuang seluruh
 * snapshot — tapi tetap menggeser baseline ke versi server. Auto-save berikutnya lalu
 * menyimpulkan data lokal yang basi itu "berubah" dan mengirimnya menimpa data server yang
 * lebih baru. Itu jalur hilangnya sesi latihan antar device.
 *
 * @param {object} prev - state history lokal sekarang
 * @param {object} serverData - isi dokumen history dari Firestore
 * @param {object|null} baseline - map tanggal -> serializeDay terakhir yang diketahui tersimpan
 * @param {string|null} snapshotYear - (Opsional) tahun dari dokumen snapshot ini (misal "2026").
 * @returns {{ next: object, baseline: object, kept: string[], taken: string[] }}
 */
export const reconcileHistory = (prev, serverData, baseline, snapshotYear) => {
  const next = { ...(prev || {}) };
  const nextBaseline = { ...(baseline || {}) };
  const kept = [];
  const taken = [];

  // 1. Ambil semua perubahan/penambahan dari server
  Object.keys(serverData || {}).forEach(d => {
    const localExists = prev && prev[d] !== undefined;
    // Tanggal yang belum pernah ada di device ini selalu aman diambil.
    const hasUnsavedLocal = localExists && dayFingerprint(prev[d]) !== nextBaseline[d];
    if (hasUnsavedLocal) { kept.push(d); return; }

    const serverDay = serverData[d] && typeof serverData[d] === 'object'
      ? { ...serverData[d], ...(serverData[d].workouts !== undefined ? { workouts: workoutsToArray(serverData[d].workouts) } : {}) }
      : serverData[d];

    next[d] = {
      ...serverDay,
      // _activeSession itu state sesi berjalan milik device ini, tidak pernah disinkron —
      // jangan sampai ikut tertimpa versi server.
      ...(prev?.[d]?._activeSession ? { _activeSession: prev[d]._activeSession } : {})
    };
    // Baseline selalu dalam bentuk APP (workouts sebagai array), sama seperti yang nanti
    // dibandingkan auto-save. Jangan pernah menyimpan bentuk kabel di sini.
    nextBaseline[d] = dayFingerprint(serverDay);
    taken.push(d);
  });

  // 2. Hapus tanggal yang hilang di server, tapi masih menyangkut di memori lokal.
  // Jika snapshot ini adalah dokumen "2026", maka tanggal apa pun di tahun "2026"
  // yang tidak ada di `serverData` berarti sudah dihapus di server.
  const blockedDeletes = [];
  if (snapshotYear) {
    const calonHapus = Object.keys(next).filter(d =>
      d.startsWith(snapshotYear)
      && (!serverData || serverData[d] === undefined)
      // Tanggal dengan perubahan lokal tertunda tidak pernah jadi calon — dipertahankan di bawah.
      && dayFingerprint(prev?.[d]) === nextBaseline[d]
    );

    // PEMUTUS ARUS. Penghapusan yang WAJAR selalu sedikit: user menghapus satu sesi, satu hari.
    // Kehilangan massal punya bentuk lain — skrip debug yang salah sasaran, migrasi setengah
    // jalan, atau dokumen tahunan yang terpotong. Bentuk itu tidak boleh diikuti diam-diam,
    // karena begitu diikuti, salinan lokal (satu-satunya sisa datanya) ikut tertimpa.
    //
    // Menahan lebih aman daripada menghapus: data yang tertahan padahal memang sengaja dihapus
    // cuma muncul lagi sampai penghapusannya dikirim ulang. Kebalikannya tidak bisa dibatalkan.
    if (calonHapus.length > MAX_AUTO_DELETE) {
      blockedDeletes.push(...calonHapus);
    } else {
      calonHapus.forEach(d => { delete next[d]; delete nextBaseline[d]; });
    }

    // Yang punya perubahan lokal tertunda tetap dipertahankan seperti sebelumnya.
    Object.keys(next).forEach(d => {
      if (d.startsWith(snapshotYear) && (!serverData || serverData[d] === undefined)
          && dayFingerprint(prev?.[d]) !== nextBaseline[d]) {
        kept.push(d);
      }
    });
  }

  return { next, baseline: nextBaseline, kept, taken, blockedDeletes };
};

/**
 * Gabungkan isi sebuah backup ke history yang ada — MENAMBAH, tidak pernah menimpa.
 *
 * Versi lama restoreFromBackup berhenti di `if (next[d] !== undefined) return`: tanggal yang
 * sudah ada dilewati utuh. Itu membuat backup tidak berguna persis di kasus yang paling
 * membutuhkannya — tanggal yang ADA tapi sesinya hilang, misalnya karena versi server yang
 * `workouts`-nya kosong menimpa versi lokal. Yang muncul cuma "tidak ada yang perlu dipulihkan",
 * padahal sesinya ada di dalam backup.
 *
 * Sekarang penggabungannya per SESI: sesi di backup yang id-nya belum ada di tanggal itu
 * ditambahkan; sesi yang sudah ada tidak pernah disentuh, dan tidak ada yang dihapus. Aturan
 * "menambah saja" ini yang membuat tombol Pulihkan aman ditekan berkali-kali.
 *
 * @returns {{ next: object, tanggalBaru: number, sesiDitambal: number }}
 */
export const mergeBackupIntoHistory = (history, backupData) => {
  const next = { ...(history || {}) };
  let tanggalBaru = 0;
  let sesiDitambal = 0;

  Object.keys(backupData || {}).forEach((d) => {
    const { _activeSession, _delete, ...bersih } = backupData[d] || {};
    if (_delete) return;

    if (next[d] === undefined) {
      next[d] = bersih;
      tanggalBaru++;
      return;
    }

    const sekarang = Array.isArray(next[d].workouts) ? next[d].workouts : [];
    const idSekarang = new Set(sekarang.map((w) => String(w?.id)));
    const tambahan = (Array.isArray(bersih.workouts) ? bersih.workouts : [])
      .filter((w) => w?.id !== undefined && w?.id !== null && !idSekarang.has(String(w.id)));

    let ditambalDiSesiLama = 0;
    const updatedWorkouts = sekarang.map(wCur => {
      const wBackup = (Array.isArray(bersih.workouts) ? bersih.workouts : []).find(w => String(w?.id) === String(wCur?.id));
      if (!wBackup) return wCur;

      const curKeys = new Set(Object.keys(wCur.log || {}));
      const backupKeys = Object.keys(wBackup.log || {});
      const hasMissingLogKeys = backupKeys.some(k => !curKeys.has(k));

      const curExIds = new Set((wCur.exercises || wCur.overriddenExercises || []).map(e => String(e.id)));
      const backupExs = wBackup.exercises || wBackup.overriddenExercises || [];
      const missingExs = backupExs.filter(e => !curExIds.has(String(e.id)));

      if (hasMissingLogKeys || missingExs.length > 0) {
        ditambalDiSesiLama++;
        const mergedLog = { ...(wBackup.log || {}), ...(wCur.log || {}) };
        const mergedExercises = [...(wCur.exercises || wCur.overriddenExercises || []), ...missingExs];
        return {
          ...wCur,
          log: mergedLog,
          ...(wCur.exercises ? { exercises: mergedExercises } : {}),
          ...(wCur.overriddenExercises ? { overriddenExercises: mergedExercises } : {})
        };
      }
      return wCur;
    });

    if (tambahan.length > 0 || ditambalDiSesiLama > 0) {
      next[d] = { ...next[d], workouts: [...updatedWorkouts, ...tambahan] };
      sesiDitambal += (tambahan.length + ditambalDiSesiLama);
    }
  });

  return { next, tanggalBaru, sesiDitambal };
};

/**
 * Apakah SEMUA set sesi ini sudah tercentang — "selesai dikerjakan", terlepas dari sudah
 * tersimpan atau belum. Inilah aturan di balik badge "Belum disimpan" di kalender.
 *
 * Diangkat dari checkIsCompletedStrict di CalendarTab supaya cuma ada SATU aturan. Sebelumnya
 * aturan itu terkunci di dalam closure komponen, jadi jalur simpan tidak punya cara memakainya
 * dan terpaksa akan menebak ulang — dua definisi "selesai" yang bisa berbeda jawaban adalah
 * persis cara sesi menggantung tanpa ada yang sadar.
 *
 * @param {object} workout sesi yang diperiksa
 * @param {Array} exercises daftar latihan milik sesi itu (pemanggil yang meresolve)
 * @param {object} exerciseLogs log satu HARI
 * @param {object} skippedExercises latihan yang dilewati, satu HARI
 */
export const isSessionFullyLogged = (workout, exercises, exerciseLogs, skippedExercises) => {
  if (!workout || !Array.isArray(exercises) || exercises.length === 0) return false;
  const aktif = exercises.filter((ex) => {
    if (!ex) return false;
    const baseId = ex.originalId || ex.id;
    return !skippedExercises?.[`${baseId}-${workout.id}`] &&
           !skippedExercises?.[`${ex.id}-${workout.id}`] &&
           !skippedExercises?.[ex.id] &&
           !skippedExercises?.[baseId];
  });
  if (aktif.length === 0) return false;
  return aktif.every((ex) => {
    const baseId = ex.originalId || ex.id;
    const logs = exerciseLogs?.[`${baseId}-${workout.id}`] ||
                 exerciseLogs?.[`${ex.id}-${workout.id}`] ||
                 exerciseLogs?.[ex.id] ||
                 exerciseLogs?.[baseId] || [];
    const arr = Array.isArray(logs) ? logs : Object.values(logs || {});
    return arr.length > 0 && arr.every((s) => s?.done && !s?.skipped);
  });
};

/**
 * Sesi lain di hari yang sama yang setnya sudah tercentang penuh tapi BELUM tersimpan.
 *
 * Kenapa ini ada: sesi yang belum tersimpan hidup di `exerciseLogs`/`_activeSession`, dan
 * `_activeSession` sengaja dibuang sebelum ditulis ke cloud. Artinya sesi "Belum disimpan" itu
 * ada di SATU perangkat saja — bentuk yang sama persis dengan kehilangan data. Menyimpan sesi
 * kedua sementara sesi pertama dibiarkan menggantung berarti membiarkan data itu tetap rapuh.
 *
 * Yang setnya BELUM penuh sengaja tidak ikut: user mungkin masih mengerjakannya, dan menutup
 * sesi yang masih berjalan tidak bisa dibatalkan.
 *
 * @param {Array} workouts sesi-sesi hari itu
 * @param {Function} exercisesOf (workout) => daftar latihannya
 * @param {object} exerciseLogs log satu HARI (yang TERSISA setelah sesi target diambil)
 * @param {object} skippedExercises latihan dilewati, satu HARI
 * @param {Set|Array} idDikecualikan id sesi yang sedang/sudah disimpan di putaran ini
 * @returns {string[]} id sesi yang layak ikut disimpan
 */
export const sessionsPendingSave = (workouts, exercisesOf, exerciseLogs, skippedExercises, idDikecualikan = []) => {
  const kecuali = new Set([...(idDikecualikan || [])].map(String));
  return (workouts || [])
    .filter((w) => w && w.status !== 'completed' && !kecuali.has(String(w.id)))
    .filter((w) => isSessionFullyLogged(w, exercisesOf(w) || [], exerciseLogs, skippedExercises))
    .map((w) => String(w.id));
};
