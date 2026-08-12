// Buang folder yang cuma untuk hosting web dari aset yang dibundel ke APK.
//
// `cap sync` menyalin SELURUH isi dist/ ke android/app/src/main/assets/public/. Dua folder di
// sana tidak ada gunanya di dalam APK dan besarnya keterlaluan:
//   ota/  — bundle ZIP update (±20 MB/versi, 3 versi disimpan)
//   apk/  — APK rilis itu sendiri (±28 MB) — tanpa ini APK berisi salinan dirinya sendiri
// Keduanya diunduh dari logym.web.app saat dibutuhkan, tidak pernah dibaca dari aset lokal.
import fs from 'fs';
import path from 'path';

const base = 'android/app/src/main/assets/public';
for (const dir of ['ota', 'apk']) {
  const target = path.join(base, dir);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`strip-android-assets: ${target} dibuang`);
  }
}
