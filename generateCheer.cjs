const fs = require('fs');

function writeWav(filename, samples, sampleRate = 44100) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7FFF, 44 + i * 2);
  }
  
  fs.writeFileSync(filename, buffer);
}

const sampleRate = 44100;
const durationSecs = 1.5;
const samples = new Float32Array(sampleRate * durationSecs);

for (let i = 0; i < samples.length; i++) {
  const t = i / sampleRate;
  
  // Bright Success Chime: A major chord arpeggio with high frequencies
  let chime = 0;
  if (t < 1.0) {
     const freqs = [880, 1108.73, 1318.51, 1760, 2217.46, 2637.02];
     for (let j = 0; j < freqs.length; j++) {
       // Stagger the notes quickly
       const startT = j * 0.08;
       if (t >= startT) {
         const localT = t - startT;
         // Sharp attack, long release
         const env = Math.max(0, Math.exp(-localT * 6));
         
         // Combine sine wave with a little FM modulation for "bell" or "chime" timbre
         const mod = Math.sin(2 * Math.PI * freqs[j] * 2.5 * localT) * 0.5 * Math.exp(-localT * 10);
         const val = Math.sin(2 * Math.PI * freqs[j] * localT + mod);
         
         chime += val * env * 0.2;
       }
     }
  }

  // Mix
  samples[i] = chime;
}

writeWav('public/cheer.wav', samples);
console.log('Generated cheer.wav without the ocean waves');
