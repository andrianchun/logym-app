import math
import struct
import wave
import os
import sys

def generate_tone(frequency, duration, sample_rate=44100, volume=0.5):
    num_samples = int(sample_rate * duration)
    return [volume * math.sin(2 * math.pi * frequency * i / sample_rate) for i in range(num_samples)]

def apply_envelope(samples, attack_time=0.01, release_time=0.1, sample_rate=44100):
    attack_samples = int(sample_rate * attack_time)
    release_samples = int(sample_rate * release_time)
    total_samples = len(samples)
    
    env_samples = []
    for i, s in enumerate(samples):
        if i < attack_samples:
            env = i / attack_samples
        elif i > total_samples - release_samples:
            env = (total_samples - i) / release_samples
        else:
            env = 1.0
        env_samples.append(s * env)
    return env_samples

def save_wav(filename, samples, sample_rate=44100):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for s in samples:
            val = int(s * 32767.0)
            val = max(-32768, min(32767, val))
            wav_file.writeframes(struct.pack('h', val))

output_path = sys.argv[1]
notes = [523.25, 659.25, 783.99, 1046.50]
all_samples = []
for i, freq in enumerate(notes):
    duration = 0.4 if i == len(notes) - 1 else 0.15
    samples = generate_tone(freq, duration, volume=0.4)
    samples = apply_envelope(samples, attack_time=0.02, release_time=duration-0.05)
    all_samples.extend(samples)

os.makedirs(os.path.dirname(output_path), exist_ok=True)
save_wav(output_path, all_samples)
print(f"Generated {output_path} successfully!")
