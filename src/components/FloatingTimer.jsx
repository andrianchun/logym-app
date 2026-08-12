import React, { useEffect } from 'react';
import { Clock, X, Flame } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';
import { calculateLiveWorkoutCalories } from '../utils/workoutCalc';
import { Capacitor } from '@capacitor/core';
import { WorkoutTimerPlugin } from '../App';

const FloatingTimer = ({
  restTargetTime, defaultRestTime, t, soundEnabled,
  isWorkoutActive, activeTab, setActiveTab, workoutStartTime,
  isImmersiveMode, setIsImmersiveMode, sessionToRun, focusWorkoutId, setFocusWorkoutId,
  userProfile, exerciseLogs, sessionExercises,
  activeWorkoutDate, setSelectedDate
}) => {
  
  const [workoutSeconds, setWorkoutSeconds] = React.useState(0);

  const [localRestTimer, setLocalRestTimer] = React.useState(0);

  useEffect(() => {
    if (isWorkoutActive && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      WorkoutTimerPlugin.requestOverlayPermission().catch(() => {});
    }
  }, [isWorkoutActive]);

  useEffect(() => {
    let interval;
    if (restTargetTime !== null) {
      const updateTimer = () => {
        const remaining = Math.ceil((restTargetTime - Date.now()) / 1000);
        setLocalRestTimer(prev => {
          if (prev === 4 && remaining === 3) playSoundEffect('timerTick', soundEnabled);
          if (prev === 3 && remaining === 2) playSoundEffect('timerTick', soundEnabled);
          if (prev === 2 && remaining === 1) playSoundEffect('timerTick', soundEnabled);
          if (prev === 1 && remaining === 0) playSoundEffect('timerEnd', soundEnabled);
          return remaining;
        });
      };
      updateTimer();
      interval = setInterval(updateTimer, 500); // 500ms for more responsive UI
    } else {
      setLocalRestTimer(0);
    }
    return () => clearInterval(interval);
  }, [restTargetTime, soundEnabled]);

  useEffect(() => {
    let interval;
    if (isWorkoutActive && workoutStartTime) {
      setWorkoutSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      interval = setInterval(() => {
        setWorkoutSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, workoutStartTime]);

  // Jika sedang immersive, ImmersiveWorkout.jsx akan merender bar-nya sendiri.
  if (isImmersiveMode || !isWorkoutActive) return null;

  const showTimer = restTargetTime !== null;

  const handleClick = () => {
    // Kembalikan kalender ke tanggal milik sesi yang sedang berjalan SEBELUM pindah tab.
    // Tanpa ini, kalau user sempat menjelajah kalender ke tanggal lain, "Lanjutkan" mendarat di
    // tanggal itu — Tab Latihan kosong melompong dan mode immersive tidak bisa terbuka sama
    // sekali karena tidak ada latihan di sana. Didahulukan karena setActiveTab milik App bisa
    // menyela dengan dialog "Bersihkan Sesi Kosong?" dan menunda perpindahan tabnya.
    if (activeWorkoutDate && setSelectedDate) setSelectedDate(activeWorkoutDate);
    setActiveTab('workout');
    // Fallback ke focusWorkoutId jika sessionToRun belum sempat di-set oleh titik masuk tertentu
    // (mis. resume dari Kalender) — supaya klik selalu masuk immersive selama ada workout aktif.
    const targetId = sessionToRun || focusWorkoutId;
    if (targetId) {
      setFocusWorkoutId(targetId);
      setIsImmersiveMode(true);
    }
  };

  const formatTime = (seconds) => {
    const isNegative = seconds < 0;
    const abs = Math.abs(seconds);
    const hrs = Math.floor(abs / 3600);
    const mins = Math.floor((abs % 3600) / 60);
    const secs = abs % 60;
    const text = hrs > 0 
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
    return isNegative ? `-${text}` : text;
  };

  // Pakai rumus & cakupan yang sama persis dengan ImmersiveWorkout: HANYA latihan di sesi yang
  // lagi jalan. exerciseLogs isinya log SELURUH hari (semua sesi digabung), jadi menyapu seluruh
  // key-nya bikin set dari sesi lain ikut kehitung — itu sumber lompatan kalori pas di-minimize.
  const caloriesBurned = calculateLiveWorkoutCalories(userProfile?.weight || 70, sessionExercises, exerciseLogs, workoutSeconds);

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,20px))] left-0 right-0 px-4 z-40 pointer-events-none flex justify-center animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div 
        className={`pointer-events-auto w-full max-w-2xl mx-auto flex items-center justify-between px-6 py-4 rounded-full ${t.bgAccent} text-white shadow-xl shadow-[color:var(--tw-shadow-color)] cursor-pointer active:scale-95 transition-all border border-white/20`} 
        style={{ shadowColor: 'rgba(0,0,0,0.3)' }}
        onClick={handleClick}
      >
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase text-white/70 tracking-widest">
           Workout Berjalan 
        </span>
        <span className="h2 text-white leading-tight flex items-baseline gap-1.5">
           <span className="tabular-nums tracking-tight">{formatTime(workoutSeconds)}</span>
           {caloriesBurned > 0 && <span className="text-white/80 text-[11px] font-semibold flex items-center gap-0.5"><Flame size={12} className="text-white/80" strokeWidth={2.5} /> {caloriesBurned} kcal</span>}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {showTimer && (
          <div className="flex items-center bg-black/20 rounded-full shadow-inner px-4 py-1.5 min-w-[90px] justify-center gap-2">
            <span className="text-[10px] font-black uppercase text-white/70 tracking-widest mr-1">
               REST
            </span>
            <Clock size={16} className={`animate-pulse ${localRestTimer < 0 ? 'text-rose-300' : 'text-white'}`} />
            <span className={`font-mono font-black h2 ${localRestTimer < 0 ? 'text-rose-300' : 'text-white'}`}>
              {formatTime(localRestTimer)}
            </span>
          </div>
        )}
        
        {!showTimer && (
          <div className="bg-black/20 px-5 py-2 rounded-full text-white font-black body-md uppercase tracking-wider">
             Lanjutkan
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default FloatingTimer;