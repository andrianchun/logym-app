const fs = require('fs');
const path = require('path');

const videosDir = path.resolve('public/exercise-assets/videos');
const thumbsDir = path.resolve('public/exercise-assets/thumbnails');
const edbPath = path.resolve('public/exercisedb.json');
const csvPath = path.resolve('src/data/exercise_catalog.csv');

// Specific renames needed
const videoRenames = [
  { from: 'Lat Pulldown Mistakes (FIX THESE!).mp4', to: 'edb-Wide-Grip_Lat_Pulldown.mp4' }
];

const thumbRenames = [
  { from: 'lat-pulldown.png', to: 'edb-Wide-Grip_Lat_Pulldown.png' },
  { from: 'Smith Machine Bench Press.png', to: 'edb-Smith_Machine_Bench_Press.png' }
];

console.log('--- RENAMING VIDEOS ---');
videoRenames.forEach(r => {
  const oldP = path.join(videosDir, r.from);
  const newP = path.join(videosDir, r.to);
  if (fs.existsSync(oldP)) {
    fs.renameSync(oldP, newP);
    console.log(`Renamed video: "${r.from}" -> "${r.to}"`);
  } else if (fs.existsSync(newP)) {
    console.log(`Target video already exists: "${r.to}"`);
  }
});

console.log('\n--- RENAMING THUMBNAILS ---');
thumbRenames.forEach(r => {
  const oldP = path.join(thumbsDir, r.from);
  const newP = path.join(thumbsDir, r.to);
  if (fs.existsSync(oldP)) {
    fs.renameSync(oldP, newP);
    console.log(`Renamed thumbnail: "${r.from}" -> "${r.to}"`);
  } else if (fs.existsSync(newP)) {
    console.log(`Target thumbnail already exists: "${r.to}"`);
  }
});

// Update exercisedb.json
const edb = JSON.parse(fs.readFileSync(edbPath, 'utf8'));

// 1. Dumbbell Bench Press
const dbp = edb.find(e => e.name === 'Dumbbell Bench Press');
if (dbp) {
  dbp.videoUrl = '/exercise-assets/videos/edb-Dumbbell_Bench_Press.mp4';
  dbp.gifUrl = '/exercise-assets/thumbnails/edb-Dumbbell_Bench_Press.webp';
}

// 2. Barbell Bench Press - Medium Grip
const bbp = edb.find(e => e.name === 'Barbell Bench Press - Medium Grip');
if (bbp) {
  bbp.videoUrl = '/exercise-assets/videos/edb-Barbell_Bench_Press_-_Medium_Grip.mp4';
  bbp.gifUrl = '/exercise-assets/thumbnails/edb-Barbell_Bench_Press_-_Medium_Grip.webp';
}

// 3. Smith Machine Bench Press
const smbp = edb.find(e => e.name === 'Smith Machine Bench Press');
if (smbp) {
  smbp.videoUrl = '/exercise-assets/videos/edb-Smith_Machine_Bench_Press.mp4';
  smbp.gifUrl = '/exercise-assets/thumbnails/edb-Smith_Machine_Bench_Press.png';
}

// 4. Wide-Grip Lat Pulldown
const wlp = edb.find(e => e.name === 'Wide-Grip Lat Pulldown');
if (wlp) {
  wlp.videoUrl = '/exercise-assets/videos/edb-Wide-Grip_Lat_Pulldown.mp4';
  wlp.gifUrl = '/exercise-assets/thumbnails/edb-Wide-Grip_Lat_Pulldown.png';
}

// 5. Incline Dumbbell Press
const idp = edb.find(e => e.name === 'Incline Dumbbell Press');
if (idp) {
  idp.gifUrl = '/exercise-assets/thumbnails/edb-Incline_Dumbbell_Press.webp';
}

// 6. Smith Machine Incline Bench Press
const smib = edb.find(e => e.name === 'Smith Machine Incline Bench Press');
if (smib) {
  smib.videoUrl = '/exercise-assets/videos/edb-Smith_Machine_Incline_Bench_Press.mp4';
  smib.gifUrl = '/exercise-assets/thumbnails/edb-Smith_Machine_Incline_Bench_Press.png';
}

// 7. Seated Cable Rows
const scr = edb.find(e => e.name === 'Seated Cable Rows');
if (scr) {
  scr.videoUrl = '/exercise-assets/videos/edb-Seated_Cable_Rows.mp4';
  scr.gifUrl = '/exercise-assets/thumbnails/edb-Seated_Cable_Rows.webp';
}

// 8. Cable Crossover
const cc = edb.find(e => e.name === 'Cable Crossover');
if (cc) {
  cc.videoUrl = '/exercise-assets/videos/edb-Cable_Crossover.mp4';
  cc.gifUrl = '/exercise-assets/thumbnails/edb-Cable_Crossover.webp';
}

fs.writeFileSync(edbPath, JSON.stringify(edb, null, 2));
console.log('Successfully updated exercisedb.json!');

// Sync CSV
const headers = ['id', 'name', 'target', 'equipment', 'level', 'type', 'defaultWeight', 'ytVideo', 'videoUrl', 'gifUrl'];
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join(';') : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const rows = [headers.join(',')];
edb.forEach(ex => {
  const row = headers.map(h => escapeCsv(ex[h]));
  rows.push(row.join(','));
});

fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');
console.log('Successfully synced exercise_catalog.csv!');

console.log('\n--- CURRENT FILE LIST IN VIDEOS ---');
console.log(fs.readdirSync(videosDir));

console.log('\n--- CURRENT FILE LIST IN THUMBNAILS ---');
console.log(fs.readdirSync(thumbsDir));
