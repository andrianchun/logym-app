/**
 * Utility functions for calculating Heart Rate Zones
 */

// Calculate age from birthDate string (e.g. "1995-10-15")
export const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return null;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Calculate HR Zone based on age and average HR
export const getHRZone = (avgHr, age) => {
    if (!avgHr || avgHr <= 0) return null;
    
    // If age is not provided, we cannot accurately calculate zones
    if (!age || age <= 0) return { error: 'MISSING_AGE' };

    const maxHr = 220 - age;
    const percent = (avgHr / maxHr) * 100;

    if (percent < 50) return { zone: 0, label: '< Z1', color: 'text-zinc-500' };
    if (percent < 60) return { zone: 1, label: 'Z1 (Warm Up)', color: 'text-sky-500' };
    if (percent < 70) return { zone: 2, label: 'Z2 (Fat Burn)', color: 'text-emerald-500' };
    if (percent < 80) return { zone: 3, label: 'Z3 (Aerobic)', color: 'text-amber-500' };
    if (percent < 90) return { zone: 4, label: 'Z4 (Anaerobic)', color: 'text-orange-500' };
    return { zone: 5, label: 'Z5 (Max)', color: 'text-rose-500' };
};
