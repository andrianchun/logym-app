const fs = require('fs');
const path = require('path');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const videosDir = path.resolve('public/exercise-assets/videos');
const thumbsDir = path.resolve('public/exercise-assets/thumbnails');
const baseDir = path.resolve('ai_references');

const existingVideos = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
const existingThumbs = fs.existsSync(thumbsDir) ? fs.readdirSync(thumbsDir) : [];

const exercises = [
  // 1. CHEST
  { name: 'Dumbbell Bench Press', layout: 'horizontal', muscles: 'mid chest (pectoralis major), front deltoids, triceps', equip: 'pair of dumbbells and flat gym bench', schedule: 'Upper 1' },
  { name: 'Incline Dumbbell Press', layout: 'horizontal', muscles: 'upper chest (clavicular head), front deltoids, triceps', equip: 'pair of dumbbells and 30-45 degree incline gym bench', schedule: 'Chest Staple' },
  { name: 'Barbell Bench Press - Medium Grip', layout: 'horizontal', muscles: 'mid chest, triceps, anterior deltoids', equip: 'standard Olympic barbell and flat bench press station', schedule: 'Chest Staple' },
  { name: 'Smith Machine Bench Press', layout: 'horizontal', muscles: 'mid chest, triceps, anterior deltoids', equip: 'Smith machine with horizontal flat bench and locked vertical guide rails', schedule: 'Upper 2' },
  { name: 'Smith Machine Incline Bench Press', layout: 'horizontal', muscles: 'upper chest, anterior deltoids, triceps', equip: 'Smith machine with 30-degree incline bench and locked vertical guide rails', schedule: 'Upper 1' },
  { name: 'Pushups', layout: 'horizontal', muscles: 'chest, triceps, anterior deltoids, core', equip: 'bodyweight on gym floor mat', schedule: 'Bodyweight Staple' },
  { name: 'Cable Crossover', layout: 'vertical', muscles: 'inner and lower chest, anterior deltoids', equip: 'dual cable crossover machine with D-handles', schedule: 'Chest Staple' },

  // 2. BACK & LATS
  { name: 'Wide-Grip Lat Pulldown', layout: 'vertical', muscles: 'latissimus dorsi, upper back, biceps', equip: 'cable lat pulldown machine with wide bar and thigh pads', schedule: 'Upper 2' },
  { name: 'Seated Cable Rows', layout: 'horizontal', muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', equip: 'low cable seated row machine with V-bar close-grip handle and footrests', schedule: 'Upper 1' },
  { name: 'Pullups', layout: 'vertical', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar / power tower station', schedule: 'Back Staple' },
  { name: 'Bent Over Two-Dumbbell Row', layout: 'horizontal', muscles: 'latissimus dorsi, rhomboids, rear deltoids', equip: 'pair of heavy dumbbells in bent-over torso position', schedule: 'Back Staple' },
  { name: 'Barbell Deadlift', layout: 'vertical', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell with bumper plates on lifting platform', schedule: 'Back/Legs Staple' },
  { name: 'Dumbbell Shrug', layout: 'vertical', muscles: 'upper trapezius, neck muscles', equip: 'heavy pair of dumbbells held at sides standing tall', schedule: 'Upper 2' },

  // 3. SHOULDERS
  { name: 'Dumbbell Shoulder Press', layout: 'vertical', muscles: 'anterior and lateral deltoids, upper chest, triceps', equip: 'pair of dumbbells seated on 90-degree upright bench', schedule: 'Upper 2' },
  { name: 'Cable Seated Lateral Raise', layout: 'vertical', muscles: 'lateral deltoids (side shoulder)', equip: 'low cable pulley with single-hand cuff seated on flat bench', schedule: 'Upper 1' },
  { name: 'Cable Rear Delt Fly', layout: 'vertical', muscles: 'posterior deltoids (rear delt), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms with cable stoppers', schedule: 'Upper 2' },
  { name: 'Face Pull', layout: 'vertical', muscles: 'posterior deltoids, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level', schedule: 'Shoulders Staple' },

  // 4. LEGS & GLUTES
  { name: 'Smith Machine Squat', layout: 'vertical', muscles: 'quadriceps, gluteus maximus, hamstrings', equip: 'Smith machine bar on upper traps with vertical guide rails', schedule: 'Lower 1' },
  { name: 'Barbell Squat', layout: 'vertical', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell across upper back on squat rack', schedule: 'Legs Staple' },
  { name: 'Romanian Deadlift', layout: 'horizontal', muscles: 'hamstrings, gluteus maximus, spinal erectors', equip: 'Olympic barbell held at hip level hinged back', schedule: 'Lower 1' },
  { name: 'Smith Machine Stiff-Legged Deadlift', layout: 'horizontal', muscles: 'hamstrings, gluteus maximus, lower back', equip: 'Smith machine bar lowered along vertical guide rails past shins', schedule: 'Lower 2 (SM RDL)' },
  { name: 'Split Squat with Dumbbells', layout: 'vertical', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position', schedule: 'Lower 2' },
  { name: 'Barbell Walking Lunge', layout: 'vertical', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell on upper back walking forward', schedule: 'Lower 1' },
  { name: 'Rocking Standing Calf Raise', layout: 'vertical', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine', schedule: 'Lower 1' },
  { name: 'Seated Calf Raise', layout: 'vertical', muscles: 'soleus and gastrocnemius (lower calves)', equip: 'seated calf raise machine with knee pad and foot platform', schedule: 'Lower 2' },

  // 5. ARMS (BICEPS & TRICEPS)
  { name: 'Dumbbell Alternate Bicep Curl', layout: 'vertical', muscles: 'biceps brachii, brachialis, forearms', equip: 'pair of dumbbells alternating arms with supination', schedule: 'Upper 1' },
  { name: 'Hammer Curls', layout: 'vertical', muscles: 'brachioradialis (forearm), brachialis, outer biceps', equip: 'pair of dumbbells held in neutral hammer grip', schedule: 'Arms Staple' },
  { name: 'High Cable Curls', layout: 'vertical', muscles: 'bicep peak (biceps brachii inner head)', equip: 'dual high cable pulleys in front double biceps pose', schedule: 'Upper 2' },
  { name: 'Triceps Pushdown', layout: 'vertical', muscles: 'lateral and long head of triceps brachii', equip: 'high cable pulley with straight bar or V-bar', schedule: 'Upper 1' },
  { name: 'Cable Rope Overhead Triceps Extension', layout: 'vertical', muscles: 'triceps long head', equip: 'low-to-mid cable pulley with rope attachment facing away overhead', schedule: 'Upper 2' },

  // 6. CORE
  { name: 'Cable Crunch', layout: 'horizontal', muscles: 'rectus abdominis (six pack abs), upper core', equip: 'high cable pulley with rope held beside ears on knees', schedule: 'Lower 1' }
];

const sanitize = (str) => {
  return String(str).replace(/[\s\(\)\/]+/g, '_');
};

const checkAsset = (name, list) => {
  const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return list.find(file => {
    const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normFile.includes(normName) || normName.includes(normFile.replace(/^edb/, ''));
  });
};

let md = `# Panduan Lengkap Prompt AI: Single Hero Frame & Pinpoint Muscle Highlight

> **🎯 Standar Presisi: Pinpoint Muscle Highlight (HANYA Pada Otot Target)**:
> 1. **🖼️ Gambar Thumbnail (1:1 Single Hero Frame)**:
>    - 1 Subjek Penuh, 1 Wajah Coach yang 100% konsisten, 1 Alat Gym yang presisi.
>    - **Efek Glowing Cyan STRICTLY ISOLATED**: Hanya menyala pada serat otot target (${'target muscles'}), bagian tubuh lainnya (wajah, leher, perut, kulit) tetap 100% natural tanpa glow.
> 2. **🎥 Video AI (1 Frame Full Sinematik + Isolated Cyan Pulse)**:
>    - Efek denyut biru lembut hanya mengalir di dalam batas otot yang bekerja, tidak menyebar ke seluruh badan.

---

## 📊 1. Tabel Ringkasan Status Aset Batch 1 (31 Latihan)

| No | Nama Latihan | Jadwal Rutin | Status Thumbnail | Status Video | File Video / Thumb |
| :---: | :--- | :--- | :---: | :---: | :--- |
`;

exercises.forEach((item, idx) => {
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const foundVid = checkAsset(item.name, existingVideos);
  const foundThumb = checkAsset(item.name, existingThumbs);

  const vidStatus = foundVid ? '✅ **Ada**' : '❌ **Belum**';
  const thumbStatus = foundThumb ? '✅ **Ada**' : '❌ **Belum**';
  const targetBase = 'edb-' + sanitize(item.name);

  md += `| ${idx + 1} | **${ex?.name || item.name}** | ${item.schedule} | ${thumbStatus} | ${vidStatus} | <code>${foundThumb || targetBase + '.webp'}</code><br/><code>${foundVid || targetBase + '.mp4'}</code> |\n`;
});

md += `\n---

## 🎨 2. Cara Eksekusi Single Hero Image + Isolated Pulse Video

1. **Buka folder latihan di** \`ai_references/<nomor_latihan>/\`.
2. **Generate Gambar Thumbnail (Single Hero Shot 1:1)**:
   * **Upload ke ChatGPT (GPT-4o)**: \`00_coach_reference.jpg\` (Foto Single Coach) + \`0_start_pose.jpg\` / \`1_end_pose.jpg\`.
   * **Copas Prompt 1 (Single Hero Image)** di bawah.
3. **Generate Video AI (Kling / Runway / Luma / Haiper)**:
   * **Upload Hasil Gambar Single Hero** sebagai First Frame (*Image-to-Video*).
   * **Copas Prompt 2 (Isolated Muscle Pulse)** di bawah.

---

## 📋 3. Daftar Lengkap Prompt Single Hero & Video Isolated Pulse (31 Latihan)

`;

let count = 0;
exercises.forEach(item => {
  count++;
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const exId = ex?.exerciseId || ex?.id?.replace(/^edb-/, '') || sanitize(item.name);
  const previewUrl = ex?.gifUrl && ex.gifUrl.startsWith('http') ? ex.gifUrl : `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/0.jpg`;
  const folderName = `${String(count).padStart(2, '0')}_${ex ? ex.name.replace(/[\\/:*?"<>|]/g, '_') : item.name}`;

  const foundVid = checkAsset(item.name, existingVideos);
  const foundThumb = checkAsset(item.name, existingThumbs);
  const targetBase = 'edb-' + sanitize(item.name);

  // 1. SINGLE HERO IMAGE PROMPT (Strict Pinpoint Isolation)
  const promptImage = `[FRAMING]: SINGLE HERO SHOT. FULL FRAME 1:1 SQUARE ASPECT RATIO. STRICTLY NO COLLAGE, NO SPLIT SCREEN, NO MULTIPLE PANELS.

Subject: A shredded muscular Asian male fitness coach with the exact same handsome facial features, short hairstyle, and lean muscular build as in Image 1, shirtless, wearing black athletic compression shorts.

Exercise & Setting:
The coach is performing "${item.name}" with proper gym biomechanics using ${item.equip} in a dark modern luxury gym. Captured at the peak contraction point matching Image 3.

[STRICT ANATOMICAL HIGHLIGHT - ISOLATED TO TARGET MUSCLES ONLY]:
Add a delicate, semi-transparent glowing cyan / neon electric blue wireframe muscle fiber overlay strictly and exclusively confined to the ${item.muscles}. 
CRITICAL NEGATIVE DIRECTIVE: DO NOT glow on the rest of the body. The coach's face, neck, head, abdomen, legs, and all non-working muscles MUST remain 100% natural, hyper-realistic, non-glowing human skin with natural sweat and vascularity. No full-body aura, no alien glow, only pinpoint muscle highlight.

Aesthetics & Lighting:
Moody atmospheric dark gym background, strong cinematic rim lighting highlighting muscle contours, 8k resolution, ultra-photorealistic, 1:1 square canvas.`;

  // 2. VIDEO PROMPT (Strict Pinpoint Isolation & Subtle Flow)
  let howtoSteps = '';
  if (ex?.instructions_en && Array.isArray(ex.instructions_en) && ex.instructions_en.length > 0) {
    howtoSteps = ex.instructions_en.map((step, sidx) => `${sidx + 1}. ${step}`).join(' ');
  } else if (typeof ex?.instructions_en === 'string' && ex.instructions_en.trim()) {
    howtoSteps = ex.instructions_en;
  } else {
    howtoSteps = `Perform ${item.name} with ${item.equip}. Starting with proper setup, executing controlled range of motion targeting ${item.muscles}, reaching full peak contraction, and returning under smooth eccentric control.`;
  }

  const promptVideo = `[CINEMATOGRAPHY]: SINGLE CONTINUOUS FULL-FRAME SHOT ONLY. STRICTLY NO SPLIT SCREEN, NO MULTI-PANEL, NO COLLAGE, NO GRIDS. Single athlete centered in frame.

Subject: The identical shredded muscular Asian male fitness coach from the reference image, performing "${item.name}" using ${item.equip} in a dark luxury gym.

Biomechanical Execution (Step-by-Step How-To):
${howtoSteps}

[STRICT PINPOINT MUSCLE HIGHLIGHT VFX]:
A delicate, semi-transparent glowing cyan / neon blue wireframe muscle fiber overlay is strictly and exclusively confined to the active working muscles (${item.muscles}). 
CRITICAL RULE: The face, neck, abdomen, legs, and all non-working muscles MUST REMAIN 100% NATURAL REALISTIC HUMAN SKIN WITH ZERO GLOW. No full-body glowing aura. The subtle cyan highlight pulses gently only inside the boundaries of the ${item.muscles} as they contract at the peak, then softens during eccentric stretch.

Movement & Dynamics:
Slow cinematic 3D camera pan around the athlete, capturing 1 clean full repetition with flawless tempo. 2 seconds lowering under control with muscle stretch, 1 second explosive lifting into peak contraction, holding top squeeze for 1 second. Seamless continuous looping.

Visuals & Lighting:
Moody atmospheric gym, dramatic volumetric rim lighting highlighting muscle definition and striations, sweat glistens under studio lighting, 8k resolution, 60fps, ultra-realistic motion blur, masterclass fitness production.`;

  md += `### ${count}. ${ex?.name || item.name} (${item.schedule})\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;">\n`;
  md += `  <img src="${previewUrl}" width="120" style="border-radius:12px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>🖼️ Status Thumbnail:</b> ${foundThumb ? '✅ <b>Ada</b> (<code>' + foundThumb + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.webp</code>)'}</p>\n`;
  md += `    <p><b>🎥 Status Video:</b> ${foundVid ? '✅ <b>Ada</b> (<code>' + foundVid + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.mp4</code>)'}</p>\n`;
  md += `    <p><b>📁 Folder Referensi:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `    <p><b>🎯 Otot Target (Pinpoint Cyan Highlight):</b> ${item.muscles}</p>\n`;
  md += `    <p><b>🏋️‍♂️ Alat:</b> ${item.equip}</p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**🖼️ Prompt Image (Single Hero 1:1 - Pinpoint Cyan Wireframe):**\n`;
  md += `\`\`\`text\n${promptImage}\n\`\`\`\n\n`;
  md += `**🎥 Prompt Video (Single-Shot + Pinpoint Isolated Cyan Pulse):**\n`;
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
2. PROMPT VIDEO (SINGLE SHOT FULL-FRAME + PINPOINT ISOLATED MUSCLE PULSE)
Upload to Kling AI / Runway Gen-3 / Luma Dream Machine / Haiper
(Upload your Single Hero image output as First Frame)
================================================================================
${promptVideo}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated all prompt guides with Strict Pinpoint Muscle Isolation!');
