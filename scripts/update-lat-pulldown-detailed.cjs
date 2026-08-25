const fs = require('fs');
const path = require('path');

const targetDir = path.resolve('ai_references/08_Wide-Grip_Lat_Pulldown');

const fullGuide = `=== EXERCISE: Wide-Grip Lat Pulldown ===
ID: Wide-Grip_Lat_Pulldown
Target Muscles: Latissimus Dorsi (Lats), Teres Major, Rhomboids, Middle/Lower Trapezius, Biceps
Equipment: Cable Lat Pulldown Machine with Wide Angled Bar & Adjustable Thigh Pads

[REFERENSI GAMBAR YANG DI-UPLOAD KE CHATGPT]:
- Image 1: 00_coach_reference.jpg (Wajah & Karakter Coach)
- Image 2: ref_1_side_stretch.png (Profil Samping - Fase Full Stretch & Sudut Badan 15-20 Derajat)
- Image 3: ref_2_side_contraction.png (Profil Samping - Fase Puncak Kontraksi Tarikan Siku)
- Image 4: ref_3_side_closeup.png (Profil Samping Close-up - Peregangan Serat Sayap/Lats)
- Image 5: 0_start_pose.jpg (Tampak Belakang - Rentang Tangan Lebar & Sayap Terbuka Lebar)
- Image 6: 1_end_pose.jpg (Tampak Belakang - Puncak Remasan Otot Punggung & Belikat Merapat)

================================================================================
1. PROMPT IMAGE (1:1 MULTI-PANEL ASYMMETRIC COLLAGE - ULTRA DETAILED)
Upload 6 gambar di atas ke ChatGPT (GPT-4o)
================================================================================
Generate an ultra-photorealistic, high-end visual fitness exercise guide in 1:1 square aspect ratio, featuring the identical shredded muscular Asian male fitness coach character from Image 1 in a moody dark luxury gym.

Character Specifications:
- Exact same handsome Asian facial features, short dark textured hairstyle, clean-shaven, and shredded athletic physique as in Image 1.
- Shirtless, wearing dark compression gym shorts, white gym socks, and athletic shoes. Calm focused gym expression with closed mouth.

Composition (Asymmetric 1:1 Multi-Panel Multi-Angle Collage):
The 1:1 canvas is divided into a clean multi-panel layout capturing the exercise from multiple distinct perspectives:
- Left Half (Tall Dominant Hero Panel): Direct rear back perspective matching Image 6, seated on the lat pulldown machine at peak contraction, pulling the wide bar down to clavicle height with shoulder blades depressed and retracted, showcasing massive V-taper lat width and striations.
- Top-Right Panel (Side Profile Biomechanics): True 90-degree lateral side view matching Image 2 and Image 3, illustrating the 15-to-20-degree backward torso lean with chest held high and thighs locked securely under the machine pad.
- Middle-Right Panel (Full Stretch Overhead View): Direct rear back view matching Image 5, demonstrating full overhead arm extension at the starting position with lats fully flared and stretched.
- Bottom-Right Panel (Macro Anatomy Squeeze): Close-up 3/4 angle focusing sharply on the deep muscle striations of the mid-to-lower latissimus dorsi and teres major during peak contraction.

Anatomical Highlight (Strict Pinpoint Glowing Cyan Wireframe):
- Overlay a delicate, semi-transparent glowing electric cyan / neon blue wireframe anatomical mesh STRICTLY CONFINED to the latissimus dorsi (outer wings/lats), teres major, and upper back.
- CRITICAL RESTRICTION: Zero glow on the face, neck, head, arms, legs, or background. All other body parts must remain 100% natural human skin with realistic sweat and vascularity.

Aesthetics & Studio Lighting:
- Moody dark luxury gym environment with subtle ambient blue/teal lighting.
- Strong cinematic rim lighting sculpting back contours, 8k resolution, hyper-detailed textures, flawless photorealism, 1:1 square canvas.

================================================================================
2. PROMPT VIDEO (FIXED STEADY TRIPOD SHOT - ULTRA DETAILED HOW-TO & ISOLATED PULSE)
Upload hasil gambar Single Hero / First Frame ke Kling AI / Runway / Luma
================================================================================
[CAMERA & CINEMATOGRAPHY]: FIXED STEADY TRIPOD SHOT. STATIC ROCK-SOLID CAMERA FRAMING at a stationary rear 3/4 back angle. STRICTLY NO 360 ROTATION, NO CAMERA ORBIT, NO PANNING, NO SHAKY CAM. The camera remains completely still, keeping the athlete, overhead bar, and lat pulldown machine centered in frame.

Subject & Expression:
The identical shredded muscular Asian male fitness coach from the reference image performing "Wide-Grip Lat Pulldown" on a commercial cable lat pulldown machine with wide bar.
CRITICAL FACIAL DIRECTIVE: STOIC FOCUSED WORKOUT EXPRESSION, MOUTH STRICTLY CLOSED. ZERO TALKING, ZERO MOUTH MOVEMENT, NO MUTTERING, NO TALKING ARTIFACTS.

Biomechanical Execution (Step-by-Step How-To):
1. Sit securely on the lat pulldown seat with thighs locked snugly under the padded rollers, grasping the wide bar with an overhand grip wider than shoulder width.
2. Lean the torso back slightly around 15 to 20 degrees with a natural arch in the lower back and chest proudly elevated.
3. Exhale and pull the bar smoothly downward toward the upper chest/clavicle by driving elbows down and back into the ribs.
4. Squeeze the latissimus dorsi forcefully at peak contraction for 1 full second with scapulae retracted.
5. Inhale and slowly resist the weight back up to full arm extension over 2 seconds, feeling a deep stretch across the lats.

[STRICT PINPOINT MUSCLE HIGHLIGHT VFX]:
A delicate, semi-transparent glowing cyan / neon blue wireframe muscle fiber overlay is strictly and exclusively confined to the active working muscles (latissimus dorsi, teres major, upper back).
CRITICAL RULE: The face, neck, abdomen, legs, and all non-working muscles MUST REMAIN 100% NATURAL REALISTIC HUMAN SKIN WITH ZERO GLOW. No full-body glowing aura. The subtle cyan highlight pulses gently only inside the boundaries of the lats as they contract at the peak, then softens during eccentric stretch.

Tempo & Dynamics:
Controlled repetition tempo: 2 seconds slow lowering with deep muscle stretch, 1 second explosive lifting into peak contraction, holding top squeeze for 1 second. Clean seamless looping motion.

Visuals & Lighting:
Moody atmospheric gym, dramatic volumetric rim lighting highlighting back muscle striations, sweat glistens under studio lighting, 8k resolution, 60fps, crisp masterclass fitness production.
`;

fs.writeFileSync(path.join(targetDir, 'prompt_guide.txt'), fullGuide, 'utf8');
console.log('Updated Wide-Grip Lat Pulldown prompt_guide.txt successfully!');
