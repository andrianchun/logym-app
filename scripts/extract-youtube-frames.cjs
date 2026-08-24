const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.resolve('scripts/bin');
const ytdlpPath = path.join(binDir, 'yt-dlp.exe');
const ffmpegPath = path.join(binDir, 'ffmpeg.exe');

async function processYoutubeShort(youtubeUrl, folderName) {
  const targetDir = path.resolve(`ai_references/${folderName}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Copy Coach Reference Image
  const coachRefSrc = path.resolve('ai_references/coach_reference.jpg');
  const coachRefDest = path.join(targetDir, '00_coach_reference.jpg');
  if (fs.existsSync(coachRefSrc)) {
    fs.copyFileSync(coachRefSrc, coachRefDest);
    console.log(`✅ [1/4] Coach reference copied: 00_coach_reference.jpg`);
  }

  // Clean old temp files
  fs.readdirSync(targetDir).forEach(f => {
    if (f.startsWith('temp_') || f.startsWith('ref_video') || f.startsWith('01_yt_') || f.startsWith('02_yt_') || f.startsWith('03_yt_') || f.startsWith('04_yt_')) {
      try { fs.unlinkSync(path.join(targetDir, f)); } catch(e) {}
    }
  });

  const tempVideo = path.join(targetDir, 'temp_video.mp4');

  console.log(`\n⏳ [2/4] Downloading YouTube video from: ${youtubeUrl}...`);
  try {
    execSync(`"${ytdlpPath}" --ffmpeg-location "${binDir}" -f "bestvideo[ext=mp4]/best[ext=mp4]/best" "${youtubeUrl}" -o "${tempVideo}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('Download error:', e.message);
  }

  // Find actual downloaded video file
  let actualVideoFile = tempVideo;
  if (!fs.existsSync(actualVideoFile)) {
    const found = fs.readdirSync(targetDir).find(f => f.startsWith('temp_video') || f.endsWith('.mp4') || f.endsWith('.webm'));
    if (found) actualVideoFile = path.join(targetDir, found);
  }

  console.log(`\n🎬 [3/4] Extracting high-res keyframes from: ${actualVideoFile}`);
  
  const framesDir = path.join(targetDir, 'extracted_frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });
  // Clean old frames
  fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));

  try {
    execSync(`"${ffmpegPath}" -y -i "${actualVideoFile}" -vf "fps=2" -q:v 2 "${framesDir}/frame_%03d.jpg"`, { stdio: 'ignore' });
    
    const extracted = fs.readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort();
    console.log(`Extracted ${extracted.length} total frames from video.`);
    
    if (extracted.length > 0) {
      // Pick 4 distinct positions: Setup (15%), Mid (40%), Peak contraction (70%), Alternative Angle/Extension (90%)
      const p1 = Math.max(0, Math.floor(extracted.length * 0.15));
      const p2 = Math.max(0, Math.floor(extracted.length * 0.40));
      const p3 = Math.max(0, Math.floor(extracted.length * 0.70));
      const p4 = Math.max(0, Math.floor(extracted.length * 0.90));

      const mapping = [
        { file: extracted[p1], name: '01_yt_frame_setup.jpg', label: 'Setup Pose' },
        { file: extracted[p2], name: '02_yt_frame_mid_motion.jpg', label: 'Mid-Motion Trajectory' },
        { file: extracted[p3], name: '03_yt_frame_peak_contraction.jpg', label: 'Peak Contraction & Squeeze' },
        { file: extracted[p4], name: '04_yt_frame_angle_view.jpg', label: 'Alternative Angle / Lockout' }
      ];

      mapping.forEach((item, idx) => {
        if (item.file) {
          fs.copyFileSync(path.join(framesDir, item.file), path.join(targetDir, item.name));
          console.log(`📸 Saved keyframe [${idx + 1}/4]: ${item.name} (${item.label})`);
        }
      });
    }
  } catch (err) {
    console.error('Frame extraction error:', err.message);
  }

  // Clean up temp video to save space
  if (fs.existsSync(actualVideoFile)) {
    try { fs.unlinkSync(actualVideoFile); } catch(e) {}
  }

  console.log(`\n🎉 [4/4] SUCCESS! Folder "${folderName}" now has Coach Reference + 4 YouTube Keyframes!`);
}

const args = process.argv.slice(2);
const url = args[0] || 'https://www.youtube.com/shorts/cGXBVOc5xIk';
const folder = args[1] || '15_Cable Rear Delt Fly';

processYoutubeShort(url, folder);
