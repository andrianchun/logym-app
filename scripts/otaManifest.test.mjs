// Cek bentuk manifest OTA. Jalankan: node scripts/otaManifest.test.mjs
// Kalau ini salah, tombol Update tidak error — dia memilih cara update yang keliru dan user
// nyangkut di versi lama tanpa pesan apa pun.
import assert from 'node:assert/strict';
import { buildManifest, APK_URL } from './otaManifest.js';

const zip = buildManifest('1.1.19');
const apk = buildManifest('1.1.19', { apk: true });

// 1. Default = jalur ZIP: dipasang Capgo di dalam aplikasi, tanpa install.
assert.equal(zip.ota_url, 'https://logym.web.app/ota/update_1119.zip');
assert.equal(zip.is_apk, undefined); // App.jsx: is_apk menyembunyikan update dari PWA
assert.equal(zip.is_forced, false);
assert.equal(zip.release_notes, 'Pembaruan v1.1.19');

// 2. Jalur APK: menunjuk hosting sendiri, bukan Google Drive (Drive menyajikan halaman
//    peringatan virus-scan, bukan file — lihat RELEASE_PROTOCOL.md).
assert.equal(apk.ota_url, APK_URL);
assert.equal(apk.is_apk, true);
assert.ok(!APK_URL.includes('drive.google'));

// 3. INVARIAN UTAMA: App.jsx memilih cara update dari akhiran '.zip' saja, sementara is_apk
//    dipakai untuk menyembunyikan update dari PWA. Dua penanda itu wajib sejalan — kalau
//    tidak, aplikasi mencoba memasang APK sebagai bundle web (atau sebaliknya).
for (const m of [zip, apk]) {
  assert.equal(m.ota_url.endsWith('.zip'), m.is_apk !== true,
    `ota_url dan is_apk tidak sejalan: ${JSON.stringify(m)}`);
}

// 4. force & catatan rilis diteruskan apa adanya ke kartu update.
const forced = buildManifest('2.0.0', { forced: true, notes: 'Perbaikan kritis' });
assert.equal(forced.is_forced, true);
assert.equal(forced.release_notes, 'Perbaikan kritis');
assert.equal(forced.ota_url, 'https://logym.web.app/ota/update_200.zip');

console.log('otaManifest: semua cek lolos');
