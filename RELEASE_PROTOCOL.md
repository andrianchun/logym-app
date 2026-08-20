# Logym App Release Protocol

Panduan ini ditujukan untuk AI Assistant (seperti Cursor, Claude Code, atau Antigravity) saat pengguna meminta untuk "merilis" atau "membuat versi rilis" aplikasi Logym.

## Pilih jalur rilis dulu

Ada dua jalur, dan **hampir selalu jalur A yang benar.** Tanyakan satu hal: apakah ada perubahan di `android/` (plugin native baru, permission, SDK, icon/splash)?

| | Jalur A — OTA ZIP | Jalur B — APK |
|---|---|---|
| Kapan | Perubahan hanya React/JS/CSS | Ada perubahan native di `android/` |
| Caranya | `npm run release` → deploy hosting | Build APK, bagikan, user pasang manual |
| Yang diunduh user | Bundle web ±20 MB, di dalam aplikasi | APK ±28 MB, lewat browser |
| Progress bar | Ada (Capgo `download` listener) | Tidak ada |

Jalur A pakai [`scripts/build-ota.js`](scripts/build-ota.js) dan Capgo Updater — sudah otomatis dan sudah terbukti jalan. Jalur B dikerjakan manual dan rawan salah. Kalau ragu, pilih A.

### Aturan yang tidak boleh dilanggar (semuanya pernah bikin rilis gagal)

1. **`dist/ota/version.json` hanya boleh dihasilkan oleh `npm run build:ota`.** Jangan pernah membuat `public/ota/version.json` — Vite menyalin `public/` ke `dist/`, jadi file itu akan menimpa manifest yang benar dan yang ter-deploy adalah konfigurasi salah. File tersebut sudah dihapus, biarkan begitu.
2. **Deploy hosting selalu lewat `npm run build:ota`, jangan `npm run build` polos.** `npm run build` tidak membuat zip dan tidak menulis manifest, hasilnya manifest lama atau hilang.
3. **Naikkan `package.json` SEBELUM build apa pun.** `__APP_VERSION__` di-bake saat build ([vite.config.js](vite.config.js)); updater membandingkan angka itu, bukan `versionName` di gradle. Kalau build jalan duluan, aplikasi melapor versi lama selamanya dan updater akan menawarkan update yang sama berulang-ulang (kejadian di 1.1.18).
4. **Aset di `android/app/src/main/res/` TIDAK ikut OTA.** Bundle OTA cuma berisi hasil `vite build` (folder `dist/`). Berkas seperti `res/raw/timer_end.wav` — alarm istirahat yang dibunyikan service native saat aplikasi di-minimize — hanya berganti lewat APK baru. Gejalanya membingungkan: di dalam aplikasi alarmnya sudah versi baru (dari `public/timer-end.wav`), tapi begitu di-minimize yang terdengar suara lama. Kalau `scripts/generate-timer-sound.cjs` dijalankan ulang, rilisnya WAJIB lewat Jalur B.
5. **Jangan pakai link `drive.google.com/uc?export=download` untuk APK.** Drive selalu menyajikan halaman peringatan virus-scan HTML 2,5 KB, bukan file-nya. Kalau memang harus lewat Drive, pakai bentuk `https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t`.

---

## Jalur A — Rilis OTA ZIP (default)

```bash
npm run release force "Perbaikan bug X dan Y"
```
Satu perintah ini sudah mencakup semuanya: bump versi → build → zip → manifest → deploy hosting → commit → push. Tanpa kata `force`, kartu update bisa ditutup user. Verifikasi setelahnya:
```bash
curl -s https://logym.web.app/ota/version.json
```

---

## Jalur B — Rilis APK (hanya kalau ada perubahan native)

Jalankan prosedur berikut secara berurutan:

### 1. Update Versi Aplikasi (Sangat Penting!)
Untuk menghindari masalah cache (di mana aplikasi mengabaikan update karena menganggap versi native belum berubah), Anda **WAJIB** menaikkan versi di 2 tempat berbeda:
1. **Di Web**: Buka `package.json` dan naikkan `version` (misalnya dari `1.1.16` ke `1.1.17`).
2. **Di Native Android**: Buka file `android/app/build.gradle`. Cari blok `defaultConfig` lalu:
   - Naikkan angka `versionCode` +1 (misal dari `1` menjadi `2`, dst. Ini angka bulat, tidak boleh desimal).
   - Samakan `versionName` dengan versi di `package.json` (misalnya `"1.1.17"`).

*(Catatan: Pastikan konstanta `__APP_VERSION__` di `vite.config.js` tersinkronisasi jika perlu).*

### 2. Build APK (Native Android)
Urutannya penting — `sync:android` membekukan versi yang sedang ada di `package.json` ke dalam APK:
```bash
npm run sync:android
cd android && ./gradlew assembleRelease
```
*(Catatan: Jika pengguna memiliki konfigurasi Keystore khusus, pastikan APK yang dihasilkan adalah Signed APK).*

Verifikasi versi yang benar-benar terbungkus sebelum dibagikan:
```bash
unzip -p android/app/build/outputs/apk/release/app-release.apk assets/public/assets/index-*.js | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1
```

### 3. Salin APK ke hosting
Jangan pakai Google Drive. Drive selalu menyajikan halaman peringatan virus-scan untuk APK, jadi yang terunduh user adalah HTML 2,5 KB — bukan aplikasi.
```bash
cp android/app/build/outputs/apk/release/app-release.apk public/apk/logym-latest.apk
```
Link publiknya `https://logym.web.app/apk/logym-latest.apk` — permanen, ditimpa tiap rilis, tidak perlu unggah manual. File `.apk` sengaja tidak di-commit (lihat `.gitignore`) supaya repo tidak bengkak 28 MB tiap rilis.

### 4. Rilis dengan jalur APK
```bash
npm run release force apk "Menambah izin Health Connect"
```
Kata `apk` membuat manifest menunjuk APK di hosting, bukan bundle ZIP, sehingga tombol Update di aplikasi mengunduh APK dan memicu dialog install Android. Script akan berhenti lebih awal kalau `public/apk/logym-latest.apk` belum ada.

Verifikasi setelah deploy:
```bash
curl -s https://logym.web.app/ota/version.json
curl -sIL https://logym.web.app/apk/logym-latest.apk | grep -i "content-type"
```
Manifest harus memuat `"is_apk": true`, dan APK harus tayang sebagai `application/vnd.android.package-archive`. Kalau yang keluar `text/html`, berarti kena rewrite SPA — periksa `firebase.json`.

> `is_apk` dan akhiran `ota_url` wajib sejalan: [App.jsx](src/App.jsx) memilih cara update **hanya** dari akhiran `.zip`. Invarian ini dikunci oleh `node scripts/otaManifest.test.mjs`.

### 5. Commit & Push ke GitHub
`npm run release` sudah otomatis `git add -A`, commit `release vX.Y.Z`, dan `git push`. Kalau rilis dikerjakan manual, lakukan sendiri:
```bash
git add -A
git commit -m "release vX.Y.Z"
git push origin main
```

### 6. Konfirmasi Selesai
Beri tahu pengguna bahwa proses rilis telah selesai.

---

## Batas yang perlu diketahui soal "update seamless"

Untuk perubahan JS/CSS (mayoritas rilis), jalur A **sudah** seamless: user menekan Update, bundle terunduh di dalam aplikasi dengan progress bar, aplikasi memuat ulang sendiri. Tidak ada instalasi, tidak ada Drive.

Untuk APK, Android **tidak mengizinkan** aplikasi biasa memasang APK secara diam-diam. Sebagus apa pun alurnya, sistem akan selalu memunculkan dialog konfirmasi "Install". Yang bisa dihilangkan cuma langkah manualnya: unduh via link hosting sendiri, lalu picu installer lewat `REQUEST_INSTALL_PACKAGES` + FileProvider. Itu pekerjaan native tambahan — jangan dikerjakan sampai rilis native memang jadi sering.
