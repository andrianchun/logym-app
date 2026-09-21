/**
 * Algoritma Estimasi Komposisi Tubuh BIA (Bioelectrical Impedance Analysis)
 * Diadaptasi dari model standar yang mirip dengan Xiaomi Mi Body Composition Scale.
 * Menggunakan Tinggi (cm), Berat (kg), Umur (tahun), Gender (male/female), dan Impedansi (Ohm).
 */

export const calculateBodyComposition = (weight, impedance, heightCm, age, gender) => {
    if (!weight || !impedance || !heightCm || !age || !gender) return null;

    const isMale = String(gender).toLowerCase() === 'male' || String(gender).toLowerCase() === 'pria';
    const h = Number(heightCm);
    const w = Number(weight);
    const a = Number(age);
    const z = Number(impedance);

    if (h <= 0 || w <= 0 || a <= 0 || z <= 0) return null;

    // 1. BMI (Body Mass Index)
    const heightM = h / 100;
    const bmi = Number((w / (heightM * heightM)).toFixed(1));

    // 2. LBM (Lean Body Mass) Coefficient dengan kalibrasi hardware foot-to-foot Xiaomi
    const lbm = (h * 9.058 / 100.0) * (h / 100.0) + (w * 0.32) + 12.226 - (z * 0.0068) - (a * 0.0542);

    // 3. Body Fat (%) — Formula presisi Zepp Life / Mi Fit
    let adjust = 0.8;
    let coeff = 1.0;
    if (isMale) {
        if (w < 61) coeff = 0.98;
    } else {
        adjust = a <= 49 ? 9.25 : 7.25;
        if (w > 60) {
            coeff = 0.96 * (h > 160 ? 1.03 : 1.0);
        } else if (w < 50) {
            coeff = 1.02 * (h > 160 ? 1.03 : 1.0);
        }
    }
    let bodyFat = (1.0 - (((lbm - adjust) * coeff) / w)) * 100.0;
    bodyFat = Math.max(5, Math.min(75, bodyFat));

    // 4. Bone Mass (Massa Tulang, kg) — Formula Zepp Life
    const boneBase = isMale ? 0.18016894 : 0.245691014;
    let boneMass = (boneBase - (lbm * 0.05158)) * -1;
    if (boneMass > 2.2) boneMass += 0.1;
    else boneMass -= 0.1;
    boneMass = Math.max(0.5, Math.min(isMale ? 5.2 : 5.1, boneMass));

    // 5. Muscle Mass (Massa Otot, kg) & Muscle Percent (%) — W - Fat - Bone
    let muscleMass = w - ((bodyFat * 0.01) * w) - boneMass;
    muscleMass = Math.max(10, Math.min(isMale ? 120 : 84, muscleMass));
    const musclePercent = (muscleMass / w) * 100;

    // 6. Water % (Kadar Air, %) — Formula Zepp Life
    let waterPercent = (100.0 - bodyFat) * 0.7;
    waterPercent *= (waterPercent <= 50) ? 1.02 : 0.98;
    waterPercent = Math.max(35, Math.min(75, waterPercent));

    // 7. Protein % (Kadar Protein, %) — Formula Zepp Life
    let proteinPercent = (muscleMass / w) * 100.0 - waterPercent;
    proteinPercent = Math.max(5, Math.min(32, proteinPercent));

    // 8. BMR (Basal Metabolic Rate, kcal) — Formula Zepp Life
    let bmr;
    if (isMale) {
        bmr = 877.8 + (w * 14.916) - (h * 0.726) - (a * 8.976);
    } else {
        bmr = 864.6 + (w * 10.2036) - (h * 0.39336) - (a * 6.204);
    }
    bmr = Math.round(Math.max(500, Math.min(5000, bmr)));

    // 9. Visceral Fat (Rating Lemak Visceral 1-50) — Formula Zepp Life
    let visceralFat = 1;
    if (isMale) {
        if (h < (w * 1.6 + 63.0)) {
            visceralFat = (a * 0.15) + (((w * 305.0) / ((h * 0.0826 * h - h * 0.4) + 48.0)) - 2.9);
        } else {
            visceralFat = (a * 0.15) + (w * (h * -0.0015 + 0.765) - (h * 0.143)) - 5.0;
        }
    } else {
        if (w <= (h * 0.5 - 13.0)) {
            visceralFat = (a * 0.07) + (w * (h * -0.0024 + 0.691) - (h * 0.027)) - 10.5;
        } else {
            visceralFat = (a * 0.07) + (((w * 500.0) / ((h * 1.45 + h * 0.1158 * h) - 120.0)) - 6.0);
        }
    }
    visceralFat = Math.round(Math.max(1, Math.min(50, visceralFat)));

    // 10. Metabolic Age / Body Age (Usia Tubuh) — Formula Zepp Life
    let bodyAge = a;
    if (isMale) {
        bodyAge = (h * -0.7471) + (w * 0.9161) + (a * 0.4184) + (z * 0.0517) + 54.2267;
    } else {
        bodyAge = (h * -1.1165) + (w * 1.5784) + (a * 0.4615) + (z * 0.0415) + 83.2548;
    }
    bodyAge = Math.round(Math.max(15, Math.min(80, bodyAge)));

    // 11. Body Score (Skor Tubuh 100)
    let score = 100;
    if (bmi < 18.5) score -= (18.5 - bmi) * 2;
    else if (bmi > 24) score -= (bmi - 24) * 2.5;
    const idealFat = isMale ? 17 : 22;
    if (bodyFat > idealFat) score -= (bodyFat - idealFat) * 1.5;
    score = Math.round(Math.max(40, Math.min(100, score)));

    return {
        bmi: bmi,
        bodyFat: Number(bodyFat.toFixed(1)),
        muscleMass: Number(muscleMass.toFixed(2)),
        musclePercent: Number(musclePercent.toFixed(1)),
        boneMass: Number(boneMass.toFixed(2)),
        visceralFat: visceralFat,
        waterPercent: Number(waterPercent.toFixed(1)),
        proteinPercent: Number(proteinPercent.toFixed(1)),
        bmr: bmr,
        bodyAge: bodyAge,
        bodyScore: score
    };
};
