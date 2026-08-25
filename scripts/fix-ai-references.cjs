const fs = require('fs');
const path = require('path');
const https = require('https');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const base = path.resolve('ai_references');
const coachImgPath = path.join(base, 'coach_reference.jpg');

const exercises = [
  'Dumbbell Bench Press',
  'Incline Dumbbell Press',
  'Barbell Bench Press - Medium Grip',
  'Smith Machine Bench Press',
  'Smith Machine Incline Bench Press',
  'Pushups',
  'Cable Crossover',
  'Wide-Grip Lat Pulldown',
  'Seated Cable Rows',
  'Pullups',
  'Bent Over Two-Dumbbell Row',
  'Barbell Deadlift',
  'Dumbbell Shrug',
  'Dumbbell Shoulder Press',
  'Cable Seated Lateral Raise',
  'Cable Rear Delt Fly',
  'Face Pull',
  'Smith Machine Squat',
  'Barbell Squat',
  'Romanian Deadlift',
  'Smith Machine Stiff-Legged Deadlift',
  'Split Squat with Dumbbells',
  'Barbell Walking Lunge',
  'Rocking Standing Calf Raise',
  'Seated Calf Raise',
  'Dumbbell Alternate Bicep Curl',
  'Hammer Curls',
  'High Cable Curls',
  'Triceps Pushdown',
  'Cable Rope Overhead Triceps Extension',
  'Cable Crunch'
];

const downloadFile = (url, dest) => {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(true));
        });
      } else {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        resolve(false);
      }
    }).on('error', () => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      resolve(false);
    });
  });
};

async function run() {
  console.log('=== CLEANING & FIXING ALL 31 AI REFERENCE FOLDERS ===\n');

  // 1. Get list of valid target folder names
  const validFolders = exercises.map((name, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    return `${num}_${name.replace(/[\s\(\)\/]+/g, '_')}`;
  });

  // 2. Remove obsolete or duplicated folders in ai_references
  const existingFolders = fs.readdirSync(base).filter(f => fs.statSync(path.join(base, f)).isDirectory());
  for (const f of existingFolders) {
    if (!validFolders.includes(f)) {
      const p = path.join(base, f);
      console.log(`🗑️ Removing obsolete/duplicated folder: ${f}`);
      fs.rmSync(p, { recursive: true, force: true });
    }
  }

  // 3. For each of the 31 exercises, ensure folder and all 3 images exist
  for (let i = 0; i < exercises.length; i++) {
    const name = exercises[i];
    const folderName = validFolders[i];
    const folderPath = path.join(base, folderName);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Ensure 00_coach_reference.jpg
    const coachDst = path.join(folderPath, '00_coach_reference.jpg');
    if (fs.existsSync(coachImgPath)) {
      fs.copyFileSync(coachImgPath, coachDst);
    }

    // Find in edb
    let ex = edb.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(name.toLowerCase()));

    const exId = ex?.exerciseId || ex?.id?.replace(/^edb-/, '') || name.replace(/[\s\(\)\/]+/g, '_');

    const startPosePath = path.join(folderPath, '0_start_pose.jpg');
    const endPosePath = path.join(folderPath, '1_end_pose.jpg');

    if (!fs.existsSync(startPosePath) || fs.statSync(startPosePath).size < 1000) {
      console.log(`⬇️ Downloading 0_start_pose.jpg for ${name} (${exId})...`);
      const url0 = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/0.jpg`;
      const ok = await downloadFile(url0, startPosePath);
      if (!ok) console.log(`   ⚠️ Failed to download 0.jpg from ${url0}`);
    }

    if (!fs.existsSync(endPosePath) || fs.statSync(endPosePath).size < 1000) {
      console.log(`⬇️ Downloading 1_end_pose.jpg for ${name} (${exId})...`);
      const url1 = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/1.jpg`;
      const ok = await downloadFile(url1, endPosePath);
      if (!ok) console.log(`   ⚠️ Failed to download 1.jpg from ${url1}`);
    }

    const filesInFolder = fs.readdirSync(folderPath);
    console.log(`✅ [${String(i + 1).padStart(2, '0')}] ${name}: ${filesInFolder.join(', ')}`);
  }

  console.log('\nAll 31 folders cleaned and verified!');
}

run();
