const fs = require('fs');
const path = require('path');

const constantsContent = fs.readFileSync(path.join(__dirname, '../src/data/constants.js'), 'utf8');
const match = constantsContent.match(/export const defaultMasterExercises = (\[[\s\S]*?\n\];)/);
const defaultExercises = (new Function('return ' + match[1].replace(/;$/, '')))();
const exercisedb = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/exercisedb.json'), 'utf8'));

// Canonical pairs map
const pairMapping = {
  101: { edbId: 'Smith_Machine_Incline_Bench_Press', edbName: 'Smith Machine Incline Bench Press' },
  102: { edbId: 'Seated_Cable_Rows', edbName: 'Seated Cable Rows' },
  103: { edbId: 'Dumbbell_Bench_Press', edbName: 'Dumbbell Bench Press' },
  104: { edbId: 'Cable_Seated_Lateral_Raise', edbName: 'Cable Seated Lateral Raise' },
  105: { edbId: 'Triceps_Pushdown', edbName: 'Triceps Pushdown' },
  106: { edbId: 'Dumbbell_Alternate_Bicep_Curl', edbName: 'Dumbbell Alternate Bicep Curl' },
  107: null, // Cardio container
  108: { edbId: 'Smith_Machine_Squat', edbName: 'Smith Machine Squat' },
  109: { edbId: 'Barbell_Romanian_Deadlift', edbName: 'Barbell Romanian Deadlift' },
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
  120: null, // SM Romanian Deadlift
  121: { edbId: 'Pull_Through', edbName: 'Pull Through' },
  122: { edbId: 'Seated_Calf_Raise', edbName: 'Seated Calf Raise' },
  123: { edbId: 'Plank', edbName: 'Plank' },
  125: { edbId: 'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench', edbName: 'Palms-Up Dumbbell Wrist Curl Over A Bench' },
  132: { edbId: 'Elliptical_Trainer', edbName: 'Elliptical Trainer' },
  134: { edbId: 'Goblet_Squat', edbName: 'Goblet Squat' },
  135: { edbId: 'Barbell_Bench_Press_-_Medium_Grip', edbName: 'Barbell Bench Press - Medium Grip' }
};

const auditReport = [];

defaultExercises.forEach(master => {
  const pair = pairMapping[master.id];
  let edbMatch = null;
  if (pair && pair.edbName) {
    edbMatch = exercisedb.find(e => e.name.toLowerCase().trim() === pair.edbName.toLowerCase().trim());
  }

  const isDuplicate = !!edbMatch;
  
  auditReport.push({
    masterId: master.id,
    masterName: master.name,
    masterTarget: master.target,
    masterEquip: master.equipment,
    masterVideo: master.ytVideo || '',
    masterDefaultWeight: master.defaultWeight,
    edbName: edbMatch ? edbMatch.name : null,
    edbId: edbMatch ? (edbMatch.exerciseId || edbMatch.name.replace(/\s+/g, '_')) : null,
    edbTarget: edbMatch ? (edbMatch.targetMuscles || edbMatch.target) : null,
    edbEquip: edbMatch ? (edbMatch.equipments || [edbMatch.equipment]) : null,
    edbInstructions: edbMatch ? (edbMatch.instructions_id || edbMatch.instructions || []) : [],
    edbGif: edbMatch ? (edbMatch.gifUrl || '') : '',
    status: isDuplicate ? (master.name.toLowerCase().trim() === edbMatch.name.toLowerCase().trim() ? 'EXACT_DUPLICATE' : 'NAME_VARIANT_DUPLICATE') : 'UNIQUE_MASTER',
    recommendedMergedName: isDuplicate ? edbMatch.name : master.name,
    proposedMergedEntry: {
      id: master.id,
      aliasEdbId: edbMatch ? `edb-${edbMatch.exerciseId || edbMatch.name.replace(/\s+/g, '_')}` : null,
      name: isDuplicate ? edbMatch.name : master.name,
      aliasNames: isDuplicate && master.name !== edbMatch.name ? [master.name] : [],
      target: master.target || (edbMatch ? edbMatch.targetMuscles : ['Full Body']),
      equipment: master.equipment || (edbMatch ? edbMatch.equipments?.[0] : 'Lainnya'),
      type: master.type || 'weight',
      defaultWeight: master.defaultWeight !== undefined ? master.defaultWeight : 0,
      ytVideo: master.ytVideo || '',
      gifUrl: edbMatch ? edbMatch.gifUrl : (master.gifUrl || ''),
      instructions: (edbMatch && edbMatch.instructions_id && edbMatch.instructions_id.length) ? edbMatch.instructions_id : (master.instructions || [])
    }
  });
});

fs.writeFileSync(path.join(__dirname, '../audit_report_final.json'), JSON.stringify(auditReport, null, 2));
console.log('Final audit report compiled to audit_report_final.json');
console.log('Total Master items analyzed:', auditReport.length);
console.log('Duplicate items with ExerciseDB:', auditReport.filter(r => r.status !== 'UNIQUE_MASTER').length);
console.log('Unique Master items (Cardio/Custom):', auditReport.filter(r => r.status === 'UNIQUE_MASTER').length);
