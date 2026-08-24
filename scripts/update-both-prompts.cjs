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
  { 
    name: 'Dumbbell Bench Press', 
    layout: 'horizontal', 
    muscles: 'mid chest (pectoralis major), front deltoids, triceps', 
    equip: 'pair of dumbbells and flat gym bench', 
    schedule: 'Upper 1',
    camMotion: 'Slow 360-degree rotating orbit from 3/4 front angle to side profile angle',
    repAction: 'Smoothly lowering dumbbells to chest level feeling a deep stretch, then powerful controlled pressing upward with intense peak chest contraction, locking out and holding for 1 second'
  },
  { 
    name: 'Incline Dumbbell Press', 
    layout: 'horizontal', 
    muscles: 'upper chest (clavicular head), front deltoids, triceps', 
    equip: 'pair of dumbbells and 30-45 degree incline gym bench', 
    schedule: 'Chest Staple',
    camMotion: 'Smooth low-angle tracking arc rising slightly toward chest level',
    repAction: 'Lowering dumbbells to upper chest with flared elbows at 45 degrees, then pressing up in a converging arc squeezing the upper pectorals tightly at the top'
  },
  { 
    name: 'Barbell Bench Press - Medium Grip', 
    layout: 'horizontal', 
    muscles: 'mid chest, triceps, anterior deltoids', 
    equip: 'standard Olympic barbell and flat bench press station', 
    schedule: 'Chest Staple',
    camMotion: 'Slow dynamic diagonal pan from side bench angle to front angle',
    repAction: 'Lowering the barbell with pinpoint control to touch the mid-sternum, then pressing straight up explosively while engaging chest and triceps'
  },
  { 
    name: 'Smith Machine Bench Press', 
    layout: 'horizontal', 
    muscles: 'mid chest, triceps, anterior deltoids', 
    equip: 'Smith machine with horizontal flat bench', 
    schedule: 'Upper 2',
    camMotion: 'Smooth side-to-front 45-degree orbital pan',
    repAction: 'Guiding the fixed Smith barbell down smoothly to chest level and pressing up explosively along the vertical guide rails with full chest contraction'
  },
  { 
    name: 'Smith Machine Incline Bench Press', 
    layout: 'horizontal', 
    muscles: 'upper chest, anterior deltoids, triceps', 
    equip: 'Smith machine with 30-degree incline bench', 
    schedule: 'Upper 1',
    camMotion: 'Cinematic slow orbit around the incline bench emphasizing upper chest striations',
    repAction: 'Lowering bar to upper clavicle area and pressing straight up with locked shoulder blades and maximum upper chest engagement'
  },
  { 
    name: 'Pushups', 
    layout: 'horizontal', 
    muscles: 'chest, triceps, anterior deltoids, core', 
    equip: 'bodyweight on gym floor mat', 
    schedule: 'Bodyweight Staple',
    camMotion: 'Low ground-level cinematic tracking pan from front-side to side profile',
    repAction: 'Lowering body with a straight plank posture until chest hovers just above the floor, then pressing up firmly with core braced'
  },
  { 
    name: 'Cable Crossover', 
    layout: 'vertical', 
    muscles: 'inner and lower chest, anterior deltoids', 
    equip: 'dual cable crossover machine with D-handles', 
    schedule: 'Chest Staple',
    camMotion: 'Slow forward dolly zoom tracking the hands meeting in the center',
    repAction: 'Drawing both cables in a wide hugging arc across the chest, squeezing the inner pectorals hard at peak crossing point, and returning under smooth tension'
  },

  // 2. BACK & LATS
  { 
    name: 'Wide-Grip Lat Pulldown', 
    layout: 'vertical', 
    muscles: 'latissimus dorsi, upper back, biceps', 
    equip: 'cable lat pulldown machine with wide bar', 
    schedule: 'Upper 2',
    camMotion: 'Slow rear 3/4 orbital pan moving from upper back to side profile',
    repAction: 'Pulling the wide bar down smoothly to upper chest while driving elbows down and back, squeezing the V-taper lats, then releasing upward with controlled eccentric stretch'
  },
  { 
    name: 'Seated Cable Rows', 
    layout: 'horizontal', 
    muscles: 'rhomboids, latissimus dorsi, middle trapezius, biceps', 
    equip: 'low cable seated row machine with V-bar / close grip handle', 
    schedule: 'Upper 1',
    camMotion: 'Side profile slowly shifting to 3/4 back perspective',
    repAction: 'Pulling the V-handle toward the abdomen with upright chest and retracted scapula, holding peak back contraction, then extending arms forward under control'
  },
  { 
    name: 'Pullups', 
    layout: 'vertical', 
    muscles: 'latissimus dorsi, teres major, biceps, upper back', 
    equip: 'overhead pull-up bar / power tower', 
    schedule: 'Back Staple',
    camMotion: 'Vertical upward tracking camera moving from full hang to chin-over-bar',
    repAction: 'Initiating pull from a dead hang by retracting shoulder blades, pulling chin cleanly over the bar with flared lats, then lowering smoothly with zero swinging'
  },
  { 
    name: 'Bent Over Two-Dumbbell Row', 
    layout: 'horizontal', 
    muscles: 'latissimus dorsi, rhomboids, rear deltoids', 
    equip: 'pair of heavy dumbbells in bent-over torso position', 
    schedule: 'Back Staple',
    camMotion: '3/4 rear angle slow pan highlighting upper back muscle thickness',
    repAction: 'Rowing both dumbbells toward hips with elbows tucked, squeezing rhomboids and middle back tightly, and lowering under strict control'
  },
  { 
    name: 'Barbell Deadlift', 
    layout: 'vertical', 
    muscles: 'erector spinae, glutes, hamstrings, traps, lats', 
    equip: 'Olympic barbell with bumper plates on lifting platform', 
    schedule: 'Back/Legs Staple',
    camMotion: 'Low dynamic wide orbit panning from front-diagonal to full side lockout',
    repAction: 'Hinging at hips and knees, lifting barbell off floor keeping bar close to shins, standing tall into a firm upright lockout with glutes engaged, then lowering with control'
  },
  { 
    name: 'Dumbbell Shrug', 
    layout: 'vertical', 
    muscles: 'upper trapezius, neck muscles', 
    equip: 'heavy pair of dumbbells held at sides', 
    schedule: 'Upper 2',
    camMotion: 'Close-up torso orbit focusing on the upper traps and neck elevation',
    repAction: 'Elevating shoulders straight up toward ears in a powerful shrug, holding for 1 second at the peak, and lowering with full stretch'
  },

  // 3. SHOULDERS
  { 
    name: 'Dumbbell Shoulder Press', 
    layout: 'vertical', 
    muscles: 'anterior and lateral deltoids, upper chest, triceps', 
    equip: 'pair of dumbbells seated on 90-degree upright bench', 
    schedule: 'Upper 2',
    camMotion: 'Slow frontal upward pan rotating slightly to 3/4 angle at lockout',
    repAction: 'Pressing dumbbells overhead in a smooth converging motion without clanking, locking out overhead, then lowering dumbbells to ear level under tension'
  },
  { 
    name: 'Cable Seated Lateral Raise', 
    layout: 'vertical', 
    muscles: 'lateral deltoids (side shoulder)', 
    equip: 'low cable pulley with single-hand cuff seated on flat bench', 
    schedule: 'Upper 1',
    camMotion: 'Side-to-front slow orbital sweep capturing lateral deltoid capping',
    repAction: 'Raising the cable out to the side in a smooth wide arc until parallel with shoulder, holding the contraction, then lowering smoothly'
  },
  { 
    name: 'Cable Rear Delt Fly', 
    layout: 'vertical', 
    muscles: 'posterior deltoids (rear delt), upper back', 
    equip: 'dual high-to-mid cable crossover pulleys crossing arms', 
    schedule: 'Upper 2',
    camMotion: 'Rear 3/4 angle slow orbital pan focusing on the back of shoulders',
    repAction: 'Opening crossed arms horizontally outward in a wide reverse-fly arc with fixed soft elbows, squeezing rear delts hard at full stretch, and returning slowly'
  },
  { 
    name: 'Face Pull', 
    layout: 'vertical', 
    muscles: 'posterior deltoids, rhomboids, rotator cuff', 
    equip: 'high cable pulley with rope attachment pulled towards eye level', 
    schedule: 'Shoulders Staple',
    camMotion: 'Slow dynamic pan from side angle to face-level rear angle',
    repAction: 'Pulling rope attachment toward face/forehead while externally rotating hands back, squeezing rear delts and rotator cuffs, and returning smoothly'
  },

  // 4. LEGS & GLUTES
  { 
    name: 'Smith Machine Squat', 
    layout: 'vertical', 
    muscles: 'quadriceps, gluteus maximus, hamstrings', 
    equip: 'Smith machine bar rested on upper traps', 
    schedule: 'Lower 1',
    camMotion: 'Slow downward and upward tracking camera following the squat descent',
    repAction: 'Descending into a deep parallel squat with knees tracking toes, pausing momentarily at the bottom, then driving up powerfully through midfoot'
  },
  { 
    name: 'Barbell Squat', 
    layout: 'vertical', 
    muscles: 'quadriceps, glutes, core, hamstrings', 
    equip: 'Olympic barbell on squat rack', 
    schedule: 'Legs Staple',
    camMotion: 'Front-diagonal 3/4 orbit capturing full depth and upright torso',
    repAction: 'Unracking bar, squatting deeply below parallel with braced core, driving out of the hole aggressively into full standing lockout'
  },
  { 
    name: 'Romanian Deadlift', 
    layout: 'horizontal', 
    muscles: 'hamstrings, gluteus maximus, spinal erectors', 
    equip: 'Olympic barbell held at hip level hinged back', 
    schedule: 'Lower 1',
    camMotion: 'Side-profile slow rotational pan emphasizing hip hinge and hamstring stretch',
    repAction: 'Pushing hips backward while sliding barbell down close to shins with soft knees, feeling deep hamstring stretch, then driving hips forward to stand'
  },
  { 
    name: 'Smith Machine Stiff-Legged Deadlift', 
    layout: 'horizontal', 
    muscles: 'hamstrings, gluteus maximus, lower back', 
    equip: 'Smith machine bar lowered past shins', 
    schedule: 'Lower 2 (SM RDL)',
    camMotion: 'Side 45-degree angle tracking the vertical bar path',
    repAction: 'Hinging deeply at hips along the fixed vertical guide path, stretching hamstrings fully at bottom, and snapping hips into glute contraction at top'
  },
  { 
    name: 'Split Squat with Dumbbells', 
    layout: 'vertical', 
    muscles: 'quadriceps, glutes, hamstrings', 
    equip: 'pair of dumbbells held at sides in split stance lunge position', 
    schedule: 'Lower 2',
    camMotion: 'Low lateral pan focusing on front quad and rear knee depth',
    repAction: 'Dropping back knee straight toward the floor until front thigh is parallel, driving through front heel to return to top split stance'
  },
  { 
    name: 'Barbell Walking Lunge', 
    layout: 'vertical', 
    muscles: 'quadriceps, glutes, calves, core', 
    equip: 'barbell on upper back walking forward', 
    schedule: 'Lower 1',
    camMotion: 'Smooth tracking dolly moving backwards ahead of the coach walking forward',
    repAction: 'Stepping forward into alternating deep lunges with upright posture, knee gently kissing floor, driving smoothly into the next step'
  },
  { 
    name: 'Rocking Standing Calf Raise', 
    layout: 'vertical', 
    muscles: 'gastrocnemius and soleus (calves)', 
    equip: 'standing calf raise block/machine', 
    schedule: 'Lower 1',
    camMotion: 'Low-angle close-up camera focusing on calf muscle flexion and ankles',
    repAction: 'Dropping heels for a deep calf stretch, then raising high onto balls of feet, holding peak calf contraction for 2 seconds'
  },
  { 
    name: 'Seated Calf Raise', 
    layout: 'vertical', 
    muscles: 'soleus and gastrocnemius (lower calves)', 
    equip: 'seated calf raise machine / dumbbell on knees', 
    schedule: 'Lower 2',
    camMotion: 'Side close-up orbit capturing the soleus muscle striations',
    repAction: 'Lowering heels below the platform edge, pressing straight up into maximum dorsiflexion squeeze, and repeating with controlled tempo'
  },

  // 5. ARMS (BICEPS & TRICEPS)
  { 
    name: 'Dumbbell Alternate Bicep Curl', 
    layout: 'vertical', 
    muscles: 'biceps brachii, brachialis, forearms', 
    equip: 'pair of dumbbells alternating arms with supination', 
    schedule: 'Upper 1',
    camMotion: 'Front-to-side dynamic rotational orbit tracking each curling arm',
    repAction: 'Curling one dumbbell while supinating wrist to ceiling, squeezing bicep peak at top, lowering under control while initiating curl on opposite arm'
  },
  { 
    name: 'Hammer Curls', 
    layout: 'vertical', 
    muscles: 'brachioradialis (forearm), brachialis, outer biceps', 
    equip: 'pair of dumbbells held in neutral hammer grip', 
    schedule: 'Arms Staple',
    camMotion: '3/4 side angle focusing on the outer arm and forearm thickness',
    repAction: 'Curling dumbbells with palms facing each other in strict neutral grip, locking elbows in place, squeezing top contraction, and lowering slowly'
  },
  { 
    name: 'High Cable Curls', 
    layout: 'vertical', 
    muscles: 'bicep peak (biceps brachii inner head)', 
    equip: 'dual high cable pulleys in front double biceps pose', 
    schedule: 'Upper 2',
    camMotion: 'Frontal majestic center tracking camera zooming slightly toward coach',
    repAction: 'Curling both cable handles toward ears in a front double-biceps pose, squeezing inner bicep peaks intensely, and extending arms outward with tension'
  },
  { 
    name: 'Triceps Pushdown', 
    layout: 'vertical', 
    muscles: 'lateral and long head of triceps brachii', 
    equip: 'high cable pulley with straight bar or V-bar', 
    schedule: 'Upper 1',
    camMotion: 'Side 45-degree angle tracking triceps horse-shoe definition',
    repAction: 'Pinning elbows to torso, pushing attachment straight down to lockout, flexing triceps hard at bottom, and controlling return to chest level'
  },
  { 
    name: 'Cable Rope Overhead Triceps Extension', 
    layout: 'vertical', 
    muscles: 'triceps long head', 
    equip: 'low-to-mid cable pulley with rope attachment facing away overhead', 
    schedule: 'Upper 2',
    camMotion: 'Side-to-rear rotational pan emphasizing the deep triceps stretch',
    repAction: 'Bending elbows behind head for maximal long-head stretch, then extending arms forward and locking out overhead, spreading the rope at the end'
  },

  // 6. CORE
  { 
    name: 'Cable Crunch', 
    layout: 'horizontal', 
    muscles: 'rectus abdominis (six pack abs), upper core', 
    equip: 'high cable pulley with rope held beside ears on knees', 
    schedule: 'Lower 1',
    camMotion: 'Side profile close-up tracking the spinal flexion and abdominal crunch',
    repAction: 'Kneeling with rope pinned to ears, curling torso downward pulling elbows to knees with core, holding abdominal contraction, and uncurling slowly'
  }
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

let md = `# Panduan Lengkap Prompt AI: Thumbnail (1:1 Kolase) & Video (1 Frame Dinamis)

> **🎯 Formula Standar Aset Visual Logym**:
> 1. **🖼️ Thumbnail (1:1 Kolase Asimetris 3-Panel)**:
>    - **Gerakan Mendatar**: 1 Panel Hero Lebar di Atas + 2 Sub-panel di Bawah.
>    - **Gerakan Tegak**: 1 Panel Hero Tinggi di Kiri + 2 Sub-panel di Kanan.
>    - 3 Sudut kamera berbeda total (*3/4 Isometric, 90° Profile, Macro Angled Close-up*) + efek *Glowing Cyan Muscle Highlight*.
> 2. **🎥 Video (1 Frame Full Single Scene)**:
>    - 1 Frame utuh (tidak dipotong-potong/bukan kolase), pergerakan kamera halus (*slow cinematic orbit / pan*).
>    - Menampilkan 1–2 repetisi bersih dengan form sempurna, fokus pada kontraksi otot riil, seamless loop, 4k/8k hyperrealistic.

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

## 🎨 2. Alur Upload Cepat (Foto Coach + Screenshot YouTube)

1. **Buka folder latihan di** \`ai_references/<nomor_latihan>/\`.
2. **Upload ke ChatGPT (GPT-4o) / Generator Video**:
   * **Foto 1**: \`00_coach_reference.jpg\` (Acuan karakter wajah & fisik).
   * **Foto 2 & 3**: \`0_start_pose.jpg\` dan \`1_end_pose.jpg\` (atau screenshot YouTube).
3. **Pilih Prompt yang Dibutuhkan**:
   * **Untuk Thumbnail**: Copas **Prompt Image (Thumbnail 1:1 Kolase)**.
   * **Untuk Video**: Copas **Prompt Video (1 Frame Full Sinematik)** ke Kling AI / Runway / Luma / Haiper.

---

## 📋 3. Daftar Lengkap Prompt Image & Prompt Video (31 Latihan)

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

  // IMAGE PROMPT (1:1 3-Panel Collage)
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

  // VIDEO PROMPT (1 Frame Full Single Scene / Slow Orbit Motion)
  const promptVideo = `A cinematic single-camera full-scene gym video featuring the identical shredded muscular Asian male fitness coach from Image 1 executing "${item.name}" with perfect biomechanics using ${item.equip}.

Camera Movement:
${item.camMotion}, capturing full body control and sharp muscle striations in continuous fluid motion.

Action & Biomechanics:
${item.repAction}. Target muscles engaged: ${item.muscles}.

Visual Aesthetics:
Moody dark luxury fitness gym, dramatic volumetric rim lighting, deep 3D shadow depth, hyper-realistic sweat and vascularity, authentic gym acoustics, 8k resolution, 60fps, seamless looping repetition, masterpiece.`;

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
  md += `**🎥 Prompt Video (1 Frame Full Sinematik - Kling / Runway / Luma):**\n`;
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
Layout: 1:1 Square Asymmetric Multi-Angle 3D (${item.layout === 'horizontal' ? 'Top Hero' : 'Left Hero'})

[CARA MELAKUKAN (ID)]:
${instructions}

[INSTRUCTIONS (EN)]:
${instructionsEn}

==================================================
1. PROMPT IMAGE (THUMBNAIL 1:1 KOLASE 3-PANEL)
(Upload: 00_coach_reference.jpg, 0_start_pose.jpg, 1_end_pose.jpg)
==================================================
${promptImage}

==================================================
2. PROMPT VIDEO (1 FRAME FULL DINAMIS / MOVING CAMERA)
(Kling AI / Runway Gen-3 / Luma Dream Machine / Haiper)
==================================================
${promptVideo}
`;
    fs.writeFileSync(path.join(folderPath, 'prompt_guide.txt'), fullGuide, 'utf8');
  }
});

fs.writeFileSync('C:/Users/unthe/.gemini/antigravity/brain/3763797f-49e6-4dfb-a1b3-a09f236308a5/exercise_batch_1_thumbnails.md', md, 'utf8');
console.log('Successfully updated exercise_batch_1_thumbnails.md with Image & Video prompts!');
