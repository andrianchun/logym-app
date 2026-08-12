// Bentuk manifest OTA. Dipisah dari build-ota.js supaya bisa diuji tanpa menjalankan build.
//
// PENTING — App.jsx menentukan cara update HANYA dari akhiran ota_url (lihat handleUpdateApp):
// URL '.zip' dipasang Capgo di dalam aplikasi, selain itu dibuka di browser sebagai unduhan
// APK. Jadi is_apk dan bentuk ota_url wajib sejalan. Kalau melenceng, tombol Update mencoba
// memasang APK sebagai bundle web — gagal, dan user nyangkut di versi lama.
export const APK_URL = 'https://logym.web.app/apk/logym-latest.apk';

export const zipNameFor = (version) => `update_${version.replace(/\./g, '')}.zip`;

export function buildManifest(version, { apk = false, forced = false, notes = '' } = {}) {
  const manifest = {
    ota_version: version,
    // Domain produksi asli itu logym.web.app (project hexa-life) — logym-id.web.app project
    // beda yang gak pernah dipakai siapa pun, APK yang download dari situ selalu 404.
    ota_url: apk ? APK_URL : `https://logym.web.app/ota/${zipNameFor(version)}`,
    is_forced: forced,
    release_notes: notes || `Pembaruan v${version}`,
  };
  if (apk) manifest.is_apk = true;
  return manifest;
}
