# LOGYM Agent Guidelines & Audit Protocol

Setiap kali pengguna meminta untuk **"audit"**, **"analisis bug"**, **"debug"**, atau menambahkan/memodifikasi fitur latihan dan sinkronisasi di aplikasi Logym:

1. **BACA DOKUMEN ARSITEKTUR WAJIB**:
   - Buka dan baca [`AUDIT.md`](./AUDIT.md) dan [`RELEASE_PROTOCOL.md`](./RELEASE_PROTOCOL.md) sebelum memulai pengerjaan.
   - Pahami 5 Pilar Enterprise di `AUDIT.md` (SSOT Engine, Zero-Trust Gateway, State Invariants, Regression Tests, dan 5-Layer Impact Matrix).

2. **ATURAN MUTLAK KODE**:
   - **Firestore Gateway**: Seluruh payload yang menuju Firestore (`setDoc`/`updateDoc`) **wajib** melewati `cleanFirestoreData()` untuk membuang nilai `undefined` rekursif.
   - **Log Key Resolution**: Seluruh komponen live (Floating Bar, Immersive Workout) dan riwayat (Calendar) wajib mendukung format kunci majemuk `${ex.id}-${workoutId}`.
   - **Monotonic Duration**: Durasi sesi yang sudah selesai tidak boleh ditimpa menjadi `00:00`. Gunakan `calcFallbackDurationSecs` jika stempel waktu hilang/berbenturan.
   - **Modal Scroll Lock & History**: Semua modal wajib memakai `document.body.style.overflow = 'hidden'`, `overscroll-contain`, `touch-none`, dan tombol tutup memiliki `data-close-modal="true"`. Iframe YouTube wajib ber-`src` statis konstan (play/pause via `postMessage`).

3. **VERIFIKASI WAJIB**:
   - Jalankan unit tests sebelum menyelesaikan tugas:
     ```bash
     node src/utils/workoutCalc.test.mjs
     node src/utils/historySync.test.mjs
     node src/utils/dashboardCalc.test.mjs
     node src/utils/aiAgentContext.test.mjs
     node scripts/otaManifest.test.mjs
     ```
   - Pastikan build bersih: `npm run build`.
