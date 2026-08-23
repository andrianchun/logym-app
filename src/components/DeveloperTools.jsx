import React from 'react';
import { Database, Trash2 } from 'lucide-react';
import { getLocalYMD } from '../data/constants';

export default function DeveloperTools({ user, setHistory, t, theme }) {
  if (!user || user.email !== 'untheryan@gmail.com') return null;

  const generateDummyData = () => {
    if (!confirm("Are you sure you want to inject massive dummy data? This will overwrite your local history state and could sync to Firebase.")) return;

    const baseHR = 120;
    const createDummyHR = (seed) => {
        const dummyHrData = [
            baseHR - 40, baseHR - 35, baseHR - 25, baseHR - 15, baseHR - 5,
            baseHR, baseHR + 10, baseHR + 20, baseHR + 15, baseHR + 25,
            baseHR + 30, baseHR + 35, baseHR + 25, baseHR + 35, baseHR + 20,
            baseHR + 10, baseHR - 5, baseHR - 10, baseHR + 5, baseHR + 15,
            baseHR + 5, baseHR - 10, baseHR - 20, baseHR - 30, baseHR - 40
        ].map(v => {
            const noise = ((seed * v) % 15) - 7;
            return Math.max(60, Math.min(Math.round(v + noise), 190));
        });
        
        return {
            points: dummyHrData.map((v, i) => ({ t: Date.now() + i*60000, v })),
            min: Math.min(...dummyHrData),
            max: Math.max(...dummyHrData),
            avg: Math.round(dummyHrData.reduce((a,b)=>a+b,0)/dummyHrData.length)
        };
    };

    setHistory(prev => {
        const next = { ...prev };
        const now = new Date();
        
        for (let i = 0; i < 15; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const ymd = getLocalYMD(d);
            
            if (!next[ymd]) next[ymd] = {};
            if (!next[ymd].bioData) next[ymd].bioData = {};
            
            // Add varied biometric and health connect dummy data
            next[ymd].bioData.sleep = 7.5 + (Math.random() * 2 - 1); // 6.5 - 8.5 hours
            next[ymd].bioData.sleepAwake = 0.5 + Math.random() * 0.5;
            next[ymd].bioData.sleepRem = 1.5 + Math.random();
            next[ymd].bioData.sleepLight = 4 + Math.random();
            next[ymd].bioData.sleepDeep = 1.5 + Math.random();
            
            // Create a realistic sleepLog array for hypnogram
            const sleepLog = [];
            let sleepTime = 1320; // 22:00
            for(let m = 0; m < 480; m++) {
                const hour = Math.floor(sleepTime / 60) % 24;
                const min = sleepTime % 60;
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                
                // Varied stages logic
                let stage = 1; // Light
                if (m < 20) stage = 3; // Awake
                else if (m < 120) stage = 0; // Deep
                else if (m > 360 && m % 90 < 30) stage = 2; // REM
                else if (m % 150 < 10) stage = 3; // Occasional brief awake
                
                sleepLog.push({ time: timeStr, stage });
                sleepTime++;
            }
            next[ymd].bioData.sleepLog = sleepLog;
            
            next[ymd].bioData.steps = 4000 + Math.floor(Math.random() * 6000);
            next[ymd].bioData.heartRate = 65 + Math.floor(Math.random() * 15);
            next[ymd].bioData.restingHeartRate = 55 + Math.floor(Math.random() * 10);
            next[ymd].bioData.oxygenSaturation = 96 + Math.floor(Math.random() * 4);
            
            // Generate some workouts
            const w1Id = `dummy_${ymd}_1`;
            const w1 = {
                id: w1Id,
                programId: 'adhoc',
                programName: 'Dummy Cardio Session ' + i,
                status: 'completed',
                duration: '00:30:00',
                calories: 300 + Math.floor(Math.random() * 200),
                hr: createDummyHR(i + 1)
            };
            
            if (!next[ymd].workouts) next[ymd].workouts = [];
            next[ymd].workouts.push(w1);
        }
        
        return next;
    });
    
    alert('Dummy data injected successfully into the last 15 days!');
  };

  const clearDummyData = () => {
    if (!confirm("Are you sure you want to clear ALL workouts containing 'dummy_' in their ID?")) return;
    
    setHistory(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(ymd => {
            if (next[ymd].workouts) {
                const hadDummy = next[ymd].workouts.some(w => w.id.startsWith('dummy_'));
                next[ymd].workouts = next[ymd].workouts.filter(w => !w.id.startsWith('dummy_'));
                
                if (hadDummy && next[ymd].bioData) {
                    delete next[ymd].bioData.sleep;
                    delete next[ymd].bioData.sleepAwake;
                    delete next[ymd].bioData.sleepRem;
                    delete next[ymd].bioData.sleepLight;
                    delete next[ymd].bioData.sleepDeep;
                    delete next[ymd].bioData.sleepLog;
                    delete next[ymd].bioData.steps;
                    delete next[ymd].bioData.heartRate;
                    delete next[ymd].bioData.restingHeartRate;
                    delete next[ymd].bioData.oxygenSaturation;
                }
            }
        });
        return next;
    });
    
    alert('Dummy data cleared successfully!');
  };

  return (
    <div className="mt-8 mb-4 p-4 border border-red-500/30 bg-red-500/5 rounded-xl">
        <div className="flex items-center gap-2 mb-3 text-red-500">
            <Database size={16} />
            <h3 className="text-xs font-black uppercase tracking-widest">Developer Tools</h3>
        </div>
        <p className={`text-[10px] mb-4 ${t.textMuted}`}>
            Only visible to untheryan@gmail.com. Use these tools to inject robust dummy data for testing UI rendering without a connected smartwatch.
        </p>
        <div className="flex flex-col gap-2">
            <a 
                href="/generator/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md hover:from-sky-400 hover:to-blue-500 transition-all text-center"
            >
                🚀 BUKA AI VIDEO & ASSET GENERATOR (PWA)
            </a>
            <div className="flex gap-2">
                <button 
                    onClick={generateDummyData}
                    className="flex-1 py-2 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-bold hover:bg-blue-500/20 transition-colors"
                >
                    INJECT DUMMY DATA
                </button>
                <button 
                    onClick={clearDummyData}
                    className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-red-500/20 transition-colors"
                >
                    <Trash2 size={12} /> CLEAR DUMMIES
                </button>
            </div>
        </div>
    </div>
  );
}
