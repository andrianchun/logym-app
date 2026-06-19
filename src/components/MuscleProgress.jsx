import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import Model from './react-body-highlighter/index.js';
import { ChevronDown } from 'lucide-react';
import { normalizeMuscleKey } from '../data/constants';

// Mapping from LyFit standard keys to react-body-highlighter muscle names
const muscleMapping = {
    'quadriceps': ['quadriceps'],
    'hamstring': ['hamstring'],
    'glutes': ['gluteal'],
    'calves': ['calves'],
    'core': ['abs', 'obliques'],
    'back_upper': ['upper-back'],
    'biceps': ['biceps'],
    'triceps': ['triceps'],
    'deltoid_front': ['front-deltoids'],
    'deltoid_rear': ['back-deltoids'],
    'deltoid_lateral': ['back-deltoids'],
    'trapezius': ['trapezius'],
    'neck': ['neck'],
    'chest_mid': ['chest'],
    'chest_upper': ['chest'],
    'chest_lower': ['chest'],
    'lats': ['lower-back'],
    'forearm': ['forearm'],
    'adductors': ['adductor', 'abductors'],
    'abductors': ['adductor', 'abductors']
};

export const MuscleProgress = ({ history, programs, exerciseLibrary, t, lang, theme, soundEnabled, playSoundEffect }) => {
    const [timeFilter, setTimeFilter] = useState('1m'); // '1m', '3m', 'all'
    const [viewMode, setViewMode] = useState('image'); // 'image' or 'radar'
    const [selectedMuscle, setSelectedMuscle] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const radarLabels = useMemo(() => ({
        "chest": { EN: "Chest", ID: "Dada" },
        "triceps": { EN: "Triceps", ID: "Triceps" },
        "front-deltoids": { EN: "Front Delt", ID: "Bahu Dpn" },
        "back-deltoids": { EN: "Rear Delt", ID: "Bahu Blk" },
        "biceps": { EN: "Biceps", ID: "Biceps" },
        "forearm": { EN: "Forearm", ID: "Lengan Bawah" },
        "abs": { EN: "Abs", ID: "Perut" },
        "obliques": { EN: "Obliques", ID: "Samping" },
        "quadriceps": { EN: "Quads", ID: "Paha Dpn" },
        "hamstring": { EN: "Hamstrings", ID: "Paha Blk" },
        "gluteal": { EN: "Glutes", ID: "Bokong" },
        "calves": { EN: "Calves", ID: "Betis" },
        "upper-back": { EN: "Upper Back", ID: "Punggung Atas" },
        "lower-back": { EN: "Lats", ID: "Punggung Bwh" },
        "trapezius": { EN: "Traps", ID: "Traps" },
        "neck": { EN: "Neck", ID: "Leher" },
        "head": { EN: "Head", ID: "Kepala" },
        "adductor": { EN: "Inner/Outer Thigh", ID: "Paha Dlm/Luar" },
        "abductors": { EN: "Inner/Outer Thigh", ID: "Paha Dlm/Luar" }
    }), []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter date based on timeFilter
    const filteredHistory = useMemo(() => {
        if (timeFilter === 'all') return history;
        const now = new Date();
        const cutoffDate = new Date();
        if (timeFilter === '1m') cutoffDate.setMonth(now.getMonth() - 1);
        else if (timeFilter === '3m') cutoffDate.setMonth(now.getMonth() - 3);

        const filtered = {};
        for (const [dateStr, dayData] of Object.entries(history)) {
            if (new Date(dateStr) >= cutoffDate) {
                filtered[dateStr] = dayData;
            }
        }
        return filtered;
    }, [history, timeFilter]);

    // Aggregate stats per muscle
    const muscleStats = useMemo(() => {
        const stats = {};
        
        // Build a lookup for exercise targets
        const exLookup = {};
        [...programs.map(p=>p.exercises).flat(), ...exerciseLibrary].forEach(ex => {
            exLookup[ex.id] = ex;
        });

        for (const dayData of Object.values(filteredHistory)) {
            if (!dayData || !dayData.workouts) continue;
            for (const workout of dayData.workouts) {
                if (!workout.log) continue;
                for (const [exIdStr, sets] of Object.entries(workout.log)) {
                    const baseId = typeof exIdStr === 'string' && exIdStr.includes('-') ? Number(exIdStr.split('-')[0]) : Number(exIdStr);
                    const ex = exLookup[baseId];
                    if (ex && sets) {
                        const exType = ex.type || 'weight';
                        const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
                        
                        let totalVolume = 0;
                        Object.values(sets).forEach(s => {
                            if (s && s.done) {
                                if (exType === 'weight') totalVolume += Number(s.w) * Number(s.r);
                                else if (exType === 'bodyweight') totalVolume += Number(s.r);
                                else if (exType === 'time') totalVolume += Number(s.d);
                            }
                        });

                        if (totalVolume > 0) {
                            exTargets.forEach(t => {
                                const normalized = normalizeMuscleKey(t);
                                if (normalized !== 'cardio' && normalized !== 'full_body') {
                                    stats[normalized] = (stats[normalized] || 0) + totalVolume;
                                }
                            });
                        }
                    }
                }
            }
        }
        return stats;
    }, [filteredHistory, programs, exerciseLibrary]);

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
            if (ratio >= 0.8) freq = 5;
            else if (ratio >= 0.6) freq = 4;
            else if (ratio >= 0.4) freq = 3;
            else if (ratio >= 0.2) freq = 2;

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
        const orderedMuscles = [
            'neck', 'trapezius', 
            'front-deltoids', 'back-deltoids', 
            'chest', 'upper-back', 'lower-back', 
            'biceps', 'triceps', 'forearm', 
            'abs', 'obliques', 
            'quadriceps', 'adductor', 'gluteal', 'hamstring', 
            'calves'
        ];

        return [...bodyData]
            .sort((a, b) => orderedMuscles.indexOf(a.name) - orderedMuscles.indexOf(b.name))
            .map(item => ({
                muscle: radarLabels[item.name]?.[lang?.id] || item.name,
                score: item.score,
                fullMark: Math.max(...bodyData.map(d=>d.score)) * 1.1 || 100
            }));
    }, [bodyData, lang]);

    return (
        <div className="p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className={`${t.textMain} font-black body-md uppercase tracking-wider`}>Progres Otot</h3>
                
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => { playSoundEffect('click', soundEnabled); setIsDropdownOpen(!isDropdownOpen); }}
                        className={`body-sm font-bold p-2 pl-3 pr-2 rounded-xl flex items-center justify-between space-x-2 ${t.inputBg} ${t.textMain} border ${t.border} transition-colors`}
                    >
                        <span>{timeFilter === '1m' ? '1 Bulan Terakhir' : timeFilter === '3m' ? '3 Bulan Terakhir' : 'Keseluruhan'}</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                        <div className={`absolute top-full right-0 mt-2 w-44 rounded-xl border ${t.border} ${t.bgCard} shadow-lg overflow-hidden z-[60] animate-in zoom-in-95 origin-top-right`}>
                            {[
                                { val: '1m', label: '1 Bulan Terakhir' },
                                { val: '3m', label: '3 Bulan Terakhir' },
                                { val: 'all', label: 'Keseluruhan' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => {
                                        playSoundEffect('click', soundEnabled);
                                        setTimeFilter(opt.val);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 body-sm font-bold transition-colors ${timeFilter === opt.val ? t.textAccent + ' bg-emerald-500/10 dark:bg-emerald-500/10' : t.textMuted + ' hover:' + t.textMain + ' hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg} mb-6`}>
               <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: viewMode === 'image' ? 'translateX(0)' : 'translateX(100%)', left: '6px' }}></div>
               
               <button onClick={() => { playSoundEffect('click', soundEnabled); setViewMode('image');}} className={`flex-1 py-2.5 rounded-full body-md font-black relative z-10 transition-colors duration-300 ${viewMode === 'image' ? 'text-white' : t.textMuted}`}>Visual Otot</button>
               <button onClick={() => { playSoundEffect('click', soundEnabled); setViewMode('radar');}} className={`flex-1 py-2.5 rounded-full body-md font-black relative z-10 transition-colors duration-300 ${viewMode === 'radar' ? 'text-white' : t.textMuted}`}>Grafik Radar</button>
            </div>

            <div className="relative min-h-[350px] flex justify-center items-center">
                {viewMode === 'image' ? (
                    <div className="flex flex-row gap-2 sm:gap-8 justify-center items-start w-full">
                        <div className="flex flex-col items-center w-1/2 max-w-[180px]">
                            <h3 className={`body-md mb-4 uppercase text-center ${t.textMuted}`}>Anterior (Depan)</h3>
                            <Model
                                data={bodyData}
                                style={{ width: '100%' }}
                                bodyColor={theme === 'dark' ? '#27272a' : '#cbd5e1'}
                                highlightedColors={theme === 'dark' ? ['#315975', '#41759b', '#528cb8', '#629bc4', '#84c2ed'] : ['#d4b162', '#c49f4b', '#B79347', '#927334', '#735925']}
                                type="anterior"
                                onMouseOver={(data, e) => {
                                    const rect = e.target.getBoundingClientRect();
                                    setTooltipPos({ left: rect.left + rect.width / 2, top: rect.top });
                                    setSelectedMuscle(data);
                                }}
                                onMouseOut={() => setSelectedMuscle(null)}
                            />
                        </div>
                        <div className="flex flex-col items-center w-1/2 max-w-[180px]">
                            <h3 className={`body-md mb-4 uppercase text-center ${t.textMuted}`}>Posterior (Belakang)</h3>
                            <Model
                                data={bodyData}
                                style={{ width: '100%' }}
                                bodyColor={theme === 'dark' ? '#27272a' : '#cbd5e1'}
                                highlightedColors={theme === 'dark' ? ['#315975', '#41759b', '#528cb8', '#629bc4', '#84c2ed'] : ['#d4b162', '#c49f4b', '#B79347', '#927334', '#735925']}
                                type="posterior"
                                onMouseOver={(data, e) => {
                                    const rect = e.target.getBoundingClientRect();
                                    setTooltipPos({ left: rect.left + rect.width / 2, top: rect.top });
                                    setSelectedMuscle(data);
                                }}
                                onMouseOut={() => setSelectedMuscle(null)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-[350px]">
                        {radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "55%" : "70%"} data={radarData}>
                                    <PolarGrid stroke={theme === 'dark' ? '#3f3f46' : '#e2e8f0'} />
                                    <PolarAngleAxis dataKey="muscle" tick={{ fill: theme === 'dark' ? '#a1a1aa' : '#64748b', fontSize: 10, fontWeight: 700 }} />
                                    <Radar name="Skor Otot" dataKey="score" stroke={theme === 'dark' ? '#629bc4' : '#B79347'} fill={theme === 'dark' ? '#41759b' : '#B79347'} fillOpacity={0.6} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ color: theme === 'dark' ? '#a6e8ff' : '#B79347', fontWeight: 900 }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={`absolute inset-0 flex items-center justify-center ${t.textMuted} body-md`}>Belum ada data latihan untuk grafik radar.</div>
                        )}
                    </div>
                )}
            </div>

            {selectedMuscle && viewMode === 'image' && (
                <div 
                    className="fixed z-[100] pointer-events-none transition-opacity duration-200"
                    style={{ 
                        left: tooltipPos.left, 
                        top: tooltipPos.top - 10,
                        transform: 'translate(-50%, -100%)',
                        backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid ' + (theme === 'dark' ? '#3f3f46' : '#e2e8f0'),
                        padding: '8px 12px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                >
                    <div className="flex flex-col">
                        {selectedMuscle.muscle === 'back-deltoids' ? (
                            <>
                                <span style={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    {lang?.id === 'EN' ? 'Lateral Delt' : 'Bahu Samping'}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a6e8ff' : '#B79347', fontSize: '11px', fontWeight: 900, marginBottom: '6px' }}>
                                    Skor Otot : {Math.round(muscleStats['deltoid_lateral'] || 0)}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    {lang?.id === 'EN' ? 'Rear Delt' : 'Bahu Blk'}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a6e8ff' : '#B79347', fontSize: '11px', fontWeight: 900 }}>
                                    Skor Otot : {Math.round(muscleStats['deltoid_rear'] || 0)}
                                </span>
                            </>
                        ) : (selectedMuscle.muscle === 'adductor' || selectedMuscle.muscle === 'abductors') ? (
                            <>
                                <span style={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    {lang?.id === 'EN' ? 'Adductors' : 'Paha Dlm'}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a6e8ff' : '#B79347', fontSize: '11px', fontWeight: 900, marginBottom: '6px' }}>
                                    Skor Otot : {Math.round(muscleStats['adductors'] || 0)}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    {lang?.id === 'EN' ? 'Abductors' : 'Paha Luar'}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a6e8ff' : '#B79347', fontSize: '11px', fontWeight: 900 }}>
                                    Skor Otot : {Math.round(muscleStats['abductors'] || 0)}
                                </span>
                            </>
                        ) : (
                            <>
                                <span style={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    {radarLabels[selectedMuscle.muscle]?.[lang?.id || 'ID'] || selectedMuscle.muscle}
                                </span>
                                <span style={{ color: theme === 'dark' ? '#a6e8ff' : '#B79347', fontSize: '11px', fontWeight: 900 }}>
                                    Skor Otot : {Math.round(bodyData.find(d => d.name === selectedMuscle.muscle)?.score || 0)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
