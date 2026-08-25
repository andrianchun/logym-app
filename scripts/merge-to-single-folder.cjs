const fs = require('fs');
const path = require('path');

const baseAssetsDir = path.resolve('public/exercise-assets');
const thumbsDir = path.join(baseAssetsDir, 'thumbnails');
const videosDir = path.join(baseAssetsDir, 'videos');
const edbPath = path.resolve('public/exercisedb.json');
const csvPath = path.resolve('src/data/exercise_catalog.csv');

console.log('=== MERGING THUMBNAILS & VIDEOS INTO SINGLE FOLDER: public/exercise-assets ===\n');

// 1. Move files from thumbnails/
if (fs.existsSync(thumbsDir)) {
  const thumbFiles = fs.readdirSync(thumbsDir);
  thumbFiles.forEach(f => {
    const src = path.join(thumbsDir, f);
    const dst = path.join(baseAssetsDir, f);
    fs.copyFileSync(src, dst);
    fs.unlinkSync(src);
    console.log(`🖼️ Moved thumbnail: ${f} -> public/exercise-assets/${f}`);
  });
  try { fs.rmdirSync(thumbsDir); } catch(e) {}
}

// 2. Move files from videos/
if (fs.existsSync(videosDir)) {
  const videoFiles = fs.readdirSync(videosDir);
  videoFiles.forEach(f => {
    const src = path.join(videosDir, f);
    const dst = path.join(baseAssetsDir, f);
    fs.copyFileSync(src, dst);
    fs.unlinkSync(src);
    console.log(`🎥 Moved video: ${f} -> public/exercise-assets/${f}`);
  });
  try { fs.rmdirSync(videosDir); } catch(e) {}
}

// 3. Update exercisedb.json
const edb = JSON.parse(fs.readFileSync(edbPath, 'utf8'));
edb.forEach(ex => {
  if (ex.videoUrl && ex.videoUrl.startsWith('/exercise-assets/videos/')) {
    ex.videoUrl = ex.videoUrl.replace('/exercise-assets/videos/', '/exercise-assets/');
  }
  if (ex.gifUrl && ex.gifUrl.startsWith('/exercise-assets/thumbnails/')) {
    ex.gifUrl = ex.gifUrl.replace('/exercise-assets/thumbnails/', '/exercise-assets/');
  }
});

fs.writeFileSync(edbPath, JSON.stringify(edb, null, 2), 'utf8');
console.log('\n✅ Updated exercisedb.json paths to unified /exercise-assets/');

// 4. Sync CSV
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
console.log('✅ Synced exercise_catalog.csv');

// 5. Check all files in public/exercise-assets/
console.log('\n--- ALL ASSETS IN public/exercise-assets/ ---');
const allAssets = fs.readdirSync(baseAssetsDir).filter(f => !fs.statSync(path.join(baseAssetsDir, f)).isDirectory());
allAssets.forEach(f => console.log(' -', f));
