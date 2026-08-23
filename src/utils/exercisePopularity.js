// ============================================================
// POPULARITAS LATIHAN LINTAS-PENGGUNA
//
// Satu dokumen per latihan di `logym_exercise_stats/{slug}`, isinya { name, count }. Tiap sesi
// yang diselesaikan menambah 1 ke tiap latihan di dalamnya, lewat FieldValue.increment supaya
// dua perangkat yang menulis bersamaan tidak saling menimpa.
//
// Kenapa per-dokumen, bukan SATU dokumen berisi map: dokumen dengan map beranak-pinak persis
// yang meledakkan kuota index entry di history_years bulan ini. Per-dokumen juga menyebar beban
// tulis, bukan menumpuk di satu baris.
// ============================================================
import { db } from '../firebase';
import { doc, setDoc, getDocs, query, collection, orderBy, limit, increment } from 'firebase/firestore';

const COLL = 'logym_exercise_stats';
const CACHE_KEY = 'lyfit_exercise_popularity';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TOP_N = 500;

// Nama latihan -> id dokumen. Firestore melarang '/' di id dan menolak id kosong; sisanya
// dinormalkan supaya "Bench Press", "bench press ", dan "Bench  Press" jadi satu baris.
export const exerciseSlug = (name) => {
  const s = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\//g, '-');
  return s.slice(0, 300);
};

/**
 * Tambah hitungan pemakaian untuk latihan-latihan sebuah sesi yang baru selesai.
 *
 * `dedupeKey` (id sesi) dicatat di localStorage: satu sesi cuma boleh menyumbang sekali, kalau
 * tidak sinkron ulang atau buka-tutup app bakal menggelembungkan angkanya sendiri.
 *
 * Sengaja tidak pernah melempar — ini statistik hiasan, gagalnya tidak boleh mengganggu
 * penyimpanan sesi.
 */
export const bumpExercisePopularity = async (exerciseNames, dedupeKey) => {
  const memo = dedupeKey ? `lyfit_pop_bumped_${dedupeKey}` : null;
  if (memo && localStorage.getItem(memo)) return 0;

  // Satu nama dihitung sekali per sesi walau muncul di beberapa baris log.
  const unique = [...new Set((exerciseNames || []).map(exerciseSlug).filter(Boolean))];
  if (unique.length === 0) return 0;

  const names = {};
  (exerciseNames || []).forEach(n => { const s = exerciseSlug(n); if (s && !names[s]) names[s] = String(n).trim(); });

  try {
    await Promise.all(unique.map(slug =>
      setDoc(doc(db, COLL, slug), { name: names[slug] || slug, count: increment(1) }, { merge: true })
    ));
    if (memo) localStorage.setItem(memo, '1');
    return unique.length;
  } catch (e) {
    console.warn('bumpExercisePopularity gagal:', e);
    return 0;
  }
};

export const getCachedPopularity = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      return cached.scores || {};
    }
  } catch { /* ignore */ }
  return {};
};

/**
 * Ambil peringkat global: { slug: count }. Di-cache 24 jam di localStorage — daftar ini berubah
 * pelan, sementara membacanya berarti ratusan pembacaan dokumen tiap kali tab Database dibuka.
 */
export const fetchExercisePopularity = async ({ force = false } = {}) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw && !force) {
      const cached = JSON.parse(raw);
      if (Date.now() - (cached.at || 0) < CACHE_TTL_MS) return cached.scores || {};
    }
  } catch { /* cache rusak — ambil ulang */ }

  try {
    const snap = await getDocs(query(collection(db, COLL), orderBy('count', 'desc'), limit(TOP_N)));
    const scores = {};
    snap.forEach(d => { scores[d.id] = d.data()?.count || 0; });
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), scores })); } catch { /* penuh */ }
    return scores;
  } catch (e) {
    // Offline atau izin belum ter-deploy: pakai cache basi kalau ada, daripada kehilangan urutan.
    console.warn('fetchExercisePopularity gagal:', e);
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}').scores || {}; } catch { return {}; }
  }
};
