import { getLocalYMD } from '../src/data/constants.js';
import { formatNumber, formatSleepDuration } from '../src/utils/numberFormat.js';

// Simulate history data with September and October days
const history = {
  '2026-09-28': { bioData: { sleep: 7.2, sleepDeep: '90', sleepLight: '240', sleepRem: '90', sleepAwake: '30' } },
  '2026-09-29': { bioData: { sleep: 6.8, sleepDeep: '80', sleepLight: '220', sleepRem: '80', sleepAwake: '40' } },
  '2026-09-30': { bioData: { sleep: 8.0, sleepDeep: '100', sleepLight: '260', sleepRem: '100', sleepAwake: '30' } },
  '2026-10-01': { bioData: { sleep: 7.5, sleepDeep: '95', sleepLight: '250', sleepRem: '95', sleepAwake: '25' } },
};

const todayStr = '2026-10-01';

const bioEntries = [];
Object.keys(history).forEach(dateStr => {
    if (history[dateStr]?.bioData && dateStr <= todayStr) {
        bioEntries.push({ dateStr, bioData: history[dateStr].bioData });
    }
});
if (!bioEntries.some(e => e.dateStr === todayStr)) {
    bioEntries.push({ dateStr: todayStr, bioData: history[todayStr]?.bioData || {} });
}
bioEntries.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

console.log('bioEntries:', bioEntries.map(e => ({ date: e.dateStr, sleep: e.bioData.sleep })));

// Let's test ActivityChart multiChartData logic:
const stageH = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n / 60 : 0; };

const chartData = bioEntries.map(entry => {
    const d = new Date(entry.dateStr);
    const histBio = entry.bioData;
    const deepH = stageH(histBio?.sleepDeep);
    const lightH = stageH(histBio?.sleepLight);
    const remH = stageH(histBio?.sleepRem);
    const awakeH = stageH(histBio?.sleepAwake);
    const totalSleep = histBio?.sleep ? Number(histBio.sleep) : null;
    const adaTahapan = deepH + lightH + remH + awakeH > 0;

    let topSleepKey = null;
    if (!adaTahapan && totalSleep > 0) topSleepKey = 'sleepTotalOnly';
    else if (awakeH > 0) topSleepKey = 'sleepAwakeH';
    else if (remH > 0) topSleepKey = 'sleepRemH';
    else if (lightH > 0) topSleepKey = 'sleepLightH';
    else if (deepH > 0) topSleepKey = 'sleepDeepH';

    return {
        name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        dateFull: entry.dateStr,
        sleep: totalSleep,
        sleepDeepH: adaTahapan ? deepH || null : null,
        sleepLightH: adaTahapan ? lightH || null : null,
        sleepRemH: adaTahapan ? remH || null : null,
        sleepAwakeH: adaTahapan ? awakeH || null : null,
        sleepTotalOnly: !adaTahapan ? totalSleep : null,
        topSleepKey,
    };
});

console.log('chartData:', chartData);
