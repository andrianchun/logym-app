const fs = require('fs');
let c = fs.readFileSync('src/components/MuscleProgress.jsx', 'utf8');

const radarLabels = {
    'chest': 'Dada',
    'triceps': 'Triceps',
    'front-deltoids': 'Bahu Depan',
    'back-deltoids': 'Bahu Belakang',
    'biceps': 'Biceps',
    'forearm': 'Forearm',
    'abs': 'Perut',
    'obliques': 'Samping',
    'quadriceps': 'Paha Depan',
    'hamstring': 'Paha Belakang',
    'gluteal': 'Bokong',
    'calves': 'Betis',
    'upper-back': 'Punggung Atas',
    'lower-back': 'Punggung Bawah',
    'trapezius': 'Traps',
    'neck': 'Leher'
};

const newBodyData = `
    const radarLabels = ${JSON.stringify(radarLabels)};

    // Prepare data for react-body-highlighter
    const bodyData = useMemo(() => {
        const bodyStats = {};
        Object.entries(muscleStats).forEach(([lyfitMuscle, score]) => {
            const mapped = muscleMapping[lyfitMuscle] || [];
            mapped.forEach(m => {
                bodyStats[m] = (bodyStats[m] || 0) + score;
            });
        });

        const maxScore = Math.max(...Object.values(bodyStats), 1);
        
        return Object.keys(bodyStats).map(muscle => {
            const score = bodyStats[muscle];
            const ratio = score / maxScore;
            let freq = 1;
            if (ratio > 0.75) freq = 4;
            else if (ratio > 0.5) freq = 3;
            else if (ratio > 0.25) freq = 2;

            return {
                name: muscle,
                muscles: [muscle],
                frequency: freq,
                score: score
            };
        });
    }, [muscleStats]);

    // Prepare data for Radar Chart
    const radarData = useMemo(() => {
        return bodyData.map(item => ({
            muscle: radarLabels[item.name] || item.name,
            score: item.score,
            fullMark: Math.max(...bodyData.map(d=>d.score)) * 1.1 || 100
        }));
    }, [bodyData]);
`;

// Replace both radarData and bodyData with newBodyData
c = c.replace(/\/\/ Prepare data for Radar Chart[\s\S]*?\}, \[muscleStats\]\);/, newBodyData);

// Remove the old bodyData since we merged it above
c = c.replace(/\/\/ Prepare data for react-body-highlighter[\s\S]*?\}, \[muscleStats\]\);/, '');

// Fix the UI score reference (from stats.score to data.score)
c = c.replace(/selectedMuscle\.stats\?\.score/g, 'selectedMuscle.data?.score');

fs.writeFileSync('src/components/MuscleProgress.jsx', c);
console.log('done');
