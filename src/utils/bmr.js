// BMR (Mifflin-St Jeor) + activity multiplier — dipakai di onboarding (ProgramQuestionnaireModal),
// perhitungan harian (DashboardTab), dan recompute TDEE live (App.jsx). Dulu formula ini
// ke-duplikasi 2x identik di 2 file berbeda; sekarang satu sumber.
export const calcBMR = ({ weight, height, age, gender }) => {
  if (!weight || !height || !age) return 0;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
};

export const ACTIVITY_MULTIPLIERS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
