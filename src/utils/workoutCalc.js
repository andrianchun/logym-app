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

/**
 * Estimasi kalori terbakar super cerdas (Set-Based) atau dari Health Connect.
 * Mencegah eksploitasi timer karena hanya menghitung set yang benar-benar selesai dicentang.
 * @param {number} weightKg - berat badan pengguna (kg).
 * @param {object} workout - Objek workout yang berisi exercises/overriddenExercises dan durasi.
 * @param {object} logs - Objek exerciseLogs (e.g. { "101": [{ done: true, r: 10 }] })
 * @param {number} [globalRestTime=90] - Default rest timer jika tidak ada di set/exercise.
 * @returns {number} estimasi kcal yang sangat akurat
 */
export const calculateSmartWorkoutCalories = (weightKg, workout, logs, globalRestTime = 90) => {
  if (!workout) return 0;

  // 1. Prioritas Utama: Jika ada data nyata dari Smartwatch / Health Connect
  if (workout.caloriesBurned) {
    return Number(workout.caloriesBurned);
  }

  // 2. Fallback: Jika tidak ada logs sama sekali (riwayat lama banget), pakai blind timer lawas
  if (!logs || Object.keys(logs).length === 0) {
    const durMins = parseWorkoutDurationMinutes(workout.duration);
    return calculateWorkoutCalories(weightKg, durMins);
  }

  const weight = Number(weightKg) || 70;
  let totalCalories = 0;
  let matchedAnyExercise = false;

  // Ambil daftar latihan (bisa dari Override atau Adhoc)
  const exercises = workout.overriddenExercises || workout.exercises || [];

  exercises.forEach(ex => {
    // Sesi program biasa (bukan adhoc) me-render tiap exercise dengan id gabungan
    // `${ex.id}-${workout.id}` (lihat WorkoutTab.jsx activeProgramsList) — makanya exerciseLogs
    // (dan w.log yang disimpan) kepakai key gabungan itu, sedangkan overriddenExercises/exercises
    // menyimpan id ASLI (tanpa gabungan). Coba id asli dulu (adhoc/riwayat lama), baru id gabungan.
    const exLogs = logs[ex.id] || (workout.id != null ? logs[`${ex.id}-${workout.id}`] : undefined);
    if (!exLogs || !Array.isArray(exLogs)) return;
    matchedAnyExercise = true;

    exLogs.forEach(set => {
      // HANYA hitung kalori jika set benar-benar dicentang selesai
      if (set.done) {
        if (ex.type === 'time') {
          // KARDIO (Waktu): Durasi penuh * MET 7.0 (Jogging ringan/sedang)
          const setDurMins = Number(set.d || ex.duration || 0);
          totalCalories += weight * 7.0 * (setDurMins / 60);
        } else {
          // BEBAN (Reps): Asumsi repetisi makan waktu rata-rata 4 detik per rep (TUT)
          const reps = Number(set.r || ex.reps || 10);
          const activeWorkMins = (reps * 4) / 60;
          totalCalories += weight * WORKOUT_MET * (activeWorkMins / 60); // MET 6.0 untuk angkat beban

          // Kalori pemulihan / Istirahat pasca-set (MET 2.0 santai)
          const restSecs = Number(set.rest || ex.restTime || workout.restTime || globalRestTime);
          const restMins = restSecs / 60;
          totalCalories += weight * 2.0 * (restMins / 60);
        }
      }
    });
  });

  // Log beneran ada isinya (dan sudah lolos guard "logs kosong" di atas), tapi gak ada satupun
  // exercise di overriddenExercises/exercises yang id-nya cocok sama log — biasanya riwayat lama
  // atau sesi adhoc yang kehilangan daftar exercise-nya. Daripada nampilin 0 kcal padahal orangnya
  // beneran latihan, fallback ke estimasi timer biasa (durasi × MET) alih-alih diam-diam jadi 0.
  if (totalCalories === 0 && !matchedAnyExercise) {
    const durMins = parseWorkoutDurationMinutes(workout.duration);
    return calculateWorkoutCalories(weight, durMins);
  }

  return Math.round(totalCalories);
};

