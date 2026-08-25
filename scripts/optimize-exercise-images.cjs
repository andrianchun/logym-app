const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, '..', 'public', 'exercise-assets');
const files = fs.readdirSync(dir);

console.log('Optimizing exercise-assets images to true WebP...');

for (const f of files) {
  const full = path.join(dir, f);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) continue;
  
  const ext = path.extname(f).toLowerCase();
  if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
    const baseName = path.basename(f, ext);
    const targetWebp = path.join(dir, `${baseName}.webp`);
    const targetPng = path.join(dir, `${baseName}.png`);
    const tempWebp = path.join(dir, `temp_${baseName}.webp`);
    
    console.log(`Converting ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB) to true WebP...`);
    try {
      // Convert to high-quality compressed WebP (q=85)
      execSync(`ffmpeg -y -i "${full}" -c:v libwebp -lossless 0 -q:v 85 -preset picture "${tempWebp}"`, { stdio: 'pipe' });
      
      const newStat = fs.statSync(tempWebp);
      console.log(`✓ Generated ${baseName}.webp: ${(newStat.size / 1024).toFixed(1)} KB`);
      
      // If original was .png, keep .png as fallback or remove if now .webp
      if (fs.existsSync(targetWebp)) fs.unlinkSync(targetWebp);
      fs.renameSync(tempWebp, targetWebp);
      
      // If there was a .png file that was duplicate, update or keep
    } catch (err) {
      console.error(`✗ Error converting ${f}:`, err.message);
      if (fs.existsSync(tempWebp)) fs.unlinkSync(tempWebp);
    }
  }
}

console.log('Finished optimizing all images to true WebP!');
