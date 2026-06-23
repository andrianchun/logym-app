import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Zap, Brain, Footprints, HeartPulse, Moon, Droplets, Droplet, Dumbbell, Scale, RefreshCw, Trophy, Link2, Pencil, Settings, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getLocalYMD } from '../data/constants';
import { HealthConnect } from 'capacitor-health-connect';
import DashboardModals from '../components/DashboardModals';
import DashboardChart from '../components/DashboardChart';
import ProgressTab from './ProgressTab';
import { MuscleProgress } from '../components/MuscleProgress';
import SwipeInput from '../components/SwipeInput';
import { formatNumber } from '../utils/numberFormat';

const MetricBox = ({ label, value, unit, icon, color, t, theme }) => (
    <div className={`p-4 rounded-2xl flex flex-col justify-between ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'} border ${t.border}`}>
        <div className="flex justify-between items-start mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-${color}-500/20 text-${color}-500`}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-wider`}>{label}</span>
        </div>
        <div className="flex items-baseline space-x-1 justify-end mt-2">
            <span className={`h1 ${t.textMain}`}>{value || '-'}</span>
            <span className={`text-[10px] font-bold ${t.textMuted}`}>{unit}</span>
        </div>
    </div>
);

const MiniBox = ({ label, value, unit, t, theme }) => (
    <div className={`p-3 rounded-xl flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'} border ${t.border}`}>
        <span className={`h2 ${t.textMain}`}>{value || '-'}</span>
        <span className={`text-[9px] font-bold ${t.textMuted} mt-1 uppercase tracking-wider`}>{label}</span>
    </div>
);

const DashboardTab = ({ t, lang, language, user, history, setHistory, programs, exerciseLibrary, navigateToWorkoutDate, soundEnabled, playSoundEffect, theme, selectedDate, biometricStandard, unitSystem, setConfirmModal, activityTargets, setActivityTargets, gymProfiles, activeGymId }) => {
  const todayStr = getLocalYMD(new Date());
  const activeDate = todayStr; // Selalu tampilkan hari ini, terlepas dari kalender latihan

  // ==========================================
  // STATE KONEKSI & SINKRONISASI
  // ==========================================
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [connectedApps, setConnectedApps] = useState(() => {
      const saved = localStorage.getItem('lyfit_connectedApps');
      return saved ? JSON.parse(saved) : { healthconnect: false, lyfeat: false };
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // ==========================================
  // STATE MODAL INPUT MANUAL & TANGGAL
  // ==========================================
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTab, setManualTab] = useState('komposisi');
  const [modalDate, setModalDate] = useState(activeDate);
  const [isProgressExpanded, setIsProgressExpanded] = useState(true);
  
  // TARGET SETTINGS
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState(activityTargets || { steps: 10000, weeklyDuration: 150, sleep: 8 });

  useEffect(() => {
     if (activityTargets) {
        setTargetForm(activityTargets);
     }
  }, [activityTargets]);

  const handleSaveTargets = () => {
     playSoundEffect('click', soundEnabled);
     setActivityTargets(targetForm);
     setShowTargetModal(false);
  };

  const parseSleepHours = (str) => {
      const parts = (str || '').match(/(\d+)h\s*(\d+)m/);
      if (parts) return parseInt(parts[1]) + (parseInt(parts[2]) / 60);
      return 0;
  };
  const [isKomposisiExpanded, setIsKomposisiExpanded] = useState(true);

  const emptyBio = {
    bodyScore: 0, weight: 0, height: 0, bmi: 0, bmiStatus: '-', bodyFat: 0, bodyFatStatus: '-',
    muscleMass: 0, musclePercent: 0, waterPercent: 0, visceralFat: 0, bmr: 0, bodyAge: 0, 
    waist: 0, waistToHip: 0, proteinPercent: 0, bodyType: '-', weightSuggestion: '-',
    steps: 0, activeMinutes: 0, activityCalories: 0, sleep: '', energyScore: 0, 
    heartRate: 0, minHeartRate: 0, maxHeartRate: 0, bloodPressure: '', waterIntake: 0,
    weeklyDuration: 0, weeklySessions: 0, weeklyCalories: 0
  };

  const [formBio, setFormBio] = useState({ ...emptyBio });

  const { bioData, bioDataDate } = useMemo(() => {
     let latestBodyData = null;
     let bodyDataDate = null;
     let todayDailyData = history[activeDate]?.bioData || {};
     
     const sortedDates = Object.keys(history).filter(d => d <= activeDate).sort((a,b) => b.localeCompare(a));
     for (let date of sortedDates) {
         const dayBio = history[date]?.bioData;
         if (dayBio && dayBio.weight > 0) {
             latestBodyData = dayBio;
             bodyDataDate = date;
             break;
         }
     }
     
     const mergedData = {
         ...emptyBio,
         height: 170, 
         weight: 70,
         ...(latestBodyData || {}),
         steps: todayDailyData.steps || 0,
         activeMinutes: todayDailyData.activeMinutes || 0,
         activityCalories: todayDailyData.activityCalories || 0,
         sleep: todayDailyData.sleep || '',
         energyScore: todayDailyData.energyScore || 0,
         heartRate: todayDailyData.heartRate || 0,
         minHeartRate: todayDailyData.minHeartRate || 0,
         maxHeartRate: todayDailyData.maxHeartRate || 0,
         bloodPressure: todayDailyData.bloodPressure || '',
         waterIntake: todayDailyData.waterIntake || 0,
     };
     
     return { 
         bioData: mergedData,
         bioDataDate: bodyDataDate
     };
  }, [history, todayStr]);

  // ==========================================
  // FUNGSI AKSI (TOMBOL & FORM)
  // ==========================================
  const handleToggleApp = (appKey) => {
     setConnectedApps(prev => {
         const next = { ...prev, [appKey]: !prev[appKey] };
         localStorage.setItem('lyfit_connectedApps', JSON.stringify(next));
         return next;
     });
  };

  const runAutoSync = async () => {
     if (!connectedApps.healthconnect) return;
     setIsSyncing(true);
     try {
         const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
         const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
         
         const result = await HealthConnect.readRecords({
             type: 'Steps',
             timeRangeFilter: { startTime: startOfDay.toISOString(), endTime: endOfDay.toISOString() }
         });
         
         let totalSteps = 0;
         if (result && result.records) {
             result.records.forEach(record => totalSteps += (record.count || 0));
         }
         
         if (totalSteps > 0) {
             setHistory(prev => {
                 const currentSteps = prev[todayStr]?.bioData?.steps || 0;
                 if (totalSteps > currentSteps) {
                     return {
                         ...prev,
                         [todayStr]: {
                             ...(prev[todayStr] || {}),
                             bioData: { ...(prev[todayStr]?.bioData || emptyBio), steps: totalSteps }
                         }
                     };
                 }
                 return prev;
             });
         }
     } catch (err) {
         console.error("Auto-sync Health Connect error:", err);
     }
     setTimeout(() => setIsSyncing(false), 800); 
  };

  useEffect(() => {
     runAutoSync();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedApps.healthconnect]);

  useEffect(() => {
     if (showManualModal) {
         if (history[modalDate] && history[modalDate].bioData) {
             setFormBio(history[modalDate].bioData);
         } else {
             setFormBio({ ...emptyBio });
         }
     }
  }, [modalDate, showManualModal, history]);

  const evaluateBiometrics = (data) => {
     let newData = { ...data };
     if (newData.height > 0 && newData.weight > 0) {
         const hMeter = newData.height / 100;
         newData.bmi = Number((newData.weight / (hMeter * hMeter)).toFixed(1));
         
         if (biometricStandard === 'western') {
             if (newData.bmi < 18.5) newData.bmiStatus = 'Underweight';
             else if (newData.bmi <= 24.9) newData.bmiStatus = 'Normal';
             else if (newData.bmi <= 29.9) newData.bmiStatus = 'Overweight';
             else newData.bmiStatus = 'Obese';
         } else {
             if (newData.bmi < 18.5) newData.bmiStatus = 'Underweight';
             else if (newData.bmi <= 22.9) newData.bmiStatus = 'Normal';
             else if (newData.bmi <= 24.9) newData.bmiStatus = 'Overweight';
             else newData.bmiStatus = 'Obese';
         }
     }
     if (newData.bodyFat > 0) {
         if (newData.bodyFat < 10) newData.bodyFatStatus = 'Rendah';
         else if (newData.bodyFat <= 20) newData.bodyFatStatus = 'Normal';
         else if (newData.bodyFat <= 25) newData.bodyFatStatus = 'Overfat';
         else newData.bodyFatStatus = 'Obese';
     }
     return newData;
  };

  const getScoreColor = (score) => {
      if (!score) return 'text-zinc-500 border-zinc-500/30';
      if (score >= 90) return 'text-emerald-500 border-emerald-500/50';
      if (score >= 80) return 'text-lime-500 border-lime-500/50';
      if (score >= 60) return 'text-amber-500 border-amber-500/50';
      return 'text-rose-500 border-rose-500/50';
  };

  const handleSaveManualData = () => {
     playSoundEffect('click', soundEnabled);
     const evaluatedData = evaluateBiometrics(formBio);
     
     setHistory(prev => ({
         ...prev,
         [modalDate]: {
             ...(prev[modalDate] || {}),
             bioData: evaluatedData
         }
     }));
     setShowManualModal(false);
  };

  const handleDeleteBioData = () => {
     playSoundEffect('click', soundEnabled);
     setHistory(prev => {
         const newHistory = { ...prev };
         if (newHistory[modalDate] && newHistory[modalDate].bioData) {
             const currentBio = newHistory[modalDate].bioData;
             const newBio = { ...currentBio };
             
             if (manualTab === 'komposisi') {
                 ['weight', 'height', 'waist', 'bmi', 'bmiStatus', 'bodyFat', 'bodyFatStatus', 'bmr', 'muscleMass', 'musclePercent', 'visceralFat', 'waterPercent', 'proteinPercent', 'bodyAge', 'bodyScore'].forEach(k => newBio[k] = null);
             } else {
                 ['steps', 'energyScore', 'activeMinutes', 'activityCalories', 'sleep', 'sleepLog', 'heartRate', 'minHeartRate', 'maxHeartRate', 'bloodPressure', 'waterIntake', 'weeklyDuration', 'weeklySessions', 'weeklyCalories'].forEach(k => newBio[k] = null);
             }
             
             const isCompletelyEmpty = Object.values(newBio).every(v => v === null || v === undefined || v === '');
             
             if (isCompletelyEmpty) {
                 if (!newHistory[modalDate].programId && !newHistory[modalDate].status && (!newHistory[modalDate].workouts || newHistory[modalDate].workouts.length === 0)) {
                     newHistory[modalDate] = { _delete: true };
                 } else {
                     newHistory[modalDate] = { ...newHistory[modalDate], bioData: null };
                 }
             } else {
                 newHistory[modalDate] = { ...newHistory[modalDate], bioData: newBio };
             }
         }
         return newHistory;
     });
     setShowManualModal(false);
  };

  const handleChartPointClick = (clickedDateStr) => {
      playSoundEffect('click', soundEnabled);
      setModalDate(clickedDateStr);
      setManualTab('komposisi');
      setShowManualModal(true);
  };



  const isAnyAppConnected = connectedApps.healthconnect || connectedApps.lyfeat;
  const scoreStyle = getScoreColor(bioData.bodyScore);
  const isImp = unitSystem === 'imperial';
  const dispMainMuscle = isImp && bioData.muscleMass ? Number((bioData.muscleMass * 2.20462).toFixed(1)) : bioData.muscleMass || '-';
  const dispMainWaist = isImp && bioData.waist ? Number((bioData.waist * 0.393701).toFixed(1)) : bioData.waist || '-';

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-6">
      
      {/* HEADER & INTEGRASI APPS */}
      <div className="pt-2 flex justify-between items-center mb-2">
         <div>
            <h1 className={`h1 ${t.textMain}`}>Halo, {user?.name?.split(' ')[0] || 'Kawan'} 👋</h1>
            <div className="flex items-center space-x-2 mt-1">
               <p className={`body-md ${t.textMuted}`}>{new Date().toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
               <span className={`text-[10px] ${t.textMuted}`}>•</span>
               <div className={`flex items-center gap-1 ${t.textMuted}`}>
                 <Dumbbell size={12} />
                 <span className="body-md font-bold text-[13px]">{gymProfiles?.find(g => g.id === activeGymId)?.name || 'Lyfit Gym'}</span>
               </div>
            </div>
         </div>
         
         <div className="flex flex-col space-y-2 items-end">
             <button onClick={() => { playSoundEffect('click', soundEnabled); setShowSyncModal(true); }} className={`p-2 rounded-full border transition-all ${isAnyAppConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : t.btnBg + ' ' + t.border + ' ' + t.textMuted}`}>
                <Link2 size={16} />
             </button>
             {isSyncing && (
                 <div className="flex items-center space-x-1 mt-1">
                    <RefreshCw size={10} className={`animate-spin ${t.textMuted}`} />
                    <span className={`caption ${t.textMuted}`}>Syncing...</span>
                 </div>
             )}
         </div>
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-6 sm:items-start space-y-4 sm:space-y-0">
      {/* --- GRUP KOMPOSISI & BIOMETRIK --- */}
      <div className="flex flex-col space-y-4">
        {/* 1. KARTU BODY COMPOSITION & EXPANDED CHART */}
        <div className="flex flex-col w-full min-w-0">
          <div className={`p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm relative overflow-hidden z-10`}>
           <div className="flex justify-between items-center mb-5 relative z-10">
               <div>
                   <h3 className={`h3 ${t.textMain}`}>Komposisi Tubuh</h3>
                   {bioDataDate && bioDataDate !== activeDate && (
                       <p className={`caption ${t.textMuted} mt-0.5`} style={{fontSize: '0.65rem'}}>Data dari: {new Date(bioDataDate).toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' })}</p>
                   )}
               </div>
               <div className="flex items-center space-x-2">
                   <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(bioDataDate || activeDate); setShowDetailsModal(true); }} className={`p-1.5 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Info size={14}/></button>
                   <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(activeDate); setManualTab('komposisi'); setShowManualModal(true); }} className={`p-1.5 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Pencil size={14}/></button>
               </div>
           </div>
           
           <div className="flex items-center space-x-6 mb-5 relative z-10">
               <div className={`w-20 h-20 shrink-0 rounded-full flex flex-col items-center justify-center border-[3px] ${scoreStyle} shadow-sm`}>
                  <span className="h1">{formatNumber(bioData.bodyScore, language) || '-'}</span>
                  <span className="h3 mt-1 opacity-70">SCORE</span>
               </div>
               <div className="flex-1 space-y-3">
                   <div className="flex justify-between items-center border-b border-dashed border-slate-500/20 pb-2">
                       <span className={`caption ${t.textMuted}`}>BMI ({biometricStandard === 'western' ? 'Western' : 'Asia'})</span>
                       <div className="text-right flex items-center space-x-1.5">
                          <span className={`h2 ${t.textMain}`}>{formatNumber(bioData.bmi, language) || '-'}</span>
                          <span className={`h3 ${bioData.bmiStatus === 'Normal' ? 'text-emerald-500' : bioData.bmiStatus === 'Overweight' ? 'text-amber-500' : bioData.bmiStatus === 'Obese' ? 'text-rose-500' : 'text-blue-500'}`}>{bioData.bmiStatus}</span>
                       </div>
                   </div>
                   <div className="flex justify-between items-center pb-1">
                       <span className={`caption ${t.textMuted}`}>Body Fat</span>
                       <div className="text-right flex items-center space-x-1.5">
                          <span className={`h2 ${t.textMain}`}>{formatNumber(bioData.bodyFat, language) || '-'} <span className="caption font-normal text-zinc-500">%</span></span>
                          <span className={`h3 ${bioData.bodyFatStatus === 'Normal' ? 'text-emerald-500' : bioData.bodyFatStatus === 'Overfat' ? 'text-amber-500' : bioData.bodyFatStatus === 'Obese' ? 'text-rose-500' : 'text-blue-500'}`}>{bioData.bodyFatStatus}</span>
                       </div>
                   </div>
               </div>
           </div>
  
           <div className="grid grid-cols-4 gap-2 relative z-10 pt-4 border-t border-dashed border-slate-500/20">
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.bmr, language) || '-'}</span><span className={`h3 ${t.textMuted} mt-0.5`}>BMR</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{dispMainMuscle} <span className="caption font-normal text-zinc-500">{isImp ? 'lbs' : 'kg'}</span></span><span className={`h3 ${t.textMuted} mt-0.5`}>Massa Otot</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.musclePercent, language) || '-'} <span className="caption font-normal text-zinc-500">%</span></span><span className={`h3 ${t.textMuted} mt-0.5`}>Kadar Otot</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.visceralFat, language) || '-'}</span><span className={`h3 ${t.textMuted} mt-0.5`}>Visceral</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.waterPercent, language) || '-'} <span className="caption font-normal text-zinc-500">%</span></span><span className={`h3 ${t.textMuted} mt-0.5`}>Kadar Air</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.proteinPercent, language) || '-'} <span className="caption font-normal text-zinc-500">%</span></span><span className={`h3 ${t.textMuted} mt-0.5`}>Protein</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{dispMainWaist} <span className="caption font-normal text-zinc-500">{isImp ? 'in' : 'cm'}</span></span><span className={`h3 ${t.textMuted} mt-0.5`}>L. Perut</span></div>
               <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center text-center"><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.bodyAge, language) || '-'} <span className="caption font-normal text-zinc-500">th</span></span><span className={`h3 ${t.textMuted} mt-0.5`}>Usia Tubuh</span></div>
           </div>
           
           <button 
               onClick={() => { playSoundEffect('click', soundEnabled); setIsKomposisiExpanded(!isKomposisiExpanded); }}
               className="w-full flex items-center justify-center pt-1.5 pb-2.5 -mb-2 mt-2 text-zinc-500 hover:text-emerald-500 transition-colors"
           >
               {isKomposisiExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
           </button>
          </div>
  
          {isKomposisiExpanded && (
              <div className={`rounded-b-3xl border border-t-0 ${t.border} ${theme === 'dark' ? 'bg-[#061626]' : 'bg-[#f0f2f5]'} shadow-inner -mt-6 pt-6 relative z-0 animate-in slide-in-from-top-4 fade-in`}>
              <DashboardChart 
                 t={t} theme={theme} history={history} 
                 soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
                 onPointClick={handleChartPointClick}
                 isSubCard={true}
                 unitSystem={unitSystem}
              />
              </div>
          )}
        </div>

      {/* 2. KARTU AKTIVITAS HARIAN & MINGGUAN */}
      <div className={`p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm`}>
         <div className="flex justify-between items-center mb-4">
             <h3 className={`h3 ${t.textMain}`}>Aktivitas Harian</h3>
             <div className="flex space-x-2">
                 <button onClick={() => { playSoundEffect('click', soundEnabled); setShowTargetModal(true); }} className={`p-1.5 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Settings size={14}/></button>
                 <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(activeDate); setManualTab('harian'); setShowManualModal(true); }} className={`p-1.5 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Pencil size={14}/></button>
             </div>
         </div>

         <div className="flex flex-col space-y-4 mb-4">
             {/* Row 1: Langkah Kaki & Detak Jantung */}
             <div className="flex justify-between items-center border-b border-dashed border-slate-500/20 pb-3">
                 <div className="flex flex-col w-[45%]">
                     <div className="flex items-center space-x-1.5 mb-1 text-emerald-500"><Footprints size={14}/> <span className={`caption ${t.textMuted} capitalize`}>Langkah Kaki</span></div>
                     <div className="flex items-baseline space-x-1">
                         <span className={`h1 ${t.textMain}`}>{formatNumber(bioData.steps, language) || '0'}</span>
                         <span className="caption text-zinc-500 font-bold">/ {formatNumber(activityTargets?.steps || 10000, language)}</span>
                     </div>
                     <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full my-1.5 overflow-hidden">
                         <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (Number(bioData.steps || 0) / (activityTargets?.steps || 10000)) * 100)}%` }}></div>
                     </div>
                     <span className="caption text-zinc-500">{formatNumber(bioData.activeMinutes, language) || '0'} Menit Aktif • {formatNumber(bioData.activityCalories, language) || '0'} kcal</span>
                 </div>
                 <div className="flex flex-col text-right items-end">
                     <div className="flex items-center space-x-1.5 mb-1 text-rose-500"><span className={`caption ${t.textMuted} capitalize`}>Detak Jantung</span> <HeartPulse size={14}/></div>
                     <span className={`h1 ${t.textMain}`}>{formatNumber(bioData.heartRate, language) || '-'} <span className="caption font-normal text-zinc-500">bpm</span></span>
                     <span className="caption text-zinc-500 mt-0.5">Min {formatNumber(bioData.minHeartRate, language) || '-'} • Max {formatNumber(bioData.maxHeartRate, language) || '-'}</span>
                 </div>
             </div>
             
             {/* Row 2: Tidur & Tekanan Darah */}
             <div className="flex justify-between items-center border-b border-dashed border-slate-500/20 pb-3">
                 <div className="flex flex-col w-[45%]">
                     <div className="flex items-center space-x-1.5 mb-1 text-indigo-400"><Moon size={14}/> <span className={`caption ${t.textMuted} capitalize`}>Tidur & Energi</span></div>
                     <div className="flex items-baseline space-x-1">
                         <span className={`h1 ${t.textMain}`}>{bioData.sleep || '0h 0m'}</span>
                     </div>
                     <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full my-1.5 overflow-hidden">
                         <div className="h-full bg-indigo-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (parseSleepHours(bioData.sleep) / (activityTargets?.sleep || 8)) * 100)}%` }}></div>
                     </div>
                     <span className="caption text-zinc-500">Score: <span className="text-amber-500">{formatNumber(bioData.energyScore, language) || '-'}</span> / 100</span>
                 </div>
                 <div className="flex flex-col text-right items-end">
                     <div className="flex items-center space-x-1.5 mb-1 text-blue-400"><span className={`caption ${t.textMuted} capitalize`}>Tekanan Darah</span> <Activity size={14}/></div>
                     <span className={`h1 ${t.textMain}`}>{bioData.bloodPressure || '-'}</span>
                     <span className="caption text-zinc-500 mt-0.5">Sistolik / Diastolik</span>
                 </div>
             </div>
         </div>

         {(() => {
             const weeklyDur = Number(bioData.weeklyDuration || 0);
             const targetDur = activityTargets?.weeklyDuration || 150;
             const weeklyProgress = Math.min(100, (weeklyDur / targetDur) * 100);
             const isGoalReached = weeklyDur >= targetDur;
             
             return (
                 <div className={`relative p-4 rounded-2xl border ${isGoalReached ? t.borderAccent : t.border} overflow-hidden flex justify-between items-center shadow-sm`}>
                     {/* Background progress bar */}
                     <div className="absolute inset-0 bg-black/5 dark:bg-white/5"></div>
                     <div className={`absolute top-0 bottom-0 left-0 ${t.bgAccent} transition-all duration-1000 opacity-15 dark:opacity-25`} style={{ width: `${weeklyProgress}%` }}></div>
                     
                     <div className="flex items-center space-x-3 relative z-10">
                         <div className={`p-2 rounded-xl transition-colors duration-500 ${isGoalReached ? t.bgAccent : 'bg-black/10 dark:bg-white/10'}`}>
                             <Trophy size={20} className={isGoalReached ? 'text-white dark:text-black' : t.textMuted} fill={isGoalReached ? 'currentColor' : 'none'}/>
                         </div>
                         <div className="flex flex-col">
                             <span className={`body-lg font-black ${t.textMain}`}>Total Olahraga Mingguan</span>
                             <span className={`caption ${t.textMuted}`}>{formatNumber(bioData.weeklySessions, language) || '0'} Sesi • {formatNumber(bioData.weeklyCalories, language) || '0'} kcal</span>
                         </div>
                     </div>
                     <div className="flex items-baseline space-x-1 relative z-10">
                         <span className={`h1 ${isGoalReached ? t.textAccent : t.textMain}`}>{formatNumber(weeklyDur, language) || '0'}</span>
                         <span className="caption text-zinc-500 font-bold">/ {formatNumber(targetDur, language)}</span>
                     </div>
                 </div>
             );
         })()}
      </div>
      </div>

      {/* --- GRUP PROGRESS --- */}
      <div className="flex flex-col w-full min-w-0">
        {/* SECTION: PROGRESS TAB — Main card */}
        <div className={`rounded-2xl border ${t.border} ${t.bgCard} shadow-sm relative z-10 flex flex-col`}>
        <ProgressTab 
          t={t} lang={lang} language={language} theme={theme} 
          history={history} programs={programs} exerciseLibrary={exerciseLibrary} 
          soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
          selectedDate={selectedDate}
          isSubCard={false}
          unitSystem={unitSystem}
        />
        <button 
             onClick={() => { playSoundEffect('click', soundEnabled); setIsProgressExpanded(!isProgressExpanded); }}
             className="w-full flex items-center justify-center pt-1.5 pb-2.5 text-zinc-500 hover:text-emerald-500 transition-colors"
         >
             {isProgressExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
         </button>
      </div>
      {isProgressExpanded && (
          <div className={`rounded-b-3xl border border-t-0 ${t.border} ${theme === 'dark' ? 'bg-[#061626]' : 'bg-[#f0f2f5]'} shadow-inner -mt-6 pt-6 relative z-0 animate-in slide-in-from-top-4 fade-in`}>
            <MuscleProgress 
              t={t} theme={theme} lang={lang}
              history={history} programs={programs} exerciseLibrary={exerciseLibrary}
              soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
              isSubCard={true}
            />
          </div>
      )}
      </div>
      </div>

      {/* MODULAR MODALS */}
      <DashboardModals 
        t={t} lang={lang} theme={theme}
        showSyncModal={showSyncModal} setShowSyncModal={setShowSyncModal} connectedApps={connectedApps}
        showManualModal={showManualModal} setShowManualModal={setShowManualModal} manualTab={manualTab} setManualTab={setManualTab}
        modalDate={modalDate} setModalDate={setModalDate} formBio={formBio} setFormBio={setFormBio} bioData={bioData}
        handleSaveManualData={handleSaveManualData} handleDeleteBioData={handleDeleteBioData} soundEnabled={soundEnabled}
        unitSystem={unitSystem} setConfirmModal={setConfirmModal}
      />

      {/* DETAIL BIOMETRIK MODAL */}
      {showDetailsModal && createPortal((
        <div className={`fixed inset-0 -top-24 -bottom-24 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in ${t.textMain} font-sans`} onClick={() => setShowDetailsModal(false)}>
           <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border}`} onClick={(e) => e.stopPropagation()}>
               {/* Modal Header */}
               <div className="flex justify-between items-center px-6 pt-6 pb-2 shrink-0">
                   <div className="flex items-center space-x-2">
                       <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Activity size={12}/></div>
                       <div className="flex flex-col">
                           <span className={`text-[10px] font-bold ${t.textMain}`}>Lyfit Analysis</span>
                           <div className="relative flex items-center w-max cursor-pointer">
                               <span className={`text-[8px] ${t.textAccent} underline decoration-dashed underline-offset-2 mt-0.5`}>{new Date(modalDate || Date.now()).toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                               <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} onClick={(e) => { try { e.target.showPicker() } catch(err){} }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                           </div>
                       </div>
                   </div>
                   <button onClick={() => setShowDetailsModal(false)} className={`p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${t.textMain}`}><X size={16}/></button>
               </div>

               <div className="flex-1 overflow-y-auto px-4 pb-10 hide-scrollbar space-y-3">
                   {(() => {
                       const displayBioData = history[modalDate]?.bioData || emptyBio;
                       const dispWeight = isImp && displayBioData.weight ? Number((displayBioData.weight * 2.20462).toFixed(1)) : displayBioData.weight || '0';
                       const dispMuscle = isImp && displayBioData.muscleMass ? Number((displayBioData.muscleMass * 2.20462).toFixed(1)) : displayBioData.muscleMass || 0;
                       const dispWaist = isImp && displayBioData.waist ? Number((displayBioData.waist * 0.393701).toFixed(1)) : displayBioData.waist || 0;
                       return (
                           <>
                               {/* Hero Weight */}
                               <div className="flex flex-col items-center justify-center py-6 relative">
                                   <div className="flex items-baseline relative z-10">
                                       <span className={`text-6xl font-black tracking-tighter ${t.textMain}`}>{dispWeight}</span>
                                       <span className={`body-lg ml-1 ${t.textMuted}`}>{isImp ? 'lbs' : 'kg'}</span>
                                   </div>
                                   <div className="flex items-center justify-center space-x-2 mt-2">
                                       <div className="h-px w-6 bg-zinc-500/30"></div>
                                       <span className={`text-[10px] font-bold ${t.textMuted}`}>Body Score: <span className={t.textMain}>{displayBioData.bodyScore || '-'}</span></span>
                                   </div>
                               </div>

                               {/* List of metrics with Segmented Bars */}
                               <div className="flex flex-col space-y-3">
                                   {[
                                       { label: 'BMI', val: displayBioData.bmi, unit: '', t: biometricStandard === 'western' ? [18.5, 25.0, 30.0] : [18.5, 23.0, 25.0], c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500'], labels: ['Under', 'Standard', 'Overweight', 'High'], status: displayBioData.bmiStatus, sColor: displayBioData.bmiStatus === 'Normal' ? 'text-emerald-500' : 'text-amber-500' },
                                       { label: 'Body fat percentage', val: displayBioData.bodyFat, unit: '%', t: [10, 20, 25], c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500'], labels: ['Low', 'Standard', 'Overfat', 'Obese'], status: displayBioData.bodyFatStatus, sColor: displayBioData.bodyFatStatus === 'Normal' ? 'text-emerald-500' : 'text-amber-500' },
                                       { label: 'Muscle mass', val: dispMuscle, unit: isImp ? 'lbs' : 'kg', t: isImp ? [66] : [30], c: ['bg-sky-500', 'bg-emerald-500'], labels: ['Under', 'Standard'], status: displayBioData.musclePercent >= 33 ? 'Standard' : 'Under', sColor: displayBioData.musclePercent >= 33 ? 'text-emerald-500' : 'text-amber-500' },
                                       { label: 'Muscle percentage', val: displayBioData.musclePercent, unit: '%', t: [30], c: ['bg-sky-500', 'bg-emerald-500'], labels: ['Under', 'Standard'], status: displayBioData.musclePercent >= 33 ? 'Standard' : 'Under', sColor: displayBioData.musclePercent >= 33 ? 'text-emerald-500' : 'text-amber-500' },
                                       { label: 'Protein percentage', val: displayBioData.proteinPercent, unit: '%', t: [16], c: ['bg-sky-500', 'bg-emerald-500'], labels: ['Under', 'Standard'], status: displayBioData.proteinPercent >= 16 ? 'Standard' : 'Under', sColor: displayBioData.proteinPercent >= 16 ? 'text-emerald-500' : 'text-amber-500' },
                                       { label: 'Water percentage', val: displayBioData.waterPercent, unit: '%', t: [45, 65], c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500'], labels: ['Low', 'Standard', 'High'], status: (displayBioData.waterPercent >= 45 && displayBioData.waterPercent <= 65) ? 'Standard' : 'Low', sColor: (displayBioData.waterPercent >= 45 && displayBioData.waterPercent <= 65) ? 'text-emerald-500' : 'text-amber-500' },
                                       { label: 'Visceral fat rating', val: displayBioData.visceralFat, unit: '', t: [10, 15], c: ['bg-emerald-500', 'bg-amber-500', 'bg-orange-500'], labels: ['Standard', 'High', 'Very high'], status: displayBioData.visceralFat < 10 ? 'Standard' : 'Very high', sColor: displayBioData.visceralFat < 10 ? 'text-emerald-500' : 'text-orange-500' },
                                       { label: 'Waist circumference', val: dispWaist, unit: isImp ? 'in' : 'cm', t: isImp ? [35.4] : [90], c: ['bg-emerald-500', 'bg-orange-500'], labels: ['Standard', 'Over'], status: displayBioData.waist < 90 ? 'Standard' : 'Over', sColor: displayBioData.waist < 90 ? 'text-emerald-500' : 'text-orange-500' }
                       ].map((item, idx) => {
                           const v = Number(item.val) || 0;
                           let pointerPos = 0;
                           if (item.t && item.t.length > 0) {
                               const numSegments = item.t.length + 1;
                               const segWidth = 100 / numSegments;
                               for (let i = 0; i <= item.t.length; i++) {
                                   const min = i === 0 ? 0 : item.t[i-1];
                                   const max = i === item.t.length ? item.t[i-1] * 1.5 : item.t[i]; 
                                   if (i === item.t.length || v < max) {
                                       const range = max - min;
                                       const posInSeg = (v - min) / range;
                                       const clampedPos = Math.max(0, Math.min(1, posInSeg));
                                       pointerPos = (i * segWidth) + (clampedPos * segWidth);
                                       break;
                                   }
                               }
                           }
                           
                           return (
                                <div key={idx} className={`p-5 rounded-2xl flex flex-col border ${t.border} ${t.bgCard} shadow-sm`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`body-lg font-bold ${t.textMain}`}>{item.label}</span>
                                        <div className="text-right">
                                            <div className="flex items-baseline space-x-1 justify-end">
                                                <span className="h1 font-light">{item.val || '-'}</span>
                                                <span className={`text-[10px] font-bold ${t.textMuted}`}>{item.unit}</span>
                                            </div>           
                                        </div>
                                        {item.status && <span className={`text-[9px] font-black ${item.sColor} uppercase tracking-widest mt-1.5`}>{item.status}</span>}
                                   </div>
                                   
                                   {item.c && item.c.length > 0 && (
                                       <div className="relative mt-2 mb-2 px-1">
                                           {/* Pointer */}
                                           <div className={`absolute -top-3 w-2.5 h-2.5 transition-all duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} style={{ left: `calc(${pointerPos}% - 5px)` }}>
                                               <svg viewBox="0 0 10 10" fill="currentColor"><polygon points="0,0 10,0 5,6" /></svg>
                                           </div>
                                           {/* Bar */}
                                           <div className="flex h-2 rounded-full overflow-hidden mb-2 opacity-90">
                                               {item.c.map((color, i) => <div key={i} className={`flex-1 ${color}`}></div>)}
                                           </div>
                                            <div className={`relative h-4 text-[9px] font-bold text-zinc-400`}>
                                                {item.t.map((threshold, i) => (
                                                    <span key={i} className="absolute transform -translate-x-1/2" style={{ left: `${(i + 1) * (100 / (item.t.length + 1))}%` }}>{threshold}</span>
                                                ))}
                                            </div>
                                           {/* Legends */}
                                           <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-dashed border-zinc-500/20">
                                               {item.labels.map((lbl, i) => (
                                                   <div key={i} className="flex items-center space-x-1.5">
                                                       <div className={`w-2.5 h-2.5 rounded-sm ${item.c[i]}`}></div>
                                                       <span className={`text-[10px] font-bold ${t.textMuted}`}>{lbl}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                    </div>
                           </>
                       );
                   })()}
               </div>
           </div>
        </div>
      ), document.body)}
      {/* MODAL PENGATURAN TARGET */}
      {showTargetModal && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTargetModal(false)}>
              <div className={`w-full max-w-sm ${t.bgCard} rounded-3xl p-5 border ${t.border} shadow-2xl animate-in zoom-in-95`} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-5">
                      <h3 className={`h3 ${t.textMain}`}>Pengaturan Target</h3>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className={`caption font-bold ${t.textMuted} mb-1 block uppercase tracking-wider`}>Target Langkah Kaki</label>
                          <div className="relative">
                              <SwipeInput 
                                  value={targetForm.steps || ''} 
                                  onChange={(v) => setTargetForm(p => ({...p, steps: v}))} 
                                  min={0} max={50000} step={500} 
                                  placeholder="10000"
                                  language={language}
                                  className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-4 rounded-xl outline-none font-black text-center text-xl pr-16`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted}`}>Langkah</span>
                          </div>
                      </div>
                      <div>
                          <label className={`caption font-bold ${t.textMuted} mb-1 block uppercase tracking-wider`}>Target Olahraga Mingguan</label>
                          <div className="relative">
                              <SwipeInput 
                                  value={targetForm.weeklyDuration || ''} 
                                  onChange={(v) => setTargetForm(p => ({...p, weeklyDuration: v}))} 
                                  min={0} max={1000} step={10} 
                                  placeholder="150"
                                  language={language}
                                  className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-4 rounded-xl outline-none font-black text-center text-xl pr-16`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted}`}>Menit</span>
                          </div>
                      </div>
                      <div>
                          <label className={`caption font-bold ${t.textMuted} mb-1 block uppercase tracking-wider`}>Target Tidur</label>
                          <div className="relative">
                              <SwipeInput 
                                  value={targetForm.sleep || ''} 
                                  onChange={(v) => setTargetForm(p => ({...p, sleep: v}))} 
                                  min={0} max={24} step={1} 
                                  placeholder="8"
                                  language={language}
                                  className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-4 rounded-xl outline-none font-black text-center text-xl pr-16`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted}`}>Jam</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex space-x-3 mt-6 border-t border-slate-500/20 pt-5">
                      <button 
                          onClick={() => { playSoundEffect('click', soundEnabled); setShowTargetModal(false); }}
                          className={`w-1/3 py-3 rounded-xl font-bold body-lg ${t.textMuted} ${t.btnBg} active:scale-[0.98] transition-all`}
                      >
                          Batal
                      </button>
                      <button 
                          onClick={handleSaveTargets}
                          className={`flex-1 py-3 rounded-xl font-bold body-lg text-white ${t.bgAccent} shadow-lg active:scale-[0.98] transition-all`}
                      >
                          Simpan
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

    </div>
  );
};

export default DashboardTab;
