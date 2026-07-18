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
          // KARDIO (Waktu): Durasi penuh * MET 7.0 (Jogging ringan/sedang) atau dinamis berdasar jarak
          const setDurMins = Number(set.d || ex.duration || 0);
          const distKm = Number(set.dist || 0);
          let met = 7.0;
          if (distKm > 0 && setDurMins > 0) {
              const speedKmH = distKm / (setDurMins / 60);
              // Estimasi MET lari/jogging berdasar kecepatan (contoh sederhana)
              if (speedKmH <= 4) met = 3.5;
              else if (speedKmH <= 6) met = 5.0;
              else if (speedKmH <= 8) met = 8.0;
              else if (speedKmH <= 10) met = 9.8;
              else if (speedKmH <= 12) met = 11.5;
              else met = 12.0;
          }
          totalCalories += weight * met * (setDurMins / 60);
        } else {
          // BEBAN (Reps): Asumsi repetisi makan waktu rata-rata 4 detik per rep (TUT)
          const reps = Number(set.r || ex.reps || 10);
          const activeWorkMins = (reps * 4) / 60;
          let setCal = weight * WORKOUT_MET * (activeWorkMins / 60); // MET 6.0 untuk angkat beban

          // Bonus kalori dari beban yang diangkat (Force x Distance -> kcal)
          const setWeight = Number(set.w || ex.defaultWeight || 0);
          if (setWeight > 0) {
             setCal += setWeight * reps * 0.006;
          }
          totalCalories += setCal;

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

/**
 * Estimasi kalori terbakar saat sesi LIVE berlangsung.
 * Menggabungkan durasi baseline (mondar-mandir di gym) dengan tambahan intensitas set selesai.
 */
export const calculateLiveWorkoutCalories = (weightKg, exercises, logs, currentDurationSecs) => {
  const weight = Number(weightKg) || 70;
  // Baseline kalori selama di gym (MET 2.5: aktivitas ringan, berdiri, berjalan pelan)
  const baselineCalories = weight * 2.5 * (currentDurationSecs / 3600);
  
  let extraCalories = 0;
  
  if (exercises && logs) {
    exercises.forEach(ex => {
      const exLogs = logs[ex.id];
      if (!exLogs || !Array.isArray(exLogs)) return;

      exLogs.forEach(set => {
        if (set.done) {
          if (ex.type === 'time') {
            const setDurMins = Number(set.d || ex.duration || 0);
            const distKm = Number(set.dist || 0);
            let met = 7.0;
            if (distKm > 0 && setDurMins > 0) {
                const speedKmH = distKm / (setDurMins / 60);
                if (speedKmH <= 4) met = 3.5;
                else if (speedKmH <= 6) met = 5.0;
                else if (speedKmH <= 8) met = 8.0;
                else if (speedKmH <= 10) met = 9.8;
                else if (speedKmH <= 12) met = 11.5;
                else met = 12.0;
            }
            // Tambahan MET (total met - 2.5 baseline)
            extraCalories += weight * Math.max(0, met - 2.5) * (setDurMins / 60);
          } else {
            const reps = Number(set.r || ex.reps || 10);
            const activeWorkMins = (reps * 4) / 60;
            // Tambahan MET 3.5 (total WORKOUT_MET 6.0 - 2.5 baseline)
            let setCal = weight * 3.5 * (activeWorkMins / 60);
            
            const setWeight = Number(set.w || ex.defaultWeight || 0);
            if (setWeight > 0) {
               setCal += setWeight * reps * 0.006;
            }
            extraCalories += setCal;
          }
        }
      });
    });
  }

  return Math.round(baselineCalories + extraCalories);
};

/**
 * Estimasi kalori terbakar saat sesi LIVE berlangsung, dikhususkan untuk Card Mode (FloatingTimer).
 * Mengekstrak informasi exercise langsung dari exerciseLibrary berdasarkan kunci log.
 */
export const calculateLiveCaloriesFromLogs = (weightKg, logs, exerciseLibrary, currentDurationSecs) => {
  const weight = Number(weightKg) || 70;
  const baselineCalories = weight * 2.5 * (currentDurationSecs / 3600);
  
  let extraCalories = 0;
  
  if (logs && exerciseLibrary) {
    Object.keys(logs).forEach(logKey => {
      const exLogs = logs[logKey];
      if (!Array.isArray(exLogs)) return;

      // logKey might be "101" or "101-prog-1". Extract the base ID:
      const baseIdStr = logKey.split('-')[0];
      const baseId = isNaN(parseInt(baseIdStr)) ? baseIdStr : parseInt(baseIdStr);
      const ex = exerciseLibrary.find(e => e.id === baseId) || {};

      exLogs.forEach(set => {
        if (set.done) {
          if (ex.type === 'time') {
            const setDurMins = Number(set.d || ex.duration || 0);
            extraCalories += weight * 4.5 * (setDurMins / 60);
          } else {
            const reps = Number(set.r || ex.reps || 10);
            const activeWorkMins = (reps * 4) / 60;
            let setCal = weight * 3.5 * (activeWorkMins / 60);
            
            const setWeight = Number(set.w || ex.defaultWeight || 0);
            if (setWeight > 0) {
               setCal += setWeight * reps * 0.006;
            }
            extraCalories += setCal;
          }
        }
      });
    });
  }

  return Math.round(baselineCalories + extraCalories);
};

