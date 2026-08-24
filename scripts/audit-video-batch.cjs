const fs = require('fs');

const exercisedb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const existingVideos = fs.readdirSync('public/exercise-assets/videos');
const existingThumbnails = fs.readdirSync('public/exercise-assets/thumbnails');

// Exercises used in Default Programs (Upper 1, Lower 1, Upper 2, Lower 2, and core master routines)
const defaultProgNames = [
  'Smith Machine Incline Bench Press',
  'Seated Cable Rows',
  'Dumbbell Bench Press',
  'Cable Seated Lateral Raise',
  'Triceps Pushdown',
  'Dumbbell Alternate Bicep Curl',
  'Smith Machine Squat',
  'Romanian Deadlift',
  'Barbell Walking Lunge',
  'Rocking Standing Calf Raise',
  'Cable Crunch',
  'Wide-Grip Lat Pulldown',
  'Dumbbell Shoulder Press',
  'Dumbbell Shrug',
  'Smith Machine Bench Press',
  'Cable Rear Delt Fly',
  'Cable Rope Overhead Triceps Extension',
  'High Cable Curls',
  'Split Squat with Dumbbells',
  'SM Romanian Deadlift (RDL)',
  'Pull Through',
  'Seated Calf Raise',
  'Plank',
  'Palms-Up Dumbbell Wrist Curl Over A Bench',
  'Goblet Squat',
  'Barbell Bench Press - Medium Grip'
];

// Additional popular gym staples
const gymStaples = [
  'Barbell Squat',
  'Barbell Deadlift',
  'Incline Dumbbell Press',
  'Cable Crossover',
  'Lat Pulldown',
  'Leg Press',
  'Leg Extensions',
  'Lying Leg Curls',
  'Face Pull',
  'Dips - Chest Version',
  'Pullups',
  'Pushups',
  'Hammer Curls',
  'Preacher Curl',
  'Standing Military Press',
  'Lateral Raise',
  'Bent Over Two-Dumbbell Row',
  'Standing Calf Raises',
  'Ab Crunch Machine',
  'Incline Bench Press'
];

const candidateNames = [...new Set([...defaultProgNames, ...gymStaples])];

const checkLocalAsset = (name, id, fileList) => {
  const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normId = String(id).toLowerCase().replace(/[^a-z0-9]/g, '');
  return fileList.find(file => {
    const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (normName.length > 5 && normFile.includes(normName)) || (normId.length > 3 && normFile.includes(normId));
  });
};

const results = [];

candidateNames.forEach((name) => {
  let ex = exercisedb.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (!ex) {
    ex = exercisedb.find(e => e.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(e.name.toLowerCase()));
  }
  const id = ex ? ex.id : 'custom';
  const target = ex ? (Array.isArray(ex.target) ? ex.target.join(', ') : ex.target) : '-';
  const equip = ex ? ex.equipment : '-';
  const foundVideo = checkLocalAsset(name, id, existingVideos);
  const foundThumb = checkLocalAsset(name, id, existingThumbnails);

  results.push({
    name: ex ? ex.name : name,
    id: id,
    target: target,
    equipment: equip,
    hasVideo: Boolean(foundVideo),
    videoFile: foundVideo || null,
    hasThumbnail: Boolean(foundThumb),
    thumbFile: foundThumb || null,
    isDefaultProg: defaultProgNames.includes(name)
  });
});

console.log(JSON.stringify(results, null, 2));
