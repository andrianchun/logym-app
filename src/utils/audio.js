let audioCtx = null;

export const initAudio = () => {
  try {
    if (!audioCtx) {
       audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    console.warn("AudioContext init blocked by browser:", e);
  }
};

// Pemutar berkas. Dipakai HANYA untuk timer selesai — nada itu harus sama persis dengan yang
// dibunyikan service native saat aplikasi ditutup (res/raw/timer_end.wav, file yang sama dari
// scripts/generate-timer-sound.cjs). Sinyal penting lain tetap disintesis: tanpa berkas, tanpa
// tunggu unduh, dan tidak pernah gagal karena berkasnya belum ter-cache.
//
// cloneNode: satu elemen Audio yang sama tidak bisa berbunyi tumpang tindih — pemanggilan kedua
// akan memotong yang pertama. Elemen dasarnya disimpan supaya berkasnya cuma diunduh sekali.
const fileCache = {};
const playFile = (src, volume = 1) => {
  try {
    let base = fileCache[src];
    if (!base) {
      base = new Audio(src);
      base.preload = 'auto';
      fileCache[src] = base;
    }
    const node = base.cloneNode();
    node.volume = volume;
    node.play().catch(() => {});
  } catch (e) {
    console.warn('Gagal memutar', src, e);
  }
};

// Satu nada sintesis. `when` = jeda detik dari sekarang, buat merangkai beberapa nada.
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

    // Timer selesai: berkas, bukan sintesis — lihat catatan playFile di atas.
    if (type === 'timerEnd') {
      playFile('/timer-end.wav');
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
        // Centang: dua ketuk naik yang rapat. Dulu nyaris identik dengan 'click' (sama-sama
        // sinus 600 Hz turun), jadi menyelesaikan set terasa sama saja dengan menekan tombol.
        tone(1046, { gain: 0.35, dur: 0.045 });
        tone(1568, { gain: 0.42, dur: 0.075, when: 0.045 });
      } else if (type === 'success') {
        // Dulu TIDAK ADA cabangnya sama sekali — sepuluh pemanggil (termasuk simpan latihan
        // dan popup pencapaian) memanggil playSoundEffect('success') dan tidak menghasilkan
        // bunyi apa pun, tanpa error. Arpeggio naik tiga nada.
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
