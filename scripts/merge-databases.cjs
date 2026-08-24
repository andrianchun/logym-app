const fs = require('fs');
const path = require('path');

// 1. Load current defaultMasterExercises from constants.js
const constantsPath = path.join(__dirname, '../src/data/constants.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');
const match = constantsContent.match(/export const defaultMasterExercises = (\[[\s\S]*?\n\];)/);
const defaultExercises = (new Function('return ' + match[1].replace(/;$/, '')))();

// 2. Load public/exercisedb.json
const exercisedbPath = path.join(__dirname, '../public/exercisedb.json');
const exercisedb = JSON.parse(fs.readFileSync(exercisedbPath, 'utf8'));

console.log('Original Master count:', defaultExercises.length);
console.log('Original ExerciseDB count:', exercisedb.length);

// Canonical Pairings between Master and ExerciseDB
// Rules: Standard name from ExerciseDB, enriched with Master videos, defaultWeight, and equipment.
const pairMapping = {
  101: { edbId: 'Smith_Machine_Incline_Bench_Press', edbName: 'Smith Machine Incline Bench Press' },
  102: { edbId: 'Seated_Cable_Rows', edbName: 'Seated Cable Rows' },
  103: { edbId: 'Dumbbell_Bench_Press', edbName: 'Dumbbell Bench Press' },
  104: { edbId: 'Cable_Seated_Lateral_Raise', edbName: 'Cable Seated Lateral Raise' },
  105: { edbId: 'Triceps_Pushdown', edbName: 'Triceps Pushdown' },
  106: { edbId: 'Dumbbell_Alternate_Bicep_Curl', edbName: 'Dumbbell Alternate Bicep Curl' },
  107: null, // Cardio container (Unique Master)
  108: { edbId: 'Smith_Machine_Squat', edbName: 'Smith Machine Squat' },
  109: { edbId: 'Romanian_Deadlift', edbName: 'Romanian Deadlift' },
  110: { edbId: 'Barbell_Walking_Lunge', edbName: 'Barbell Walking Lunge' },
  111: { edbId: 'Rocking_Standing_Calf_Raise', edbName: 'Rocking Standing Calf Raise' },
  112: { edbId: 'Cable_Crunch', edbName: 'Cable Crunch' },
  113: { edbId: 'Wide-Grip_Lat_Pulldown', edbName: 'Wide-Grip Lat Pulldown' },
  114: { edbId: 'Dumbbell_Shoulder_Press', edbName: 'Dumbbell Shoulder Press' },
  124: { edbId: 'Dumbbell_Shrug', edbName: 'Dumbbell Shrug' },
  115: { edbId: 'Smith_Machine_Bench_Press', edbName: 'Smith Machine Bench Press' },
  116: { edbId: 'Cable_Rear_Delt_Fly', edbName: 'Cable Rear Delt Fly' },
  117: { edbId: 'Cable_Rope_Overhead_Triceps_Extension', edbName: 'Cable Rope Overhead Triceps Extension' },
  118: { edbId: 'High_Cable_Curls', edbName: 'High Cable Curls' },
  119: { edbId: 'Split_Squat_with_Dumbbells', edbName: 'Split Squat with Dumbbells' },
  120: null, // SM Romanian Deadlift (Unique Master)
  121: { edbId: 'Pull_Through', edbName: 'Pull Through' },
  122: { edbId: 'Seated_Calf_Raise', edbName: 'Seated Calf Raise' },
  123: { edbId: 'Plank', edbName: 'Plank' },
  125: { edbId: 'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench', edbName: 'Palms-Up Dumbbell Wrist Curl Over A Bench' },
  126: null, // Treadmill Running (Unique Master)
  127: null, // Stationary Bike (Unique Master)
  128: null, // Aerobic (Unique Master)
  129: null, // HIIT (Unique Master)
  130: null, // Pilates (Unique Master)
  131: null, // Yoga / Relaksasi (Unique Master)
  132: { edbId: 'Elliptical_Trainer', edbName: 'Elliptical Trainer' },
  133: null, // Jump Rope (Unique Master)
  134: { edbId: 'Goblet_Squat', edbName: 'Goblet Squat' },
  135: { edbId: 'Barbell_Bench_Press_-_Medium_Grip', edbName: 'Barbell Bench Press - Medium Grip' },
  136: null, // Swimming (Unique Master)
  137: null, // Jogging / Running (Unique Master)
  138: null, // Walking / Jalan Kaki (Unique Master)
  139: null  // Cycling / Sepeda (Unique Master)
};

// Map of Master ID -> Master object
const masterById = new Map();
defaultExercises.forEach(m => masterById.set(m.id, m));

// Create a cloned list of ExerciseDB exercises
const mergedExerciseDb = exercisedb.map(ex => ({ ...ex }));

// Track which ExerciseDB items got enriched from Master
const matchedEdbNames = new Set();
const masterToEdbKey = {};

Object.entries(pairMapping).forEach(([masterIdStr, pair]) => {
  const masterId = Number(masterIdStr);
  const masterEx = masterById.get(masterId);
  if (!masterEx) return;

  if (pair && pair.edbName) {
    const edbIndex = mergedExerciseDb.findIndex(e => e.name.toLowerCase().trim() === pair.edbName.toLowerCase().trim());
    if (edbIndex >= 0) {
      const edbEx = mergedExerciseDb[edbIndex];
      matchedEdbNames.add(edbEx.name.toLowerCase().trim());
      masterToEdbKey[masterId] = `edb-${edbEx.exerciseId || edbEx.name.replace(/\s+/g, '_')}`;

      // Enriched fields:
      // 1. YouTube video
      if (masterEx.ytVideo && (!edbEx.videoUrl && !edbEx.ytVideo)) {
        edbEx.videoUrl = masterEx.ytVideo;
        edbEx.ytVideo = masterEx.ytVideo;
      } else if (masterEx.ytVideo) {
        edbEx.ytVideo = masterEx.ytVideo;
      }

      // 2. Default weight
      if (masterEx.defaultWeight !== undefined) {
        edbEx.defaultWeight = masterEx.defaultWeight;
      }

      // 3. Level & type
      if (masterEx.level && !edbEx.level) edbEx.level = masterEx.level;
      if (masterEx.type && !edbEx.type) edbEx.type = masterEx.type;

      // 4. Equipment
      if (masterEx.equipment && (!edbEx.equipments || edbEx.equipments.length === 0 || edbEx.equipments[0] === 'Lainnya')) {
        edbEx.equipments = [masterEx.equipment];
      }

      // 5. Keep alias of old master name if different
      if (masterEx.name.toLowerCase().trim() !== edbEx.name.toLowerCase().trim()) {
        edbEx.aliases = edbEx.aliases || [];
        if (!edbEx.aliases.includes(masterEx.name)) edbEx.aliases.push(masterEx.name);
      }
    }
  }
});

// Add the 14 Unique Master exercises (Cardio/Custom) to mergedExerciseDb
defaultExercises.forEach(masterEx => {
  const pair = pairMapping[masterEx.id];
  if (!pair) {
    // Check if already in ExerciseDB (by name)
    const exists = mergedExerciseDb.some(e => e.name.toLowerCase().trim() === masterEx.name.toLowerCase().trim());
    if (!exists) {
      const newEdbEntry = {
        exerciseId: String(masterEx.id),
        name: masterEx.name,
        targetMuscles: Array.isArray(masterEx.target) ? masterEx.target : [masterEx.target || 'Full Body'],
        bodyParts: [masterEx.type === 'cardio' ? 'cardio' : 'waist'],
        equipments: [masterEx.equipment || 'Body Weight'],
        secondaryMuscles: [],
        instructions: masterEx.instructions || ['Lakukan gerakan sesuai panduan dan intensitas yang nyaman.'],
        instructions_id: masterEx.instructions_id || masterEx.instructions || ['Lakukan gerakan sesuai panduan dan intensitas yang nyaman.'],
        instructions_en: masterEx.instructions_en || ['Perform the movement with proper form and comfortable intensity.'],
        videoUrl: masterEx.ytVideo || '',
        ytVideo: masterEx.ytVideo || '',
        gifUrl: masterEx.gifUrl || '',
        thumbnailUrl: masterEx.thumbnailUrl || '',
        level: masterEx.level || 'beginner',
        type: masterEx.type || 'weight',
        defaultWeight: masterEx.defaultWeight !== undefined ? masterEx.defaultWeight : 0,
        duration: masterEx.duration || 0,
        source: 'logym_master'
      };
      mergedExerciseDb.push(newEdbEntry);
      masterToEdbKey[masterEx.id] = `edb-${masterEx.id}`;
    }
  }
});

console.log('Final Merged ExerciseDB count:', mergedExerciseDb.length);

// Write to public/exercisedb.json
fs.writeFileSync(exercisedbPath, JSON.stringify(mergedExerciseDb, null, 2), 'utf8');
console.log('✅ Updated public/exercisedb.json');

// Copy to dist & android assets if they exist
const copyTargets = [
  path.join(__dirname, '../dist/exercisedb.json'),
  path.join(__dirname, '../dist/generator-site/exercisedb.json'),
  path.join(__dirname, '../android/app/src/main/assets/public/exercisedb.json')
];

copyTargets.forEach(tgt => {
  if (fs.existsSync(path.dirname(tgt))) {
    fs.writeFileSync(tgt, JSON.stringify(mergedExerciseDb, null, 2), 'utf8');
    console.log('✅ Updated copy:', tgt);
  }
});

// Generate comprehensive src/data/exercise_catalog.csv
const csvHeaders = ['ID', 'Name_ID', 'Name_EN', 'Muscle_Primary', 'Muscle_Secondary', 'Equipment', 'Level', 'Type', 'Video_URL', 'Has_Video', 'Instructions_ID', 'Instructions_EN'];
const csvRows = [csvHeaders.join(';')];

mergedExerciseDb.forEach(ex => {
  const primary = Array.isArray(ex.targetMuscles) ? ex.targetMuscles[0] || '' : (Array.isArray(ex.target) ? ex.target[0] || '' : '');
  const secondary = Array.isArray(ex.targetMuscles) && ex.targetMuscles.length > 1 ? ex.targetMuscles.slice(1).join(', ') : (Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.join(', ') : '');
  const vid = ex.ytVideo || ex.videoUrl || '';
  const hasVid = !!(vid && vid.trim());
  const instrId = Array.isArray(ex.instructions_id) ? ex.instructions_id.join(' | ') : (Array.isArray(ex.instructions) ? ex.instructions.join(' | ') : (ex.instructions || ''));
  const instrEn = Array.isArray(ex.instructions_en) ? ex.instructions_en.join(' | ') : (Array.isArray(ex.instructions) ? ex.instructions.join(' | ') : (ex.instructions || ''));
  const equip = Array.isArray(ex.equipments) ? ex.equipments[0] || 'Lainnya' : (ex.equipment || 'Lainnya');

  const row = [
    `edb-${ex.exerciseId || ex.name.replace(/\s+/g, '_')}`,
    ex.name,
    ex.name,
    primary,
    secondary,
    equip,
    ex.level || 'beginner',
    ex.type || 'weight',
    vid,
    hasVid ? 'YES' : 'NO',
    instrId,
    instrEn
  ].map(val => '"' + String(val).replace(/"/g, '""') + '"');

  csvRows.push(row.join(';'));
});

const outCsvPath = path.join(__dirname, '../src/data/exercise_catalog.csv');
fs.writeFileSync(outCsvPath, csvRows.join('\n'), 'utf8');
console.log('✅ Generated unified src/data/exercise_catalog.csv with', csvRows.length - 1, 'exercises.');

// Output the updated exerciseAliasMap for constants.js
console.log('\n--- VERIFIED EXERCISE ALIAS MAP ---');
console.log(JSON.stringify(masterToEdbKey, null, 2));
