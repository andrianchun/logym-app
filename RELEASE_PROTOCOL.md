# Logym App Release Protocol

Panduan ini ditujukan untuk AI Assistant (seperti Cursor, Claude Code, atau Antigravity) saat pengguna meminta untuk "merilis" atau "membuat versi rilis" aplikasi Logym.

## Langkah-Langkah Rilis (Force Update APK)

Setiap kali pengguna ingin merilis APK baru (terutama jika ada perubahan plugin native, Android SDK, atau icon/splash screen) dan mewajibkan pengguna lama untuk memperbarui (*Force Update*), jalankan prosedur berikut secara berurutan:

*(Catatan: Jika hanya mengubah UI atau logika React/JS/CSS, cukup deploy ke Firebase Hosting tanpa perlu build APK, karena fitur PWA akan otomatis mengupdate aset web.)*

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

### 3. Upload ke Google Drive (Otomatis)
Alih-alih meminta pengguna mengunggah manual, AI harus langsung menyalin APK yang sudah di-build ke folder Google Drive lokal pengguna:
```bash
Copy-Item -Path "android\app\build\outputs\apk\release\app-release.apk" -Destination "G:\My Drive\CODING\APK Release\logym\logym-beta-latest.apk" -Force
```
*(Catatan: Jika file ini pertama kali dibuat, ingatkan pengguna untuk membagikan file `logym-beta-latest.apk` di Google Drive dan mendapatkan link Direct Download-nya ke dalam OTA).*

### 4. Konversi Link Google Drive (Jika Pertama Kali)
Jika ini adalah pertama kalinya file dibagikan, AI **wajib** meminta link dari pengguna dan mengubahnya menjadi link *direct download*:
```text
https://drive.google.com/uc?export=download&id=ID_FILE
```
*(Jika file sudah pernah dibagikan, Google Drive akan mempertahankan ID file yang sama, sehingga link OTA lama tetap akan berfungsi dan step ini bisa dilewati).*

### 5. Update Konfigurasi OTA
Aplikasi menggunakan file `public/ota/version.json` untuk mendeteksi update secara langsung.
Jika direktori atau file tersebut belum ada, buatlah.
Update isi file tersebut dengan format berikut:
```json
{
  "ota_version": "1.2.0",
  "ota_url": "LINK_DIRECT_DOWNLOAD_YANG_SUDAH_DIKONVERSI",
  "is_forced": true,
  "is_apk": true,
  "release_notes": "Tuliskan ringkasan fitur baru atau perbaikan di sini (tanyakan ke pengguna)."
}
```
*Pastikan `ota_version` sama dengan versi di `package.json`.*

### 6. Deploy OTA ke Firebase
Untuk membuat aplikasi langsung mendeteksi update ini, konfigurasi OTA tersebut harus dinaikkan ke Firebase Hosting.
Jalankan perintah berikut di root folder:
```bash
npm run build
firebase deploy --only hosting
```

### 7. Konfirmasi Selesai
Beri tahu pengguna bahwa proses rilis telah selesai. Saat pengguna lama membuka aplikasi Logym, mereka akan langsung mendapatkan layar **Update Penting** yang tidak bisa ditutup, dan ketika menekan "Update Sekarang", sistem akan otomatis mengunduh APK baru dari Google Drive tersebut.
