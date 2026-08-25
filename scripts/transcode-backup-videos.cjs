const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dirs = [
  path.join(__dirname, '..', 'public', 'exercise-assets', 'youtube-backup'),
  path.join(__dirname, '..', 'public', 'exercise-assets')
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4'));
  console.log(`Checking ${files.length} MP4s in ${dir}...`);

  for (const f of files) {
    const filePath = path.join(dir, f);
    const buf = fs.readFileSync(filePath);
    const str = buf.toString('latin1');
    const isAv1 = str.includes('av01');
    const isVp9 = str.includes('vp09') || str.includes('vp9');

    if (isAv1 || isVp9) {
      const tempPath = path.join(dir, 'temp_' + f);
      console.log(`Transcoding ${f} (AV1/VP9 -> H.264 Baseline)...`);
      try {
        execSync(`ffmpeg -y -i "${filePath}" -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 -preset fast -crf 24 -c:a aac -b:a 128k -movflags +faststart "${tempPath}"`, { stdio: 'pipe' });
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        console.log(`✓ Transcoded successfully: ${f}`);
      } catch (err) {
        console.error(`✗ Failed on ${f}:`, err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    } else {
      console.log(`- Already H.264: ${f}`);
    }
  }
}
console.log('Finished transcoding all videos to universal H.264!');
