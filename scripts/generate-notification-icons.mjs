import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateNotificationIcons() {
  const sourcePath = 'public/logo-white.webp';
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file ${sourcePath} not found!`);
  }

  console.log('Extracting emblem from', sourcePath);

  // 1. Extract emblem from public/logo-white.webp (excluding "LOGYM" text below)
  // Bounding box of emblem: left 240, top 191, width 1534, height 1242
  const emblemRaw = await sharp(sourcePath)
    .extract({ left: 240, top: 191, width: 1534, height: 1242 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Ensure all visible pixels have pure white RGB (255, 255, 255) with antialiased alpha
  for (let i = 0; i < emblemRaw.data.length; i += 4) {
    emblemRaw.data[i] = 255;     // R
    emblemRaw.data[i + 1] = 255; // G
    emblemRaw.data[i + 2] = 255; // B
    // Alpha remains untouched
  }

  const whiteEmblem = sharp(emblemRaw.data, {
    raw: {
      width: emblemRaw.info.width,
      height: emblemRaw.info.height,
      channels: 4
    }
  });

  // Prepare destination configs
  const targets = [
    { dir: 'android/app/src/main/res/drawable-mdpi', size: 24, maxContent: 20 },
    { dir: 'android/app/src/main/res/drawable-hdpi', size: 36, maxContent: 30 },
    { dir: 'android/app/src/main/res/drawable-xhdpi', size: 48, maxContent: 40 },
    { dir: 'android/app/src/main/res/drawable-xxhdpi', size: 72, maxContent: 60 },
    { dir: 'android/app/src/main/res/drawable-xxxhdpi', size: 96, maxContent: 80 },
    { dir: 'android/app/src/main/res/drawable', size: 96, maxContent: 80 },
  ];

  for (const target of targets) {
    if (!fs.existsSync(target.dir)) {
      fs.mkdirSync(target.dir, { recursive: true });
    }

    const resizedEmblemBuffer = await whiteEmblem
      .clone()
      .resize(target.maxContent, target.maxContent, { fit: 'inside' })
      .png()
      .toBuffer();

    const destPath = path.join(target.dir, 'ic_stat_logym.png');

    await sharp({
      create: {
        width: target.size,
        height: target.size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resizedEmblemBuffer, gravity: 'center' }])
    .png()
    .toFile(destPath);

    console.log(`Generated: ${destPath} (${target.size}x${target.size})`);
  }

  console.log('Notification icons generation complete!');
}

generateNotificationIcons().catch(err => {
  console.error('Failed to generate notification icons:', err);
  process.exit(1);
});
