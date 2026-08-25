/**
 * ExerciseDB API Service
 * Endpoint: https://oss.exercisedb.dev/api/v1/exercises
 * Free, no API key needed. Provides ~1500 exercises with GIFs.
 */

import { equipmentOptions } from '../data/constants.js';

// Database latihan di-serve dari public/exercisedb.json dan di-fetch on-demand,
// supaya JSON ~1MB tidak ikut membebani parse bundle JS utama saat startup.
const LOCAL_DB_URL = '/exercisedb.json';

const ytVideoMap = {
  'smith machine incline bench press': 'https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX',
  'seated cable rows': 'https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz',
  'dumbbell bench press': 'https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii',
  'flat dumbbell bench press': 'https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii',
  'cable seated lateral raise': 'https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA',
  'cable lateral raise': 'https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA',
  'cable lateral raises': 'https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA',
  'triceps pushdown': 'https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne',
  'cable triceps pushdown': 'https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne',
  'dumbbell alternate bicep curl': 'https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO',
  'smith machine squat': 'https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC',
  'barbell romanian deadlift': 'https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6 https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC',
  'barbell walking lunge': 'https://youtu.be/mJilHWIBWO8?si=2NCYOofB0EUrY22X',
  'rocking standing calf raise': 'https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek',
  'cable crunch': 'https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V',
  'wide-grip lat pulldown': 'https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf',
  'lat pulldown': 'https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf',
  'dumbbell shoulder press': 'https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub',
  'dumbbell shrug': 'https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby',
  'smith machine bench press': 'https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_',
  'cable rear delt fly': 'https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I https://youtu.be/IeOqdw9WI90?si=J4oHxFNn7257r3ak',
  'cable rope overhead triceps extension': 'https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yUToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_',
  'high cable curls': 'https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj',
  'split squat with dumbbells': 'https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn',
  'pull through': 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G',
  'cable pull through': 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G',
  'seated calf raise': 'https://youtu.be/ar8nav0jGoE?si=owieb0xbPHFg7zMA',
  'plank': 'https://youtu.be/xe2MXatLTUw?si=U5L4UwgiNv19R7lh'
};

// =============================================
// MAPPING: Nama Otot (English → Indonesian)
// =============================================
export const muscleNameMap = {
  // Body Parts
  'chest': 'Dada Tengah',
  'upper chest': 'Dada Atas',
  'back': 'Punggung Atas',
  'middle back': 'Punggung Atas',
  'lower back': 'Lats',
  'shoulders': 'Deltoid Depan',
  'upper arms': 'Biceps',
  'lower arms': 'Biceps',
  'waist': 'Core',
  'upper legs': 'Quads',
  'lower legs': 'Calves',
  'cardio': 'Cardio',
  'neck': 'Leher',

  // Target Muscles
  'pectorals': 'Dada Tengah',
  'serratus anterior': 'Dada Bawah',
  'delts': 'Deltoid Depan',
  'anterior deltoids': 'Deltoid Depan',
  'lateral deltoids': 'Deltoid Samping',
  'posterior deltoids': 'Deltoid Belakang',
  'traps': 'Traps',
  'trapezius': 'Traps',
  'lats': 'Lats',
  'latissimus dorsi': 'Lats',
  'upper back': 'Punggung Atas',
  'rhomboids': 'Punggung Atas',
  'levator scapulae': 'Traps',
  'spine': 'Lats',
  'erector spinae': 'Lats',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearms': 'Forearm',
  'brachialis': 'Biceps',
  'brachioradialis': 'Biceps',
  'wrist extensors': 'Forearm',
  'wrist flexors': 'Forearm',
  'quads': 'Quads',
  'quadriceps': 'Quads',
  'hamstrings': 'Hams',
  'glutes': 'Glutes',
  'gluteus maximus': 'Glutes',
  'gluteus medius': 'Glutes',
  'adductors': 'Paha Dlm',
  'abductors': 'Paha Luar',
  'calves': 'Calves',
  'gastrocnemius': 'Calves',
  'soleus': 'Calves',
  'abs': 'Core',
  'abdominals': 'Core',
  'rectus abdominis': 'Core',
  'obliques': 'Core',
  'transverse abdominis': 'Core',
  'cardiovascular system': 'Cardio',
};

// =============================================
// MAPPING: Equipment (API → LyFit format)
// =============================================
const capitalizeWords = (str) => {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * Translate muscle name dari English ke Indonesian
 */
export const translateMuscle = (name) => {
  if (!name) return 'Full Body';
  const lower = name.toLowerCase().trim();
  return muscleNameMap[lower] || name;
};

/**
 * Translate equipment name dari API ke format LyFit
 * Karena kita sudah mendukung semua alat API, cukup di-Title Case.
 */
export const translateEquipment = (name) => {
  if (!name) return 'Lainnya';
  const lower = name.toLowerCase().trim();
  if (lower === 'body weight') return 'Body Weight';
  if (lower === 'ez barbell') return 'EZ Barbell';
  return capitalizeWords(lower);
};

/**
 * Konversi 1 exercise dari format ExerciseDB API → format LyFit
 */
export const mapToLyFitFormat = (apiEx) => {
  // Gabungkan target muscles & secondary muscles, deduplikasi setelah translate
  const allMuscles = [
    ...(apiEx.targetMuscles || []),
    ...(apiEx.secondaryMuscles || []).slice(0, 2), // Ambil max 2 secondary
  ];

  let translatedTargets = [...new Set(allMuscles.map(m => translateMuscle(m)))];
  
  const exNameLower = (apiEx.name || '').toLowerCase();
  
  // Smart Parsing untuk Dada (Chest) karena API tidak membedakan Upper/Mid/Lower
  if (translatedTargets.includes('Dada Tengah') || translatedTargets.includes('Dada Atas') || translatedTargets.includes('Dada Bawah')) {
      // Hapus semua target dada bawaan dulu
      translatedTargets = translatedTargets.filter(t => !['Dada Tengah', 'Dada Atas', 'Dada Bawah'].includes(t));
      
      if (exNameLower.includes('incline')) {
          translatedTargets.push('Dada Atas');
      } else if (exNameLower.includes('decline') || exNameLower.includes('dips')) {
          translatedTargets.push('Dada Bawah');
      } else {
          translatedTargets.push('Dada Tengah');
      }
  }

  // Smart Parsing untuk Bahu (Shoulders)
  if (translatedTargets.includes('Deltoid Depan') || translatedTargets.includes('Deltoid Samping') || translatedTargets.includes('Deltoid Belakang')) {
      translatedTargets = translatedTargets.filter(t => !['Deltoid Depan', 'Deltoid Samping', 'Deltoid Belakang'].includes(t));
      
      if (exNameLower.includes('lateral') || exNameLower.includes('side')) {
          translatedTargets.push('Deltoid Samping');
      } else if (exNameLower.includes('rear') || exNameLower.includes('back fly') || exNameLower.includes('face pull') || exNameLower.includes('reverse fly')) {
          translatedTargets.push('Deltoid Belakang');
      } else if (exNameLower.includes('front') || exNameLower.includes('forward')) {
          translatedTargets.push('Deltoid Depan');
      } else {
          // Fallback
          translatedTargets.push('Deltoid Depan');
      }
  }

  // Tentukan equipment — ambil yang pertama
  const rawEquipment = apiEx.equipments?.[0] || '';
  const equipment = translateEquipment(rawEquipment);

  // Tentukan tipe latihan
  const isCardio = translatedTargets.includes('Cardio') || 
    (apiEx.bodyParts || []).some(bp => bp.toLowerCase() === 'cardio');
  const type = apiEx.type || (isCardio ? 'cardio' : 'weight');

  // Inject user custom youtube videos if available
  const mappedYtVideo = ytVideoMap[apiEx.name?.toLowerCase()] || apiEx.ytVideo || apiEx.videoUrl || '';

  return {
    id: `edb-${apiEx.exerciseId || apiEx.name?.replace(/\s+/g, '_')}`,
    name: capitalizeWords(apiEx.name || 'Unknown Exercise'),
    target: translatedTargets.length > 0 ? translatedTargets : ['Full Body'],
    type,
    equipment: (apiEx.source === 'logym_master' && apiEx.equipments?.[0]) ? apiEx.equipments[0] : equipment,
    defaultWeight: apiEx.defaultWeight !== undefined ? apiEx.defaultWeight : 0,
    videoUrl: apiEx.videoUrl || mappedYtVideo,
    thumbnailUrl: apiEx.thumbnailUrl || '',
    ytVideo: mappedYtVideo,
    gifUrl: apiEx.gifUrl || '',
    instructions: apiEx.instructions_id || apiEx.instructions || [],
    instructions_id: apiEx.instructions_id || apiEx.instructions || [],
    instructions_en: apiEx.instructions_en || apiEx.instructions || [],
    source: apiEx.source || 'exercisedb',
  };
};


/**
 * Ambil semua exercises dari database lokal (public/exercisedb.json).
 * Menggantikan panggilan API karena limitasi API gratis.
 * Returns array format LyFit.
 */
export let cachedMappedExercises = null;
let loadPromise = null;

/**
 * Akses sinkron ke cache. Mengembalikan [] jika belum termuat,
 * sambil memicu load di background — komponen akan dapat data pada render berikutnya.
 * (App.jsx juga melakukan prefetch saat idle agar cache hampir selalu siap.)
 */
export const getCachedExercises = () => {
  if (!cachedMappedExercises) {
    fetchExercisesFromApi();
    return [];
  }
  return cachedMappedExercises;
};

export const fetchExercisesFromApi = async () => {
  if (cachedMappedExercises) return cachedMappedExercises;

  if (!loadPromise) {
    loadPromise = fetch(LOCAL_DB_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(raw => {
        cachedMappedExercises = raw.map(mapToLyFitFormat);
        return cachedMappedExercises;
      })
      .catch(error => {
        console.error('Gagal meload ExerciseDB lokal:', error);
        loadPromise = null; // izinkan retry pada panggilan berikutnya
        return [];
      });
  }
  return loadPromise;
};

export const clearExerciseDbCache = () => {
  // Tidak perlu melakukan apa-apa karena menggunakan database lokal
};

const STOP_WORDS = new Set([
  'apakah', 'ada', 'gak', 'ga', 'nggak', 'tidak', 'di', 'dalam', 'database', 'db', 'atau', 'apa',
  'gerakan', 'latihan', 'exercise', 'exercises', 'gimana', 'bagaimana', 'cara', 'bisa', 'tolong',
  'buat', 'bikin', 'mau', 'yang', 'dan', 'untuk', 'ini', 'itu', 'dong', 'ya', 'sih', 'mohon',
  'minta', 'tanya', 'coach', 'logy', 'is', 'are', 'in', 'the', 'of', 'to', 'a', 'an', 'on', 'for',
  'with', 'about', 'do', 'does', 'have', 'has', 'there', 'any', 'tell', 'show', 'list', 'know'
]);

/**
 * Pilih latihan dari katalog 873 gerakan yang RELEVAN dengan satu pertanyaan.
 *
 * Logy mencocokkan:
 * 1. Nama latihan (mis. "ab crunch" langsung mencocokkan Ab Crunch Machine, Cable Crunch, dll.)
 * 2. Istilah otot (Inggris & Indonesia, termasuk singkatan seperti ab/abs/perut -> Core)
 * 3. Alat latihan (Dumbbell, Barbell, Cable, Machine, Body Weight, dll.)
 */
export const pickRelevantExercises = (question, db, max = 35) => {
  const q = String(question || '').toLowerCase().trim();
  if (!q || !Array.isArray(db) || db.length === 0) return [];

  // Istilah otot: kunci muscleNameMap (Inggris) + hasil terjemahannya (Indonesia), plus alias sehari-hari
  const istilahOtot = new Map();
  Object.entries(muscleNameMap).forEach(([en, id]) => {
    istilahOtot.set(en.toLowerCase(), id);
    istilahOtot.set(id.toLowerCase(), id);
  });
  [
    ['ab', 'Core'], ['abs', 'Core'], ['perut', 'Core'], ['sixpack', 'Core'], ['oblique', 'Core'], ['obliques', 'Core'],
    ['dada', 'Dada'], ['chest', 'Dada'], ['pecs', 'Dada'], ['pektoris', 'Dada'],
    ['punggung', 'Punggung'], ['back', 'Punggung'], ['sayap', 'Lats'], ['lats', 'Lats'], ['traps', 'Traps'],
    ['bahu', 'Deltoid'], ['shoulder', 'Deltoid'], ['shoulders', 'Deltoid'], ['delts', 'Deltoid'],
    ['lengan', 'Biceps'], ['arm', 'Biceps'], ['arms', 'Biceps'], ['bisep', 'Biceps'], ['bicep', 'Biceps'], ['biceps', 'Biceps'],
    ['trisep', 'Triceps'], ['tricep', 'Triceps'], ['triceps', 'Triceps'], ['forearm', 'Forearm'],
    ['kaki', 'Quads'], ['leg', 'Quads'], ['legs', 'Quads'], ['paha', 'Quads'], ['quads', 'Quads'], ['quadriceps', 'Quads'],
    ['hams', 'Hams'], ['hamstring', 'Hams'], ['hamstrings', 'Hams'], ['betis', 'Calves'], ['calves', 'Calves'],
    ['bokong', 'Glutes'], ['pantat', 'Glutes'], ['glute', 'Glutes'], ['glutes', 'Glutes']
  ].forEach(([kata, target]) => istilahOtot.set(kata.toLowerCase(), target));

  const ototDicari = [];
  istilahOtot.forEach((target, kata) => {
    // Regex boundary check atau substring match yang aman
    const re = new RegExp(`\\b${kata}\\b`, 'i');
    if (re.test(q) || (kata.length >= 4 && q.includes(kata))) {
      ototDicari.push(target.toLowerCase());
    }
  });

  const alatDicari = equipmentOptions
    .map(e => e.toLowerCase())
    .filter(e => {
      const re = new RegExp(`\\b${e}\\b`, 'i');
      return re.test(q);
    });

  // Ekstrak kata kunci nama (di luar stop-words)
  const rawWords = q.replace(/[^a-z0-9\s-]/gi, ' ').split(/\s+/).filter(Boolean);
  const nameKeywords = rawWords.filter(w => w.length >= 2 && !STOP_WORDS.has(w));

  // Kalau tidak ada otot, alat, maupun kata kunci nama yang dicari, return kosong
  if (ototDicari.length === 0 && alatDicari.length === 0 && nameKeywords.length === 0) {
    return [];
  }

  const cleanQ = q.replace(/[^a-z0-9\s]/gi, ' ');

  const skor = (ex) => {
    const exName = String(ex.name || '').toLowerCase();
    const target = (ex.target || []).join(' ').toLowerCase();
    const alat = String(ex.equipment || '').toLowerCase();
    let n = 0;

    // 1. Name matches (bobot tertinggi)
    if (cleanQ.includes(exName) || exName.includes(cleanQ.trim())) {
      n += 25; // Exact/near-exact full match
    }

    let keywordHits = 0;
    for (const kw of nameKeywords) {
      if (exName.includes(kw)) {
        keywordHits++;
        n += kw.length >= 4 ? 8 : 4;
      }
    }
    if (keywordHits >= 2) n += 10; // multi-keyword match bonus (misal "ab" + "crunch")

    // 2. Muscle target matches
    if (ototDicari.some(m => target.includes(m))) {
      n += 3;
    }

    // 3. Equipment matches
    if (alatDicari.length > 0) {
      if (alatDicari.some(a => alat.includes(a) || a.includes(alat))) {
        n += 2;
      } else {
        n -= 1; // Alat diminta tapi tidak cocok
      }
    }

    return n;
  };

  return db
    .map(ex => ({ ex, n: skor(ex) }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map(x => x.ex);
};
