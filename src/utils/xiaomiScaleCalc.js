/**
 * Algoritma Estimasi Komposisi Tubuh BIA (Bioelectrical Impedance Analysis)
 * Diadaptasi dari model standar yang mirip dengan Xiaomi Mi Body Composition Scale.
 * Menggunakan Tinggi (cm), Berat (kg), Umur (tahun), Gender (male/female), dan Impedansi (Ohm).
 */

export const calculateBodyComposition = (weight, impedance, heightCm, age, gender) => {
    if (!weight || !impedance || !heightCm || !age || !gender) return null;

    const isMale = gender.toLowerCase() === 'male' || gender.toLowerCase() === 'pria';
    
    // 1. BMI (Body Mass Index)
    const heightM = heightCm / 100;
    const bmi = Number((weight / (heightM * heightM)).toFixed(1));

    // 2. LBM (Lean Body Mass / Fat-Free Mass)
    // Menggunakan formula umum BIA
    let lbm;
    if (isMale) {
        lbm = (0.3981 * (heightCm * heightCm) / impedance) + (0.3066 * weight) + 0.0953;
    } else {
        lbm = (0.2956 * (heightCm * heightCm) / impedance) + (0.2371 * weight) + 0.252;
    }
    // Batas aman LBM agar tidak melebihi berat
    if (lbm > weight * 0.95) lbm = weight * 0.95;

    // 3. Body Fat (%)
    let bodyFat = ((weight - lbm) / weight) * 100;
    if (bodyFat < 2) bodyFat = 2; // Minimal 2%
    if (bodyFat > 75) bodyFat = 75; // Maksimal 75%

    // 4. Bone Mass (Massa Tulang)
    // Estimasi standar: pria ~ 4% dari berat atau fungsi lbm, wanita ~ 3.5%
    let boneMass;
    if (isMale) {
        boneMass = (lbm * 0.055) + 0.3; // Heuristik
    } else {
        boneMass = (lbm * 0.050) + 0.2;
    }
    // Batasi massa tulang logis
    if (boneMass < 1) boneMass = 1;
    if (boneMass > 5) boneMass = 5;

    // 5. Muscle Mass (Massa Otot)
    const muscleMass = lbm - boneMass;
    const musclePercent = (muscleMass / weight) * 100;

    // 6. Water % (Kadar Air)
    // Massa air biasanya ~73% dari LBM
    const waterMass = lbm * 0.73;
    const waterPercent = (waterMass / weight) * 100;

    // 7. Protein %
    // Protein biasanya sisa dari LBM setelah air dan tulang (tulang diwakili oleh mineral)
    // Heuristik: Protein ~ LBM * 0.27
    const proteinMass = lbm * 0.27;
    const proteinPercent = (proteinMass / weight) * 100;

    // 8. BMR (Basal Metabolic Rate) - Menggunakan Mifflin-St Jeor
    let bmr;
    if (isMale) {
        bmr = (10 * weight) + (6.25 * heightCm) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * heightCm) - (5 * age) - 161;
    }
    
    // Sesuaikan BMR dengan LBM agar lebih akurat dengan komposisi (Katch-McArdle)
    const bmrLbm = 370 + (21.6 * lbm);
    // Kita gunakan rata-rata keduanya atau Katch-McArdle langsung karena kita punya LBM
    bmr = Math.round((bmr + bmrLbm) / 2);

    // 9. Visceral Fat (Rating)
    // Heuristik sederhana berdasarkan umur, BMI, dan persen lemak
    let visceralFat = 0;
    if (isMale) {
        visceralFat = (bodyFat * 0.45) + (age * 0.05) + (bmi * 0.1) - 6;
    } else {
        visceralFat = (bodyFat * 0.35) + (age * 0.05) + (bmi * 0.1) - 6;
    }
    if (visceralFat < 1) visceralFat = 1;
    if (visceralFat > 50) visceralFat = 50;
    visceralFat = Math.round(visceralFat);

    // 10. Body Age (Usia Tubuh)
    let bodyAge = age;
    if (bodyFat > (isMale ? 20 : 28)) {
        bodyAge += Math.round((bodyFat - (isMale ? 20 : 28)) * 0.5);
    } else {
        bodyAge -= Math.round(((isMale ? 20 : 28) - bodyFat) * 0.5);
    }
    if (bodyAge < 15) bodyAge = 15;

    // 11. Body Score (Skor Tubuh)
    let score = 100;
    // Penalti jika BMI di luar 18.5 - 24
    if (bmi < 18.5) score -= (18.5 - bmi) * 2;
    else if (bmi > 24) score -= (bmi - 24) * 2;
    // Penalti tambahan jika body fat di luar kisaran wajar
    const idealFat = isMale ? 15 : 23;
    if (Math.abs(bodyFat - idealFat) > 5) {
        score -= (Math.abs(bodyFat - idealFat) - 5);
    }
    if (score > 100) score = 100;
    if (score < 40) score = 40;

    return {
        bmi: bmi,
        bodyFat: Number(bodyFat.toFixed(1)),
        muscleMass: Number(muscleMass.toFixed(1)),
        musclePercent: Number(musclePercent.toFixed(1)),
        boneMass: Number(boneMass.toFixed(1)),
        visceralFat: visceralFat,
        waterPercent: Number(waterPercent.toFixed(1)),
        proteinPercent: Number(proteinPercent.toFixed(1)),
        bmr: bmr,
        bodyAge: bodyAge,
        bodyScore: Math.round(score)
    };
};
