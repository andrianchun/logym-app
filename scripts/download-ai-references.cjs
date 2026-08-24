const fs = require('fs');
const path = require('path');
const https = require('https');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));

// Target Batch 1 exercises
const targetNames = [
  'Dumbbell Bench Press',
  'Incline Dumbbell Press',
  'Barbell Bench Press - Medium Grip',
  'Smith Machine Bench Press',
  'Smith Machine Incline Bench Press',
  'Pushups',
  'Pullups',
  'Wide-Grip Lat Pulldown',
  'Seated Cable Rows',
  'Bent Over Two-Dumbbell Row',
  'Barbell Deadlift',
  'Dumbbell Shrug',
  'Dumbbell Shoulder Press',
  'Cable Seated Lateral Raise',
  'Cable Rear Delt Fly',
  'Face Pull',
  'Cable Crossover',
  'Smith Machine Squat',
  'Barbell Squat',
  'Romanian Deadlift',
  'Smith Machine Stiff-Legged Deadlift',
  'Split Squat with Dumbbells',
  'Barbell Walking Lunge',
  'Rocking Standing Calf Raise',
  'Seated Calf Raise',
  'Dumbbell Alternate Bicep Curl',
  'High Cable Curls',
  'Hammer Curls',
  'Triceps Pushdown',
  'Cable Rope Overhead Triceps Extension',
  'Cable Crunch'
];

const outputBaseDir = path.resolve('ai_references');
if (!fs.existsSync(outputBaseDir)) {
  fs.mkdirSync(outputBaseDir, { recursive: true });
}

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(dest, () => {});
        resolve(false); // ignore if 404
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      resolve(false);
    });
  });
};

async function run() {
  console.log(`Starting reference image download for ${targetNames.length} exercises into: ${outputBaseDir}\n`);

  let count = 0;
  for (const name of targetNames) {
    let ex = edb.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!ex) {
      ex = edb.find(e => e.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(e.name.toLowerCase()));
    }

    if (!ex) {
      console.log(`⚠️ Not found in database: ${name}`);
      continue;
    }

    const exId = ex.exerciseId || ex.id?.replace(/^edb-/, '') || ex.name.replace(/[\s\(\)\/]+/g, '_');
    const folderName = `${String(++count).padStart(2, '0')}_${ex.name.replace(/[\\/:*?"<>|]/g, '_')}`;
    const exDir = path.join(outputBaseDir, folderName);

    if (!fs.existsSync(exDir)) {
      fs.mkdirSync(exDir, { recursive: true });
    }

    const url0 = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/0.jpg`;
    const url1 = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/1.jpg`;

    const dest0 = path.join(exDir, '0_start_pose.jpg');
    const dest1 = path.join(exDir, '1_end_pose.jpg');

    await downloadFile(url0, dest0);
    await downloadFile(url1, dest1);

    // Create a handy AI prompt guide text file for each exercise
    const instructions = Array.isArray(ex.instructions) ? ex.instructions.join('\n') : (ex.instructions || '');
    const instructionsEn = Array.isArray(ex.instructions_en) ? ex.instructions_en.join('\n') : (ex.instructions_en || '');
    const targets = Array.isArray(ex.target) ? ex.target.join(', ') : (ex.target || '');
    const equip = ex.equipment || (Array.isArray(ex.equipments) ? ex.equipments.join(', ') : '');

    const promptText = `=== EXERCISE: ${ex.name} ===
ID: ${exId}
Target Muscles: ${targets}
Equipment: ${equip}

[CARA MELAKUKAN (ID)]:
${instructions}

[INSTRUCTIONS (EN)]:
${instructionsEn}

[AI VIDEO PROMPT SUGGESTION]:
A muscular fitness athlete performing ${ex.name} with proper gym form, clean repetition, starting from start pose (0_start_pose.jpg) to end contraction pose (1_end_pose.jpg) and returning smoothly, cinematic gym lighting, 4k resolution, hyperrealistic.
`;

    fs.writeFileSync(path.join(exDir, 'prompt_guide.txt'), promptText, 'utf8');
    console.log(`✅ [${count}/${targetNames.length}] ${folderName} -> 0_start_pose.jpg, 1_end_pose.jpg, prompt_guide.txt`);
  }

  console.log('\n🎉 ALL REFERENCE ASSETS DOWNLOADED SUCCESSFULLY!');
}

run();
