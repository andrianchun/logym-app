# LOGYM Agent Guidelines & Audit Protocol (`AGENTS.md` / `agent.md`)

Setiap kali pengguna meminta untuk **"audit"**, **"analisis bug"**, **"debug"**, atau menambahkan/memodifikasi fitur latihan, sinkronisasi, dan antarmuka di aplikasi Logym:

---

## 1. DOKUMEN ARSITEKTUR WAJIB (Single Source of Truth)
- Buka dan baca [`AUDIT.md`](./AUDIT.md), [`design.md`](./design.md), dan [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md) sebelum memulai pengerjaan.
- Pahami 5 Pilar Enterprise di `AUDIT.md`:
  1. **SSOT Engine**: Satu rumus bersama untuk semua layar (`workoutCalc.js`).
  2. **Zero-Trust Gateway**: Bersihkan payload sebelum menyentuh cloud (`cleanFirestoreData`).
  3. **State Invariants**: State tidak boleh melanggar logika fisik manusia.
  4. **Regression Tests**: Setiap perbaikan bug wajib dikunci unit test (`*.test.mjs`).
  5. **5-Layer Impact Matrix**: Verifikasi perubahan di Floating Bar, Immersive, Tab Latihan, Kalender, dan Cloud Sync.

---

## 2. ATURAN MUTLAK KODE & DATA
- **Firestore Gateway**: Seluruh payload yang menuju Firestore (`setDoc`/`updateDoc`) **wajib** melewati `cleanFirestoreData()` untuk membuang nilai `undefined` rekursif.
- **Log Key Resolution**: Seluruh komponen live (Floating Bar, Immersive Workout) dan riwayat (Calendar) wajib mendukung format kunci majemuk `${ex.id}-${workoutId}`.
- **Monotonic Duration**: Durasi sesi yang sudah selesai tidak boleh ditimpa menjadi `00:00`. Gunakan `calcFallbackDurationSecs` jika stempel waktu hilang/berbenturan.
- **Modal Scroll Lock & History**: Semua modal wajib memakai `document.body.style.overflow = 'hidden'`, `overscroll-contain`, `touch-none`, dan tombol tutup memiliki `data-close-modal="true"`. Iframe YouTube wajib ber-`src` statis konstan (play/pause via `postMessage`).
- **Skalabilitas Dokumen (Batas 1 MiB)**: Jangan pernah menyimpan deret titik mentah tanpa kompresi. Riwayat nadi wajib diringkas (`summarizeHeartRate`), bioData wajib dikompresi (`compactDayBioData`), dan sidik jari baseline wajib ringkas FNV-1a (`dayFingerprint`).

---

## 3. ATURAN UI/UX, COPYWRITING & NO-REDUNDANCY (`design.md`)
- **Stop Redundansi Visual & Ikon**:
  - ❌ DILARANG keras menaruh ikon Lucide berdampingan dengan emoji dekoratif pada baris/elemen yang sama (misal: `[Icon Zap] ⚡ Prima`). Gunakan SATU representasi visual saja!
  - ❌ DILARANG menaruh emoji mengambang dekoratif tanpa fungsi di atas judul modal.
- **Copywriting Manusiawi, Ringkas & To-the-Point**:
  - Hindari copywriting kaku, robotik, atau teks bantuan (*help text*) yang terlalu panjang dan bertele-tele.
  - Judul modal/kartu maksimal 1–4 kata, instruksi maksimal 1 baris singkat, tombol aksi tegas (misal: *Simpan*, *Update*, *Batal*, bukan *Tekan tombol ini untuk menyimpan data latihan Anda*).
- **Tipografi Golden Ratio Seragam (Font: `Inter`)**:
  - Display / Judul Layar: ~34px (`.h1`, `text-2xl` / `text-3xl`).
  - Judul Kartu / Metrik: ~21px (`.h2`, `text-md` / `text-lg`).
  - Teks Isi / Label: ~16px (`.h3`, `text-sm`) & Caption / Unit: ~13px (`.caption`, `text-xs`).
  - ❌ DILARANG menggunakan font arbitrary kecil seperti `text-[8px]` atau `text-[10px]`.
- **Warna & Indikator Notifikasi**:
  - Badge notifikasi belum dibaca menggunakan badge **putih bersih** (`bg-white text-blue-600 shadow-md`) untuk kontras tinggi di atas header gelap glassmorphism.

---

## 4. INTEGRITAS AI COACH LOGY
- **No Hallucination**: AI DILARANG keras mengarang angka beban, repetisi, tanggal, atau rekor latihan yang tidak ada di ringkasan data riwayat. Jika data tidak tersedia, katakan dengan jujur dan lugas bahwa data belum tercatat.
- **Fokus Ketat Gym & Kebugaran**: AI bertindak sebagai pelatih fisik profesional. Tolak dengan sopan dan kembalikan ke topik kebugaran jika pengguna mencoba obrolan romantis, roleplay tidak relevan, atau topik di luar olahraga dan nutrisi.
- **Efisiensi Token**: Selalu gunakan ringkasan terstruktur (`summarizeRecentWorkoutLogs`, `summarizeHealthAndRecovery`) dan katalog relevan (`pickRelevantExercises`) agar tidak membuang kuota token konteks.

---

## 5. VERIFIKASI WAJIB SEBELUM SELESAI
1. Jalankan rangkaian unit test lengkap:
   ```bash
   node src/utils/workoutCalc.test.mjs
   node src/utils/historySync.test.mjs
   node src/utils/dashboardCalc.test.mjs
   node src/utils/aiAgentContext.test.mjs
   node scripts/otaManifest.test.mjs
   node src/utils/exerciseKind.test.mjs
   node src/utils/logyNotif.test.mjs
   node src/data/missedDays.test.mjs
   ```
2. Pastikan build bersih tanpa error: `npm run build`.


## 6. STANDARISASI NOTIFIKASI PEMBARUAN (UPDATER ALERT — EKOSISTEM HEXAVERSE)
Sesuai aturan induk `E:\CODING\AGENTS.md` Pasal 12, implementasi `UpdaterAlert.jsx` di Logym merupakan standar emas (Gold Standard) yang wajib dipertahankan:
- **Mode Opsional**: Floating bottom card (`fixed bottom-24 inset-x-4 max-w-sm pointer-events-none` dengan inner `pointer-events-auto`), logo aplikasi berbayang, loncatan versi tabular, release notes, tombol `X`, dan tombol `Update Sekarang`. DILARANG menggunakan background modal gelap yang memblokir layar pada update non-wajib.
- **Mode Wajib (`force`)**: Fullscreen frost modal (`bg-black/80 backdrop-blur-md`), hero logo, judul hero, sunken release notes, dan tombol unduh masif.
- **Fluid 60fps Dynamic Crawler**: Active progress crawler 200ms + fluid frame 30ms agar progres persentase bergerak dinamis.
