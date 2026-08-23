const PRESET_BG_LIST = [
    { url: '/bg-full-body.webp',    scale: 1.1, position: '35% 20%' },
    { url: '/bg-ppl-basic.webp',    scale: 1.1, position: '35% 20%' },
    { url: '/bg-up-low.webp',       scale: 1.1, position: '35% 20%' },
    { url: '/bg-ppl-advanced.webp', scale: 1.1, position: '100% 30%' },
    { url: '/bg-bro-split.webp',    scale: 1.1, position: '35% 20%' },
    { url: '/bg-beast-mode.webp',   scale: 1.1, position: '35% 20%' },
    { url: '/bg-program.webp',      scale: 1.05, position: '40% 20%' },
    { url: '/bg-dashboard.webp',    scale: 1.05, position: '50% 20%' },
    { url: '/bg-activity.webp',     scale: 1.05, position: '50% 20%' },
    { url: '/bg-custom.webp',       scale: 1.05, position: '85% 30%' },
];

export const getPlanBgConfig = (planName, planId = '') => {
    const lowerName = (planName || '').toLowerCase().trim();
    
    // 1. Keyword-based matching
    if (lowerName.includes('ppl basic') || lowerName.includes('push pull leg basic')) {
        return { url: '/bg-ppl-basic.webp', scale: 1.1, position: '35% 20%' };
    }
    if (lowerName.includes('ppl advanced') || lowerName.includes('ppl adv')) {
        return { url: '/bg-ppl-advanced.webp', scale: 1.1, position: '100% 30%' };
    }
    if (lowerName.includes('ppl') || lowerName.includes('push pull') || lowerName.includes('push/pull') || lowerName.includes('push')) {
        return { url: '/bg-ppl-basic.webp', scale: 1.1, position: '35% 20%' };
    }
    if (lowerName.includes('up-low') || lowerName.includes('upper lower') || lowerName.includes('up/low') || lowerName.includes('upper/lower') || lowerName.includes('upper')) {
        return { url: '/bg-up-low.webp', scale: 1.1, position: '35% 20%' };
    }
    if (lowerName.includes('full body') || lowerName.includes('fullbody') || lowerName.includes('total body')) {
        return { url: '/bg-full-body.webp', scale: 1.1, position: '35% 20%' };
    }
    if (lowerName.includes('bro split') || lowerName.includes('brosplit') || lowerName.includes('body part') || lowerName.includes('split')) {
        return { url: '/bg-bro-split.webp', scale: 1.1, position: '35% 20%' };
    }
    if (lowerName.includes('beast') || lowerName.includes('power') || lowerName.includes('strength') || lowerName.includes('heavy') || lowerName.includes('beast mode')) {
        return { url: '/bg-beast-mode.webp', scale: 1.1, position: '35% 20%' };
    }
    if (lowerName.includes('hypertrophy') || lowerName.includes('muscle') || lowerName.includes('otot') || lowerName.includes('advanced')) {
        return { url: '/bg-ppl-advanced.webp', scale: 1.1, position: '100% 30%' };
    }
    if (lowerName.includes('custom') || lowerName.includes('mekanik') || lowerName.includes('builder')) {
        return { url: '/bg-custom.webp', scale: 1.05, position: '85% 30%' };
    }

    // 2. Deterministic Hash-based Variety for Any Other Plan (AI / Custom / Shared)
    // Ensures distinct visual identity per plan instead of repeating the same fallback
    const seed = `${planId || ''}_${planName || ''}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % PRESET_BG_LIST.length;
    return PRESET_BG_LIST[index];
};

