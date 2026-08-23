const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function recordVideo(exerciseId) {
  const thumbPath = path.join(__dirname, `../public/exercise-assets/thumbnails/${exerciseId}.webp`);
  if (!fs.existsSync(thumbPath)) {
    console.error('Thumbnail not found:', thumbPath);
    process.exit(1);
  }

  const base64Img = fs.readFileSync(thumbPath).toString('base64');
  const dataUri = 'data:image/webp;base64,' + base64Img;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #020408; overflow: hidden; }
    canvas { display: block; width: 1080px; height: 1080px; }
  </style>
</head>
<body>
  <canvas id="c" width="1080" height="1080"></canvas>
  <script>
    async function start() {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = "${dataUri}";
      await new Promise(r => img.onload = r);

      const stream = canvas.captureStream(60);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      const duration = 4000;
      const startTime = performance.now();
      rec.start();

      function draw(now) {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1);
        const cycle = Math.sin(p * Math.PI * 2);

        ctx.fillStyle = '#020408';
        ctx.fillRect(0, 0, 1080, 1080);

        // Zoom breathing contraction
        ctx.save();
        const scale = 1.0 + 0.022 * (cycle * 0.5 + 0.5);
        ctx.translate(540, 540);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -540, -540, 1080, 1080);
        ctx.restore();

        // Dynamic electric muscle glow
        ctx.save();
        const glowAlpha = 0.35 + 0.65 * Math.pow((cycle * 0.5 + 0.5), 2);
        ctx.fillStyle = '#0088ff';
        ctx.shadowColor = '#0088ff';
        ctx.shadowBlur = 40 + 20 * (cycle * 0.5 + 0.5);
        ctx.globalAlpha = glowAlpha;

        const rippleY = 440 + 160 * (cycle * 0.5 + 0.5);
        ctx.beginPath();
        ctx.ellipse(540, rippleY, 200, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p < 1) {
          requestAnimationFrame(draw);
        } else {
          rec.stop();
        }
      }

      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result.split(',')[1];
          await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: b64 })
          });
        };
        reader.readAsDataURL(blob);
      };

      requestAnimationFrame(draw);
    }
    window.onload = start;
  </script>
</body>
</html>`;

  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.url === '/save' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        const { data } = JSON.parse(body);
        const buf = Buffer.from(data, 'base64');
        const outDir = path.join(__dirname, '../public/exercise-assets/videos');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        
        const outFileWebm = path.join(outDir, `${exerciseId}.webm`);
        fs.writeFileSync(outFileWebm, buf);
        console.log(`✅ Video saved: ${outFileWebm} (${(buf.length / 1024).toFixed(1)} KB)`);

        // Also update registry
        const regPath = path.join(__dirname, '../public/exercise-assets/exercise_registry.json');
        if (fs.existsSync(regPath)) {
          const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
          if (reg[exerciseId]) {
            reg[exerciseId].videoUrl = `/exercise-assets/videos/${exerciseId}.webm`;
            reg[exerciseId].status = 'approved';
            fs.writeFileSync(regPath, JSON.stringify(reg, null, 2), 'utf8');
          }
        }

        res.writeHead(200);
        res.end('OK');
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      });
    }
  });

  const port = 49100 + Math.floor(Math.random() * 800);
  server.listen(port, () => {
    console.log(`Rendering 4s video for [${exerciseId}] on port ${port}...`);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    execFile(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      `http://localhost:${port}`
    ]);
  });
}

const targetId = process.argv[2] || 'edb-Smith_Machine_Incline_Bench_Press';
recordVideo(targetId);
