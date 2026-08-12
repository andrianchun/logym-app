// Satu perintah rilis: bump versi -> build -> zip OTA -> deploy hosting -> commit -> push.
// Ditulis sebagai script Node (bukan rantai && di package.json) karena rantai shell dan
// $npm_package_version tidak jalan konsisten di PowerShell/cmd.
//
//   npm run release                          -> 0.1.18 -> 0.1.19
//   npm run release minor                    -> 0.1.18 -> 0.2.0
//   npm run release major                    -> 0.1.18 -> 1.0.0
//   npm run release force "Perbaikan kritis" -> update WAJIB, user diblokir sampai memperbarui
//   npm run release apk "Plugin BLE baru"    -> tombol Update mengunduh APK, bukan bundle ZIP
//
// Argumen bebas urutan: patch|minor|major, kata `force`, kata `apk`, dan teks catatan rilis.
//
// `apk` HANYA dipakai kalau ada perubahan di android/ (plugin, permission, SDK, icon). Bundle
// ZIP cuma menukar aset web di dalam APK terpasang — dia tidak bisa menambah permission atau
// plugin native. Jangan lupa salin APK-nya dulu ke public/apk/logym-latest.apk.
import { execSync } from 'child_process';
import fs from 'fs';

const run = (cmd, env) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
const readVersion = () => JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

const BUMPS = ['patch', 'minor', 'major'];
const args = process.argv.slice(2);
const forced = args.includes('force');
const apk = args.includes('apk');
const bump = args.find(a => BUMPS.includes(a)) || 'patch';
// Sisa argumen = catatan rilis. Ditulis apa adanya ke version.json dan tampil di
// kartu/modal update, jadi kalimat lengkap — bukan satu kata asal.
const rest = args.filter(a => a !== 'force' && a !== 'apk' && !BUMPS.includes(a));
if (rest.length > 1) {
  console.error(`Catatan rilis harus satu argumen (pakai tanda kutip): ${rest.join(' | ')}`);
  process.exit(1);
}
const notes = rest[0];
if (notes && !/\s/.test(notes)) {
  console.error(`Catatan rilis "${notes}" cuma satu kata — kelihatan seperti salah ketik.\nPakai: npm run release [patch|minor|major] [force] ["kalimat catatan rilis"]`);
  process.exit(1);
}

// Gagalkan SEBELUM versi dinaikkan dan apa pun ter-deploy: manifest jalur APK menunjuk
// public/apk/logym-latest.apk, jadi kalau file itu tidak ada, tombol Update user cuma
// menghasilkan 404 dan rilisnya jadi jalan buntu.
if (apk && !fs.existsSync('public/apk/logym-latest.apk')) {
  console.error('Jalur APK dipilih tapi public/apk/logym-latest.apk tidak ada.\n' +
    'Build dulu APK-nya lalu salin:\n' +
    '  cp android/app/build/outputs/apk/release/app-release.apk public/apk/logym-latest.apk');
  process.exit(1);
}

const from = readVersion();
run(`npm version ${bump} --no-git-tag-version`);
const version = readVersion(); // WAJIB baca ulang: nilai lama sudah basi setelah bump
console.log(`\nRelease v${from} -> v${version}${forced ? '  [WAJIB — user diblokir sampai update]' : ''}${apk ? '  [jalur APK]' : ''}\n`);

run('npm run build:ota', { OTA_FORCE: forced ? '1' : '0', OTA_NOTES: notes || '', OTA_APK: apk ? '1' : '0' });

// Buang cache unggah Firebase sebelum deploy. Cache ini bikin firebase-tools melewati file
// yang dikira sudah terunggah, dan berkali-kali bikin SELURUH /ota/** raib dari hosting:
// version.json & zip kena rewrite SPA (balik index.html 200, bukan 404), jadi pengecekan
// update di app gagal diam-diam ("Unexpected token '<'") dan APK nyangkut di bundle lama
// selamanya. Kejadian 4x di Logym; hapus cache selalu memperbaikinya. Deploy jadi sedikit
// lebih lama karena semua file diunggah ulang — murah dibanding rilis yang tidak sampai.
fs.rmSync('.firebase', { recursive: true, force: true });
// --project EKSPLISIT: default .firebaserc nunjuk ke "logym-id", tapi domain produksi asli
// (logym.web.app) itu site "logym" di project "hexa-life" — beda project sama sekali. Tanpa
// --project, deploy diam-diam sukses ke logym-id.web.app (situs yang gak dipakai siapa pun)
// dan logym.web.app gak pernah ke-update. Kejadian nyata: rilis v1.0.22 awalnya salah sasaran.
run('firebase deploy --only hosting --project hexa-life');
run('git add -A');
run(`git commit -m "release v${version}"`);
run('git push');

console.log(`\nv${version} live. PWA dapat kartu update, APK dapat OTA saat dibuka lagi.`);
