export const getPlanBgConfig = (planName) => {
    // Custom/Default: Coach is slightly center-right in the source photo.
    const defaultConfig = { url: '/bg-custom.webp', scale: 1.05, position: '85% 30%' };
    if (!planName) return defaultConfig;
    const lowerName = planName.toLowerCase();
    
    // PPL Basic, Up-Low: Asian guy is on the far left of the photo.
    if (lowerName.includes('ppl basic'))    return { url: '/bg-ppl-basic.webp',    scale: 1.1, position: '35% 20%' };
    if (lowerName.includes('up-low'))       return { url: '/bg-up-low.webp',       scale: 1.1, position: '35% 20%' };
    
    // PPL Advanced: Bodybuilder is on the far right of the photo. (Sudah pas)
    if (lowerName.includes('ppl advanced')) return { url: '/bg-ppl-advanced.webp', scale: 1.1, position: '100% 30%' };
    
    // Full Body, Bro Split, Beast Mode: Assumed left-center.
    if (lowerName.includes('full body'))    return { url: '/bg-full-body.webp',    scale: 1.1, position: '35% 20%' };
    if (lowerName.includes('bro split'))    return { url: '/bg-bro-split.webp',    scale: 1.1, position: '35% 20%' };
    if (lowerName.includes('beast mode'))   return { url: '/bg-beast-mode.webp',   scale: 1.1, position: '35% 20%' };
    
    return defaultConfig;
};
