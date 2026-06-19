import React, { useState, useEffect, useRef } from 'react';

// --- IMPORT CAPACITOR (FULLSCREEN) ---
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- IMPORT MESIN FIREBASE ---
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, deleteField } from 'firebase/firestore';

// --- IMPORT KOMPONEN UI ---
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingTimer from './components/FloatingTimer';

// --- IMPORT HALAMAN (PAGES) ---
import AuthPage from './pages/AuthPage';
import DashboardTab from './pages/DashboardTab'; 
import WorkoutTab from './pages/WorkoutTab';
import EditModeTab from './pages/EditModeTab';
import CalendarTab from './pages/CalendarTab';
import ProgressTab from './pages/ProgressTab';
import DatabaseTab from './pages/DatabaseTab';
import ProgramTab from './pages/ProgramTab';

// --- IMPORT MODALS ---
import ExerciseDetailModal from './components/ExerciseDetailModal';
import ConfirmModal from './modals/ConfirmModal';
import AddExerciseModal from './modals/AddExerciseModal';
import SettingsModal from './modals/SettingsModal';
import HelpModal from './modals/HelpModal';

// --- IMPORT DATA & MESIN ---
import { playSoundEffect } from './utils/audio';
import { getLocalYMD, defaultMasterExercises, defaultPrograms, defaultWarmupVideos, defaultCooldownVideos } from './data/constants';
import { Loader2 } from 'lucide-react';

export default function App() {
  // --- STATE AUTH & LOADING ---
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- STATE UTAMA ---
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('ID');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [defaultRestTime, setDefaultRestTime] = useState(120);
  const [warmupVideos, setWarmupVideos] = useState(defaultWarmupVideos);
  const [cooldownVideos, setCooldownVideos] = useState(defaultCooldownVideos);

  const [exerciseLibrary, setExerciseLibrary] = useState(defaultMasterExercises);
  const [programs, setPrograms] = useState(defaultPrograms);
  const [history, setHistory] = useState({});
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [restTimer, setRestTimer] = useState(0); // Legacy, might be replaced by restTargetTime

  // --- GLOBAL WORKOUT STATE ---
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [resumeDurationSecs, setResumeDurationSecs] = useState(0);
  const [restTargetTime, setRestTargetTime] = useState(null);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [sessionToRun, setSessionToRun] = useState(null);

  const [selectedDate, setSelectedDate] = useState(getLocalYMD(new Date()));
  const [loadedDate, setLoadedDate] = useState(null);
  const [activeProgramId, setActiveProgramId] = useState(defaultPrograms[0]?.id || null);
  const [focusWorkoutId, setFocusWorkoutId] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [globalDetailExercise, setGlobalDetailExercise] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [activeAddModalTarget, setActiveAddModalTarget] = useState(null); 

  const [exerciseLogs, setExerciseLogs] = useState({});
  const [skippedExercises, setSkippedExercises] = useState({});
  const [extraExercises, setExtraExercises] = useState([]);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showExitToast, setShowExitToast] = useState(false);
  const backPressedOnce = useRef(false);

  // ==========================================
  // 0. CAPACITOR & NOTIFICATION INIT
  // ==========================================
  useEffect(() => {
    // Request web notification for timer alerts
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Listener: Ketuk notifikasi workout → buka tab Workout
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        if (notification.notification.id === 9999) {
          setActiveTab('workout');
          if (sessionToRun) {
            setFocusWorkoutId(sessionToRun);
            setIsImmersiveMode(true);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          StatusBar.setOverlaysWebView({ overlay: true }).catch(err => console.log(err));
          StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(err => console.log(err));
      });
    }
  }, [theme]);

  // --- EFEK DETEKSI KONEKSI ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==========================================
  // REST TIMER NOTIFICATION LOGIC
  // ==========================================
  useEffect(() => {
    if (!restTargetTime) return;
    
    const timeRemainingMs = restTargetTime - Date.now();
    
    // If the timer is already in the past, don't trigger
    if (timeRemainingMs <= 0) return;

    const timeout = setTimeout(() => {
      // Waktu istirahat habis!
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("LyFit Workout", { 
          body: "Waktu istirahat habis! Lanjut ke set berikutnya.",
          icon: "/lyfit-logo.png" // Fallback if logo doesn't exist
        });
      }
      playSoundEffect('success', soundEnabled); // Use success or a new 'bell' sound
    }, timeRemainingMs);

    return () => clearTimeout(timeout);
  }, [restTargetTime, soundEnabled]);

  // ==========================================
  // PERSISTENT WORKOUT NOTIFICATION (Android)
  // ==========================================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const NOTIF_ID = 9999;

    const formatNotifTime = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
    };

    const showNotification = async () => {
      try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') return;

        const elapsed = workoutStartTime ? Math.floor((Date.now() - workoutStartTime) / 1000) : 0;
        await LocalNotifications.schedule({
          notifications: [{
            id: NOTIF_ID,
            title: '🏋️ Workout Sedang Berjalan',
            body: `Durasi: ${formatNotifTime(elapsed)} — Ketuk untuk kembali ke LyFit`,
            ongoing: true,
            autoCancel: false,
            smallIcon: 'ic_launcher',
            sound: null,
            schedule: { at: new Date(Date.now() + 100) },
          }]
        });
      } catch (err) {
        console.warn('Notification error:', err);
      }
    };

    const cancelNotification = async () => {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
      } catch (err) {
        console.warn('Cancel notification error:', err);
      }
    };

    if (isWorkoutActive && workoutStartTime) {
      showNotification();
      const interval = setInterval(() => showNotification(), 30000); // Update setiap 30 detik
      return () => {
        clearInterval(interval);
        // Jangan cancel di sini — cancel hanya saat workout benar-benar selesai
      };
    } else {
      cancelNotification();
    }
  }, [isWorkoutActive, workoutStartTime]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ 
           uid: currentUser.uid, 
           email: currentUser.email, 
           name: currentUser.displayName || 'Sobat LyFit',
           photoURL: currentUser.photoURL
        });
      } else {
        setUser(null);
        setIsDataLoaded(false);
        setHistory({});
        setPrograms(defaultPrograms);
        setExerciseLibrary(defaultMasterExercises);
        setExerciseLogs({});
        setExtraExercises([]);
        setSkippedExercises({});
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // 2. SISTEM AUTO-FETCH (TARIK DATA DARI CLOUD)
  // ==========================================
  const isUpdatingFromServer = useRef(false);
  const [hasParseError, setHasParseError] = useState(false);

  useEffect(() => {
    let unsubscribeMain = null;
    let unsubscribeHistory = null;
    
    if (user) {
      const currentYear = new Date().getFullYear().toString();
      const mainDocRef = doc(db, "users", user.uid);
      const historyDocRef = doc(db, "users", user.uid, "history_years", currentYear);

      unsubscribeMain = onSnapshot(mainDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          try {
            const data = docSnap.data();
            
            // --- AUTOMATIC MIGRATION: Jika history masih ada di dokumen utama, pindahkan! ---
            if (data.history) {
              const parsedHistory = typeof data.history === 'string' ? JSON.parse(data.history) : data.history;
              const migratedHistory = {};
              Object.keys(parsedHistory).forEach(dateStr => {
                const d = parsedHistory[dateStr];
                if (d.workouts) {
                  const workoutsArray = Array.isArray(d.workouts) ? d.workouts : Object.values(d.workouts);
                  migratedHistory[dateStr] = { ...d, workouts: workoutsArray };
                } else {
                  const newD = { bioData: d.bioData || null, workouts: [] };
                  if (d.programId || d.status) {
                    newD.workouts.push({
                      id: `migrated_${Math.random().toString(36).substr(2, 9)}`,
                      programId: d.programId,
                      programName: d.programName,
                      status: d.status,
                      log: d.log || {},
                      timestamp: d.status === 'completed' ? '12:00' : null
                    });
                  }
                  if (!newD.bioData) newD.bioData = null;
                  if (newD.workouts.length > 0 || newD.bioData) {
                    migratedHistory[dateStr] = newD;
                  }
                }
              });
              
              setHistory(migratedHistory);
              
              const historyByYear = {};
              Object.keys(migratedHistory).forEach(dateStr => {
                 const year = dateStr.substring(0, 4);
                 if (!historyByYear[year]) historyByYear[year] = {};
                 historyByYear[year][dateStr] = migratedHistory[dateStr];
              });
              
              for (const year of Object.keys(historyByYear)) {
                 const yearRef = doc(db, "users", user.uid, "history_years", year);
                 await setDoc(yearRef, historyByYear[year], { merge: true });
              }
              
              await setDoc(mainDocRef, { history: deleteField() }, { merge: true });
              console.log("Migrasi sukses! History dipindahkan ke history_years.");
            }
            // --- END MIGRATION ---

            if (data.programs) {
              const parsedPrograms = typeof data.programs === 'string' ? JSON.parse(data.programs) : data.programs;
              const migratedPrograms = parsedPrograms.map(p => ({
                ...p,
                restTime: p.restTime ?? 120,
                warmupVideoUrls: p.warmupVideoUrls ?? [],
                exercises: p.exercises ? p.exercises.map(ex => 
                  (ex.id === 101 && ex.name === 'Incline Smith Machine Press') ? { ...ex, name: 'Smith Machine Incline Bench Press' } : ex
                ) : []
              }));
              setPrograms(migratedPrograms);
            }
            if (data.exerciseLibrary) {
              const parsedLib = typeof data.exerciseLibrary === 'string' ? JSON.parse(data.exerciseLibrary) : data.exerciseLibrary;
              const migratedLib = parsedLib.map(ex => 
                (ex.id === 101 && ex.name === 'Incline Smith Machine Press') ? { ...ex, name: 'Smith Machine Incline Bench Press' } : ex
              );
              setExerciseLibrary(migratedLib);
            }
            if (data.settings) {
              const parsedSettings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
              setTheme(parsedSettings.theme || 'dark');
              setLanguage(parsedSettings.language || 'ID');
              setSoundEnabled(parsedSettings.soundEnabled ?? true);
              setDefaultRestTime(parsedSettings.defaultRestTime || 120);
              setWarmupVideos(parsedSettings.warmupVideos || defaultWarmupVideos);
              setCooldownVideos(parsedSettings.cooldownVideos || defaultCooldownVideos);
            }
          } catch (err) {
            console.error("Parse Error saat load data utama (MENCEGAH AUTO-SAVE UNTUK MENGHINDARI DATA HILANG):", err);
            setHasParseError(true);
          }

          isUpdatingFromServer.current = true;
          setIsDataLoaded(true);
          setTimeout(() => { isUpdatingFromServer.current = false; }, 1000);
        } else {
          setIsDataLoaded(true);
        }
      }, (error) => {
        console.error("Gagal menarik data utama:", error);
        setHasParseError(true);
        setIsDataLoaded(true);
      });

      unsubscribeHistory = onSnapshot(historyDocRef, (docSnap) => {
        if (docSnap.exists()) {
           try {
             const data = docSnap.data();
             isUpdatingFromServer.current = true;
             setHistory(prev => ({ ...prev, ...data }));
             setTimeout(() => { isUpdatingFromServer.current = false; }, 1000);
           } catch (err) {
             console.error("Parse Error saat load history tahun ini:", err);
             setHasParseError(true);
           }
        }
      }, (error) => {
         console.error("Gagal menarik history tahun ini:", error);
      });

    } else {
      setIsDataLoaded(true);
    }

    return () => {
      if (unsubscribeMain) unsubscribeMain();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, [user]);

  // ==========================================
  // 3. SISTEM AUTO-SAVE KE CLOUD (DEBOUNCE)
  // ==========================================
  useEffect(() => {
    if (user && isDataLoaded && !isUpdatingFromServer.current && !hasParseError) {
      const timer = setTimeout(() => {
        const mainDocRef = doc(db, "users", user.uid);
        
        // Simpan Profil & Program ke Dokumen Utama
        setDoc(mainDocRef, {
          programs,
          exerciseLibrary,
          settings: { theme, language, soundEnabled, defaultRestTime, warmupVideos, cooldownVideos },
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.error("Auto-save Cloud gagal:", err));

        // Pisahkan riwayat berdasarkan Tahun ke sub-collection history_years
        const historyByYear = {};
        Object.keys(history).forEach(dateStr => {
           const year = dateStr.substring(0, 4);
           if (!historyByYear[year]) historyByYear[year] = {};
           
           if (history[dateStr] && history[dateStr]._delete) {
               historyByYear[year][dateStr] = deleteField();
           } else {
               // Jangan masukkan bioData jika null (biarkan null tertimpa field delete jika dibutuhkan, tapi karena ini merge:true, null aman)
               historyByYear[year][dateStr] = history[dateStr];
           }
        });
        
        for (const year of Object.keys(historyByYear)) {
           const yearRef = doc(db, "users", user.uid, "history_years", year);
           setDoc(yearRef, historyByYear[year], { merge: true }).catch(err => console.error(`Auto-save History ${year} gagal:`, err));
        }

      }, 1500); 
      
      return () => clearTimeout(timer);
    }
  }, [history, programs, exerciseLibrary, theme, language, soundEnabled, defaultRestTime, warmupVideos, cooldownVideos, user, isDataLoaded]);

  // ==========================================
  // 3.5. REAL-TIME SYNC EXERCISE LOGS TO HISTORY
  // ==========================================
  useEffect(() => {
    if (activeTab === 'workout') {
      setHistory(prev => {
        const dayData = prev[selectedDate];
        if (dayData && dayData.workouts) {
          return {
            ...prev,
            [selectedDate]: { ...dayData, _activeSession: { exerciseLogs, skippedExercises, extraExercises } }
          };
        }
        return prev;
      });
    }
  }, [exerciseLogs, skippedExercises, extraExercises, activeTab, selectedDate]);

  // ==========================================
  // 4. PENAHAN TOMBOL BACK (UNIVERSAL)
  // ==========================================
  useEffect(() => {
    // Selalu push state agar kita punya "jaring" untuk menangkap tombol back
    window.history.pushState({ lyfit: true }, '');

    const handlePopState = () => {
      // Prioritas 1: Tutup modal/dialog yang terbuka
      if (globalDetailExercise) { setGlobalDetailExercise(null); window.history.pushState({ lyfit: true }, ''); return; }
      if (showSettings) { setShowSettings(false); window.history.pushState({ lyfit: true }, ''); return; }
      if (showHelp) { setShowHelp(false); window.history.pushState({ lyfit: true }, ''); return; }
      if (confirmModal.isOpen) { setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null }); window.history.pushState({ lyfit: true }, ''); return; }
      if (activeAddModalTarget) { setActiveAddModalTarget(null); window.history.pushState({ lyfit: true }, ''); return; }

      // Prioritas 2: Kembali ke Dashboard jika di tab lain
      if (activeTab !== 'dashboard') { setActiveTab('dashboard'); window.history.pushState({ lyfit: true }, ''); return; }

      // Prioritas 3: Double-back to exit
      if (backPressedOnce.current) {
        // Biarkan browser/app menutup secara natural
        return;
      }
      backPressedOnce.current = true;
      setShowExitToast(true);
      window.history.pushState({ lyfit: true }, '');
      setTimeout(() => { backPressedOnce.current = false; setShowExitToast(false); }, 2000);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [globalDetailExercise, showSettings, showHelp, confirmModal.isOpen, activeAddModalTarget, activeTab]);

  // ==========================================
  // 5. MESIN AUTOSAVE LOG LATIHAN KE KALENDER
  // ==========================================
  const [lastActionTime, setLastActionTime] = useState(0);

  useEffect(() => {
    if (lastActionTime === 0) return;
    
    setHistory(prev => {
      const dayData = prev[selectedDate] || { workouts: [] };
      let workouts = [...(dayData.workouts || [])];

      // Hapus sinkronisasi real-time ke w.log untuk melindungi data yang sudah di-"Selesai"kan.
      // w.log hanya akan diupdate saat user menekan "Selesai Sesi".
      // Progress aktif cukup disimpan di _activeSession.

      return {
        ...prev,
        [selectedDate]: {
          ...dayData,
          workouts,
          _activeSession: { exerciseLogs, skippedExercises, extraExercises }
        }
      };
    });
  }, [lastActionTime, exerciseLogs, skippedExercises, extraExercises]); 

  // ==========================================

  const saveStateToHistory = () => {
     setUndoStack([...undoStack, { history: JSON.parse(JSON.stringify(history)), programs: JSON.parse(JSON.stringify(programs)) }]);
     setRedoStack([]);
  };

  const handleUndo = () => {
      playSoundEffect('click', soundEnabled);
      if(undoStack.length === 0) return;
      const lastState = undoStack[undoStack.length - 1];
      setRedoStack([...redoStack, { history, programs }]);
      setHistory(lastState.history);
      setPrograms(lastState.programs);
      setUndoStack(undoStack.slice(0, -1));
  };

  const handleRedo = () => {
       playSoundEffect('click', soundEnabled);
       if(redoStack.length === 0) return;
       const nextState = redoStack[redoStack.length - 1];
       setUndoStack([...undoStack, { history, programs }]);
       setHistory(nextState.history);
       setPrograms(nextState.programs);
       setRedoStack(redoStack.slice(0, -1));
  };

  const exportData = () => {
      const data = { history, programs, exerciseLibrary };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `LyFit_Backup_${getLocalYMD(new Date())}.json`;
      a.click();
  };

  const handleImportFile = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target.result);
              saveStateToHistory(); 
              if(data.history) setHistory(data.history);
              if(data.programs) setPrograms(data.programs);
              if(data.exerciseLibrary) setExerciseLibrary(data.exerciseLibrary);
              alert("Data berhasil diimpor! Cloud akan otomatis menyinkronkan data ini.");
              setShowSettings(false);
          } catch (err) { alert("Gagal membaca file backup JSON."); }
      };
      reader.readAsText(file);
  };

  const handleLogout = async () => {
    playSoundEffect('click', soundEnabled);
    try {
      await signOut(auth);
      setShowSettings(false);
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  const dict = {
    ID: { 
      workout: 'Latihan', calendar: 'Kalender', progress: 'Progres', cancel: 'Batal',
      settings: 'Pengaturan', theme: 'Tema', lang: 'Bahasa', sound: 'Suara Efek', timer: 'Istirahat (detik)',
      manageLib: 'Kelola Database Latihan', help: 'Tutorial',
      workoutDate: 'Tanggal Latihan:', warmup: 'Pemanasan', cooldown: 'Pendinginan',
      emptyProg: 'Belum ada latihan. Masuk mode edit.', addExtra: 'Tambah Latihan Ekstra',
      done: 'Selesai', set: 'Set', addSet: 'Tambah Set', updateWorkout: 'Perbarui Latihan', finishWorkout: 'Selesai Sesi',
      editMode: 'Mode Edit Master', dragHint: 'Tahan ikon garis untuk menggeser', save: 'Simpan', addEx: 'Tambah Latihan', newProg: 'Buat Program Baru',
      progTitle: 'Grafik Progres', week: 'Minggu', month: 'Bulan', year: 'Tahun', progDesc: 'Pantau pertumbuhan volume otot & beban.', progExercise: 'Per Latihan', progMuscle: 'Per Otot',
      customEx: 'Buat Latihan Kustom', searchLib: 'Cari di Library...', ytLink: 'Link Video YouTube'
    },
    EN: { 
      workout: 'Workout', calendar: 'Calendar', progress: 'Progress', cancel: 'Cancel',
      settings: 'Settings', theme: 'Theme', lang: 'Language', sound: 'Sound Effects', timer: 'Rest (seconds)',
      manageLib: 'Manage Exercise Database', help: 'Tutorial',
      workoutDate: 'Workout Date:', warmup: 'Warm-up', cooldown: 'Cool-down',
      emptyProg: 'No exercises yet. Enter edit mode.', addExtra: 'Add Extra Exercise',
      done: 'Done', set: 'Set', addSet: 'Add Set', updateWorkout: 'Update Workout', finishWorkout: 'Finish Session',
      editMode: 'Master Edit Mode', dragHint: 'Hold the line icon to drag', save: 'Save', addEx: 'Add Exercise', newProg: 'Create New Program',
      progTitle: 'Progress Chart', week: 'Week', month: 'Month', year: 'Year', progDesc: 'Monitor muscle volume & weight growth.', progExercise: 'By Exercise', progMuscle: 'By Muscle',
      customEx: 'Create Custom Exercise', searchLib: 'Search Library...', ytLink: 'YouTube Video URL'
    }
  };
  const lang = { ...(dict[language] || dict['ID']), id: language };

  const t = {
    bgApp: theme === 'dark' ? 'bg-[#040f1a]' : 'bg-[#f8f9fa]', bgCard: theme === 'dark' ? 'bg-[#0a1f32]' : 'bg-white',
    textMain: theme === 'dark' ? 'text-slate-100' : 'text-slate-800', textMuted: theme === 'dark' ? 'text-[#93a6b2]' : 'text-[#A7967D]',
    border: theme === 'dark' ? 'border-[#294c65]/50' : 'border-[#DEDDDE]', textAccent: theme === 'dark' ? 'text-[#93a6b2]' : 'text-[#B79347]',
    bgAccent: theme === 'dark' ? 'bg-[#41759b] text-white' : 'bg-[#B79347] text-white', bgAccentSoft: theme === 'dark' ? 'bg-[#294c65]/30' : 'bg-[#CBB989]/20',
    borderAccent: theme === 'dark' ? 'border-[#41759b]' : 'border-[#B79347]', borderAccentSoft: theme === 'dark' ? 'border-[#41759b]/30' : 'border-[#B79347]/30',
    ringAccent: theme === 'dark' ? 'ring-[#41759b]' : 'ring-[#B79347]', shadowAccent: theme === 'dark' ? 'shadow-[#41759b]/30' : 'shadow-[#B79347]/30',
    gradientText: theme === 'dark' ? 'from-[#93a6b2] to-[#41759b]' : 'from-[#B79347] to-[#81571E]', gradientBg: theme === 'dark' ? 'from-[#41759b] to-[#294c65]' : 'from-[#B79347] to-[#81571E]',
    inputBg: theme === 'dark' ? 'bg-[#040f1a]/50' : 'bg-[#DEDDDE]/30', btnBg: theme === 'dark' ? 'bg-[#294c65]/30' : 'bg-[#CBB989]/10',
    navBg: theme === 'dark' ? 'bg-[#040f1a]/80 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md',
    navIconActive: theme === 'dark' ? 'text-[#93a6b2]' : 'text-[#B79347]', navIconInactive: theme === 'dark' ? 'text-[#294c65]' : 'text-[#A7967D]',
    placeholderAccent: theme === 'dark' ? 'placeholder-[#93a6b2]/40' : 'placeholder-[#B79347]/40'
  };

  const navigateToWorkoutDate = (dateStr, progId) => { 
    playSoundEffect('click', soundEnabled); setSelectedDate(dateStr); 
    if(progId) setActiveProgramId(progId); 
    setResumeDurationSecs(0);
    setActiveTab('workout'); setIsEditingMode(false); 
  };

  const getDayHistory = (dateStr) => {
    const val = history[dateStr]; if (!val) return null;
    if (typeof val === 'string') { const p = programs.find(prog => prog.name === val); return { programId: p?.id, programName: val, status: 'completed', log: {} }; }
    if (val.programId && !val.programName) { const p = programs.find(prog => prog.id === val.programId); val.programName = p ? p.name : 'Unknown'; }
    return val;
  };

  useEffect(() => {
    if (!isDataLoaded) return;
    
    // GUARD: Mencegah circular dependency (flickering).
    // Jangan overwrite exerciseLogs jika kita hanya merespon autosave buatan sendiri.
    // Tetap load jika tanggal berubah (loadedDate !== selectedDate) atau server memberi data baru.
    if (loadedDate === selectedDate && !isUpdatingFromServer.current) return;

    const dayData = getDayHistory(selectedDate);
    if (dayData) {
      if (dayData.programId && programs.find(p => p.id === dayData.programId)) setActiveProgramId(dayData.programId);
      
      // Prioritas: _activeSession > legacy log format
      if (dayData._activeSession) {
        setExerciseLogs(dayData._activeSession.exerciseLogs || {});
        setSkippedExercises(dayData._activeSession.skippedExercises || {});
        setExtraExercises(dayData._activeSession.extraExercises || []);
      } else if (dayData.workouts && dayData.workouts.length > 0) {
        let mergedLogs = {};
        let mergedSkipped = {};
        dayData.workouts.forEach(w => {
           if (w.log) mergedLogs = { ...mergedLogs, ...w.log };
           if (w.skipped) mergedSkipped = { ...mergedSkipped, ...w.skipped };
        });
        setExerciseLogs(mergedLogs);
        setSkippedExercises(mergedSkipped);
        setExtraExercises([]);
      } else if (dayData.status === 'completed' && dayData.log) {
        // Legacy flat format fallback
        setExerciseLogs(dayData.log.exerciseLogs || {}); 
        setSkippedExercises(dayData.log.skippedExercises || {}); 
        setExtraExercises(dayData.log.extraExercises || []);
      } else { 
        setExerciseLogs({}); setSkippedExercises({}); setExtraExercises([]); 
      }
    } else { setExerciseLogs({}); setSkippedExercises({}); setExtraExercises([]); }
    
    setLoadedDate(selectedDate);
  }, [selectedDate, activeProgramId, history, programs, isDataLoaded, loadedDate]);

  const getSetLogs = (ex, overrideId) => {
    if (!ex) return [];
    const idToCheck = overrideId || ex.id;
    if (exerciseLogs[idToCheck]) return exerciseLogs[idToCheck];
    return Array.from({length: ex.sets || 3}).map(() => ({ w: ex.defaultWeight || 0, r: ex.reps || 10, d: ex.duration || 10, done: false }));
  };

  const getBaseEx = (exId) => {
    const baseId = typeof exId === 'string' && exId.includes('-') ? Number(exId.split('-')[0]) : exId;
    return [...programs.map(p=>p.exercises).flat(), ...extraExercises].find(e => e.id === exId || e.id === baseId);
  };

  const handleSetChange = (exId, setIdx, field, val) => {
    setExerciseLogs(prev => {
      const ex = getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : getSetLogs(ex, exId);
      
      const numVal = Number(val);
      currentLogs[setIdx] = { ...currentLogs[setIdx], [field]: numVal };

      // AUTO-COPY: Salin nilai ke set-set berikutnya yang belum "done"
      for (let i = setIdx + 1; i < currentLogs.length; i++) {
        if (!currentLogs[i].done) {
          currentLogs[i] = { ...currentLogs[i], [field]: numVal };
        }
      }

      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleToggleSet = (exId, setIdx) => {
    playSoundEffect('click', soundEnabled);
    setExerciseLogs(prev => {
      const ex = getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : getSetLogs(ex, exId);
      const isDoneNow = !currentLogs[setIdx].done;
      currentLogs[setIdx] = { ...currentLogs[setIdx], done: isDoneNow };
      if (!isDoneNow) {
        currentLogs[setIdx].skipped = false;
      }
      
      // Gunakan rest time per program, fallback ke default global
      const activeProgram = programs.find(p => p.id === activeProgramId) || programs[0];
      const programRestTime = activeProgram?.restTime || defaultRestTime;
      if (isDoneNow && !currentLogs[setIdx].skipped) {
        setRestTimer(programRestTime); // Legacy fallback
        setRestTargetTime(Date.now() + (programRestTime * 1000));
        if (!isWorkoutActive) {
          setIsWorkoutActive(true);
          setWorkoutStartTime(Date.now() - (resumeDurationSecs * 1000));
          setResumeDurationSecs(0);
        }
      }
      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleSkipSet = (exId, setIdx) => {
    playSoundEffect('click', soundEnabled);
    setExerciseLogs(prev => {
      const ex = getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : getSetLogs(ex, exId);
      currentLogs[setIdx] = { ...currentLogs[setIdx], done: true, skipped: true };
      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now());
  };

  const handleAddSet = (exId) => {
    playSoundEffect('click', soundEnabled);
    setExerciseLogs(prev => {
      const ex = getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : getSetLogs(ex, exId);
      const lastSet = currentLogs[currentLogs.length - 1] || { w: ex.defaultWeight || 0, r: ex.reps || 10, d: ex.duration || 10 };
      currentLogs.push({ w: lastSet.w, r: lastSet.r, d: lastSet.d, done: false });
      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleRemoveSet = (exId, setIdx) => {
    playSoundEffect('click', soundEnabled);
    setExerciseLogs(prev => {
      const ex = getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : getSetLogs(ex, exId);
      currentLogs.splice(setIdx, 1);
      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleToggleSkip = (exId) => {
    playSoundEffect('click', soundEnabled);
    setSkippedExercises(prev => ({...prev, [exId]: !prev[exId]}));
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleRemoveExtraEx = (exId) => {
    playSoundEffect('click', soundEnabled);
    setConfirmModal({ 
        isOpen: true, 
        title: 'Hapus Latihan', 
        message: 'Yakin hapus dari sesi ini?', 
        onConfirm: () => {
            setExtraExercises(prev => prev.filter(ex => ex.id !== exId));
            setLastActionTime(Date.now()); // Trigger Autosave
        } 
    });
  };

  const handleCancelWorkout = (progId) => {
    setConfirmModal({
        isOpen: true,
        title: 'Batalkan Perubahan',
        message: 'Kamu yakin ingin membatalkan? Progress yang baru saja kamu buat selama sesi ini berjalan akan dibuang dan kembali ke data terakhir yang tersimpan.',
        onConfirm: () => {
            playSoundEffect('click', soundEnabled);
            setIsImmersiveMode(false);
            setIsWorkoutActive(false);
            setWorkoutStartTime(null);
            setRestTargetTime(null);
            setRestTimer(0);
            
            const targetDateStr = selectedDate;
            const targetDayData = history[targetDateStr];
            
            // 1. Ambil data asli dari w.log yang sudah sah tersimpan di database
            let restoredLogs = {};
            let restoredSkipped = {};
            
            if (targetDayData && targetDayData.workouts) {
               targetDayData.workouts.forEach(w => {
                  if (w.log && Object.keys(w.log).length > 0) {
                     restoredLogs = { ...restoredLogs, ...w.log };
                  }
                  if (w.skipped) {
                     restoredSkipped = { ...restoredSkipped, ...w.skipped };
                  }
               });
            }
            
            // 2. Terapkan state kembali ke memori UI
            setExerciseLogs(restoredLogs);
            setSkippedExercises(restoredSkipped);
            setExtraExercises([]); // Buang latihan ekstra yang belum di-save
            
            setHistory(prev => {
              const h = { ...prev };
              if (h[targetDateStr]) {
                  // 3. Hapus _activeSession agar sesi yang gantung ini benar-benar terhapus
                  delete h[targetDateStr]._activeSession;
              }
              return h;
            });
        }
    });
  };

  const handleSaveWorkout = (progId) => {
    playSoundEffect('success', soundEnabled);
    const durationSecs = workoutStartTime ? Math.floor((Date.now() - workoutStartTime) / 1000) : 0;
    const formatDur = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setRestTargetTime(null);
    setRestTimer(0);
    
    if (progId === 'extra') {
       setExtraExercises([]);
    }

    const targetDateStr = selectedDate;
    setHistory(prev => {
      const h = { ...prev };
      const dayData = h[targetDateStr] || { workouts: [] };
      let workouts = [...(dayData.workouts || [])];
      
      if (progId === 'extra') {
        const adhocIdx = workouts.findIndex(w => w.programId === 'adhoc');
        if (adhocIdx >= 0) {
          const existingW = workouts[adhocIdx];
          workouts[adhocIdx] = {
            ...existingW,
            status: 'completed',
            log: exerciseLogs,
            exercises: extraExercises,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: durationSecs > 0 ? formatDur(durationSecs) : (existingW.duration ? (typeof existingW.duration === 'number' ? formatDur(existingW.duration * 60) : existingW.duration) : '00:00')
          };
        } else {
          workouts.push({
            id: `adhoc_${Date.now()}`,
            programId: 'adhoc',
            programName: 'Sesi Ekstra',
            status: 'completed',
            log: exerciseLogs,
            exercises: extraExercises,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: durationSecs > 0 ? formatDur(durationSecs) : '00:00'
          });
        }
      } else {
        // Untuk program biasa
        workouts = workouts.map(w => {
          const isTargetWorkout = focusWorkoutId 
            ? (w.id === focusWorkoutId) 
            : (progId ? (w.id === progId || w.programId === progId) : w.status === 'planned');
            
          if (isTargetWorkout) {
            return {
              ...w,
              status: 'completed',
              log: exerciseLogs,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: durationSecs > 0 ? formatDur(durationSecs) : (w.duration ? (typeof w.duration === 'number' ? formatDur(w.duration * 60) : w.duration) : '00:00')
            };
          }
          return w;
        });
      }
      
      h[targetDateStr] = { ...dayData, workouts, _activeSession: progId === 'extra' ? { ...(dayData._activeSession || {}), extraExercises: [] } : dayData._activeSession };
      return h;
    });

    setActiveTab('calendar');
  };

  const handleEditPastWorkout = (dateStr, w) => {
    playSoundEffect('click', soundEnabled);
    setSelectedDate(dateStr);
    setActiveProgramId(w.programId);
    setFocusWorkoutId(w.programId === 'adhoc' ? 'extra' : w.id);
    
    // Parse previous duration to seconds
    let prevSecs = 0;
    if (w.duration) {
      if (typeof w.duration === 'number') {
        prevSecs = w.duration * 60;
      } else if (typeof w.duration === 'string') {
        const parts = w.duration.split(':').map(Number);
        if (parts.length === 3) {
          prevSecs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        } else if (parts.length === 2) {
          prevSecs = (parts[0] || 0) * 60 + (parts[1] || 0);
        }
      }
    }
    
    // Automatically resume timer globally
    setIsWorkoutActive(true);
    setWorkoutStartTime(Date.now() - (prevSecs * 1000));
    setResumeDurationSecs(0);
    
    // Load the specific log for this workout if it exists
    if (w.log && Object.keys(w.log).length > 0) {
      setExerciseLogs(w.log);
    } else {
      const dayData = history[dateStr];
      if (dayData && dayData._activeSession && dayData._activeSession.exerciseLogs && Object.keys(dayData._activeSession.exerciseLogs).length > 0) {
        setExerciseLogs(dayData._activeSession.exerciseLogs);
      } else {
        // Fallback
        let mergedLogs = {};
        if (dayData && dayData.workouts) {
          dayData.workouts.forEach(work => {
            if (work.log) mergedLogs = { ...mergedLogs, ...work.log };
          });
        }
        setExerciseLogs(mergedLogs);
      }
    }
    
    // Reset skipped exercises for safety
    setSkippedExercises({});
    setActiveTab('workout');
  };

  const addExerciseTarget = (ex) => {
    if (!activeAddModalTarget) return;
    playSoundEffect('click', soundEnabled);
    saveStateToHistory(); 
    
    let defaultSets = 3; let defaultReps = 10; let defaultDuration = 10;
    if (ex.type === 'time') { defaultSets = 1; defaultReps = 0; defaultDuration = ex.duration || 15; }
    else if (ex.type === 'reps') { defaultSets = 3; defaultReps = ex.reps || 15; defaultDuration = 0; }

    if (activeAddModalTarget.type === 'program') {
      const progId = activeAddModalTarget.progId;
      setPrograms(programs.map(p => p.id === progId ? { ...p, exercises: [...p.exercises, { ...ex, id: Date.now(), sets: defaultSets, reps: defaultReps, duration: defaultDuration }] } : p));
    } else if (activeAddModalTarget.type === 'adhoc') { 
      setExtraExercises(prev => [...prev, { ...ex, id: `${ex.id}-${Date.now()}`, sets: defaultSets, reps: defaultReps, duration: defaultDuration }]); 
      setLastActionTime(Date.now()); // Trigger Autosave
    } else if (activeAddModalTarget.type === 'replace') {
      const exToReplaceId = activeAddModalTarget.id;
      setPrograms(programs.map(p => {
        const hasEx = p.exercises?.some(e => e.id === exToReplaceId);
        if (hasEx) {
           return {
             ...p,
             exercises: p.exercises.map(e => e.id === exToReplaceId ? { ...ex, id: Date.now(), sets: e.sets || defaultSets, reps: e.reps || defaultReps, duration: e.duration || defaultDuration } : e)
           }
        }
        return p;
      }));
      setLastActionTime(Date.now());
    }
    setActiveAddModalTarget(null); 
  };

  const handleCreateCustomExercise = (form) => {
    playSoundEffect('click', soundEnabled);
    saveStateToHistory(); 
    const newMasterEx = { id: Date.now(), name: form.name, target: form.targets.length ? form.targets : ['Full Body'], type: form.type, equipment: form.equipment, defaultWeight: 0, ytVideo: form.ytVideo };
    setExerciseLibrary([...exerciseLibrary, newMasterEx]); 
    addExerciseTarget(newMasterEx);
  };

  const activeDayData = getDayHistory(selectedDate);
  const isCurrentlyCompleted = activeDayData?.status === 'completed';

  // ==========================================
  // RENDER PENGHALANG SAAT LOADING / CEK AUTH
  // ==========================================
  if (isAuthChecking || (user && !isDataLoaded)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
         <Loader2 size={48} className="text-sky-500 animate-spin mb-6" />
         <h2 className="text-white body-lg font-black animate-pulse tracking-wider uppercase">Menyiapkan Ruang Latihan...</h2>
      </div>
    );
  }

  // JIKA USER BELUM LOGIN
  if (!user) {
    return <AuthPage t={t} theme={theme} soundEnabled={soundEnabled} onLogin={setUser} />;
  }

  // JIKA USER SUDAH LOGIN
  return (
    <div className={`min-h-screen ${t.bgApp} ${t.textMain} font-sans ${(activeTab === 'calendar' || activeTab === 'database') ? 'h-screen overflow-hidden' : 'pb-24'} transition-colors duration-300`}>
      <ConfirmModal confirmModal={confirmModal} setConfirmModal={setConfirmModal} t={t} lang={lang} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} />
      <AddExerciseModal t={t} lang={lang} activeAddModalTarget={activeAddModalTarget} setActiveAddModalTarget={setActiveAddModalTarget} exerciseLibrary={exerciseLibrary} onAddExerciseTarget={addExerciseTarget} setActiveTab={setActiveTab} />
      <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} t={t} lang={lang} />
      {globalDetailExercise && (
        <ExerciseDetailModal 
          ex={globalDetailExercise} 
          onClose={() => setGlobalDetailExercise(null)} 
          t={t} lang={lang} soundEnabled={soundEnabled} 
          historyData={[]}
        />
      )}
      
      <SettingsModal 
         showSettings={showSettings} setShowSettings={setShowSettings} t={t} lang={lang} 
         theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} 
         soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
         defaultRestTime={defaultRestTime} setDefaultRestTime={setDefaultRestTime}
         undoStack={undoStack} redoStack={redoStack} handleUndo={handleUndo} handleRedo={handleRedo}
         setShowHelp={setShowHelp}
         exportData={exportData} handleImportFile={handleImportFile}
         user={user} handleLogout={handleLogout}
      />

      <Header setConfirmModal={setConfirmModal} t={t} theme={theme} user={user} showSettings={showSettings} setShowSettings={setShowSettings} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} activeTab={activeTab} setActiveTab={setActiveTab} isOffline={isOffline} />
      
      <main className={`${(activeTab === 'calendar' || activeTab === 'database') ? 'px-4 pb-4 pt-0 h-[calc(100vh-140px)] flex flex-col' : 'p-4'} max-w-5xl mx-auto w-full min-h-[70vh]`}>
         {activeTab === 'dashboard' && (
             <DashboardTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} language={language} user={user} history={history} setHistory={setHistory} programs={programs}
               navigateToWorkoutDate={navigateToWorkoutDate} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
               theme={theme} exerciseLibrary={exerciseLibrary} selectedDate={selectedDate}
             />
         )}
         
         {activeTab === 'workout' && (
             <WorkoutTab 
               t={t} lang={lang} language={language} programs={programs} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
               history={history} setHistory={setHistory} setActiveTab={setActiveTab}
               activeProgramId={activeProgramId} setActiveProgramId={setActiveProgramId} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
               warmupVideos={warmupVideos} cooldownVideos={cooldownVideos} onOpenDetail={setGlobalDetailExercise}
               exerciseLibrary={exerciseLibrary}
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} extraExercises={extraExercises}
               onSetChange={handleSetChange} onToggleSet={handleToggleSet} onSkipSet={handleSkipSet} onAddSet={handleAddSet} onRemoveSet={handleRemoveSet}
               onToggleSkip={handleToggleSkip} onRemoveExtra={handleRemoveExtraEx}
               isCurrentlyCompleted={isCurrentlyCompleted} onSaveWorkout={handleSaveWorkout} onCancelWorkout={handleCancelWorkout}
               onAddExtraClick={() => setActiveAddModalTarget({type: 'adhoc'})} 
               onAddExtraExercise={(ex) => setExtraExercises([...extraExercises, ex])}
               
               // New Global Timer Props
               isWorkoutActive={isWorkoutActive} setIsWorkoutActive={setIsWorkoutActive}
               workoutStartTime={workoutStartTime} setWorkoutStartTime={setWorkoutStartTime}
               restTargetTime={restTargetTime} setRestTargetTime={setRestTargetTime}
               isImmersiveMode={isImmersiveMode} setIsImmersiveMode={setIsImmersiveMode}
               restTimer={restTimer} setRestTimer={setRestTimer}
               sessionToRun={sessionToRun} setSessionToRun={setSessionToRun}
               resumeDurationSecs={resumeDurationSecs} setResumeDurationSecs={setResumeDurationSecs}
               
               // Focus
               focusWorkoutId={focusWorkoutId} setFocusWorkoutId={setFocusWorkoutId}
             />
         )}
         
         {activeTab === 'calendar' && (
             <CalendarTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} theme={theme} history={history} setHistory={setHistory} programs={programs} 
               soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} navigateToWorkoutDate={navigateToWorkoutDate} 
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} handleEditPastWorkout={handleEditPastWorkout}
               selectedDate={selectedDate} setSelectedDate={setSelectedDate} setActiveTab={setActiveTab}
             />
         )}

         {activeTab === 'program' && (
             <ProgramTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} programs={programs} setPrograms={setPrograms} 
               exerciseLibrary={exerciseLibrary} soundEnabled={soundEnabled}
               setActiveAddModalTarget={setActiveAddModalTarget}
               saveStateToHistory={saveStateToHistory}
             />
         )}

         {activeTab === 'database' && (
             <DatabaseTab setConfirmModal={setConfirmModal} 
             t={t} lang={lang} 
             exerciseLibrary={exerciseLibrary} setExerciseLibrary={setExerciseLibrary} 
             history={history}
             soundEnabled={soundEnabled}
             warmupVideos={warmupVideos} setWarmupVideos={setWarmupVideos}
             cooldownVideos={cooldownVideos} setCooldownVideos={setCooldownVideos}
             onOpenDetail={setGlobalDetailExercise}
           />
         )}


      </main>

      <FloatingTimer 
        restTimer={restTimer} setRestTimer={setRestTimer} defaultRestTime={defaultRestTime} 
        t={t} soundEnabled={soundEnabled} 
        isWorkoutActive={isWorkoutActive} activeTab={activeTab} 
        setActiveTab={setActiveTab} workoutStartTime={workoutStartTime}
        isImmersiveMode={isImmersiveMode} setIsImmersiveMode={setIsImmersiveMode}
        sessionToRun={sessionToRun} setSessionToRun={setSessionToRun}
        setFocusWorkoutId={setFocusWorkoutId}
      />
      {/* Toast "Tekan Back Sekali Lagi" */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-5 py-2.5 rounded-full shadow-lg text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'}`}>
            Tekan sekali lagi untuk keluar
          </div>
        </div>
      )}
      <BottomNav t={t} lang={lang} activeTab={activeTab} setActiveTab={setActiveTab} setIsEditingMode={setIsEditingMode} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} />
    </div>
  );
}