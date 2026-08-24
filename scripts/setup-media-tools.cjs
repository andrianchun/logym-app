const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.resolve('scripts/bin');
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

const zipPath = path.join(binDir, 'ffmpeg.zip');

const request = (url) => {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      request(res.headers.location);
      return;
    }
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(zipPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('ffmpeg zip downloaded. Extracting...');
          try {
            execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}/tmp' -Force"`);
            // move ffmpeg.exe and ffprobe.exe
            const findAndMove = (dir) => {
              const files = fs.readdirSync(dir);
              for (const f of files) {
                const full = path.join(dir, f);
                if (fs.statSync(full).isDirectory()) {
                  findAndMove(full);
                } else if (f.toLowerCase() === 'ffmpeg.exe' || f.toLowerCase() === 'ffprobe.exe') {
                  fs.copyFileSync(full, path.join(binDir, f));
                  console.log(`Copied ${f} to scripts/bin/`);
                }
              }
            };
            findAndMove(path.join(binDir, 'tmp'));
            fs.rmSync(path.join(binDir, 'tmp'), { recursive: true, force: true });
            fs.unlinkSync(zipPath);
            console.log('FFmpeg setup complete!');
          } catch(e) {
            console.log('Extract error:', e.message);
          }
        });
      });
    } else {
      console.log('Download failed:', res.statusCode);
    }
  }).on('error', err => console.log('Err:', err));
};

console.log('Downloading ffmpeg...');
request('https://github.com/GyanD/codexffmpeg/releases/download/2026-08-24-git-341e97669d/ffmpeg-2026-08-24-git-341e97669d-essentials_build.zip');
