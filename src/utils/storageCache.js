/**
 * Utilities untuk manajemen LocalStorage & Cache Offline Logym.
 * 
 * Mencegah QuotaExceededError (batas browser ~5MB per origin) yang dapat merusak
 * sinkronisasi multi-tab Firestore (WebStorageSharedClientState).
 */

/**
 * Baca cache localStorage yang MUNGKIN RUSAK dengan fallback aman.
 */
export const readCache = (key, fallback) => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw === null) return fallback;
    const val = JSON.parse(raw);
    return val === null || val === undefined ? fallback : val;
  } catch {
    console.warn(`[Cache] ${key} rusak — dibuang, akan diisi ulang dari server.`);
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch { /* diabaikan */ }
    return fallback;
  }
};

/**
 * Bersihkan cache yang tidak esensial atau bulky jika kuota localStorage menipis.
 * Browser membatasi localStorage ~5MB per domain. Kunci generator (/generator/index.html)
 * atau riwayat chat AI lama bisa memakan 2-4MB dan memicu QuotaExceededError di Firestore multi-tab sync.
 */
export const freeLocalStorageSpace = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    // 1. Bersihkan key generator internal (sering tertinggal saat testing di localhost)
    const bulkyKeys = ['logym_exercise_registry_v3', 'logym_gen_tokens', 'logym_gen_keys'];
    bulkyKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch { /* diabaikan */ }
    });

    // 2. Bersihkan sesi chat guest AI
    try { localStorage.removeItem('lyfit_ai_sessions_guest'); } catch { /* diabaikan */ }

    // 3. Pangkas sesi chat pengguna agar hanya menyimpan 2 sesi terakhir di cache lokal
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lyfit_ai_sessions_')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw && raw.length > 30000) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 2) {
              localStorage.setItem(k, JSON.stringify(parsed.slice(0, 2)));
            }
          }
        } catch { /* diabaikan */ }
      }
    }

    // 4. Bersihkan memo / temporary keys lama
    const stalePrefixes = ['logym_backup_memo_', 'lyfit_chart_metrics', 'lyfit_prog_'];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && stalePrefixes.some(p => k.startsWith(p))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch { /* diabaikan */ }
    });
  } catch (err) {
    console.warn('[Cache] Gagal membersihkan penyimpanan lokal:', err);
  }
};

/**
 * Pangkas history untuk cache localStorage agar tidak melebihi kuota 5MB.
 * State history di memori dan di Firestore IndexedDB tetap 100% lengkap dan utuh.
 */
export const pruneHistoryForLocalCache = (historyObj, maxDays = 90, pendingDates = []) => {
  if (!historyObj || typeof historyObj !== 'object') return historyObj;
  const pendingSet = new Set(pendingDates || []);
  const allDates = Object.keys(historyObj).sort().reverse();
  const keepDates = new Set([...allDates.slice(0, maxDays), ...pendingSet]);

  const compact = {};
  for (const date of keepDates) {
    const day = historyObj[date];
    if (!day) continue;
    if (day.bioData && typeof day.bioData === 'object') {
      const { heartRateSamples, speedSamples, distanceSamples, ...restBio } = day.bioData;
      compact[date] = { ...day, bioData: restBio };
    } else {
      compact[date] = day;
    }
  }
  return compact;
};

/**
 * Tulis cache dengan proteksi kuota otomatis.
 * Jika QuotaExceededError terjadi, fungsi ini secara otomatis melakukan pembersihan darurat
 * dan memangkas history lokal jika diperlukan, lalu mencoba kembali.
 */
export const writeCache = (key, value) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    console.warn(`[Cache] gagal menulis ${key} (kuota penuh?), mencoba pembersihan otomatis...`);
    freeLocalStorageSpace();

    // Jika yang gagal ditulis adalah __CACHED_HISTORY, pangkas cache lokalnya
    if (key === '__CACHED_HISTORY' && value && typeof value === 'object') {
      try {
        const compactHistory = pruneHistoryForLocalCache(value, 60);
        localStorage.setItem(key, JSON.stringify(compactHistory));
        return true;
      } catch {
        try {
          const ultraCompact = pruneHistoryForLocalCache(value, 30);
          localStorage.setItem(key, JSON.stringify(ultraCompact));
          return true;
        } catch {
          console.warn('[Cache] Gagal menulis __CACHED_HISTORY bahkan setelah dipangkas.');
          return false;
        }
      }
    }

    // Coba simpan ulang setelah pembersihan
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      console.warn(`[Cache] gagal menulis ${key} setelah pembersihan`);
      return false;
    }
  }
};
