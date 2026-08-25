const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const binDir = path.resolve(__dirname, 'bin');
const ytdlp = path.join(binDir, 'yt-dlp.exe');
const targetFile = path.resolve(__dirname, '../public/exercise-assets/edb-Cable_Crunch.mp4');
const tempVideo = path.join(binDir, 'temp_raw.mp4');

console.log('1. Downloading best video stream...');
execFileSync(ytdlp, [
  '-f', 'bestvideo[height<=720]/bestvideo/best',
  '-o', tempVideo,
  '--force-overwrites',
  '--no-playlist',
  'https://youtu.be/K2m0jj6RfYg'
], { stdio: 'inherit' });

console.log('2. Remuxing with system ffmpeg...');
execFileSync('ffmpeg', [
  '-y',
  '-i', tempVideo,
  '-c:v', 'copy',
  '-an',
  '-movflags', '+faststart',
  targetFile
], { stdio: 'inherit' });

console.log('SUCCESS! File created:', targetFile, 'size:', fs.statSync(targetFile).size);
if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);
