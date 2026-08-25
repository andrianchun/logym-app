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
  { name: 'Smith Machine Bench Press', layout: 'horizontal', muscles: 'mid chest, triceps, anterior deltoids', equip: 'Smith machine with horizontal flat bench', schedule: 'Upper 2' },
  { name: 'Smith Machine Incline Bench Press', layout: 'horizontal', muscles: 'upper chest, anterior deltoids, triceps', equip: 'Smith machine with 30-degree incline bench', schedule: 'Upper 1' },
  { name: 'Pushups', layout: 'horizontal', muscles: 'chest, triceps, anterior deltoids, core', equip: 'bodyweight on gym floor mat', schedule: 'Bodyweight Staple' },
  { name: 'Cable Crossover', layout: 'vertical', muscles: 'inner and lower chest, anterior deltoids', equip: 'dual cable crossover machine with D-handles', schedule: 'Chest Staple' },

  // 2. BACK & LATS
  { name: 'Wide-Grip Lat Pulldown', layout: 'vertical', muscles: 'latissimus dorsi, upper back, biceps', equip: 'cable lat pulldown machine with wide bar', schedule: 'Upper 2' },
  { name: 'Seated Cable Rows', layout: 'horizontal', muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', equip: 'low cable seated row machine with V-bar / close grip handle', schedule: 'Upper 1' },
  { name: 'Pullups', layout: 'vertical', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar / power tower', schedule: 'Back Staple' },
  { name: 'Bent Over Two-Dumbbell Row', layout: 'horizontal', muscles: 'latissimus dorsi, rhomboids, rear deltoids', equip: 'pair of heavy dumbbells in bent-over torso position', schedule: 'Back Staple' },
  { name: 'Barbell Deadlift', layout: 'vertical', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell with bumper plates on lifting platform', schedule: 'Back/Legs Staple' },
  { name: 'Dumbbell Shrug', layout: 'vertical', muscles: 'upper trapezius, neck muscles', equip: 'heavy pair of dumbbells held at sides', schedule: 'Upper 2' },

  // 3. SHOULDERS
  { name: 'Dumbbell Shoulder Press', layout: 'vertical', muscles: 'anterior and lateral deltoids, upper chest, triceps', equip: 'pair of dumbbells seated on 90-degree upright bench', schedule: 'Upper 2' },
  { name: 'Cable Seated Lateral Raise', layout: 'vertical', muscles: 'lateral deltoids (side shoulder)', equip: 'low cable pulley with single-hand cuff seated on flat bench', schedule: 'Upper 1' },
  { name: 'Cable Rear Delt Fly', layout: 'vertical', muscles: 'posterior deltoids (rear delt), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms', schedule: 'Upper 2' },
  { name: 'Face Pull', layout: 'vertical', muscles: 'posterior deltoids, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level', schedule: 'Shoulders Staple' },

  // 4. LEGS & GLUTES
  { name: 'Smith Machine Squat', layout: 'vertical', muscles: 'quadriceps, gluteus maximus, hamstrings', equip: 'Smith machine bar rested on upper traps', schedule: 'Lower 1' },
  { name: 'Barbell Squat', layout: 'vertical', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell on squat rack', schedule: 'Legs Staple' },
  { name: 'Romanian Deadlift', layout: 'horizontal', muscles: 'hamstrings, gluteus maximus, spinal erectors', equip: 'Olympic barbell held at hip level hinged back', schedule: 'Lower 1' },
  { name: 'Smith Machine Stiff-Legged Deadlift', layout: 'horizontal', muscles: 'hamstrings, gluteus maximus, lower back', equip: 'Smith machine bar lowered past shins', schedule: 'Lower 2 (SM RDL)' },
  { name: 'Split Squat with Dumbbells', layout: 'vertical', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position', schedule: 'Lower 2' },
  { name: 'Barbell Walking Lunge', layout: 'vertical', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell on upper back walking forward', schedule: 'Lower 1' },
  { name: 'Rocking Standing Calf Raise', layout: 'vertical', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine', schedule: 'Lower 1' },
  { name: 'Seated Calf Raise', layout: 'vertical', muscles: 'soleus and gastrocnemius (lower calves)', equip: 'seated calf raise machine / dumbbell on knees', schedule: 'Lower 2' },

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

let md = `# Panduan Lengkap Prompt AI: Thumbnail (1:1 Kolase) & Video (Single-Shot How-To)

> **🎯 Formula Standar Aset Visual Logym**:
> 1. **🖼️ Thumbnail (1:1 Kolase 3-Panel)**:
>    - Kolase 3 sudut kamera (*Start Setup, Peak Contraction, Close-up Otot Glowing Cyan*).
> 2. **🎥 Video (1 Frame Full Single Shot - NO SPLIT SCREEN)**:
>    - **Single continuous camera view** (bukan kolase, tidak dipotong-potong).
>    - Prompt dibuat langsung dari **instruksi How-To biomekanik lengkap (English)** agar gerakan AI akurat dan mulus.

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
  const layoutBadge = item.layout === 'horizontal' ? '🔝 Top Hero' : '👈 Left Hero';

  md += `| ${idx + 1} | **${ex?.name || item.name}** | ${item.schedule} (${layoutBadge}) | ${thumbStatus} | ${vidStatus} | <code>${foundThumb || targetBase + '.webp'}</code><br/><code>${foundVid || targetBase + '.mp4'}</code> |\n`;
});

md += `\n---

## 🎨 2. Cara Eksekusi Agar Video Menjadi Single Shot (Bukan Kolase)

> [!IMPORTANT]
> **Kenapa Video Sempat Menjadi Kolase 3 Layar?**
> Jika Anda meng-upload gambar kolase 3-panel sebagai *Image Input / First Frame* ke AI Video (Kling AI / Runway), AI akan berusaha menggerakkan ketiga kotak tersebut bersamaan!
> 
> **Solusi Agar Video Menjadi 1 Frame Penuh (Single Shot):**
> 1. **Gunakan Mode Text-to-Video** ATAU upload **Foto Single Shot Coach** (bukan gambar kolase).
> 2. **Gunakan Prompt Video Berbasis How-To Lengkap di Bawah**: Prompt sudah dilengkapi perintah tegas \`[STRICT: SINGLE CONTINUOUS SHOT, NO SPLIT SCREEN, NO COLLAGE]\` beserta langkah gerakan lengkap dalam Bahasa Inggris.

---

## 📋 3. Daftar Lengkap Prompt Image & Prompt Video How-To (31 Latihan)

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

  // 1. IMAGE PROMPT (1:1 3-Panel Collage)
  let layoutDescription = '';
  if (item.layout === 'horizontal') {
    layoutDescription = `1:1 square canvas with an asymmetric 3-panel multi-angle 3D layout (MANDATORY: Every panel MUST show a completely different camera perspective):
- Top Half (Dominant Wide Hero Panel): Front 3/4 isometric perspective capturing the full exercise movement at peak contraction matching Image 3 with illuminated 3D depth and glowing cyan anatomical muscle highlights
- Bottom-Left Panel (Setup View): True 90-degree lateral side-profile view capturing precise joint angles, bench setup, and starting position matching Image 2
- Bottom-Right Panel (Macro Anatomy): Low-angle cinematic macro close-up perspective focusing sharply on the striations and 3D volume of the working muscle fibers`;
  } else {
    layoutDescription = `1:1 square canvas with an asymmetric 3-panel multi-angle 3D layout (MANDATORY: Every panel MUST show a completely different camera perspective):
- Left Half (Dominant Tall Hero Panel): Front 3/4 three-quarter isometric vertical full-body perspective capturing posture, lockout, and balance matching Image 3 with glowing cyan anatomical muscle highlights
- Top-Right Panel (Setup View): Direct rear back perspective or 90-degree lateral side view showing setup posture, grip, and starting position matching Image 2
- Bottom-Right Panel (Macro Anatomy): Dynamic low-to-high angled cinematic macro close-up perspective highlighting intense 3D muscle fiber tension`;
  }

  const promptImage = `Generate a high-end visual exercise guide in 1:1 square aspect ratio, featuring the identical shredded muscular Asian male fitness coach character from Image 1 in a moody dark luxury gym.

Composition (Strict Multi-Angle 3D Rules):
${layoutDescription}

The coach is performing "${item.name}" with ${item.equip}, strictly adhering to the biomechanics in Image 2 (start position) and Image 3 (end position).

Include hyper-detailed glowing cyan / neon electric blue anatomical muscle fiber highlight overlays specifically emphasizing active engagement on the ${item.muscles}. Ensure deep 3D spatial depth between foreground and background, moody gym environment, dramatic cinematic rim lighting accentuating muscle striations, 8k resolution, ultra-photorealistic, 1:1 square aspect ratio.`;

  // 2. VIDEO PROMPT (Based on Complete English How-To)
  let howtoSteps = '';
  if (ex?.instructions_en && Array.isArray(ex.instructions_en) && ex.instructions_en.length > 0) {
    howtoSteps = ex.instructions_en.map((step, sidx) => `${sidx + 1}. ${step}`).join(' ');
  } else if (typeof ex?.instructions_en === 'string' && ex.instructions_en.trim()) {
    howtoSteps = ex.instructions_en;
  } else {
    howtoSteps = `Perform ${item.name} with ${item.equip}. Starting with proper setup, executing controlled range of motion targeting ${item.muscles}, reaching full peak contraction, and returning under smooth eccentric control.`;
  }

  const promptVideo = `[CINEMATOGRAPHY]: SINGLE CONTINUOUS FULL-FRAME SHOT ONLY. STRICTLY NO SPLIT SCREEN, NO MULTI-PANEL, NO COLLAGE, NO GRIDS. Single athlete centered in frame.

Subject: An athletic shredded muscular Asian male fitness coach wearing black gym shorts, shirtless, performing "${item.name}" using ${item.equip} in a modern dark luxury gym.

Biomechanical Execution (Step-by-Step How-To):
${howtoSteps}

Movement & Dynamics:
Slow cinematic 3D camera pan around the athlete, capturing 1 clean full repetition with flawless tempo. 2 seconds lowering under control with muscle stretch, 1 second explosive lifting into peak contraction, holding top squeeze for 1 second. Intense engagement on ${item.muscles}.

Visuals & Lighting:
Moody atmospheric gym, dramatic volumetric rim lighting highlighting muscle definition and striations, sweat glistens under studio lighting, 8k resolution, 60fps, ultra-realistic motion blur, masterclass fitness production.`;

  md += `### ${count}. ${ex?.name || item.name} (${item.schedule})\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;">\n`;
  md += `  <img src="${previewUrl}" width="120" style="border-radius:12px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>📐 Layout Thumbnail:</b> ${item.layout === 'horizontal' ? '🔝 Top Hero (Mendatar)' : '👈 Left Hero (Tegak)'}</p>\n`;
  md += `    <p><b>🖼️ Status Thumbnail:</b> ${foundThumb ? '✅ <b>Ada</b> (<code>' + foundThumb + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.webp</code>)'}</p>\n`;
  md += `    <p><b>🎥 Status Video:</b> ${foundVid ? '✅ <b>Ada</b> (<code>' + foundVid + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.mp4</code>)'}</p>\n`;
  md += `    <p><b>📁 Folder Referensi:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `    <p><b>🎯 Otot Target:</b> ${item.muscles}</p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**🖼️ Prompt Image (Thumbnail 1:1 Kolase 3-Panel):**\n`;
  md += `\`\`\`text\n${promptImage}\n\`\`\`\n\n`;
  md += `**🎥 Prompt Video (Single-Shot 1 Frame Full - English How-To):**\n`;
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
1. PROMPT IMAGE (THUMBNAIL 1:1 ASYMMETRIC 3-PANEL COLLAGE)
Upload to ChatGPT: 00_coach_reference.jpg, 0_start_pose.jpg, 1_end_pose.jpg
================================================================================
${promptImage}

================================================================================
2. PROMPT VIDEO (SINGLE CONTINUOUS FULL-FRAME SHOT - NO SPLIT SCREEN)
Upload to Kling AI / Runway Gen-3 / Luma Dream Machine / Haiper
(Upload single coach photo or run Text-to-Video)
================================================================================
${promptVideo}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated all prompts with English How-To single shot video instructions!');
