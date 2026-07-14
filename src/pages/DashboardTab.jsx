import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Zap, Brain, Footprints, HeartPulse, Moon, Droplets, Droplet, Dumbbell, Scale, RefreshCw, Trophy, Link2, Pencil, Settings, Info, X, ChevronDown, ChevronUp, Wind, Utensils, Flame, Clock } from 'lucide-react';
import { getLocalYMD } from '../data/constants';
import { HealthConnect } from 'capacitor-health-connect';
import { Capacitor } from '@capacitor/core';
import DashboardModals from '../components/DashboardModals';
import DashboardChart from '../components/DashboardChart';
import ActivityChart from '../components/ActivityChart';
import ProgressTab from './ProgressTab';
import { MuscleProgress } from '../components/MuscleProgress';
import SwipeInput from '../components/SwipeInput';
import { formatNumber } from '../utils/numberFormat';
import { parseWorkoutDurationMinutes, calculateWorkoutCalories, calculateSmartWorkoutCalories } from '../utils/workoutCalc';
import { calcBMR } from '../utils/bmr';


const MetricBox = ({ label, value, unit, icon, color, t, theme }) => (
    <div className={`p-4 rounded-2xl flex flex-col justify-between ${t.bgCardSoft} border ${t.border} transition-transform duration-300 active:scale-[0.98]`}>
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
    <div className={`p-3 rounded-xl flex flex-col items-center justify-center text-center ${t.bgCardSoft} border ${t.border} transition-transform duration-300 active:scale-[0.98]`}>
        <span className={`h2 ${t.textMain}`}>{value || '-'}</span>
        <span className={`text-[9px] font-bold ${t.textMuted} mt-1 uppercase tracking-wider`}>{label}</span>
    </div>
);

const DashboardTab = ({ t, lang, language, user, history, setHistory, programs, exerciseLibrary, navigateToWorkoutDate, soundEnabled, playSoundEffect, theme, selectedDate, biometricStandard, units, setConfirmModal, activityTargets, setActivityTargets, gymProfiles, activeGymId, activePlanIds, userApiKeys, aiProvider, aiModel, userAchievements, connectedApps, userProfile, keyStatuses, setKeyStatuses, setShowSettings, lomealToday, lomealTargets }) => {
  const todayStr = getLocalYMD(new Date());
  const activeDate = todayStr;

  // ==========================================
  // STATE KONEKSI & SINKRONISASI
  // ==========================================
  const [showDetailsModal, setShowDetailsModal] = useState(false);


  // ==========================================
  // STATE MODAL INPUT MANUAL & TANGGAL
  // ==========================================
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTab, setManualTab] = useState('komposisi');
  const [modalDate, setModalDate] = useState(activeDate);
  const [isProgressExpanded, setIsProgressExpanded] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_progress_expanded');
          if (saved !== null) return JSON.parse(saved);
      } catch(e) {}
      return false;
  });
  
  useEffect(() => {
      localStorage.setItem('lyfit_progress_expanded', JSON.stringify(isProgressExpanded));
  }, [isProgressExpanded]);
  
  // TARGET SETTINGS
  const [showTargetModal, setShowTargetModal] = useState(false);

  const [targetForm, setTargetForm] = useState(activityTargets || { steps: 10000, weeklyDuration: 150, sleep: 8, activityCalories: 2500, calorieDelta: 0 });

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
  const [isKomposisiExpanded, setIsKomposisiExpanded] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_komposisi_expanded');
          if (saved !== null) return JSON.parse(saved);
      } catch(e) {}
      return false;
  });

  useEffect(() => {
      localStorage.setItem('lyfit_komposisi_expanded', JSON.stringify(isKomposisiExpanded));
  }, [isKomposisiExpanded]);

  const [isAktivitasExpanded, setIsAktivitasExpanded] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_aktivitas_expanded');
          if (saved !== null) return JSON.parse(saved);
      } catch(e) {}
      return false;
  });

  useEffect(() => {
      localStorage.setItem('lyfit_aktivitas_expanded', JSON.stringify(isAktivitasExpanded));
  }, [isAktivitasExpanded]);

  // Parallax removed for performance

  const emptyBio = {
    bodyScore: null, weight: null, height: null, bmi: null, bmiStatus: '-', bodyFat: null, bodyFatStatus: '-',
    muscleMass: null, musclePercent: null, boneMass: null, waterPercent: null, visceralFat: null, bmr: null, bodyAge: null, 
    waist: null, waistToHip: null, proteinPercent: null, bodyType: '-', weightSuggestion: '-',
    steps: '', activeMinutes: '', activityCalories: '', nutritionCalories: '', sleep: '', energyScore: null, 
    heartRate: null, minHeartRate: null, maxHeartRate: null, bloodPressure: '', oxygenSaturation: null, waterIntake: '',
    weeklyDuration: '', weeklySessions: '', weeklyCalories: ''
  };

  const [formBio, setFormBio] = useState({ ...emptyBio });

  const { bioData, bioDataDate } = useMemo(() => {
     let latestBodyData = null;
     let bodyDataDate = null;
     let todayDailyData = history[activeDate]?.bioData || {};
     
     const sortedDates = Object.keys(history).filter(d => d <= activeDate).sort((a,b) => b.localeCompare(a));
     for (let date of sortedDates) {
         const dayBio = history[date]?.bioData;
         if (dayBio && (Number(dayBio.weight) > 0 || Number(dayBio.bodyFat) > 0 || Number(dayBio.musclePercent) > 0 || Number(dayBio.bmr) > 0 || Number(dayBio.bodyScore) > 0)) {
             latestBodyData = dayBio;
             bodyDataDate = date;
             break;
         }
     }
     
     const mergedData = {
         ...emptyBio,
         height: userProfile?.height || null, 
         weight: userProfile?.weight || null,
         ...(latestBodyData || {}),
         steps: todayDailyData.steps !== undefined ? todayDailyData.steps : (emptyBio.steps || 0),
         activeMinutes: todayDailyData.activeMinutes !== undefined ? todayDailyData.activeMinutes : (emptyBio.activeMinutes || 0),
         activityCalories: todayDailyData.activityCalories !== undefined ? todayDailyData.activityCalories : (emptyBio.activityCalories || 0),
         nutritionCalories: todayDailyData.nutritionCalories !== undefined ? todayDailyData.nutritionCalories : (emptyBio.nutritionCalories || 0),
         sleep: todayDailyData.sleep !== undefined ? todayDailyData.sleep : (emptyBio.sleep || ''),
         energyScore: todayDailyData.energyScore !== undefined ? todayDailyData.energyScore : (emptyBio.energyScore || 0),
         heartRate: todayDailyData.heartRate !== undefined ? todayDailyData.heartRate : (emptyBio.heartRate || 0),
         minHeartRate: todayDailyData.minHeartRate !== undefined ? todayDailyData.minHeartRate : (emptyBio.minHeartRate || 0),
         maxHeartRate: todayDailyData.maxHeartRate !== undefined ? todayDailyData.maxHeartRate : (emptyBio.maxHeartRate || 0),
         bloodPressure: todayDailyData.bloodPressure !== undefined ? todayDailyData.bloodPressure : (emptyBio.bloodPressure || ''),
         oxygenSaturation: todayDailyData.oxygenSaturation !== undefined ? todayDailyData.oxygenSaturation : (emptyBio.oxygenSaturation || 0),
         waterIntake: todayDailyData.waterIntake !== undefined ? todayDailyData.waterIntake : (emptyBio.waterIntake || 0),
         weeklyDuration: todayDailyData.weeklyDuration !== undefined ? todayDailyData.weeklyDuration : emptyBio.weeklyDuration,
         weeklySessions: todayDailyData.weeklySessions !== undefined ? todayDailyData.weeklySessions : emptyBio.weeklySessions,
         weeklyCalories: todayDailyData.weeklyCalories !== undefined ? todayDailyData.weeklyCalories : emptyBio.weeklyCalories,
     };
     
     // Auto-calculate BMI for dashboard display if weight and height exist
     if (mergedData.height > 0 && mergedData.weight > 0 && !mergedData.bmi) {
         const hMeter = mergedData.height / 100;
         mergedData.bmi = Number((mergedData.weight / (hMeter * hMeter)).toFixed(1));
         
         if (biometricStandard === 'western') {
             if (mergedData.bmi < 18.5) mergedData.bmiStatus = 'Underweight';
             else if (mergedData.bmi <= 24.9) mergedData.bmiStatus = 'Normal';
             else if (mergedData.bmi <= 29.9) mergedData.bmiStatus = 'Overweight';
             else mergedData.bmiStatus = 'Obese';
         } else {
             if (mergedData.bmi < 18.5) mergedData.bmiStatus = 'Underweight';
             else if (mergedData.bmi <= 22.9) mergedData.bmiStatus = 'Normal';
             else if (mergedData.bmi <= 24.9) mergedData.bmiStatus = 'Overweight';
             else mergedData.bmiStatus = 'Obese';
         }
     }
     
     // Auto-calculate BMR for dashboard display if not exist
     if (mergedData.height > 0 && mergedData.weight > 0 && !mergedData.bmr && userProfile?.gender && userProfile?.dob) {
         const age = new Date().getFullYear() - new Date(userProfile.dob).getFullYear() || 25;
         mergedData.bmr = calcBMR({ weight: mergedData.weight, height: mergedData.height, age, gender: userProfile.gender });
     }
     
     return { 
         bioData: mergedData,
         bioDataDate: bodyDataDate
     };
  }, [history, activeDate, todayStr]);

  // ==========================================
  // FUNGSI AKSI (TOMBOL & FORM)
  // ==========================================


  useEffect(() => {
     if (showManualModal) {
         let initialBio = { ...emptyBio };
         if (history[modalDate] && history[modalDate].bioData) {
             initialBio = { ...history[modalDate].bioData };
         }
         
         // Injeksi nilai Smart Merge agar UI Swipe Input menampilkan angka yang tersinkronisasi
         let dailyActive = Number(initialBio.activeMinutes || 0);
         let internalToday = 0;
         const todayWorkouts = history[modalDate]?.workouts || [];
         todayWorkouts.forEach(w => {
             if (w.duration) {
                 if (typeof w.duration === 'number') internalToday += w.duration;
                 else if (typeof w.duration === 'string') {
                     const parts = w.duration.split(':').map(Number);
                     if (parts.length === 3) internalToday += Math.round(((parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0)) / 60);
                     else if (parts.length === 2) internalToday += Math.round(((parts[0]||0)*60 + (parts[1]||0)) / 60);
                 }
             }
         });
         dailyActive = Math.max(dailyActive, internalToday);
         
         let weeklyDur = 0;
         let weeklySess = 0;
         const end = new Date(modalDate);
         for (let i = 0; i < 7; i++) {
             const d = new Date(end);
             d.setDate(end.getDate() - i);
             const dateStr = getLocalYMD(d);
             const dayData = history[dateStr] || {};
             let extDur = Number(dayData.bioData?.activeMinutes || 0);
             let intDur = 0;
             const wks = dayData.workouts || [];
             weeklySess += wks.length;
             wks.forEach(w => {
                 if (w.duration) {
                     if (typeof w.duration === 'number') intDur += w.duration;
                     else if (typeof w.duration === 'string') {
                         const parts = w.duration.split(':').map(Number);
                         if (parts.length === 3) intDur += Math.round(((parts[0]||0)*3600 + (parts[1]||0)*60 + (parts[2]||0)) / 60);
                         else if (parts.length === 2) intDur += Math.round(((parts[0]||0)*60 + (parts[1]||0)) / 60);
                     }
                 }
             });
             weeklyDur += Math.max(extDur, intDur);
         }
         
         if (initialBio.weeklyDuration !== undefined && initialBio.weeklyDuration !== '') weeklyDur = Number(initialBio.weeklyDuration);
         if (initialBio.weeklySessions !== undefined && initialBio.weeklySessions !== '') weeklySess = Number(initialBio.weeklySessions);
         
         initialBio.activeMinutes = dailyActive;
         initialBio.weeklyDuration = weeklyDur;
         initialBio.weeklySessions = weeklySess;
         
         setFormBio(initialBio);
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


  const handleSaveManualData = () => {
     playSoundEffect('click', soundEnabled);
     
     setConfirmModal({
         isOpen: true,
         title: 'Simpan Data Manual?',
         message: 'Data manual akan menjadi prioritas dan menimpa sinkronisasi otomatis dari alat/aplikasi lain pada hari ini.',
         onConfirm: () => {
             let dataToSave = { ...formBio };
             if (modalDate === activeDate) {
                 if (Number(dataToSave.activeMinutes) === mergedDailyActiveMinutes) delete dataToSave.activeMinutes;
                 if (Number(dataToSave.weeklyDuration) === mergedWeeklyActiveMinutes) delete dataToSave.weeklyDuration;
                 if (Number(dataToSave.weeklySessions) === mergedWeeklySessions) delete dataToSave.weeklySessions;
             } else {
                 if (dataToSave.activeMinutes === '') delete dataToSave.activeMinutes;
                 if (dataToSave.weeklyDuration === '') delete dataToSave.weeklyDuration;
                 if (dataToSave.weeklySessions === '') delete dataToSave.weeklySessions;
             }

             const evaluatedData = evaluateBiometrics(dataToSave);
             
             // Penanda untuk mencegah auto-sync menimpa data yang diketik manual
             const manualFlags = {};
             Object.keys(evaluatedData).forEach(k => {
                 if (evaluatedData[k] !== null && evaluatedData[k] !== '') manualFlags[k] = true;
             });
             
             setHistory(prev => {
                 const existingBio = prev[modalDate]?.bioData || {};
                 return {
                     ...prev,
                     [modalDate]: {
                         ...(prev[modalDate] || {}),
                         bioData: {
                             ...evaluatedData,
                             _manualFlags: { ...(existingBio._manualFlags || {}), ...manualFlags }
                         }
                     }
                 };
             });
             setShowManualModal(false);
         }
     });
  };

  const handleDeleteBioData = () => {
     playSoundEffect('click', soundEnabled);
     setHistory(prev => {
         const newHistory = { ...prev };
         if (newHistory[modalDate] && newHistory[modalDate].bioData) {
             const currentBio = newHistory[modalDate].bioData;
             const newBio = { ...currentBio };
             
             if (manualTab === 'komposisi') {
                 ['weight', 'height', 'waist', 'bmi', 'bmiStatus', 'bodyFat', 'bodyFatStatus', 'bmr', 'muscleMass', 'musclePercent', 'boneMass', 'visceralFat', 'waterPercent', 'proteinPercent', 'bodyAge', 'bodyScore'].forEach(k => newBio[k] = null);
             } else {
                 ['steps', 'energyScore', 'activeMinutes', 'activityCalories', 'nutritionCalories', 'sleep', 'sleepLog', 'heartRate', 'minHeartRate', 'maxHeartRate', 'bloodPressure', 'oxygenSaturation', 'waterIntake', 'weeklyDuration', 'weeklySessions', 'weeklyCalories'].forEach(k => newBio[k] = null);
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



  const scoreArcColor = !bioData.bodyScore ? (theme === 'dark' ? '#71717a' : '#a1a1aa') : bioData.bodyScore >= 80 ? '#10b981' : bioData.bodyScore >= 60 ? '#f59e0b' : '#f43f5e';
  const scoreRadius = 40;
  const scoreCircumference = 2 * Math.PI * scoreRadius;
  const scoreProgress = Math.min(100, Math.max(0, Number(bioData.bodyScore) || 0));
  const scoreDashOffset = scoreCircumference * (1 - scoreProgress / 100);
  const isImp = units?.weight === 'lbs';
  const dispMainWeight = isImp && bioData.weight ? Number((bioData.weight * 2.20462).toFixed(1)) : bioData.weight || '-';
  const dispMainHeight = isImp && bioData.height ? Number((bioData.height * 0.393701).toFixed(1)) : bioData.height || '-';
  const dispMainMuscle = isImp && bioData.muscleMass ? Number((bioData.muscleMass * 2.20462).toFixed(1)) : bioData.muscleMass || '-';
  const dispMainWaist = units?.height === 'ft' && bioData.waist ? Number((bioData.waist * 0.393701).toFixed(1)) : bioData.waist || '-';

  // Smart Merge Deduplication (LyFit Internal + BioData/HealthConnect)
  const { mergedDailyActiveMinutes, mergedDailyCalories, mergedDailyCaloriesFloor, mergedDailySessions, mergedWeeklyActiveMinutes, mergedWeeklyWorkoutDuration, mergedWeeklySessions, mergedWeeklyCalories } = useMemo(() => {
     const currentWeight = Number(bioData.weight) || 70; // Asumsi 70kg jika tidak ada data
     let dailyActive = Number(bioData.activeMinutes || 0);
     const isDailyCalsManual = !!bioData._manualFlags?.activityCalories;

     const todayWks = history[activeDate]?.workouts || [];
     const todayCompletedWks = todayWks.filter(w => w.status === 'completed' || w.programId === 'adhoc');
     
     let intTodayDur = 0;
     let intTodayCals = 0;
     todayCompletedWks.forEach(w => {
         const wDuration = parseWorkoutDurationMinutes(w.duration);
         intTodayDur += wDuration;
         intTodayCals += calculateSmartWorkoutCalories(currentWeight, w, w.log);
     });
     
     dailyActive = Math.max(dailyActive, intTodayDur);

     // Kalori Dibakar = BMR + Langkah Kaki + Workout — bmr Mifflin-St Jeor asli (sudah
     // dihitung di atas buat kartu Komposisi Tubuh), fallback 1600 nyamain konvensi Lomeal
     // (nutrition.js: calcBMR(profile) || 1600) buat profil yang belum lengkap.
     const bmrCalories = bioData.bmr || 1600;
     const stepsCalories = Math.round((Number(bioData.steps || 0) * 0.04)); // ~0.04 kcal per langkah
     const workoutCalories = intTodayCals;
     const totalDailyCals = bmrCalories + stepsCalories + workoutCalories;
     // BMR + langkah + workout internal Logym adalah LANTAI yang gak boleh ketimpa manual —
     // BMR gak mungkin 0/minus (selalu terbakar walau diam), dan hasil latihan yang beneran
     // ke-log di Logym gak boleh "hilang" cuma gara-gara ada input manual (dari modal Logym
     // sendiri ATAU koreksi dari Lomeal) yang lebih kecil atau bahkan kosong/kehapus.
     // Manual cuma BOLEH menaikkan (extra aktivitas yang gak ke-track otomatis), gak pernah
     // menurunkan di bawah totalDailyCals — jadi walau nilainya di-nolkan, tetap fallback aman.
     const manualCals = isDailyCalsManual ? (Number(bioData.activityCalories) || 0) : 0;
     const dailyCals = Math.max(totalDailyCals, manualCals);
     
     let weeklyDur = 0;
     let weeklyWorkoutDur = 0;
     let weeklySess = 0;
     let weeklyCals = 0;
     const end = new Date(activeDate);
     
     for (let i = 0; i < 7; i++) {
         const d = new Date(end);
         d.setDate(end.getDate() - i);
         const dateStr = getLocalYMD(d);
         const dayData = history[dateStr] || {};
         
         let extDur = Number(dayData.bioData?.activeMinutes || 0);
         const extCal = Number(dayData.bioData?.activityCalories || 0);
         const isDayCalManual = !!dayData.bioData?._manualFlags?.activityCalories;
         const dayWeight = Number(dayData.bioData?.weight) || currentWeight;

         let intDur = 0;
         let intCal = 0;

         const wks = dayData.workouts || [];
         const completedWks = wks.filter(w => w.status === 'completed' || w.programId === 'adhoc');
         weeklySess += completedWks.length;

         completedWks.forEach(w => {
             const wDuration = parseWorkoutDurationMinutes(w.duration);
             intDur += wDuration;
             intCal += calculateSmartWorkoutCalories(dayWeight, w, w.log);
         });

         weeklyDur += Math.max(extDur, intDur);
         weeklyWorkoutDur += intDur;
         weeklyCals += isDayCalManual ? extCal : Math.max(extCal, intCal);
     }
     
     // Override with manual weekly if user explicitly saved a modified value in the modal
     // Ini memastikan jika user secara eksplisit mengubah angkanya di Modal Input (baik naik atau turun), 
     // sistem akan menghormati input tersebut untuk hari ini.
     if (bioData.weeklyDuration !== undefined && bioData.weeklyDuration !== '') weeklyDur = Number(bioData.weeklyDuration);
     if (bioData.weeklySessions !== undefined && bioData.weeklySessions !== '') weeklySess = Number(bioData.weeklySessions);
     if (bioData.weeklyCalories !== undefined && bioData.weeklyCalories !== '') weeklyCals = Number(bioData.weeklyCalories);
     
     return {
         mergedDailyActiveMinutes: dailyActive,
         mergedDailyCalories: dailyCals,
         mergedDailyCaloriesFloor: totalDailyCals,
         mergedDailySessions: todayCompletedWks.length,
         mergedWeeklyActiveMinutes: weeklyDur,
         mergedWeeklyWorkoutDuration: weeklyWorkoutDur,
         mergedWeeklySessions: weeklySess,
         mergedWeeklyCalories: weeklyCals
     };
  }, [history, activeDate, bioData]);

  // Tulis balik mergedDailyCalories (udah dilindungi Math.max lantai BMR+langkah+workout,
  // lihat useMemo di atas) ke bioData.activityCalories — biar Lomeal, yang baca field mentah
  // ini LANGSUNG tanpa lewat proteksi Math.max di atas, tetap ikut kelindungi. Sengaja TIDAK
  // di-skip walau lagi manual: kalau manual masih >= lantai, ini no-op (angkanya udah sama);
  // kalau manual pernah kesetel/kehapus jadi di bawah lantai, ini nyembuhin balik ke lantai.
  // activityCaloriesFloor juga ikut ditulis (lantai mentah, TANPA manual) — biar Lomeal bisa
  // baca lantainya sendiri sebelum push koreksi, gak cuma ngandelin Logym nyembuhin belakangan.
  useEffect(() => {
     if (activeDate !== todayStr || mergedDailyCalories <= 0) return;
     const calsChanged = Number(bioData.activityCalories || 0) !== mergedDailyCalories;
     const floorChanged = Number(bioData.activityCaloriesFloor || 0) !== mergedDailyCaloriesFloor;
     if (calsChanged || floorChanged) {
         setHistory(prev => ({
             ...prev,
             [activeDate]: {
                 ...(prev[activeDate] || {}),
                 bioData: { ...(prev[activeDate]?.bioData || {}), activityCalories: mergedDailyCalories, activityCaloriesFloor: mergedDailyCaloriesFloor }
             }
         }));
     }
  }, [mergedDailyCalories, mergedDailyCaloriesFloor, activeDate, todayStr]);

  // Snapshot target/fase diet hari ini — di-refresh terus selama activeDate === todayStr,
  // otomatis membeku jadi arsip begitu tanggalnya lewat (efek ini gak pernah nyentuh hari lain).
  useEffect(() => {
     if (activeDate !== todayStr) return;
     const snap = { nutritionGoal: activityTargets?.nutritionGoal || null, calorieDelta: activityTargets?.calorieDelta || 0, tdee: activityTargets?.tdee || null };
     const existing = bioData.targetSnapshot;
     if (existing && existing.nutritionGoal === snap.nutritionGoal && existing.calorieDelta === snap.calorieDelta && existing.tdee === snap.tdee) return;
     setHistory(prev => ({
         ...prev,
         [activeDate]: {
             ...(prev[activeDate] || {}),
             bioData: { ...(prev[activeDate]?.bioData || {}), targetSnapshot: snap }
         }
     }));
  }, [activityTargets?.nutritionGoal, activityTargets?.calorieDelta, activityTargets?.tdee, activeDate, todayStr]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-6">
      
      {/* HEADER & INTEGRASI APPS */}
      <div className="pt-2 px-4 flex justify-between items-center mb-2 anim-rise">
         <div>
            <h1 className="h1"><span className={t.textMain}>Halo, </span><span className={`bg-gradient-to-r ${t.gradientText} bg-clip-text text-transparent`}>{user?.name || 'Kawan'}</span></h1>
            <p className={`body-base font-medium ${t.textMuted} mt-1 leading-snug`}>{t.greetingText}</p>
            <div className="flex items-center space-x-2 mt-1">
               <p className={`body-md ${t.textMuted}`}>{new Date().toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
               <span className={`text-[10px] ${t.textMuted}`}>•</span>
               <div className={`flex items-center gap-1 ${t.textMuted}`}>
                 <Dumbbell size={12} />
                 <span className="body-md font-bold text-[13px]">{gymProfiles?.find(g => g.id === activeGymId)?.name || 'LOGYM'}</span>
               </div>
               </div>
             </div>
          </div>
       
      <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-6 sm:items-start space-y-4 sm:space-y-0">
      {/* --- GRUP KOMPOSISI & BIOMETRIK --- */}
      <div className="relative z-20 flex flex-col space-y-4 anim-rise" style={{ animationDelay: '60ms' }}>
        {/* 1. KARTU BODY COMPOSITION & EXPANDED CHART */}
        <div className="relative flex flex-col w-full min-w-0">
           <div className="relative z-20">
           {/* Latar Belakang Kartu (Glassmorphism untuk background app) */}
           <div className={`absolute top-14 inset-x-0 bottom-0 border ${t.border} ${theme === 'dark' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/45 backdrop-blur-md'} shadow-sm transition-all duration-300 ${isKomposisiExpanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'} z-0`}></div>

           {/* Coach: Tajam di atas latar belakang kartu */}
           <div
             className="absolute -right-5 -top-12 bottom-0 w-72 z-10 pointer-events-none overflow-hidden parallax-container"
             style={{
               maskImage: 'linear-gradient(to bottom, black 60%, transparent 85%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 85%)'
             }}
           >
             <img src="/bg-dashboard.webp" alt="" className={`w-full h-full object-cover object-top drop-shadow-xl origin-top transition-transform duration-500 ease-out ${isKomposisiExpanded ? 'scale-[1.60]' : 'scale-[1.15]'}`} />
           </div>

          {/* Konten Kartu: Berada di atas coach */}
          <div id="komposisi-accordion" className={`p-4 relative z-20 flex flex-col justify-between`}>
           <div className="flex justify-between items-center mb-5 relative z-10">
               <div>
                   <h3 className={`h3 ${t.textMain}`}>Komposisi Tubuh</h3>
                   {bioDataDate && (
                       <p className={`caption ${t.textMuted} mt-0.5`} style={{fontSize: '0.65rem'}}>{bioDataDate === activeDate ? 'Hari ini: ' : 'Data dari: '}{new Date(bioDataDate).toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' })}</p>
                   )}
               </div>
               <div className="flex items-center space-x-2">
                   <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(bioDataDate || activeDate); setShowDetailsModal(true); }} className={`p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Info size={16}/></button>
                   <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(activeDate); setManualTab('komposisi'); setShowManualModal(true); }} className={`p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Pencil size={16}/></button>
               </div>
           </div>
           
           <div className="flex justify-between items-end w-full relative z-10 mb-1 flex-1">
                <div className={`w-[calc(50%-4px)] flex flex-col space-y-1 justify-end h-full p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md`}>
                   {/* Fisik */}
                   <div className="flex flex-col">
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>Fisik</span>
                       <div className="flex items-baseline space-x-1.5">
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{isImp && bioData.weight ? Number((bioData.weight * 2.20462).toFixed(1)) : bioData.weight || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'lbs' : 'kg'}</span></span>
                           <span className="text-zinc-300 dark:text-zinc-600 text-[10px]">|</span>
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{isImp && bioData.height ? Number((bioData.height * 0.393701).toFixed(1)) : bioData.height || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'in' : 'cm'}</span></span>
                       </div>
                   </div>

                   {/* BMI */}
                   <div className="flex flex-col">
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>BMI ({biometricStandard === 'western' ? 'Western' : 'Asia'})</span>
                       <div className="flex items-baseline space-x-1.5">
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.bmi, language) || '-'}</span>
                           <span className={`text-[10px] font-bold ${bioData.bmiStatus === 'Normal' ? 'text-emerald-500' : bioData.bmiStatus === 'Overweight' ? 'text-amber-400' : bioData.bmiStatus === 'Obese' ? 'text-rose-500' : 'text-blue-400'}`}>{bioData.bmiStatus}</span>
                       </div>
                   </div>

                   {/* BMR */}
                   <div className="flex flex-col">
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>BMR</span>
                       <div>
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.bmr, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">kcal</span></span>
                       </div>
                   </div>

                   {/* Body Fat */}
                   <div className="flex flex-col">
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>Kadar Lemak</span>
                       <div className="flex items-baseline space-x-1.5">
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.bodyFat, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span>
                           <span className={`text-[10px] font-bold ${bioData.bodyFatStatus === 'Normal' ? 'text-emerald-500' : bioData.bodyFatStatus === 'Overfat' ? 'text-amber-400' : bioData.bodyFatStatus === 'Obese' ? 'text-rose-500' : 'text-blue-400'}`}>{bioData.bodyFatStatus}</span>
                       </div>
                   </div>
               </div>

               <div className="flex flex-col justify-end items-end pb-1 pr-1">
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                       <div className={`absolute inset-1 rounded-full ${theme === 'dark' ? 'bg-black/60' : 'bg-white/60'} backdrop-blur-md border ${t.border} z-0`} />
                      <svg className="absolute inset-0 -rotate-90 z-10" viewBox="0 0 96 96">
                         <circle cx="48" cy="48" r={scoreRadius} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="1.5 6.2" className={theme === 'dark' ? 'stroke-white/15' : 'stroke-black/10'} />
                         <circle cx="48" cy="48" r={scoreRadius} fill="none" stroke={scoreArcColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={scoreCircumference} strokeDashoffset={scoreDashOffset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                      </svg>
                      <div className="flex flex-col items-center justify-center relative z-10">
                         <span className="text-3xl font-black leading-none" style={{ color: scoreArcColor }}>{formatNumber(bioData.bodyScore, language) || '-'}</span>
                         <span className={`text-[10px] mt-0.5 font-bold leading-tight ${t.textMuted}`}>SCORE</span>
                      </div>
                   </div>
               </div>
           </div>
  
           <div className={`grid grid-cols-4 gap-2 relative z-10 mt-1`}>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{dispMainMuscle} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'lbs' : 'kg'}</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Massa<br/>Otot</span></div>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.musclePercent, language) || '-'} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Kadar<br/>Otot</span></div>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.proteinPercent, language) || '-'} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Kadar<br/>Protein</span></div>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.waterPercent, language) || '-'} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Kadar<br/>Air</span></div>
                
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.visceralFat, language) || '-'}</span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Lemak<br/>Visceral</span></div>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{dispMainWaist} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'in' : 'cm'}</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Lingkar<br/>Perut</span></div>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.boneMass, language) || '-'} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Mineral<br/>Tulang</span></div>
                <div className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md flex flex-col items-center justify-center text-center`}><span className={`body-lg font-black ${t.textMain}`}>{formatNumber(bioData.bodyAge, language) || '-'} <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">th</span></span><span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Usia<br/>Tubuh</span></div>
            </div>
           
           <button
               onClick={() => {
                   playSoundEffect('click', soundEnabled);
                   const isExpanding = !isKomposisiExpanded;
                   setIsKomposisiExpanded(isExpanding);
                   setTimeout(() => {
                       const targetId = isExpanding ? 'komposisi-subcard' : 'komposisi-accordion';
                       const el = document.getElementById(targetId);
                       if (el) {
                           if (isExpanding) {
                               const bottom = el.getBoundingClientRect().bottom;
                               if (bottom > window.innerHeight - 100) {
                                   window.scrollTo({ top: bottom + window.scrollY - window.innerHeight + 120, behavior: 'smooth' });
                               }
                           } else {
                               window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                           }
                       }
                   }, 320);
               }}
               className={`self-center mt-3 p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
           >
               {isKomposisiExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
           </button>
          </div>
         </div>

          <div id="komposisi-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isKomposisiExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
            <div className="overflow-hidden">
              <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10 no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
              <DashboardChart 
                 t={t} theme={theme} history={history} 
                 soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
                 onPointClick={handleChartPointClick}
                 units={units}
              />
              </div>
            </div>
          </div>
        </div>

      {/* 2. KARTU AKTIVITAS HARIAN & MINGGUAN */}
      <div className="relative flex flex-col mt-6 w-full min-w-0 anim-rise" style={{ animationDelay: '90ms' }}>
         <div className="relative z-20">
         {/* Card Background Layer */}
         <div className={`absolute top-14 inset-x-0 bottom-0 border ${t.border} ${theme === 'dark' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/45 backdrop-blur-md'} shadow-sm ${isAktivitasExpanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'} z-0 transition-all duration-300`}></div>

         {/* Extracted Image */}
         <div
             className="absolute right-0 -top-20 bottom-0 w-[26rem] z-10 pointer-events-none overflow-hidden parallax-container"
             style={{
               maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
             }}
         >
             <img src="/bg-activity.webp" alt="" className={`w-full h-full object-cover object-top drop-shadow-xl origin-top transform translate-x-4 transition-transform duration-500 ease-out ${isAktivitasExpanded ? 'scale-105' : 'scale-100'}`} />
         </div>

         {/* Content Layer */}
         <div id="aktivitas-accordion" className={`p-4 relative z-20 flex flex-col h-full justify-between`}>
             <div className="flex justify-between items-center shrink-0">
                 <div>
                     <h3 className={`h3 ${t.textMain}`}>Aktivitas Harian</h3>
                     <p className={`caption ${t.textMuted} mt-0.5`} style={{fontSize: '0.65rem'}}>Hari ini: {new Date(activeDate).toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' })}</p>
                 </div>
                 <div className="flex space-x-2">

                     <button onClick={() => { playSoundEffect('click', soundEnabled); setShowTargetModal(true); }} className={`p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Settings size={16}/></button>
                     <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(activeDate); setManualTab('harian'); setShowManualModal(true); }} className={`p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Pencil size={16}/></button>
                 </div>
             </div>

             <div className="flex flex-col flex-1 justify-between pt-6 pb-2">
                 <div className={`p-5 -mx-4 w-[calc(100%+2rem)] ${t.bgBox} backdrop-blur-md border-y border-x-0 ${t.border}`}>
                     <div className="grid grid-cols-2 gap-x-5 gap-y-5 h-full content-between">
                         {/* Langkah Kaki */}
                         <div className="flex flex-col h-full">
                     <div className="flex items-center space-x-1.5 mb-1"><span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0"><Footprints size={11}/></span> <span className={`caption ${t.textMuted} capitalize`}>Langkah Kaki</span></div>
                     <div className="flex flex-col flex-1 justify-end">
                         <div className="flex items-baseline space-x-1 mb-2">
                             <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{bioData.steps > 0 ? formatNumber(bioData.steps, language) : '-'}</span>
                             <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold whitespace-nowrap">/ {formatNumber(activityTargets?.steps || 10000, language)}</span>
                         </div>
                         <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mb-1 overflow-hidden shrink-0">
                             <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (Number(bioData.steps || 0) / (activityTargets?.steps || 10000)) * 100)}%` }}></div>
                         </div>
                         <span className="text-[9px] invisible whitespace-nowrap">{formatNumber(mergedWeeklySessions, language)} Sesi ({formatNumber(mergedWeeklyWorkoutDuration, language)} menit)</span>
                     </div>
                 </div>
                 
                 {/* Durasi Aktif (Hari Ini) */}
                  {(() => {
                      const todayDur = mergedDailyActiveMinutes;
                      const targetDur = activityTargets?.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 5) : 30;
                      const progress = Math.min(100, (todayDur / targetDur) * 100);
                      return (
                          <div className="flex flex-col h-full text-right items-end">
                              <div className="flex items-center justify-end space-x-1.5 mb-1"><span className={`caption ${t.textMuted} capitalize`}>Durasi Aktif</span> <span className={`w-5 h-5 rounded-full ${t.bgAccentSoft} ${t.textAccent} flex items-center justify-center shrink-0`}><Clock size={11}/></span></div>
                              <div className="flex flex-col flex-1 justify-end w-full">
                                  <div className="flex items-baseline justify-end space-x-1 mb-2">
                                      <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{todayDur > 0 ? formatNumber(todayDur, language) : '-'}</span>
                                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold whitespace-nowrap">/ {targetDur} mnt</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mb-1 overflow-hidden shrink-0 flex justify-end">
                                      <div className={`h-full ${t.bgAccent} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                                  </div>
                                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Minggu ini: {formatNumber(mergedWeeklySessions, language)} sesi • {formatNumber(mergedWeeklyActiveMinutes, language)} mnt</span>
                              </div>
                          </div>
                      );
                  })()}

                 {/* Kalori Dimakan */}
                 <div className="flex flex-col h-full">
                     <div className="flex items-center space-x-1.5 mb-1"><span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0"><Utensils size={11}/></span> <span className={`caption ${t.textMuted} capitalize`}>Kalori Dimakan</span></div>
                     {(() => {
                       const nutritionCalories = lomealToday?.kcal ?? bioData.nutritionCalories;
                       const foodTarget = lomealTargets?.kcal || 2000;
                       return (
                         <div className="flex flex-col flex-1 justify-end">
                             <div className="flex items-baseline space-x-1 mb-0.5">
                                 <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{formatNumber(nutritionCalories, language) || '-'}</span>
                             </div>
                             {lomealToday && (
                                <p className={`font-medium ${t.textMuted} truncate`} style={{fontSize: '0.65rem'}}>Lomeal: {lomealToday.mealsCount || 0} sesi makan</p>
                             )}
                         </div>
                       );
                     })()}
                 </div>

                 {/* Kalori Dibakar */}
                 <div className="flex flex-col h-full text-right items-end">
                     <div className="flex items-center justify-end space-x-1.5 mb-1"><span className={`caption ${t.textMuted} capitalize`}>Kalori Dibakar</span> <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0"><Flame size={11}/></span></div>
                     <div className="flex flex-col flex-1 justify-end w-full">
                         <div className="flex items-baseline justify-end mb-0.5">
                             <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{mergedDailyCalories > 0 ? formatNumber(mergedDailyCalories, language) : '-'}</span>
                         </div>
                         <p className={`font-medium ${t.textMuted} truncate`} style={{fontSize: '0.65rem'}}>Logym: {mergedDailySessions || 0} sesi latihan</p>
                     </div>
                 </div>

                 {/* Tidur */}
                 <div className="flex flex-col h-full">
                     <div className="flex items-center space-x-1.5 mb-1"><span className="w-5 h-5 rounded-full bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0"><Moon size={11}/></span> <span className={`caption ${t.textMuted} capitalize`}>Tidur</span></div>
                     <div className="flex flex-col flex-1 justify-end">
                         <div className="flex items-baseline space-x-1 mb-2">
                             <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{bioData.sleep || '-'}</span>
                         </div>
                         <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                             <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (parseSleepHours(bioData.sleep) / (activityTargets?.sleep || 8)) * 100)}%` }}></div>
                         </div>
                     </div>
                 </div>

                 {/* Skor Energi */}
                 <div className="flex flex-col h-full text-right items-end">
                     <div className="flex items-center justify-end space-x-1.5 mb-1"><span className={`caption ${t.textMuted} capitalize`}>Skor Energi</span> <span className="w-5 h-5 rounded-full bg-slate-400/15 text-slate-400 flex items-center justify-center shrink-0"><Zap size={11}/></span></div>
                     <div className="flex flex-col flex-1 justify-end w-full">
                         <div className="flex items-baseline justify-end space-x-1 mb-2">
                              <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{bioData.energyScore > 0 ? formatNumber(bioData.energyScore, language) : '-'}</span>
                             <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">/ 100</span>
                         </div>
                         <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0 flex justify-end">
                             <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Number(bioData.energyScore || 0))}%` }}></div>
                         </div>
                     </div>
                 </div>
                 
                 {/* ROW 4: Tekanan Darah, Detak Jantung, SpO2 (Sebaris bertiga) */}
                 <div className={`col-span-2 grid grid-cols-3 gap-x-2 pt-2 mt-2 border-t border-dashed ${t.borderDashed}`}>
                     {/* Tekanan Darah */}
                     <div className="flex flex-col">
                         <div className="flex items-center space-x-1 mb-1 text-blue-400"><Activity size={12}/> <span className={`text-[10px] ${t.textMuted}`}>Tensi</span></div>
                         <span className={`text-lg font-black ${t.textMain} leading-none`}>{bioData.bloodPressure || '-'}</span>
                     </div>
                     
                     {/* Detak Jantung */}
                     <div className="flex flex-col items-center">
                         <div className="flex items-center space-x-1 mb-1 text-blue-400"><HeartPulse size={12}/> <span className={`text-[10px] ${t.textMuted}`}>Nadi</span></div>
                         <div className="flex flex-col items-center">
                             <span className={`text-lg font-black ${t.textMain} leading-none`}>{bioData.heartRate > 0 ? <>{formatNumber(bioData.heartRate, language)} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">bpm</span></> : '-'}</span>
                             <span className="text-[8px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mt-0.5">Min {bioData.minHeartRate > 0 ? formatNumber(bioData.minHeartRate, language) : '-'} &bull; Max {bioData.maxHeartRate > 0 ? formatNumber(bioData.maxHeartRate, language) : '-'}</span>
                         </div>
                     </div>
                     
                     {/* SpO2 */}
                     <div className="flex flex-col items-end text-right">
                         <div className="flex items-center space-x-1 mb-1 text-blue-400"><Wind size={12}/> <span className={`text-[10px] ${t.textMuted}`}>SpO2</span></div>
                         <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.oxygenSaturation, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span>
                     </div>
                 </div>
             </div>
             </div>
             
             <button
                 onClick={() => {
                     playSoundEffect('click', soundEnabled);
                     const isExpanding = !isAktivitasExpanded;
                     setIsAktivitasExpanded(isExpanding);
                     setTimeout(() => {
                         const targetId = isExpanding ? 'aktivitas-subcard' : 'aktivitas-accordion';
                         const el = document.getElementById(targetId);
                         if (el) {
                             if (isExpanding) {
                                 const bottom = el.getBoundingClientRect().bottom;
                                 if (bottom > window.innerHeight - 100) {
                                     window.scrollTo({ top: bottom + window.scrollY - window.innerHeight + 120, behavior: 'smooth' });
                                 }
                             } else {
                                 window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                             }
                         }
                     }, 320);
                 }}
                 className={`self-center mt-4 p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
             >
                 {isAktivitasExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
             </button>
          </div>
         </div>
          
          <div id="aktivitas-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isAktivitasExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
             <div className="overflow-hidden">
               <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10 no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
                 <ActivityChart 
                    t={t} theme={theme} history={history} 
                    soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
                    onPointClick={navigateToWorkoutDate}
                    language={language}
                 />
               </div>
             </div>
          </div>
         </div>
      </div>
      </div>

      {/* --- GRUP PROGRESS --- */}
      <div id="progress-accordion" className="relative z-10 flex flex-col w-full min-w-0 anim-rise mt-6 transition-all duration-300" style={{ animationDelay: '120ms' }}>
        <div className="relative z-20">
        {/* SECTION: PROGRESS TAB — Main card */}
          {/* Card Background Layer */}
          <div className={`absolute top-10 inset-x-0 bottom-0 border ${t.border} ${theme === 'dark' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/45 backdrop-blur-md'} shadow-sm z-0 ${isProgressExpanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'}`}></div>

          {/* Extracted Image (Pop-out dari Kiri) */}
          <div
             className="absolute inset-x-0 -top-10 bottom-0 w-full z-10 pointer-events-none overflow-hidden parallax-container"
             style={{
               maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
             }}
          >
             <img src="/bg-progress.webp" alt="" className={`w-full h-full object-cover object-[35%_top] drop-shadow-xl transition-transform duration-500 ease-out ${isProgressExpanded ? 'scale-125' : 'scale-100'}`} />
          </div>

          {/* ------------------------------ */}
          <div className="relative z-20 flex-1 flex flex-col mt-10 pb-4">
             {/* Wrapper for ProgressTab without nested box styling */}
             <div className="mt-3 flex-1 relative z-20">
                <ProgressTab 
                  t={t} lang={lang} language={language} theme={theme} 
                  history={history} programs={programs} exerciseLibrary={exerciseLibrary} 
                  soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
                  selectedDate={selectedDate}
                  isSubCard={false}
                  activePlanIds={activePlanIds}
                  units={units}
                />
             </div>
            <button
                 onClick={() => {
                     playSoundEffect('click', soundEnabled);
                     const isExpanding = !isProgressExpanded;
                     setIsProgressExpanded(isExpanding);
                     setTimeout(() => {
                         const targetId = isExpanding ? 'progress-subcard' : 'progress-accordion';
                         const el = document.getElementById(targetId);
                         if (el) {
                             if (isExpanding) {
                                 const bottom = el.getBoundingClientRect().bottom;
                                 if (bottom > window.innerHeight - 100) {
                                     window.scrollTo({ top: bottom + window.scrollY - window.innerHeight + 120, behavior: 'smooth' });
                                 }
                             } else {
                                 window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                             }
                         }
                     }, 320);
                 }}
                 className={`self-center mt-3 mb-2 p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
             >
                 {isProgressExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
             </button>
          </div>
        </div>
      <div id="progress-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isProgressExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden">
          <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10`}>
            <MuscleProgress 
              t={t} theme={theme} lang={lang}
              history={history} programs={programs} exerciseLibrary={exerciseLibrary}
              soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
              isSubCard={false}
            />
          </div>
        </div>
      </div>
      </div>

      {/* MODULAR MODALS */}
      <DashboardModals 
        t={t} lang={lang} theme={theme}
        showManualModal={showManualModal} setShowManualModal={setShowManualModal} manualTab={manualTab} setManualTab={setManualTab}
        modalDate={modalDate} setModalDate={setModalDate} formBio={formBio} setFormBio={setFormBio} bioData={bioData} lomealToday={lomealToday}
        handleSaveManualData={handleSaveManualData} handleDeleteBioData={handleDeleteBioData} soundEnabled={soundEnabled}
        units={units} setConfirmModal={setConfirmModal} userApiKeys={userApiKeys} aiProvider={aiProvider} aiModel={aiModel} keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses} setShowSettings={setShowSettings}
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
                           <span className={`text-[10px] font-bold ${t.textMain}`}>LOGYM Analysis</span>
                           <div className="relative flex items-center w-max cursor-pointer">
                               <span className={`text-[8px] ${t.textAccent} underline decoration-dashed underline-offset-2 mt-0.5`}>{new Date(modalDate || Date.now()).toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                               <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} onClick={(e) => { try { e.target.showPicker() } catch(err){} }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                           </div>
                       </div>
                   </div>
                   <button onClick={() => setShowDetailsModal(false)} className={`p-2 rounded-full bg-[#3b82f6]/20 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${t.textMain}`}><X size={16}/></button>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => setShowTargetModal(false)}>
              <div className={`w-full max-w-sm rounded-[2rem] border ${t.border} ${t.bgCard} p-6 shadow-2xl anim-scale-in`} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className={`h2 ${t.textMain} flex items-center gap-2`}><Settings size={20} className={t.textAccent}/> Target Harian</h3>
                      <button onClick={() => { playSoundEffect('click', soundEnabled); setShowTargetModal(false); }} className={`p-1.5 rounded-full ${t.bgBox} ${t.textMuted} hover:${t.textMain} transition-colors`}><X size={16}/></button>
                  </div>

                  <div className="space-y-4">
                      {/* Langkah */}
                      <div className={`p-4 rounded-2xl ${t.bgBox} border ${t.borderDashed}`}>
                          <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                                  <Footprints size={14} />
                              </div>
                              <div className="flex-1">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Target Langkah Kaki</label>
                              </div>
                          </div>
                          <div className="relative">
                              <SwipeInput 
                                  value={targetForm.steps || ''} 
                                  onChange={(v) => setTargetForm(p => ({...p, steps: Number(v)}))} 
                                  min={0} max={50000} step={1000} 
                                  placeholder="Contoh: 10000"
                                  language={language}
                                  className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-4 rounded-xl outline-none font-black text-center text-xl pr-14`}
                              />
                              <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted}`}>Langkah</span>
                          </div>
                      </div>

                      {/* Tidur */}
                      <div className={`p-4 rounded-2xl ${t.bgBox} border ${t.borderDashed}`}>
                          <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                                  <Moon size={14} />
                              </div>
                              <div className="flex-1">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Durasi Tidur</label>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <SwipeInput 
                                      value={Math.floor(targetForm.sleep || 0) || ''} 
                                      onChange={(v) => {
                                          const currentMins = Math.round(((targetForm.sleep || 0) % 1) * 60);
                                          setTargetForm(p => ({...p, sleep: (Number(v) || 0) + (currentMins/60)}));
                                      }} 
                                      min={0} max={24} step={1} 
                                      placeholder="0"
                                      language={language}
                                      className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-4 rounded-xl outline-none font-black text-center text-xl pr-14`}
                                  />
                                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted}`}>Jam</span>
                              </div>
                              <div className="relative flex-1">
                                  <SwipeInput 
                                      value={Math.round(((targetForm.sleep || 0) % 1) * 60) || ''} 
                                      onChange={(v) => {
                                          const currentHrs = Math.floor(targetForm.sleep || 0) || 0;
                                          setTargetForm(p => ({...p, sleep: currentHrs + ((Number(v) || 0)/60)}));
                                      }} 
                                      min={0} max={59} step={1} 
                                      placeholder="0"
                                      language={language}
                                      className={`w-full ${t.placeholderAccent} ${t.inputBg} ${t.textMain} p-4 rounded-xl outline-none font-black text-center text-xl pr-14`}
                                  />
                                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted}`}>Mnt</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className={`flex space-x-3 mt-6 border-t ${t.borderDashed} pt-5`}>
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
    </div>
  );
};

export default DashboardTab;
