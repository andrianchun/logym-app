const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'exercise-assets');
const files = fs.readdirSync(dir);

console.log('Auditing images in', dir);
for (const f of files) {
  const full = path.join(dir, f);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) continue;
  
  const ext = path.extname(f).toLowerCase();
  if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
    const buf = Buffer.alloc(16);
    const fd = fs.openSync(full, 'r');
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    
    const hex = buf.toString('hex');
    const isPng = hex.startsWith('89504e47');
    const isWebp = hex.includes('57454250');
    const isJpg = hex.startsWith('ffd8ff');
    
    const realType = isPng ? 'png' : isWebp ? 'webp' : isJpg ? 'jpg' : 'unknown';
    const mismatch = (ext === '.webp' && realType !== 'webp') || (ext === '.png' && realType !== 'png') || (ext === '.jpg' && realType !== 'jpg');
    
    console.log(f, 'size:', (stat.size / 1024 / 1024).toFixed(2) + 'MB', 'ext:', ext, 'realType:', realType, mismatch ? '⚠️ MISMATCH' : '✓ OK');
  }
}
