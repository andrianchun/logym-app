let audioCtx = null;
let timerEndAudioBuffer = null;
let isPreloadingTimerEnd = false;

export const initAudio = () => {
  try {
    if (!audioCtx) {
       audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn("AudioContext init blocked by browser:", e);
  }
};

// Pemutar berkas HTMLAudioElement sebagai fallback sekunder.
const fileCache = {};
const playFile = (src, volume = 1) => {
  try {
    let base = fileCache[src];
    if (!base) {
      base = new Audio(src);
      base.preload = 'auto';
      fileCache[src] = base;
    }
    base.currentTime = 0;
    base.volume = volume;
    const playPromise = base.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        try {
          const node = base.cloneNode();
          node.volume = volume;
          node.play().catch(() => {});
        } catch (_) {}
      });
    }
  } catch (e) {
    console.warn('Gagal memutar file audio:', src, e);
  }
};

/**
 * Preload dan decode berkas alarm istirahat ke memori (AudioBuffer).
 * Menghilangkan latensi jaringan, kegagalan pemutaran pertama (cold-start),
 * dan pemblokiran Autoplay Policy setelah 60-90 detik istirahat tanpa interaksi layar.
 */
export const preloadTimerEnd = async () => {
  if (timerEndAudioBuffer || isPreloadingTimerEnd) return timerEndAudioBuffer;
  isPreloadingTimerEnd = true;
  try {
    initAudio();

    // Hangatkan juga cache HTMLAudioElement sebagai cadangan
    if (!fileCache['/timer-end.wav']) {
      try {
        const audio = new Audio('/timer-end.wav');
        audio.preload = 'auto';
        audio.load();
        fileCache['/timer-end.wav'] = audio;
      } catch (_) {}
    }

    if (!audioCtx) return null;
    const res = await fetch('/timer-end.wav');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const decoded = await new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    timerEndAudioBuffer = decoded;
    return timerEndAudioBuffer;
  } catch (e) {
    console.warn('Preload timer-end.wav buffer warning:', e);
    return null;
  } finally {
    isPreloadingTimerEnd = false;
  }
};

// Sintesis darurat: 4 nada tangga gelombang kotak (600, 800, 1000, 1200 Hz)
// dengan durasi 170ms & 400ms yang identik dengan scripts/generate-timer-sound.cjs.
const playSynthesizedTimerEnd = () => {
  if (!audioCtx) return;
  const tones = [
    { freq: 600, dur: 0.17, when: 0 },
    { freq: 800, dur: 0.17, when: 0.17 },
    { freq: 1000, dur: 0.17, when: 0.34 },
    { freq: 1200, dur: 0.40, when: 0.51 }
  ];
  tones.forEach(({ freq, dur, when }) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    const at = audioCtx.currentTime + when;
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.45, at + 0.008);
    g.gain.setValueAtTime(0.45, at + dur - 0.008);
    g.gain.linearRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  });
};

const playTimerEndSound = () => {
  try {
    initAudio();
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      // 1. Prioritas utama: AudioBuffer ter-decode (0 latensi, nada asli dari berkas)
      if (timerEndAudioBuffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = timerEndAudioBuffer;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.9, audioCtx.currentTime);
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0);
        return;
      }

      // 2. Cadangan Web Audio instan jika berkas belum selesai diunduh
      playSynthesizedTimerEnd();
      return;
    }
  } catch (e) {
    console.warn('Web Audio timerEnd gagal, beralih ke HTMLAudio:', e);
  }

  // 3. Cadangan terakhir jika Web Audio tidak tersedia sama sekali di browser
  playFile('/timer-end.wav');
};

// Satu nada sintesis sederhana untuk efek UI lainnya.
const tone = (freq, { type = 'sine', gain = 0.4, dur = 0.08, when = 0 } = {}) => {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g);
  g.connect(audioCtx.destination);
  const at = audioCtx.currentTime + when;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.start(at);
  osc.stop(at + dur + 0.02);
};

export const playSoundEffect = (type, enabled) => {
    if (!enabled) return;

    if (type === 'timerEnd') {
      playTimerEndSound();
      return;
    }

    try {
      initAudio();
      if (!audioCtx) return;

      if (type === 'click') {
        tone(600, { gain: 0.15, dur: 0.05 });
      } else if (type === 'swipe') {
        tone(200, { gain: 0.05, dur: 0.05 });
      } else if (type === 'done_set') {
        // Centang: tiga nada naik cepat (E6-B6-E7) pakai gelombang segitiga
        tone(1318, { type: 'triangle', gain: 0.4, dur: 0.05 });
        tone(1976, { type: 'triangle', gain: 0.45, dur: 0.05, when: 0.048 });
        tone(2637, { type: 'triangle', gain: 0.32, dur: 0.22, when: 0.096 });
      } else if (type === 'success') {
        tone(659, { gain: 0.3, dur: 0.09 });
        tone(880, { gain: 0.33, dur: 0.09, when: 0.085 });
        tone(1319, { gain: 0.38, dur: 0.22, when: 0.17 });
      } else if (type === 'timerStart') {
        tone(440, { type: 'square', gain: 0.2, dur: 0.1 });
        tone(880, { type: 'square', gain: 0.2, dur: 0.15, when: 0.1 });
      } else if (type === 'timerTick') {
        tone(1000, { gain: 0.5, dur: 0.1 });
      }
    } catch (e) {
      console.warn("Sound effect playback blocked by browser:", e);
    }
};
