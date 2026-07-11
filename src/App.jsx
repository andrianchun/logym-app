import React, { useState, useEffect, useRef } from 'react';

// --- IMPORT CAPACITOR (FULLSCREEN) ---
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- IMPORT MESIN FIREBASE ---
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { doc, setDoc, onSnapshot, deleteField, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

// --- IMPORT KOMPONEN UI ---
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FloatingTimer from './components/FloatingTimer';
import CoachRaigaFloat from './components/CoachRaigaFloat';
import GymAIChat from './components/GymAIChat';

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
// Lazy: modal berat ini (beserta CommunityTab, ShareCardGenerator, html2canvas, dsb.)
// baru diunduh & di-mount saat pertama kali dibuka — mempercepat startup.
const ProfileModal = React.lazy(() => import('./modals/ProfileModal'));
const ProgramQuestionnaireModal = React.lazy(() => import('./modals/ProgramQuestionnaireModal'));
import AchievementPopup from './components/AchievementPopup';
import { checkAchievements, ACHIEVEMENTS } from './data/achievements';

// --- IMPORT DATA & MESIN ---
import { playSoundEffect } from './utils/audio';
import { fetchExercisesFromApi } from './utils/exerciseDbApi';
import { AI_MODELS, detectPlateaus } from './utils/aiAgent';
import useDialog from './hooks/useDialog';
import { getLocalYMD, defaultMasterExercises, defaultPrograms, defaultWarmupVideos, defaultCooldownVideos } from './data/constants';
import { Loader2, Download } from 'lucide-react';

// Serialisasi kanonik (key di-sort) supaya perbandingan tidak terpengaruh urutan key
// antara objek buatan lokal vs hasil decode Firestore.
const stableStringify = (val) => {
  if (val === null || typeof val !== 'object') return JSON.stringify(val) ?? 'null';
  if (Array.isArray(val)) return '[' + val.map(v => stableStringify(v === undefined ? null : v)).join(',') + ']';
  const keys = Object.keys(val).filter(k => val[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(val[k])).join(',') + '}';
};

// Serialisasi satu hari history untuk diff auto-save (tanpa _activeSession yang per-device)
const serializeDay = (val) => {
  if (val && typeof val === 'object') {
    const { _activeSession, ...dayData } = val;
    return stableStringify(dayData);
  }
  return stableStringify(val ?? null);
};

export default function App() {
  // --- STATE AUTH & LOADING ---
  const __previewUser = JSON.parse(localStorage.getItem('__PREVIEW_USER') || 'null');
  const [user, setUser] = useState(__previewUser);
  const [isAuthChecking, setIsAuthChecking] = useState(!__previewUser);
  const [isDataLoaded, setIsDataLoaded] = useState(!!__previewUser);
  const [isSplashMinTimeReached, setIsSplashMinTimeReached] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashMinTimeReached(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- PWA INSTALL PROMPT ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem('__PWA_PROMPT_DISMISSED');
      if (!hasDismissed) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // --- STATE UTAMA ---
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('ID');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [defaultRestTime, setDefaultRestTime] = useState(120);
  const [warmupVideos, setWarmupVideos] = useState(defaultWarmupVideos);
  const [cooldownVideos, setCooldownVideos] = useState(defaultCooldownVideos);
  const [weekStartDay, setWeekStartDay] = useState(0); // 0: Sunday, 1: Monday
  const [defaultReminderTime, setDefaultReminderTime] = useState("15:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [biometricStandard, setBiometricStandard] = useState('asia'); // 'asia' | 'western'
  const [unitSystem, setUnitSystem] = useState('metric'); // deprecated, kept for safety during transition
  const [units, setUnits] = useState({ weight: 'kg', height: 'cm', distance: 'km', temp: 'c' });
  const [userProfile, setUserProfile] = useState({ goal: null, experience: null });
  const [gymProfiles, setGymProfiles] = useState([{ id: 'default', name: 'LOGYM', equipment: 'all', config: {} }]);
  const [activeGymId, setActiveGymId] = useState('default');
  const [userApiKeys, setUserApiKeys] = useState([]);
  const [aiProvider, setAiProvider] = useState('google');
  const [aiModel, setAiModel] = useState('gemini-3.5-flash');
  const [keyStatuses, setKeyStatuses] = useState({});
  const [raigaPersona, setRaigaPersona] = useState('santai');
  const [raigaCustomInstruction, setRaigaCustomInstruction] = useState('');
  const [raigaMemory, setRaigaMemory] = useState([]);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [activityTargets, setActivityTargets] = useState({ steps: 10000, weeklyDuration: 150, sleep: 8 });
  const [userAchievements, setUserAchievements] = useState([]);
  const [unlockedAchievementsPopup, setUnlockedAchievementsPopup] = useState([]);

  const [exerciseLibrary, setExerciseLibrary] = useState(defaultMasterExercises);
  const [programs, setPrograms] = useState(defaultPrograms);
  const [history, setHistory] = useState({});
  
  const [activeTab, _setActiveTab] = useState('dashboard');
  const [tabSlideDir, setTabSlideDir] = useState('');

  const setActiveTab = (newTab) => {
    if (typeof newTab === 'function') newTab = newTab(activeTab);
    if (newTab === activeTab) return;

    const tabsList = ['dashboard', 'workout', 'calendar', 'program', 'database'];
    const curIdx = tabsList.indexOf(activeTab);
    const newIdx = tabsList.indexOf(newTab);
    if (curIdx !== -1 && newIdx !== -1) {
      setTabSlideDir(newIdx > curIdx ? 'right' : 'left');
    }

    const emptyCustomPrograms = programs.filter(p => {
        const isCustom = p.planId === 'custom' || (p.planId && p.planId.startsWith('custom-'));
        const hasNoExercises = (!p.exercises || p.exercises.length === 0);
        const hasNoAssignedDays = (!p.assignedDays || p.assignedDays.length === 0);
        return isCustom && hasNoExercises && hasNoAssignedDays;
    });

    if (emptyCustomPrograms.length > 0) {
       setConfirmModal({
           isOpen: true,
           title: 'Bersihkan Sesi Kosong?',
           message: `Sistem mendeteksi ada ${emptyCustomPrograms.length} program custom kosong (tidak ada latihannya sama sekali). Apakah kamu ingin menghapusnya agar daftar programmu tetap rapi?`,
           onConfirm: () => {
               playSoundEffect('success', soundEnabled);
               setPrograms(prev => prev.filter(p => !emptyCustomPrograms.some(emp => emp.id === p.id)));
               setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
               _setActiveTab(newTab);
           },
           onCancel: () => {
               const targetProg = emptyCustomPrograms[0];
               setFocusRoutineId(targetProg.id);
               _setActiveTab('program');
               setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
           }
       });
       return;
    }

    _setActiveTab(newTab);
  };

  const [focusRoutineId, setFocusRoutineId] = useState(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [restTimer, setRestTimer] = useState(0); // Legacy, might be replaced by restTargetTime

  // --- GLOBAL WORKOUT STATE ---
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [resumeDurationSecs, setResumeDurationSecs] = useState(0);
  const [sessionSnapshot, setSessionSnapshot] = useState(null);
  const [restTargetTime, setRestTargetTime] = useState(null);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [sessionToRun, setSessionToRun] = useState(null);
  // Ref agar listener notifikasi (didaftarkan sekali saat mount) selalu membaca nilai terbaru
  const sessionToRunRef = useRef(null);
  useEffect(() => { sessionToRunRef.current = sessionToRun; }, [sessionToRun]);

  const [selectedDate, setSelectedDate] = useState(getLocalYMD(new Date()));
  const [loadedDate, setLoadedDate] = useState(null);
  const [activePlanIds, setActivePlanIds] = useState(['custom']);
  const [activeProgramId, setActiveProgramId] = useState(defaultPrograms[0]?.id || null);
    const [focusWorkoutId, setFocusWorkoutId] = useState(null);

  // Self-healing: Hapus duplikat ID pada latihan (menghindari error DndKit dari state lama)
  useEffect(() => {
    if (!programs || programs.length === 0) return;
    let changed = false;
    const newProgs = programs.map(p => {
      let pChanged = false;
      const newRoutines = p.routines?.map(r => {
         let rChanged = false;
         const seen = new Set();
         const newExs = r.exercises?.map(ex => {
           if (seen.has(ex.id)) {
             rChanged = true;
             const newId = ex.id + '-' + Math.random().toString(36).substr(2, 5);
             seen.add(newId);
             return { ...ex, id: newId };
           }
           seen.add(ex.id);
           return ex;
         });
         if (rChanged) { pChanged = true; return { ...r, exercises: newExs }; }
         return r;
      });
      if (pChanged) { changed = true; return { ...p, routines: newRoutines }; }
      return p;
    });
    if (changed) {
      setPrograms(newProgs);
    }
  }, [programs]);


  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForceTab, setProfileForceTab] = useState(null);
  const [highlightPostId, setHighlightPostId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [globalDetailExercise, setGlobalDetailExercise] = useState(null);
  const [isFreshAccount, setIsFreshAccount] = useState(false);
  const [showGymManager, setShowGymManager] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [activeAddModalTarget, setActiveAddModalTarget] = useState(null);

  // --- GLOBAL COACH RAIGA STATE ---
  const [showAiChat, setShowAiChat] = useState(false);
  const [avatarPos, setAvatarPos] = useState(null); // {x,y} center of float avatar
  const { dialog: aiDialog, showAlert: showAiAlert } = useDialog(theme === 'dark');

  // Plateau detection — pure rule-based, no AI call
  const plateauInsights = React.useMemo(
    () => detectPlateaus(history, 3, 2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history]
  );

  // Global handleAcceptProgram hoisted here so GymAIChat can call it from any tab
  const handleAcceptAiProgram = React.useCallback(async (programData) => {
    const isUpdate = programData.action === 'update' && programData.targetPlanId;
    const planId = isUpdate ? programData.targetPlanId : `plan_ai_${Date.now()}`;

    const existingPlanName = isUpdate
      ? programs.find(p => p.planId === planId)?.planName || programData.planName || 'AI Program'
      : programData.planName || 'AI Program';

    const ts = Date.now();
    // We need exerciseLibrary — captured via closure (it's in App scope)
    const routines = (programData.routines || []).map((r, i) => {
      const exercises = (r.exercises || []).map((ex, j) => {
        const matchedEx = exerciseLibrary.find(
          e => e.name.toLowerCase() === ex.name.toLowerCase()
        ) || exerciseLibrary[0];
        return {
          id: `${matchedEx.id}_r${i}_e${j}_${ts}`,
          name: matchedEx.name,
          sets: parseInt(ex.sets) || 3,
          reps: parseInt(ex.reps) || 10,
          target: matchedEx.target || [],
          type: matchedEx.type || 'weight',
          defaultWeight: matchedEx.defaultWeight || 0,
          equipment: matchedEx.equipment || 'Body Weight',
          ytVideo: matchedEx.ytVideo || ''
        };
      });
      return {
        id: `routine_ai_${ts}_${i}`,
        planId,
        planName: existingPlanName,
        assignedDays: Array.isArray(r.assignedDays) ? r.assignedDays : [],
        name: r.name || `Day ${i + 1}`,
        exercises,
        restTime: 90,
        source: 'ai'
      };
    });

    try {
      if (isUpdate) {
        setPrograms(prev => [...routines, ...prev.filter(p => p.planId !== planId)]);
        await showAiAlert('Program berhasil diperbarui sesuai saran Coach Raiga!', { type: 'success' });
      } else {
        setPrograms(prev => [...routines, ...prev]);
        setActivePlanIds(prev => [...prev.filter(id => id !== 'custom'), planId]);
        await showAiAlert('Program AI berhasil disimpan dan diaktifkan! 🧠', { type: 'success' });
      }
    } catch (e) {
      console.error(e);
      await showAiAlert('Terjadi kesalahan saat memproses program AI.', { type: 'error' });
    }
  }, [exerciseLibrary, programs, showAiAlert, setPrograms, setActivePlanIds]);
  const [connectedApps, setConnectedApps] = useState(() => {
      const saved = localStorage.getItem('lyfit_connectedApps');
      return saved ? JSON.parse(saved) : { healthconnect: false, applehealth: false };
  });

  const [exerciseLogs, setExerciseLogs] = useState({});
  const [skippedExercises, setSkippedExercises] = useState({});
  const [extraExercises, setExtraExercises] = useState([]);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showExitToast, setShowExitToast] = useState(false);
  const [showSupersetToast, setShowSupersetToast] = useState(false);
  const backPressedOnce = useRef(false);
  const scrollPositions = useRef({});
  const prevTab = useRef(activeTab);

  // Gate lazy-mount: modal berat baru di-mount saat pertama kali dibuka,
  // lalu tetap ter-mount (perilaku state internal sama seperti sebelumnya).
  const profileModalOpened = useRef(false);
  if (showProfileModal) profileModalOpened.current = true;
  const questionnaireOpened = useRef(false);
  if (showQuestionnaire) questionnaireOpened.current = true;

  useEffect(() => {
    if (prevTab.current !== activeTab) {
      setTimeout(() => {
        window.scrollTo(0, scrollPositions.current[activeTab] || 0);
      }, 10);
      prevTab.current = activeTab;
    }
    
    const handleScroll = () => {
      scrollPositions.current[activeTab] = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  // ==========================================
  // 0. CAPACITOR & NOTIFICATION INIT
  // ==========================================
  useEffect(() => {
    // Request web notification for timer alerts
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Listener: Ketuk notifikasi workout → buka tab Workout
    // Pakai _setActiveTab (setter stabil) & sessionToRunRef karena closure ini dibuat sekali saat mount
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        if (notification.notification.id === 9999) {
          _setActiveTab('workout');
          if (sessionToRunRef.current) {
            setFocusWorkoutId(sessionToRunRef.current);
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
    } else {
      // Web/PWA: status bar (iOS) & address bar (Android Chrome) mengikuti <meta theme-color>,
      // yang statis di index.html. Update di sini supaya ikut menyatu dengan tema aktif,
      // menyamai efek transparent+overlay yang sudah berjalan di native.
      const themeColor = theme === 'dark' ? '#040f1a' : '#f8fafc';
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', themeColor);
    }
  }, [theme]);

  // --- PREFETCH DATABASE LATIHAN SAAT IDLE ---
  // JSON ~1MB sudah dikeluarkan dari bundle; muat di background setelah UI siap
  // agar cache sudah hangat saat user membuka library/kartu latihan.
  useEffect(() => {
    const timer = setTimeout(() => { fetchExercisesFromApi(); }, 2500);
    return () => clearTimeout(timer);
  }, []);

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

  // --- EFEK ONBOARDING AI ---
  useEffect(() => {
    const alreadyDone = user?.uid ? localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true' : false;
    if (isDataLoaded && user && isFreshAccount && !alreadyDone) {
      setShowQuestionnaire(true);
      setIsFreshAccount(false); // Only trigger once
    } else if (isFreshAccount) {
      setIsFreshAccount(false); // reset even if we don't show questionnaire
    }
  }, [isDataLoaded, user, isFreshAccount]);

  const handleApplyRecommendedPlan = (plan) => {
    playSoundEffect('success', soundEnabled);
    const newPlanId = plan.id || `plan-${Date.now()}`;
    const userExperience = plan.userExperience || 'beginner';
    
    if (plan.userGoal || plan.userExperience || plan.biometrics) {
      setUserProfile(prev => ({
        ...prev,
        goal: plan.userGoal || prev?.goal,
        experience: plan.userExperience || prev?.experience,
        hasCompletedOnboarding: true,
        ...(plan.biometrics || {})
      }));

      // SIMPAN KE HISTORY JUGA SUPAYA MUNCUL DI GRAFIK KLINIS
      if (plan.biometrics && plan.biometrics.weight && plan.biometrics.height) {
          const todayStr = getLocalYMD(new Date());
          setHistory(prev => {
              const prevDay = prev[todayStr] || {};
              const prevBio = prevDay.bioData || {};
              return {
                  ...prev,
                  [todayStr]: {
                      ...prevDay,
                      bioData: {
                          ...prevBio,
                          weight: plan.biometrics.weight,
                          height: plan.biometrics.height,
                          bmi: plan.biometrics.bmi,
                          bmr: plan.biometrics.bmr
                      }
                  }
              };
          });
      }
    } else {
      setUserProfile(prev => ({ ...prev, hasCompletedOnboarding: true }));
    }

    if (plan.calculatedTargets) {
      const existingGoal = activityTargets?.nutritionGoal;
      const newGoal = plan.calculatedTargets.nutritionGoal;
      
      const updateTargets = (overrideGoal = false) => {
        setActivityTargets(prev => ({
          ...prev,
          tdee: plan.calculatedTargets.tdee,
          ...(overrideGoal || !existingGoal ? {
            activityCalories: plan.calculatedTargets.activityCalories,
            calorieDelta: plan.calculatedTargets.calorieDelta,
            nutritionGoal: newGoal
          } : {})
        }));
      };

      if (existingGoal && existingGoal !== newGoal && existingGoal !== 'custom') {
        const goalLabels = { 'cutting': 'Cutting', 'clean_bulk': 'Clean Bulk', 'maintenance': 'Maintenance' };
        setConfirmModal({
          isOpen: true,
          title: 'Perbedaan Target Kalori',
          message: `Program baru ini dirancang untuk target ${goalLabels[newGoal] || newGoal}, tapi target nutrisimu saat ini adalah ${goalLabels[existingGoal] || existingGoal}. Apakah kamu ingin mengganti target nutrisi harianmu?`,
          confirmText: `Ganti ke ${goalLabels[newGoal] || newGoal}`,
          cancelText: `Tetap ${goalLabels[existingGoal] || existingGoal}`,
          onConfirm: () => {
            updateTargets(true);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            updateTargets(false);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
      } else {
        updateTargets(true);
      }
    }

    // Unlocked "Langkah Pertama" achievement after completing questionnaire
    if (!userAchievements.includes('first_workout')) {
      const newBadge = ACHIEVEMENTS.find(a => a.id === 'first_workout');
      if (newBadge) {
        setUnlockedAchievementsPopup(prev => [...prev, newBadge]);
        setUserAchievements(prev => [...prev, 'first_workout']);
      }
    }

    if (plan.gymProfileId && plan.gymProfileId !== 'ADD_NEW_GYM') {
      setActiveGymId(plan.gymProfileId);
    }

    let baseName = plan.name || 'Program Cerdas AI';
    let uniqueName = baseName;
    let counter = 2;
    while (programs.some(p => p.planName === uniqueName)) {
      uniqueName = `${baseName} (${counter})`;
      counter++;
    }

    if (!plan || !plan.routines || plan.routines.length === 0) {
      console.error('handleApplyRecommendedPlan: plan.routines is empty or missing', plan);
      // Close modal and navigate to program tab even if generation failed
      localStorage.setItem('lyfit_onboarding_completed', 'true');
      setShowQuestionnaire(false);
      setActiveTab('program');
      return;
    }

    const newPrograms = plan.routines.map((routine, idx) => {
      return {
        id: `prog-${Date.now()}-${idx}`,
        name: routine.name.replace(/\s*\([^)]*\)/g, ''),
        restTime: routine.restTime || 90,
        warmupVideoUrls: routine.warmupVideoUrls || [],
        cooldownVideoUrls: routine.cooldownVideoUrls || [],
        exercises: routine.exercises.map(ex => ({
          ...ex,
          id: Date.now() + Math.random(),
          originalId: ex.id
        })),
        planId: newPlanId,
        planName: uniqueName,
        planLevel: userExperience,
        planGoal: plan.calculatedTargets?.nutritionGoal || 'maintenance',
        assignedDays: routine.day ? [routine.day] : [] 
      };
    });
    
    const updatedPrograms = [...programs, ...newPrograms];
    setPrograms(updatedPrograms);
    setActivePlanIds([newPlanId]);
    setActiveProgramId(newPrograms[0].id);
    setActiveTab('program');
    if (user?.uid) {
      localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
    }
    setShowQuestionnaire(false);

    // Immediately write onboardingCompleted flag to Firebase so it syncs across devices
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => {});
    }

    setTimeout(() => {
      const layout = window.innerWidth < 640 ? 'mobile' : 'desktop';
      const el = document.getElementById(`plan-${layout}-${newPlanId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

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
        new Notification("LOGYM Workout", { 
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
            body: `Durasi: ${formatNotifTime(elapsed)} — Ketuk untuk kembali ke LOGYM`,
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
    if (localStorage.getItem('__PREVIEW_USER')) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ 
           uid: currentUser.uid, 
           email: currentUser.email, 
           name: currentUser.displayName || 'Sobat LOGYM',
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
        setUserApiKey('');
        setAiProvider('google');
        setAiModel('gemini-3.5-flash');
        setUserProfile(null);
        setTheme('dark');
        setLanguage('ID');
        setSoundEnabled(true);
        setDefaultRestTime(60);
        setUnits({ weight: 'kg', height: 'cm', distance: 'km', temp: 'c' });
        setGymProfiles([{ id: 'default', name: 'LOGYM', equipment: 'all', config: {} }]);
        setActiveGymId('default');
        setActivityTargets({ steps: 10000, weeklyDuration: 150, sleep: 8 });
        setActivePlanIds(['custom']);
        setBiometricStandard('asia');
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

    // Baseline diff milik user sebelumnya tidak berlaku lagi
    lastSavedHistoryJson.current = null;

    if (localStorage.getItem('__PREVIEW_USER')) { setIsDataLoaded(true); return; }

    if (user) {

      const currentYear = new Date().getFullYear().toString();
      const mainDocRef = doc(db, "users", user.uid);
      const historyDocRef = doc(db, "users", user.uid, "history_years", currentYear);

      unsubscribeMain = onSnapshot(mainDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          try {
            const data = docSnap.data();
            
            // --- Cek Global Ban ---
            if (data.isBanned) {
              localStorage.setItem('lyfit_banned_msg', 'Akun Anda telah dinonaktifkan secara permanen karena melanggar panduan komunitas kami.');
              signOut(auth);
              return;
            }

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
                  if (d.programId || d.status || (d.log && Object.keys(d.log).length > 0)) {
                    newD.workouts.push({
                      id: `migrated_${Math.random().toString(36).substr(2, 9)}`,
                      programId: d.programId || 'custom',
                      programName: d.programName || 'Latihan Custom',
                      status: d.status || 'completed',
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

              // Seed baseline diff dari hasil migrasi (jalur ini menulis year docs sendiri di bawah)
              const migratedBase = {};
              Object.keys(migratedHistory).forEach(d => { migratedBase[d] = serializeDay(migratedHistory[d]); });
              lastSavedHistoryJson.current = migratedBase;

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

            if (data.programs && Array.isArray(data.programs) && data.programs.length > 0) {
              const parsedPrograms = typeof data.programs === 'string' ? JSON.parse(data.programs) : data.programs;
              // Default day assignments for the 4 built-in programs
              const DEFAULT_DAYS = { 'prog-1': ['Sel'], 'prog-2': ['Rab'], 'prog-3': ['Jum'], 'prog-4': ['Min'] };
              const migratedPrograms = parsedPrograms.map(p => ({
                ...p,
                restTime: p.restTime ?? 120,
                warmupVideoUrls: p.warmupVideoUrls ?? [],
                // Migrate built-in default programs: add planId + assignedDays if missing
                planId: p.planId ?? (DEFAULT_DAYS[p.id] ? 'custom' : undefined),
                planName: p.planName ?? (DEFAULT_DAYS[p.id] ? 'Program Default' : undefined),
                assignedDays: p.assignedDays ?? DEFAULT_DAYS[p.id] ?? [],
                exercises: p.exercises ? p.exercises.map(ex => 
                  (ex.id === 101 && ex.name === 'Incline Smith Machine Press') ? { ...ex, name: 'Smith Machine Incline Bench Press' } : ex
                ) : []
              }));
              setPrograms(prev => JSON.stringify(prev) === JSON.stringify(migratedPrograms) ? prev : migratedPrograms);
            }
            if (data.exerciseLibrary) {
              const parsedLib = typeof data.exerciseLibrary === 'string' ? JSON.parse(data.exerciseLibrary) : data.exerciseLibrary;
              const migratedLib = parsedLib.map(ex => 
                (ex.id === 101 && ex.name === 'Incline Smith Machine Press') ? { ...ex, name: 'Smith Machine Incline Bench Press' } : ex
              );
              
              // Migrate new default non-weight exercises (126-133) for existing users
              const existingIds = new Set(migratedLib.map(ex => ex.id));
              defaultMasterExercises.forEach(defaultEx => {
                  if (defaultEx.id >= 126 && defaultEx.id <= 133 && !existingIds.has(defaultEx.id)) {
                      migratedLib.push(defaultEx);
                  }
              });

              setExerciseLibrary(prev => JSON.stringify(prev) === JSON.stringify(migratedLib) ? prev : migratedLib);
            }
            if (data.settings) {
              const parsedSettings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
              if (parsedSettings.theme) setTheme(parsedSettings.theme);
              // .toUpperCase() untuk self-heal akun yang sempat kesimpan 'id' huruf kecil
              // (lihat komentar di reset state saat logout) — tanpa ini, target otot tidak
              // pernah ketemu di muscleDictionary (keys-nya 'EN'/'ID' uppercase).
              if (parsedSettings.language) setLanguage(parsedSettings.language.toUpperCase());
              if (parsedSettings.soundEnabled !== undefined) setSoundEnabled(parsedSettings.soundEnabled);
              if (parsedSettings.defaultRestTime) setDefaultRestTime(parsedSettings.defaultRestTime);
              if (parsedSettings.warmupVideos) setWarmupVideos(parsedSettings.warmupVideos);
              if (parsedSettings.cooldownVideos) setCooldownVideos(parsedSettings.cooldownVideos);
              if (parsedSettings.weekStartDay !== undefined) setWeekStartDay(parsedSettings.weekStartDay);
              if (parsedSettings.defaultReminderTime) setDefaultReminderTime(parsedSettings.defaultReminderTime);
              if (parsedSettings.reminderEnabled !== undefined) setReminderEnabled(parsedSettings.reminderEnabled);
              if (parsedSettings.biometricStandard) setBiometricStandard(parsedSettings.biometricStandard);
              if (parsedSettings.unitSystem && !parsedSettings.units) {
                  setUnitSystem(parsedSettings.unitSystem);
                  if (parsedSettings.unitSystem === 'imperial') {
                      setUnits({ weight: 'lbs', height: 'ft', distance: 'mi', temp: 'f' });
                  } else {
                      setUnits({ weight: 'kg', height: 'cm', distance: 'km', temp: 'c' });
                  }
              }
              if (parsedSettings.units) setUnits(parsedSettings.units);
              if (parsedSettings.gymProfiles) {
                  const migratedProfiles = parsedSettings.gymProfiles.map(g => {
                      if (g.id === 'default' && g.name === 'Lyfit Gym') {
                          return { ...g, name: 'LOGYM' };
                      }
                      return g;
                  });
                  setGymProfiles(migratedProfiles);
              }
              if (parsedSettings.activeGymId) setActiveGymId(parsedSettings.activeGymId);
              if (parsedSettings.activityTargets) setActivityTargets(parsedSettings.activityTargets);
              if (parsedSettings.activePlanIds) setActivePlanIds(parsedSettings.activePlanIds);
              else if (parsedSettings.activePlanId) setActivePlanIds([parsedSettings.activePlanId]);
              else setActivePlanIds(['custom']); // default: always activate the built-in default plan
              
              if (parsedSettings.userProfile) setUserProfile(parsedSettings.userProfile);
              else setUserProfile(null);
              
              // Migrate old single keys to the new array
              let migratedKeys = parsedSettings.userApiKeys || [];
              if (migratedKeys.length === 0) {
                  if (parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userApiKey);
                  if (parsedSettings.userGeminiApiKey && parsedSettings.userGeminiApiKey !== parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userGeminiApiKey);
              }
              setUserApiKeys(migratedKeys);
              setAiProvider(parsedSettings.aiProvider || 'google');
              // Saved model IDs from older versions may no longer exist on the APIs
              setAiModel(AI_MODELS.some(m => m.id === parsedSettings.aiModel) ? parsedSettings.aiModel : 'gemini-3.5-flash');
              setRaigaPersona(parsedSettings.raigaPersona || 'santai');
              setRaigaCustomInstruction(parsedSettings.raigaCustomInstruction || '');
              setRaigaMemory(Array.isArray(parsedSettings.raigaMemory) ? parsedSettings.raigaMemory : []);
            }
            if (data.userAchievements) setUserAchievements(data.userAchievements);
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    ...(data.lastPhotoUpdate !== undefined && { lastPhotoUpdate: data.lastPhotoUpdate }),
                    ...(data.customCardBg !== undefined && { customCardBg: data.customCardBg }),
                    ...(data.customCardSettings !== undefined && { customCardSettings: data.customCardSettings }),
                    ...(data.uploadedPhotos !== undefined && { uploadedPhotos: data.uploadedPhotos }),
                    ...(data.uploadedBackgrounds !== undefined && { uploadedBackgrounds: data.uploadedBackgrounds }),
                    ...(data.cardBgUploads !== undefined && { cardBgUploads: data.cardBgUploads }),
                };
            });
            // Sync onboarding flag from Firebase to localStorage
            if (data.onboardingCompleted && user.uid) {
              localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
            }
          } catch (err) {
            console.error("Parse Error saat load data utama (MENCEGAH AUTO-SAVE UNTUK MENGHINDARI DATA HILANG):", err);
            setHasParseError(true);
          }

          isUpdatingFromServer.current = true;
          setIsDataLoaded(true);
          setTimeout(() => { isUpdatingFromServer.current = false; }, 3000); // diperpanjang untuk cegah race condition auto-save
        } else {
          // No Firebase data yet — only show questionnaire if not already completed
          const alreadyDone = user?.uid ? localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true' : false;
          if (!alreadyDone) {
            setIsFreshAccount(true);
          }
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
             // Seed baseline diff: tanggal yang datang dari server dianggap sudah tersimpan,
             // sehingga auto-save berikutnya hanya mengirim tanggal yang benar-benar berubah.
             const base = { ...(lastSavedHistoryJson.current || {}) };
             Object.keys(data).forEach(d => { base[d] = serializeDay(data[d]); });
             lastSavedHistoryJson.current = base;
             setHistory(prev => {
                const newState = { ...prev, ...data };
                return JSON.stringify(prev) === JSON.stringify(newState) ? prev : newState;
             });
             setTimeout(() => { isUpdatingFromServer.current = false; }, 3000); // diperpanjang dari 1500ms untuk cegah race condition auto-save
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
  }, [user?.uid]);

  // ==========================================
  // 3. SISTEM AUTO-SAVE KE CLOUD (DEBOUNCE)
  // Dipisah dua effect agar log latihan tidak ikut menulis ulang dokumen utama:
  //  - 3a: dokumen utama (programs, library, settings) — hanya saat bagian itu berubah
  //  - 3b: history — diff per tanggal, hanya tanggal yang berubah yang dikirim
  // ==========================================
  useEffect(() => {
    if (user && isDataLoaded && !isUpdatingFromServer.current && !hasParseError) {
      const timer = setTimeout(() => {
        if (isUpdatingFromServer.current) return; // double-check before firing
        // SAFETY: Jangan simpan ke Firestore jika programs masih sama dengan defaultPrograms —
        // ini indikasi data user belum selesai di-load dari server (race condition).
        // Biarkan onSnapshot selesai dulu, baru auto-save boleh jalan.
        if (JSON.stringify(programs) === JSON.stringify(defaultPrograms)) {
          console.warn('[Auto-save] Programs masih default — skip save, tunggu load Firestore selesai.');
          return;
        }
        const mainDocRef = doc(db, "users", user.uid);

        // Simpan Profil & Program ke Dokumen Utama
        setDoc(mainDocRef, {
          programs,
          exerciseLibrary,
          settings: { theme, language, soundEnabled, defaultRestTime, warmupVideos, cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard, unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, userProfile, userApiKeys, aiProvider, aiModel, raigaPersona, raigaCustomInstruction, raigaMemory },
          userAchievements,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.error("Auto-save Cloud gagal:", err));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [programs, exerciseLibrary, theme, language, soundEnabled, defaultRestTime, warmupVideos, cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard, unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, user, isDataLoaded, userAchievements, userProfile, userApiKeys, aiProvider, aiModel, raigaPersona, raigaCustomInstruction, raigaMemory]);

  // Baseline serialisasi per tanggal — merepresentasikan kondisi terakhir yang tersimpan di server.
  // Tanggal yang serialisasinya sama dengan baseline tidak perlu dikirim ulang.
  const lastSavedHistoryJson = useRef(null);

  useEffect(() => {
    if (user && isDataLoaded && !isUpdatingFromServer.current && !hasParseError) {
      const timer = setTimeout(() => {
        if (isUpdatingFromServer.current) return; // double-check before firing

        const baseline = lastSavedHistoryJson.current || {};
        const newBaseline = { ...baseline };
        const dirtyByYear = {};

        Object.keys(history).forEach(dateStr => {
           const json = serializeDay(history[dateStr]);
           if (baseline[dateStr] === json) return; // tidak berubah sejak save terakhir — skip

           const year = dateStr.substring(0, 4);
           if (!dirtyByYear[year]) dirtyByYear[year] = {};

           if (history[dateStr] && history[dateStr]._delete) {
               dirtyByYear[year][dateStr] = deleteField();
           } else if (history[dateStr] && typeof history[dateStr] === 'object') {
               // _activeSession adalah state sementara per-device — JANGAN sinkron ke cloud.
               // deleteField() sekaligus membersihkan salinan lama yang terlanjur tersimpan di server.
               const { _activeSession, ...dayData } = history[dateStr];
               dirtyByYear[year][dateStr] = { ...dayData, _activeSession: deleteField() };
           } else {
               dirtyByYear[year][dateStr] = history[dateStr];
           }
           newBaseline[dateStr] = json;
        });

        const dirtyYears = Object.keys(dirtyByYear);
        if (dirtyYears.length === 0) return; // tidak ada perubahan — jangan tulis apa pun

        lastSavedHistoryJson.current = newBaseline;
        for (const year of dirtyYears) {
           const yearRef = doc(db, "users", user.uid, "history_years", year);
           setDoc(yearRef, dirtyByYear[year], { merge: true }).catch(err => {
              console.error(`Auto-save History ${year} gagal:`, err);
              // Batalkan baseline tanggal yang gagal supaya dicoba lagi pada save berikutnya
              if (lastSavedHistoryJson.current) {
                 Object.keys(dirtyByYear[year]).forEach(d => { delete lastSavedHistoryJson.current[d]; });
              }
           });
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [history, user, isDataLoaded]);


  // --- CEK ACHIEVEMENTS ---
  const historyRef = useRef(history);
  useEffect(() => {
    // Only run if history actually changed (new completion)
    if (history !== historyRef.current && isDataLoaded) {
      const allDates = Object.keys(history).sort();
      let lastWorkout = null;
      if (allDates.length > 0) {
        const lastDay = history[allDates[allDates.length - 1]];
        if (lastDay && lastDay.workouts) {
          const completed = lastDay.workouts.filter(w => w.status === 'completed');
          if (completed.length > 0) lastWorkout = completed[completed.length - 1];
        }
      }
      const newBadges = checkAchievements(history, userAchievements, lastWorkout);
      if (newBadges.length > 0) {
        setUnlockedAchievementsPopup(prev => [...prev, ...newBadges]);
        setUserAchievements(prev => {
          const newSet = new Set([...prev, ...newBadges.map(b => b.id)]);
          return Array.from(newSet);
        });
      }
    }
    historyRef.current = history;
  }, [history, isDataLoaded, userAchievements]);

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
  // 3.6. PERSIST SESI AKTIF KE LOCALSTORAGE
  // _activeSession tidak lagi disinkron ke Firestore (state per-device).
  // localStorage menggantikannya agar sesi berjalan tetap pulih setelah reload/app restart.
  // ==========================================
  useEffect(() => {
    if (!user?.uid || !isDataLoaded) return;
    if (Object.keys(exerciseLogs).length === 0 && Object.keys(skippedExercises).length === 0 && extraExercises.length === 0) return;
    try {
      localStorage.setItem(`lyfit_active_session_${user.uid}`, JSON.stringify({
        date: selectedDate,
        savedAt: Date.now(),
        exerciseLogs, skippedExercises, extraExercises
      }));
    } catch { /* storage penuh/diblokir — abaikan, sesi tetap jalan di memori */ }
  }, [exerciseLogs, skippedExercises, extraExercises, selectedDate, user?.uid, isDataLoaded]);

  const activeSessionRestored = useRef(false);
  useEffect(() => { activeSessionRestored.current = false; }, [user?.uid]); // reset saat ganti akun
  useEffect(() => {
    if (!isDataLoaded || !user?.uid || activeSessionRestored.current) return;
    try {
      const raw = localStorage.getItem(`lyfit_active_session_${user.uid}`);
      if (!raw) { activeSessionRestored.current = true; return; }
      const saved = JSON.parse(raw);
      // Sesi lebih dari 24 jam dianggap basi
      if (!saved?.date || Date.now() - (saved.savedAt || 0) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`lyfit_active_session_${user.uid}`);
        activeSessionRestored.current = true;
        return;
      }
      // Tunggu sampai data hari tsb tersedia dari snapshot history (efek ini re-run tiap history berubah)
      const dayData = history[saved.date];
      if (!dayData || !dayData.workouts) return;
      activeSessionRestored.current = true;
      setHistory(prev => {
        const day = prev[saved.date];
        if (!day || !day.workouts) return prev;
        return {
          ...prev,
          [saved.date]: {
            ...day,
            _activeSession: {
              exerciseLogs: saved.exerciseLogs || {},
              skippedExercises: saved.skippedExercises || {},
              extraExercises: saved.extraExercises || []
            }
          }
        };
      });
    } catch {
      activeSessionRestored.current = true;
    }
  }, [isDataLoaded, user?.uid, history]);

  // ==========================================
  // 3.7. BACKFILL: BEKUKAN EXERCISE KE RIWAYAT LAMA
  // Sesi yang selesai sebelum fix ini belum punya overriddenExercises (snapshot beku),
  // sehingga breakdown per-exercise-nya bergantung pada definisi LIVE program (prog?.exercises).
  // Kalau rutinitasnya nanti diedit/dihapus, tampilan riwayat lama itu ikut rusak walau
  // data log mentahnya aman. Jalan sekali per akun: bekukan riwayat lama SELAGI rutinitas
  // aslinya masih ada, supaya nanti aman meski dihapus.
  // ==========================================
  const historyBackfillDone = useRef(false);
  useEffect(() => { historyBackfillDone.current = false; }, [user?.uid]); // reset saat ganti akun
  useEffect(() => {
    if (!isDataLoaded || historyBackfillDone.current) return;
    if (Object.keys(history).length === 0 || programs.length === 0) return;

    historyBackfillDone.current = true;
    setHistory(prev => {
      let changed = false;
      const next = { ...prev };
      Object.keys(prev).forEach(dateStr => {
        const day = prev[dateStr];
        if (!day || !day.workouts || day.workouts.length === 0) return;
        let dayChanged = false;
        const newWorkouts = day.workouts.map(w => {
          if (w.overriddenExercises?.length > 0 || w.programId === 'adhoc' || !w.programId || w.status !== 'completed') return w;
          const srcProg = programs.find(pr => pr.id === w.programId);
          if (!srcProg?.exercises?.length) return w;
          dayChanged = true;
          return { ...w, overriddenExercises: JSON.parse(JSON.stringify(srcProg.exercises)) };
        });
        if (dayChanged) {
          changed = true;
          next[dateStr] = { ...day, workouts: newWorkouts };
        }
      });
      return changed ? next : prev;
    });
  }, [isDataLoaded, history, programs]);

  // ==========================================
  // 4. PENAHAN TOMBOL BACK (UNIVERSAL)
  // ==========================================
  useEffect(() => {
    // Selalu push state agar kita punya "jaring" untuk menangkap tombol back
    window.history.pushState({ lyfit: true }, '');

    const handlePopState = () => {
      const activeModals = Array.from(document.querySelectorAll('.fixed.inset-0:not(.pointer-events-none)')).filter(el => window.getComputedStyle(el).display !== 'none');
      if (activeModals.length > 0) {
        const topModal = activeModals[activeModals.length - 1];
        const designatedCloseBtn = topModal.querySelector('[data-close-modal="true"]');
        if (designatedCloseBtn) designatedCloseBtn.click();
        else {
          const closeBtn = Array.from(topModal.querySelectorAll('button')).find(b => ['batal', 'tutup'].includes((b.textContent||'').trim().toLowerCase()));
          if (closeBtn) closeBtn.click();
          else {
            const xIcon = topModal.querySelector('svg.lucide-x');
            if (xIcon && xIcon.closest('button')) xIcon.closest('button').click();
            else topModal.click();
          }
        }
        window.history.pushState({ lyfit: true }, '');
        return;
      }

      // Prioritas 1: Tutup modal/dialog yang terbuka
      if (globalDetailExercise) { setGlobalDetailExercise(null); window.history.pushState({ lyfit: true }, ''); return; }
      if (showProfileModal) { setShowProfileModal(false); window.history.pushState({ lyfit: true }, ''); return; }
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
  }, [globalDetailExercise, showProfileModal, showSettings, showHelp, confirmModal.isOpen, activeAddModalTarget, activeTab]);

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

  const MAX_UNDO_STEPS = 20; // Batasi kedalaman undo: tiap langkah menyimpan deep-copy seluruh history+programs (berat di RAM)

  const saveStateToHistory = () => {
     setUndoStack(prev => [...prev.slice(-(MAX_UNDO_STEPS - 1)), { history: JSON.parse(JSON.stringify(history)), programs: JSON.parse(JSON.stringify(programs)) }]);
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
      a.href = url; a.download = `LOGYM_Backup_${getLocalYMD(new Date())}.json`;
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
      setActiveAddModalTarget(null);
      setShowProfileModal(false);
      setShowSettings(false);
      setUserApiKeys([]);
      setAiProvider('google');
      setAiModel('gemini-3.5-flash');
      await signOut(auth);
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  // Hapus semua jejak data user di Firestore (dokumen utama, history per tahun, dan data komunitas).
  // Catatan: solusi jangka panjang yang lebih kuat adalah Cloud Function onUserDeleted dengan Admin SDK.
  const deleteAllUserData = async (uid) => {
    const refsToDelete = [];

    const safeGetDocs = async (q) => {
      try { return (await getDocs(q)).docs; } catch { return []; }
    };

    // Subkoleksi history per tahun
    refsToDelete.push(...(await safeGetDocs(collection(db, 'users', uid, 'history_years'))).map(d => d.ref));
    // Postingan komunitas milik user
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'community_posts'), where('userId', '==', uid)))).map(d => d.ref));
    // Notifikasi untuk user
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'notifications'), where('toUserId', '==', uid)))).map(d => d.ref));
    // Relasi follow & block dua arah
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'follows'), where('followerId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'follows'), where('followingId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'blocks'), where('blockerId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'blocks'), where('blockedId', '==', uid)))).map(d => d.ref));
    // Profil komunitas, dokumen utama, dan dokumen legacy 'userData'
    refsToDelete.push(doc(db, 'community_users', uid));
    refsToDelete.push(doc(db, 'users', uid));
    refsToDelete.push(doc(db, 'userData', uid));

    // WriteBatch maksimal 500 operasi — pecah per 450
    for (let i = 0; i < refsToDelete.length; i += 450) {
      const batch = writeBatch(db);
      refsToDelete.slice(i, i + 450).forEach(r => batch.delete(r));
      await batch.commit();
    }
  };

  const handleDeleteAccount = async () => {
    playSoundEffect('click', soundEnabled);
    if (!user) return;
    try {
      // 1. Delete user data from firestore (dokumen utama + history + data komunitas)
      await deleteAllUserData(user.uid);

      // 2. Delete user from auth
      await deleteUser(auth.currentUser);

      // 3. Clear local storage
      localStorage.clear();

      // 4. Reset UI state & refresh
      setActiveAddModalTarget(null);
      setShowProfileModal(false);
      setShowSettings(false);
      window.location.reload();
    } catch (error) {
      console.error("Gagal menghapus akun:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("Demi keamanan, sistem mewajibkan Anda untuk logout dan login ulang sebelum menghapus akun ini.");
      } else {
        alert("Terjadi kesalahan saat menghapus akun: " + error.message);
      }
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
    // App shell background — ambient blue glow over near-black / soft blue-white
    bgApp: theme === 'dark' ? 'app-bg-dark' : 'app-bg-light',
    // Primary glass surface used by every card across every tab
    bgCard: theme === 'dark' ? 'bg-white/[0.045] glass-card' : 'bg-white/60 glass-card',
    // Secondary/sunken glass surface (nested panels, expanded chart trays, etc.)
    bgCardSoft: theme === 'dark' ? 'bg-white/[0.02] glass-card' : 'bg-black/[0.02] glass-card',
    bgSunken: theme === 'dark' ? 'bg-black/25' : 'bg-black/5',
    textMain: theme === 'dark' ? 'text-slate-100' : 'text-slate-900',
    textMuted: theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    border: theme === 'dark' ? 'border-white/10' : 'border-black/10',
    textAccent: theme === 'dark' ? 'text-sky-400' : 'text-[#3b82f6]',
    bgAccent: 'bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white',
    bgAccentSoft: theme === 'dark' ? 'bg-[#3b82f6]/15' : 'bg-[#3b82f6]/10',
    borderAccent: theme === 'dark' ? 'border-sky-400' : 'border-[#3b82f6]',
    borderAccentSoft: theme === 'dark' ? 'border-sky-400/30' : 'border-[#3b82f6]/30',
    ringAccent: theme === 'dark' ? 'ring-sky-400' : 'ring-[#3b82f6]',
    shadowAccent: theme === 'dark' ? 'shadow-sky-500/30' : 'shadow-[#3b82f6]/30',
    gradientText: theme === 'dark' ? 'from-sky-300 to-[#3b82f6]' : 'from-[#3b82f6] to-[#1d4ed8]',
    gradientBg: 'from-[#3b82f6] to-[#1d4ed8]',
    inputBg: theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]',
    btnBg: theme === 'dark' ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/5 hover:bg-black/10',
    navBg: theme === 'dark' ? 'bg-white/[0.04] glass-nav' : 'bg-white/70 glass-nav',
    navIconActive: theme === 'dark' ? 'text-sky-400' : 'text-[#3b82f6]',
    navIconInactive: theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
    placeholderAccent: theme === 'dark' ? 'placeholder-sky-400/40' : 'placeholder-[#3b82f6]/40',
    borderDashed: theme === 'dark' ? 'border-white/10' : 'border-black/10',
    bgBox: theme === 'dark' ? 'bg-black/20' : 'bg-[#3b82f6]/10',
    glow: theme === 'dark' ? 'shadow-[0_8px_32px_-10px_rgba(59,130,246,0.35)]' : 'shadow-[0_8px_32px_-14px_rgba(59,130,246,0.25)]'
  };

  const navigateToWorkoutDate = (dateStr, progId) => {
    playSoundEffect('click', soundEnabled); setSelectedDate(dateStr);
    if(progId) {
       setActiveProgramId(progId);
       setFocusWorkoutId(progId === 'adhoc' ? 'extra' : progId);
       setSessionToRun(progId === 'adhoc' ? 'extra' : progId);
    }
    setResumeDurationSecs(0);
    setActiveTab('workout'); setIsEditingMode(false); 
  };

  const getDayHistory = (dateStr) => {
    const val = history[dateStr]; if (!val) return null;
    if (typeof val === 'string') { const p = programs.find(prog => prog.name === val); return { programId: p?.id, programName: val, status: 'completed', log: {} }; }
    if (val.programId && !val.programName) { const p = programs.find(prog => prog.id === val.programId); return { ...val, programName: p ? p.name : 'Unknown' }; }
    return val;
  };

  useEffect(() => {
    if (!isDataLoaded) return;
    
    // GUARD: Mencegah circular dependency (flickering).
    // Jangan overwrite exerciseLogs jika kita hanya merespon autosave buatan sendiri.
    // Tetap load jika tanggal berubah (loadedDate !== selectedDate) atau server memberi data baru.
    if (loadedDate === selectedDate) return;

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

  const getSetLogs = (ex, idToCheck) => {
    if (exerciseLogs[idToCheck]) return exerciseLogs[idToCheck];
    
    const libMatch = exerciseLibrary.find(e => e.id === ex?.id || e.name?.toLowerCase() === ex?.name?.toLowerCase());
    const suggestedWeight = libMatch?.lastWeight || libMatch?.rm10 || ex?.defaultWeight || 0;
    
    return Array.from({length: ex?.sets || 3}).map(() => ({ 
      w: suggestedWeight, 
      r: ex?.reps || 10, 
      d: ex?.duration || 10, 
      done: false 
    }));
  };

  const getBaseEx = (exId) => {
    const baseIdNum = typeof exId === 'string' && exId.includes('-') ? Number(exId.split('-')[0]) : exId;
    const baseIdStr = typeof exId === 'string' && exId.includes('-') ? exId.split('-')[0] : exId;
    
    // 1. Cari di history hari ini (overriddenExercises atau exercises)
    const todayData = history[selectedDate];
    if (todayData && todayData.workouts) {
       for (const w of todayData.workouts) {
          const found = (w.overriddenExercises || w.exercises || []).find(e => e?.id === exId || e?.originalId === baseIdStr || e?.originalId === baseIdNum);
          if (found) return found;
       }
    }

    // 2. Cari di programs & extraExercises
    return [...programs.map(p => p.exercises || []).flat(), ...extraExercises].find(e => e?.id === exId || e?.id === baseIdNum || e?.id === baseIdStr);
  };

  const handleSetChange = (exId, setIdx, field, val) => {
    setExerciseLogs(prev => {
      const ex = getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : getSetLogs(ex, exId);
      
      const finalVal = (field === 'notes') ? val : Number(val);
      currentLogs[setIdx] = { ...currentLogs[setIdx], [field]: finalVal };

      // AUTO-COPY: Salin nilai ke set-set berikutnya yang belum "done"
      if (['w', 'r', 'd'].includes(field)) {
        if (currentLogs[setIdx].type !== 'warmup') {
          for (let i = setIdx + 1; i < currentLogs.length; i++) {
            if (!currentLogs[i].done && currentLogs[i].type !== 'warmup') {
              currentLogs[i] = { ...currentLogs[i], [field]: finalVal };
            }
          }
        }
      }

      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleToggleSet = (exId, setIdx, siblingIds = null) => {
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
      
      let isSupersetComplete = true;
      const isSuperset = siblingIds && siblingIds.length > 1;
      
      if (isSuperset) {
        for (const sId of siblingIds) {
          if (sId === exId) {
            if (!isDoneNow) { isSupersetComplete = false; break; }
            continue;
          }
          const siblingLogs = prev[sId] || getSetLogs(getBaseEx(sId), sId);
          if (!siblingLogs[setIdx] || !siblingLogs[setIdx].done) {
            isSupersetComplete = false;
            break;
          }
        }
      }

      if (isDoneNow && !currentLogs[setIdx].skipped) {
        // --- UPDATE LAST WEIGHT ONLY ---
        const weight = Number(currentLogs[setIdx].w) || 0;
        if (ex && weight > 0 && (!ex.type || ex.type === 'weight' || ex.type === 'reps')) {
           setExerciseLibrary(lib => {
              const existingIdx = lib.findIndex(e => e.name?.toLowerCase() === ex.name?.toLowerCase() || e.id === ex.id);
              if (existingIdx >= 0 && lib[existingIdx].lastWeight !== weight) {
                  const newLib = [...lib];
                  newLib[existingIdx] = { ...newLib[existingIdx], lastWeight: weight };
                  return newLib;
              }
              return lib;
           });
        }
        // --- END UPDATE LAST WEIGHT ---

        if (!isSuperset || isSupersetComplete) {
          setRestTimer(programRestTime); // Legacy fallback
          setRestTargetTime(Date.now() + (programRestTime * 1000));
          if (!isWorkoutActive) {
            setSessionSnapshot({ exerciseLogs: JSON.parse(JSON.stringify(exerciseLogs)), skippedExercises: JSON.parse(JSON.stringify(skippedExercises)), extraExercises: JSON.parse(JSON.stringify(extraExercises)) });
            setIsWorkoutActive(true);
            setWorkoutStartTime(Date.now() - (resumeDurationSecs * 1000));
            setResumeDurationSecs(0);
          }
        } else if (isSuperset) {
          setShowSupersetToast(true);
          setTimeout(() => setShowSupersetToast(false), 3000);
          if (!isWorkoutActive) {
            setSessionSnapshot({ exerciseLogs: JSON.parse(JSON.stringify(exerciseLogs)), skippedExercises: JSON.parse(JSON.stringify(skippedExercises)), extraExercises: JSON.parse(JSON.stringify(extraExercises)) });
            setIsWorkoutActive(true);
            setWorkoutStartTime(Date.now() - (resumeDurationSecs * 1000));
            setResumeDurationSecs(0);
          }
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

  const handleAddSet = (exIds) => {
    playSoundEffect('click', soundEnabled);
    const ids = Array.isArray(exIds) ? exIds : [exIds];
    setExerciseLogs(prev => {
      let newPrev = { ...prev };
      ids.forEach(id => {
        const ex = getBaseEx(id);
        if (!ex) return;
        const currentLogs = newPrev[id] ? [...newPrev[id]] : getSetLogs(ex, id);
        const lastSet = currentLogs[currentLogs.length - 1] || { w: ex.defaultWeight || 0, r: ex.reps || 10, d: ex.duration || 10 };
        currentLogs.push({ w: lastSet.w, r: lastSet.r, d: lastSet.d, done: false });
        newPrev[id] = currentLogs;
      });
      return newPrev;
    });
    setLastActionTime(Date.now()); // Trigger Autosave
  };

  const handleAddWarmupSets = (exIds) => {
    playSoundEffect('click', soundEnabled);
    const ids = Array.isArray(exIds) ? exIds : [exIds];
    setExerciseLogs(prev => {
      let newPrev = { ...prev };
      ids.forEach(id => {
        const ex = getBaseEx(id);
        if (!ex) return;
        const currentLogs = newPrev[id] ? [...newPrev[id]] : getSetLogs(ex, id);
        
        const firstWorkingSet = currentLogs.find(s => s.type !== 'warmup') || currentLogs[0] || { w: ex.defaultWeight || 20 };
        const targetW = Number(firstWorkingSet?.w) || 20;
        
        const warmupSets = [
          { w: Math.round(targetW * 0.5), r: 8, d: 0, type: 'warmup', notes: 'Warm-up 50%', done: false },
          { w: Math.round(targetW * 0.75), r: 4, d: 0, type: 'warmup', notes: 'Warm-up 75%', done: false }
        ];
        
        newPrev[id] = [...warmupSets, ...currentLogs];
      });
      return newPrev;
    });
    setLastActionTime(Date.now());
  };

  const handleRemoveSet = (exIds, setIdx) => {
    playSoundEffect('click', soundEnabled);
    const ids = Array.isArray(exIds) ? exIds : [exIds];
    setExerciseLogs(prev => {
      let newPrev = { ...prev };
      ids.forEach(id => {
        const ex = getBaseEx(id);
        if (!ex) return;
        const currentLogs = newPrev[id] ? [...newPrev[id]] : getSetLogs(ex, id);
        currentLogs.splice(setIdx, 1);
        newPrev[id] = currentLogs;
      });
      return newPrev;
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
        confirmText: 'Ya, Batalkan',
        onConfirm: () => {
            playSoundEffect('click', soundEnabled);
            setIsImmersiveMode(false);
            setIsWorkoutActive(false);
            setWorkoutStartTime(null);
            setRestTargetTime(null);
            setRestTimer(0);
              const targetDateStr = selectedDate;
            
            let restoredLogs = {};
            let restoredSkipped = {};
            let restoredExtra = [];
            
            if (sessionSnapshot) {
               restoredLogs = sessionSnapshot.exerciseLogs;
               restoredSkipped = sessionSnapshot.skippedExercises;
               restoredExtra = sessionSnapshot.extraExercises;
            }
            
            setHistory(prev => {
              const prevDayData = prev[targetDateStr] || {};
              return {
                 ...prev,
                 [targetDateStr]: {
                    ...prevDayData,
                    _activeSession: {
                       exerciseLogs: restoredLogs,
                       skippedExercises: restoredSkipped,
                       extraExercises: restoredExtra
                    }
                 }
              }
            });
            setExerciseLogs(restoredLogs);
            setSkippedExercises(restoredSkipped);
            setExtraExercises(restoredExtra);
            setSessionSnapshot(null);          
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
    // setExerciseLogs({});
    // setSkippedExercises({});
    setExtraExercises([]);
    setSessionSnapshot(null);

    const targetDateStr = selectedDate;

    const cleanLogs = {};
    if (exerciseLogs) {
      Object.keys(exerciseLogs).forEach(id => {
        if (Array.isArray(exerciseLogs[id])) {
          cleanLogs[id] = exerciseLogs[id].filter(s => s.type !== 'warmup');
        } else {
          cleanLogs[id] = exerciseLogs[id];
        }
      });
    }

    setHistory(prev => {
      const h = { ...prev };
      const dayData = h[targetDateStr] || { workouts: [] };
      let workouts = [...(dayData.workouts || [])];
      
      if (progId === 'extra') {
        const adhocIdx = workouts.findIndex(w => w.programId === 'adhoc' && w.status !== 'completed');
        if (adhocIdx >= 0) {
          const existingW = workouts[adhocIdx];
          workouts[adhocIdx] = {
            ...existingW,
            status: 'completed',
            log: cleanLogs,
            exercises: extraExercises,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: formatDur(durationSecs)
          };
        } else {
          // Check if there's an already completed adhoc session being edited (focusWorkoutId)
          const completedAdhocIdx = workouts.findIndex(w => w.id === focusWorkoutId && w.programId === 'adhoc');
          if (completedAdhocIdx >= 0) {
              const existingW = workouts[completedAdhocIdx];
              let existingSecs = 0;
              if (existingW.duration) {
                if (typeof existingW.duration === 'number') existingSecs = existingW.duration * 60;
                else if (typeof existingW.duration === 'string') {
                  const parts = existingW.duration.split(':').map(Number);
                  if (parts.length === 3) existingSecs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                  else if (parts.length === 2) existingSecs = (parts[0] || 0) * 60 + (parts[1] || 0);
                }
              }
              const finalSecs = Math.max(durationSecs, existingSecs);
              workouts[completedAdhocIdx] = {
                ...existingW,
                status: 'completed',
                log: cleanLogs,
                exercises: extraExercises,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: formatDur(finalSecs)
              };
          } else {
              workouts.push({
                id: `adhoc_${Date.now()}`,
                programId: 'adhoc',
                programName: 'Ekstra',
                status: 'completed',
                log: cleanLogs,
                exercises: extraExercises,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: formatDur(durationSecs)
              });
          }
        }
      } else {
        // Untuk program biasa
        let isTargetFound = false;
        workouts = workouts.map(w => {
          const isTargetWorkout = focusWorkoutId 
            ? (w.id === focusWorkoutId) 
            : (progId ? (w.id === progId || w.programId === progId) : w.status === 'planned');
            
          if (isTargetWorkout) {
            isTargetFound = true;
            let realProgramId = w.programId;
            if (realProgramId && realProgramId.startsWith('projected_')) {
                realProgramId = realProgramId.replace('projected_', '').split('_')[0];
            }

            // Bekukan daftar exercise yang benar-benar dikerjakan ke dalam riwayat ini.
            // Tanpa ini, breakdown per-exercise selalu mengambil definisi LIVE dari programs
            // (via prog?.exercises) — begitu rutinitasnya diedit/dihapus, riwayat lama ikut rusak
            // tampilannya walau data log mentahnya masih ada.
            let frozenExercises = w.overriddenExercises;
            if (!frozenExercises || frozenExercises.length === 0) {
              const srcProg = programs.find(pr => pr.id === realProgramId);
              if (srcProg?.exercises?.length > 0) frozenExercises = JSON.parse(JSON.stringify(srcProg.exercises));
            }

            // Proteksi agar durasi tidak kereset, bisanya cuma nambah
            let existingSecs = 0;
            if (w.duration) {
              if (typeof w.duration === 'number') {
                existingSecs = w.duration * 60;
              } else if (typeof w.duration === 'string') {
                const parts = w.duration.split(':').map(Number);
                if (parts.length === 3) {
                  existingSecs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                } else if (parts.length === 2) {
                  existingSecs = (parts[0] || 0) * 60 + (parts[1] || 0);
                }
              }
            }
            const finalSecs = Math.max(durationSecs, existingSecs);

            return {
              ...w,
              programId: realProgramId,
              status: 'completed',
              log: cleanLogs,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: formatDur(finalSecs),
              ...(frozenExercises ? { overriddenExercises: frozenExercises } : {})
            };
          }
          return w;
        });

        if (!isTargetFound) {
            let pName = 'Sesi Latihan';
            let pId = progId;
            if (focusWorkoutId && focusWorkoutId.startsWith('projected_')) {
                pId = focusWorkoutId.replace('projected_','').split('_')[0];
            } else if (progId && progId.startsWith('projected_')) {
                pId = progId.replace('projected_','').split('_')[0];
            }
            const p = programs.find(pr => pr.id === pId || pr.id === progId);
            if (p) {
               pName = p.name;
               pId = p.id;
            }
            workouts.push({
               id: focusWorkoutId || progId || `completed_${Date.now()}`,
               programId: pId,
               programName: pName,
               status: 'completed',
               log: cleanLogs,
               timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
               duration: durationSecs > 0 ? formatDur(durationSecs) : '00:00',
               // Bekukan exercise saat ini juga, supaya riwayat tetap utuh walau rutinitas diedit/dihapus nanti
               ...(p?.exercises?.length > 0 ? { overriddenExercises: JSON.parse(JSON.stringify(p.exercises)) } : {})
            });
        }
      }
      
      h[targetDateStr] = { ...dayData, workouts, _activeSession: progId === 'extra' ? { ...(dayData._activeSession || {}), extraExercises: [] } : dayData._activeSession };
      
      // Update Exercise Library dengan True 10RM dari seluruh riwayat
      setExerciseLibrary(lib => {
        let newLib = [...lib];
        let libChanged = false;
        Object.keys(cleanLogs).forEach(exId => {
           let true10RM = 0;
           let lastWeight = 0;
           Object.values(h).forEach(day => {
             if (day.workouts) {
               day.workouts.forEach(wk => {
                 if (wk.status === 'completed' && wk.log && wk.log[exId]) {
                   wk.log[exId].forEach(s => {
                     if (!s.skipped && s.type !== 'warmup' && s.w > 0 && s.r > 0) {
                       const c1RM = Number(s.w) * (1 + Number(s.r) / 30);
                       const c10RM = c1RM / 1.3333;
                       if (c10RM > true10RM) true10RM = c10RM;
                       lastWeight = s.w;
                     }
                   });
                 }
               });
             }
           });
           
           if (true10RM > 0) {
              const existingIdx = newLib.findIndex(e => String(e.id) === String(exId));
              if (existingIdx >= 0) {
                 const rounded10RM = Math.round(true10RM * 10) / 10;
                 if (newLib[existingIdx].rm10 !== rounded10RM || newLib[existingIdx].lastWeight !== lastWeight) {
                   newLib[existingIdx] = { ...newLib[existingIdx], rm10: rounded10RM, lastWeight };
                   libChanged = true;
                 }
              }
           }
        });
        return libChanged ? newLib : lib;
      });

      return h;
    });

    setActiveTab('calendar');
  };

  const handleEditPastWorkout = (dateStr, w) => {
    playSoundEffect('click', soundEnabled);
    setSelectedDate(dateStr);
    setActiveProgramId(w.programId);
    setFocusWorkoutId(w.programId === 'adhoc' ? 'extra' : w.id);
    // Tanpa ini, FloatingTimer tidak tahu sesi mana yang harus dibuka saat diklik
    // (klik jadi tidak bereaksi) karena ia membaca sessionToRun, bukan focusWorkoutId.
    setSessionToRun(w.programId === 'adhoc' ? 'extra' : w.id);

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
    let logsToLoad = {};
    let skippedToLoad = {};
    let extraToLoad = [];
    
    const dayData = history[dateStr] || {};
    if (w.log && Object.keys(w.log).length > 0) {
      logsToLoad = w.log;
    } else {
      if (dayData && dayData._activeSession && dayData._activeSession.exerciseLogs && Object.keys(dayData._activeSession.exerciseLogs).length > 0) {
        logsToLoad = dayData._activeSession.exerciseLogs;
      } else {
        // Fallback
        if (dayData && dayData.workouts) {
          dayData.workouts.forEach(work => {
            if (work.log) logsToLoad = { ...logsToLoad, ...work.log };
          });
        }
      }
    }
    
    if (w.programId === 'adhoc' && w.exercises && w.exercises.length > 0) {
      extraToLoad = w.exercises;
    } else if (dayData && dayData._activeSession && dayData._activeSession.extraExercises) {
      extraToLoad = dayData._activeSession.extraExercises;
    }

    if (w.skipped && Object.keys(w.skipped).length > 0) {
      skippedToLoad = w.skipped;
    } else if (dayData && dayData._activeSession && dayData._activeSession.skippedExercises) {
      skippedToLoad = dayData._activeSession.skippedExercises;
    }
    
    setExerciseLogs(logsToLoad);
    setSkippedExercises(skippedToLoad);
    setExtraExercises(extraToLoad);
    
    setSessionSnapshot({
        exerciseLogs: JSON.parse(JSON.stringify(logsToLoad)),
        skippedExercises: JSON.parse(JSON.stringify(skippedToLoad)),
        extraExercises: JSON.parse(JSON.stringify(extraToLoad))
    });

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
      setPrograms(prev => prev.map(p => p.id === progId ? { ...p, exercises: [...p.exercises, { ...ex, id: crypto.randomUUID(), sets: defaultSets, reps: defaultReps, duration: defaultDuration }] } : p));
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
             exercises: p.exercises.map(e => e.id === exToReplaceId ? { ...ex, id: crypto.randomUUID(), sets: e.sets || defaultSets, reps: e.reps || defaultReps, duration: e.duration || defaultDuration } : e)
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


  // --- GLOBAL SWIPE HANDLER ---
  const globalTouchStartX = useRef(null);
  const globalTouchStartY = useRef(null);

  const handleGlobalTouchStart = (e) => {
    // Ignore swipes on range sliders, dialogs, or explicit no-swipe elements
    if (e.target.closest('input[type="range"]') || e.target.closest('[role="dialog"]') || e.target.closest('.no-swipe')) return;
    globalTouchStartX.current = e.touches[0].clientX;
    globalTouchStartY.current = e.touches[0].clientY;
  };

  const handleGlobalTouchEnd = (e) => {
    if (globalTouchStartX.current === null || globalTouchStartY.current === null) return;
    if (e.target.closest('input[type="range"]') || e.target.closest('[role="dialog"]') || e.target.closest('.no-swipe')) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const distanceX = globalTouchStartX.current - touchEndX;
    const distanceY = globalTouchStartY.current - touchEndY;
    
    globalTouchStartX.current = null;
    globalTouchStartY.current = null;

    // Trigger swipe if horizontal distance > 60px and mostly horizontal
    if (Math.abs(distanceX) > 60 && Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      const tabs = ['dashboard', 'workout', 'calendar', 'program', 'database'];
      const currentIndex = tabs.indexOf(activeTab);
      
      if (distanceX > 0) {
        // Swipe Left -> Next Tab
        if (currentIndex < tabs.length - 1) {
          playSoundEffect('click', soundEnabled);
          setActiveTab(tabs[currentIndex + 1]);
        }
      } else {
        // Swipe Right -> Prev Tab
        if (currentIndex > 0) {
          playSoundEffect('click', soundEnabled);
          setActiveTab(tabs[currentIndex - 1]);
        }
      }
    }
  };

  // ==========================================
  // RENDER PENGHALANG SAAT LOADING / CEK AUTH
  // ==========================================
  if (isAuthChecking || (user && !isDataLoaded) || !isSplashMinTimeReached) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f1115]' : 'bg-white'}`}>
         <img src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} alt="LOGYM Logo" className="w-40 h-40 object-contain animate-pulse drop-shadow-2xl" />
      </div>
    );
  }

  // JIKA USER BELUM LOGIN
  if (!user) {
    return <AuthPage t={t} theme={theme} soundEnabled={soundEnabled} onLogin={setUser} />;
  }

  // JIKA USER SUDAH LOGIN
  return (
    <div 
      className={`min-h-screen flex flex-col ${t.bgApp} ${t.textMain} font-sans ${activeTab === 'calendar' ? 'h-[100dvh] overflow-hidden' : 'pb-32'} transition-colors duration-300`}
      onTouchStart={handleGlobalTouchStart}
      onTouchEnd={handleGlobalTouchEnd}
    >
      <ConfirmModal confirmModal={confirmModal} setConfirmModal={setConfirmModal} t={t} lang={lang} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} />
      <AddExerciseModal t={t} lang={lang} activeAddModalTarget={activeAddModalTarget} setActiveAddModalTarget={setActiveAddModalTarget} exerciseLibrary={exerciseLibrary} onAddExerciseTarget={addExerciseTarget} setActiveTab={setActiveTab} />
      <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} t={t} lang={lang} />
      {globalDetailExercise && (
        <ExerciseDetailModal 
          ex={globalDetailExercise} 
          onClose={() => setGlobalDetailExercise(null)} 
          t={t} lang={lang} soundEnabled={soundEnabled} 
          fullHistory={history}
          units={units}
          exerciseLibrary={exerciseLibrary}
          setExerciseLibrary={setExerciseLibrary}
          programs={programs}
        />
      )}
      
      {(showQuestionnaire || questionnaireOpened.current) && (
      <React.Suspense fallback={null}>
      <ProgramQuestionnaireModal
         isOpen={showQuestionnaire}
         user={user}
         onClose={() => {
           setShowQuestionnaire(false);
           if (user?.uid) {
             localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
           }
           // Persist to Firebase so it syncs across all devices
           if (user?.uid) {
             setDoc(doc(db, 'users', user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => {});
           }
         }}
         onComplete={handleApplyRecommendedPlan}
         t={t}
         lang={lang}
         soundEnabled={soundEnabled}
         gymProfiles={gymProfiles}
         setGymProfiles={setGymProfiles}
         activeGymId={activeGymId}
         setActiveGymId={setActiveGymId}
         exerciseLibrary={exerciseLibrary}
         units={units}
         userApiKeys={userApiKeys}
         aiProvider={aiProvider}
         keyStatuses={keyStatuses}
         setKeyStatuses={setKeyStatuses}
         setAiProvider={setAiProvider}
         setAiModel={setAiModel}
         aiModel={aiModel}
         setShowSettings={setShowSettings}
      />
      </React.Suspense>
      )}

      {(showProfileModal || profileModalOpened.current) && (
      <React.Suspense fallback={null}>
        <ProfileModal
           showProfileModal={showProfileModal} setShowProfileModal={setShowProfileModal} 
           user={user} setUser={setUser} t={t} theme={theme} handleLogout={handleLogout} history={history}
           activityTargets={activityTargets} programs={programs} setPrograms={setPrograms} exerciseLibrary={exerciseLibrary}
           lang={lang} language={language} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} selectedDate={selectedDate} units={units} activePlanIds={activePlanIds}
           userAchievements={userAchievements} userProfile={userProfile} setUserProfile={setUserProfile}
           highlightPostId={highlightPostId}
           onClearHighlight={() => setHighlightPostId(null)}
           forceTab={profileForceTab}
           onAchievementShareComplete={(postId) => {
             // Highlight the newly shared post in the community feed
             if (postId) setHighlightPostId(postId);
           }}
        />
      </React.Suspense>
      )}

        <SettingsModal
           showSettings={showSettings} setShowSettings={setShowSettings} t={t} lang={lang} 
           theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} 
           soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
           userApiKeys={userApiKeys} setUserApiKeys={setUserApiKeys}
           aiProvider={aiProvider} setAiProvider={setAiProvider}
           aiModel={aiModel} setAiModel={setAiModel}
           keyStatuses={keyStatuses}
           raigaPersona={raigaPersona} setRaigaPersona={setRaigaPersona}
           raigaCustomInstruction={raigaCustomInstruction} setRaigaCustomInstruction={setRaigaCustomInstruction}
           raigaMemory={raigaMemory} setRaigaMemory={setRaigaMemory}
         defaultRestTime={defaultRestTime} setDefaultRestTime={setDefaultRestTime}
         weekStartDay={weekStartDay} setWeekStartDay={setWeekStartDay}
         defaultReminderTime={defaultReminderTime} setDefaultReminderTime={setDefaultReminderTime}
         reminderEnabled={reminderEnabled} setReminderEnabled={setReminderEnabled}
         biometricStandard={biometricStandard} setBiometricStandard={setBiometricStandard}
         units={units} setUnits={setUnits}
         undoStack={undoStack} redoStack={redoStack} handleUndo={handleUndo} handleRedo={handleRedo}
         setShowHelp={setShowHelp}
         exportData={exportData} handleImportFile={handleImportFile}
         user={user} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount}
         setConfirmModal={setConfirmModal}
         connectedApps={connectedApps} setConnectedApps={setConnectedApps}
      />

      <Header 
        setConfirmModal={setConfirmModal} t={t} theme={theme} user={user} 
        showSettings={showSettings} setShowSettings={setShowSettings} 
        setShowProfileModal={setShowProfileModal} 
        soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        isOffline={isOffline}
        onNotifClick={(notif) => {
          if (notif.postId) {
            setHighlightPostId(notif.postId);
            setShowProfileModal(true);
          }
          // follow notifications have no postId — just close panel (handled by NotificationPanel)
        }}
      />
      
      <main className={`${activeTab === 'calendar' ? 'p-0 flex-1 flex flex-col min-h-0 overflow-hidden' : activeTab === 'database' ? 'px-4 pb-4 pt-0 min-h-[70vh] max-w-5xl mx-auto w-full' : 'p-4 min-h-[70vh] max-w-5xl mx-auto w-full'}`}>
         {activeTab === 'dashboard' && (
             <DashboardTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} language={language} user={user} 
               history={history} setHistory={setHistory} 
               programs={programs} exerciseLibrary={exerciseLibrary} 
               navigateToWorkoutDate={navigateToWorkoutDate}
               soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
               theme={theme} selectedDate={selectedDate}
               biometricStandard={biometricStandard} units={units}
               activityTargets={activityTargets} setActivityTargets={setActivityTargets}
               gymProfiles={gymProfiles} activeGymId={activeGymId}
               activePlanIds={activePlanIds}
               userApiKeys={userApiKeys} aiProvider={aiProvider} aiModel={aiModel}
               keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses}
               setAiProvider={setAiProvider} setAiModel={setAiModel}
               setShowSettings={setShowSettings}
               userAchievements={userAchievements} connectedApps={connectedApps}
               userProfile={userProfile}
             />
         )}
         
         {activeTab === 'workout' && (
             <WorkoutTab 
              t={t} lang={lang} language={language} programs={programs} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              history={history} setHistory={setHistory} setActiveTab={setActiveTab}
              units={units} userProfile={userProfile}
              activeProgramId={activeProgramId} setActiveProgramId={setActiveProgramId} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
               warmupVideos={warmupVideos} cooldownVideos={cooldownVideos} onOpenDetail={setGlobalDetailExercise}
               exerciseLibrary={exerciseLibrary} setExerciseLibrary={setExerciseLibrary}
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} extraExercises={extraExercises}
               onSetChange={handleSetChange} onToggleSet={handleToggleSet} onSkipSet={handleSkipSet} onAddSet={handleAddSet} onAddWarmupSets={handleAddWarmupSets} onRemoveSet={handleRemoveSet}
               onToggleSkip={handleToggleSkip} onRemoveExtra={handleRemoveExtraEx}
               isCurrentlyCompleted={isCurrentlyCompleted} onSaveWorkout={handleSaveWorkout} onCancelWorkout={handleCancelWorkout}
               gymProfiles={gymProfiles} activeGymId={activeGymId}
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
               showSupersetToast={showSupersetToast}
               
               // Focus
               focusWorkoutId={focusWorkoutId} setFocusWorkoutId={setFocusWorkoutId}
               activePlanIds={activePlanIds}
             />
         )}
         
         {activeTab === 'calendar' && (
             <CalendarTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} theme={theme} history={history} setHistory={setHistory} programs={programs} 
               soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} navigateToWorkoutDate={navigateToWorkoutDate} 
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} handleEditPastWorkout={handleEditPastWorkout}
               selectedDate={selectedDate} setSelectedDate={setSelectedDate} setActiveTab={setActiveTab}
               weekStartDay={weekStartDay} defaultReminderTime={defaultReminderTime} reminderEnabled={reminderEnabled}
               units={units}
               activePlanIds={activePlanIds}
               userProfile={userProfile}
             />
         )}

         {activeTab === 'program' && (
             <ProgramTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} programs={programs} setPrograms={setPrograms} 
               user={user} exerciseLibrary={exerciseLibrary} soundEnabled={soundEnabled}
               setActiveAddModalTarget={setActiveAddModalTarget}
               saveStateToHistory={saveStateToHistory}
               openQuestionnaire={() => setShowQuestionnaire(true)}
               activePlanIds={activePlanIds} setActivePlanIds={setActivePlanIds}
               gymProfiles={gymProfiles}
               focusRoutineId={focusRoutineId} setFocusRoutineId={setFocusRoutineId}
               activityTargets={activityTargets}
               userApiKeys={userApiKeys} aiProvider={aiProvider} aiModel={aiModel}
               keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses}
               setAiProvider={setAiProvider} setAiModel={setAiModel}
               userProfile={userProfile} history={history}
               setShowSettings={setShowSettings}
               onAcceptProgram={handleAcceptAiProgram}
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
                theme={theme}
                gymProfiles={gymProfiles} setGymProfiles={setGymProfiles}
                activeGymId={activeGymId} setActiveGymId={setActiveGymId}
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
        userProfile={userProfile}
        focusWorkoutId={focusWorkoutId} setFocusWorkoutId={setFocusWorkoutId}
      />

      {/* === GLOBAL COACH RAIGA FLOAT === */}
      {user && (
        <CoachRaigaFloat
          onOpenChat={() => setShowAiChat(true)}
          plateauInsights={plateauInsights}
          hasUnreadChat={hasUnreadChat}
          isWorkoutActive={isImmersiveMode}
          activeTab={activeTab}
          onPositionChange={setAvatarPos}
        />
      )}

      {/* === GLOBAL GYMCHAT (accessible from any tab) === */}
      <GymAIChat
        isOpen={showAiChat}
        onClose={() => setShowAiChat(false)}
        userApiKeys={userApiKeys}
        aiProvider={aiProvider}
        aiModel={aiModel}
        keyStatuses={keyStatuses}
        setKeyStatuses={setKeyStatuses}
        setAiProvider={setAiProvider}
        setAiModel={setAiModel}
        setShowSettings={setShowSettings}
        userProfile={userProfile}
        history={history}
        exerciseLibrary={exerciseLibrary}
        programs={programs}
        activePlanIds={activePlanIds}
        plateauInsights={plateauInsights}
        raigaPersona={raigaPersona}
        raigaCustomInstruction={raigaCustomInstruction}
        raigaMemory={raigaMemory}
        setRaigaMemory={setRaigaMemory}
        onUnreadChange={setHasUnreadChat}
        onAcceptProgram={handleAcceptAiProgram}
        user={user}
        setConfirmModal={setConfirmModal}
        avatarOrigin={avatarPos}
      />
      {aiDialog}
      {/* Toast "Tekan Back Sekali Lagi" */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-5 py-2.5 rounded-full shadow-lg text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'}`}>
            Tekan sekali lagi untuk keluar
          </div>
        </div>
      )}

      {/* Toast Lanjut Latihan Berikutnya */}
      {!isImmersiveMode && (
        <div className={`fixed top-1/2 left-0 right-0 -translate-y-1/2 z-[100] pointer-events-none flex justify-center transition-all duration-500 ease-in-out ${showSupersetToast ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className={`w-full py-5 flex items-center justify-center ${t.bgAccent} bg-opacity-90 ${t.textButton}`}>
            <span className="font-black whitespace-nowrap text-base tracking-widest uppercase opacity-90 mix-blend-overlay">Lanjut Latihan Berikutnya!</span>
          </div>
        </div>
      )}
      {/* Achievement Popup */}
      <AchievementPopup 
        achievements={unlockedAchievementsPopup} 
        onClose={(id) => {
          setUnlockedAchievementsPopup(prev => prev.filter(a => a.id !== id));
        }} 
        soundEnabled={soundEnabled} 
        playSoundEffect={playSoundEffect} 
        theme={theme}
        t={t}
        user={user}
        onShareComplete={(postId) => {
          setUnlockedAchievementsPopup([]);
          // Open ProfileModal on the community feed tab
          setProfileForceTab('beranda');
          setShowProfileModal(true);
        }}
      />

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-bottom-8 duration-300 ${t.bgCard} ${t.border} border`}>
             <img src="/icon-192.png" className="w-20 h-20 rounded-2xl mb-4 shadow-xl border border-white/10" alt="LOGYM Logo" />
             <h3 className={`text-xl font-black ${t.textMain} mb-2`}>Install LOGYM App</h3>
             <p className={`text-sm ${t.textMuted} mb-6`}>Install aplikasi LOGYM di perangkatmu untuk akses lebih cepat, latihan offline, dan pengalaman yang lebih mulus.</p>
             <div className="flex flex-col w-full gap-3">
                <button 
                  className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white ${t.bgAccent} shadow-md`}
                  onClick={async () => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setDeferredPrompt(null);
                        setShowInstallPrompt(false);
                      }
                    }
                  }}
                >
                  <Download size={18} /> Instal Sekarang
                </button>
                <button 
                  className={`w-full py-3.5 rounded-xl font-bold ${t.textMuted} hover:${t.textMain} bg-transparent border border-transparent transition-colors`}
                  onClick={() => {
                    localStorage.setItem('__PWA_PROMPT_DISMISSED', 'true');
                    setShowInstallPrompt(false);
                  }}
                >
                  Nanti Saja
                </button>
             </div>
          </div>
        </div>
      )}

      <BottomNav t={t} lang={lang} activeTab={activeTab} setActiveTab={setActiveTab} setIsEditingMode={setIsEditingMode} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} />
    </div>
  );
}