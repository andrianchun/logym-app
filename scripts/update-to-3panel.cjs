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
  { name: 'Dumbbell Bench Press', muscles: 'mid chest (pectoralis major), front deltoids, triceps', equip: 'pair of dumbbells and flat gym bench', schedule: 'Upper 1' },
  { name: 'Incline Dumbbell Press', muscles: 'upper chest (clavicular head), front deltoids, triceps', equip: 'pair of dumbbells and 30-45 degree incline gym bench', schedule: 'Chest Staple' },
  { name: 'Barbell Bench Press - Medium Grip', muscles: 'mid chest, triceps, anterior deltoids', equip: 'standard Olympic barbell and flat bench press station', schedule: 'Chest Staple' },
  { name: 'Smith Machine Bench Press', muscles: 'mid chest, triceps, anterior deltoids', equip: 'Smith machine with horizontal flat bench', schedule: 'Upper 2' },
  { name: 'Smith Machine Incline Bench Press', muscles: 'upper chest, anterior deltoids, triceps', equip: 'Smith machine with 30-degree incline bench', schedule: 'Upper 1' },
  { name: 'Pushups', muscles: 'chest, triceps, anterior deltoids, core', equip: 'bodyweight on gym floor mat', schedule: 'Bodyweight Staple' },
  { name: 'Cable Crossover', muscles: 'inner and lower chest, anterior deltoids', equip: 'dual cable crossover machine with D-handles', schedule: 'Chest Staple' },

  // 2. BACK & LATS
  { name: 'Wide-Grip Lat Pulldown', muscles: 'latissimus dorsi, upper back, biceps', equip: 'cable lat pulldown machine with wide bar', schedule: 'Upper 2' },
  { name: 'Seated Cable Rows', muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', equip: 'low cable seated row machine with V-bar / close grip handle', schedule: 'Upper 1' },
  { name: 'Pullups', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar / power tower', schedule: 'Back Staple' },
  { name: 'Bent Over Two-Dumbbell Row', muscles: 'latissimus dorsi, rhomboids, rear deltoids', equip: 'pair of heavy dumbbells in bent-over torso position', schedule: 'Back Staple' },
  { name: 'Barbell Deadlift', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell with bumper plates on lifting platform', schedule: 'Back/Legs Staple' },
  { name: 'Dumbbell Shrug', muscles: 'upper trapezius, neck muscles', equip: 'heavy pair of dumbbells held at sides', schedule: 'Upper 2' },

  // 3. SHOULDERS
  { name: 'Dumbbell Shoulder Press', muscles: 'anterior and lateral deltoids, upper chest, triceps', equip: 'pair of dumbbells seated on 90-degree upright bench', schedule: 'Upper 2' },
  { name: 'Cable Seated Lateral Raise', muscles: 'lateral deltoids (side shoulder)', equip: 'low cable pulley with single-hand cuff seated on flat bench', schedule: 'Upper 1' },
  { name: 'Cable Rear Delt Fly', muscles: 'posterior deltoids (rear delt), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms', schedule: 'Upper 2' },
  { name: 'Face Pull', muscles: 'posterior deltoids, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level', schedule: 'Shoulders Staple' },

  // 4. LEGS & GLUTES
  { name: 'Smith Machine Squat', muscles: 'quadriceps, gluteus maximus, hamstrings', equip: 'Smith machine bar rested on upper traps', schedule: 'Lower 1' },
  { name: 'Barbell Squat', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell on squat rack', schedule: 'Legs Staple' },
  { name: 'Romanian Deadlift', muscles: 'hamstrings, gluteus maximus, spinal erectors', equip: 'Olympic barbell held at hip level hinged back', schedule: 'Lower 1' },
  { name: 'Smith Machine Stiff-Legged Deadlift', muscles: 'hamstrings, gluteus maximus, lower back', equip: 'Smith machine bar lowered past shins', schedule: 'Lower 2 (SM RDL)' },
  { name: 'Split Squat with Dumbbells', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position', schedule: 'Lower 2' },
  { name: 'Barbell Walking Lunge', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell on upper back walking forward', schedule: 'Lower 1' },
  { name: 'Rocking Standing Calf Raise', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine', schedule: 'Lower 1' },
  { name: 'Seated Calf Raise', muscles: 'soleus and gastrocnemius (lower calves)', equip: 'seated calf raise machine / dumbbell on knees', schedule: 'Lower 2' },

  // 5. ARMS (BICEPS & TRICEPS)
  { name: 'Dumbbell Alternate Bicep Curl', muscles: 'biceps brachii, brachialis, forearms', equip: 'pair of dumbbells alternating arms with supination', schedule: 'Upper 1' },
  { name: 'Hammer Curls', muscles: 'brachioradialis (forearm), brachialis, outer biceps', equip: 'pair of dumbbells held in neutral hammer grip', schedule: 'Arms Staple' },
  { name: 'High Cable Curls', muscles: 'bicep peak (biceps brachii inner head)', equip: 'dual high cable pulleys in front double biceps pose', schedule: 'Upper 2' },
  { name: 'Triceps Pushdown', muscles: 'lateral and long head of triceps brachii', equip: 'high cable pulley with straight bar or V-bar', schedule: 'Upper 1' },
  { name: 'Cable Rope Overhead Triceps Extension', muscles: 'triceps long head', equip: 'low-to-mid cable pulley with rope attachment facing away overhead', schedule: 'Upper 2' },

  // 6. CORE
  { name: 'Cable Crunch', muscles: 'rectus abdominis (six pack abs), upper core', equip: 'high cable pulley with rope held beside ears on knees', schedule: 'Lower 1' }
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

let md = `# Panduan Prompt AI & Status Aset Latihan (Batch 1 - 31 Latihan)

> **✨ Format Kolase 3-Panel Efisien**:
> Menggunakan format **3-Panel Split View** (lebih fokus, tidak terlalu padat, dan proporsi tubuh lebih jelas):
> 1. **Panel 1 (Kiri)**: Pose Awal & Setup Gerakan (*Start Position*).
> 2. **Panel 2 (Tengah)**: Puncak Kontraksi (*Peak Lockout Contraction*).
> 3. **Panel 3 (Kanan)**: Sudut Dinamis 45° / Close-Up Serat Otot Target dengan efek *Glowing Cyan*.

---

## 📊 1. Tabel Ringkasan Status Aset Batch 1

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

## 🎨 2. Cara Upload ke ChatGPT (GPT-4o / DALL-E) Agar Wajah & Gaya Konsisten

1. **Buka ChatGPT Plus / Team (Model GPT-4o)**.
2. **Upload 3 File Gambar Sekaligus**:
   * **Gambar 1 (Acuan Karakter & Gaya Visual)**: Upload gambar acuan coach.
   * **Gambar 2 (Pose Awal)**: Upload file \`0_start_pose.jpg\` dari folder \`ai_references/<nomor_latihan>/\`.
   * **Gambar 3 (Pose Akhir)**: Upload file \`1_end_pose.jpg\` dari folder yang sama.
3. **Salin Prompt 3-Panel di Bawah**:
   * Cukup copy-paste teks prompt dari bagian latihan yang ingin dibuat.

---

## 📋 3. Daftar Detail Latihan & Prompt 3-Panel Siap Copas

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

  const promptText = `Generate a clean 3-panel split collage visual exercise guide in the exact same style, camera angles, dramatic dark luxury gym atmosphere, and identical shredded muscular Asian male fitness coach character as shown in Image 1.

The coach is performing "${item.name}" using ${item.equip}, accurately matching the form in Image 2 (start position) and Image 3 (end contraction):
- Panel 1 (Left): Starting position showing full body posture and initial grip
- Panel 2 (Center): Peak contraction / lockout position displaying full range of motion
- Panel 3 (Right): Dynamic 45-degree angle or cinematic close-up highlighting muscle fiber engagement

Include hyper-detailed glowing cyan / neon electric blue anatomical muscle highlight overlay specifically emphasizing active engagement on the ${item.muscles}. Moody atmospheric dark gym background, strong cinematic rim lighting accentuating muscle striations, 8k resolution, ultra-photorealistic.`;

  md += `### ${count}. ${ex?.name || item.name} (${item.schedule})\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;">\n`;
  md += `  <img src="${previewUrl}" width="120" style="border-radius:12px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>🖼️ Status Thumbnail:</b> ${foundThumb ? '✅ <b>Ada</b> (<code>' + foundThumb + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.webp</code>)'}</p>\n`;
  md += `    <p><b>🎥 Status Video:</b> ${foundVid ? '✅ <b>Ada</b> (<code>' + foundVid + '</code>)' : '❌ <b>Belum Ada</b> (Target: <code>' + targetBase + '.mp4</code>)'}</p>\n`;
  md += `    <p><b>📁 Folder Referensi:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `    <p><b>🎯 Otot Target (Glowing Cyan):</b> ${item.muscles}</p>\n`;
  md += `    <p><b>🏋️‍♂️ Alat:</b> ${item.equip}</p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**Prompt ChatGPT (GPT-4o) / Midjourney (3-Panel):**\n`;
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

[CARA MELAKUKAN (ID)]:
${instructions}

[INSTRUCTIONS (EN)]:
${instructionsEn}

==================================================
[PROMPT SIAP COPAS 3-PANEL KE CHATGPT / MIDJOURNEY]
(Upload: 1. Gambar Coach Acuan, 2. 0_start_pose.jpg, 3. 1_end_pose.jpg)
==================================================
${promptText}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated to 3-panel split collage prompts!');
