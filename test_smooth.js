const sleepData = [
  { time: "22:00", stage: 1 },
  { time: "22:01", stage: 3 },
  { time: "22:02", stage: 1 },
  { time: "22:03", stage: 3 },
  { time: "22:04", stage: 1 },
  { time: "22:05", stage: 3 },
  { time: "22:15", stage: 0 },
  { time: "06:00", stage: 3 }
];

let processedSleepData = [];
let prevMinutesRaw = null;
let prevAbsoluteMinutes = null;
let midnightOffset = 0;
for (let i = 0; i < sleepData.length; i++) {
    const item = sleepData[i];
    const parts = (item.time || '').split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    
    let currentMinutes = h * 60 + m;
    if (prevMinutesRaw !== null && currentMinutes < prevMinutesRaw - 12 * 60) {
        midnightOffset += 24 * 60;
    }
    const absoluteMinutes = currentMinutes + midnightOffset;
    
    if (prevAbsoluteMinutes !== null && absoluteMinutes > prevAbsoluteMinutes) {
        const gap = absoluteMinutes - prevAbsoluteMinutes;
        const prevStage = sleepData[i-1].stage;
        for (let j = 0; j < gap; j++) {
            const rawMins = (prevAbsoluteMinutes + j) % (24 * 60);
            const th = Math.floor(rawMins / 60).toString().padStart(2, '0');
            const tm = (rawMins % 60).toString().padStart(2, '0');
            processedSleepData.push({ stage: prevStage, time: `${th}:${tm}` });
        }
    } else if (i === 0) {
        processedSleepData.push({ stage: item.stage, time: item.time });
    }
    prevMinutesRaw = currentMinutes;
    prevAbsoluteMinutes = absoluteMinutes;
}

console.log("Before smoothing:", processedSleepData.slice(0, 10));

if (processedSleepData.length > 30) {
    const SMOOTH_WINDOW = 30;
    const halfWin = Math.floor(SMOOTH_WINDOW / 2);
    let smoothedData = [];
    for (let k = 0; k < processedSleepData.length; k++) {
        let counts = {0:0, 1:0, 2:0, 3:0};
        let start = Math.max(0, k - halfWin);
        let end = Math.min(processedSleepData.length - 1, k + halfWin);
        for (let w = start; w <= end; w++) {
            counts[processedSleepData[w].stage]++;
        }
        let maxStage = processedSleepData[k].stage;
        let maxCount = -1;
        for (let stage in counts) {
            if (counts[stage] > maxCount) {
                maxCount = counts[stage];
                maxStage = parseInt(stage);
            }
        }
        smoothedData.push({ stage: maxStage, time: processedSleepData[k].time });
    }
    processedSleepData = smoothedData;
}

console.log("After smoothing:", processedSleepData.slice(0, 10));
