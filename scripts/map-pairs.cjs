const fs = require('fs');
const path = require('path');

const constantsContent = fs.readFileSync(path.join(__dirname, '../src/data/constants.js'), 'utf8');
const match = constantsContent.match(/export const defaultMasterExercises = (\[[\s\S]*?\n\];)/);
const defaultExercises = (new Function('return ' + match[1].replace(/;$/, '')))();
const exercisedb = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/exercisedb.json'), 'utf8'));

// Peta pasangan Master vs ExerciseDB yang sebenarnya adalah latihan yang SAMA
const canonicalPairs = [
  { masterId: 101, masterName: 'Smith Machine Incline Bench Press', edbName: 'Smith Machine Incline Bench Press', reason: 'Exact match' },
  { masterId: 102, masterName: 'Cable Seated Row', edbName: 'Seated Cable Rows', reason: 'Same movement (Seated Cable Row)' },
  { masterId: 103, masterName: 'Flat Dumbbell Bench Press', edbName: 'Dumbbell Bench Press', reason: 'Same movement (Dumbbell Bench Press)' },
  { masterId: 104, masterName: 'Cable Lateral Raise', edbName: 'Cable Seated Lateral Raise', reason: 'Same movement (Cable Lateral Raise)' },
  { masterId: 105, masterName: 'Cable Triceps Pushdown', edbName: 'Triceps Pushdown', reason: 'Same movement (Triceps Pushdown)' },
  { masterId: 106, masterName: 'Dumbbell Biceps Curl', edbName: 'Dumbbell Alternate Bicep Curl', reason: 'Same movement (Dumbbell Bicep Curl)' },
  { masterId: 107, masterName: 'Cardio', edbName: null, reason: 'Logym generic cardio container' },
  { masterId: 108, masterName: 'Smith Machine Squat', edbName: 'Smith Machine Squat', reason: 'Exact match' },
  { masterId: 109, masterName: 'Romanian Deadlift (RDL)', edbName: 'Barbell Romanian Deadlift', reason: 'Same movement (Barbell RDL)' },
  { masterId: 110, masterName: 'Dumbbell Walking Lunges', edbName: 'Barbell Walking Lunge', reason: 'Lunge variation (Master uses DB)' },
  { masterId: 111, masterName: 'Standing Calf Raise', edbName: 'Rocking Standing Calf Raise', reason: 'Same movement (Standing Calf Raise)' },
  { masterId: 112, masterName: 'Cable Crunch', edbName: 'Cable Crunch', reason: 'Exact match' },
  { masterId: 113, masterName: 'Lat Pulldown', edbName: 'Wide-Grip Lat Pulldown', reason: 'Same movement (Standard Lat Pulldown)' },
  { masterId: 114, masterName: 'Dumbbell Shoulder Press', edbName: 'Dumbbell Shoulder Press', reason: 'Exact match' },
  { masterId: 124, masterName: 'Dumbbell Shrug', edbName: 'Dumbbell Shrug', reason: 'Exact match' },
  { masterId: 115, masterName: 'SM Flat Bench Press', edbName: 'Smith Machine Bench Press', reason: 'Same movement (Smith Machine Flat Bench)' },
  { masterId: 116, masterName: 'Cross Cable Rear Delt', edbName: 'Cable Rear Delt Fly', reason: 'Same movement (Cable Rear Delt)' },
  { masterId: 117, masterName: 'Overhead Cable Triceps Extension', edbName: 'Cable Rope Overhead Triceps Extension', reason: 'Same movement' },
  { masterId: 118, masterName: 'Biceps Cable Curl', edbName: 'High Cable Curls', reason: 'Cable curl variation' },
  { masterId: 119, masterName: 'DB Bulgarian Split Squat', edbName: 'Split Squat with Dumbbells', reason: 'Same movement (DB Split Squat)' },
  { masterId: 120, masterName: 'SM Romanian Deadlift (RDL)', edbName: null, reason: 'Smith Machine RDL (unique to Logym master)' },
  { masterId: 121, masterName: 'Cable Pull-Through', edbName: 'Pull Through', reason: 'Same movement (Cable Pull Through)' },
  { masterId: 122, masterName: 'Seated Dumbbell Calf Raise', edbName: 'Seated Calf Raise', reason: 'Same movement' },
  { masterId: 123, masterName: 'Plank', edbName: 'Plank', reason: 'Exact match' },
  { masterId: 125, masterName: 'Dumbbell Wrist Curl', edbName: 'Palms-Up Dumbbell Wrist Curl Over A Bench', reason: 'Same movement' },
  { masterId: 126, masterName: 'Treadmill Running', edbName: null, reason: 'Cardio' },
  { masterId: 127, masterName: 'Stationary Bike', edbName: null, reason: 'Cardio' },
  { masterId: 128, masterName: 'Aerobic', edbName: null, reason: 'Cardio' },
  { masterId: 129, masterName: 'HIIT', edbName: null, reason: 'Cardio' },
  { masterId: 130, masterName: 'Pilates', edbName: null, reason: 'Cardio/Time' },
  { masterId: 131, masterName: 'Yoga / Relaksasi', edbName: null, reason: 'Cardio/Time' },
  { masterId: 132, masterName: 'Elliptical', edbName: 'Elliptical Trainer', reason: 'Same movement' },
  { masterId: 133, masterName: 'Jump Rope', edbName: null, reason: 'Cardio' },
  { masterId: 134, masterName: 'Dumbbell Goblet Squat', edbName: 'Goblet Squat', reason: 'Same movement' },
  { masterId: 135, masterName: 'Barbell Bench Press', edbName: 'Barbell Bench Press - Medium Grip', reason: 'Same movement (Flat Barbell Bench)' },
  { masterId: 136, masterName: 'Swimming (Renang)', edbName: null, reason: 'Cardio' },
  { masterId: 137, masterName: 'Jogging / Running', edbName: null, reason: 'Cardio' },
  { masterId: 138, masterName: 'Walking / Jalan Kaki', edbName: null, reason: 'Cardio' },
  { masterId: 139, masterName: 'Cycling / Sepeda', edbName: null, reason: 'Cardio' }
];

console.log(JSON.stringify(canonicalPairs, null, 2));
