const fs = require('fs');
const path = require('path');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const baseDir = path.resolve('ai_references');

const exercises = [
  { name: 'Dumbbell Bench Press', muscles: 'mid chest (pectoralis major), front deltoids, triceps', equip: 'pair of dumbbells and flat gym bench' },
  { name: 'Incline Dumbbell Press', muscles: 'upper chest (clavicular head), front deltoids, triceps', equip: 'pair of dumbbells and 30-45 degree incline gym bench' },
  { name: 'Barbell Bench Press - Medium Grip', muscles: 'mid chest, triceps, anterior deltoids', equip: 'standard Olympic barbell and flat bench press station' },
  { name: 'Smith Machine Bench Press', muscles: 'mid chest, triceps, anterior deltoids', equip: 'Smith machine with horizontal flat bench' },
  { name: 'Smith Machine Incline Bench Press', muscles: 'upper chest, anterior deltoids, triceps', equip: 'Smith machine with 30-degree incline bench' },
  { name: 'Pushups', muscles: 'chest, triceps, anterior deltoids, core', equip: 'bodyweight on gym floor mat' },
  { name: 'Cable Crossover', muscles: 'inner and lower chest, anterior deltoids', equip: 'dual cable crossover machine with D-handles' },
  { name: 'Wide-Grip Lat Pulldown', muscles: 'latissimus dorsi, upper back, biceps', equip: 'cable lat pulldown machine with wide bar' },
  { name: 'Seated Cable Rows', muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', equip: 'low cable seated row machine with V-bar / close grip handle' },
  { name: 'Pullups', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar / power tower' },
  { name: 'Bent Over Two-Dumbbell Row', muscles: 'latissimus dorsi, rhomboids, rear deltoids', equip: 'pair of heavy dumbbells in bent-over torso position' },
  { name: 'Barbell Deadlift', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell with bumper plates on lifting platform' },
  { name: 'Dumbbell Shrug', muscles: 'upper trapezius, neck muscles', equip: 'heavy pair of dumbbells held at sides' },
  { name: 'Dumbbell Shoulder Press', muscles: 'anterior and lateral deltoids, upper chest, triceps', equip: 'pair of dumbbells seated on 90-degree upright bench' },
  { name: 'Cable Seated Lateral Raise', muscles: 'lateral deltoids (side shoulder)', equip: 'low cable pulley with single-hand cuff seated on flat bench' },
  { name: 'Cable Rear Delt Fly', muscles: 'posterior deltoids (rear delt), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms' },
  { name: 'Face Pull', muscles: 'posterior deltoids, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level' },
  { name: 'Smith Machine Squat', muscles: 'quadriceps, gluteus maximus, hamstrings', equip: 'Smith machine bar rested on upper traps' },
  { name: 'Barbell Squat', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell on squat rack' },
  { name: 'Romanian Deadlift', muscles: 'hamstrings, gluteus maximus, spinal erectors', equip: 'Olympic barbell held at hip level hinged back' },
  { name: 'Smith Machine Stiff-Legged Deadlift', muscles: 'hamstrings, gluteus maximus, lower back', equip: 'Smith machine bar lowered past shins' },
  { name: 'Split Squat with Dumbbells', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position' },
  { name: 'Barbell Walking Lunge', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell on upper back walking forward' },
  { name: 'Rocking Standing Calf Raise', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine' },
  { name: 'Seated Calf Raise', muscles: 'soleus and gastrocnemius (lower calves)', equip: 'seated calf raise machine / dumbbell on knees' },
  { name: 'Dumbbell Alternate Bicep Curl', muscles: 'biceps brachii, brachialis, forearms', equip: 'pair of dumbbells alternating arms with supination' },
  { name: 'Hammer Curls', muscles: 'brachioradialis (forearm), brachialis, outer biceps', equip: 'pair of dumbbells held in neutral hammer grip' },
  { name: 'High Cable Curls', muscles: 'bicep peak (biceps brachii inner head)', equip: 'dual high cable pulleys in front double biceps pose' },
  { name: 'Triceps Pushdown', muscles: 'lateral and long head of triceps brachii', equip: 'high cable pulley with straight bar or V-bar' },
  { name: 'Cable Rope Overhead Triceps Extension', muscles: 'triceps long head', equip: 'low-to-mid cable pulley with rope attachment facing away overhead' },
  { name: 'Cable Crunch', muscles: 'rectus abdominis (six pack abs), upper core', equip: 'high cable pulley with rope held beside ears on knees' }
];

let count = 0;
exercises.forEach(item => {
  count++;
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const exId = ex?.exerciseId || ex?.id?.replace(/^edb-/, '') || item.name.replace(/[\s\(\)\/]+/g, '_');
  const folderName = `${String(count).padStart(2, '0')}_${ex ? ex.name.replace(/[\\/:*?"<>|]/g, '_') : item.name}`;
  const folderPath = path.join(baseDir, folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const promptText = `Generate a 4-panel 2x2 grid collage visual exercise guide in the exact same style, camera angles, dramatic dark gym atmosphere, and identical shredded muscular Asian male fitness coach character as shown in Image 1. 

The character is performing "${item.name}" using ${item.equip}, precisely following the biomechanics from Image 2 (starting position) and Image 3 (full contraction position):
- Top-Left: Starting position with proper grip and setup
- Top-Right: Peak contraction / lockout position
- Bottom-Left: Rear or 45-degree side angle showing full body alignment
- Bottom-Right: Cinematic close-up macro view focusing on the working muscle fibers

Include hyper-detailed glowing cyan / neon electric blue anatomical muscle highlight overlay specifically emphasizing active engagement on the ${item.muscles}. Dark modern aesthetic gym background, moody atmospheric lighting, strong rim lights accentuating muscle striations, 8k resolution, ultra-photorealistic, masterpiece.`;

  const instructions = Array.isArray(ex?.instructions) ? ex.instructions.join('\n') : (ex?.instructions || '');
  const instructionsEn = Array.isArray(ex?.instructions_en) ? ex.instructions_en.join('\n') : (ex?.instructions_en || '');
  const targets = Array.isArray(ex?.target) ? ex.target.join(', ') : (ex?.target || item.muscles);

  const fullGuide = `=== EXERCISE: ${ex?.name || item.name} ===
ID: ${exId}
Target Muscles: ${targets}
Equipment: ${item.equip}

[CARA MELAKUKAN (ID)]:
${instructions}

[INSTRUCTIONS (EN)]:
${instructionsEn}

==================================================
[PROMPT SIAP COPAS KE CHATGPT / MIDJOURNEY]
(Upload: 1. Gambar Coach Acuan, 2. 0_start_pose.jpg, 3. 1_end_pose.jpg)
==================================================
${promptText}
`;

  fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
});

console.log('Successfully updated all 31 prompt_guide.txt files!');
