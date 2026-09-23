import { formatTarget, normalizeMuscleKey, canonicalizeExercise, resolveLoggedExercise } from '../data/constants.js';

// Nama latihan -> slug kanonik. Digunakan untuk pencocokan dan indeks popularitas.
export const exerciseSlug = (name) => {
  const s = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/\//g, '-');
  return s.slice(0, 300);
};

// Indonesian & common gym synonyms for smart search expansion
export const SYNONYMS = {
  // Kardio & Pergerakan
  'lari': 'run running runner jog jogging treadmill trail sprint lari',
  'running': 'lari runner jog jogging treadmill sprint',
  'jogging': 'jog joging running lari santai',
  'joging': 'jog jogging running lari',
  'sepeda': 'bike bicycle bicycling cycle cycling stationary gowes',
  'bicycling': 'sepeda bike cycle cycling stationary',
  'cycling': 'sepeda bike cycle bicycling',
  'gowes': 'sepeda bike bicycle bicycling cycling',
  'renang': 'swim swimming pool renang',
  'swimming': 'renang swim pool',
  'jalan': 'walk walking brisk hike hiking jalan kaki',
  'walking': 'jalan walk brisk hiking',
  'treadmill': 'running run lari jog jogging walking jalan treadmill',
  'dayung': 'row rowing ergometer',
  'rowing': 'dayung row ergometer',
  'lompat': 'jump rope skipping jumping loncat',
  'loncat': 'jump rope skipping jumping lompat',
  'skipping': 'jump rope skipping lompat tali',
  'kardio': 'cardio aerobic run running bike bicycle swim walk',
  'cardio': 'kardio aerobic lari sepeda renang',
  'aerobik': 'aerobic cardio kardio senam',
  'statis': 'stationary bike cycle bicycle',

  // Otot & Anatomi
  'trisep': 'triceps tricep trisep',
  'tricep': 'triceps tricep',
  'triceps': 'tricep trisep',
  'bisep': 'biceps bicep bisep lengan',
  'bicep': 'biceps bisep lengan',
  'biceps': 'bicep bisep lengan',
  'lengan': 'arms arm biceps triceps forearm lengan',
  'bahu': 'shoulders shoulder delts deltoid bahu pundak',
  'shoulder': 'bahu delts deltoid',
  'shoulders': 'bahu delts deltoid',
  'deltoid': 'bahu shoulder shoulders delts',
  'dada': 'chest pecs dada',
  'chest': 'dada pecs',
  'punggung': 'back lats traps spinal erectors punggung',
  'back': 'punggung lats',
  'sayap': 'lats latissimus lat sayap',
  'lats': 'sayap lat pulldown',
  'kaki': 'legs leg quads hamstrings calves kaki',
  'paha': 'quads hamstrings quadriceps thighs paha',
  'betis': 'calves calf betis',
  'perut': 'abs abdominal core obliques crunch perut',
  'abs': 'perut core abdominal obliques',
  'pantat': 'glutes glute bokong pantat pinggul',
  'bokong': 'glutes glute pantat pinggul',
  'pinggul': 'hip hips abduction adductor glutes',
  'leher': 'neck traps trapezius leher',
  'pundak': 'traps shoulders bahu pundak',

  // Alat & Aksi
  'tarik': 'pull row pulldown tarik',
  'dorong': 'push press dorong',
  'angkat': 'lift raise angkat',
  'jongkok': 'squat jongkok paha',
  'beban': 'weight dumbbell barbell dumbel barbel',
  'dumbel': 'dumbbell db dumbel',
  'barbel': 'barbell bb barbel',
  'kabel': 'cable pulley tali kabel',
  'mesin': 'machine smith machine mesin'
};

export const getSynonyms = (word) => {
  if (!word) return [];
  const wLower = word.toLowerCase();
  const direct = SYNONYMS[wLower];
  const list = direct ? direct.split(' ') : [];
  if (wLower.length >= 3) {
    for (const [key, val] of Object.entries(SYNONYMS)) {
      if (key !== wLower && key.startsWith(wLower)) {
        list.push(...val.split(' '));
      }
    }
  }
  return [...new Set(list)];
};

export const normalizeSearchString = (s) =>
  (s || '').toLowerCase().replace(/[-_/]/g, ' ').replace(/\s+/g, ' ').trim();

export const collapseSearchString = (s) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Hitung frekuensi pemakaian latihan dari riwayat sesi user.
 * HANYA menghitung sesi yang BENAR-BENAR SELESAI dan latihan yang memiliki set selesai (done),
 * bukan sesi terjadwal / uncompleted / skipped.
 */
export const computeOwnExerciseUsage = (history, exLookup = {}) => {
  const usage = {};
  if (!history || typeof history !== 'object') return usage;

  Object.values(history).forEach(day => {
    (day?.workouts || []).forEach(w => {
      // Hanya hitung sesi yang berstatus completed atau memiliki log set yang sudah dilakukan
      const isCompleted = w?.status === 'completed';
      const hasLog = w?.log && typeof w.log === 'object' && Object.keys(w.log).length > 0;
      if (!isCompleted && !hasLog) return;

      const exercises = w.overriddenExercises || w.exercises || [];
      const sessionRecordedSlugs = new Set();

      const recordEx = (ex) => {
        if (!ex) return;
        const rawName = String(ex.name || '').trim();
        if (!rawName) return;
        const can = canonicalizeExercise(ex);
        const nameToUse = can?.name || rawName;
        const s = exerciseSlug(nameToUse);
        if (sessionRecordedSlugs.has(s)) return;
        sessionRecordedSlugs.add(s);

        usage[s] = (usage[s] || 0) + 1;
        const rawSlug = exerciseSlug(rawName);
        if (rawSlug !== s) usage[rawSlug] = (usage[rawSlug] || 0) + 1;

        if (ex.id !== undefined && ex.id !== null) {
          const strId = String(ex.id);
          usage[strId] = (usage[strId] || 0) + 1;
          const baseId = strId.split('-')[0];
          if (baseId && baseId !== strId) usage[baseId] = (usage[baseId] || 0) + 1;
        }
        if (ex.exerciseId) {
          const exIdStr = String(ex.exerciseId);
          usage[exIdStr] = (usage[exIdStr] || 0) + 1;
          usage[exerciseSlug(exIdStr)] = (usage[exerciseSlug(exIdStr)] || 0) + 1;
        }
        if (ex.originalId) {
          usage[String(ex.originalId)] = (usage[String(ex.originalId)] || 0) + 1;
        }
      };

      if (hasLog) {
        Object.keys(w.log).forEach(key => {
          const sets = w.log[key] || [];
          const hasDone = Array.isArray(sets)
            ? sets.some(s => s && s.done && !s.skipped)
            : Object.values(sets).some(s => s && s.done && !s.skipped);
          if (!hasDone) return;

          const baseKey = key.split('-')[0];
          let matched = exercises.find(e => 
            String(e.id) === String(key) ||
            String(e.id) === baseKey ||
            key.startsWith(String(e.id) + '-') ||
            String(e.id).startsWith(key + '-')
          );

          if (!matched && exLookup) {
            matched = resolveLoggedExercise(key, exLookup) || exLookup[key] || exLookup[baseKey];
          }

          if (matched) {
            recordEx(matched);
          } else {
            usage[key] = (usage[key] || 0) + 1;
            if (baseKey && baseKey !== key) usage[baseKey] = (usage[baseKey] || 0) + 1;
          }
        });
      } else if (isCompleted) {
        exercises.forEach(ex => {
          const isSkipped = w.skipped && (w.skipped[ex.id] || w.skipped[`${ex.id}-${w.id}`]);
          if (!isSkipped) {
            recordEx(ex);
          }
        });
      }
    });
  });

  return usage;
};

/**
 * Pre-index item latihan untuk pencarian ultra-cepat tanpa overhead berulang di setiap render.
 */
export const prepareSearchableExercise = (ex, langId = 'id') => {
  const nameNorm = normalizeSearchString(ex.name);
  const nameColl = collapseSearchString(ex.name);

  const targets = Array.isArray(ex.target) ? ex.target : [ex.target || ''];
  const targetId = formatTarget(ex.target, langId) || '';
  const targetEn = formatTarget(ex.target, 'en') || '';
  const targetNorm = normalizeSearchString(`${targets.join(' ')} ${targetId} ${targetEn}`);

  const aliases = Array.isArray(ex.aliases) ? ex.aliases : [];
  const aliasNorm = normalizeSearchString(aliases.join(' '));

  const equip = ex.equipment || '';
  const equipNorm = normalizeSearchString(equip);

  const allText = `${nameNorm} ${aliasNorm} ${targetNorm} ${equipNorm}`;
  const allColl = collapseSearchString(allText);
  const slug = exerciseSlug(ex.name);

  return {
    ...ex,
    _nameNorm: nameNorm,
    _nameColl: nameColl,
    _targetNorm: targetNorm,
    _allText: allText,
    _allColl: allColl,
    _slug: slug,
  };
};

/**
 * Algoritma scoring pencarian pintar berbasis relevansi teks dan frekuensi riwayat latihan user.
 * Return skor > -1 jika cocok, -1 jika tidak cocok.
 */
export const scoreExerciseMatch = (ex, query, ownUsage = 0) => {
  if (!query || !query.trim()) return 0;

  const qNorm = normalizeSearchString(query);
  const qColl = collapseSearchString(query);
  const qWords = qNorm.split(' ').filter(Boolean);
  if (!qWords.length) return 0;

  const nameNorm = ex._nameNorm || normalizeSearchString(ex.name);
  const nameColl = ex._nameColl || collapseSearchString(ex.name);
  const allText = ex._allText || (nameNorm + ' ' + (ex.aliases || []).join(' ') + ' ' + (ex.target || []).join(' ')).toLowerCase();
  const allColl = ex._allColl || collapseSearchString(allText);

  let score = 0;

  // 1. Collapsed exact match on exercise name
  if (nameColl === qColl) {
    score += 10000;
  } else if (nameColl.startsWith(qColl)) {
    score += 6000;
  } else if (nameColl.includes(qColl)) {
    score += 4000;
  } else if (allColl.includes(qColl)) {
    score += 2500;
  }

  // 2. Token-based matching: seluruh kata kueri harus cocok (langsung atau via sinonim)
  const matchesAll = qWords.every(w => {
    const wColl = collapseSearchString(w);
    const syns = getSynonyms(w);
    return allText.includes(w) ||
           allColl.includes(wColl) ||
           syns.some(syn => allText.includes(syn) || allColl.includes(collapseSearchString(syn)));
  });

  if (!matchesAll && score === 0) return -1; // Excluded

  if (matchesAll) score += 2000;

  // 3. Name match priority over muscle/target match
  if (nameNorm.includes(qNorm) || nameColl.includes(qColl)) {
    score += 1500;
  } else if (qWords.some(w => nameNorm.includes(w) || getSynonyms(w).some(syn => nameNorm.includes(syn) || nameColl.includes(collapseSearchString(syn))))) {
    score += 1000;
  }

  // 4. Aliases match priority
  if (ex.aliases && ex.aliases.some(a => {
    const aColl = collapseSearchString(a);
    return aColl.includes(qColl) || qWords.every(w => aColl.includes(collapseSearchString(w)) || getSynonyms(w).some(syn => aColl.includes(collapseSearchString(syn))));
  })) {
    score += 1200;
  }

  // 5. Frequently used / trained bonus:
  // Latihan yang sering dipakai user akan otomatis melonjak ke peringkat teratas!
  if (ownUsage > 0) {
    score += Math.min(ownUsage * 300, 15000);
  }

  return score;
};
