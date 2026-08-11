/**
 * Readiness Engine — skor kesiapan latihan 0-100, dihitung Logym sendiri.
 * Deterministik, tanpa panggilan API.
 *
 * SEJARAH YANG PENTING: versi lama memakai `energyScore` sebagai input, yaitu angka milik Samsung
 * Health yang harus diketik user manual — Samsung tidak pernah mengekspornya ke Health Connect.
 * Praktisnya field itu selalu kosong, jadi skornya cuma mencerminkan durasi tidur. Sekarang
 * dihitung dari tiga sinyal yang BENAR-BENAR ada di Health Connect.
 *
 * HRV sengaja tidak dipakai: Samsung juga tidak mengekspornya (diverifikasi 11 Agu 2026 di layar
 * "Data and access"). RHR adalah penggantinya yang sah — naiknya nadi istirahat terhadap
 * kebiasaan sendiri itu penanda lelah/sakit yang dipakai Oura & Whoop juga, cuma kurang peka.
 *
 * Kenapa RHR dibandingkan BASELINE, bukan ambang mutlak: RHR 58 bpm tidak berarti apa-apa sendiri.
 * Dia berarti "belum pulih" kalau rata-ratamu 50, dan "segar" kalau rata-ratamu 65.
 */

// Minimal hari yang harus ada sebelum baseline dipercaya. Di bawah ini, RHR tidak ikut dihitung
// sama sekali — baseline dari 1-2 hari itu bukan kebiasaan, cuma kebetulan.
// ponytail: rata-rata polos, bukan median/EWMA. Naikkan kalau ternyata satu hari sakit menggeser
// baseline terlalu jauh.
const MIN_BASELINE_DAYS = 3;
const BASELINE_WINDOW = 14;

/**
 * Rata-rata nadi istirahat dari `history`, sampai `BASELINE_WINDOW` hari SEBELUM `ymd`.
 * Hari yang dinilai sengaja tidak ikut — kalau ikut, hari yang buruk menaikkan baselinenya
 * sendiri dan sebagian sinyalnya hilang.
 * @returns {number|null} null kalau datanya belum cukup
 */
export const restingHrBaseline = (history, ymd) => {
  const akhir = new Date(`${ymd}T12:00:00`);
  const nilai = [];
  for (let i = 1; i <= BASELINE_WINDOW; i++) {
    const d = new Date(akhir);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = Number(history?.[key]?.bioData?.restingHeartRate);
    if (Number.isFinite(v) && v > 0) nilai.push(v);
  }
  if (nilai.length < MIN_BASELINE_DAYS) return null;
  return nilai.reduce((a, b) => a + b, 0) / nilai.length;
};

/**
 * @param {object} bio - bioData hari yang dinilai
 * @param {number|null} baselineRhr - hasil restingHrBaseline (boleh null)
 * @returns {{score:number, status:string, message:string, parts:object}}
 */
export const calculateReadiness = (bio, baselineRhr = null) => {
  const b = bio || {};
  const sleep = parseFloat(b.sleep) || 0;
  const rhr = Number(b.restingHeartRate) || 0;
  const deep = Number(b.sleepDeep) || 0;
  const rem = Number(b.sleepRem) || 0;
  const light = Number(b.sleepLight) || 0;
  const awake = Number(b.sleepAwake) || 0;

  let score = 100;
  // Alasan dikumpulkan lalu yang TERBERAT dipilih jadi pesan — bukan pesan terakhir yang menang.
  // Dengan cara lama, tidur 4 jam bisa tertutup pesan "tahap tidurmu kurang nyenyak" yang jauh
  // lebih ringan cuma karena urutan pengecekannya kebetulan begitu.
  const alasan = [];
  const parts = {};

  // 1. DURASI TIDUR — bobot terbesar, dan satu-satunya yang bisa membuat skor "unknown".
  if (sleep > 0) {
    parts.sleep = sleep;
    if (sleep < 5) alasan.push({ potong: 35, status: 'critical', msg: `Cuma ${sleep} jam tidur semalam. Kurangi volume latihan hari ini (deload) supaya tidak mengundang cedera.` });
    else if (sleep < 6) alasan.push({ potong: 20, status: 'warning', msg: `Tidurmu ${sleep} jam — di bawah kebutuhan. Turunkan beban, jangan kejar PR hari ini.` });
    else if (sleep < 7) alasan.push({ potong: 10, status: 'warning', msg: `Tidur ${sleep} jam, sedikit kurang. Pemanasan ekstra sebelum set berat.` });
  } else {
    score = 80;
    return {
      score, status: 'unknown', parts,
      message: 'Bagaimana tidurmu semalam? Catat dulu durasinya — tanpa itu skor kesiapan cuma tebakan.',
    };
  }

  // 2. TAHAP TIDUR — porsi nyenyak (deep) + mimpi (REM) dari total. Di bawah 30% berarti tidurnya
  // panjang tapi dangkal, dan itu tidak memulihkan sebanyak angkanya terlihat.
  const totalStage = deep + rem + light + awake;
  if (totalStage > 0) {
    const pulih = (deep + rem) / totalStage;
    parts.restorativePct = Math.round(pulih * 100);
    if (pulih < 0.30) alasan.push({ potong: 15, status: 'warning', msg: `Tidurmu ${sleep} jam tapi cuma ${Math.round(pulih * 100)}% nyenyak (deep+REM). Durasinya cukup, kualitasnya belum — jangan paksakan set maksimal.` });
    else if (pulih < 0.40) alasan.push({ potong: 5, status: 'optimal', msg: '' });
  }

  // 3. DEVIASI NADI ISTIRAHAT terhadap kebiasaan sendiri. Sinyal lelah/sakit yang paling awal
  // muncul — sering mendahului rasa capeknya sendiri.
  if (rhr > 0 && baselineRhr) {
    const delta = rhr - baselineRhr;
    parts.rhr = rhr;
    parts.rhrBaseline = Math.round(baselineRhr);
    parts.rhrDelta = Math.round(delta);
    const naik = Math.round(delta);
    if (delta >= 10) alasan.push({ potong: 40, status: 'critical', msg: `Nadi istirahatmu ${rhr} bpm, ${naik} di atas kebiasaanmu (${Math.round(baselineRhr)}). Lonjakan sebesar ini biasanya berarti belum pulih atau mau sakit — hari ini istirahat.` });
    else if (delta >= 6) alasan.push({ potong: 25, status: 'critical', msg: `Nadi istirahat ${rhr} bpm, ${naik} di atas kebiasaanmu. Tubuhmu masih memulihkan diri — pilih sesi ringan.` });
    else if (delta >= 3) alasan.push({ potong: 10, status: 'warning', msg: `Nadi istirahat sedikit di atas kebiasaan (+${naik} bpm). Boleh latihan, tapi dengarkan tubuhmu.` });
  }

  alasan.forEach((a) => { score -= a.potong; });
  score = Math.max(0, Math.min(100, score));

  const terberat = alasan.filter((a) => a.msg).sort((a, b) => b.potong - a.potong)[0];
  if (!terberat) {
    return { score, status: 'optimal', parts, message: 'Kondisi prima — tidur cukup dan nadi istirahatmu normal. Hajar PR baru hari ini!' };
  }
  return { score, status: terberat.status, parts, message: terberat.msg };
};
