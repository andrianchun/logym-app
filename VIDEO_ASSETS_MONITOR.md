# 📊 Logym App - Video Assets Monitoring & Folder Separation

Terakhir diperbarui: 25/8/2026, 08.17.48 WIB

---

## 📁 Struktur Pemisahan Folder Aset
1. **Official AI Videos:** `public/exercise-assets/edb-[Name].mp4` (Aset Resmi AI Buatan Sendiri)
2. **YouTube Reference Backup:** `public/exercise-assets/youtube-backup/edb-[Name].mp4` (Backup / Referensi Sementara)

### 🎯 Aturan Prioritas Pemutaran di Aplikasi:
- **Jika sudah ada Video AI resmi:** Video AI otomatis menjadi **Pilihan Utama (#1)** yang diputar saat latihan dimulai. Video YouTube dari folder backup diletakkan di urutan **#2 (bisa di-swipe jika ingin melihat referensi gerakan asli)**.
- **Jika belum ada Video AI:** Video YouTube backup otomatis menjadi **Pilihan Utama (#1)** sampai file video AI di-generate dan diletakkan di `public/exercise-assets/`.

---

## 📈 Ringkasan Statistik
- **Total Master Exercises:** 39 latihan
- **Latihan Beban (Perlu Video):** 25 latihan
- **Latihan Beban dengan Video Aktif (AI / YT Backup):** **26 / 25 (100% TERCOVER)** ✅
- **Sudah Ada Video AI Resmi:** **14 / 25 (56%)**
- **Masih Menggunakan Backup YT (Belum Ada AI):** **11 latihan**
- **Total File MP4 di `public/exercise-assets/` (AI):** **19 file**
- **Total File MP4 di `public/exercise-assets/youtube-backup/` (YT):** **26 file**

---

## 🏋️ Tabel Pemantauan Status Video Master Exercise

| ID | Nama Latihan | Pakai | Target Otot | Alat | Status Pemutaran di App | File Video AI (Utama) | File Backup YT (Cadangan) |
|---|---|---|---|---|---|---|---|
| **112** | **Cable Crunch** | 13x | Core | Cable | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Cable_Crunch.mp4` (0.19 MB) |
| **113** | **Wide-Grip Lat Pulldown** | 12x | Lats, Biceps | Machine | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Wide-Grip_Lat_Pulldown.mp4` (0.36 MB) |
| **106** | **Dumbbell Alternate Bicep Curl** | 11x | Biceps | Dumbbell | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Dumbbell_Alternate_Bicep_Curl.mp4` (0.88 MB) | `edb-Dumbbell_Alternate_Bicep_Curl.mp4` (0.23 MB) |
| **102** | **Seated Cable Rows** | 10x | Punggung Atas, Biceps | Cable | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Seated_Cable_Rows.mp4` (0.58 MB) | `edb-Seated_Cable_Rows.mp4` (0.28 MB) |
| **101** | **Smith Machine Incline Bench Press** | 9x | Dada Atas, Deltoid Depan, Triceps | Smith Machine | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Smith_Machine_Incline_Bench_Press.mp4` (0.71 MB) | `edb-Smith_Machine_Incline_Bench_Press.mp4` (0.37 MB) |
| **104** | **Cable Seated Lateral Raise** | 9x | Deltoid Samping | Cable | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Cable_Seated_Lateral_Raise.mp4` (0.17 MB) |
| **105** | **Triceps Pushdown** | 9x | Triceps | Cable | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Triceps_Pushdown.mp4` (0.93 MB) | `edb-Triceps_Pushdown.mp4` (0.29 MB) |
| **108** | **Smith Machine Squat** | 9x | Quads, Hams, Glutes | Smith Machine | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Smith_Machine_Squat.mp4` (0.97 MB) | `edb-Smith_Machine_Squat.mp4` (0.27 MB) |
| **114** | **Dumbbell Shoulder Press** | 9x | Deltoid Depan, Triceps | Dumbbell | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Dumbbell_Shoulder_Press.mp4` (0.43 MB) | `edb-Dumbbell_Shoulder_Press.mp4` (0.25 MB) |
| **116** | **Cable Rear Delt Fly** | 9x | Deltoid Belakang | Cable | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Cable_Rear_Delt_Fly_1.mp4` (0.47 MB) | `edb-Cable_Rear_Delt_Fly_1.mp4` (0.19 MB) |
| **109** | **Romanian Deadlift** | 8x | Hams, Glutes | Barbell | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Romanian_Deadlift.mp4` (0.73 MB) | `edb-Romanian_Deadlift.mp4` (0.12 MB) |
| **103** | **Dumbbell Bench Press** | 6x | Dada Tengah, Triceps | Dumbbell | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Dumbbell_Bench_Press.mp4` (0.62 MB) | `edb-Dumbbell_Bench_Press.mp4` (0.29 MB) |
| **111** | **Rocking Standing Calf Raise** | 6x | Calves | Machine | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Rocking_Standing_Calf_Raise.mp4` (0.52 MB) |
| **124** | **Dumbbell Shrug** | 6x | Traps, Leher | Dumbbell | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Dumbbell_Shrug.mp4` (0.29 MB) |
| **117** | **Cable Rope Overhead Triceps Extension** | 6x | Triceps | Cable | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Cable_Rope_Overhead_Triceps_Extension.mp4` (0.36 MB) | `edb-Cable_Rope_Overhead_Triceps_Extension.mp4` (0.34 MB) |
| **119** | **Split Squat with Dumbbells** | 6x | Quads, Hams, Glutes | Dumbbell | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Split_Squat_with_Dumbbells.mp4` (0.53 MB) | `edb-Split_Squat_with_Dumbbells.mp4` (0.53 MB) |
| **115** | **Smith Machine Bench Press** | 5x | Dada Tengah, Triceps | Smith Machine | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Smith_Machine_Bench_Press.mp4` (0.74 MB) | `edb-Smith_Machine_Bench_Press.mp4` (0.27 MB) |
| **118** | **High Cable Curls** | 5x | Biceps | Cable | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-High_Cable_Curls.mp4` (0.23 MB) |
| **122** | **Seated Calf Raise** | 5x | Calves | Dumbbell | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Seated_Calf_Raise.mp4` (0.21 MB) |
| **123** | **Plank** | 5x | Core | Body Weight | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Plank.mp4` (0.31 MB) |
| **110** | **Barbell Walking Lunge** | 4x | Quads, Hams, Glutes | Dumbbell | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Barbell_Walking_Lunge.mp4` (0.30 MB) |
| **120** | **SM Romanian Deadlift (RDL)** | 4x | Hams, Glutes | Smith Machine | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Smith_Machine_Stiff-Legged_Deadlift.mp4` (0.87 MB) | `edb-Smith_Machine_Romanian_Deadlift.mp4` (0.40 MB) |
| **135** | **Barbell Bench Press - Medium Grip** | 3x | Dada Tengah, Triceps, Deltoid Depan | Barbell | 🤖 AI (#1) + 🎬 YT Backup (#2) | `edb-Barbell_Bench_Press_-_Medium_Grip.mp4` (0.73 MB) | `edb-Barbell_Bench_Press_-_Medium_Grip.mp4` (0.77 MB) |
| **134** | **Goblet Squat** | 2x | Quads, Glutes | Dumbbell | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Goblet_Squat.mp4` (1.89 MB) |
| **107** | **Cardio** | 1x | Cardio | Stationary Bike | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **121** | **Pull Through** | 1x | Hams, Glutes | Cable | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Pull_Through.mp4` (0.04 MB) |
| **125** | **Palms-Up Dumbbell Wrist Curl Over A Bench** | 1x | Forearm | Dumbbell | 🎬 YT Backup (#1, Menunggu AI) | `-`  | `edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4` (1.75 MB) |
| **128** | **Aerobic** | 1x | Cardio | Body Weight | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **131** | **Yoga / Relaksasi** | 1x | Core | Body Weight | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **126** | **Treadmill Running** | - | Cardio | Treadmill | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **127** | **Stationary Bike** | - | Cardio | Stationary Bike | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **129** | **HIIT** | - | Cardio, Core | Body Weight | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **130** | **Pilates** | - | Core | Body Weight | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **132** | **Elliptical Trainer** | - | Cardio | Elliptical Machine | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **133** | **Jump Rope** | - | Cardio | Rope | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **136** | **Swimming (Renang)** | - | Cardio, Core, Lats | Pool | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **137** | **Jogging / Running** | - | Cardio, Quads, Calves | Body Weight | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **138** | **Walking / Jalan Kaki** | - | Cardio | Body Weight | ⏱️ Kardio / Waktu | `-`  | `-`  |
| **139** | **Cycling / Sepeda** | - | Cardio, Quads | Bicycle | ⏱️ Kardio / Waktu | `-`  | `-`  |

---

## 📋 Roadmap Latihan yang Masih Menunggu Video AI Resmi (11 Latihan)
*Latihan di bawah ini saat ini memutar video dari `youtube-backup`. Silakan generate di AI generator (Kling / Runway / Luma) lalu taruh file hasilnya di `public/exercise-assets/`:*

| ID | Nama Latihan | Frekuensi | Target File AI di `public/exercise-assets/` |
|---|---|---|---|
| **112** | **Cable Crunch** | 13x | `edb-Cable_Crunch.mp4` |
| **113** | **Wide-Grip Lat Pulldown** | 12x | `edb-Wide-Grip_Lat_Pulldown.mp4` |
| **104** | **Cable Seated Lateral Raise** | 9x | `edb-Cable_Seated_Lateral_Raise.mp4` |
| **111** | **Rocking Standing Calf Raise** | 6x | `edb-Rocking_Standing_Calf_Raise.mp4` |
| **124** | **Dumbbell Shrug** | 6x | `edb-Dumbbell_Shrug.mp4` |
| **118** | **High Cable Curls** | 5x | `edb-High_Cable_Curls.mp4` |
| **122** | **Seated Calf Raise** | 5x | `edb-Seated_Calf_Raise.mp4` |
| **110** | **Barbell Walking Lunge** | 4x | `edb-Barbell_Walking_Lunge.mp4` |
| **134** | **Goblet Squat** | 2x | `edb-Goblet_Squat.mp4` |
| **121** | **Pull Through** | 1x | `edb-Pull_Through.mp4` |
| **125** | **Palms-Up Dumbbell Wrist Curl Over A Bench** | 1x | `edb-Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench.mp4` |
