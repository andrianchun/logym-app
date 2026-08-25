# LOGYM MASTER ARCHITECTURE, AUDIT & ENGINEERING BLUEPRINT

> **PANDUAN UNTUK AI & DEVELOPER:**
> File ini adalah **Kompas Utama Arsitektur Logym**. Setiap kali pengguna meminta untuk *"audit"*, *"debug"*, atau *"analisis bug"*, AI/IDE **WAJIB membaca dokumen ini terlebih dahulu** untuk memahami cara kerja seluruh subsistem, mematuhi aturan *DOs & DON'Ts*, dan memastikan tidak ada efek samping (*side-effects*) yang merusak bagian lain.

---

## 1. Peta Arsitektur & Alur Data Logym (Data Flow Map)

Aplikasi Logym bekerja dengan 7 subsistem utama yang saling terhubung:

```
                                  ┌───────────────────────────────┐
                                  │      FIRESTORE CLOUD DB       │
                                  │  - logym_users/{uid} (Main)   │
                                  │  - history_years/{year} (Logs)│
                                  └───────────────┬───────────────┘
                                                  ▲
                                                  │ (Zero-Trust Gateway: cleanFirestoreData)
                                                  ▼
┌─────────────────────────────────────────────────┴─────────────────────────────────────────────────┐
│                                       APP.JSX (CORE ENGINE)                                       │
│  - State Management (History, Programs, ExerciseLibrary, Profile, ActiveSession)                  │
│  - Cloud Auto-Save (Debounce 2s + Baseline Fingerprinting)                                        │
│  - Global Timer & Workout Lifecycle Coordinator                                                   │
└───────┬──────────────┬──────────────┬──────────────────┬─────────────────┬────────────────┬───────┘
        │              │              │                  │                 │                │
        ▼              ▼              ▼                  ▼                 ▼                ▼
 ┌─────────────┐┌─────────────┐┌─────────────┐    ┌─────────────┐    ┌─────────────┐ ┌─────────────┐
 │ WORKOUT TAB ││FLOATING BAR ││ IMMERSIVE   │    │CALENDAR TAB │    │PROGRAM/DB   │ │OTA UPDATER  │
 │ & ACTIVE LOG││ (MINI HUD)  ││ WORKOUT HUD │    │ & RIWAYAT   │    │  CATALOG    │ │  (CAPGO)    │
 └──────┬──────┘└──────┬──────┘└──────┬──────┘    └──────┬──────┘    └──────┬──────┘ └──────┬──────┘
        │              │              │                  │                  │               │
        └──────────────┴──────────────┴──────────────────┴──────────────────┴───────────────┘
                                              ▲
                                              │ (Satu Rumus Bersama / SSOT)
                               ┌──────────────┴──────────────┐
                               │     WORKOUTCALC.JS ENGINE   │
                               │ - Live & History Calories   │
                               │ - sessionSpanSeconds & Dur  │
                               │ - Actual Weight & 10RM Calc │
                               └─────────────────────────────┘
```

---

## 2. Metodologi Audit Enterprise: 5 Pilar Anti-Bug

Ketika melakukan investigasi bug atau menambahkan fitur baru, audit dilakukan dengan **5 Standar Wajib**:

### 1. SSOT (Single Source of Truth) — Satu Rumus untuk Semua
* **Prinsip**: Jangan pernah membuat dua rumus kalkulasi berbeda untuk data yang sama.
* **Contoh**: Kalori di Floating Bar, Immersive Workout, dan Kalender semuanya harus menggunakan engine yang sama di `src/utils/workoutCalc.js`.

### 2. Zero-Trust Gateway — Bersihkan Data Sebelum Menyentuh Storage/Cloud
* **Prinsip**: Jangan pernah mengasumsikan data memori bebas dari `undefined` atau format rusak.
* **Contoh**: Semua data yang dikirim ke Firestore (`setDoc`/`updateDoc`) **wajib** disaring lewat `cleanFirestoreData()`.

### 3. Invariant State Machine — Kunci Nilai-Nilai Mutlak
* **Prinsip**: State aplikasi tidak boleh melanggar logika fisik manusia.
* **Contoh**: Sesi yang memiliki 12 set tercentang **mustahil berdurasi 0 menit**. Durasi sesi lama tidak boleh ditimpa menjadi lebih kecil saat menambah sesi baru.

### 4. Automated Regression Testing (`*.test.mjs`)
* **Prinsip**: Setiap bug yang pernah ditemukan dan diperbaiki **wajib dibuatkan unit test otomatis** agar tidak pernah kambuh di rilis mendatang.
* **Jalankan tes kapan saja dengan**:
  ```bash
  node src/utils/workoutCalc.test.mjs
  node src/utils/historySync.test.mjs
  node src/utils/dashboardCalc.test.mjs
  node src/utils/aiAgentContext.test.mjs
  node scripts/otaManifest.test.mjs
  ```

### 5. Cross-Subsystem Impact Matrix (Matriks 5 Layer)
Setiap perubahan pada struktur latihan atau timer wajib lolos verifikasi di 5 layar:
1. **Live Floating Bar**: Stopwatch jalan, kalori bertambah tiap centang set, nama latihan akurat.
2. **Immersive Workout**: Video memutar, kalori & waktu sinkron dengan floating bar.
3. **Program & Database Tab**: Ganti latihan tidak memicu toast error, filter responsif di mobile.
4. **Calendar Tab**: Status (Sedang Berlangsung vs Selesai) akurat, durasi > 0, riwayat tidak tertimpa.
5. **Cloud Sync**: Ikon sinkronisasi hijau, tidak ada error `setDoc`, backup otomatis jalan.

---

## 3. DOs & DON'Ts Mendalam per Komponen

---

### A. Workout Engine, Logging, & Multi-Session

| DOs (Wajib Dilakukan) | DON'Ts (Dilarang Keras) |
|---|---|
| ✅ **Gunakan format kunci log majemuk**: Kunci log set selalu mendukung format `${ex.id}-${workoutId}` dan fallback ke `${ex.id}`. | ❌ **Jangan asumsikan kunci log hanya berupa ID angka (`logs[ex.id]`)**, karena dalam multi-sesi kuncinya adalah `${ex.id}-${workoutId}`. |
| ✅ **Lindungi durasi sesi lama**: Saat menyimpan sesi baru, durasi sesi lain di hari yang sama tidak boleh turun (`Math.max(durationSecs, existingSecs)`). | ❌ **Jangan menimpa `w.duration` dengan `00:00`** hanya karena selisih stempel waktu terbaca 0 detik. |
| ✅ **Gunakan Fallback Fisik Realistis**: Jika user mencentang set secara instan, gunakan `calcFallbackDurationSecs` (minimal 1.5 menit per set yang diselesaikan). | ❌ **Jangan menghapus log latihan sesi lain** saat memfinalisasi satu sesi tertentu (selalu gunakan `splitSessionLogs`). |

---

### B. Kalkulasi Kalori & Durasi (`workoutCalc.js`)

| DOs (Wajib Dilakukan) | DON'Ts (Dilarang Keras) |
|---|---|
| ✅ **Hitung kalori live = Baseline Waktu + Tambahan Intensitas Set**: Setiap set yang dicentang langsung menambah kalori live secara *real-time*. | ❌ **Jangan hitung kalori live hanya dari durasi jalan santai**, set-set yang sudah selesai wajib menyumbang kalori ekstra. |
| ✅ **Sinkronkan angka live dengan angka riwayat**: Gunakan konstanta MET yang seragam (`WORKOUT_MET = 6.0`, baseline `2.5 MET`, TUT `4 detik/rep`). | ❌ **Jangan biarkan Floating Bar menampilkan 4 kcal sementara Kalender menampilkan 150 kcal** untuk sesi yang sama. |
| ✅ **Deteksi jenis latihan (Kardio vs Beban)**: Set kardio/waktu menghitung jarak/durasi, set beban menghitung repetisi & beban aktual alat. | ❌ **Jangan hitung beban dasar alat dua kali** (selalu gunakan `getSetActualWeight`). |

---

### C. Cloud Sync, Firestore, & Local Storage (`historySync.js` & `App.jsx`)

| DOs (Wajib Dilakukan) | DON'Ts (Dilarang Keras) |
|---|---|
| ✅ **Sanitasi rekursif dengan `cleanFirestoreData`**: Hapus semua nilai `undefined` di semua tingkatan objek/array sebelum dikirim ke `setDoc`/`updateDoc`. | ❌ **Jangan kirim objek mentah JavaScript yang memuat `undefined` ke Firestore** — Firestore akan langsung crash! |
| ✅ **Gunakan Debounce Ekor (2 detik)**: Berikan jeda 2 detik setelah perubahan terakhir selesai sebelum mengirim data ke cloud. | ❌ **Jangan gunakan throttle kaku** yang membuang centang set terakhir pengguna saat aplikasi ditutup. |
| ✅ **Gunakan Sidik Jari Baseline (`dayFingerprint`)**: Bandingkan hash data lokal dengan data server untuk mencegah penimpaan data antar HP/perangkat. | ❌ **Jangan geser baseline sebelum tulisan cloud sukses**, karena jika gagal offline, data bisa tertimpa versi server yang lebih usang. |

---

### D. Modal, Dialog, Navigation, & Video Carousel

| DOs (Wajib Dilakukan) | DON'Ts (Dilarang Keras) |
|---|---|
| ✅ **Kunci Scroll Background**: Saat modal dibuka, terapkan `document.body.style.overflow = 'hidden'`, `touchAction = 'none'`, dan `overscroll-contain`. | ❌ **Jangan biarkan gestur scroll di dalam modal menggerakkan halaman di belakangnya (*scroll chaining*)**. |
| ✅ **Gunakan Iframe YouTube Statis**: Gunakan `src` statis konstan dan kendalikan play/pause lewat `postMessage` (`playVideo` / `pauseVideo`). | ❌ **Jangan ubah `iframe.src` secara dinamis saat swipe carousel**, karena browser akan mencemari *history stack* dan merusak tombol *Back*. |
| ✅ **Pasang `data-close-modal="true"`**: Berikan atribut ini pada tombol tutup modal agar tombol *Back* Android/browser menutup modal secara instan. | ❌ **Jangan gunakan tombol penutup tanpa label yang jelas** sehingga handler popstate global kebingungan mencari elemen penutup. |

---

### E. OTA Updater & Rilis (`build-ota.js` & `release.js`)

| DOs (Wajib Dilakukan) | DON'Ts (Dilarang Keras) |
|---|---|
| ✅ **Kecualikan aset web non-mobile**: Selalu abaikan folder `generator-site/**`, `generator/**`, dan `apk/**` saat membuat paket zip OTA. | ❌ **Jangan sertakan folder generator mandiri ke dalam bundle OTA**, karena akan menggandakan ukuran download dari ~60 MB menjadi 128 MB! |
| ✅ **Tampilkan Status Ekstraksi Transparan**: Saat unduhan mencapai 100%, ubah status menjadi *"Mengekstrak & memasang..."* dengan animasi halus. | ❌ **Jangan biarkan progress bar diam membeku di angka 70% atau 100%** tanpa memberi tahu bahwa aplikasi sedang mengekstrak file ke penyimpanan lokal. |
| ✅ **Rilis selalu lewat `npm run release`**: Script ini otomatis menaikkan versi, mem-build OTA, membersihkan cache Firebase, mendeploy, dan melakukan git push. | ❌ **Jangan buat file `public/ota/version.json` secara manual**, file manifest hanya boleh dibuat otomatis oleh build script. |

---

## 4. Log Insiden Historis & Pelajaran Berharga

### Insiden 1: Firestore `setDoc()` Crash (25 Agustus 2026)
* **Gejala**: Menukar variasi latihan di Tab Program memicu toast merah `Unsupported field value: undefined`.
* **Pelajaran**: Filter `undefined` tingkat atas tidak cukup. Data nested dalam objek latihan dan profil user harus di-sanitize dengan `cleanFirestoreData()`.

### Insiden 2: Durasi Sesi 0 Menit saat Multi-Sesi (25 Agustus 2026)
* **Gejala**: Sesi *Legs and Core* yang sudah berjalan 30 menit durasinya berubah menjadi 0 menit saat sesi *Upper Body* ditambahkan di hari yang sama.
* **Pelajaran**: Finalisasi sesi otomatis tidak boleh mereset durasi sesi yang sudah ada. Jika stempel selisih 0 detik, gunakan batas bawah fisik realistis berdasarkan jumlah set tercentang.

### Insiden 3: Lonjakan Kalori Drastis Saat Resume (25 Agustus 2026)
* **Gejala**: Floating Bar bawah hanya membaca 24 kcal, begitu di-resume/disimpan melonjak jadi 152 kcal.
* **Pelajaran**: Floating Bar mencari set dengan `logs[ex.id]`, sedangkan set disimpan dengan `logs[`${ex.id}-${workoutId}`]`. Kunci majemuk harus selalu didukung oleh kalkulator live.

### Insiden 4: Ukuran Download OTA Membengkak 2x Lipat (25 Agustus 2026)
* **Gejala**: Download update OTA di HP mencapai 128 MB dan sangat lambat.
* **Pelajaran**: Script `build-generator-site.cjs` menyalin video ke `dist/generator-site`, dan `build-ota.js` tidak mengabaikannya, sehingga 60 MB video ter-zip dua kali. Mengabaikan `generator-site/**` langsung memangkas bundle menjadi 66 MB.

---

## 5. Checklist Wajib Sebelum Rilis / Selesai Debugging

- [ ] 1. Apakah semua skenario unit test lolos? (`npm test` / `node src/utils/workoutCalc.test.mjs && node src/utils/historySync.test.mjs`)
- [ ] 2. Apakah build produksi sukses tanpa error? (`npm run build`)
- [ ] 3. Apakah data yang dikirim ke Firestore sudah melewati `cleanFirestoreData`?
- [ ] 4. Apakah Floating Bar, Immersive Mode, dan Kalender menampilkan angka kalori/durasi yang konsisten?
- [ ] 5. Apakah modal baru memiliki proteksi scroll lock (`overscroll-contain touch-none`) dan `data-close-modal="true"`?
- [ ] 6. Apakah ukuran bundle OTA sudah diverifikasi di bawah batas wajar?
