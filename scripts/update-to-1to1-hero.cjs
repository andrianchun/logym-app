const fs = require('fs');
const path = require('path');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));
const videosDir = path.resolve('public/exercise-assets/videos');
const thumbsDir = path.resolve('public/exercise-assets/thumbnails');
const baseDir = path.resolve('ai_references');

const existingVideos = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
const existingThumbs = fs.existsSync(thumbsDir) ? fs.readdirSync(thumbsDir) : [];

const exercises = [
  // 1. CHEST (Horizontal / Incline)
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

let md = `# Panduan Prompt AI & Status Aset Latihan (1:1 Asymmetric Hero Layout)

> **📐 Konsep Layout 1:1 Asimetris (Hero Panel + 2 Sub-Panel)**:
> Tetap dalam format **Square 1:1**, tetapi menggunakan komposisi asimetris elegan:
> - **Gerakan Mendatar/Baring (Horizontal)**: 1 Panel Hero Besar di **ATAS** (menampilkan gerakan utama) + 2 Sub-panel Kecil di **BAWAH** (Setup pose & Macro close-up serat otot).
> - **Gerakan Berdiri/Tegak (Vertikal)**: 1 Panel Hero Besar di **KIRI** (menampilkan postur penuh) + 2 Sub-panel Kecil bertumpuk di **KANAN** (Setup pose & Macro close-up serat otot).
> - Dilengkapi efek **Glowing Cyan Anatomical Muscle Highlight** pada otot target.

---

## 📊 1. Tabel Ringkasan Status Aset Batch 1

| No | Nama Latihan | Layout 1:1 | Status Thumbnail | Status Video | File Video / Thumb |
| :---: | :--- | :---: | :---: | :---: | :--- |
`;

exercises.forEach((item, idx) => {
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const foundVid = checkAsset(item.name, existingVideos);
  const foundThumb = checkAsset(item.name, existingThumbs);

  const vidStatus = foundVid ? '✅ **Ada**' : '❌ **Belum**';
  const thumbStatus = foundThumb ? '✅ **Ada**' : '❌ **Belum**';
  const targetBase = 'edb-' + sanitize(item.name);
  const layoutBadge = item.layout === 'horizontal' ? '🔝 Top Hero (Mendatar)' : '👈 Left Hero (Tegak)';

  md += `| ${idx + 1} | **${ex?.name || item.name}** | ${layoutBadge} | ${thumbStatus} | ${vidStatus} | <code>${foundThumb || targetBase + '.webp'}</code><br/><code>${foundVid || targetBase + '.mp4'}</code> |\n`;
});

md += `\n---

## 🎨 2. Cara Upload ke ChatGPT (GPT-4o) / Midjourney (Rasio 1:1)

1. **Buka ChatGPT Plus / Team (Model GPT-4o)**.
2. **Upload 3 File Gambar Sekaligus**:
   * **Gambar 1 (Acuan Karakter & Gaya Visual)**: Upload gambar acuan coach.
   * **Gambar 2 (Pose Awal)**: Upload file \`0_start_pose.jpg\` dari folder \`ai_references/<nomor_latihan>/\`.
   * **Gambar 3 (Pose Akhir)**: Upload file \`1_end_pose.jpg\` dari folder yang sama.
3. **Salin Prompt Khusus di Bawah**:
   * Prompt sudah disesuaikan secara otomatis: apakah memakai **Top Hero (Mendatar)** atau **Left Hero (Tegak)** sesuai orientasi alami latihan.

---

## 📋 3. Daftar Detail Latihan & Prompt 1:1 Hero Layout

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

  let layoutDescription = '';
  if (item.layout === 'horizontal') {
    layoutDescription = `1:1 square canvas with an asymmetric 3-panel editorial layout:
- Top Half (Dominant Hero Panel): Wide cinematic view showing the primary exercise movement at full range/peak contraction matching Image 3 with luminous cyan anatomical muscle fiber highlights
- Bottom-Left Panel: Initial starting setup position matching Image 2
- Bottom-Right Panel: Cinematic macro close-up angle focusing on the engaged muscle striations`;
  } else {
    layoutDescription = `1:1 square canvas with an asymmetric 3-panel editorial layout:
- Left Half (Dominant Tall Hero Panel): Full-body vertical portrait view showing the peak contraction and posture matching Image 3 with luminous cyan anatomical muscle fiber highlights
- Top-Right Panel: Initial starting setup position matching Image 2
- Bottom-Right Panel: Cinematic macro close-up angle focusing on the engaged muscle striations`;
  }

  const promptText = `Generate a high-end visual exercise guide in 1:1 square aspect ratio, featuring the identical shredded muscular Asian male fitness coach character from Image 1 in a moody dark luxury gym.

Composition:
${layoutDescription}

The coach is performing "${item.name}" with ${item.equip}, precisely adhering to the biomechanics in Image 2 (start position) and Image 3 (end position).

Include hyper-detailed glowing cyan / electric blue anatomical muscle fiber highlight overlays specifically emphasizing active engagement on the ${item.muscles}. Cinematic dramatic rim lighting highlighting muscle definition, moody dark background, ultra-sharp 8k resolution, photorealistic, 1:1 square aspect ratio.`;

  md += `### ${count}. ${ex?.name || item.name} (${item.schedule})\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;">\n`;
  md += `  <img src="${previewUrl}" width="120" style="border-radius:12px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>📐 Tipe Layout 1:1:</b> ${item.layout === 'horizontal' ? '🔝 <b>Top Hero</b> (Gerakan Mendatar: 1 Panel Lebar di Atas + 2 di Bawah)' : '👈 <b>Left Hero</b> (Gerakan Tegak: 1 Panel Tinggi di Kiri + 2 Bertumpuk di Kanan)'}</p>\n`;
  md += `    <p><b>🖼️ Status Thumbnail:</b> ${foundThumb ? '✅ <b>Ada</b> (<code>' + foundThumb + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.webp</code>)'}</p>\n`;
  md += `    <p><b>🎥 Status Video:</b> ${foundVid ? '✅ <b>Ada</b> (<code>' + foundVid + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.mp4</code>)'}</p>\n`;
  md += `    <p><b>📁 Folder Referensi:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `    <p><b>🎯 Otot Target (Glowing Cyan):</b> ${item.muscles}</p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**Prompt ChatGPT (GPT-4o) / Midjourney (1:1 Hero Layout):**\n`;
  md += `\`\`\`text\n${promptText}\n\`\`\`\n\n---\n\n`;

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
Layout: 1:1 Square (${item.layout === 'horizontal' ? 'Top Hero Layout' : 'Left Hero Layout'})

[CARA MELAKUKAN (ID)]:
${instructions}

[INSTRUCTIONS (EN)]:
${instructionsEn}

==================================================
[PROMPT SIAP COPAS 1:1 KE CHATGPT / MIDJOURNEY]
(Upload: 1. Gambar Coach Acuan, 2. 0_start_pose.jpg, 3. 1_end_pose.jpg)
==================================================
${promptText}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated to 1:1 Asymmetric Hero Layout prompts!');
