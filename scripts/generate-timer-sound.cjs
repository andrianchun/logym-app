// Bikin satu nada "timer selesai" yang dipakai DUA-DUANYA: web (public/timer-end.wav) dan
// service native Android (res/raw/timer_end.wav). Jalankan: node scripts/generate-timer-sound.cjs
//
// Kenapa satu file, bukan oscillator Web Audio + nada alarm HP seperti sebelumnya: dua sumber
// berarti dua suara berbeda untuk kejadian yang sama — di dalam aplikasi terdengar "plup" pelan,
// begitu aplikasi ditutup berubah jadi nada alarm bawaan HP yang dipaksa volume maksimum.
//
// Karakter nada: alarm naik bertingkat 600 -> 800 -> 1000 -> 1200 Hz selama ~2 detik, sama
// seperti nada timer versi paling awal (oscillator 'square', gain 0.6 ditahan penuh) yang memang
// terdengar lantang di gym. Versi sebelumnya — dua ketuk sinus pendek dengan envelope luruh
// cepat, total 1 detik — jauh lebih pelan: energinya cuma di 0,15 detik pertama tiap ketuk.
//
// Dua hal yang bikin nyaring, dua-duanya sengaja:
//   1. Gelombang KOTAK (dijumlah dari harmonik ganjil, band-limited biar tidak aliasing) —
//      harmonik banyak = menembus speaker HP kecil yang tidak punya bass.
//   2. Envelope DITAHAN, bukan luruh. Attack/release cuma 8 ms di ujung tiap tingkat supaya
//      tidak ada bunyi 'klik', sisanya amplitudo penuh.
const fs = require('fs');
const path = require('path');

const SR = 44100;

function writeWav(filename, samples, sampleRate = SR) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);   // PCM
  buffer.writeUInt16LE(1, 22);   // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, buffer);
  return buffer.length;
}

const silence = (ms) => new Array(Math.round((ms / 1000) * SR)).fill(0);

// Satu tingkat alarm: gelombang kotak band-limited (harmonik ganjil sampai di bawah Nyquist),
// amplitudo DITAHAN penuh, cuma diberi fade 8 ms di kedua ujung supaya sambungan antar tingkat
// tidak berbunyi 'klik'.
const blast = (freq, ms, gain = 0.92) => {
  const n = Math.round((ms / 1000) * SR);
  const fade = Math.round(0.008 * SR);
  const harmonics = [];
  for (let h = 1; h * freq < SR / 2; h += 2) harmonics.push(h);
  const out = new Array(n);
  let puncak = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    let s = 0;
    for (const h of harmonics) s += Math.sin(2 * Math.PI * freq * h * tt) / h;
    out[i] = s;
    if (Math.abs(s) > puncak) puncak = Math.abs(s);
  }
  // Normalisasi ke puncak SEBENARNYA, bukan ke jumlah 1/h. Deret harmonik sampai 22 kHz
  // menjumlah ~2,2 padahal puncak gelombangnya cuma ~1,2 — dibagi angka itu hasilnya jadi
  // separuh volume yang dimaksud, persis keluhan "kurang nyaring".
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / fade, (n - i) / fade);
    out[i] = (out[i] / puncak) * env * gain;
  }
  return out;
};

// Tangga naik empat nada dengan tempo normal alami (~1.3s total)
const samples = [
  ...blast(600, 250),
  ...blast(800, 250),
  ...blast(1000, 250),
  ...blast(1200, 550),
  ...silence(60),
];

const targets = [
  'public/timer-end.wav',
  'android/app/src/main/res/raw/timer_end.wav',
];
for (const f of targets) {
  const bytes = writeWav(f, samples);
  console.log(`${f} — ${bytes} byte, ${(samples.length / SR).toFixed(2)} detik`);
}
