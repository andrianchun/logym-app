import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Zap, Brain, Footprints, HeartPulse, Moon, Droplets, Droplet, Dumbbell, Scale, RefreshCw, Trophy, Link2, Pencil, Settings, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Wind, Utensils, Flame, Clock, Cloud, CloudOff, Bluetooth, Target } from 'lucide-react';
import { getLocalYMD, hasDeletedProjected, isLomealOwned } from '../data/constants';
import { calculateReadiness, restingHrBaseline } from '../utils/readinessEngine';
import DashboardModals from '../components/DashboardModals';
import DashboardChart from '../components/DashboardChart';
import ActivityChart from '../components/ActivityChart';
import VitalsChart, { VITALS_METRICS } from '../components/VitalsChart';
import ProgressTab from './ProgressTab';
import { MuscleProgress } from '../components/MuscleProgress';
import SwipeInput from '../components/SwipeInput';
import { formatNumber, sleepHoursToParts } from '../utils/numberFormat';
import { dailyBurnCalories, dailyActiveMinutes, deduplicateWorkouts } from '../utils/workoutCalc';
import { dayBmr } from '../utils/bmr';
import { calculateBodyComposition, enrichBioWithImpedance } from '../utils/xiaomiScaleCalc';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, ReferenceArea } from 'recharts';


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

// Warna per SUMBER data, dipakai sama persis di bar Durasi Aktif maupun Kalori Dibakar — jadi
// "biru itu langkah" berlaku di kedua bar, tidak perlu dihafal dua kali.
const PART_COLORS = {
    bmr:     { bar: 'bg-blue-500', dot: 'bg-blue-500' },
    manual:  { bar: 'bg-zinc-400 dark:bg-zinc-500', dot: 'bg-zinc-400 dark:bg-zinc-500' },
    neat:    { bar: 'bg-indigo-400 dark:bg-indigo-400', dot: 'bg-indigo-400 dark:bg-indigo-400' },
    langkah: { bar: 'bg-indigo-400 dark:bg-indigo-400', dot: 'bg-indigo-400 dark:bg-indigo-400' },
    eat:     { bar: 'bg-sky-400 dark:bg-sky-400', dot: 'bg-sky-400 dark:bg-sky-400' },
    latihan: { bar: 'bg-sky-400 dark:bg-sky-400', dot: 'bg-sky-400 dark:bg-sky-400' },
    tef:     { bar: 'bg-emerald-400 dark:bg-emerald-400', dot: 'bg-emerald-400 dark:bg-emerald-400' },
    // Warna kardio/beban disamakan dengan grafik subcard (ActivityChart) supaya satu warna
    // berarti satu hal di seluruh dasbor.
    kardio:  { bar: 'bg-zinc-400 dark:bg-zinc-500', dot: 'bg-zinc-400 dark:bg-zinc-500' },
    beban:   { bar: 'bg-sky-400 dark:bg-sky-400', dot: 'bg-sky-400 dark:bg-sky-400' },
};

// Empat kotak di kartu Aktivitas Harian bottom-align isinya (`justify-end`), jadi angka besarnya
// baru sebaris kalau yang DI BAWAHNYA sama tinggi. Tinggi bar + baris keterangan dikunci lewat
// dua konstanta ini supaya kotak yang tidak punya rincian (Langkah Kaki, Kalori Dimakan) bisa
// memesan tinggi yang sama persis — kalau angkanya diketik ulang di tiap kotak, satu kotak
// diubah sedikit langsung bikin angkanya berjenjang lagi.
// NUM_ROW = jarak dari angka besar ke bar di bawahnya. Dulu baris atas pakai mb-2 dan baris
// bawah mb-0.5, jadi dua bar itu menggantung beda tinggi dari angkanya masing-masing.
const NUM_ROW = 'mb-2';
const BAR_ROW = 'h-1.5 mb-1.5';
// Tinggi baris keterangan dikunci DUA baris walau isinya cuma satu: kotaknya selebar setengah
// layar, jadi rincian tiga sumber (BMR/Langkah/Latihan) pasti melipat. Kalau tingginya dibiarkan
// mengikuti isi, kotak yang melipat mendorong angka besarnya naik dan tidak lagi sebaris dengan
// tetangganya. Dipesan tetap = tata letaknya juga tidak lompat saat angkanya berubah.
const LEGEND_ROW = 'h-8 items-start content-start';

// Bar bertumpuk + keterangan bertitik warna. `basis` = pembagi lebar segmen: target harian buat
// Durasi Aktif, total buat Kalori Dibakar (yang tidak punya target).
//
// Nama sumber ikut ditulis, bukan cuma titik warna: begitu tinggal satu segmen (mis. kalori
// diisi manual), titik + angka telanjang tidak memberi tahu apa-apa soal asal angkanya.
// Segmen bernilai 0 dibuang dari keterangan, bukan cuma dari bar: "0" tidak menambah informasi
// apa pun tapi memakan lebar yang justru bikin barisnya melipat lebih cepat.
const StackedBar = ({ parts, basis, language, align = 'left', showLegend = true }) => {
    const safeBasis = basis > 0 ? basis : 1;
    const shown = parts.filter(p => p.value > 0);
    return (
        <>
            <div className={`w-full ${BAR_ROW} bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0 flex ${align === 'right' ? 'justify-end' : ''}`}>
                {shown.map(p => (
                    <div key={p.key} className={`h-full ${PART_COLORS[p.key].bar} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                         style={{ width: `${Math.min(100, (p.value / safeBasis) * 100)}%` }} />
                ))}
            </div>
            {showLegend && (
                <div className={`flex flex-wrap gap-x-2 ${LEGEND_ROW} ${align === 'right' ? 'justify-end' : ''}`}>
                    {shown.map(p => (
                        <span key={p.key} className="flex items-center gap-1 whitespace-nowrap text-[9px] text-zinc-500 dark:text-zinc-400">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PART_COLORS[p.key].dot}`} />
                            {p.label} {formatNumber(p.value, language)}
                        </span>
                    ))}
                </div>
            )}
        </>
    );
};

const MiniBox = ({ label, value, unit, t, theme }) => (
    <div className={`p-3 rounded-xl flex flex-col items-center justify-center text-center ${t.bgCardSoft} border ${t.border} transition-transform duration-300 active:scale-[0.98]`}>
        <span className={`h2 ${t.textMain}`}>{value || '-'}</span>
        <span className={`text-[9px] font-bold ${t.textMuted} mt-1 uppercase tracking-wider`}>{label}</span>
    </div>
);

const DashboardTab = ({ isActive = true, t, lang, language, user, history, setHistory, programs, exerciseLibrary, navigateToWorkoutDate, soundEnabled, playSoundEffect, theme, selectedDate, biometricStandard, units, setConfirmModal, activityTargets, setActivityTargets, gymProfiles, activeGymId, activePlanIds, userApiKeys, userAchievements, connectedApps, userProfile, keyStatuses, setKeyStatuses, setShowSettings, lomealToday, lomealTargets, syncStatus, isBleBusy, expandedSessions, bleManager }) => {
  const todayStr = getLocalYMD(new Date());
  const activeDate = todayStr;
  const isID = (language || lang?.id || 'ID').toUpperCase() === 'ID';
  const resolveBfStatus = (bfVal, isFemaleUser, isIndo) => {
    const bf = Number(bfVal);
    if (!bf || bf <= 0) return '-';
    if (isFemaleUser) {
      if (bf < 18) return isIndo ? 'Rendah' : 'Low';
      if (bf <= 28) return isIndo ? 'Normal' : 'Normal';
      if (bf <= 33) return isIndo ? 'Tinggi' : 'High';
      return isIndo ? 'Sangat Tinggi' : 'Very High';
    } else {
      if (bf < 10) return isIndo ? 'Rendah' : 'Low';
      if (bf <= 20) return isIndo ? 'Normal' : 'Normal';
      if (bf <= 25) return isIndo ? 'Tinggi' : 'High';
      return isIndo ? 'Sangat Tinggi' : 'Very High';
    }
  };
  const resolveBfColor = (bfVal, isFemaleUser) => {
    const bf = Number(bfVal);
    if (!bf || bf <= 0) return 'text-zinc-500';
    const limitNorm = isFemaleUser ? 28 : 20;
    const limitLow = isFemaleUser ? 18 : 10;
    const limitHigh = isFemaleUser ? 33 : 25;
    if (bf < limitLow) return 'text-sky-500';
    if (bf <= limitNorm) return 'text-emerald-500';
    if (bf <= limitHigh) return 'text-amber-500';
    return 'text-rose-500';
  };
  const resolveBmiStatus = (status, isIndo) => {
    if (!status || status === '-') return '-';
    const s = String(status).toLowerCase();
    if (s.includes('under') || s.includes('kurang')) return isIndo ? 'Kurang' : 'Underweight';
    if (s.includes('normal') || s.includes('standar')) return isIndo ? 'Normal' : 'Normal';
    if (s.includes('over') || s.includes('lebih')) return isIndo ? 'Berlebih' : 'Overweight';
    if (s.includes('obese') || s.includes('tinggi') || s.includes('obesitas')) return isIndo ? 'Obesitas' : 'Obese';
    return status;
  };

  // ==========================================
  // STATE KONEKSI & SINKRONISASI
  // ==========================================
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showSleepTargetModal, setShowSleepTargetModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isLogyHidden, setIsLogyHidden] = useState(() => localStorage.getItem('lyfit_logy_hidden') === 'true');
  const detailsScrollRef = useRef(null);

  // Mencegah scroll chaining / rubber-banding ke background saat mentok atas atau bawah
  useEffect(() => {
    const el = detailsScrollRef.current;
    if (!el || !showDetailsModal) return;

    let touchStartY = 0;
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;
      const isAtTop = el.scrollTop <= 1;
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

      // Mentok atas dan ditarik ke bawah (pull down at top boundary)
      if (isAtTop && deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      // Mentok bawah dan didorong ke atas (push up at bottom boundary)
      if (isAtBottom && deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        return;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showDetailsModal]);

  useEffect(() => {
    if (showCalorieModal || showDurationModal || showStepsModal || showSleepTargetModal || showDetailsModal || showManualModal) {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      const origBodyOverscroll = document.body.style.overscrollBehavior;
      const origHtmlOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';

      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
        document.body.style.overscrollBehavior = origBodyOverscroll;
        document.documentElement.style.overscrollBehavior = origHtmlOverscroll;
      };
    }
  }, [showCalorieModal, showDurationModal, showStepsModal, showSleepTargetModal, showDetailsModal, showManualModal]);

  useEffect(() => {
      const handleToggle = (e) => {
          if (e.detail?.action === 'show' || e.detail?.action === 'showAndOpen') {
              setIsLogyHidden(false);
          } else if (e.detail?.action === 'hide') {
              setIsLogyHidden(true);
          } else {
              setIsLogyHidden(prev => !prev);
          }
      };
      window.addEventListener('toggle-logy-float', handleToggle);
      return () => window.removeEventListener('toggle-logy-float', handleToggle);
  }, []);


  // ==========================================
  // STATE MODAL INPUT MANUAL & TANGGAL
  // ==========================================
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
  
  // TARGET SETTINGS PER KARTU
  const [editSteps, setEditSteps] = useState(activityTargets?.steps || 10000);
  const [editWeeklyDuration, setEditWeeklyDuration] = useState(activityTargets?.weeklyActiveMinutes || 150);
  const [editSleepHours, setEditSleepHours] = useState(Math.floor(activityTargets?.sleep || 8));
  const [editSleepMinutes, setEditSleepMinutes] = useState(Math.round(((activityTargets?.sleep || 8) % 1) * 60));

  useEffect(() => {
     if (activityTargets) {
        if (activityTargets.steps) setEditSteps(activityTargets.steps);
        if (activityTargets.weeklyActiveMinutes) {
           setEditWeeklyDuration(activityTargets.weeklyActiveMinutes);
        }
        if (activityTargets.sleep != null) {
           setEditSleepHours(Math.floor(activityTargets.sleep));
           setEditSleepMinutes(Math.round((activityTargets.sleep % 1) * 60));
        }
     }
  }, [activityTargets]);

  const handleSaveStepsTarget = (val) => {
     const s = Number(val ?? editSteps) || 10000;
     playSoundEffect('click', soundEnabled);
     setActivityTargets(prev => ({ ...prev, steps: s }));
     setShowStepsModal(false);
  };

  const handleSaveWeeklyDurationTarget = (val) => {
     const d = Number(val ?? editWeeklyDuration) || 150;
     playSoundEffect('click', soundEnabled);
     setActivityTargets(prev => ({ ...prev, weeklyActiveMinutes: d }));
  };

  const handleSaveSleepTarget = (hVal, mVal) => {
     const hrs = Number(hVal ?? editSleepHours) || 0;
     const mins = Number(mVal ?? editSleepMinutes) || 0;
     const total = Number((hrs + (mins / 60)).toFixed(2)) || 8;
     playSoundEffect('click', soundEnabled);
     setActivityTargets(prev => ({ ...prev, sleep: total }));
     setShowSleepTargetModal(false);
  };

  const parseSleepHours = (str) => {
      // Nilai dari Health Connect berupa ANGKA jam (mis. 7.4), sedangkan input manual lama
      // berupa teks "7h 30m". Dulu cuma teks yang ditangani, jadi begitu data tidur otomatis
      // masuk, `.match` dipanggil pada angka dan seluruh dasbor crash
      // ("(se || '').match is not a function").
      if (typeof str === 'number') return isNaN(str) ? 0 : str;
      if (str == null) return 0;
      const s = String(str);
      const parts = s.match(/(\d+)h\s*(\d+)m/);
      if (parts) return parseInt(parts[1]) + (parseInt(parts[2]) / 60);
      const plain = parseFloat(s);
      return isNaN(plain) ? 0 : plain;
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

  const [isSleepExpanded, setIsSleepExpanded] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_sleep_expanded');
          if (saved !== null) return JSON.parse(saved);
      } catch(e) {}
      return false;
  });

  useEffect(() => {
      localStorage.setItem('lyfit_sleep_expanded', JSON.stringify(isSleepExpanded));
  }, [isSleepExpanded]);

  const [sleepSubTab, setSleepSubTab] = useState('durasi');
  const prefillBioRef = useRef(null);
  // Navigasi tanggal KHUSUS kartu tidur (0 = hari ini, 1 = kemarin, dst). Turunannya
  // (sleepDate/sleepBio) didefinisikan SESUDAH bioData di bawah — bukan di sini — karena
  // membacanya sebelum itu bikin error "Cannot access before initialization" saat render.
  const [sleepOffset, setSleepOffset] = useState(0);

  // Parallax removed for performance

  const emptyBio = {
    bodyScore: null, weight: null, height: null, bmi: null, bmiStatus: '-', bodyFat: null, bodyFatStatus: '-',
    muscleMass: null, musclePercent: null, boneMass: null, waterPercent: null, visceralFat: null, bmr: null, bodyAge: null, 
    waist: null, waistToHip: null, proteinPercent: null, bodyType: '-', weightSuggestion: '-',
    steps: '', stepMinutes: '', distance: '', activeMinutes: '', activityCalories: '', nutritionCalories: '', sleep: '', energyScore: null, 
    sleepAwake: '', sleepRem: '', sleepLight: '', sleepDeep: '', hrv: null,
    heartRate: null, minHeartRate: null, maxHeartRate: null, bloodPressure: '', oxygenSaturation: null, waterIntake: '',
    weeklyDuration: '', weeklySessions: '', weeklyCalories: ''
  };

  const [formBio, setFormBio] = useState({ ...emptyBio });

  const { bioData, bioDataDate } = useMemo(() => {
     let todayDailyData = history[activeDate]?.bioData || {};
     const sortedDates = Object.keys(history).filter(d => d <= activeDate).sort((a,b) => b.localeCompare(a));

     // Komposisi tubuh dibaca dari SATU hari snapshot (bukan campur per-field dari tanggal
     // beda-beda) — biar "Data dari: X" akurat, semua angka yang tampil beneran dari tanggal
     // itu, bukan gado-gado field lama+baru yang bikin labelnya menyesatkan. Pemicunya WAJIB
     // mencakup semua field komposisi (termasuk waist) — dulu cuma cek 5 field dan waist gak
     // pernah bisa jadi pemicu, jadi entri "cuma isi lingkar perut hari ini" ketimpa balik
     // snapshot hari lama yang gak punya lingkar perut sama sekali.
     const COMPOSITION_FIELDS = ['weight', 'bodyFat', 'musclePercent', 'muscleMass', 'boneMass', 'visceralFat', 'waterPercent', 'proteinPercent', 'bodyAge', 'bmr', 'bodyScore', 'waist'];
     let latestBodyData = null;
     let bodyDataDate = null;
     let fallbackHeight = null;
     let fallbackWaist = null;

     for (const date of sortedDates) {
         const dayBio = history[date]?.bioData;
         if (dayBio) {
             if (!fallbackHeight && dayBio.height) fallbackHeight = dayBio.height;
             if (!fallbackWaist && dayBio.waist) fallbackWaist = dayBio.waist;

             if (!latestBodyData && COMPOSITION_FIELDS.some(f => Number(dayBio[f]) > 0)) {
                 latestBodyData = dayBio;
                 bodyDataDate = date;
             }

             if (fallbackHeight && fallbackWaist && latestBodyData) {
                 break;
             }
         }
     }

      if (latestBodyData) {
          latestBodyData = enrichBioWithImpedance(latestBodyData, userProfile, fallbackHeight, bodyDataDate, biometricStandard);
      }

     const mergedData = {
         ...emptyBio,
         weight: userProfile?.weight || null,
         ...latestBodyData,
         height: (latestBodyData && latestBodyData.height) || fallbackHeight || userProfile?.height || emptyBio.height,
         waist: (latestBodyData && latestBodyData.waist) || fallbackWaist || emptyBio.waist,
         steps: todayDailyData.steps !== undefined ? todayDailyData.steps : (emptyBio.steps || 0),
         stepMinutes: todayDailyData.stepMinutes !== undefined ? todayDailyData.stepMinutes : (emptyBio.stepMinutes || 0),
         distance: todayDailyData.distance !== undefined ? todayDailyData.distance : (emptyBio.distance || 0),
         bmr: todayDailyData.bmr !== undefined ? todayDailyData.bmr : (emptyBio.bmr || null),
         activeMinutes: todayDailyData.activeMinutes !== undefined ? todayDailyData.activeMinutes : (emptyBio.activeMinutes || 0),
         activityCalories: todayDailyData.activityCalories !== undefined ? todayDailyData.activityCalories : (emptyBio.activityCalories || 0),
         nutritionCalories: todayDailyData.nutritionCalories !== undefined ? todayDailyData.nutritionCalories : (emptyBio.nutritionCalories || 0),
         sleep: todayDailyData.sleep !== undefined ? todayDailyData.sleep : (emptyBio.sleep || 0),
         sleepAwake: todayDailyData.sleepAwake !== undefined ? todayDailyData.sleepAwake : (emptyBio.sleepAwake || ''),
         sleepRem: todayDailyData.sleepRem !== undefined ? todayDailyData.sleepRem : (emptyBio.sleepRem || ''),
         sleepLight: todayDailyData.sleepLight !== undefined ? todayDailyData.sleepLight : (emptyBio.sleepLight || ''),
         sleepDeep: todayDailyData.sleepDeep !== undefined ? todayDailyData.sleepDeep : (emptyBio.sleepDeep || ''),
         hrv: todayDailyData.hrv !== undefined ? todayDailyData.hrv : (emptyBio.hrv || null),
         sleepLog: todayDailyData.sleepLog !== undefined ? todayDailyData.sleepLog : (emptyBio.sleepLog || []),
         energyScore: todayDailyData.energyScore !== undefined ? todayDailyData.energyScore : (emptyBio.energyScore || null),
         heartRate: todayDailyData.heartRate !== undefined ? todayDailyData.heartRate : (emptyBio.heartRate || null),
         minHeartRate: todayDailyData.minHeartRate !== undefined ? todayDailyData.minHeartRate : (emptyBio.minHeartRate || null),
         maxHeartRate: todayDailyData.maxHeartRate !== undefined ? todayDailyData.maxHeartRate : (emptyBio.maxHeartRate || null),
         bloodPressure: todayDailyData.bloodPressure !== undefined ? todayDailyData.bloodPressure : (emptyBio.bloodPressure || ''),
         oxygenSaturation: todayDailyData.oxygenSaturation !== undefined ? todayDailyData.oxygenSaturation : (emptyBio.oxygenSaturation || null),
         waterIntake: todayDailyData.waterIntake !== undefined ? todayDailyData.waterIntake : (emptyBio.waterIntake || 0),
         weeklyDuration: todayDailyData.weeklyDuration !== undefined ? todayDailyData.weeklyDuration : (emptyBio.weeklyDuration || 0),
         weeklySessions: todayDailyData.weeklySessions !== undefined ? todayDailyData.weeklySessions : (emptyBio.weeklySessions || 0),
         weeklyCalories: todayDailyData.weeklyCalories !== undefined ? todayDailyData.weeklyCalories : (emptyBio.weeklyCalories || 0),
         // _manualFlags composition (weight/bodyFat/dst) gak pernah dibaca logic apa pun — cuma
         // dipakai buat gate activityCalories/nutritionCalories, dan itu selalu dari hari ini.
         _manualFlags: { ...(todayDailyData?._manualFlags || {}) }
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
     
     // BMR kartu = turunan Logym yang SAMA dengan grafik & hitungan kalori (dayBmr). Dihitung
     // ulang selalu, bukan cuma kalau kosong: angka dari timbangan/scan AI/Health Connect memakai
     // rumus berbeda-beda, jadi kartu dan grafik dulu bisa menunjukkan dua angka untuk hari yang
     // sama. Fallback diam-diam "tinggi 165 / umur 25 / male" ikut dibuang — kalau profilnya belum
     // lengkap, dayBmr mengembalikan angka tersimpan apa adanya, bukan tebakan yang terlihat wajar.
     {
         const dihitung = dayBmr(mergedData, userProfile);
         if (dihitung > 0) mergedData.bmr = dihitung;
     }
     
     return { 
         bioData: mergedData,
         bioDataDate: bodyDataDate
     };
  }, [history, activeDate, todayStr]);

  // Turunan navigasi kartu tidur — harus SESUDAH bioData di atas.
  const sleepDate = useMemo(() => {
    const d = new Date(`${activeDate}T12:00:00`);
    d.setDate(d.getDate() - sleepOffset);
    return getLocalYMD(d);
  }, [activeDate, sleepOffset]);
  // Hari ini pakai bioData hasil merge (sudah termasuk warisan & input manual); hari lain
  // dibaca langsung dari riwayat.
  const sleepBio = sleepOffset === 0 ? bioData : (history[sleepDate]?.bioData || {});
  // Skor kesiapan untuk tanggal yang sedang dilihat kartu Pemulihan (punya navigasi tanggal
  // sendiri), bukan selalu hari ini. Baselinenya diambil dari 14 hari SEBELUM tanggal itu.
  const sleepReadiness = useMemo(
    () => calculateReadiness(sleepBio, restingHrBaseline(history, sleepDate)),
    [sleepBio, history, sleepDate]
  );
  const sleepDateLabel = sleepOffset === 0
    ? 'Semalam'
    : new Date(`${sleepDate}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

  // ==========================================
  // FUNGSI AKSI (TOMBOL & FORM)
  // ==========================================


  useEffect(() => {
     if (showManualModal) {
         let initialBio = { ...emptyBio };
         if (history[modalDate] && history[modalDate].bioData) {
             const enriched = enrichBioWithImpedance(history[modalDate].bioData, userProfile, null, modalDate, biometricStandard);
             initialBio = { ...enriched };
         }

         // Prefill height dan waist dari riwayat jika hari ini kosong (berguna jika timbangan
         // cuma ngasih berat, biar form gak kosong).
         if (!initialBio.height || !initialBio.waist) {
             const sortedDates = Object.keys(history).filter(d => d <= modalDate).sort().reverse();
             let fallbackH = initialBio.height;
             let fallbackW = initialBio.waist;
             for (const d of sortedDates) {
                 if (fallbackH && fallbackW) break;
                 const past = history[d]?.bioData;
                 if (past) {
                     if (!fallbackH && past.height) fallbackH = past.height;
                     if (!fallbackW && past.waist) fallbackW = past.waist;
                 }
             }
             initialBio.height = fallbackH || userProfile?.height || emptyBio.height;
             initialBio.waist = fallbackW || emptyBio.waist;
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
         // Salinan beku nilai prefill, dipakai handleSaveManualData buat membedakan "diketik user"
         // dari "sudah terisi duluan oleh hitungan/sinkron". Tanpa pembanding ini tidak ada cara
         // tahu field mana yang benar-benar disentuh.
         prefillBioRef.current = { ...initialBio };
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
          const isFemale = userProfile?.gender === 'female';
          newData.bodyFatStatus = resolveBfStatus(newData.bodyFat, isFemale, isID);
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
             
             setHistory(prev => {
                 const existingBio = prev[modalDate]?.bioData || {};
                 const manualFlags = { ...(existingBio._manualFlags || {}) };
                 
                 // HANYA field yang BENAR-BENAR DIUBAH user yang ditandai manual.
                 //
                 // Dulu setiap field tidak kosong ikut ditandai — padahal form ini sudah terisi
                 // duluan oleh angka hasil hitungan Logym dan hasil sinkron Health Connect. Jadi
                 // sekadar membuka modal lalu menekan Simpan (walau cuma mau mengisi SATU field)
                 // membekukan semuanya jadi "manual". Akibatnya fatal: mergeHcDays melewati field
                 // bertanda manual, jadi langkah, nadi, SpO2, dan tidur BERHENTI disinkron dari
                 // Health Connect untuk hari itu, selamanya, tanpa pemberitahuan apa pun.
                 // (Kejadian 9 Agu 2026 — kartu menampilkan "Manual 1.789" untuk angka yang tidak
                 // pernah diketik siapa pun.)
                 const sama = (a, b) => {
                     if (a === null || a === undefined || a === '') return b === null || b === undefined || b === '';
                     if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
                     return String(a) === String(b);
                 };
                 Object.keys(evaluatedData).forEach(k => {
                     const kosong = evaluatedData[k] === null || evaluatedData[k] === '';
                     if (kosong) {
                         delete manualFlags[k]; // dikosongkan = kembalikan ke otomatis
                         return;
                     }
                     // Tidak berubah dari nilai prefill → bukan input user, biarkan tetap otomatis.
                     if (sama(evaluatedData[k], prefillBioRef.current?.[k])) {
                         delete manualFlags[k];
                         return;
                     }
                     // Simpan nilainya sendiri (bukan cuma `true`) — activityCalories butuh angka
                     // manual yang STABIL sebagai basis, supaya tidak ikut kebaca ulang dari
                     // bioData.activityCalories yang tiap render ditimpa hasil hitung otomatis.
                     manualFlags[k] = evaluatedData[k];
                 });

                 return {
                     ...prev,
                     [modalDate]: {
                         ...(prev[modalDate] || {}),
                         bioData: {
                             ...evaluatedData,
                             _manualFlags: manualFlags
                         }
                     }
                 };
             });
             setShowManualModal(false);
         }
     });
  };

  // Lepas SEMUA tanda manual hari itu tanpa menghapus angkanya. Hari yang terlanjur terkunci
  // (mis. karena versi lama menandai seluruh isi form saat Simpan) tidak punya jalan pulih lain:
  // selama tandanya ada, mergeHcDays melewati field itu dan Health Connect tidak akan pernah
  // mengisinya lagi. Setelah dilepas, sinkron berikutnya menimpanya dengan data asli dari HC.
  const handleUnlockManual = () => {
     playSoundEffect('click', soundEnabled);
     setHistory(prev => {
        const bio = prev[modalDate]?.bioData;
        if (!bio?._manualFlags) return prev;
        const { _manualFlags, ...rest } = bio;
        return { ...prev, [modalDate]: { ...prev[modalDate], bioData: rest } };
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
                 ['weight', 'height', 'waist', 'bmi', 'bmiStatus', 'bodyFat', 'bodyFatStatus', 'bmr', 'muscleMass', 'musclePercent', 'boneMass', 'visceralFat', 'waterPercent', 'proteinPercent', 'bodyAge', 'bodyScore'].forEach(k => { 
                     newBio[k] = null;
                     if (newBio._manualFlags) delete newBio._manualFlags[k];
                 });
             } else {
                 // `stepMinutes`, `distance`, dan `bmr` dulu tidak ikut disebut di sini — ketiganya
                 // ditambahkan belakangan dan daftar ini tidak ikut diperbarui. Akibatnya setelah
                 // "hapus data hari ini" ketiganya tertinggal dengan nilai lama sementara yang lain
                 // kosong, dan tampilannya jadi campur aduk (Langkah "–" tapi Durasi Aktif tetap
                 // menampilkan menit dari langkah).
                 ['steps', 'stepMinutes', 'distance', 'bmr', 'activeMinutes', 'activityCalories', 'activityCaloriesFloor', 'nutritionCalories', 'sleep', 'sleepLog', 'heartRate', 'minHeartRate', 'maxHeartRate', 'restingHeartRate', 'bloodPressure', 'oxygenSaturation', 'heartRateLog', 'bloodPressureLog', 'oxygenSaturationLog', 'waterIntake', 'weeklyDuration', 'weeklySessions', 'weeklyCalories', 'sleepAwake', 'sleepRem', 'sleepLight', 'sleepDeep', 'hrv', 'energyScore'].forEach(k => {
                     newBio[k] = null;
                     if (newBio._manualFlags) delete newBio._manualFlags[k];
                 });
             }
             
             const isCompletelyEmpty = Object.values(newBio).every(v => v === null || v === undefined || v === '');
             
             if (isCompletelyEmpty) {
                 // deletedProjected wajib ikut dicek: itu satu-satunya jejak "sesi terjadwal ini
                 // sudah dihapus user". Buang harinya = sesi yang dihapus muncul lagi.
                 if (!newHistory[modalDate].programId && !newHistory[modalDate].status && !hasDeletedProjected(newHistory[modalDate]) && (!newHistory[modalDate].workouts || newHistory[modalDate].workouts.length === 0)) {
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
  const mainFfmi = useMemo(() => {
    const hCm = Number(bioData.height || userProfile?.height || 0);
    const wKg = Number(bioData.weight || 0);
    const bf = Number(bioData.bodyFat || 0);
    if (hCm > 0 && wKg > 0 && bf > 0) {
      const hMeter = hCm / 100;
      const ffmKg = wKg * (1 - (bf / 100));
      return Number((ffmKg / (hMeter * hMeter)).toFixed(1));
    }
    return '-';
  }, [bioData.height, bioData.weight, bioData.bodyFat, userProfile?.height]);

  const mainWthr = useMemo(() => {
    const hCm = Number(bioData.height || userProfile?.height || 0);
    const waistCm = Number(bioData.waist || 0);
    if (hCm > 0 && waistCm > 0) {
      return Number((waistCm / hCm).toFixed(2));
    }
    return '-';
  }, [bioData.height, bioData.waist, userProfile?.height]);

  // Smart Merge Deduplication (LyFit Internal + BioData/HealthConnect)
  const { 
    mergedDailyActiveMinutes, 
    mergedDurationParts, 
    actDetail = null,
    mergedCalorieParts, 
    mergedDailyCalories, 
    mergedDailyCaloriesFloor, 
    mergedWeeklyActiveMinutes, 
    mergedWeeklySessions, 
    mergedWeeklyCalories,
    bmrCalories = 0,
    stepsCalories = 0,
    workoutCalories = 0,
    tefCalories = 0,
    tefDetail = null,
  } = useMemo(() => {
     const currentWeight = Number(bioData.weight) || 70; // Asumsi 70kg jika tidak ada data

     const todayWks = deduplicateWorkouts(history[activeDate]?.workouts || []);
     const todayCompletedWks = todayWks.filter(w => w.status === 'completed' || w.programId === 'adhoc');

     // Ambil data nutrisi fresh dari Lomeal jika ada (termasuk Protein, Karbohidrat, Lemak)
     const lomealFresh = lomealToday?.ymd === activeDate ? lomealToday : null;
     const effectiveBio = {
       ...bioData,
       nutritionCalories: lomealFresh?.kcal ?? bioData.nutritionCalories,
       protein: lomealFresh?.protein ?? bioData.protein,
       carbs: lomealFresh?.carbs ?? bioData.carbs,
       fat: lomealFresh?.fat ?? bioData.fat,
     };

     // Kalori harian: SATU rumus, di workoutCalc.js. Salinannya dulu ada di sini, di
     // handleSaveWorkout, di ActivityChart, dan di ShareCardGenerator — dan ketiganya sempat
     // berbeda, jadi kartu, grafik, dan kartu bagikan menampilkan angka berbeda untuk hari sama.
     const burn = dailyBurnCalories(effectiveBio, todayWks, currentWeight, history[activeDate]?.exerciseLogs, userProfile);
     const isDailyCalsManual = burn.isManual;
     const intTodayCardio = burn.kardio;
     const intTodayWeights = burn.beban;

     // Durasi Aktif = jalan + latihan, satu rumus di workoutCalc.js — sama seperti kalori.
     // Menit jalan sudah dikurangi durasi sesi kardio di dalamnya, jadi treadmill tidak lagi
     // terhitung dua kali (sekali sebagai menit-langkah, sekali sebagai durasi sesi).
     const act = dailyActiveMinutes(bioData, todayWks, history[activeDate]?.exerciseLogs);
     const intTodayDur = act.workoutMinutes;
     const stepMinutes = act.stepMinutes;
     const autoActive = act.auto;
     const manualActive = act.manual;
     const dailyActive = act.total;

     let intTodayExercises = 0;
     todayCompletedWks.forEach(w => {
         if (w.exercises && Array.isArray(w.exercises)) {
             intTodayExercises += w.exercises.length;
         } else if (w.log && typeof w.log === 'object') {
             intTodayExercises += Object.keys(w.log).length;
         } else {
             intTodayExercises += 1;
         }
     });
     
     // Kalori Dibakar = BMR + NEAT (Langkah) + EAT (Workout) + TEF (Efek Cerna Makanan).
     // Semua cabangnya ada di dailyBurnCalories.
     const bmrCalories = burn.bmr;
     const stepsCalories = burn.steps;
     const workoutCalories = burn.workout;
     const tefCalories = burn.tef;
     const totalDailyCals = burn.floor;
     const dailyCals = burn.total;

     let weeklyDur = 0;
     let weeklyWorkoutDur = 0;
     let weeklySess = 0;
     let weeklyCardioSess = 0;
     let weeklyWeightSess = 0;
     let weeklyCals = 0;
     const end = new Date(activeDate);
     
     for (let i = 0; i < 7; i++) {
         const d = new Date(end);
         d.setDate(end.getDate() - i);
         const dateStr = getLocalYMD(d);
         const dayData = history[dateStr] || {};
         
         const wks = dayData.workouts || [];
         const completedWks = wks.filter(w => w.status === 'completed' || w.programId === 'adhoc');
         weeklySess += completedWks.length;

         completedWks.forEach(w => {
             const exs = w.overriddenExercises || w.exercises || [];
             const isCardioWorkout = exs.length > 0 && exs.every(ex => ex.target?.some(t => t.toLowerCase().includes('cardio') || t.toLowerCase().includes('kardio')));
             if (isCardioWorkout) weeklyCardioSess++;
             else weeklyWeightSess++;
         });

         const dayAct = dailyActiveMinutes(dayData.bioData, wks, dayData.exerciseLogs);
         weeklyDur += dayAct.total;
         weeklyWorkoutDur += dayAct.workoutMinutes;
         const dayBio = dayData.bioData || {};
         const isDayFresh = dateStr === activeDate && lomealFresh;
         const effectiveDayBio = isDayFresh
           ? { ...dayBio, nutritionCalories: lomealFresh.kcal, protein: lomealFresh.protein, carbs: lomealFresh.carbs, fat: lomealFresh.fat }
           : dayBio;
         weeklyCals += dailyBurnCalories(effectiveDayBio, wks, currentWeight, dayData.exerciseLogs, userProfile).total;
     }
     
     // Override with manual weekly if user explicitly saved a modified value in the modal
     // Ini memastikan jika user secara eksplisit mengubah angkanya di Modal Input (baik naik atau turun), 
     // sistem akan menghormati input tersebut untuk hari ini.
     if (bioData.weeklyDuration !== undefined && bioData.weeklyDuration !== '') weeklyDur = Number(bioData.weeklyDuration);
     if (bioData.weeklySessions !== undefined && bioData.weeklySessions !== '') weeklySess = Number(bioData.weeklySessions);
     if (bioData.weeklyCalories !== undefined && bioData.weeklyCalories !== '') weeklyCals = Number(bioData.weeklyCalories);
     
     return {
         mergedDailyActiveMinutes: dailyActive,
         actDetail: act,
         // Rincian buat bar bertumpuk di kartu Aktivitas Harian. Segmennya WAJIB berjumlah persis
         // sama dengan angka besar di atasnya — makanya dirakit di sini, di tempat cabang manual
         // masih kelihatan, bukan dihitung ulang di JSX. Saat kalori diset manual, basis BMR+langkah
         // memang diganti satu angka manual, jadi segmennya pun ikut jadi satu.
         mergedDurationParts: manualActive > autoActive
             ? [
                 // Input manual menang: kalau tetap dirinci "Langkah + Latihan", segmennya
                 // berjumlah lebih kecil dari angka besarnya (mis. besar 30, rincian 0+0).
                 { key: 'manual', label: 'Manual', value: manualActive - intTodayDur },
                 { key: 'kardio', label: 'Kardio', value: act.cardioMinutes },
                 { key: 'beban', label: 'Beban', value: act.weightMinutes },
               ]
             : [
                 { key: 'langkah', label: 'Langkah', value: stepMinutes },
                 { key: 'kardio', label: 'Kardio', value: act.cardioMinutes },
                 { key: 'beban', label: 'Beban', value: act.weightMinutes },
               ],
         mergedCalorieParts: isDailyCalsManual
             ? [
                 { key: 'manual', label: 'Manual', value: burn.manualBase },
                 { key: 'eat', label: 'EAT', value: workoutCalories },
               ]
             : [
                 { key: 'bmr', label: 'BMR', value: bmrCalories },
                 { key: 'neat', label: 'NEAT', value: stepsCalories },
                 { key: 'eat', label: 'EAT', value: workoutCalories },
                 { key: 'tef', label: 'TEF', value: tefCalories },
               ],
         bmrCalories,
         stepsCalories,
         workoutCalories,
         tefCalories,
         tefDetail: {
           hasMacros: burn.hasMacros,
           macros: burn.macros,
         },
         mergedDailyCalories: dailyCals,
         mergedDailyCaloriesFloor: totalDailyCals,
         mergedDailySessions: intTodayExercises,
         mergedWeeklyActiveMinutes: weeklyDur,
         mergedWeeklyWorkoutDuration: weeklyWorkoutDur,
         mergedWeeklySessions: weeklySess,
         mergedWeeklyCardio: weeklyCardioSess,
         mergedWeeklyWeight: weeklyWeightSess,
         mergedWeeklyCalories: weeklyCals
     };
  // userProfile WAJIB ikut: umur & jenis kelamin datang async dari Firestore SETELAH render
  // pertama. Tanpa ini memo tidak pernah dihitung ulang saat profil tiba, dan sesi kardio
  // menempel di hitungan non-nadi sampai kebetulan ada hal lain yang berubah.
  }, [history, activeDate, bioData, userProfile, lomealToday]);

  // Tulis balik mergedDailyCalories (udah dilindungi Math.max lantai BMR+langkah+workout,
  // lihat useMemo di atas) ke bioData.activityCalories — biar Lomeal, yang baca field mentah
  // ini LANGSUNG tanpa lewat proteksi Math.max di atas, tetap ikut kelindungi. Sengaja TIDAK
  // di-skip walau lagi manual: kalau manual masih >= lantai, ini no-op (angkanya udah sama);
  // kalau manual pernah kesetel/kehapus jadi di bawah lantai, ini nyembuhin balik ke lantai.
  // activityCaloriesFloor juga ikut ditulis (lantai mentah, TANPA manual) — biar Lomeal bisa
  // baca lantainya sendiri sebelum push koreksi, gak cuma ngandelin Logym nyembuhin belakangan.
  // Hari yang override-nya milik Lomeal DIKECUALIKAN dari penulisan activityCalories. Bukan cuma
  // soal sopan santun kepemilikan — kalau ditulis, angkanya jadi berputar: manualFieldValue
  // membaca bioData.activityCalories sebagai basis manual, sementara efek ini menimpanya dengan
  // basis + kalori latihan. Tiap render basisnya membesar sendiri, dan kalori latihan menumpuk
  // berlipat (bug "ratchet" yang sama seperti versi Math.max lawas). activityCaloriesFloor tetap
  // ditulis: itu lantai hitungan Logym sendiri, bukan milik Lomeal.
  const lomealOwnsCalories = isLomealOwned(bioData, 'activityCalories');
  useEffect(() => {
     if (activeDate !== todayStr || mergedDailyCalories <= 0) return;
     const calsChanged = !lomealOwnsCalories && Number(bioData.activityCalories || 0) !== mergedDailyCalories;
     const floorChanged = Number(bioData.activityCaloriesFloor || 0) !== mergedDailyCaloriesFloor;
     if (calsChanged || floorChanged) {
         setHistory(prev => ({
             ...prev,
             [activeDate]: {
                 ...(prev[activeDate] || {}),
                 bioData: {
                    ...(prev[activeDate]?.bioData || {}),
                    ...(calsChanged ? { activityCalories: mergedDailyCalories } : {}),
                    activityCaloriesFloor: mergedDailyCaloriesFloor,
                 }
             }
         }));
     }
  // bioData.activityCalories/Floor WAJIB ikut deps: badan efek ini membacanya buat deteksi
  // perubahan. Tanpa keduanya, begitu snapshot server masuk membawa angka LAMA, bioData
  // berubah tapi mergedDailyCalories tetap sama — deps gak berubah, efek gak jalan lagi, dan
  // angka lama itu nempel selamanya. Satu-satunya yang memulihkan cuma remount DashboardTab
  // (pindah tab lalu balik), persis gejala "PWA baru update setelah keluar-masuk tab di APK".
  }, [mergedDailyCalories, mergedDailyCaloriesFloor, activeDate, todayStr, bioData.activityCalories, bioData.activityCaloriesFloor, lomealOwnsCalories]);

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

  const targetScrollMetricRef = useRef(null);

  const scrollToMetricInModal = (targetMetricId, retryCount = 0) => {
    if (!targetMetricId) return;
    const container = detailsScrollRef.current;
    if (!container) {
      if (retryCount < 6) {
        setTimeout(() => scrollToMetricInModal(targetMetricId, retryCount + 1), 50);
      }
      return;
    }

    if (targetMetricId === 'score') {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      const scoreEl = document.getElementById('bio-detail-score');
      if (scoreEl) {
        scoreEl.classList.add('highlight-logym-pulse');
        setTimeout(() => scoreEl.classList.remove('highlight-logym-pulse'), 1500);
      }
      return;
    }

    if (targetMetricId === 'weight' || targetMetricId === 'height') {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      const targetEl = document.getElementById(targetMetricId === 'height' ? 'bio-detail-height' : 'bio-detail-weight');
      if (targetEl) {
        targetEl.classList.add('highlight-logym-pulse');
        setTimeout(() => targetEl.classList.remove('highlight-logym-pulse'), 1500);
      }
      return;
    }

    const targetEl = document.getElementById(`bio-detail-${targetMetricId}`);
    if (targetEl) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop;
      const targetTop = offset - (container.clientHeight / 2) + (targetEl.clientHeight / 2);
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      targetEl.classList.add('highlight-logym-pulse');
      setTimeout(() => {
        targetEl.classList.remove('highlight-logym-pulse');
      }, 1500);
    } else if (retryCount < 6) {
      setTimeout(() => scrollToMetricInModal(targetMetricId, retryCount + 1), 50);
    }
  };

  const handleOpenBioDetails = (targetMetricId = null) => {
    playSoundEffect('click', soundEnabled);
    setModalDate(bioDataDate || activeDate);
    targetScrollMetricRef.current = targetMetricId;
    if (showDetailsModal && targetMetricId) {
      setTimeout(() => scrollToMetricInModal(targetMetricId), 60);
    } else {
      setShowDetailsModal(true);
    }
  };

  useEffect(() => {
    if (!showDetailsModal || !targetScrollMetricRef.current) return;
    const metricId = targetScrollMetricRef.current;
    targetScrollMetricRef.current = null;
    const timer = setTimeout(() => {
      scrollToMetricInModal(metricId);
    }, 120);
    return () => clearTimeout(timer);
  }, [showDetailsModal]);

  return (
    <div className="space-y-4 pb-6 overflow-x-hidden">
      
      {/* HEADER & INTEGRASI APPS */}
      <div className="pt-2 px-4 flex justify-between items-center mb-2 anim-rise">
         <div>
            <h1 className="h1"><span className={t.textMain}>Halo, </span><span className={`bg-gradient-to-r ${t.gradientText} bg-clip-text text-transparent`}>{user?.name || userProfile?.name || 'Kawan'}</span></h1>
            <p className={`body-base font-medium ${t.textMuted} mt-1 leading-snug`}>{t.greetingText}</p>
            <div className="flex items-center space-x-2 mt-1">
               <p className={`body-md ${t.textMuted}`}>{new Date().toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
               <span className={`text-[10px] ${t.textMuted}`}>•</span>
               <div className={`flex items-center gap-1 ${t.textMuted}`}>
                 <Dumbbell size={12} />
                 <span className="body-md font-bold text-[13px]">{gymProfiles?.find(g => g.id === activeGymId)?.name || 'Logym'}</span>
               </div>

               <span className={`text-[10px] ${t.textMuted}`}>•</span>
               <button onClick={() => {
                   playSoundEffect('click', soundEnabled);
                   const msg = syncStatus === 'synced' ? 'Semua data Anda sudah aman tersimpan di cloud.' :
                               syncStatus === 'syncing' ? 'Sedang mensinkronkan data Anda ke cloud...' :
                               'Terjadi masalah koneksi. Perubahan tersimpan di perangkat dan akan dikirim otomatis saat koneksi pulih.';
                   setConfirmModal({
                       isOpen: true,
                       title: 'Status Sinkronisasi',
                       message: msg,
                       onConfirm: () => setConfirmModal({isOpen: false}),
                       confirmText: 'OK'
                   });
               }} className="flex items-center justify-center hover:opacity-80 transition-opacity">
                    {syncStatus === 'syncing' ? (
                        <RefreshCw size={14} className="animate-spin text-blue-500" />
                    ) : syncStatus === 'error' ? (
                        <CloudOff size={14} className="text-rose-500" />
                    ) : (
                        <Cloud size={14} className="text-blue-500" />
                    )}
               </button>
            </div>
         </div>
         <div className="flex items-center gap-2 relative z-20 h-10 -mr-1">
            {isLogyHidden && (
               <button onClick={() => { playSoundEffect('click', soundEnabled); window.dispatchEvent(new CustomEvent('toggle-logy-float', { detail: { action: 'showAndOpen' } })); }} className={`flex flex-col items-center justify-center gap-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-2xl p-1.5 hover:bg-blue-500/20 transition-all shadow-sm animate-in zoom-in-90 duration-300 min-w-[48px]`}>
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-900 border border-blue-400 shrink-0" style={{backgroundImage: "url('/bg-program.webp')", backgroundSize: '450%', backgroundPosition: '52% 7%'}}></div>
                  <span className="text-[8px] font-black tracking-wide uppercase whitespace-nowrap leading-none pb-0.5">Konsul</span>
               </button>
            )}
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
             <img src="/bg-dashboard.webp" alt="" className={`w-full h-full object-cover object-top drop-shadow-xl origin-top transition-transform duration-500 ease-out scale-[1.15]`} />
           </div>

          {/* Konten Kartu: Berada di atas coach */}
          <div id="komposisi-accordion" className={`p-4 relative z-20 flex flex-col justify-between`}>
           <div className="flex justify-between items-center mb-5 relative z-10">
               <div>
                   <h3 className={`h3 ${t.textMain} flex items-center`}>
                     Komposisi Tubuh
                     {isBleBusy && <Bluetooth className="w-4 h-4 text-blue-500 animate-pulse ml-2" />}
                   </h3>
                   {bioDataDate && (
                       <p className={`caption ${t.textMuted} mt-0.5`} style={{fontSize: '0.65rem'}}>{bioDataDate === activeDate ? 'Hari ini: ' : 'Data dari: '}{new Date(bioDataDate).toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' })}</p>
                   )}
               </div>
               <div className="flex items-center space-x-2">
                   
                   <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(activeDate); setManualTab('komposisi'); setShowManualModal(true); }} className={`p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Pencil size={16}/></button>
               </div>
           </div>
           
           <div className="flex justify-between items-end w-full relative z-10 mb-1 flex-1">
                <div 
                   onClick={() => handleOpenBioDetails('weight')} 
                   role="button" 
                   tabIndex={0} 
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('weight'); } }} 
                   className={`w-[calc(50%-4px)] flex flex-col space-y-1 justify-end h-full p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 cursor-pointer active:scale-[0.98] hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`}
                   title={isID ? 'Buka Analisis Biometrik' : 'Open Biometric Analysis'}
                >
                   {/* Fisik */}
                   <div 
                       onClick={(e) => { e.stopPropagation(); handleOpenBioDetails('weight'); }} 
                       className="flex flex-col p-1 -m-1 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                       title={isID ? 'Buka Analisis Berat & Tinggi' : 'Open Weight & Height Analysis'}
                   >
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>Fisik</span>
                        <div className="flex items-baseline space-x-1.5">
                            <span onClick={(e) => { e.stopPropagation(); handleOpenBioDetails('weight'); }} className={`text-lg font-black ${t.textMain} leading-none cursor-pointer hover:underline`} title={isID ? 'Buka Analisis Berat' : 'Open Weight Analysis'}>{isImp && bioData.weight ? Number((bioData.weight * 2.20462).toFixed(1)) : bioData.weight || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'lbs' : 'kg'}</span></span>
                            <span className="text-zinc-300 dark:text-zinc-600 text-[10px]">|</span>
                            <span onClick={(e) => { e.stopPropagation(); handleOpenBioDetails('height'); }} className={`text-lg font-black ${t.textMain} leading-none cursor-pointer hover:underline`} title={isID ? 'Buka Analisis Tinggi' : 'Open Height Analysis'}>{isImp && bioData.height ? Number((bioData.height * 0.393701).toFixed(1)) : bioData.height || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'in' : 'cm'}</span></span>
                        </div>
                   </div>

                   {/* BMI */}
                   <div 
                       onClick={(e) => { e.stopPropagation(); handleOpenBioDetails('bmi'); }} 
                       className="flex flex-col p-1 -m-1 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                       title={isID ? 'Buka Analisis BMI' : 'Open BMI Analysis'}
                   >
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>BMI ({biometricStandard === 'western' ? 'Western' : 'Asia'})</span>
                       <div className="flex items-baseline space-x-1.5">
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.bmi, language) || '-'}</span>
                           <span className={`text-[10px] font-bold ${bioData.bmiStatus === 'Normal' ? 'text-emerald-500' : bioData.bmiStatus === 'Overweight' ? 'text-amber-400' : 'text-rose-500'}`}>{resolveBmiStatus(bioData.bmiStatus, isID)}</span>
                       </div>
                   </div>

                   {/* BMR */}
                   <div 
                       onClick={(e) => { e.stopPropagation(); handleOpenBioDetails('bmr'); }} 
                       className="flex flex-col p-1 -m-1 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                       title={isID ? 'Buka Analisis BMR' : 'Open BMR Analysis'}
                   >
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>BMR</span>
                       <div>
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.bmr, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">kcal</span></span>
                       </div>
                   </div>

                   {/* Body Fat */}
                   <div 
                       onClick={(e) => { e.stopPropagation(); handleOpenBioDetails('bodyFat'); }} 
                       className="flex flex-col p-1 -m-1 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                       title={isID ? 'Buka Analisis Kadar Lemak' : 'Open Body Fat Analysis'}
                   >
                       <span className={`text-[10px] ${t.textMuted} mb-0.5 font-bold`}>{isID ? 'Kadar Lemak' : 'Body Fat'}</span>
                       <div className="flex items-baseline space-x-1.5">
                           <span className={`text-lg font-black ${t.textMain} leading-none`}>{formatNumber(bioData.bodyFat, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span>
                           <span className={`text-[10px] font-bold ${resolveBfColor(bioData.bodyFat, userProfile?.gender === 'female')}`}>{resolveBfStatus(bioData.bodyFat, userProfile?.gender === 'female', isID)}</span>
                       </div>
                   </div>
                </div>

                <div 
                   onClick={() => handleOpenBioDetails('score')} 
                   role="button" 
                   tabIndex={0} 
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('score'); } }} 
                   className="flex flex-col justify-end items-end pb-1 pr-1 cursor-pointer active:scale-95 transition-all select-none"
                   title={isID ? 'Buka Analisis Skor Tubuh' : 'Open Body Score Analysis'}
                >
                     <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                        <div className={`absolute inset-1 rounded-full ${theme === 'dark' ? 'bg-black/60' : 'bg-white/60'} border ${t.border} z-0`} />
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
                 {/* 1. FFMI */}
                 <div onClick={() => handleOpenBioDetails('ffmi')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('ffmi'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis FFMI' : 'Open FFMI Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{mainFfmi}</span>
                     <span className="text-[9px] font-bold text-sky-400 leading-none mt-0.5">{mainFfmi !== '-' ? 'index' : '-'}</span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>FFMI</span>
                 </div>

                 {/* 2. Otot (+ Kadar Otot) */}
                 <div onClick={() => handleOpenBioDetails('muscleMass')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('muscleMass'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Otot' : 'Open Muscle Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{dispMainMuscle} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'lbs' : 'kg'}</span></span>
                     <span className="text-[9px] font-bold text-sky-400 leading-none mt-0.5">{bioData.musclePercent ? `${formatNumber(bioData.musclePercent, language)}%` : '-'}</span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>{isID ? 'Otot' : 'Muscle'}</span>
                 </div>

                 {/* 3. Kadar Protein */}
                 <div onClick={() => handleOpenBioDetails('proteinPercent')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('proteinPercent'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Kadar Protein' : 'Open Protein Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{formatNumber(bioData.proteinPercent, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Kadar<br/>Protein</span>
                 </div>

                 {/* 4. Kadar Air */}
                 <div onClick={() => handleOpenBioDetails('waterPercent')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('waterPercent'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Kadar Air' : 'Open Water Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{formatNumber(bioData.waterPercent, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Kadar<br/>Air</span>
                 </div>
                 
                 {/* 5. Lemak Visceral */}
                 <div onClick={() => handleOpenBioDetails('visceralFat')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('visceralFat'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Lemak Visceral' : 'Open Visceral Fat Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{formatNumber(bioData.visceralFat, language) || '-'}</span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Lemak<br/>Visceral</span>
                 </div>

                 {/* 6. Lingkar Perut (+ WtHR) */}
                 <div onClick={() => handleOpenBioDetails('waist')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('waist'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Perut & WTHR' : 'Open Waist & WTHR Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{dispMainWaist} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">{isImp ? 'in' : 'cm'}</span></span>
                     <span className="text-[9px] font-bold text-sky-400 leading-none mt-0.5">{mainWthr !== '-' ? `${mainWthr} WTHR` : '-'}</span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>{isID ? 'Perut' : 'Waist'}</span>
                 </div>

                 {/* 7. Mineral Tulang */}
                 <div onClick={() => handleOpenBioDetails('boneMass')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('boneMass'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Mineral Tulang' : 'Open Bone Mass Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{formatNumber(bioData.boneMass, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">%</span></span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Mineral<br/>Tulang</span>
                 </div>

                 {/* 8. Usia Tubuh */}
                 <div onClick={() => handleOpenBioDetails('bodyAge')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenBioDetails('bodyAge'); } }} className={`p-1.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex flex-col items-center justify-center text-center min-h-[72px] cursor-pointer active:scale-95 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 transition-all select-none`} title={isID ? 'Buka Analisis Usia Tubuh' : 'Open Body Age Analysis'}>
                     <span className={`body-lg font-black ${t.textMain} leading-tight`}>{formatNumber(bioData.bodyAge, language) || '-'} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">th</span></span>
                     <span className={`text-[10px] font-bold ${t.textMuted} mt-0.5 leading-tight`}>Usia<br/>Tubuh</span>
                 </div>
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
               className={`self-center mt-3 p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
           >
               {isKomposisiExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
           </button>
          </div>
         </div>

          <div id="komposisi-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isKomposisiExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
            <div className="overflow-hidden">
              {isKomposisiExpanded && (
                <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10 no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
                <DashboardChart 
                   t={t} theme={theme} history={history} 
                   soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
                   onPointClick={handleChartPointClick}
                   units={units} userProfile={userProfile}
                   language={language}
                />
                </div>
              )}
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
             className="absolute right-0 -top-8 bottom-0 w-[26rem] z-10 pointer-events-none overflow-hidden parallax-container"
             style={{
               maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
             }}
         >
             <img src="/bg-activity.webp" alt="" className={`w-full h-full object-cover object-top drop-shadow-xl origin-top transform translate-x-4 transition-transform duration-500 ease-out`} />
         </div>

         {/* Content Layer */}
         <div id="aktivitas-accordion" className={`p-4 relative z-20 flex flex-col h-full justify-between`}>
             <div className="flex justify-between items-center shrink-0">
                 <div>
                     <h3 className={`h3 ${t.textMain} flex items-center`}>
                       Aktivitas Harian
                       {isBleBusy && <Bluetooth className="w-4 h-4 text-blue-500 animate-pulse ml-2" />}
                     </h3>
                     <p className={`caption ${t.textMuted} mt-0.5`} style={{fontSize: '0.65rem'}}>Hari ini: {new Date(activeDate).toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' })}</p>
                 </div>
                 <div className="flex space-x-2">


                     <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(activeDate); setManualTab('harian'); setShowManualModal(true); }} className={`p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border}`}><Pencil size={16}/></button>
                 </div>
             </div>

             <div className="flex flex-col flex-1 pt-6 pb-2 space-y-6">
                 <div className="px-1">
                     <div className="grid grid-cols-2 gap-x-5 gap-y-5 h-full content-between">
                         {/* Langkah Kaki */}
                         <div 
                             onClick={() => {
                                 playSoundEffect('click', soundEnabled);
                                 setEditSteps(activityTargets?.steps || 10000);
                                 setShowStepsModal(true);
                             }}
                             className="flex flex-col h-full cursor-pointer group active:opacity-80 transition-opacity"
                             title="Klik untuk menentukan target langkah kaki"
                         >
                     <div className="flex items-center space-x-1.5 mb-1"><span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0"><Footprints size={11}/></span> <span className={`caption ${t.textMuted} capitalize group-hover:text-blue-400 transition-colors`}>Langkah Kaki</span></div>
                     <div className="flex flex-col flex-1">
                         <div className={`flex items-baseline space-x-1 ${NUM_ROW}`}>
                             <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{bioData.steps > 0 ? formatNumber(bioData.steps, language) : '-'}</span>
                             <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold whitespace-nowrap">/ {formatNumber(activityTargets?.steps || 10000, language)}</span>
                         </div>
                         <div className={`w-full ${BAR_ROW} bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0`}>
                             <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (Number(bioData.steps || 0) / (activityTargets?.steps || 10000)) * 100)}%` }}></div>
                         </div>
                     </div>
                 </div>
                 
                 {/* Durasi Aktif (Hari Ini) */}
                  {(() => {
                      const todayDur = mergedDailyActiveMinutes;
                      const weeklyTarget = activityTargets?.weeklyActiveMinutes || 150;
                      const weeklyDur = mergedWeeklyActiveMinutes || 0;
                      return (
                          <div 
                              onClick={() => { playSoundEffect('click', soundEnabled); setShowDurationModal(true); }}
                              className="flex flex-col h-full text-right items-end cursor-pointer group active:opacity-80 transition-opacity"
                              title="Klik untuk melihat rincian Langkah, Kardio, dan Beban"
                          >
                              <div className="flex items-center justify-end space-x-1.5 mb-1"><span className={`caption ${t.textMuted} capitalize group-hover:text-blue-400 transition-colors`}>Durasi Aktif</span> <span className={`w-5 h-5 rounded-full ${t.bgAccentSoft} ${t.textAccent} flex items-center justify-center shrink-0`}><Clock size={11}/></span></div>
                              <div className="flex flex-col flex-1 w-full">
                                  <div className={`flex items-baseline justify-end space-x-1 ${NUM_ROW}`}>
                                      <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{todayDur > 0 ? formatNumber(todayDur, language) : '-'}</span>
                                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold whitespace-nowrap">mnt</span>
                                  </div>
                                  <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
                                      {formatNumber(weeklyDur, language)}/{weeklyTarget} mnt minggu ini
                                  </div>
                                  <StackedBar parts={mergedDurationParts} basis={weeklyTarget} language={language} align="right" showLegend={false} />
                              </div>
                          </div>
                      );
                  })()}
                     </div>
                 </div>

                 <div className={`py-4 px-5 -mx-4 w-[calc(100%+2rem)] ${t.bgBox} border-y border-x-0 ${t.border}`}>
                     <div className="grid grid-cols-2 gap-x-5 gap-y-5 h-full content-between">
                         {/* Kalori Dimakan */}
                         <div className="flex flex-col h-full">
                     <div className="flex items-center space-x-1.5 mb-1"><span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0"><Utensils size={11}/></span> <span className={`caption ${t.textMuted} capitalize`}>Kalori Dimakan</span></div>
                     {(() => {
                       // lomealSync.today bisa basi (push dari Lomeal telat/gagal, silent-catch) —
                       // cuma dipercaya kalau ymd-nya beneran hari ini, biar gak nampilin angka kemarin.
                       const lomealFresh = lomealToday?.ymd === todayStr ? lomealToday : null;
                       const nutritionCalories = lomealFresh?.kcal ?? bioData.nutritionCalories;
                       const foodTarget = lomealTargets?.kcal || 2000;
                       return (
                         <div className="flex flex-col flex-1">
                             <div className={`flex items-baseline space-x-1 ${NUM_ROW}`}>
                                 <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{formatNumber(nutritionCalories, language) || '-'}</span>
                                 <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold whitespace-nowrap">/ {formatNumber(foodTarget, language)} kkal</span>
                             </div>
                             {/* Bar progres ke target makan — targetnya (`foodTarget`) sudah ada di sini
                                 sejak dulu tapi belum pernah dipakai. Sekalian menyamakan tinggi kotak
                                 ini dengan Kalori Dibakar di sebelahnya, biar angkanya sebaris. */}
                             <div className={`w-full ${BAR_ROW} bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0`}>
                                 <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (Number(nutritionCalories || 0) / foodTarget) * 100)}%` }}></div>
                             </div>
                             {lomealFresh && (
                               <div className="mt-1 flex items-center gap-1.5 font-medium" style={{fontSize: '0.65rem'}}>
                                 <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[8px] uppercase font-bold tracking-wider">LOMEAL</span>
                                 <span className={t.textMuted}>{lomealFresh.mealsCount || 0} konsumsi</span>
                               </div>
                             )}
                         </div>
                       );
                     })()}
                 </div>

                 {/* Kalori Dibakar */}
                 <div 
                    onClick={() => { playSoundEffect('click', soundEnabled); setShowCalorieModal(true); }}
                    className="flex flex-col h-full text-right items-end cursor-pointer group active:opacity-80 transition-opacity"
                    title="Klik untuk melihat rincian BMR, NEAT, EAT, TEF"
                 >
                     <div className="flex items-center justify-end space-x-1.5 mb-1">
                        <span className={`caption ${t.textMuted} capitalize group-hover:text-blue-400 transition-colors`}>Kalori Dibakar</span> 
                        <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0"><Flame size={11}/></span>
                     </div>
                     <div className="flex flex-col flex-1 w-full">
                         <div className={`flex items-baseline justify-end ${NUM_ROW}`}>
                             <span className={`text-3xl font-black ${t.textMain} leading-none tracking-tight`}>{mergedDailyCalories > 0 ? formatNumber(mergedDailyCalories, language) : '-'}</span>
                         </div>
                         <StackedBar parts={mergedCalorieParts} basis={mergedDailyCalories} language={language} align="right" showLegend={false} />
                     </div>
                 </div>
                     </div>
                 </div>

                 <div className="px-1 space-y-5">
                 {/* ROW 4: Tensi, Nadi, SpO2 — satu baris tiga kolom. Sebelumnya dua kolom
                     sehingga SpO2 turun ke baris kedua sendirian dan menyisakan ruang kosong. */}
                 <div className={`grid grid-cols-3 gap-x-3 pt-4 border-t border-dashed ${t.borderDashed}`}>
                     {/* Tekanan Darah */}
                     <div className="flex flex-col h-full">
                         <div className="flex items-center space-x-1 mb-1 text-blue-400"><Activity size={12}/> <span className={`text-[10px] ${t.textMuted}`}>Tensi</span></div>
                         <span className={`text-lg font-black ${t.textMain} leading-none`}>{bioData.bloodPressure || '-'}</span>
                     </div>

                     {/* Detak Jantung */}
                     <div className="flex flex-col h-full items-center text-center">
                         <div className="flex items-center space-x-1 mb-1 text-blue-400"><HeartPulse size={12}/> <span className={`text-[10px] ${t.textMuted}`}>Nadi</span></div>
                         <span className={`text-lg font-black ${t.textMain} leading-none`}>{bioData.heartRate > 0 ? <>{formatNumber(bioData.heartRate, language)} <span className="text-[9px] font-normal text-zinc-500 dark:text-zinc-400">bpm</span></> : '-'}</span>
                         <span className="text-[8px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mt-0.5">Min {bioData.minHeartRate > 0 ? formatNumber(bioData.minHeartRate, language) : '-'} &bull; Max {bioData.maxHeartRate > 0 ? formatNumber(bioData.maxHeartRate, language) : '-'}</span>
                     </div>

                     {/* SpO2 */}
                     <div className="flex flex-col h-full items-end text-right">
                         <div className="flex items-center space-x-1 mb-1 text-blue-400"><span className={`text-[10px] ${t.textMuted}`}>SpO2</span> <Wind size={12}/></div>
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
                 className={`self-center mt-4 p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
             >
                 {isAktivitasExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
             </button>
          </div>
          </div>
          
          <div id="aktivitas-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isAktivitasExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
             <div className="overflow-hidden">
               {isAktivitasExpanded && (
                 <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10 no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
                   <ActivityChart
                      t={t} theme={theme} history={history}
                      soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
                      onPointClick={navigateToWorkoutDate}
                      language={language}
                      lomealToday={lomealToday}
                      activityTargets={activityTargets} lomealTargets={lomealTargets}
                      userWeight={bioData.weight} userProfile={userProfile}
                      metricKeys={['steps', 'calories', 'activeMinutes']}
                      extraTabs={VITALS_METRICS(theme)}
                      renderExtra={(key) => (
                         <VitalsChart t={t} theme={theme} history={history} language={language} activeMetric={key} />
                      )}
                   />
                 </div>
               )}
             </div>
          </div>
         </div>
       </div>
      {/* Grid container intentionally not closed here yet */}

      <div className="flex flex-col space-y-4 sm:space-y-6">
      {/* --- GRUP PROGRESS --- */}
      <div id="progress-accordion" className="relative z-10 flex flex-col w-full min-w-0 anim-rise mt-6 sm:mt-0 transition-all duration-300" style={{ animationDelay: '120ms' }}>
        <div className="relative z-20">
        {/* SECTION: PROGRESS TAB — Main card */}
          {/* Card Background Layer */}
          <div className={`absolute top-10 inset-x-0 bottom-0 border ${t.border} ${theme === 'dark' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/45 backdrop-blur-md'} shadow-sm z-0 ${isProgressExpanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'}`}></div>

          {/* Extracted Image (Pop-out dari Kiri) */}
          <div
             className="absolute inset-0 z-10 pointer-events-none parallax-container overflow-hidden rounded-2xl"
             style={{
               maskImage: 'linear-gradient(to right, transparent 0%, black 15%)',
               WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%)'
             }}
          >
             <div className="absolute inset-0" style={{
                 maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                 WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)'
             }}>
                 <img src="/bg-progress.webp" alt="" className="absolute -right-12 -top-20 sm:-top-24 w-[33rem] max-w-[120%] h-auto drop-shadow-xl transition-transform duration-500 ease-out" />
             </div>
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
                  expandedSessions={expandedSessions}
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
                 className={`self-center mt-3 mb-2 p-2 rounded-full bg-blue-500/10 dark:bg-blue-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
             >
                 {isProgressExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
             </button>
          </div>
        </div>
      <div id="progress-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isProgressExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
        <div className="overflow-hidden">
          {isProgressExpanded && (
            <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10`}>
              <MuscleProgress 
                t={t} theme={theme} lang={lang}
                history={history} programs={programs} exerciseLibrary={exerciseLibrary}
                soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
                isSubCard={false}
              />
            </div>
          )}
        </div>
      </div>
      </div> {/* <-- Closes progress-accordion */}

      {/* --- GRUP SLEEP ANALYTICS --- */}
      <div id="sleep-accordion" className="relative z-10 flex flex-col w-full min-w-0 anim-rise mt-6 sm:mt-0 transition-all duration-300" style={{ animationDelay: '150ms' }}>
        <div className="relative z-20">
          <div className={`absolute top-10 inset-x-0 bottom-0 border ${t.border} ${theme === 'dark' ? 'bg-black/40 backdrop-blur-md' : 'bg-white/45 backdrop-blur-md'} shadow-sm z-0 ${isSleepExpanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'}`}></div>

          <div
             className="absolute inset-0 z-10 pointer-events-none parallax-container overflow-hidden rounded-2xl"
             style={{
               maskImage: 'linear-gradient(to right, transparent 0%, black 15%)',
               WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%)'
             }}
          >
             <div className="absolute inset-0" style={{
                 maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
                 WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)'
             }}>
                 <img src="/bg-empty.webp" alt="" className="absolute -right-52 top-2 w-[44rem] max-w-[170%] h-auto drop-shadow-xl transition-transform duration-500 ease-out" />
             </div>
          </div>

          <div className="relative z-20 flex flex-col mt-10 pb-4 px-6 pt-4">
             <div className="flex items-center justify-between mb-4">
                 <div>
                     <h3 className={`h2 ${t.textMain}`}>Pemulihan</h3>
                     <span className={`text-[10px] font-bold ${t.textMuted}`}>{sleepDateLabel}</span>
                 </div>
                 <div className="flex items-center gap-2">
                     {/* Mundur dibatasi 30 hari — sejauh backfill Health Connect mengisi. */}
                     <button
                        onClick={() => { playSoundEffect('click', soundEnabled); setSleepOffset((o) => Math.min(30, o + 1)); }}
                        disabled={sleepOffset >= 30}
                        className={`p-2 rounded-full ${t.btnBg} shadow-sm ${t.textMuted} border ${t.border} transition-all relative z-20 disabled:opacity-30`}
                        aria-label="Tidur hari sebelumnya"
                     >
                         <ChevronLeft size={16} />
                     </button>
                     <button
                        onClick={() => { playSoundEffect('click', soundEnabled); setSleepOffset((o) => Math.max(0, o - 1)); }}
                        disabled={sleepOffset === 0}
                        className={`p-2 rounded-full ${t.btnBg} shadow-sm ${t.textMuted} border ${t.border} transition-all relative z-20 disabled:opacity-30`}
                        aria-label="Tidur hari berikutnya"
                     >
                         <ChevronRight size={16} />
                     </button>
                     <button onClick={() => { playSoundEffect('click', soundEnabled); setModalDate(sleepDate); setManualTab('harian'); setShowManualModal(true); }} className={`p-2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}>
                         <Pencil size={16} />
                     </button>
                 </div>
             </div>

             <div className="flex flex-col mb-2 mt-4 space-y-4 relative z-20">
                 {(() => {
                     const targetSleepHours = Number(activityTargets?.sleep || 8);
                     const targetSleepH = Math.floor(targetSleepHours);
                     const targetSleepM = Math.round((targetSleepHours % 1) * 60);
                     const targetSleepLabel = targetSleepM > 0 ? `${targetSleepH}j ${targetSleepM}m` : `${targetSleepH} jam`;
                     const sleepHrs = parseFloat(sleepBio.sleep) || 0;
                     return (
                         <div 
                             onClick={() => {
                                 playSoundEffect('click', soundEnabled);
                                 setEditSleepHours(targetSleepH);
                                 setEditSleepMinutes(targetSleepM);
                                 setShowSleepTargetModal(true);
                             }}
                             className="cursor-pointer group active:opacity-85 transition-opacity"
                             title="Klik untuk menentukan target durasi tidur"
                         >
                             <div className="flex items-center justify-between mb-1">
                                 <div className="flex items-center space-x-1.5">
                                     <Moon size={12} className="text-indigo-400" />
                                     <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted} group-hover:text-indigo-400 transition-colors`}>Kualitas & Durasi Tidur</span>
                                 </div>
                                 <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.btnBg} border ${t.border} ${t.textMuted} group-hover:${t.textMain} transition-colors flex items-center gap-1`}>
                                     <Target size={10} className="text-indigo-400" />
                                     <span>Target: {targetSleepLabel}</span>
                                 </span>
                             </div>
                             <div className="flex items-baseline space-x-3 mt-1">
                                 <div className="flex items-baseline space-x-1">
                                     {(() => {
                                         const sleepStr = sleepBio.sleep;
                                         if (!sleepStr || parseFloat(sleepStr) <= 0) {
                                             return <span className={`text-4xl font-black tracking-tighter ${t.textMain}`}>-</span>;
                                         }
                                         if (typeof sleepStr === 'string' && sleepStr.includes('h')) {
                                             const parts = sleepStr.split(' ');
                                             const h = parts[0]?.replace('h', '') || '0';
                                             const m = parts[1]?.replace('m', '') || '0';
                                             return (
                                                 <>
                                                     <span className={`text-4xl font-black tracking-tighter ${t.textMain}`}>{h}</span>
                                                     <span className={`body-lg font-bold ${t.textMuted} mr-1`}>jam</span>
                                                     <span className={`text-4xl font-black tracking-tighter ${t.textMain}`}>{m}</span>
                                                     <span className={`body-lg font-bold ${t.textMuted}`}>mnt</span>
                                                 </>
                                             );
                                         }
                                         const { jam, menit } = sleepHoursToParts(sleepStr) || { jam: 0, menit: 0 };
                                         return (
                                             <>
                                                 <span className={`text-4xl font-black tracking-tighter ${t.textMain}`}>{jam}</span>
                                                 <span className={`body-lg font-bold ${t.textMuted} mr-1`}>jam</span>
                                                 <span className={`text-4xl font-black tracking-tighter ${t.textMain}`}>{menit}</span>
                                                 <span className={`body-lg font-bold ${t.textMuted}`}>mnt</span>
                                             </>
                                         );
                                     })()}
                                     <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold whitespace-nowrap ml-1">/ {targetSleepLabel}</span>
                                 </div>
                                 {(() => {
                                     if (sleepHrs <= 0) return null;
                                     
                                     let text = 'Sangat Kurang';
                                     let color = 'bg-rose-500/90 text-white border-rose-500/20';
                                     if (sleepHrs >= 9) {
                                         text = 'Berlebih';
                                         color = 'bg-amber-500/90 text-white border-amber-500/20';
                                     } else if (sleepHrs >= 7) {
                                         text = 'Optimal';
                                         color = 'bg-emerald-500/90 text-white border-emerald-500/20';
                                     } else if (sleepHrs >= 6) {
                                         text = 'Cukup';
                                         color = 'bg-sky-500/90 text-white border-sky-500/20';
                                     } else if (sleepHrs >= 4) {
                                         text = 'Kurang';
                                         color = 'bg-amber-500/90 text-white border-amber-500/20';
                                     }
                                     return <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${color} border shadow-sm`}>{text}</span>;
                                 })()}
                             </div>
                             {sleepHrs > 0 && (
                                 <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-2 shrink-0">
                                     <div 
                                         className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                         style={{ width: `${Math.min(100, Math.round((sleepHrs / targetSleepHours) * 100))}%` }}
                                     />
                                 </div>
                             )}
                         </div>
                     );
                 })()}

                 {/* SKOR KESIAPAN — dihitung Logym sendiri dari tidur, tahap tidur, dan deviasi
                     nadi istirahat terhadap kebiasaan 14 hari. Dulu di sini tampil "Skor Energi"
                     milik Samsung, yang harus diketik manual karena Samsung tidak pernah
                     mengekspornya ke Health Connect — praktisnya selalu kosong. */}
                 <div className="pb-1">
                     <div className="flex items-center space-x-2">
                         <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>Skor Kesiapan</span>
                     </div>
                     <div className="flex items-baseline space-x-3 mt-1">
                         <div className="flex items-baseline space-x-1">
                             <span className={`text-3xl font-black tracking-tighter ${t.textMain}`}>{sleepReadiness.status !== 'unknown' ? formatNumber(sleepReadiness.score, language) : '-'}</span>
                             <span className={`text-sm font-bold ${t.textMuted}`}>/ 100</span>
                         </div>
                         {(() => {
                             const score = sleepReadiness.status === 'unknown' ? 0 : sleepReadiness.score;
                             if (score <= 0) return null;
                             
                             let text = 'Butuh Perhatian';
                             let color = 'bg-rose-500/90 text-white border-rose-500/20';
                             if (score >= 85) {
                                 text = 'Sangat Baik';
                                 color = 'bg-emerald-500/90 text-white border-emerald-500/20';
                             } else if (score >= 70) {
                                 text = 'Baik';
                                 color = 'bg-sky-500/90 text-white border-sky-500/20';
                             } else if (score >= 60) {
                                 text = 'Cukup';
                                 color = 'bg-amber-500/90 text-white border-amber-500/20';
                             }
                             return <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${color} border shadow-sm`}>{text}</span>;
                         })()}
                     </div>
                     {/* Alasannya ikut ditulis. Skor tanpa sebab itu kotak hitam — persis keluhan
                         yang bikin Skor Energi Samsung tidak berguna di sini. */}
                     <p className={`text-[10px] leading-snug mt-1.5 ${t.textMuted}`}>{sleepReadiness.message}</p>
                 </div>
             </div>

             <button
                  onClick={() => {
                      playSoundEffect('click', soundEnabled);
                      const isExpanding = !isSleepExpanded;
                      setIsSleepExpanded(isExpanding);
                      setTimeout(() => {
                          const targetId = isExpanding ? 'sleep-subcard' : 'sleep-accordion';
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
                  className={`self-center mt-6 mb-2 p-2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 shadow-sm ${t.textMuted} hover:${t.textMain} border ${t.border} transition-all relative z-20`}
              >
                  {isSleepExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
          </div>
        </div>
        
        <div id="sleep-subcard" className={`grid relative z-10 transition-all duration-300 ease-in-out ${isSleepExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            {isSleepExpanded && (
              <div className={`rounded-b-2xl border border-t-0 ${t.border} ${t.bgSunken} shadow-inner relative z-10 p-6 no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
                <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg} mb-6`} style={{ zIndex: 10 }}>
                     <div className={`absolute top-1.5 bottom-1.5 w-[calc(33.333%-5px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: sleepSubTab === 'durasi' ? 'translateX(0)' : sleepSubTab === 'detail' ? 'translateX(100%)' : 'translateX(200%)', left: '6px', zIndex: 1 }}></div>
                     <button onClick={() => { playSoundEffect('click', soundEnabled); setSleepSubTab('durasi'); }} className={`flex-1 py-2.5 rounded-full body-md font-black relative transition-colors duration-300 ${sleepSubTab === 'durasi' ? 'text-white' : t.textMuted}`} style={{ zIndex: 2 }}>Durasi</button>
                     <button onClick={() => { playSoundEffect('click', soundEnabled); setSleepSubTab('detail'); }} className={`flex-1 py-2.5 rounded-full body-md font-black relative transition-colors duration-300 ${sleepSubTab === 'detail' ? 'text-white' : t.textMuted}`} style={{ zIndex: 2 }}>Detail</button>
                     <button onClick={() => { playSoundEffect('click', soundEnabled); setSleepSubTab('somnogram'); }} className={`flex-1 py-2.5 rounded-full body-md font-black relative transition-colors duration-300 ${sleepSubTab === 'somnogram' ? 'text-white' : t.textMuted}`} style={{ zIndex: 2 }}>Hipnogram</button>
                </div>

                {sleepSubTab === 'durasi' && (
                  <ActivityChart
                     t={t} theme={theme} history={history}
                     soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
                     onPointClick={navigateToWorkoutDate}
                     language={language}
                     metricKeys={['sleep', 'energyScore']}
                     storageKey="lyfit_sleep_chart"
                     activityTargets={activityTargets} userProfile={userProfile}
                  />
                )}

                {sleepSubTab !== 'durasi' && (() => {
                    const sAwake = parseFloat(sleepBio.sleepAwake);
                    const sRem = parseFloat(sleepBio.sleepRem);
                    const sLight = parseFloat(sleepBio.sleepLight);
                    const sDeep = parseFloat(sleepBio.sleepDeep);
                    const sHrv = parseFloat(sleepBio.hrv);
                    
                    const hasStages = !isNaN(sAwake) || !isNaN(sRem) || !isNaN(sLight) || !isNaN(sDeep) || !isNaN(sHrv);
                    
                    if (!hasStages) {
                        return (
                            <div className="py-8 flex flex-col items-center justify-center text-center">
                                <Moon size={24} className={`mb-3 opacity-20 ${t.textMain}`} />
                                <span className={`text-xs font-bold ${t.textMuted}`}>Detail tahap tidur tidak tersedia</span>
                                <span className={`text-[9px] mt-1 opacity-70 ${t.textMuted}`}>Hubungkan dengan smartwatch/Health Connect atau input manual untuk melihat analisis mendalam.</span>
                            </div>
                        );
                    }
                    
                    const totalMins = (isNaN(sAwake)?0:sAwake) + (isNaN(sRem)?0:sRem) + (isNaN(sLight)?0:sLight) + (isNaN(sDeep)?0:sDeep);
                    
                    const renderSleepBar = (label, valMins, minTargetPct, maxTargetPct, colorClass) => {
                        if (isNaN(valMins)) return null;
                        const pct = totalMins > 0 ? (valMins / totalMins) * 100 : 0;
                        const h = Math.floor(valMins / 60);
                        const m = Math.floor(valMins % 60);
                        const durStr = h > 0 ? (m > 0 ? `${h}j ${m}m` : `${h}j`) : `${m}m`;
                        const targetLeft = minTargetPct;
                        const targetWidth = maxTargetPct - minTargetPct;
                        
                        return (
                            <div className="flex flex-col mb-4 last:mb-0 relative">
                                <div className="flex justify-between items-end mb-1">
                                    <span className={`text-[10px] font-bold ${t.textMuted}`}>{label}</span>
                                    <span className={`text-xs font-black ${t.textMain}`}>{durStr} <span className="text-[9px] font-normal opacity-60">({Math.round(pct)}%)</span></span>
                                </div>
                                <div className="relative w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-visible">
                                    <div className="absolute top-0 bottom-0 bg-black/10 dark:bg-white/10 border-x border-black/20 dark:border-white/20" style={{ left: `${targetLeft}%`, width: `${targetWidth}%` }}></div>
                                    <div className={`absolute top-0 bottom-0 left-0 rounded-full ${colorClass} transition-all duration-700`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-zinc-400/50" style={{ left: `${targetLeft}%` }}></div>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-zinc-400/50" style={{ left: `${maxTargetPct}%` }}></div>
                                </div>
                            </div>
                        );
                    };

                    const renderHrvBar = (val) => {
                        if (isNaN(val) || val <= 0) return null;
                        const minHrv = 30;
                        const maxHrv = 100;
                        let pct = ((val - minHrv) / (maxHrv - minHrv)) * 100;
                        if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                        
                        return (
                            <div className="flex flex-col mt-4 pt-4 border-t border-dashed border-zinc-500/20 relative">
                                <div className="flex justify-between items-end mb-1">
                                    <span className={`text-[10px] font-bold ${t.textMuted}`}>HRV (Heart Rate Variability)</span>
                                    <span className={`text-xs font-black text-rose-500`}>{val} <span className="text-[9px] font-normal opacity-60">ms</span></span>
                                </div>
                                <div className="relative w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-visible">
                                    <div className="absolute top-0 bottom-0 bg-black/10 dark:bg-white/10 border-x border-black/20 dark:border-white/20" style={{ left: '30%', width: '70%' }}></div>
                                    <div className={`absolute top-0 bottom-0 left-0 rounded-full bg-rose-500 transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-zinc-400/50" style={{ left: '30%' }}></div>
                                </div>
                            </div>
                        );
                    };

                    const renderSpo2Bar = (val) => {
                        if (isNaN(val) || val <= 0) return null;
                        let pct = val;
                        if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                        return (
                            <div className="flex flex-col mt-4 pt-4 border-t border-dashed border-zinc-500/20 relative">
                                <div className="flex justify-between items-end mb-1">
                                    <span className={`text-[10px] font-bold ${t.textMuted}`}>SpO2 (Oksigen Darah)</span>
                                    <span className={`text-xs font-black text-sky-400`}>{val} <span className="text-[9px] font-normal opacity-60">%</span></span>
                                </div>
                                <div className="relative w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-visible">
                                    <div className="absolute top-0 bottom-0 bg-black/10 dark:bg-white/10 border-x border-black/20 dark:border-white/20" style={{ left: '95%', width: '5%' }}></div>
                                    <div className={`absolute top-0 bottom-0 left-0 rounded-full bg-sky-400 transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-zinc-400/50" style={{ left: '95%' }}></div>
                                </div>
                            </div>
                        );
                    };

                    const renderRhrBar = (val) => {
                        if (isNaN(val) || val <= 0) return null;
                        const min = 40; const max = 120;
                        let pct = ((val - min) / (max - min)) * 100;
                        if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                        return (
                            <div className="flex flex-col mt-4 pt-4 border-t border-dashed border-zinc-500/20 relative">
                                <div className="flex justify-between items-end mb-1">
                                    <span className={`text-[10px] font-bold ${t.textMuted}`}>RHR (Nadi Istirahat)</span>
                                    <span className={`text-xs font-black text-rose-500`}>{val} <span className="text-[9px] font-normal opacity-60">bpm</span></span>
                                </div>
                                <div className="relative w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-visible">
                                    <div className="absolute top-0 bottom-0 bg-black/10 dark:bg-white/10 border-x border-black/20 dark:border-white/20" style={{ left: '25%', width: '25%' }}></div>
                                    <div className={`absolute top-0 bottom-0 left-0 rounded-full bg-rose-500 transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-zinc-400/50" style={{ left: '25%' }}></div>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-zinc-400/50" style={{ left: '50%' }}></div>
                                </div>
                            </div>
                        );
                    };

                    return (
                        <div className="flex flex-col mt-2">
                            {sleepSubTab === 'detail' ? (
                                <>
                                    {/* Awake: 5-10% */}
                                    {renderSleepBar('Awake (Tidur Ayam)', sAwake, 5, 10, 'bg-zinc-400')}
                                    {/* REM: 20-25% */}
                                    {renderSleepBar('REM (Mimpi)', sRem, 20, 25, 'bg-sky-400')}
                                    {/* Light: 50-60% */}
                                    {renderSleepBar('Light (Tidur Ringan)', sLight, 50, 60, 'bg-indigo-400')}
                                    {/* Deep: 15-25% */}
                                    {renderSleepBar('Deep (Tidur Nyenyak)', sDeep, 15, 25, 'bg-violet-600')}
                                    
                                    {/* HRV, SpO2, RHR — semuanya dari `sleepBio`, BUKAN `bioData`.
                                        Kartu ini punya navigasi tanggal sendiri (sleepOffset); membaca
                                        `bioData` berarti bar tahap tidurnya menampilkan tanggal yang
                                        dipilih sementara tiga bar ini diam-diam menampilkan HARI INI.

                                        RHR dibaca dari `restingHeartRate`, bukan `heartRate`. `heartRate`
                                        itu RATA-RATA nadi sepanjang hari — angka yang sama sekali beda
                                        besarannya dari nadi istirahat, tapi selama ini tampil di bawah
                                        label "RHR (Nadi Istirahat)" seolah-olah itu dia. */}
                                    {renderHrvBar(sHrv)}
                                    {renderSpo2Bar(parseFloat(sleepBio.oxygenSaturation))}
                                    {renderRhrBar(parseFloat(sleepBio.restingHeartRate))}
                                    
                                    <div className="flex flex-wrap items-center gap-1.5 mt-6 pt-4 border-t border-dashed border-zinc-500/20">
                                       <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-sm"></div><span className={`text-[9px] font-bold ${t.textMuted}`}>Rentang Normal</span></div>
                                       <span className="text-[9px] text-zinc-500">(Berdasarkan usia rata-rata)</span>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-2">
                                    {true ? (
                                        <>
                                            <div className="relative h-52 flex flex-col justify-between mt-4 mb-4">
                                                <div className="absolute left-0 top-1 bottom-10 w-12 flex flex-col justify-between text-[9px] font-bold text-zinc-400 py-1 z-10 pointer-events-none">
                                                    <span>Awake</span>
                                                    <span>REM</span>
                                                    <span>Light</span>
                                                    <span>Deep</span>
                                                </div>
                                                <div className="flex-1 relative pl-10">
                                                  {(() => {
                                                      const sleepData = (sleepBio.sleepLog && Array.isArray(sleepBio.sleepLog) && sleepBio.sleepLog.length > 1) 
                                                          ? sleepBio.sleepLog 
                                                          : null;
                                                      
                                                      let processedSleepData = [];
                                                      if (sleepData) {
                                                          let prevMinutesRaw = null;
                                                          let prevAbsoluteMinutes = null;
                                                          let midnightOffset = 0;
                                                          for (let i = 0; i < sleepData.length; i++) {
                                                              const item = sleepData[i];
                                                              const parts = (item.time || '').split(':');
                                                              if (parts.length < 2) continue;
                                                              const h = parseInt(parts[0], 10);
                                                              const m = parseInt(parts[1], 10);
                                                              if (isNaN(h) || isNaN(m)) continue;
                                                              
                                                              let currentMinutes = h * 60 + m;
                                                              if (prevMinutesRaw !== null && currentMinutes < prevMinutesRaw - 12 * 60) {
                                                                  midnightOffset += 24 * 60;
                                                              }
                                                              const absoluteMinutes = currentMinutes + midnightOffset;
                                                              
                                                              if (prevAbsoluteMinutes !== null && absoluteMinutes > prevAbsoluteMinutes) {
                                                                  let gap = absoluteMinutes - prevAbsoluteMinutes;
                                                                  if (gap > 1440) gap = 1440; // Prevent OOM by capping at 24 hours
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
                                                          
                                                          // Smooth out short spikes using a majority-vote (mode) filter over a 30-minute window
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
                                                      }
                                                      
                                                      if (!processedSleepData || processedSleepData.length === 0) {
                                                          return (
                                                              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                                                                  <span className={`text-xs font-bold ${t.textMuted}`}>Tidak Cukup Data Tahap Tidur</span>
                                                                  <span className={`text-[9px] mt-1 opacity-70 ${t.textMuted}`}>Sinkronkan dengan Health Connect untuk melihat grafik.</span>
                                                              </div>
                                                          );
                                                      }
                                                      
                                                      return (
                                                        <div className="w-full h-full">
                                                          <ResponsiveContainer width="100%" height="100%">
                                                              <AreaChart data={processedSleepData} margin={{ top: 5, right: 10, left: 0, bottom: 15 }}>
                                                                  <defs>
                                                                      <linearGradient id="colorStage" x1="0" y1="0" x2="0" y2="1">
                                                                          <stop offset="0%" stopColor="#a1a1aa" />
                                                                          <stop offset="25%" stopColor="#a1a1aa" />
                                                                          <stop offset="25%" stopColor="#38bdf8" />
                                                                          <stop offset="50%" stopColor="#38bdf8" />
                                                                          <stop offset="50%" stopColor="#818cf8" />
                                                                          <stop offset="75%" stopColor="#818cf8" />
                                                                          <stop offset="75%" stopColor="#7c3aed" />
                                                                          <stop offset="100%" stopColor="#7c3aed" />
                                                                      </linearGradient>
                                                                  </defs>
                                                                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} minTickGap={40} dy={10} />
                                                                  <YAxis domain={[-0.2, 3.2]} hide />
                                                                  <ReferenceArea y1={2.5} y2={3.2} fill="#a1a1aa" fillOpacity={0.05} />
                                                                  <ReferenceArea y1={1.5} y2={2.5} fill="#38bdf8" fillOpacity={0.05} />
                                                                  <ReferenceArea y1={0.5} y2={1.5} fill="#818cf8" fillOpacity={0.05} />
                                                                  <ReferenceArea y1={-0.2} y2={0.5} fill="#7c3aed" fillOpacity={0.05} />
                                                                  <Area 
                                                                      type="stepAfter" 
                                                                      dataKey="stage" 
                                                                      stroke="#ffffff" 
                                                                      strokeWidth={1.5}
                                                                      strokeLinejoin="round"
                                                                      fill="url(#colorStage)" 
                                                                      fillOpacity={0.85}
                                                                      isAnimationActive={false}
                                                                      dot={false}
                                                                  />
                                                              </AreaChart>
                                                          </ResponsiveContainer>
                                                        </div>
                                                      );
                                                  })()}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 pt-4 border-t border-dashed border-zinc-500/20">
                                                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-zinc-400"></div><span className={`text-[10px] font-bold ${t.textMuted}`}>Awake</span></div>
                                                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-sky-400"></div><span className={`text-[10px] font-bold ${t.textMuted}`}>REM</span></div>
                                                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-400"></div><span className={`text-[10px] font-bold ${t.textMuted}`}>Light</span></div>
                                                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-violet-600"></div><span className={`text-[10px] font-bold ${t.textMuted}`}>Deep</span></div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center">
                                            <Moon size={24} className={`mb-3 opacity-20 ${t.textMain}`} />
                                            <span className={`text-xs font-bold ${t.textMuted}`}>Grafik Hipnogram tidak tersedia</span>
                                            <span className={`text-[9px] mt-1 opacity-70 ${t.textMuted}`}>Hubungkan aplikasi dengan Health Connect/Smartwatch untuk melihat visualisasi siklus tidur mendetail.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
            )}
          </div>
        </div>
      </div> {/* <-- Closes sleep-accordion */}
      </div> {/* <-- Closes right column wrapper */}

      </div> {/* <-- Closes the grid container */}

      {/* MODULAR MODALS */}
      <DashboardModals 
        t={t} lang={lang} theme={theme}
        showManualModal={showManualModal} setShowManualModal={setShowManualModal} manualTab={manualTab} setManualTab={setManualTab}
        modalDate={modalDate} setModalDate={setModalDate} formBio={formBio} setFormBio={setFormBio} bioData={bioData} lomealToday={lomealToday}
        // Dihitung dari bioData TANGGAL YANG DIEDIT, bukan tanggal aktif — modal ini bisa membuka
        // hari lain, dan kepemilikan Lomeal ditentukan per hari.
        lomealOwnsNutrition={isLomealOwned(history[modalDate]?.bioData, 'nutritionCalories')}
        hasManualLock={Object.keys(history[modalDate]?.bioData?._manualFlags || {}).length > 0} handleUnlockManual={handleUnlockManual}
        handleSaveManualData={handleSaveManualData} handleDeleteBioData={handleDeleteBioData} soundEnabled={soundEnabled}
        units={units} setConfirmModal={setConfirmModal} userApiKeys={userApiKeys} keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses} setShowSettings={setShowSettings}
        connectedApps={connectedApps} bleManager={bleManager}
      />

      {/* DETAIL BIOMETRIK MODAL */}
      {showDetailsModal && createPortal((
        <div 
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none ${t.textMain} font-sans`} 
          onClick={() => setShowDetailsModal(false)}
          onTouchMove={(e) => { if (e.target === e.currentTarget && e.cancelable) e.preventDefault(); }}
        >
           <div 
             className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border} overscroll-contain`} 
             onClick={(e) => e.stopPropagation()}
           >
               {(() => {
                   const displayBioData = enrichBioWithImpedance(history[modalDate]?.bioData, userProfile, bioData?.height, modalDate, biometricStandard) || emptyBio;
                   const dispWeight = isImp && displayBioData.weight ? Number((displayBioData.weight * 2.20462).toFixed(1)) : displayBioData.weight || '0';
                   const dispMuscle = isImp && displayBioData.muscleMass ? Number((displayBioData.muscleMass * 2.20462).toFixed(1)) : displayBioData.muscleMass || 0;
                   const dispWaist = isImp && displayBioData.waist ? Number((displayBioData.waist * 0.393701).toFixed(1)) : displayBioData.waist || 0;
                   const userHeightCm = Number(displayBioData.height || bioData?.height || userProfile?.height || 0);
                    const dispHeight = isImp && userHeightCm ? Number((userHeightCm * 0.393701).toFixed(1)) : userHeightCm || '-';
                   const userWeightKg = Number(displayBioData.weight || bioData?.weight || 0);
                   const userBodyFat = Number(displayBioData.bodyFat || 0);
                   const userWaistCm = Number(displayBioData.waist || 0);

                    const userAge = (() => {
                        const dobStr = userProfile?.dob || userProfile?.birthDate || userProfile?.biometrics?.birthDate;
                        if (!dobStr) return null;
                        const bDate = new Date(dobStr);
                        if (isNaN(bDate.getTime())) return null;
                        const today = new Date();
                        let age = today.getFullYear() - bDate.getFullYear();
                        const m = today.getMonth() - bDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) age--;
                        return age > 0 ? age : null;
                    })();
                   // FFMI calculation (Fat-Free Mass Index)
                   let ffmiVal = 0;
                   if (userHeightCm > 0 && userWeightKg > 0 && userBodyFat > 0) {
                       const hMeter = userHeightCm / 100;
                       const ffmKg = userWeightKg * (1 - (userBodyFat / 100));
                       ffmiVal = Number((ffmKg / (hMeter * hMeter)).toFixed(1));
                   }

                   // WtHR calculation (Waist-to-Height Ratio)
                   let wthrVal = 0;
                   if (userHeightCm > 0 && userWaistCm > 0) {
                       wthrVal = Number((userWaistCm / userHeightCm).toFixed(2));
                   }

                   const isFemale = userProfile?.gender === 'female';
                   const ffmiThresholds = isFemale ? [14.5, 16.5, 18.5, 21.0] : [18.0, 20.0, 22.0, 25.0];
                   const getFfmiStatus = (val) => {
                       if (!val || val <= 0) return isID ? 'Butuh Lemak & TB' : 'Needs BF & Height';
                       if (isFemale) {
                           if (val < 14.5) return isID ? 'Kurus' : 'Low';
                           if (val <= 16.5) return isID ? 'Standar' : 'Average';
                           if (val <= 18.5) return isID ? 'Atletis' : 'Athletic';
                           if (val <= 21.0) return isID ? 'Sangat Berotot' : 'Advanced';
                           return isID ? 'Elit Alami' : 'Elite';
                       } else {
                           if (val < 18.0) return isID ? 'Kurus' : 'Low';
                           if (val <= 20.0) return isID ? 'Standar' : 'Average';
                           if (val <= 22.0) return isID ? 'Atletis' : 'Athletic';
                           if (val <= 25.0) return isID ? 'Sangat Berotot' : 'Advanced';
                           return isID ? 'Elit Alami' : 'Elite';
                       }
                   };
                   const getFfmiColor = (val) => {
                       if (!val || val <= 0) return 'text-zinc-500';
                       const lim = isFemale ? [14.5, 16.5, 18.5, 21.0] : [18.0, 20.0, 22.0, 25.0];
                       if (val < lim[0]) return 'text-sky-500';
                       if (val <= lim[1]) return 'text-emerald-500';
                       if (val <= lim[2]) return 'text-blue-400';
                       if (val <= lim[3]) return 'text-amber-400';
                       return 'text-purple-400';
                   };

                   const getWthrStatus = (val) => {
                       if (!val || val <= 0) return isID ? 'Belum Diisi' : 'Not Set';
                       if (val < 0.40) return isID ? 'Ramping' : 'Slim';
                       if (val <= 0.49) return isID ? 'Ideal' : 'Ideal';
                       if (val <= 0.59) return isID ? 'Waspada' : 'Warning';
                       return isID ? 'Tinggi' : 'High';
                   };
                   const getWthrColor = (val) => {
                       if (!val || val <= 0) return 'text-zinc-500';
                       if (val < 0.40) return 'text-sky-500';
                       if (val <= 0.49) return 'text-emerald-500';
                       if (val <= 0.59) return 'text-amber-500';
                       return 'text-rose-500';
                   };

                   return (
                       <>
                           {/* Modal Header: Title & Date (left), Skor Tubuh (right) */}
                           <div 
                             className="flex justify-between items-center px-6 pt-6 pb-2 shrink-0 touch-none select-none"
                             onTouchMove={(e) => { if (e.cancelable) e.preventDefault(); }}
                           >
                               <div className="flex flex-col">
                                   <span className={`body-md font-bold ${t.textMain}`}>{isID ? 'Komposisi Tubuh' : 'Body Composition'}</span>
                                   <div className="relative flex items-center w-max cursor-pointer">
                                       <span className={`caption font-semibold text-sky-400 underline decoration-dashed underline-offset-2 mt-0.5`}>{new Date(modalDate || Date.now()).toLocaleDateString(lang.workout === 'Latihan' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                       <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} onClick={(e) => { try { e.target.showPicker() } catch(err){} }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                   </div>
                               </div>
                               <div id="bio-detail-score" className="flex flex-col items-end text-right transition-all duration-300">
                                   <span className="caption font-semibold text-slate-400">{isID ? 'Skor Tubuh' : 'Body Score'}</span>
                                   <span className={`h2 font-black ${t.textMain} leading-tight mt-0.5`}>{displayBioData.bodyScore || '-'}</span>
                               </div>
                           </div>

                           <div 
                             ref={detailsScrollRef}
                             className="flex-1 overflow-y-auto px-4 pb-10 hide-scrollbar space-y-3 overscroll-contain"
                             style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                           >
                                {/* Hero Weight & Height */}
                                <div className="grid grid-cols-2 gap-3 py-2 relative transition-all duration-300">
                                    {/* Berat Badan */}
                                    <div id="bio-detail-weight" className={`p-4 rounded-2xl flex flex-col items-center justify-center border ${t.border} ${t.bgCard} shadow-sm transition-all duration-300`}>
                                        <span className="caption font-semibold text-slate-400 mb-1">{isID ? 'Berat Badan' : 'Body Weight'}</span>
                                        <div className="flex items-baseline">
                                            <span className={`text-3xl sm:text-4xl font-black tracking-tight ${t.textMain}`}>{dispWeight}</span>
                                            <span className={`body-sm ml-1.5 font-bold ${t.textMuted}`}>{isImp ? 'lbs' : 'kg'}</span>
                                        </div>
                                    </div>

                                    {/* Tinggi Badan */}
                                    <div id="bio-detail-height" className={`p-4 rounded-2xl flex flex-col items-center justify-center border ${t.border} ${t.bgCard} shadow-sm transition-all duration-300`}>
                                        <span className="caption font-semibold text-slate-400 mb-1">{isID ? 'Tinggi Badan' : 'Body Height'}</span>
                                        <div className="flex items-baseline">
                                            <span className={`text-3xl sm:text-4xl font-black tracking-tight ${t.textMain}`}>{dispHeight}</span>
                                            <span className={`body-sm ml-1.5 font-bold ${t.textMuted}`}>{isImp ? 'in' : 'cm'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* List of metrics with Segmented Bars */}
                                 <div className="flex flex-col space-y-3">
                                     {[
                                          { 
                                             id: 'bmi',
                                             label: 'BMI', 
                                             val: displayBioData.bmi, 
                                             unit: '', 
                                             t: biometricStandard === 'western' ? [18.5, 25.0, 30.0] : [18.5, 23.0, 25.0], 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'], 
                                             labels: isID ? ['Kurang', 'Normal', 'Berlebih', 'Obesitas'] : ['Under', 'Standard', 'Overweight', 'Obese'], 
                                             status: resolveBmiStatus(displayBioData.bmiStatus, isID), 
                                             sColor: displayBioData.bmiStatus === 'Normal' ? 'text-emerald-500' : displayBioData.bmiStatus === 'Overweight' ? 'text-amber-500' : 'text-rose-500' 
                                         },
                                          { 
                                             id: 'bmr',
                                             label: 'BMR', 
                                             subtitle: isID ? 'Laju Metabolisme Basal' : 'Basal Metabolic Rate',
                                             val: displayBioData.bmr || '-', 
                                             unit: 'kcal', 
                                             t: userProfile?.gender === 'female' ? [1100, 1400] : [1300, 1600], 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500'], 
                                             labels: isID ? ['Rendah', 'Standar', 'Tinggi'] : ['Low', 'Standard', 'High'], 
                                             status: !displayBioData.bmr ? '-' : displayBioData.bmr < (userProfile?.gender === 'female' ? 1100 : 1300) ? (isID ? 'Rendah' : 'Low') : displayBioData.bmr <= (userProfile?.gender === 'female' ? 1400 : 1600) ? (isID ? 'Standar' : 'Standard') : (isID ? 'Tinggi' : 'High'), 
                                             sColor: !displayBioData.bmr ? 'text-zinc-500' : (displayBioData.bmr >= (userProfile?.gender === 'female' ? 1100 : 1300) && displayBioData.bmr <= (userProfile?.gender === 'female' ? 1400 : 1600)) ? 'text-emerald-500' : 'text-amber-500' 
                                         },
                                          { 
                                             id: 'bodyFat',
                                             label: isID ? 'Kadar Lemak' : 'Body Fat Percentage', 
                                             val: displayBioData.bodyFat, 
                                             unit: '%', 
                                             t: userProfile?.gender === 'female' ? [18, 28, 33] : [10, 20, 25], 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'], 
                                             labels: isID ? ['Rendah', 'Normal', 'Tinggi', 'Sangat Tinggi'] : ['Low', 'Normal', 'High', 'Very High'], 
                                             status: resolveBfStatus(displayBioData.bodyFat, userProfile?.gender === 'female', isID), 
                                             sColor: resolveBfColor(displayBioData.bodyFat, userProfile?.gender === 'female') 
                                         },
                                          { 
                                             id: 'ffmi',
                                             label: 'FFMI', 
                                             subtitle: 'Fat-Free Mass Index',
                                             val: ffmiVal > 0 ? ffmiVal : '-', 
                                             unit: '', 
                                             t: ffmiThresholds, 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500'], 
                                             labels: isID ? ['Kurus', 'Standar', 'Atletis', 'Lanjutan', 'Elit'] : ['Low', 'Average', 'Athletic', 'Advanced', 'Elite'], 
                                             status: getFfmiStatus(ffmiVal), 
                                             sColor: getFfmiColor(ffmiVal) 
                                         },
                                          { 
                                             id: 'muscleMass',
                                             label: isID ? 'Massa Otot' : 'Muscle Mass', 
                                             val: dispMuscle, 
                                             unit: isImp ? 'lbs' : 'kg', 
                                             t: isImp ? [66] : [30], 
                                             c: ['bg-sky-500', 'bg-emerald-500'], 
                                             labels: isID ? ['Kurang', 'Standar'] : ['Under', 'Standard'], 
                                             status: (Number(dispMuscle) || 0) >= (isImp ? 66 : 30) ? (isID ? 'Standar' : 'Standard') : (isID ? 'Kurang' : 'Under'), 
                                             sColor: (Number(dispMuscle) || 0) >= (isImp ? 66 : 30) ? 'text-emerald-500' : 'text-amber-500' 
                                         },
                                          { 
                                             id: 'musclePercent',
                                             label: isID ? 'Kadar Otot' : 'Muscle Percentage', 
                                             val: displayBioData.musclePercent, 
                                             unit: '%', 
                                             t: [30], 
                                             c: ['bg-sky-500', 'bg-emerald-500'], 
                                             labels: isID ? ['Kurang', 'Standar'] : ['Under', 'Standard'], 
                                             status: displayBioData.musclePercent >= 30 ? (isID ? 'Standar' : 'Standard') : (isID ? 'Kurang' : 'Under'), 
                                             sColor: displayBioData.musclePercent >= 30 ? 'text-emerald-500' : 'text-amber-500' 
                                         },
                                          { 
                                             id: 'proteinPercent',
                                             label: isID ? 'Kadar Protein' : 'Protein Percentage', 
                                             val: displayBioData.proteinPercent, 
                                             unit: '%', 
                                             t: [16], 
                                             c: ['bg-sky-500', 'bg-emerald-500'], 
                                             labels: isID ? ['Kurang', 'Standar'] : ['Under', 'Standard'], 
                                             status: displayBioData.proteinPercent >= 16 ? (isID ? 'Standar' : 'Standard') : (isID ? 'Kurang' : 'Under'), 
                                             sColor: displayBioData.proteinPercent >= 16 ? 'text-emerald-500' : 'text-amber-500' 
                                         },
                                          { 
                                             id: 'waterPercent',
                                             label: isID ? 'Kadar Air' : 'Water Percentage', 
                                             val: displayBioData.waterPercent, 
                                             unit: '%', 
                                             t: [45, 65], 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500'], 
                                             labels: isID ? ['Rendah', 'Standar', 'Tinggi'] : ['Low', 'Standard', 'High'], 
                                             status: !displayBioData.waterPercent ? '-' : displayBioData.waterPercent < 45 ? (isID ? 'Rendah' : 'Low') : displayBioData.waterPercent <= 65 ? (isID ? 'Standar' : 'Standard') : (isID ? 'Tinggi' : 'High'), 
                                             sColor: !displayBioData.waterPercent ? 'text-zinc-500' : (displayBioData.waterPercent >= 45 && displayBioData.waterPercent <= 65) ? 'text-emerald-500' : 'text-amber-500' 
                                         },
                                          { 
                                             id: 'visceralFat',
                                             label: isID ? 'Lemak Visceral' : 'Visceral Fat Rating', 
                                             val: displayBioData.visceralFat, 
                                             unit: '', 
                                             t: [10, 15], 
                                             c: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'], 
                                             labels: isID ? ['Standar', 'Tinggi', 'Sangat Tinggi'] : ['Standard', 'High', 'Very High'], 
                                             status: !displayBioData.visceralFat ? '-' : displayBioData.visceralFat < 10 ? (isID ? 'Standar' : 'Standard') : displayBioData.visceralFat < 15 ? (isID ? 'Tinggi' : 'High') : (isID ? 'Sangat Tinggi' : 'Very High'), 
                                             sColor: !displayBioData.visceralFat ? 'text-zinc-500' : displayBioData.visceralFat < 10 ? 'text-emerald-500' : displayBioData.visceralFat < 15 ? 'text-amber-500' : 'text-rose-500' 
                                         },
                                          { 
                                             id: 'waist',
                                             label: isID ? 'Lingkar Perut' : 'Waist Circumference', 
                                             val: dispWaist, 
                                             unit: isImp ? 'in' : 'cm', 
                                             t: isImp ? (userProfile?.gender === 'female' ? [31.5] : [35.4]) : (userProfile?.gender === 'female' ? [80] : [90]), 
                                             c: ['bg-emerald-500', 'bg-rose-500'], 
                                             labels: isID ? ['Standar', 'Berlebih'] : ['Standard', 'Over'], 
                                             status: !displayBioData.waist ? '-' : displayBioData.waist < (userProfile?.gender === 'female' ? 80 : 90) ? (isID ? 'Standar' : 'Standard') : (isID ? 'Berlebih' : 'Over'), 
                                             sColor: !displayBioData.waist ? 'text-zinc-500' : displayBioData.waist < (userProfile?.gender === 'female' ? 80 : 90) ? 'text-emerald-500' : 'text-rose-500' 
                                         },
                                          { 
                                             id: 'wthr',
                                             label: isID ? 'Rasio Lingkar Perut/Tinggi' : 'Waist-to-Height Ratio', 
                                             val: wthrVal > 0 ? wthrVal : '-', 
                                             unit: '', 
                                             t: [0.40, 0.50, 0.60], 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'], 
                                             labels: isID ? ['Ramping', 'Ideal', 'Waspada', 'Tinggi'] : ['Slim', 'Ideal', 'Warning', 'High'], 
                                             status: getWthrStatus(wthrVal), 
                                             sColor: getWthrColor(wthrVal) 
                                         },
                                          { 
                                             id: 'boneMass',
                                             label: isID ? 'Mineral Tulang' : 'Bone Mass', 
                                             val: displayBioData.boneMass, 
                                             unit: '%', 
                                             t: [2.0, 3.2], 
                                             c: ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500'], 
                                             labels: isID ? ['Kurang', 'Standar', 'Cukup'] : ['Under', 'Standard', 'Good'], 
                                             status: !displayBioData.boneMass ? '-' : displayBioData.boneMass < 2.0 ? (isID ? 'Kurang' : 'Under') : displayBioData.boneMass <= 3.2 ? (isID ? 'Standar' : 'Standard') : (isID ? 'Cukup' : 'Good'), 
                                             sColor: !displayBioData.boneMass ? 'text-zinc-500' : displayBioData.boneMass >= 2.0 ? 'text-emerald-500' : 'text-amber-500' 
                                         },
                                          { 
                                             id: 'bodyAge',
                                             label: isID ? (userAge ? `Usia Tubuh (Aktual: ${userAge} th)` : 'Usia Tubuh') : (userAge ? `Metabolic Age (Actual: ${userAge} yo)` : 'Metabolic Age'), 
                                             val: displayBioData.bodyAge, 
                                             unit: isID ? 'th' : 'yo', 
                                             t: userAge ? [userAge - 3, userAge + 3] : [25, 45], 
                                             c: ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500'], 
                                             labels: isID ? ['Muda', 'Sesuai', 'Tua'] : ['Young', 'Matching', 'Older'], 
                                             status: !displayBioData.bodyAge ? '-' : userAge ? (displayBioData.bodyAge < userAge - 2 ? (isID ? 'Lebih Muda' : 'Younger') : displayBioData.bodyAge <= userAge + 2 ? (isID ? 'Sesuai' : 'Matching') : (isID ? 'Lebih Tua' : 'Older')) : (isID ? 'Standar' : 'Standard'), 
                                             sColor: !displayBioData.bodyAge ? 'text-zinc-500' : userAge ? (displayBioData.bodyAge <= userAge ? 'text-emerald-500' : 'text-amber-500') : 'text-emerald-500' 
                                         }
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
                                <div key={idx} id={item.id ? `bio-detail-${item.id}` : undefined} className={`p-5 rounded-2xl flex flex-col border ${t.border} ${t.bgCard} shadow-sm transition-all duration-300`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col pr-3 min-w-0">
                                            <span className={`body-lg font-bold ${t.textMain} leading-snug`}>{item.label}</span>
                                            {item.subtitle && <span className="caption font-medium text-slate-300 dark:text-slate-300 mt-0.5 leading-snug">{item.subtitle}</span>}
                                            {item.status && <span className={`caption font-extrabold ${item.sColor} uppercase tracking-wider mt-1.5`}>{item.status}</span>}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="flex items-baseline space-x-1 justify-end">
                                                <span className="h1 font-light">{item.val || '-'}</span>
                                                {item.unit && <span className={`caption font-bold ${t.textMuted}`}>{item.unit}</span>}
                                            </div>           
                                        </div>
                                   </div>
                                   
                                   {item.c && item.c.length > 0 && (
                                       <div className="relative mt-2 mb-2 px-1">
                                           {/* Pointer */}
                                           <div className={`absolute -top-3.5 w-3 h-3 transition-all duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} style={{ left: `calc(${pointerPos}% - 6px)` }}>
                                               <svg viewBox="0 0 10 10" fill="currentColor"><polygon points="0,0 10,0 5,6" /></svg>
                                           </div>
                                           {/* Bar */}
                                           <div className="flex h-2.5 rounded-full overflow-hidden mb-2.5 opacity-90">
                                               {item.c.map((color, i) => <div key={i} className={`flex-1 ${color}`}></div>)}
                                           </div>
                                            <div className="relative h-6 caption font-semibold text-slate-300 dark:text-slate-400">
                                                {item.t.map((threshold, i) => (
                                                    <span key={i} className="absolute transform -translate-x-1/2" style={{ left: `${(i + 1) * (100 / (item.t.length + 1))}%` }}>{threshold}</span>
                                                ))}
                                            </div>
                                           {/* Legends */}
                                           <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-dashed border-white/10 dark:border-white/10">
                                               {item.labels.map((lbl, i) => (
                                                   <div key={i} className="flex items-center space-x-1.5">
                                                       <div className={`w-3 h-3 rounded-full ${item.c[i]} shrink-0 shadow-sm`}></div>
                                                       <span className="caption font-semibold text-slate-200 dark:text-slate-300">{lbl}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                    </div>
                           </div>
               </>
            );
        })()}
    </div>
 </div>
      ), document.body)}

      {/* MODAL TARGET LANGKAH KAKI */}
      {showStepsModal && createPortal(
          <div 
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl anim-fade-in overscroll-contain touch-none" 
              onClick={() => setShowStepsModal(false)}
          >
              <div 
                  className={`w-full max-w-sm rounded-[2rem] border ${t.border} ${t.bgCard} p-6 shadow-2xl anim-scale-in`} 
                  onClick={e => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                              <Footprints size={18}/>
                          </div>
                          <div>
                              <h3 className={`h3 ${t.textMain} leading-tight`}>Target Langkah</h3>
                              <p className={`caption ${t.textMuted}`} style={{ fontSize: '0.7rem' }}>Sasaran langkah harian</p>
                          </div>
                      </div>
                      <button 
                          data-close-modal="true"
                          onClick={() => { playSoundEffect('click', soundEnabled); setShowStepsModal(false); }} 
                          className={`p-2 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border} transition-colors`}
                      >
                          <X size={16}/>
                      </button>
                  </div>

                  {/* Capaian Hari Ini (Clean status row, no nested box) */}
                  <div className="mb-5 pb-4 border-b border-dashed border-zinc-500/20">
                      <div className="flex items-baseline justify-between mb-2">
                          <span className={`caption font-semibold ${t.textMuted}`}>Capaian Hari Ini</span>
                          <div className="flex items-baseline gap-1">
                              <span className={`text-2xl font-black ${t.textMain} tracking-tight`}>
                                  {bioData.steps > 0 ? formatNumber(bioData.steps, language) : '0'}
                              </span>
                              <span className={`caption font-medium ${t.textMuted}`}>
                                  / {formatNumber(editSteps, language)}
                              </span>
                          </div>
                      </div>
                      <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                          <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, (Number(bioData.steps || 0) / (Number(editSteps) || 10000)) * 100)}%` }}
                          />
                      </div>
                  </div>

                  {/* Input Target (Hero input, no wrapper box) */}
                  <div className="mb-4">
                      <label className={`caption font-bold uppercase tracking-wider ${t.textMuted} block mb-2`}>
                          Tentukan Target Harian
                      </label>
                      <div className="relative">
                          <SwipeInput 
                              value={editSteps || ''} 
                              onChange={(v) => setEditSteps(Number(v))} 
                              min={1000} max={50000} step={500} 
                              placeholder="10000"
                              soundEnabled={soundEnabled}
                              language={language}
                              className={`w-full ${t.inputBg} border ${t.border} focus:border-blue-500 ${t.textMain} py-3.5 px-4 rounded-2xl outline-none font-black text-center text-3xl transition-all shadow-inner`}
                          />
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted} pointer-events-none`}>
                              Langkah
                          </span>
                      </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="mb-6">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted} block mb-2`}>
                          Pilihan Cepat
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                          {[5000, 7500, 10000, 12500, 15000].map(s => {
                              const isSelected = editSteps === s;
                              return (
                                  <button
                                      key={s}
                                      type="button"
                                      onClick={() => { playSoundEffect('click', soundEnabled); setEditSteps(s); }}
                                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                                          isSelected 
                                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25 scale-[1.02]' 
                                              : `${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border} active:scale-95`
                                      }`}
                                  >
                                      {s >= 1000 ? `${s / 1000}k` : s}
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-dashed border-zinc-500/20">
                      <button 
                          data-close-modal="true"
                          onClick={() => { playSoundEffect('click', soundEnabled); setShowStepsModal(false); }}
                          className={`w-1/3 py-3 rounded-xl font-bold body-md ${t.textMuted} ${t.btnBg} border ${t.border} hover:${t.textMain} active:scale-[0.98] transition-all`}
                      >
                          Batal
                      </button>
                      <button 
                          onClick={() => handleSaveStepsTarget(editSteps)}
                          className="flex-1 py-3 rounded-xl font-bold body-md text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
                      >
                          Simpan
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* MODAL TARGET DURASI TIDUR */}
      {showSleepTargetModal && createPortal(
          <div 
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl anim-fade-in overscroll-contain touch-none" 
              onClick={() => setShowSleepTargetModal(false)}
          >
              <div 
                  className={`w-full max-w-sm rounded-[2rem] border ${t.border} ${t.bgCard} p-6 shadow-2xl anim-scale-in`} 
                  onClick={e => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                              <Moon size={18}/>
                          </div>
                          <div>
                              <h3 className={`h3 ${t.textMain} leading-tight`}>Target Durasi Tidur</h3>
                              <p className={`caption ${t.textMuted}`} style={{ fontSize: '0.7rem' }}>Sasaran istirahat malam</p>
                          </div>
                      </div>
                      <button 
                          data-close-modal="true"
                          onClick={() => { playSoundEffect('click', soundEnabled); setShowSleepTargetModal(false); }} 
                          className={`p-2 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border} transition-colors`}
                      >
                          <X size={16}/>
                      </button>
                  </div>

                  {/* Target Terpilih (Clean status row, no nested box) */}
                  <div className="mb-5 pb-4 border-b border-dashed border-zinc-500/20">
                      <div className="flex items-baseline justify-between">
                          <span className={`caption font-semibold ${t.textMuted}`}>Target Terpilih</span>
                          <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-indigo-400 tracking-tight">
                                  {editSleepHours}
                              </span>
                              <span className={`caption font-medium ${t.textMuted} mr-1`}>jam</span>
                              {editSleepMinutes > 0 && (
                                  <>
                                      <span className="text-2xl font-black text-indigo-400 tracking-tight">
                                          {editSleepMinutes}
                                      </span>
                                      <span className={`caption font-medium ${t.textMuted}`}>mnt</span>
                                  </>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Input Target (Jam & Menit side-by-side, no wrapper box) */}
                  <div className="mb-4">
                      <label className={`caption font-bold uppercase tracking-wider ${t.textMuted} block mb-2`}>
                          Atur Durasi Tidur
                      </label>
                      <div className="flex gap-2.5">
                          <div className="relative flex-1">
                              <SwipeInput 
                                  value={editSleepHours || ''} 
                                  onChange={(v) => setEditSleepHours(Number(v))} 
                                  min={0} max={24} step={1} 
                                  placeholder="8"
                                  soundEnabled={soundEnabled}
                                  language={language}
                                  className={`w-full ${t.inputBg} border ${t.border} focus:border-indigo-500 ${t.textMain} py-3.5 px-4 rounded-2xl outline-none font-black text-center text-2xl transition-all shadow-inner`}
                              />
                              <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted} pointer-events-none`}>Jam</span>
                          </div>
                          <div className="relative flex-1">
                              <SwipeInput 
                                  value={editSleepMinutes || ''} 
                                  onChange={(v) => setEditSleepMinutes(Number(v))} 
                                  min={0} max={55} step={5} 
                                  placeholder="0"
                                  soundEnabled={soundEnabled}
                                  language={language}
                                  className={`w-full ${t.inputBg} border ${t.border} focus:border-indigo-500 ${t.textMain} py-3.5 px-4 rounded-2xl outline-none font-black text-center text-2xl transition-all shadow-inner`}
                              />
                              <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 caption font-bold ${t.textMuted} pointer-events-none`}>Mnt</span>
                          </div>
                      </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted} block mb-2`}>
                          Rekomendasi Cepat
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                          {[
                              { label: '6 Jam', h: 6, m: 0 },
                              { label: '7 Jam', h: 7, m: 0 },
                              { label: '7.5 Jam', h: 7, m: 30 },
                              { label: '8 Jam', h: 8, m: 0 },
                              { label: '8.5 Jam', h: 8, m: 30 },
                              { label: '9 Jam', h: 9, m: 0 },
                          ].map(preset => {
                              const isSelected = editSleepHours === preset.h && editSleepMinutes === preset.m;
                              return (
                                  <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => {
                                          playSoundEffect('click', soundEnabled);
                                          setEditSleepHours(preset.h);
                                          setEditSleepMinutes(preset.m);
                                      }}
                                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                                          isSelected 
                                              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 scale-[1.02]' 
                                              : `${t.btnBg} ${t.textMuted} hover:${t.textMain} border ${t.border} active:scale-95`
                                      }`}
                                  >
                                      {preset.label}
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                  <p className={`text-[10px] leading-relaxed ${t.textMuted} opacity-75 mb-6`}>
                      *National Sleep Foundation merekomendasikan 7–9 jam tidur untuk orang dewasa guna pemulihan optimal.
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-dashed border-zinc-500/20">
                      <button 
                          data-close-modal="true"
                          onClick={() => { playSoundEffect('click', soundEnabled); setShowSleepTargetModal(false); }}
                          className={`w-1/3 py-3 rounded-xl font-bold body-md ${t.textMuted} ${t.btnBg} border ${t.border} hover:${t.textMain} active:scale-[0.98] transition-all`}
                      >
                          Batal
                      </button>
                      <button 
                          onClick={() => handleSaveSleepTarget(editSleepHours, editSleepMinutes)}
                          className="flex-1 py-3 rounded-xl font-bold body-md text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all"
                      >
                          Simpan
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}



      {/* MODAL PENJELASAN METABOLISME (TDEE: BMR, NEAT, EAT, TEF) */}
      {showCalorieModal && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-in fade-in overscroll-contain touch-none"
          onClick={() => setShowCalorieModal(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900/60 dark:bg-black/60 backdrop-blur-2xl border border-white/20 text-white rounded-3xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="pb-4 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="h2 text-white font-black">
                    Metabolisme Harian (TDEE)
                  </h3>

                </div>
                <button 
                  data-close-modal="true" 
                  onClick={() => setShowCalorieModal(false)} 
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors shrink-0 ml-3"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Total Banner */}
              <div className="mt-4 pt-3 border-t border-dashed border-white/10 flex items-baseline justify-between">
                <span className="caption text-slate-300 font-semibold uppercase tracking-wider">Total Kalori Dibakar</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-400">
                    {mergedDailyCalories > 0 ? formatNumber(mergedDailyCalories, language) : '0'}
                  </span>
                  <span className="caption text-slate-400 font-normal">kcal</span>
                </div>
              </div>
            </div>

            {/* List 4 Pilar (Tanpa Kotak dalam Kotak) */}
            <div className="divide-y divide-white/10 py-1">
              {/* 1. BMR */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-blue-400">
                    BMR (Basal Metabolic Rate)
                  </div>
                  <p className="caption text-slate-300 mt-0.5 leading-snug">
                    Energi dasar organ vital saat istirahat (rumus Mifflin-St Jeor).
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(bmrCalories, language)} <span className="caption font-normal text-slate-400">kcal</span>
                  </span>
                </div>
              </div>

              {/* 2. NEAT */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-indigo-400">
                    NEAT (Aktivitas Spontan)
                  </div>
                  <p className="caption text-slate-300 mt-0.5 leading-snug">
                    Gerak spontan harian ({formatNumber(bioData.steps || 0, language)} langkah) non-olahraga.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(stepsCalories, language)} <span className="caption font-normal text-slate-400">kcal</span>
                  </span>
                </div>
              </div>

              {/* 3. EAT */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-sky-400">
                    EAT (Olahraga & Latihan)
                  </div>
                  <p className="caption text-slate-300 mt-0.5 leading-snug">
                    Latihan beban & kardio terencana di Logym.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(workoutCalories, language)} <span className="caption font-normal text-slate-400">kcal</span>
                  </span>
                </div>
              </div>

              {/* 4. TEF */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-emerald-400">
                    TEF (Efek Termik Makanan)
                  </div>
                  {tefDetail?.hasMacros ? (
                    <div className="caption text-slate-300 mt-1 space-y-0.5 leading-snug">
                      <div>• Protein ({formatNumber(tefDetail.macros.protein, language)}g ~25%)</div>
                      <div>• Karbo ({formatNumber(tefDetail.macros.carbs, language)}g ~7.5%)</div>
                      <div>• Lemak ({formatNumber(tefDetail.macros.fat, language)}g ~2%)</div>
                    </div>
                  ) : (
                    <p className="caption text-slate-300 mt-0.5 leading-snug">
                      Energi memproses & mencerna nutrisi makanan (~10%).
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(tefCalories, language)} <span className="caption font-normal text-slate-400">kcal</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PENJELASAN DURASI AKTIF (Langkah, Kardio, Beban) */}
      {showDurationModal && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-in fade-in overscroll-contain touch-none"
          onClick={() => setShowDurationModal(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900/60 dark:bg-black/60 backdrop-blur-2xl border border-white/20 text-white rounded-3xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="pb-4 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="h2 text-white font-black">
                    Rincian Durasi Aktif
                  </h3>

                </div>
                <button 
                  data-close-modal="true" 
                  onClick={() => setShowDurationModal(false)} 
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors shrink-0 ml-3"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Total Banner */}
              <div className="mt-4 pt-3 border-t border-dashed border-white/10 flex items-baseline justify-between">
                <span className="caption text-slate-300 font-semibold uppercase tracking-wider">Total Hari Ini</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-400">
                    {mergedDailyActiveMinutes > 0 ? formatNumber(mergedDailyActiveMinutes, language) : '0'}
                  </span>
                  <span className="caption text-slate-400 font-normal">
                    mnt
                  </span>
                </div>
              </div>
            </div>

            {/* List Pilar Durasi Aktif */}
            <div className="divide-y divide-white/10 py-1">
              {/* 1. Langkah Kaki */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    Langkah Kaki
                  </div>
                  <p className="caption text-slate-300 mt-0.5 leading-snug">
                    Estimasi waktu dari langkah harian aktif ({formatNumber(bioData.steps || 0, language)} langkah).
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(actDetail?.stepMinutes || 0, language)} <span className="caption font-normal text-slate-400">mnt</span>
                  </span>
                </div>
              </div>

              {/* 2. Latihan Kardio */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-zinc-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
                    Latihan Kardio
                  </div>
                  <p className="caption text-slate-300 mt-0.5 leading-snug">
                    Sesi kardio terencana di Logym (treadmill, sepeda, lari, dll).
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(actDetail?.cardioMinutes || 0, language)} <span className="caption font-normal text-slate-400">mnt</span>
                  </span>
                </div>
              </div>

              {/* 3. Latihan Beban */}
              <div className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="body-md font-bold text-sky-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    Latihan Beban
                  </div>
                  <p className="caption text-slate-300 mt-0.5 leading-snug">
                    Sesi latihan angkat beban dan resistensi terencana.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="body-lg font-black text-white whitespace-nowrap">
                    {formatNumber(actDetail?.weightMinutes || 0, language)} <span className="caption font-normal text-slate-400">mnt</span>
                  </span>
                </div>
              </div>

              {/* 4. Manual (jika ada) */}
              {(actDetail?.manual > actDetail?.auto) && (
                <div className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="body-md font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      Penyesuaian Manual
                    </div>
                    <p className="caption text-slate-300 mt-0.5 leading-snug">
                      Tambahan durasi dari input manual di luar hitungan otomatis.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="body-lg font-black text-white whitespace-nowrap">
                      {formatNumber(actDetail.manual - actDetail.auto, language)} <span className="caption font-normal text-slate-400">mnt</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Target Durasi Mingguan (WHO) */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="caption text-slate-300 font-semibold uppercase tracking-wider">
                  Target Durasi Mingguan
                </label>
                <span className="caption font-bold text-sky-400">
                  {editWeeklyDuration} mnt / minggu
                </span>
              </div>

              {/* Weekly Progress Bar */}
              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-slate-400">Progres minggu ini</span>
                  <span className="text-xs font-bold text-white">
                    {formatNumber(mergedWeeklyActiveMinutes || 0, language)} <span className="text-slate-400 font-normal">/ {editWeeklyDuration} mnt</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${(mergedWeeklyActiveMinutes || 0) >= editWeeklyDuration ? 'bg-emerald-400' : 'bg-sky-400'}`}
                    style={{ width: `${Math.min(100, ((mergedWeeklyActiveMinutes || 0) / editWeeklyDuration) * 100)}%` }}
                  />
                </div>
                {(mergedWeeklyActiveMinutes || 0) >= editWeeklyDuration && (
                  <p className="text-[10px] text-emerald-400 font-semibold mt-1">✔ Target mingguan tercapai!</p>
                )}
              </div>

              {/* SwipeInput */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <SwipeInput 
                    value={editWeeklyDuration || ''} 
                    onChange={(v) => {
                      const val = Number(v) || 0;
                      setEditWeeklyDuration(val);
                      handleSaveWeeklyDurationTarget(val);
                    }} 
                    min={30} max={600} step={15} 
                    placeholder="150"
                    language={language}
                    className="w-full bg-black/40 border border-white/15 text-white p-2.5 rounded-xl outline-none font-black text-center text-lg pr-12 focus:border-sky-400 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 caption font-bold text-slate-400">mnt</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[75, 150, 200, 300].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      playSoundEffect('click', soundEnabled);
                      setEditWeeklyDuration(mins);
                      handleSaveWeeklyDurationTarget(mins);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editWeeklyDuration === mins
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-snug">
                WHO merekomendasikan minimal 150 menit aktivitas aerobik intensitas sedang per minggu.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

// Skip re-render when only function props changed (always new references but same behavior).
// Data props are compared shallowly — if any data prop changes, component re-renders.
// Inactive tab is frozen completely to prevent background CPU/battery drain.
export default React.memo(DashboardTab, (prev, next) => {
  if (prev.isActive !== next.isActive) return false;
  if (!next.isActive) return true;
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (prev[k] !== next[k] && typeof next[k] !== 'function') return false;
  }
  return true;
});
