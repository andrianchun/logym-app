import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';
import { buildManifest, zipNameFor } from './otaManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');
const otaPath = path.resolve(__dirname, '../dist/ota');
// vite build mengosongkan dist/ tiap rilis, jadi zip lama ikut hilang dan client yang masih
// menunjuk URL lama dapat HTML (kena rewrite SPA) — bukan 404 — lalu gagal unzip.
// Arsip di luar dist supaya selamat, dan beberapa versi terakhir ikut ter-deploy lagi.
const archivePath = path.resolve(__dirname, '../.ota-archive');
const KEEP = 3;

// Versi selalu diambil dari package.json — JANGAN oper versi lewat argumen.
// Bump versi dilakukan otomatis oleh scripts/release.js.
const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')).version;
const zipName = zipNameFor(version);
const outputPath = path.join(otaPath, zipName);

console.log(`Building OTA ZIP: ${zipName}`);

if (!fs.existsSync(distPath)) {
  console.error('dist folder does not exist! Please run build first.');
  process.exit(1);
}

if (!fs.existsSync(otaPath)) {
  fs.mkdirSync(otaPath, { recursive: true });
}

const output = fs.createWriteStream(outputPath);
const archive = new ZipArchive({
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');

  // Simpan ke arsip, buang yang paling tua, lalu kembalikan sisanya ke dist/ota
  // supaya ikut ter-deploy dan URL rilis sebelumnya tetap hidup.
  fs.mkdirSync(archivePath, { recursive: true });
  fs.copyFileSync(outputPath, path.join(archivePath, zipName));
  const kept = fs.readdirSync(archivePath)
    .filter(f => f.endsWith('.zip'))
    .sort((a, b) => fs.statSync(path.join(archivePath, b)).mtimeMs - fs.statSync(path.join(archivePath, a)).mtimeMs);
  kept.slice(KEEP).forEach(f => fs.rmSync(path.join(archivePath, f)));
  kept.slice(0, KEEP).forEach(f => fs.copyFileSync(path.join(archivePath, f), path.join(otaPath, f)));

  // version.json ditulis SETELAH zip selesai, supaya manifest tidak pernah menunjuk zip yang gagal dibuat.
  // OTA_FORCE/OTA_NOTES/OTA_APK di-set oleh scripts/release.js (`npm run release force apk "catatan"`).
  // OTA_APK=1 mengarahkan tombol Update ke APK di hosting, bukan bundle ZIP — dipakai HANYA saat
  // ada perubahan native di android/, karena ZIP tidak bisa menambah permission/plugin.
  const apk = process.env.OTA_APK === '1';
  fs.writeFileSync(path.join(otaPath, 'version.json'), JSON.stringify(
    buildManifest(version, { apk, forced: process.env.OTA_FORCE === '1', notes: process.env.OTA_NOTES }),
    null, 2));
  console.log(`OTA siap (v${version})${apk ? ' — jalur APK' : ''}. Zip ter-deploy: ${kept.slice(0, KEEP).join(', ')}`);
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Append files from the dist directory, putting its contents at the root of archive.
// - 'ota/**' wajib di-ignore supaya zip tidak me-zip dirinya sendiri.
// - 'apk/**' juga: APK rilis ±28 MB numpang di hosting untuk diunduh manual, tidak ada
//   gunanya di dalam bundle web. Tanpa ini zip membengkak 19 MB -> 47 MB dan setiap user
//   menanggung unduhan APK yang tidak pernah dipakai.
// - service worker & manifest PWA dibuang: tidak berguna di WebView native, dan kalau
//   sampai ter-register di dalam WebView, SW itu akan menyajikan index.html lamanya
//   sendiri dan menutupi bundle yang baru dipasang Capgo.
archive.glob('**/*', {
  cwd: distPath,
  ignore: ['ota/**', 'apk/**', 'sw.js', 'workbox-*.js', 'registerSW.js', 'manifest.webmanifest']
});

archive.finalize();
