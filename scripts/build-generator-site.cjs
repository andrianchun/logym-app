const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildGeneratorSite() {
  const outDir = path.join(__dirname, '../dist/generator-site');
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Building standalone Generator site at:', outDir);

  // 1. Copy generator files to root of site
  const genDir = path.join(__dirname, '../public/generator');
  if (fs.existsSync(genDir)) {
    copyDirRecursive(genDir, outDir);
  }

  // 2. Copy exercise-assets
  const assetsDir = path.join(__dirname, '../public/exercise-assets');
  if (fs.existsSync(assetsDir)) {
    copyDirRecursive(assetsDir, path.join(outDir, 'exercise-assets'));
  }

  // 3. Copy coach images & db
  const extras = [
    'coach-front.webp',
    'coach-back.webp',
    'coach-praise.webp',
    'coach-push.webp',
    'exercisedb.json',
    'favicon.ico'
  ];

  extras.forEach(file => {
    const src = path.join(__dirname, '../public', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(outDir, file));
    }
  });

  console.log('🎉 Generator site built successfully in dist/generator-site!');
}

buildGeneratorSite();
