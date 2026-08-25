const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const binDir = path.resolve(__dirname, 'bin');
const ytdlp = path.join(binDir, 'yt-dlp.exe');
const ffmpeg = path.join(binDir, 'ffmpeg.exe');
const ytBackupDir = path.resolve(__dirname, '../public/exercise-assets/youtube-backup');

if (!fs.existsSync(ytBackupDir)) {
  fs.mkdirSync(ytBackupDir, { recursive: true });
}

const targets = [
  { id: 101, name: 'Smith Machine Incline Bench Press', fileName: 'edb-Smith_Machine_Incline_Bench_Press.mp4', url: 'https://youtu.be/VXaBbUYMfIs?si=pOB-MkazqZiMP_KX' },
  { id: 102, name: 'Seated Cable Rows', fileName: 'edb-Seated_Cable_Rows.mp4', url: 'https://youtu.be/qD1WZ5pSuvk?si=JbbritEwFpnqjPHz' },
  { id: 103, name: 'Dumbbell Bench Press', fileName: 'edb-Dumbbell_Bench_Press.mp4', url: 'https://youtu.be/WbCEvFA0NJs?si=n6uJrVnL8SbZLnii' },
  { id: 105, name: 'Triceps Pushdown', fileName: 'edb-Triceps_Pushdown.mp4', url: 'https://youtu.be/1FjkhpZsaxc?si=UF5-0LJTCd_pEhy3' },
  { id: 106, name: 'Dumbbell Alternate Bicep Curl', fileName: 'edb-Dumbbell_Alternate_Bicep_Curl.mp4', url: 'https://youtu.be/MKWBV29S6c0?si=JV1BM77vAR6VuQYG' },
  { id: 108, name: 'Smith Machine Squat', fileName: 'edb-Smith_Machine_Squat.mp4', url: 'https://youtu.be/iKCJCydYYrE?si=ICtqLU9ov9eFaHfL' },
  { id: 109, name: 'Romanian Deadlift', fileName: 'edb-Romanian_Deadlift.mp4', url: 'https://youtu.be/xY8BywOKkLQ?si=B1A9ulZ-Cz67GNw6' },
  { id: 114, name: 'Dumbbell Shoulder Press', fileName: 'edb-Dumbbell_Shoulder_Press.mp4', url: 'https://youtu.be/k6tzKisR3NY?si=g67rT52vc6oWjiFC' },
  { id: 115, name: 'Smith Machine Bench Press', fileName: 'edb-Smith_Machine_Bench_Press.mp4', url: 'https://youtu.be/gQ3afio08V8?si=DfCKjmSAhUMXjMl_' },
  { id: 116, name: 'Cable Rear Delt Fly', fileName: 'edb-Cable_Rear_Delt_Fly_1.mp4', url: 'https://youtu.be/cGXBVOc5xIk?si=ve9zzcNdiyNqYF5I' },
  { id: 117, name: 'Cable Rope Overhead Triceps Extension', fileName: 'edb-Cable_Rope_Overhead_Triceps_Extension.mp4', url: 'https://youtu.be/9Ark9S11uXw?si=pEAe5tf66v5yUToU' },
  { id: 119, name: 'Split Squat with Dumbbells', fileName: 'edb-Split_Squat_with_Dumbbells.mp4', url: 'https://youtu.be/or1frhkjBDc?si=FR7v-hKp_QP4-Rpn' },
  { id: 135, name: 'Barbell Bench Press - Medium Grip', fileName: 'edb-Barbell_Bench_Press_-_Medium_Grip.mp4', url: 'https://youtu.be/rT7DgCr-3pg' }
];

console.log(`Downloading ${targets.length} YouTube reference backups to public/exercise-assets/youtube-backup...\n`);

targets.forEach((item, idx) => {
  const outPath = path.join(ytBackupDir, item.fileName);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`[${idx + 1}/${targets.length}] ⏩ ALREADY EXISTS: ${item.fileName}`);
    return;
  }

  console.log(`[${idx + 1}/${targets.length}] ⏳ DOWNLOADING: ${item.name}`);
  const tempRaw = path.join(binDir, `temp_yt_backup_${item.id}.mp4`);

  try {
    execFileSync(ytdlp, [
      '-f', 'bestvideo[height<=720]/bestvideo/best',
      '-o', tempRaw,
      '--force-overwrites',
      '--no-playlist',
      item.url
    ], { stdio: 'pipe' });

    if (fs.existsSync(tempRaw)) {
      execFileSync(ffmpeg, [
        '-y',
        '-i', tempRaw,
        '-c:v', 'copy',
        '-an',
        '-movflags', '+faststart',
        outPath
      ], { stdio: 'pipe' });

      try { fs.unlinkSync(tempRaw); } catch(e) {}
      const size = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
      console.log(`✅ SUCCESS: ${item.fileName} (${size} MB)\n`);
    }
  } catch (e) {
    console.error(`❌ ERROR on ${item.name}:`, e.message, '\n');
  }
});

console.log('Finished downloading YouTube backups!');
