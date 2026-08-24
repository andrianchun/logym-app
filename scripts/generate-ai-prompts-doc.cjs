const fs = require('fs');
const path = require('path');

const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));

// 31 priority exercises
const exercises = [
  // 1. CHEST
  { name: 'Dumbbell Bench Press', muscles: 'mid chest (pectoralis major), front deltoids, triceps', equip: 'pair of dumbbells and flat gym bench' },
  { name: 'Incline Dumbbell Press', muscles: 'upper chest (clavicular head), front deltoids, triceps', equip: 'pair of dumbbells and 30-45 degree incline gym bench' },
  { name: 'Barbell Bench Press - Medium Grip', muscles: 'mid chest, triceps, anterior deltoids', equip: 'standard Olympic barbell and flat bench press station' },
  { name: 'Smith Machine Bench Press', muscles: 'mid chest, triceps, anterior deltoids', equip: 'Smith machine with horizontal flat bench' },
  { name: 'Smith Machine Incline Bench Press', muscles: 'upper chest, anterior deltoids, triceps', equip: 'Smith machine with 30-degree incline bench' },
  { name: 'Pushups', muscles: 'chest, triceps, anterior deltoids, core', equip: 'bodyweight on gym floor mat' },
  { name: 'Cable Crossover', muscles: 'inner and lower chest, anterior deltoids', equip: 'dual cable crossover machine with D-handles' },

  // 2. BACK & LATS
  { name: 'Wide-Grip Lat Pulldown', muscles: 'latissimus dorsi, upper back, biceps', equip: 'cable lat pulldown machine with wide bar' },
  { name: 'Seated Cable Rows', muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', equip: 'low cable seated row machine with V-bar / close grip handle' },
  { name: 'Pullups', muscles: 'latissimus dorsi, teres major, biceps, upper back', equip: 'overhead pull-up bar / power tower' },
  { name: 'Bent Over Two-Dumbbell Row', muscles: 'latissimus dorsi, rhomboids, rear deltoids', equip: 'pair of heavy dumbbells in bent-over torso position' },
  { name: 'Barbell Deadlift', muscles: 'erector spinae, glutes, hamstrings, traps, lats', equip: 'Olympic barbell with bumper plates on lifting platform' },
  { name: 'Dumbbell Shrug', muscles: 'upper trapezius, neck muscles', equip: 'heavy pair of dumbbells held at sides' },

  // 3. SHOULDERS
  { name: 'Dumbbell Shoulder Press', muscles: 'anterior and lateral deltoids, upper chest, triceps', equip: 'pair of dumbbells seated on 90-degree upright bench' },
  { name: 'Cable Seated Lateral Raise', muscles: 'lateral deltoids (side shoulder)', equip: 'low cable pulley with single-hand cuff seated on flat bench' },
  { name: 'Cable Rear Delt Fly', muscles: 'posterior deltoids (rear delt), upper back', equip: 'dual high-to-mid cable crossover pulleys crossing arms' },
  { name: 'Face Pull', muscles: 'posterior deltoids, rhomboids, rotator cuff', equip: 'high cable pulley with rope attachment pulled towards eye level' },

  // 4. LEGS & GLUTES
  { name: 'Smith Machine Squat', muscles: 'quadriceps, gluteus maximus, hamstrings', equip: 'Smith machine bar rested on upper traps' },
  { name: 'Barbell Squat', muscles: 'quadriceps, glutes, core, hamstrings', equip: 'Olympic barbell on squat rack' },
  { name: 'Romanian Deadlift', muscles: 'hamstrings, gluteus maximus, spinal erectors', equip: 'Olympic barbell held at hip level hinged back' },
  { name: 'Smith Machine Stiff-Legged Deadlift', muscles: 'hamstrings, gluteus maximus, lower back', equip: 'Smith machine bar lowered past shins' },
  { name: 'Split Squat with Dumbbells', muscles: 'quadriceps, glutes, hamstrings', equip: 'pair of dumbbells held at sides in split stance lunge position' },
  { name: 'Barbell Walking Lunge', muscles: 'quadriceps, glutes, calves, core', equip: 'barbell on upper back walking forward' },
  { name: 'Rocking Standing Calf Raise', muscles: 'gastrocnemius and soleus (calves)', equip: 'standing calf raise block/machine' },
  { name: 'Seated Calf Raise', muscles: 'soleus and gastrocnemius (lower calves)', equip: 'seated calf raise machine / dumbbell on knees' },

  // 5. ARMS (BICEPS & TRICEPS)
  { name: 'Dumbbell Alternate Bicep Curl', muscles: 'biceps brachii, brachialis, forearms', equip: 'pair of dumbbells alternating arms with supination' },
  { name: 'Hammer Curls', muscles: 'brachioradialis (forearm), brachialis, outer biceps', equip: 'pair of dumbbells held in neutral hammer grip' },
  { name: 'High Cable Curls', muscles: 'bicep peak (biceps brachii inner head)', equip: 'dual high cable pulleys in front double biceps pose' },
  { name: 'Triceps Pushdown', muscles: 'lateral and long head of triceps brachii', equip: 'high cable pulley with straight bar or V-bar' },
  { name: 'Cable Rope Overhead Triceps Extension', muscles: 'triceps long head', equip: 'low-to-mid cable pulley with rope attachment facing away overhead' },

  // 6. CORE
  { name: 'Cable Crunch', muscles: 'rectus abdominis (six pack abs), upper core', equip: 'high cable pulley with rope held beside ears on knees' }
];

let md = `# Panduan Prompt AI & Visual Batch 1 (31 Latihan)

Dokumen ini berisi **panduan langkah upload ke ChatGPT** agar wajah coach konsisten, serta **tabel prompt siap copy-paste** untuk menghasilkan gambar 4-panel dengan efek *glowing cyan muscle highlight*.

---

## 🎨 Cara Upload ke ChatGPT (GPT-4o / DALL-E) Agar Wajah & Gaya Konsisten

Untuk mendapatkan hasil **wajah coach yang 100% sama** dan **gerakan yang akurat**:

1. **Buka ChatGPT Plus / Team (Model GPT-4o)**.
2. **Upload 3 Gambar Sekaligus**:
   * **Gambar 1 (Karakter & Gaya)**: Upload gambar referensi coach (contoh: gambar 4-panel Smith Machine yang Anda miliki).
   * **Gambar 2 (Pose Awal)**: Upload \`0_start_pose.jpg\` dari folder \`ai_references/<nama_latihan>/\`.
   * **Gambar 3 (Pose Akhir)**: Upload \`1_end_pose.jpg\` dari folder \`ai_references/<nama_latihan>/\`.
3. **Copy-Paste Template Prompt di Bawah**:
   * Cukup salin prompt dari tabel latihan yang diinginkan di bawah ini.

> [!TIP]
> **Formula Prompt Dasar yang Digunakan:**
> *"Generate a 4-panel 2x2 grid collage visual exercise guide in the exact same style, lighting, and identical muscular Asian coach character as in Image 1. Show the athlete executing [Nama Latihan] accurately matching Image 2 (start position) and Image 3 (end contraction). Add hyper-realistic glowing cyan / electric blue anatomical muscle fiber highlight overlays showing activation on [Target Otot]. Dark luxury gym background, cinematic dramatic rim lighting, 8k resolution, photorealistic."*

---

## 📋 Daftar Prompt Siap Copas (Batch 1 - 31 Latihan)

`;

let count = 0;
exercises.forEach(item => {
  count++;
  let ex = edb.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  if (!ex) ex = edb.find(e => e.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(e.name.toLowerCase()));
  
  const exId = ex?.exerciseId || ex?.id?.replace(/^edb-/, '') || item.name.replace(/[\s\(\)\/]+/g, '_');
  const previewUrl = ex?.gifUrl && ex.gifUrl.startsWith('http') ? ex.gifUrl : `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exId}/0.jpg`;
  const folderName = `${String(count).padStart(2, '0')}_${ex ? ex.name.replace(/[\\/:*?"<>|]/g, '_') : item.name}`;

  const promptText = `Generate a 4-panel 2x2 grid collage visual exercise guide in the exact same style, camera angles, dramatic dark gym atmosphere, and identical shredded muscular Asian male fitness coach character as shown in Image 1. 

The character is performing "${item.name}" using ${item.equip}, precisely following the biomechanics from Image 2 (starting position) and Image 3 (full contraction position):
- Top-Left: Starting position with proper grip and setup
- Top-Right: Peak contraction / lockout position
- Bottom-Left: Rear or 45-degree side angle showing full body alignment
- Bottom-Right: Cinematic close-up macro view focusing on the working muscle fibers

Include hyper-detailed glowing cyan / neon electric blue anatomical muscle highlight overlay specifically emphasizing active engagement on the ${item.muscles}. Dark modern aesthetic gym background, moody atmospheric lighting, strong rim lights accentuating muscle striations, 8k resolution, ultra-photorealistic, masterpiece.`;

  md += `### ${count}. ${ex?.name || item.name}\n\n`;
  md += `<div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;">\n`;
  md += `  <img src="${previewUrl}" width="120" style="border-radius:12px; border:1px solid #333;" />\n`;
  md += `  <div>\n`;
  md += `    <p><b>📁 Folder Referensi:</b> <code>ai_references/${folderName}/</code></p>\n`;
  md += `    <p><b>🎯 Otot Ditargetkan (Glowing Cyan):</b> ${item.muscles}</p>\n`;
  md += `    <p><b>🏋️‍♂️ Alat:</b> ${item.equip}</p>\n`;
  md += `  </div>\n`;
  md += `</div>\n\n`;
  md += `**Prompt ChatGPT / Midjourney:**\n`;
  md += `\`\`\`text\n${promptText}\n\`\`\`\n\n---\n\n`;
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated exercise_batch_1_thumbnails.md with copy-paste prompts!');
