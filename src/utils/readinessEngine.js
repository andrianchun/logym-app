/**
 * Readiness Engine
 * Menghitung tingkat kesiapan latihan (Readiness Score) secara deterministik
 * berdasarkan data tidur, energi, dan riwayat latihan sebelumnya.
 * Tidak memerlukan panggilan API (hemat token).
 */

export const calculateReadiness = (todayDailyData) => {
    let score = 100;
    const sleep = parseFloat(todayDailyData?.sleep || '0');
    const energy = parseFloat(todayDailyData?.energyScore || '0');

    let msg = "Kondisi 100% Prima! Hajar PR baru hari ini!";
    let status = "optimal"; // optimal, warning, critical

    if (sleep > 0) {
        if (sleep < 5) {
            score -= 40;
            msg = `Kamu cuma tidur ${sleep} jam semalam. Sebaiknya kurangi volume latihan (Deload) hari ini untuk mencegah cedera.`;
            status = "critical";
        } else if (sleep < 7) {
            score -= 20;
            msg = `Tidurmu (${sleep} jam) kurang optimal. Dengarkan tubuhmu, jangan paksakan angkat beban terlalu berat hari ini.`;
            status = "warning";
        }
    } else {
        // No sleep data provided yet
        msg = "Bagaimana tidurmu semalam? Jangan lupa catat durasi tidurmu agar kita bisa atur porsi latihan yang pas!";
        status = "unknown";
        score = 80;
    }

    if (energy > 0) {
        if (energy < 40) {
            score -= 30;
            if (status !== "critical") {
                msg = "Energimu terpantau rendah hari ini. Cocok untuk sesi Recovery atau relaksasi.";
                status = "critical";
            }
        } else if (energy < 70) {
            score -= 10;
            if (status === "optimal") {
                msg = "Energi lumayan. Lakukan pemanasan ekstra sebelum latihan beban maksimal.";
                status = "warning";
            }
        }
    }

    // Ensure score stays within 0-100 bounds
    score = Math.max(0, Math.min(100, score));

    return {
        score,
        status,
        message: msg
    };
};
