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
    const json = stableStringify(local[k]);
    if (base[k] === json) return;
    changed[k] = local[k];
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
