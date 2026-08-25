const fs = require('fs');
const path = require('path');

const edbPath = path.resolve('public/exercisedb.json');
const csvPath = path.resolve('src/data/exercise_catalog.csv');
const assetsDir = path.resolve('public/exercise-assets');
const ytBackupDir = path.resolve('public/exercise-assets/youtube-backup');

const aiFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => !fs.statSync(path.join(assetsDir, f)).isDirectory()) : [];
const aiVideos = aiFiles.filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
const thumbs = aiFiles.filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

const ytBackupFiles = fs.existsSync(ytBackupDir) ? fs.readdirSync(ytBackupDir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm')) : [];

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

console.log('=== SYNCING EXERCISE DATABASE (AI FIRST + YT BACKUP SECOND) ===\n');

let updated = 0;
edb.forEach(ex => {
  const matchedAiVid = findExactAsset(ex, aiVideos);
  let matchedYtVid = findExactAsset(ex, ytBackupFiles);

  // Manual fallback aliases if needed
  if (!matchedYtVid && ex.name === 'SM Romanian Deadlift (RDL)') {
    matchedYtVid = 'edb-Smith_Machine_Romanian_Deadlift.mp4';
  }

  const matchedThumb = findExactAsset(ex, thumbs);

  const videoUrls = [];
  if (matchedAiVid) {
    videoUrls.push(`/exercise-assets/${matchedAiVid}`);
  }
  if (matchedYtVid) {
    videoUrls.push(`/exercise-assets/youtube-backup/${matchedYtVid}`);
  }

  let changed = false;
  if (videoUrls.length > 0) {
    const combinedVideoUrl = videoUrls.join(' ');
    if (ex.videoUrl !== combinedVideoUrl) {
      ex.videoUrl = combinedVideoUrl;
      changed = true;
    }
  }

  if (matchedThumb) {
    const tUrl = `/exercise-assets/${matchedThumb}`;
    if (ex.gifUrl !== tUrl) {
      ex.gifUrl = tUrl;
      changed = true;
    }
  }

  if (changed) {
    updated++;
    const aiTag = matchedAiVid ? '🤖 AI' : '❌ No AI';
    const ytTag = matchedYtVid ? '🎬 YT Backup' : '❌ No YT';
    console.log(`✅ [SYNCED] ${ex.name} -> [${aiTag}] [${ytTag}] (${ex.videoUrl})`);
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

console.log(`\nSync complete! (${updated} exercises updated)`);
