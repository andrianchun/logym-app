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
4. **Jangan pakai link `drive.google.com/uc?export=download` untuk APK.** Drive selalu menyajikan halaman peringatan virus-scan HTML 2,5 KB, bukan file-nya. Kalau memang harus lewat Drive, pakai bentuk `https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t`.

---

## Jalur A — Rilis OTA ZIP (default)

```bash
npm run release            # bump versi + build + zip + manifest
firebase deploy --only hosting
curl -s https://logym.web.app/ota/version.json
```
Untuk update wajib beserta catatan rilis: `npm run release force "catatan rilis"`. Lalu commit & push (lihat bagian Commit di bawah).

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
Instruksikan pengguna atau jalankan perintah berikut untuk mem-build APK baru:
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```
*(Catatan: Jika pengguna memiliki konfigurasi Keystore khusus, pastikan APK yang dihasilkan adalah Signed APK).*

### 3. Bagikan APK lewat Firebase Hosting, bukan Google Drive
Jangan pakai Google Drive. Drive selalu menyajikan halaman peringatan virus-scan untuk APK, jadi yang terunduh user adalah HTML 2,5 KB — bukan aplikasi. Taruh APK di hosting yang sudah kita pakai:
```bash
cp android/app/build/outputs/apk/release/app-release.apk public/apk/logym-latest.apk
```
Link publiknya jadi `https://logym.web.app/apk/logym-latest.apk`, permanen dan tidak perlu unggah manual ke mana pun. Verifikasi setelah deploy:
```bash
curl -sIL https://logym.web.app/apk/logym-latest.apk | grep -i "content-type\|content-length"
```
Harus `application/vnd.android.package-archive` (atau `octet-stream`) dengan ukuran ±28 MB. Kalau yang keluar `text/html`, berarti kena rewrite SPA — periksa `firebase.json`.

### 4. Manifest OTA
Manifest **selalu** dihasilkan `npm run build:ota`, tidak ditulis tangan (lihat aturan di atas). Untuk rilis APK, jalankan `npm run release force "catatan rilis"` seperti biasa, lalu ubah `ota_url` di `dist/ota/version.json` ke link APK di atas dan tambahkan `"is_apk": true` sebelum deploy — atau lebih aman, biarkan jalur ZIP yang menangani bagian web dan bagikan link APK secara terpisah ke user yang perlu.

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
