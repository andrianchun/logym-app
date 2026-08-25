const fs = require('fs');
const path = require('path');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const assetsDir = path.resolve('public/exercise-assets');
const baseDir = path.resolve('ai_references');

const allFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => !fs.statSync(path.join(assetsDir, f)).isDirectory()) : [];

const exercises = [
  // 1. CHEST
  { name: 'Dumbbell Bench Press', muscles: 'mid chest (pectoralis major), front delts, triceps', equip: 'pair of dumbbells and flat bench', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Incline Dumbbell Press', muscles: 'upper chest (clavicular head), front delts, triceps', equip: 'pair of dumbbells and 30-45 degree incline bench', schedule: 'Chest Staple', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Barbell Bench Press - Medium Grip', muscles: 'mid chest, triceps, anterior delts', equip: 'Olympic barbell and flat bench press station', schedule: 'Chest Staple', cameraAngle: 'stationary 45-degree angle' },
  { name: 'Smith Machine Bench Press', muscles: 'mid chest, triceps, anterior delts', equip: 'Smith machine flat bench with vertical guide rails', schedule: 'Upper 2', cameraAngle: 'stationary 45-degree front-side angle' },
  { name: 'Smith Machine Incline Bench Press', muscles: 'upper chest, anterior delts, triceps', equip: 'Smith machine 30-degree incline bench with vertical guide rails', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Pushups', muscles: 'chest, triceps, anterior delts, core', equip: 'bodyweight on gym floor mat', schedule: 'Bodyweight Staple', cameraAngle: 'stationary side 45-degree angle' },
  { name: 'Cable Crossover', muscles: 'inner and lower chest, anterior delts', equip: 'dual high cable pulleys with D-handles', schedule: 'Chest Staple', cameraAngle: 'stationary front-center eye-level' },

  // 2. BACK & LATS
  { name: 'Wide-Grip Lat Pulldown', muscles: 'latissimus dorsi, upper back, biceps', equip: 'lat pulldown machine with wide bar', schedule: 'Upper 2', cameraAngle: 'stationary rear 3/4 angle' },
  { name: 'Seated Cable Rows', muscles: 'rhomboids, latissimus dorsi, middle traps, biceps', equip: 'low cable row machine with V-bar close grip handle', schedule: 'Upper 1', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Pullups', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar station', schedule: 'Back Staple', cameraAngle: 'stationary rear back view' },
  { name: 'Bent Over Two-Dumbbell Row', muscles: 'latissimus dorsi, rhomboids, rear delts', equip: 'pair of dumbbells in bent-over hip-hinged torso stance', schedule: 'Back Staple', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Barbell Deadlift', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell on deadlift platform', schedule: 'Back/Legs Staple', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Dumbbell Shrug', muscles: 'upper trapezius, neck', equip: 'heavy pair of dumbbells at sides standing tall', schedule: 'Upper 2', cameraAngle: 'stationary front eye-level angle' },

  // 3. SHOULDERS
  { name: 'Dumbbell Shoulder Press', muscles: 'anterior and lateral delts, triceps', equip: 'pair of dumbbells on 90-degree upright bench', schedule: 'Upper 2', cameraAngle: 'stationary front 3/4 eye-level angle' },
  { name: 'Cable Seated Lateral Raise', muscles: 'lateral delts (side shoulders)', equip: 'low cable pulley with single-hand cuff seated on flat bench', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Cable Rear Delt Fly', muscles: 'posterior deltoids (rear delts), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms with cable stoppers (no handles)', schedule: 'Upper 2', cameraAngle: 'stationary rear view from behind athlete capturing posterior deltoid squeeze' },
  { name: 'Face Pull', muscles: 'posterior delts, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level', schedule: 'Shoulders Staple', cameraAngle: 'stationary side-profile 45-degree angle' },

  // 4. LEGS & GLUTES
  { name: 'Smith Machine Squat', muscles: 'quadriceps, glutes, hamstrings', equip: 'Smith machine bar across upper traps', schedule: 'Lower 1', cameraAngle: 'stationary side 45-degree angle' },
  { name: 'Barbell Squat', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell on squat rack', schedule: 'Legs Staple', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Romanian Deadlift', muscles: 'hamstrings, glutes, lower back', equip: 'Olympic barbell held at hip level hinged back', schedule: 'Lower 1', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Smith Machine Stiff-Legged Deadlift', muscles: 'hamstrings, glutes, lower back', equip: 'Smith machine bar lowered along vertical guide rails past shins', schedule: 'Lower 2 (SM RDL)', cameraAngle: 'stationary side-profile angle' },
  { name: 'Split Squat with Dumbbells', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position', schedule: 'Lower 2', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Barbell Walking Lunge', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell across upper back walking forward', schedule: 'Lower 1', cameraAngle: 'stationary front-facing track angle' },
  { name: 'Rocking Standing Calf Raise', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine', schedule: 'Lower 1', cameraAngle: 'stationary low-angle side view' },
  { name: 'Seated Calf Raise', muscles: 'soleus and gastrocnemius (calves)', equip: 'seated calf raise machine with knee pad', schedule: 'Lower 2', cameraAngle: 'stationary side-profile angle' },

  // 5. ARMS (BICEPS & TRICEPS)
  { name: 'Dumbbell Alternate Bicep Curl', muscles: 'biceps brachii, brachialis, forearms', equip: 'pair of dumbbells alternating arms with supination', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 eye-level angle' },
  { name: 'Hammer Curls', muscles: 'brachioradialis, brachialis, outer biceps', equip: 'pair of dumbbells in neutral hammer grip', schedule: 'Arms Staple', cameraAngle: 'stationary front 3/4 eye-level angle' },
  { name: 'High Cable Curls', muscles: 'bicep peak (inner biceps)', equip: 'dual high cable pulleys in front double biceps pose', schedule: 'Upper 2', cameraAngle: 'stationary front-center symmetrical angle' },
  { name: 'Triceps Pushdown', muscles: 'lateral and long head of triceps', equip: 'high cable pulley with straight bar or V-bar', schedule: 'Upper 1', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Cable Rope Overhead Triceps Extension', muscles: 'triceps long head', equip: 'low-to-mid cable pulley with rope attachment facing away overhead', schedule: 'Upper 2', cameraAngle: 'stationary side 45-degree angle' },

  // 6. CORE
  { name: 'Cable Crunch', muscles: 'rectus abdominis (six pack abs)', equip: 'high cable pulley with rope held beside ears on knees', schedule: 'Lower 1', cameraAngle: 'stationary side-profile angle' }
];

const sanitize = (str) => String(str).replace(/[\s\(\)\/]+/g, '_');

const checkAsset = (name, extType) => {
  const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return allFiles.find(file => {
    const isExt = extType === 'video' ? (file.endsWith('.mp4') || file.endsWith('.webm')) : (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg'));
    if (!isExt) return false;
    const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normFile.includes(normName) || normName.includes(normFile.replace(/^edb/, ''));
  });
};

let md = `# Panduan Prompt AI Teroptimasi (Ringkas & Presisi)

> **🎯 Formula Prompt Ringkas (50% Lebih Pendek, 100% Akurat)**:
> 1. **🖼️ Image Prompt**: 1:1 Single Hero Shot, wajah & tubuh identik coach, highlight neon cyan terisolasi HANYA pada otot target.
> 2. **🎥 Video Prompt**: Fixed Steady Tripod Shot, atlet fokus dengan mulut tertutup (no talking), biomekanik akurat, isolated cyan pulse loop.
> 3. **📁 Folder Aset Tunggal**: Simpan semua hasil ke \`public/exercise-assets/edb-<Nama_Latihan>.(webp|mp4)\`.

---

## 📊 1. Ringkasan Status Aset Batch 1 (31 Latihan)

| No | Nama Latihan | Jadwal | Status Thumb | Status Video | File Target di <code>public/exercise-assets/</code> |
| :---: | :--- | :--- | :---: | :---: | :--- |
`;

exercises.forEach((item, idx) => {
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const foundVid = checkAsset(item.name, 'video');
  const foundThumb = checkAsset(item.name, 'thumb');
  const vidStatus = foundVid ? '✅ **Ada**' : '❌ **Belum**';
  const thumbStatus = foundThumb ? '✅ **Ada**' : '❌ **Belum**';
  const targetBase = 'edb-' + sanitize(item.name);

  md += `| ${idx + 1} | **${ex?.name || item.name}** | ${item.schedule} | ${thumbStatus} | ${vidStatus} | <code>${foundThumb || targetBase + '.webp'}</code><br/><code>${foundVid || targetBase + '.mp4'}</code> |\n`;
});

md += `\n---\n\n## 📋 2. Daftar Prompt Ringkas & Optimal (31 Latihan)\n\n`;

let count = 0;
exercises.forEach(item => {
  count++;
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const exId = ex?.exerciseId || ex?.id?.replace(/^edb-/, '') || sanitize(item.name);
  const previewUrl = ex?.gifUrl && ex.gifUrl.startsWith('http') ? ex.gifUrl : `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/0.jpg`;
  const folderName = `${String(count).padStart(2, '0')}_${(ex ? ex.name : item.name).replace(/[\s\(\)\/]+/g, '_')}`;

  const foundVid = checkAsset(item.name, 'video');
  const foundThumb = checkAsset(item.name, 'thumb');
  const targetBase = 'edb-' + sanitize(item.name);

  // Concise How-to steps
  let howtoCompact = '';
  if (item.name === 'Cable Rear Delt Fly') {
    howtoCompact = '1. Stand tall between dual high pulleys holding cable stoppers with arms crossed at shoulder height. 2. Pull arms horizontally outward and backward in a wide reverse arc, keeping elbows slightly bent. 3. Squeeze rear delts hard at peak expansion without shrugging traps. 4. Slowly return under control to starting cross position.';
  } else if (ex?.instructions_en && Array.isArray(ex.instructions_en) && ex.instructions_en.length > 0) {
    howtoCompact = ex.instructions_en.slice(0, 4).map((s, idx) => `${idx + 1}. ${s.trim()}`).join(' ');
  } else {
    howtoCompact = `Setup with ${item.equip}. Execute strict repetition with 2s lowering and 1s explosive peak squeeze targeting ${item.muscles}.`;
  }

  // 1. CONCISE IMAGE PROMPT
  const promptImage = `Single 1:1 hero shot. The identical shredded muscular Asian male fitness coach from Image 1, shirtless in black compression shorts, calm focused face with closed mouth. Performing "${item.name}" with ${item.equip} in a dark modern gym, captured at peak muscle contraction matching Image 3. Delicate glowing neon cyan wireframe highlight strictly isolated ONLY on the ${item.muscles} (no glow on face, neck, abs, legs, or background). Cinematic rim lighting, 8k resolution, photorealistic.`;

  // 2. CONCISE VIDEO PROMPT
  const promptVideo = `Fixed steady tripod shot (${item.cameraAngle}). Strictly NO 360 rotation, NO camera orbit, NO panning. The identical shredded Asian fitness coach from Image 1 executes 1 perfect rep of "${item.name}" using ${item.equip}. 
Stoic focus, mouth strictly closed (zero talking/moving mouth).
Movement: ${howtoCompact}
VFX: Delicate glowing cyan wireframe highlight strictly confined to ${item.muscles}, pulsing softly at peak contraction. Rest of body 100% natural non-glowing human skin. 60fps, seamless loop, 8k.`;

  md += `### ${count}. ${ex?.name || item.name} (${item.schedule})\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:8px;">\n`;
  md += `  <img src="${previewUrl}" width="110" style="border-radius:10px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>🖼️ Thumb:</b> ${foundThumb ? '✅ <code>' + foundThumb + '</code>' : '❌ Target: <code>' + targetBase + '.webp</code>'}</p>\n`;
  md += `    <p><b>🎥 Video:</b> ${foundVid ? '✅ <code>' + foundVid + '</code>' : '❌ Target: <code>' + targetBase + '.mp4</code>'}</p>\n`;
  md += `    <p><b>🎯 Otot:</b> ${item.muscles}</p>\n`;
  md += `    <p><b>📁 Folder:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**🖼️ Image Prompt (1:1 Single Hero):**\n`;
  md += `\`\`\`text\n${promptImage}\n\`\`\`\n\n`;
  md += `**🎥 Video Prompt (Fixed Steady + Closed Mouth):**\n`;
  md += `\`\`\`text\n${promptVideo}\n\`\`\`\n\n---\n\n`;

  // Update prompt_guide.txt
  const folderPath = path.join(baseDir, folderName);
  if (fs.existsSync(folderPath)) {
    const fullGuide = `=== EXERCISE: ${ex?.name || item.name} ===
ID: ${exId}
Target: ${item.muscles}
Equipment: ${item.equip}

================================================================================
1. PROMPT IMAGE (1:1 SINGLE HERO - PINPOINT CYAN HIGHLIGHT)
Upload to ChatGPT: 00_coach_reference.jpg, 1_end_pose.jpg
================================================================================
${promptImage}

================================================================================
2. PROMPT VIDEO (STEADY TRIPOD + CLOSED MOUTH + PINPOINT PULSE)
Upload to Kling AI / Runway / Luma (Upload Single Hero Image as First Frame)
================================================================================
${promptVideo}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully optimized and shortened all prompts!');
