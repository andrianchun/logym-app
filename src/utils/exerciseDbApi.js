/**
 * ExerciseDB API Service
 * Endpoint: https://oss.exercisedb.dev/api/v1/exercises
 * Free, no API key needed. Provides ~1500 exercises with GIFs.
 */

import localExerciseDb from '../data/exercisedb.json';

const API_BASE = 'https://oss.exercisedb.dev/api/v1/exercises?limit=1500';
const CACHE_KEY = 'lyfit_exercisedb_cache';
const CACHE_EXPIRY_KEY = 'lyfit_exercisedb_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 jam

const ytVideoMap = {
  'smith machine incline bench press': 'https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX',
  'seated cable rows': 'https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz',
  'dumbbell bench press': 'https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii',
  'cable seated lateral raise': 'https://youtu.be/9ilIKuy6B0g?si=d4LHAcUC86am2QQA',
  'triceps pushdown': 'https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3 https://youtu.be/u36jNfqh8_U?si=AEMeWXqnBvpOWNOj https://youtu.be/9qupVR7pKtk?si=FtLIHZmKuqXcK0ne',
  'dumbbell alternate bicep curl': 'https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG https://youtu.be/_aoad2yuP5w?si=PRXDFoozz45AB_VO',
  'smith machine squat': 'https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL https://youtu.be/LwsG-1xgP2E?si=Ptr7dUVcsJFKMLYC',
  'barbell romanian deadlift': 'https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6 https://youtu.be/xWnlfJaQZ3k?si=z0FRk3rh4UO7JdUC',
  'barbell walking lunge': 'https://youtu.be/mJilHWIBWO8?si=2NCYOofB0EUrY22X',
  'rocking standing calf raise': 'https://youtu.be/wdOkFomQNp8?si=PWlxiKYPBMlfLoek',
  'cable crunch': 'https://youtu.be/K2m0jj6RfYg?si=CZMLt6PF0Yxvgb6V',
  'wide-grip lat pulldown': 'https://youtu.be/bNmvKpJSWKM?si=E7zZ3a3qeG4Ij7bb https://youtu.be/7Cjc_aXoQ_I?si=ZqhPV5iSMoTOLSIf',
  'dumbbell shoulder press': 'https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC https://youtu.be/E7ngsffMPR0?si=FJGsgUxb7aoAZ_ub',
  'dumbbell shrug': 'https://youtu.be/rFsSeClGnNA?si=EfUCHpJdjSbWFObO https://youtu.be/2BrmhGze7sk?si=PSt1tUQjaI2liYby',
  'smith machine bench press': 'https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_',
  'cable rear delt fly': 'https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I https://youtu.be/IeOqdw9WI90?si=J4oHxFNn7257r3ak',
  'cable rope overhead triceps extension': 'https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yUToU https://youtu.be/NTk0Igxqcsk?si=zX7dHQL0VyHURoC_',
  'high cable curls': 'https://youtu.be/CrbTqNOlFgE?si=xKanrhppuvUAudTj',
  'split squat with dumbbells': 'https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn',
  'pull through': 'https://youtu.be/sFQtAuiVwyo?si=GQLiGcITyE4Yzp3G',
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
  const type = isCardio ? 'time' : 'weight';

  // Inject user custom youtube videos if available
  const mappedYtVideo = ytVideoMap[apiEx.name?.toLowerCase()] || '';

  return {
    id: `edb-${apiEx.exerciseId}`,
    name: capitalizeWords(apiEx.name || 'Unknown Exercise'),
    target: translatedTargets.length > 0 ? translatedTargets : ['Full Body'],
    type,
    equipment,
    defaultWeight: 0,
    ytVideo: mappedYtVideo,
    gifUrl: apiEx.gifUrl || '',
    instructions: apiEx.instructions || [],
    source: 'exercisedb',
  };
};


/**
 * Ambil semua exercises dari database lokal (yang sudah didownload).
 * Menggantikan panggilan API karena limitasi API gratis.
 * Returns array format LyFit.
 */
export let cachedMappedExercises = null;

export const getCachedExercises = () => {
  if (!cachedMappedExercises) {
    try {
      cachedMappedExercises = localExerciseDb.map(mapToLyFitFormat);
    } catch (e) {
      return [];
    }
  }
  return cachedMappedExercises;
};

export const fetchExercisesFromApi = async () => {
  if (cachedMappedExercises) return cachedMappedExercises;
  
  try {
    cachedMappedExercises = localExerciseDb.map(mapToLyFitFormat);
    return cachedMappedExercises;
  } catch (error) {
    console.error('Gagal meload ExerciseDB lokal:', error);
    return [];
  }
};

export const clearExerciseDbCache = () => {
  // Tidak perlu melakukan apa-apa karena menggunakan database lokal
};
