const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.resolve('scripts/bin');
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
const zipPath = path.join(binDir, 'ffmpeg.zip');

const download = (url) => {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      download(res.headers.location);
      return;
    }
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(zipPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('Downloaded ffmpeg zip. Extracting with powershell...');
          const zipFwd = zipPath.replace(/\\/g, '/');
          const tmpFwd = path.join(binDir, 'tmp_ff').replace(/\\/g, '/');
          execSync(`powershell -command "Expand-Archive -Path '${zipFwd}' -DestinationPath '${tmpFwd}' -Force"`);
          
          const findAndMove = (dir) => {
            const files = fs.readdirSync(dir);
            for (const f of files) {
              const full = path.join(dir, f);
              if (fs.statSync(full).isDirectory()) {
                findAndMove(full);
              } else if (f.toLowerCase() === 'ffmpeg.exe') {
                fs.copyFileSync(full, path.join(binDir, 'ffmpeg.exe'));
                console.log('Successfully placed ffmpeg.exe!');
              }
            }
          };
          findAndMove(path.join(binDir, 'tmp_ff'));
          fs.rmSync(path.join(binDir, 'tmp_ff'), { recursive: true, force: true });
          fs.unlinkSync(zipPath);
          console.log('Testing ffmpeg.exe version:');
          console.log(execSync('scripts\\bin\\ffmpeg.exe -version').toString().split('\n')[0]);
        });
      });
    } else {
      console.log('Download failed:', res.statusCode);
    }
  }).on('error', err => console.log('Err:', err));
};

console.log('Downloading ffmpeg release...');
download('https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip');
