// MET (Metabolic Equivalent) untuk latihan beban/resistance training. Dipakai konsisten di
// seluruh app (dashboard, kartu riwayat kalender, share card) supaya estimasi kalori tidak
// beda-beda tergantung layar yang dibuka. Ini estimasi kasar (MET tetap, tidak membedakan
// intensitas/jenis gerakan) — mirip prinsip yang dipakai kebanyakan app fitness, tapi wearable
// berbasis detak jantung (mis. Samsung Health) biasanya menghasilkan angka lebih tinggi.
const WORKOUT_MET = 6.0;

/**
 * Mengubah field `duration` workout (bisa berupa angka menit, atau string "H:MM:SS"/"MM:SS")
 * menjadi jumlah menit. Angka numerik selalu diperlakukan sebagai MENIT (bukan detik) —
 * konvensi ini mengikuti CalendarTab & DashboardTab.
 * @param {number|string} duration
 * @returns {number} durasi dalam menit
 */
export const parseWorkoutDurationMinutes = (duration) => {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;
  const parts = duration.toString().split(':').map(Number);
  if (parts.length === 3) return Math.round(((parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)) / 60);
  if (parts.length === 2) return Math.round(((parts[0] || 0) * 60 + (parts[1] || 0)) / 60);
  return 0;
};

/**
 * Estimasi kalori terbakar untuk satu sesi latihan berdasarkan berat badan & durasi.
 * @param {number} weightKg - berat badan pengguna (kg). Fallback ke 70kg kalau belum diisi.
 * @param {number} durationMinutes
 * @returns {number} estimasi kcal (dibulatkan)
 */
export const calculateWorkoutCalories = (weightKg, durationMinutes) => {
  const weight = Number(weightKg) || 70;
  const duration = Number(durationMinutes) || 0;
  return Math.round(weight * WORKOUT_MET * (duration / 60));
};
