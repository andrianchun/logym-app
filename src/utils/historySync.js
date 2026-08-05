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

/** Ambil daftar id sesi dari sebuah baseline JSON (hasil serializeDay). */
export const workoutIdsFromBaseline = (baselineJson) => {
  if (!baselineJson) return [];
  try {
    const day = JSON.parse(baselineJson);
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
 * @returns {{ next: object, baseline: object, kept: string[], taken: string[] }}
 */
export const reconcileHistory = (prev, serverData, baseline) => {
  const next = { ...(prev || {}) };
  const nextBaseline = { ...(baseline || {}) };
  const kept = [];
  const taken = [];

  Object.keys(serverData || {}).forEach(d => {
    const localExists = prev && prev[d] !== undefined;
    // Tanggal yang belum pernah ada di device ini selalu aman diambil.
    const hasUnsavedLocal = localExists && serializeDay(prev[d]) !== nextBaseline[d];
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
    nextBaseline[d] = serializeDay(serverDay);
    taken.push(d);
  });

  return { next, baseline: nextBaseline, kept, taken };
};
