const fs = require('fs');
const path = require('path');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const assetsDir = path.resolve('public/exercise-assets');
const baseDir = path.resolve('ai_references');

const allFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => !fs.statSync(path.join(assetsDir, f)).isDirectory()) : [];

const exercises = [
  // 1. CHEST
  { name: 'Dumbbell Bench Press', muscles: 'mid chest (pectoralis major), front deltoids, triceps', equip: 'pair of dumbbells and flat gym bench', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 angle slightly elevated' },
  { name: 'Incline Dumbbell Press', muscles: 'upper chest (clavicular head), front deltoids, triceps', equip: 'pair of dumbbells and 30-45 degree incline gym bench', schedule: 'Chest Staple', cameraAngle: 'stationary front 3/4 angle capturing incline bench angle' },
  { name: 'Barbell Bench Press - Medium Grip', muscles: 'mid chest, triceps, anterior deltoids', equip: 'standard Olympic barbell and flat bench press station', schedule: 'Chest Staple', cameraAngle: 'stationary 45-degree angle capturing bar path and chest' },
  { name: 'Smith Machine Bench Press', muscles: 'mid chest, triceps, anterior deltoids', equip: 'Smith machine with horizontal flat bench and locked vertical guide rails', schedule: 'Upper 2', cameraAngle: 'stationary 45-degree side-front angle' },
  { name: 'Smith Machine Incline Bench Press', muscles: 'upper chest, anterior deltoids, triceps', equip: 'Smith machine with 30-degree incline bench and locked vertical guide rails', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 angle capturing vertical track and upper chest' },
  { name: 'Pushups', muscles: 'chest, triceps, anterior deltoids, core', equip: 'bodyweight on gym floor mat', schedule: 'Bodyweight Staple', cameraAngle: 'stationary side 45-degree angle' },
  { name: 'Cable Crossover', muscles: 'inner and lower chest, anterior deltoids', equip: 'dual cable crossover machine with D-handles', schedule: 'Chest Staple', cameraAngle: 'stationary eye-level front-center angle' },

  // 2. BACK & LATS
  { name: 'Wide-Grip Lat Pulldown', muscles: 'latissimus dorsi, upper back, biceps', equip: 'cable lat pulldown machine with wide bar and thigh pads', schedule: 'Upper 2', cameraAngle: 'stationary front 3/4 angle or rear-back angle capturing lat flare' },
  { name: 'Seated Cable Rows', muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', equip: 'low cable seated row machine with V-bar close-grip handle and footrests', schedule: 'Upper 1', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Pullups', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar / power tower station', schedule: 'Back Staple', cameraAngle: 'stationary rear 3/4 back view capturing back contraction' },
  { name: 'Bent Over Two-Dumbbell Row', muscles: 'latissimus dorsi, rhomboids, rear deltoids', equip: 'pair of heavy dumbbells in bent-over torso position', schedule: 'Back Staple', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Barbell Deadlift', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell with bumper plates on lifting platform', schedule: 'Back/Legs Staple', cameraAngle: 'stationary front 3/4 angle capturing full body lockout' },
  { name: 'Dumbbell Shrug', muscles: 'upper trapezius, neck muscles', equip: 'heavy pair of dumbbells held at sides standing tall', schedule: 'Upper 2', cameraAngle: 'stationary front eye-level angle' },

  // 3. SHOULDERS
  { name: 'Dumbbell Shoulder Press', muscles: 'anterior and lateral deltoids, upper chest, triceps', equip: 'pair of dumbbells seated on 90-degree upright bench', schedule: 'Upper 2', cameraAngle: 'stationary front 3/4 eye-level angle' },
  { name: 'Cable Seated Lateral Raise', muscles: 'lateral deltoids (side shoulder)', equip: 'low cable pulley with single-hand cuff seated on flat bench', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 angle' },
  { name: 'Cable Rear Delt Fly', muscles: 'posterior deltoids (rear delt), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms with cable stoppers', schedule: 'Upper 2', cameraAngle: 'stationary front eye-level angle capturing crossed arms' },
  { name: 'Face Pull', muscles: 'posterior deltoids, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level', schedule: 'Shoulders Staple', cameraAngle: 'stationary side-profile 45-degree angle' },

  // 4. LEGS & GLUTES
  { name: 'Smith Machine Squat', muscles: 'quadriceps, gluteus maximus, hamstrings', equip: 'Smith machine bar on upper traps with vertical guide rails', schedule: 'Lower 1', cameraAngle: 'stationary side 45-degree angle capturing squat depth' },
  { name: 'Barbell Squat', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell across upper back on squat rack', schedule: 'Legs Staple', cameraAngle: 'stationary front 3/4 angle capturing depth and knee tracking' },
  { name: 'Romanian Deadlift', muscles: 'hamstrings, gluteus maximus, spinal erectors', equip: 'Olympic barbell held at hip level hinged back', schedule: 'Lower 1', cameraAngle: 'stationary side-profile 45-degree angle capturing hip hinge' },
  { name: 'Smith Machine Stiff-Legged Deadlift', muscles: 'hamstrings, gluteus maximus, lower back', equip: 'Smith machine bar lowered along vertical guide rails past shins', schedule: 'Lower 2 (SM RDL)', cameraAngle: 'stationary side-profile angle' },
  { name: 'Split Squat with Dumbbells', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position', schedule: 'Lower 2', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Barbell Walking Lunge', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell on upper back walking forward', schedule: 'Lower 1', cameraAngle: 'stationary front-facing track angle' },
  { name: 'Rocking Standing Calf Raise', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine', schedule: 'Lower 1', cameraAngle: 'stationary low-angle side view focusing on ankles and calves' },
  { name: 'Seated Calf Raise', muscles: 'soleus and gastrocnemius (lower calves)', equip: 'seated calf raise machine with knee pad and foot platform', schedule: 'Lower 2', cameraAngle: 'stationary side-profile angle capturing calf stretch' },

  // 5. ARMS (BICEPS & TRICEPS)
  { name: 'Dumbbell Alternate Bicep Curl', muscles: 'biceps brachii, brachialis, forearms', equip: 'pair of dumbbells alternating arms with supination', schedule: 'Upper 1', cameraAngle: 'stationary front 3/4 eye-level angle' },
  { name: 'Hammer Curls', muscles: 'brachioradialis (forearm), brachialis, outer biceps', equip: 'pair of dumbbells held in neutral hammer grip', schedule: 'Arms Staple', cameraAngle: 'stationary front 3/4 eye-level angle' },
  { name: 'High Cable Curls', muscles: 'bicep peak (biceps brachii inner head)', equip: 'dual high cable pulleys in front double biceps pose', schedule: 'Upper 2', cameraAngle: 'stationary front-center symmetrical angle' },
  { name: 'Triceps Pushdown', muscles: 'lateral and long head of triceps brachii', equip: 'high cable pulley with straight bar or V-bar', schedule: 'Upper 1', cameraAngle: 'stationary side-profile 45-degree angle' },
  { name: 'Cable Rope Overhead Triceps Extension', muscles: 'triceps long head', equip: 'low-to-mid cable pulley with rope attachment facing away overhead', schedule: 'Upper 2', cameraAngle: 'stationary side 45-degree angle' },

  // 6. CORE
  { name: 'Cable Crunch', muscles: 'rectus abdominis (six pack abs), upper core', equip: 'high cable pulley with rope held beside ears on knees', schedule: 'Lower 1', cameraAngle: 'stationary side-profile angle capturing abdominal flexion' }
];

const sanitize = (str) => {
  return String(str).replace(/[\s\(\)\/]+/g, '_');
};

const checkAsset = (name, extType) => {
  const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return allFiles.find(file => {
    const isExt = extType === 'video' ? (file.endsWith('.mp4') || file.endsWith('.webm')) : (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg'));
    if (!isExt) return false;
    const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normFile.includes(normName) || normName.includes(normFile.replace(/^edb/, ''));
  });
};

let md = `# Panduan Lengkap Prompt AI: Single Hero Frame & Steady Camera Video

> **🎯 Standar Video Sempurna: Steady Camera & Focused Stoic Athlete**:
> 1. **📹 Fixed Steady Tripod Camera**: Kamera diam stabil (tidak berputar/orbit, tidak panning, tidak goyang) di sudut terbaik untuk menangkap rentang gerak otot secara presisi.
> 2. **🤐 Wajah Tenang & Mulut Tertutup (No Talking/Moving Mouth)**: Ekspresi atlet fokus, mulut tertutup rapat, pernapasan hidung terkontrol tanpa gerakan mulut atau distorsi bicara.
> 3. **💡 Pinpoint Muscle Highlight**: Efek serat otot glowing cyan tipis hanya menyala di dalam batas otot target saat kontraksi.

---

## 📊 1. Tabel Ringkasan Status Aset Batch 1 (31 Latihan)

| No | Nama Latihan | Jadwal Rutin | Status Thumbnail | Status Video | Nama File di <code>public/exercise-assets/</code> |
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

md += `\n---

## 🎨 2. Cara Kerja & Alur Simpan

1. **Buka folder latihan di** \`ai_references/<nomor_latihan>/\`.
2. **Generate Gambar Thumbnail (Single Hero Shot 1:1)**:
   * **Upload ke ChatGPT**: \`00_coach_reference.jpg\` + foto acuan gerakan.
   * **Copas Prompt 1 (Single Hero Image)** di bawah.
   * **Simpan hasil ke**: \`public/exercise-assets/edb-<Nama_Latihan>.webp\`
3. **Generate Video AI (Kling / Runway / Luma / Haiper)**:
   * **Upload Gambar Single Hero** sebagai First Frame (*Image-to-Video*).
   * **Copas Prompt 2 (Steady Camera + Closed Mouth + Pinpoint Highlight)** di bawah.
   * **Simpan hasil ke**: \`public/exercise-assets/edb-<Nama_Latihan>.mp4\`

---

## 📋 3. Daftar Lengkap Prompt Single Hero & Steady Video (31 Latihan)

`;

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

  // 1. SINGLE HERO IMAGE PROMPT (Strict Pinpoint Isolation)
  const promptImage = `[FRAMING]: SINGLE HERO SHOT. FULL FRAME 1:1 SQUARE ASPECT RATIO. STRICTLY NO COLLAGE, NO SPLIT SCREEN, NO MULTIPLE PANELS.

Subject: A shredded muscular Asian male fitness coach with the exact same handsome facial features, short hairstyle, and lean muscular build as in Image 1, shirtless, wearing black athletic compression shorts. Calm focused gym expression with closed mouth.

Exercise & Setting:
The coach is performing "${item.name}" with proper gym biomechanics using ${item.equip} in a dark modern luxury gym. Captured at the peak contraction point matching Image 3.

[STRICT ANATOMICAL HIGHLIGHT - ISOLATED TO TARGET MUSCLES ONLY]:
Add a delicate, semi-transparent glowing cyan / neon electric blue wireframe muscle fiber overlay strictly and exclusively confined to the ${item.muscles}. 
CRITICAL NEGATIVE DIRECTIVE: DO NOT glow on the rest of the body. The coach's face, neck, head, abdomen, legs, and all non-working muscles MUST remain 100% natural, hyper-realistic, non-glowing human skin with natural sweat and vascularity. No full-body aura, no alien glow, only pinpoint muscle highlight.

Aesthetics & Lighting:
Moody atmospheric dark gym background, strong cinematic rim lighting highlighting muscle contours, 8k resolution, ultra-photorealistic, 1:1 square canvas.`;

  // 2. VIDEO PROMPT (Steady Camera + Closed Mouth + Step-by-Step How-To)
  let howtoSteps = '';
  if (ex?.instructions_en && Array.isArray(ex.instructions_en) && ex.instructions_en.length > 0) {
    howtoSteps = ex.instructions_en.map((step, sidx) => `${sidx + 1}. ${step}`).join(' ');
  } else if (typeof ex?.instructions_en === 'string' && ex.instructions_en.trim()) {
    howtoSteps = ex.instructions_en;
  } else {
    howtoSteps = `Perform ${item.name} with ${item.equip}. Starting with proper setup, executing controlled range of motion targeting ${item.muscles}, reaching full peak contraction, and returning under smooth eccentric control.`;
  }

  const promptVideo = `[CAMERA & CINEMATOGRAPHY]: FIXED STEADY TRIPOD SHOT. STATIC ROCK-SOLID CAMERA FRAMING at ${item.cameraAngle}. STRICTLY NO 360 ROTATION, NO CAMERA ORBIT, NO PANNING, NO SHAKY CAM. The camera remains completely still, keeping the athlete and biomechanics centered in frame.

Subject & Expression:
The identical shredded muscular Asian male fitness coach from the reference image performing "${item.name}" with ${item.equip}. 
CRITICAL FACIAL DIRECTIVE: STOIC FOCUSED WORKOUT EXPRESSION, MOUTH STRICTLY CLOSED. ZERO TALKING, ZERO MOUTH MOVEMENT, NO MUTTERING, NO TALKING ARTIFACTS.

Biomechanical Execution (Step-by-Step How-To):
${howtoSteps}

[STRICT PINPOINT MUSCLE HIGHLIGHT VFX]:
A delicate, semi-transparent glowing cyan / neon blue wireframe muscle fiber overlay is strictly and exclusively confined to the active working muscles (${item.muscles}). 
CRITICAL RULE: The face, neck, abdomen, legs, and all non-working muscles MUST REMAIN 100% NATURAL REALISTIC HUMAN SKIN WITH ZERO GLOW. No full-body glowing aura. The subtle cyan highlight pulses gently only inside the boundaries of the ${item.muscles} as they contract at the peak, then softens during eccentric stretch.

Tempo & Dynamics:
Controlled repetition tempo: 2 seconds slow lowering with deep muscle stretch, 1 second powerful lifting into peak contraction, holding top squeeze for 1 second. Clean seamless looping motion.

Visuals & Lighting:
Moody atmospheric gym, dramatic volumetric rim lighting highlighting muscle striations, 8k resolution, 60fps, crisp masterclass fitness production.`;

  md += `### ${count}. ${ex?.name || item.name} (${item.schedule})\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;">\n`;
  md += `  <img src="${previewUrl}" width="120" style="border-radius:12px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>🖼️ Status Thumbnail:</b> ${foundThumb ? '✅ <b>Ada</b> (<code>' + foundThumb + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.webp</code>)'}</p>\n`;
  md += `    <p><b>🎥 Status Video:</b> ${foundVid ? '✅ <b>Ada</b> (<code>' + foundVid + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.mp4</code>)'}</p>\n`;
  md += `    <p><b>📁 Folder Referensi:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `    <p><b>🎯 Otot Target (Pinpoint Cyan):</b> ${item.muscles}</p>\n`;
  md += `    <p><b>🏋️‍♂️ Alat & Posisi Kamera:</b> ${item.equip} (${item.cameraAngle})</p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**🖼️ Prompt Image (Single Hero 1:1 - Pinpoint Cyan Wireframe):**\n`;
  md += `\`\`\`text\n${promptImage}\n\`\`\`\n\n`;
  md += `**🎥 Prompt Video (Steady Fixed Camera + Closed Mouth + Pinpoint Pulse):**\n`;
  md += `\`\`\`text\n${promptVideo}\n\`\`\`\n\n---\n\n`;

  // Also update individual prompt_guide.txt in folder
  const folderPath = path.join(baseDir, folderName);
  if (fs.existsSync(folderPath)) {
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

================================================================================
1. PROMPT IMAGE (SINGLE HERO 1:1 SQUARE - STRICT PINPOINT CYAN HIGHLIGHT)
Upload to ChatGPT: 00_coach_reference.jpg, 0_start_pose.jpg / 1_end_pose.jpg
================================================================================
${promptImage}

================================================================================
2. PROMPT VIDEO (FIXED STEADY TRIPOD SHOT + CLOSED MOUTH + PINPOINT MUSCLE PULSE)
Upload to Kling AI / Runway Gen-3 / Luma Dream Machine / Haiper
(Upload your Single Hero image output as First Frame)
================================================================================
${promptVideo}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated all prompt guides to Steady Camera & Closed Mouth Directives!');
