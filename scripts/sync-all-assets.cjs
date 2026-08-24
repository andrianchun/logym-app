const fs = require('fs');
const path = require('path');

const edbPath = path.resolve('public/exercisedb.json');
const csvPath = path.resolve('src/data/exercise_catalog.csv');
const videosDir = path.resolve('public/exercise-assets/videos');
const thumbsDir = path.resolve('public/exercise-assets/thumbnails');

const videos = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
const thumbs = fs.existsSync(thumbsDir) ? fs.readdirSync(thumbsDir) : [];

const edb = JSON.parse(fs.readFileSync(edbPath, 'utf8'));

// Strict name matching based on exerciseId or standardized name
const findExactAsset = (ex, list) => {
  const exId = (ex.exerciseId || ex.name.replace(/[\s\(\)\/]+/g, '_')).toLowerCase();
  const rawName = ex.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  return list.find(f => {
    const base = path.parse(f).name.replace(/^edb-/, '').toLowerCase();
    const baseClean = base.replace(/[^a-z0-9]/g, '');
    return base === exId || baseClean === rawName;
  });
};

console.log('=== STRICT SYNCING EXERCISE DATABASE ===\n');

edb.forEach(ex => {
  const matchedVid = findExactAsset(ex, videos);
  const matchedThumb = findExactAsset(ex, thumbs);

  if (matchedVid) {
    ex.videoUrl = `/exercise-assets/videos/${matchedVid}`;
  }
  if (matchedThumb) {
    ex.gifUrl = `/exercise-assets/thumbnails/${matchedThumb}`;
  }
});

// Reset Machine Bench Press if it was cross-linked
const mbp = edb.find(e => e.name === 'Machine Bench Press');
if (mbp && mbp.videoUrl?.includes('Smith_Machine')) {
  mbp.videoUrl = undefined;
  mbp.gifUrl = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bench_Press/0.jpg';
}

fs.writeFileSync(edbPath, JSON.stringify(edb, null, 2), 'utf8');

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

// Sync to dist if exists
if (fs.existsSync('dist')) {
  fs.copyFileSync(edbPath, 'dist/exercisedb.json');
}

// Sync to Android assets if exists
const androidPublicDir = 'android/app/src/main/assets/public';
if (fs.existsSync(androidPublicDir)) {
  fs.copyFileSync(edbPath, path.join(androidPublicDir, 'exercisedb.json'));
}

console.log('Strict sync complete!');
