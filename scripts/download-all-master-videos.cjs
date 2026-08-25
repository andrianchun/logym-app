const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const binDir = path.resolve(__dirname, 'bin');
const ytdlp = path.join(binDir, 'yt-dlp.exe');
const ffmpeg = path.join(binDir, 'ffmpeg.exe');
const assetsDir = path.resolve(__dirname, '../public/exercise-assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Clean old temp files in binDir
fs.readdirSync(binDir).forEach(f => {
  if (f.startsWith('temp_') || f.startsWith('ex_')) {
    try { fs.unlinkSync(path.join(binDir, f)); } catch (e) {}
  }
});

const targets = [
  {
    id: 112,
    name: 'Cable Crunch',
    fileName: 'edb-Cable_Crunch.mp4',
    url: 'https://youtu.be/K2m0jj6RfYg'
  },
  {
    id: 113,
    name: 'Wide-Grip Lat Pulldown',
    fileName: 'edb-Wide-Grip_Lat_Pulldown.mp4',
    url: 'https://youtu.be/bNmvKpJSWKM'
  },
  {
    id: 104,
    name: 'Cable Seated Lateral Raise',
    fileName: 'edb-Cable_Seated_Lateral_Raise.mp4',
    url: 'https://youtu.be/9ilIKuy6B0g'
  },
  {
    id: 111,
    name: 'Rocking Standing Calf Raise',
    fileName: 'edb-Rocking_Standing_Calf_Raise.mp4',
    url: 'https://youtu.be/wdOkFomQNp8'
  },
  {
    id: 124,
    name: 'Dumbbell Shrug',
    fileName: 'edb-Dumbbell_Shrug.mp4',
    url: 'https://youtu.be/rFsSeClGnNA'
  },
  {
    id: 118,
    name: 'High Cable Curls',
    fileName: 'edb-High_Cable_Curls.mp4',
    url: 'https://youtu.be/CrbTqNOlFgE'
  },
  {
    id: 122,
    name: 'Seated Calf Raise',
    fileName: 'edb-Seated_Calf_Raise.mp4',
    url: 'https://youtu.be/ar8nav0jGoE'
  },
  {
    id: 123,
    name: 'Plank',
    fileName: 'edb-Plank.mp4',
    url: 'https://youtu.be/xe2MXatLTUw'
  },
  {
    id: 110,
    name: 'Barbell Walking Lunge',
    fileName: 'edb-Barbell_Walking_Lunge.mp4',
    url: 'https://youtu.be/mJilHWIBWO8'
  },
  {
    id: 120,
    name: 'SM Romanian Deadlift (RDL)',
    fileName: 'edb-Smith_Machine_Romanian_Deadlift.mp4',
    url: 'https://youtu.be/xWnlfJaQZ3k'
  },
  {
    id: 134,
    name: 'Goblet Squat',
    fileName: 'edb-Goblet_Squat.mp4',
    url: 'https://youtu.be/6mf0oa2GGUc'
  },
  {
    id: 121,
    name: 'Pull Through',
    fileName: 'edb-Pull_Through.mp4',
    url: 'https://youtu.be/sFQtAuiVwyo'
  },
  {
    id: 125,
    name: 'Palms-Up Dumbbell Wrist Curl Over A Bench',
    fileName: 'edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4',
    url: 'https://youtu.be/3rsKOL8scsU'
  }
];

console.log(`Starting clean download and conversion for ${targets.length} exercises...\n`);

const results = [];

targets.forEach((item, index) => {
  const outPath = path.join(assetsDir, item.fileName);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`[${index + 1}/${targets.length}] ⏩ ALREADY DOWNLOADED: ${item.name} (${item.fileName})`);
    results.push({ ...item, status: 'EXISTS', size: fs.statSync(outPath).size });
    return;
  }

  console.log(`[${index + 1}/${targets.length}] ⏳ DOWNLOADING: ${item.name} (${item.url})`);
  const tempRaw = path.join(binDir, `temp_${item.id}.mp4`);

  try {
    // 1. Download single best video stream
    execFileSync(ytdlp, [
      '-f', 'bestvideo[height<=720]/bestvideo/best',
      '-o', tempRaw,
      '--force-overwrites',
      '--no-playlist',
      item.url
    ], { stdio: 'pipe' });

    if (fs.existsSync(tempRaw)) {
      // 2. Remux / faststart with ffmpeg without audio
      execFileSync(ffmpeg, [
        '-y',
        '-i', tempRaw,
        '-c:v', 'copy',
        '-an',
        '-movflags', '+faststart',
        outPath
      ], { stdio: 'pipe' });

      try { fs.unlinkSync(tempRaw); } catch(e) {}

      const stat = fs.statSync(outPath);
      console.log(`✅ SUCCESS: ${item.fileName} (${(stat.size / 1024 / 1024).toFixed(2)} MB)\n`);
      results.push({ ...item, status: 'SUCCESS', size: stat.size });
    } else {
      console.error(`❌ FAILED: No file created for ${item.name}\n`);
      results.push({ ...item, status: 'FAILED' });
    }
  } catch (err) {
    console.error(`❌ ERROR on ${item.name}:`, err.message, '\n');
    results.push({ ...item, status: 'ERROR', error: err.message });
  }
});

console.log('\n=== DOWNLOAD SUMMARY ===');
console.table(results);
