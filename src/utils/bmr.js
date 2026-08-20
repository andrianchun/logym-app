// BMR (Mifflin-St Jeor) + activity multiplier — dipakai di onboarding (ProgramQuestionnaireModal),
// perhitungan harian (DashboardTab), dan recompute TDEE live (App.jsx). Dulu formula ini
// ke-duplikasi 2x identik di 2 file berbeda; sekarang satu sumber.
export const calcBMR = ({ weight, height, age, gender }) => {
  if (!weight || !height || !age) return 0;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
};

export const ACTIVITY_MULTIPLIERS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };

/**
 * BMR untuk SATU HARI — selalu turunan Logym.
 *
 * `bioData.bmr` ditulis lima produsen dengan rumus yang berbeda-beda: Health Connect
 * (`basalCalories`, diambil sampel mentah terakhir hari itu), timbangan Xiaomi
 * (Mifflin dirata-rata dengan Katch-McArdle), onboarding (`calcBMR`), scan AI foto timbangan
 * (bisa mengembalikan TDEE, bukan BMR), dan input manual tanpa batas atas. Grafik yang membaca
 * field itu apa adanya karena itu meloncat-loncat: 1600 di satu hari, 1700 besoknya, 2900 di hari
 * yang kebetulan discan AI.
 *
 * Sekarang angkanya SELALU dihitung dari berat hari itu + tinggi/umur/gender profil. Angka dari
 * alat tetap tersimpan di `bioData.bmr` (tidak dibuang), cuma berhenti dibaca — kecuali sebagai
 * jaring pengaman kalau profilnya belum lengkap sehingga `calcBMR` tidak bisa menghitung apa pun.
 *
 * SENGAJA tanpa fallback diam-diam "tinggi 165 / umur 25 / male": itu mengarang angka yang
 * kelihatan wajar. Lebih baik jatuh ke nilai tersimpan.
 */
export const dayBmr = (bioData, profile) => {
  const bio = bioData || {};
  const p = profile || {};
  const weight = Number(bio.weight) || Number(p.weight) || 0;
  const height = Number(bio.height) || Number(p.height) || 0;
  const dob = p.dob || p.biometrics?.birthDate || p.birthDate;
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : 0;
  const derived = Number.isFinite(age) && age > 0
    ? calcBMR({ weight, height, age, gender: p.gender })
    : 0;
  return derived || Number(bio.bmr) || 0;
};
