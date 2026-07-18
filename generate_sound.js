const fs = require('fs');
const path = require('path');

function generateTone(frequency, duration, sampleRate = 44100, volume = 0.5) {
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        samples[i] = volume * Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    return samples;
}

function applyEnvelope(samples, attackTime = 0.01, releaseTime = 0.1, sampleRate = 44100) {
    const attackSamples = Math.floor(sampleRate * attackTime);
    const releaseSamples = Math.floor(sampleRate * releaseTime);
    const totalSamples = samples.length;
    
    const envSamples = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
        let env;
        if (i < attackSamples) {
            env = i / attackSamples;
        } else if (i > totalSamples - releaseSamples) {
            env = (totalSamples - i) / releaseSamples;
        } else {
            env = 1.0;
        }
        envSamples[i] = samples[i] * env;
    }
    return envSamples;
}

function saveWav(filename, allSamples, sampleRate = 44100) {
    const buffer = Buffer.alloc(44 + allSamples.length * 2);
    
    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + allSamples.length * 2, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat
    buffer.writeUInt16LE(1, 22); // NumChannels
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(allSamples.length * 2, 40);
    
    let offset = 44;
    for (let i = 0; i < allSamples.length; i++) {
        let val = Math.floor(allSamples[i] * 32767.0);
        val = Math.max(-32768, Math.min(32767, val));
        buffer.writeInt16LE(val, offset);
        offset += 2;
    }
    
    fs.writeFileSync(filename, buffer);
}

const outputPath = process.argv[2];
const notes = [523.25, 659.25, 783.99, 1046.50];
const allSamples = [];

for (let i = 0; i < notes.length; i++) {
    const freq = notes[i];
    const duration = (i === notes.length - 1) ? 0.4 : 0.15;
    let samples = generateTone(freq, duration, 44100, 0.4);
    samples = applyEnvelope(samples, 0.02, duration - 0.05, 44100);
    for (let j = 0; j < samples.length; j++) {
        allSamples.push(samples[j]);
    }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
saveWav(outputPath, allSamples);
console.log(`Generated ${outputPath} successfully!`);
