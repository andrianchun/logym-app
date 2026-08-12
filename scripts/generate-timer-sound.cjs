// Bikin satu nada "timer selesai" yang dipakai DUA-DUANYA: web (public/timer-end.wav) dan
// service native Android (res/raw/timer_end.wav). Jalankan: node scripts/generate-timer-sound.cjs
//
// Kenapa satu file, bukan oscillator Web Audio + nada alarm HP seperti sebelumnya: dua sumber
// berarti dua suara berbeda untuk kejadian yang sama — di dalam aplikasi terdengar "plup" pelan,
// begitu aplikasi ditutup berubah jadi nada alarm bawaan HP yang dipaksa volume maksimum.
//
// Karakter nada: dua ketuk pendek lalu satu nada panjang lebih tinggi (pola timer gym standar).
// Frekuensinya 880-1320 Hz — rentang yang paling menembus di speaker HP, sekaligus rentang yang
// masih terdengar di ruangan berisik. Ada harmonik ketiga tipis supaya terasa "nyaring" dan
// bukan sinus datar, plus envelope attack/release supaya tidak ada bunyi 'klik' di ujung.
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

// Satu ketuk: nada dasar + harmonik ketiga tipis, dengan attack 8 ms dan release halus.
const beep = (freq, ms, gain = 0.85) => {
  const n = Math.round((ms / 1000) * SR);
  const attack = Math.round(0.008 * SR);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    let env;
    if (i < attack) env = i / attack;
    else {
      const rel = (i - attack) / (n - attack);
      env = Math.pow(1 - rel, 1.6); // luruh cepat di akhir, tanpa klik
    }
    const tone = Math.sin(2 * Math.PI * freq * tt) + 0.28 * Math.sin(2 * Math.PI * freq * 3 * tt);
    out[i] = (tone / 1.28) * env * gain;
  }
  return out;
};

const samples = [
  ...beep(880, 150),
  ...silence(90),
  ...beep(880, 150),
  ...silence(90),
  ...beep(1320, 520),
];

const targets = [
  'public/timer-end.wav',
  'android/app/src/main/res/raw/timer_end.wav',
];
for (const f of targets) {
  const bytes = writeWav(f, samples);
  console.log(`${f} — ${bytes} byte, ${(samples.length / SR).toFixed(2)} detik`);
}
