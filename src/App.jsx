import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';

// --- IMPORT CAPACITOR (FULLSCREEN) ---
import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapApp } from '@capacitor/app';

export const WorkoutTimerPlugin = registerPlugin('WorkoutTimer');
export const ApkInstallerPlugin = registerPlugin('ApkInstaller');


// --- IMPORT MESIN FIREBASE ---
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, deleteField, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

// --- IMPORT KOMPONEN UI ---
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TabSlider from './components/TabSlider';
import FloatingTimer from './components/FloatingTimer';
import CoachLogyFloat from './components/CoachLogyFloat';
import GymAIChat from './components/GymAIChat';

// --- IMPORT HALAMAN (PAGES) ---
import AuthPage from './pages/AuthPage';
import OnboardingFlow from './pages/OnboardingFlow';
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
import { AI_MODELS, detectPlateaus, getLogyNotification } from './utils/aiAgent';
import { calculateReadiness, restingHrBaseline } from './utils/readinessEngine';
import { calcBMR, ACTIVITY_MULTIPLIERS } from './utils/bmr';
import { calculateSmartWorkoutCalories, parseWorkoutDurationMinutes, guessWorkoutType, workoutWindow, summarizeHeartRate, recoveredWorkoutSeconds, dailyBurnCalories, recomputeStrengthRecords, buildExLookupByName, canonicalExId, sessionSpanSeconds, repairActualWeights, buildHcSessionDetail, estimate10RM, defaultSetWeight, gymStepFor, mergeRm10, getEquipmentConfig, calculateActualWeight, getSetActualWeight } from './utils/workoutCalc';
import { hcAvailable, hcRequestPermissions, hcReadRange, hcBackfillHistory, hcReadHeartRateWindow, hcCheckStatus, hcInventory, hcWriteWorkoutSession, hcRequestWorkoutWritePermission, hcCheckWorkoutWritePermission, capIntradayLog, HC_FIELDS, fillOnlyPatch, hcDroppedTypes } from './utils/healthConnect';
import { bumpExercisePopularity } from './utils/exercisePopularity';
import { rapikanNamaProgram, rapikanNamaSesi, pertahankanNamaSesi } from './utils/programNaming';
import useDialog from './hooks/useDialog';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import UpdaterAlert from './components/UpdaterAlert';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { getLocalYMD, resolveProjectedProgramId, isLomealOwned, resolveLoggedExercise, splitSessionLogs, buildLogymSyncPayload, defaultMasterExercises, defaultPrograms, defaultWarmupVideos, defaultCooldownVideos, getDayWorkouts, countMissedScheduledDays, canonicalizeExercise } from './data/constants';
import { serializeDay, dayFingerprint, migrateBaseline, reconcileHistory, workoutsToMap, workoutIdsFromBaseline, diffFields, cleanFirestoreData, stableStringify, mergeBackupIntoHistory, sessionsPendingSave } from './utils/historySync';
import { useBleManager } from './hooks/useBleManager';
import { bolehSync, gabungAntrean } from './utils/hcSchedule';
import { Loader2, Download, X } from 'lucide-react';

// Kalau device ini baru aja nulis lokal (dalam LOCAL_WRITE_GUARD_MS terakhir), skip snapshot
// yang masuk SEKALI SAJA — jangan diretry. Tulisan lokal yang masih pending bakal ke-upload
// sendiri sebentar lagi dan memicu snapshot baru yang sudah benar; retry di sini yang dulu
// bikin livelock (device saling nunda ke device lain tanpa henti).
// Dulu di sini ada guard berbasis waktu (isRecentLocalWrite): snapshot server dibuang kalau
// device ini menulis dalam 3 detik terakhir. Sama seperti di history, itu salah — dan di
// dokumen utama akibatnya lebih halus tapi sama merusaknya: efek BMR memanggil
// setActivityTargets (salah satu setter terjaga) tepat setelah snapshot memuat userProfile,
// jadi stempelnya naik TANPA aksi user. Snapshot berikutnya membuang semua field terjaga,
// termasuk gymProfiles — yang tidak punya cache lokal, jadi state-nya tinggal daftar default,
// lalu terkirim menimpa gym asli di server. Itu penyebab "gym baru hilang".
//
// Penggantinya: putuskan per field berdasarkan ISI. Ambil nilai server kalau nilai lokal
// masih sama dengan baseline (tidak ada perubahan lokal yang belum terkirim); kalau berbeda,
// pertahankan yang lokal.

// Baca cache localStorage yang MUNGKIN RUSAK. Kalau JSON-nya tidak utuh (tulisan terpotong
// saat kuota habis), `JSON.parse` melempar — dan karena semua pemanggilnya ada di badan
// komponen, lemparannya terjadi SAAT RENDER: ErrorBoundary layar merah tiap boot, tanpa jalan
// keluar selain uninstall, padahal datanya aman di Firestore. Di sini kunci yang rusak dibuang
// dan app boot dengan nilai default — snapshot server mengisinya kembali beberapa detik lagi.
const readCache = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const val = JSON.parse(raw);
    return val === null || val === undefined ? fallback : val;
  } catch {
    console.warn(`[Cache] ${key} rusak — dibuang, akan diisi ulang dari server.`);
    try { localStorage.removeItem(key); } catch { /* diabaikan */ }
    return fallback;
  }
};

// Tulis cache. WAJIB dibungkus: setItem melempar QuotaExceededError saat penyimpanan penuh,
// dan karena pemanggilnya useEffect, lemparannya menjatuhkan seluruh app. Cache itu percepatan
const writeCache = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { console.warn(`[Cache] gagal menulis ${key} (kuota penuh?)`); return false; }
};

export default function App() {
  // --- STATE AUTH & LOADING ---
  const __previewUser = readCache('__PREVIEW_USER', null);
  const __cachedUid = localStorage.getItem('__CACHED_UID');
  const __cachedProfile = readCache('__CACHED_PROFILE', null);
  const __cachedUserName = __cachedProfile?.name || localStorage.getItem('__CACHED_USER_NAME') || '';
  const __cachedUserPhoto = __cachedProfile?.photoURL || localStorage.getItem('__CACHED_USER_PHOTO') || null;
  const __cachedUser = __cachedUid ? { uid: __cachedUid, name: __cachedUserName, photoURL: __cachedUserPhoto } : null;
  const [user, setUser] = useState(__previewUser || __cachedUser);
  const [isAuthChecking, setIsAuthChecking] = useState(!__previewUser);
  const [isDataLoaded, setIsDataLoaded] = useState(!!__previewUser || !!__cachedUser);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(!!__previewUser || !!__cachedUser);
  const [isInitialSplash, setIsInitialSplash] = useState(true);
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsInitialSplash(false);
    }, 800);
    return () => clearTimeout(splashTimer);
  }, []);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [lomealToday, setLomealToday] = useState(null);
  const [lomealTargets, setLomealTargets] = useState(null);
  useEffect(() => {
    if (!user?.uid) { setLomealToday(null); setLomealTargets(null); return; }
    const unsub = onSnapshot(doc(db, 'logym_users', user.uid), (snap) => {
      setLomealToday(snap.data()?.lomealSync?.today || null);
      setLomealTargets(snap.data()?.lomealSync?.targets || null);
    });
    return unsub;
  }, [user?.uid]);

  const [otaState, setOtaState] = useState({ open: false, force: false, url: '', version: '', notes: '' });
  const [currentVer, setCurrentVer] = useState(__APP_VERSION__);
  const [downloadProgress, setDownloadProgress] = useState(null);
  // Izin "Install unknown apps" belum diberikan / pemasangan gagal — dua-duanya butuh penjelasan
  // ke user, bukan sekadar tombol yang diam-diam tidak bereaksi.
  const [apkPermissionAsk, setApkPermissionAsk] = useState(false);
  const [apkError, setApkError] = useState(null);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const otaUrl = isNative ? 'https://logym.web.app/ota/version.json' : '/ota/version.json';

    const checkOta = async () => {
      try {
        const installedVer = __APP_VERSION__;
        setCurrentVer(installedVer);

        const res = await fetch(`${otaUrl}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.ota_version && data.ota_version !== installedVer) {
            if (data.is_apk && !isNative) {
              return; 
            }
            const dismissed = localStorage.getItem('logym_dismissed_ota');
            if (!data.is_forced && dismissed === data.ota_version) {
              setOtaState(prev => ({ ...prev, open: false, force: data.is_forced, url: data.ota_url, version: data.ota_version, notes: data.release_notes }));
            } else {
              setOtaState({ open: true, force: data.is_forced, url: data.ota_url, version: data.ota_version, notes: data.release_notes });
            }
          } else {
            setOtaState(prev => ({ ...prev, open: false }));
          }
        }
      } catch (err) {
        // Di dev, /ota/version.json belum ada (dihasilkan npm run build:ota) sehingga server
        // mengembalikan index.html dan JSON.parse melempar. Itu bukan kegagalan — cukup catat
        // sebagai peringatan, jangan sebagai error yang menutupi masalah sungguhan di konsol.
        const bukanJson = err instanceof SyntaxError;
        if (bukanJson) console.warn('Cek OTA dilewati: manifest belum ada (normal saat dev).');
        else console.error('Failed to check OTA', err);
      }
    };

    checkOta();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkOta();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', checkOta);
    const poll = setInterval(checkOta, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', checkOta);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) CapacitorUpdater.notifyAppReady();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let dlListener;
    CapacitorUpdater.addListener('download', (info) => {
      setDownloadProgress(Math.round(info.percent));
    }).then(l => dlListener = l);
    return () => { if (dlListener) dlListener.remove(); };
  }, []);

  // Kabar dari ApkInstallerPlugin: unduhan, dialog Install, berhasil, atau gagal. Dipakai supaya
  // bar progresnya ikut jalur APK juga — bukan cuma jalur bundle ZIP.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    let sub;
    ApkInstallerPlugin.addListener('apkInstall', (info) => {
      if (info?.state === 'downloading') setDownloadProgress(Math.round(info.percent || 0));
      else if (info?.state === 'installing') setDownloadProgress(100);
      // 'prompt' = dialog Install Android sedang tampil. Progres dibiarkan 100 supaya kartunya
      // tidak balik ke tombol "Update" seolah gagal saat user masih menatap dialognya.
      else if (info?.state === 'failed') {
        setDownloadProgress(null);
        setApkError(info?.message || 'Pemasangan gagal.');
      }
      // 'success' tidak perlu ditangani: Android mematikan aplikasi saat memasang versi baru.
    }).then(l => { sub = l; });
    return () => { if (sub) sub.remove(); };
  }, []);

  const handleUpdateApp = async () => {
    localStorage.removeItem('logym_dismissed_ota');

    if (otaState.url && !otaState.url.toLowerCase().endsWith('.zip')) {
      // Di APK: unduh & pasang DI DALAM aplikasi. Dulu baris-baris ini membuka tautan hosting di
      // browser, dan user harus mencari sendiri berkasnya di folder Downloads — langkah manual
      // yang paling sering bikin pembaruan tidak jadi dipasang. Dialog "Install" milik Android
      // tetap muncul; itu batas platform, bukan sesuatu yang bisa dilewati.
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        setDownloadProgress(0);
        try {
          const res = await ApkInstallerPlugin.install({ url: otaState.url });
          if (res?.needsPermission) {
            setDownloadProgress(null);
            setApkPermissionAsk(true);
          }
        } catch (err) {
          console.warn('Gagal memasang APK', err);
          setDownloadProgress(null);
        }
        return;
      }

      // Browser biasa (PWA di desktop/HP): tidak ada installer, jadi unduhan normal.
      setDownloadProgress('apk');
      const link = document.createElement('a');
      link.href = otaState.url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Reset after 10 seconds to allow retry if the download didn't trigger
      setTimeout(() => {
        setDownloadProgress(null);
      }, 10000);
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      setDownloadProgress(0);
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setDownloadProgress(100);
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return;
    }

    try {
      setDownloadProgress(0);
      const bundle = await CapacitorUpdater.download({ url: otaState.url, version: otaState.version });
      setDownloadProgress(100);
      // Jeda 600ms agar user melihat bar 100% dan status ekstraksi sebelum app me-reload bundle baru
      await new Promise(resolve => setTimeout(resolve, 600));
      await CapacitorUpdater.set(bundle); 
    } catch (err) {
      console.error('OTA Update failed:', err);
      setDownloadProgress(null);
      if (otaState.force) {
        showOtaAlert('Gagal mengunduh pembaruan. Periksa koneksi internetmu lalu coba lagi.', { title: 'Update gagal' });
      } else {
        showOtaAlert('Gagal mengunduh pembaruan.', { type: 'error' });
      }
    }
  };

  const [theme, setTheme] = useState(() => readCache('__CACHED_THEME', 'dark'));
  const { dialog: otaDialog, showAlert: showOtaAlert } = useDialog(theme === 'dark');

  // Izin "Install unknown apps" belum diberikan. Android menolak diam-diam kalau ini dilewat,
  // jadi user harus diberi tahu DAN diantar ke layar setelannya — kalau tidak, tombol Update
  // terlihat seperti rusak.
  useEffect(() => {
    if (!apkPermissionAsk) return;
    setApkPermissionAsk(false);
    showOtaAlert(
      'Android butuh izinmu sekali saja untuk memasang pembaruan Logym.\n\nNyalakan "Izinkan dari sumber ini" di layar setelan yang terbuka, lalu tekan Update lagi.',
      { title: 'Izinkan pemasangan' }
    );
    ApkInstallerPlugin.openInstallSettings().catch(() => {});
  }, [apkPermissionAsk, showOtaAlert]);

  useEffect(() => {
    if (!apkError) return;
    const pesan = apkError;
    setApkError(null);
    showOtaAlert(pesan, { title: 'Pembaruan gagal', type: 'error' });
  }, [apkError, showOtaAlert]);
  const [language, setLanguage] = useState(() => readCache('__CACHED_LANGUAGE', 'ID'));
  const [soundEnabled, setSoundEnabled] = useState(() => readCache('__CACHED_SOUND_ENABLED', true));
  const [healthConnectEnabled, setHealthConnectEnabled] = useState(false);
  const [defaultRestTime, setDefaultRestTime] = useState(() => readCache('__CACHED_DEFAULT_REST_TIME', 120));
  const [warmupVideos, _setWarmupVideos] = useState(defaultWarmupVideos);
  const setWarmupVideos = _setWarmupVideos;
  const [cooldownVideos, _setCooldownVideos] = useState(defaultCooldownVideos);
  const setCooldownVideos = _setCooldownVideos;
  const [weekStartDay, setWeekStartDay] = useState(() => readCache('__CACHED_WEEK_START_DAY', 0)); 
  const [defaultReminderTime, setDefaultReminderTime] = useState(() => readCache('__CACHED_REMINDER_TIME', "15:00"));
  const [reminderEnabled, setReminderEnabled] = useState(() => readCache('__CACHED_REMINDER_ENABLED', true));
  const [biometricStandard, setBiometricStandard] = useState(() => readCache('__CACHED_BIOMETRIC_STANDARD', 'asia')); 
  const [unitSystem, setUnitSystem] = useState(() => readCache('__CACHED_UNIT_SYSTEM', 'metric')); 
  const [units, setUnits] = useState(() => readCache('__CACHED_UNITS', { weight: 'kg', height: 'cm', distance: 'km', temp: 'c' }));
  const [userProfile, _setUserProfile] = useState(() => __previewUser ? null : readCache('__CACHED_PROFILE', null));
  const setUserProfile = _setUserProfile;

  useEffect(() => {
    if (__previewUser) return;
    writeCache('__CACHED_PROFILE', userProfile);
  }, [userProfile]);

  const [gymProfiles, _setGymProfiles] = useState(() => __previewUser ? [{ id: 'default', name: 'Logym', equipment: 'all', config: {} }] : readCache('__CACHED_GYM_PROFILES', [{ id: 'default', name: 'Logym', equipment: 'all', config: {} }]));
  const setGymProfiles = _setGymProfiles;
  const [activeGymId, _setActiveGymId] = useState(() => __previewUser ? 'default' : readCache('__CACHED_ACTIVE_GYM_ID', 'default'));
  const setActiveGymId = _setActiveGymId;

  useEffect(() => {
    if (__previewUser) return;
    writeCache('__CACHED_GYM_PROFILES', gymProfiles);
  }, [gymProfiles]);

  useEffect(() => {
    if (__previewUser) return;
    writeCache('__CACHED_ACTIVE_GYM_ID', activeGymId);
  }, [activeGymId]);

  const [userApiKeys, _setUserApiKeys] = useState([]);
  const setUserApiKeys = _setUserApiKeys;
  const [keyStatuses, setKeyStatuses] = useState({});
  const [logyPersona, setLogyPersona] = useState(() => readCache('__CACHED_LOGY_PERSONA', 'santai'));
  const [logyCustomInstruction, setLogyCustomInstruction] = useState('');
  const [logyMemory, _setLogyMemory] = useState([]);
  const setLogyMemory = _setLogyMemory;
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [activityTargets, _setActivityTargets] = useState(() => readCache('__CACHED_ACTIVITY_TARGETS', { steps: 10000, dailyActiveMinutes: 30, sleep: 8 }));
  const setActivityTargets = _setActivityTargets;

  useEffect(() => { writeCache('__CACHED_THEME', theme); }, [theme]);
  useEffect(() => { writeCache('__CACHED_LANGUAGE', language); }, [language]);
  useEffect(() => { writeCache('__CACHED_SOUND_ENABLED', soundEnabled); }, [soundEnabled]);
  useEffect(() => { writeCache('__CACHED_DEFAULT_REST_TIME', defaultRestTime); }, [defaultRestTime]);
  useEffect(() => { writeCache('__CACHED_WEEK_START_DAY', weekStartDay); }, [weekStartDay]);
  useEffect(() => { writeCache('__CACHED_REMINDER_TIME', defaultReminderTime); }, [defaultReminderTime]);
  useEffect(() => { writeCache('__CACHED_REMINDER_ENABLED', reminderEnabled); }, [reminderEnabled]);
  useEffect(() => { writeCache('__CACHED_BIOMETRIC_STANDARD', biometricStandard); }, [biometricStandard]);
  useEffect(() => { writeCache('__CACHED_UNIT_SYSTEM', unitSystem); }, [unitSystem]);
  useEffect(() => { writeCache('__CACHED_UNITS', units); }, [units]);
  useEffect(() => { writeCache('__CACHED_ACTIVITY_TARGETS', activityTargets); }, [activityTargets]);
  useEffect(() => { writeCache('__CACHED_LOGY_PERSONA', logyPersona); }, [logyPersona]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const { weight, height, dob, gender, activityLevel } = userProfile || {};
    if (!weight || !height || !dob || !gender) return;
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    const bmr = calcBMR({ weight, height, age, gender });
    if (!bmr) return;
    const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.2));
    setActivityTargets(prev => (prev.tdee === tdee ? prev : { ...prev, tdee }));
  }, [userProfile?.weight, userProfile?.height, userProfile?.dob, userProfile?.gender, userProfile?.activityLevel, isDataLoaded]);

  const [userAchievements, setUserAchievements] = useState(() => __previewUser ? [] : readCache('__CACHED_ACHIEVEMENTS', []));
  useEffect(() => {
    writeCache('__CACHED_ACHIEVEMENTS', userAchievements);
  }, [userAchievements]);
  const [unlockedAchievementsPopup, setUnlockedAchievementsPopup] = useState([]);

  const [exerciseLibrary, _setExerciseLibrary] = useState(() => {
    const raw = __previewUser ? defaultMasterExercises : readCache('__CACHED_EXERCISE_LIBRARY', defaultMasterExercises);
    return (raw || []).map(ex => {
      if (ex.id === 121 && (ex.name === 'Pull Through' || ex.name === 'Cable Pull Through')) {
        return canonicalizeExercise({ ...ex, name: 'Cable Hip Abduction', target: ['Glutes'] });
      }
      return canonicalizeExercise(ex);
    });
  });
  useEffect(() => {
    writeCache('__CACHED_EXERCISE_LIBRARY', exerciseLibrary);
  }, [exerciseLibrary]);
  const setExerciseLibrary = _setExerciseLibrary;
  const [programs, _setPrograms] = useState(() => {
    const raw = __previewUser ? defaultPrograms : readCache('__CACHED_PROGRAMS', defaultPrograms);
    return (raw || []).map(p => ({
      ...p,
      exercises: (p.exercises || []).map(ex => {
        if (ex.id === 121 && (ex.name === 'Pull Through' || ex.name === 'Cable Pull Through')) {
          return canonicalizeExercise({ ...ex, name: 'Cable Hip Abduction', target: ['Glutes'] });
        }
        return canonicalizeExercise(ex);
      })
    }));
  });
  useEffect(() => {
    writeCache('__CACHED_PROGRAMS', programs);
  }, [programs]);
  const setPrograms = _setPrograms;

  const [history, _setHistory] = useState(() => __previewUser ? {} : readCache('__CACHED_HISTORY', {}));
  const historyMirror = useRef(history);
  historyMirror.current = history;
  useEffect(() => {
    if (!writeCache('__CACHED_HISTORY', history)) {
      setCloudSaveError('Penyimpanan lokal penuh — cache latihan tidak bisa ditulis. Kosongkan ruang penyimpanan; sampai itu beres, data antar perangkat bisa tidak sinkron.');
    }
  }, [history]);
  
  const setHistory = _setHistory;

  // --- BLE MANAGER (Latar Belakang) ---
  const bleManager = useBleManager({ setHistory, userProfile });

  const [healthAvailable, setHealthAvailable] = useState(false);
  useEffect(() => { hcAvailable().then(setHealthAvailable); }, []);

  const mergeHcDays = (byDay, { fillOnly = false } = {}) => {
    setHistory(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(byDay).forEach(([ymd, hcData]) => {
        const existingBio = prev[ymd]?.bioData || {};
        const manualFlags = existingBio._manualFlags || {};
        let patch;
        if (fillOnly) {
          patch = fillOnlyPatch(existingBio, hcData);
        } else {
          patch = {};
          HC_FIELDS.forEach((k) => {
            if (manualFlags[k] !== undefined) return;
            if (hcData[k] !== undefined) {
              // HC punya data → update kalau beda
              if (existingBio[k] !== hcData[k]) patch[k] = hcData[k];
            } else if (existingBio[k] !== undefined) {
              // HC TIDAK punya data tapi bioData masih simpan → hapus (data dihapus di HC)
              patch[k] = undefined;
            }
          });
        }
        // Cek apakah ada perubahan (termasuk penghapusan)
        const realChanges = Object.keys(patch).filter(k => patch[k] !== undefined || existingBio[k] !== undefined);
        if (realChanges.length === 0) return;
        const merged = { ...existingBio };
        Object.entries(patch).forEach(([k, v]) => {
          if (v === undefined) delete merged[k];
          else merged[k] = v;
        });
        next[ymd] = { ...(prev[ymd] || {}), bioData: merged };
        changed = true;
      });
      return changed ? next : prev;
    });
  };

  const stripLomealOwned = (bioData) => {
    const owned = ['nutritionCalories', 'activityCalories'].filter(f => isLomealOwned(bioData, f));
    if (owned.length === 0) return bioData;
    const clean = { ...bioData };
    const flags = { ...(clean._manualFlags || {}) };
    owned.forEach(f => { delete clean[f]; delete flags[f]; });
    if (Object.keys(flags).length > 0) clean._manualFlags = flags; else delete clean._manualFlags;
    return clean;
  };

  const fillSessionHeartRates = async (days) => {
    const bySession = {};
    let count = 0;
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = getLocalYMD(d);
      for (const w of history[ymd]?.workouts || []) {
        if (w.status !== 'completed' || w.hr) continue;
        const { start, end, guessed } = workoutWindow(w, ymd);
        if (guessed) continue;
        const hr = summarizeHeartRate(await hcReadHeartRateWindow(start.toISOString(), end.toISOString()));
        if (hr) { (bySession[ymd] = bySession[ymd] || {})[w.id] = hr; count++; }
      }
    }
    if (count > 0) {
      setHistory(prev => {
        const next = { ...prev };
        Object.entries(bySession).forEach(([ymd, byId]) => {
          const day = prev[ymd];
          if (!day || !Array.isArray(day.workouts)) return;
          next[ymd] = {
            ...day,
            workouts: day.workouts.map(w => (byId[w.id] && !w.hr ? { ...w, hr: byId[w.id] } : w)),
          };
        });
        return next;
      });
    }
    return count;
  };

  const pushWorkoutsToHc = async (days, canWriteSession) => {
    let sessions = 0;
    const stamp = {}; 
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = getLocalYMD(d);
      for (const w of history[ymd]?.workouts || []) {
        if (w.status !== 'completed') continue;
        if (w.source === 'healthconnect') continue;
        const mins = parseWorkoutDurationMinutes(w.duration);
        if (mins <= 0) continue;
        const logsToUse = (w.log && Object.keys(w.log).length > 0) ? w.log : (history[ymd]?.exerciseLogs);
        const kcal = calculateSmartWorkoutCalories(userProfile?.weight, w, logsToUse);
        if (w.hcSync && w.hcSync.kcal === kcal) continue;
        const version = (Number(w.hcSync?.v) || 0) + 1;
        const { start, end } = workoutWindow(w, ymd);
        const { segments, notes } = buildHcSessionDetail(w, logsToUse, start.getTime(), end.getTime());
        if (canWriteSession && await hcWriteWorkoutSession({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          exerciseType: guessWorkoutType(w.overriddenExercises || w.exercises),
          title: w.programName || 'Latihan',
          calories: kcal,
          dedupeKey: w.id,
          version, segments, notes,
        })) sessions++;
        (stamp[ymd] = stamp[ymd] || {})[w.id] = { kcal, v: version };
      }
    }

    if (Object.keys(stamp).length > 0) {
      setHistory(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(stamp).forEach(([ymd, byId]) => {
          const day = prev[ymd];
          if (!day || !Array.isArray(day.workouts)) return;
          next[ymd] = { ...day, workouts: day.workouts.map(w => (byId[w.id] ? { ...w, hcSync: byId[w.id] } : w)) };
          changed = true;
        });
        return changed ? next : prev;
      });
    }
    return { sessions };
  };

  const hcSyncing = useRef(false);
  const hcLastSync = useRef(0);   // sapuan lebar (>2 hari)
  const hcLastQuick = useRef(0);  // penyegaran hari ini + semalam
  const hcQueued = useRef(null);
  const runHcSync = async ({ days = 30, silent = true } = {}) => {
    if (!healthConnectEnabled || !isDataLoaded) return;
    // Permintaan yang datang saat sinkron lain berjalan DIANTRE, bukan dibuang. Dulu di sini cuma
    // `return` — dan pemanggil terpentingnya, dorongan sesi latihan setelah disimpan, sudah
    // terlanjur menghapus flag `hcPushAfterSave` sebelum memanggil. Jadi kalau user menyimpan
    // latihan sementara sinkron 30 hari saat app dibuka masih jalan, sesi itu TIDAK PERNAH
    // terkirim ke Health Connect sampai sinkron berikutnya — itu "delay" yang dilaporkan.
    if (hcSyncing.current) {
      hcQueued.current = gabungAntrean(hcQueued.current, { days, silent });
      return;
    }
    hcSyncing.current = true;
    try {
    if (!silent) {
      try { await hcRequestPermissions(); } catch (e) { console.warn('re-request izin gagal:', e); }
    }
    const status = silent ? null : await hcCheckStatus();
    let filled = 0;
    const hcByDay = {};
    await hcBackfillHistory(days, () => false, (ymd, summary) => { filled++; hcByDay[ymd] = summary; });
    if (filled > 0) mergeHcDays(hcByDay);

    const hrFilled = await fillSessionHeartRates(days);
    const canWriteSession = silent ? await hcCheckWorkoutWritePermission() : await hcRequestWorkoutWritePermission();
    const { sessions } = await pushWorkoutsToHc(days, canWriteSession);

    const tertambal = silent ? 0 : await healHcHoles({ force: true });

    if (!silent) {
      const denied = status ? [...(status.readDenied || []), ...(status.writeDenied || [])] : [];
      const dibuang = hcDroppedTypes || [];
      const adaIsinya = (k) => Object.values(hcByDay).filter((d) => d?.[k] !== undefined).length;
      const hrvHari = adaIsinya('hrv');
      const reads = status?.readAuthorized?.length || 0;
      const writes = status?.writeAuthorized?.length || 0;
      showOtaAlert([
        ...(status ? [`Izin — baca ${reads} tipe, tulis ${writes} tipe`] : [`Pengecekan izin gagal / belum tuntas`]),
        ...(denied.length ? [`Ditolak — ${denied.join(', ')}`] : []),
        ...(dibuang.length ? [`Tidak didukung, dilewati — ${dibuang.join(', ')}`] : []),
        `Histori masuk — ${filled} hari`,
        ...(hrvHari > 0 ? [`HRV — ${hrvHari} hari`] : []),
        `Nadi per sesi — ${hrFilled} sesi`,
        `Terkirim ke HC — ${sessions} sesi latihan`,
        `Hari bolong ditambal — ${tertambal} hari`,
      ].map((s) => `• ${s}`).join('\n'), { title: 'Hasil Sinkron' });
    }
    } finally {
      hcSyncing.current = false;
      hcLastQuick.current = Date.now();
      // Cuma sapuan lebar yang menyetel jam sapuan. Kalau penyegaran 2 hari ikut menyetelnya,
      // membuka app tiap beberapa menit akan terus menunda sapuan penambal lubang.
      if (days > 2) hcLastSync.current = Date.now();
      const antre = hcQueued.current;
      hcQueued.current = null;
      if (antre) runHcSync(antre);
    }
  };

  const handleHcBackfill = (days = 30) => runHcSync({ days, silent: false });

  const DEEP_DAYS = 365;
  const DEEP_KEY = 'hc_deep_backfill_v1';
  const deepRunning = useRef(false);
  const runHcDeepBackfill = async () => {
    if (localStorage.getItem(DEEP_KEY) || deepRunning.current) return;
    if (!healthConnectEnabled || !isDataLoaded || !isHistoryLoaded) return;
    deepRunning.current = true;
    try {
      const hr = await fillSessionHeartRates(DEEP_DAYS);
      const canWriteSession = await hcCheckWorkoutWritePermission();
      const { sessions } = await pushWorkoutsToHc(DEEP_DAYS, canWriteSession);
      localStorage.setItem(DEEP_KEY, '1');
      console.log(`Sapuan setahun selesai — nadi masuk: ${hr} sesi; terkirim ${sessions} sesi.`);
    } catch (e) {
      console.warn('Sapuan setahun gagal, akan dicoba lagi nanti:', e);
    } finally {
      deepRunning.current = false;
    }
  };

  const HEAL_KEY = 'hc_heal_last';
  const healRunning = useRef(false);
  const healHcHoles = async ({ force = false } = {}) => {
    if (!healthConnectEnabled || !isDataLoaded || !isHistoryLoaded) return 0;
    if (healRunning.current) return 0;
    const hariIni = getLocalYMD(new Date());
    if (!force && localStorage.getItem(HEAL_KEY) === hariIni) return 0;
    healRunning.current = true;
    let tertambal = 0;
    try {
      for (let i = 0; i < 12; i++) {
        const akhir = new Date();
        akhir.setDate(1);
        akhir.setMonth(akhir.getMonth() - i + 1);
        akhir.setDate(0); 
        const awal = new Date(akhir);
        awal.setDate(1);
        const byDay = await hcReadRange(getLocalYMD(awal), getLocalYMD(akhir));
        const berlubang = {};
        Object.entries(byDay).forEach(([ymd, hcData]) => {
          if (Object.keys(fillOnlyPatch(historyMirror.current?.[ymd]?.bioData, hcData)).length > 0) berlubang[ymd] = hcData;
        });
        const jumlah = Object.keys(berlubang).length;
        if (jumlah > 0) { mergeHcDays(berlubang, { fillOnly: true }); tertambal += jumlah; }
      }
      localStorage.setItem(HEAL_KEY, hariIni);
      console.log(`[Heal HC] ${tertambal} hari lampau ditambal dari Health Connect.`);
    } catch (e) {
      console.warn('[Heal HC] gagal, dicoba lagi nanti:', e);
    } finally {
      healRunning.current = false;
    }
    return tertambal;
  };

  const hcPushAfterSave = useRef(false);
  const hcRetryTimer = useRef(null);
  useEffect(() => {
    if (!hcPushAfterSave.current) return;
    hcPushAfterSave.current = false;
    runHcSync({ days: 1, silent: true });
    // Percobaan KEDUA beberapa menit kemudian. Nadi sesi hampir pasti belum ada di Health Connect
    // pada detik latihan disimpan: jam tangan baru mengirimkannya ke Samsung Health belakangan,
    // dan Samsung baru menuliskannya ke HC sesudah itu. Tanpa ini, nadi sesi baru terisi kalau
    // user kebetulan menutup lalu membuka aplikasi lagi — padahal setelah menyimpan latihan
    // user justru bertahan di dalam app (dilempar ke tab Kalender).
    clearTimeout(hcRetryTimer.current);
    hcRetryTimer.current = setTimeout(() => runHcSync({ days: 1, silent: true }), 3 * 60 * 1000);
  }, [history]);

  useEffect(() => {
    if (!healthConnectEnabled || !isDataLoaded) return;
    // Health Connect TIDAK BISA memberi tahu aplikasi saat ada data baru — itu tertulis eksplisit
    // di dokumentasinya ("As your app can't get notified of new data"), jadi menjemput sendiri
    // adalah satu-satunya cara dan yang memang dianjurkan: tiap app kembali ke depan, lalu berkala
    // selama app di depan.
    //
    // Jedanya dibedakan menurut lebar jendelanya. Dulu semuanya kena satu jeda 10 menit, dan
    // itulah kenapa data tidur terasa lambat: dibuka jam 06.00 Samsung belum menulis tidurnya,
    // dibuka lagi 06.03 dan 06.06 permintaannya ditolak jeda, jadi tidurnya baru muncul lewat
    // 06.10. Penyegaran hari ini + semalam sekarang cuma dijaga 60 detik — cukup untuk mencegah
    // panggilan dobel saat app bolak-balik, tapi tidak lagi menahan data yang sudah siap.
    const sync = (days) => {
      if (!bolehSync(days, hcLastQuick.current, hcLastSync.current)) return;
      runHcSync({ days, silent: true });
    };
    // Hari ini + semalam DULU, baru sapuan 30 hari. hcReadRange membaca seluruh rentang sekaligus
    // (20 kueri untuk rentang apa pun) dan baru menggabungkan hasilnya setelah SEMUANYA selesai —
    // jadi kalau sapuan 30 hari yang jalan duluan saat app dibuka pagi, tidur semalam baru muncul
    // setelah 30 hari data selesai dibaca dan diolah. Itu delay yang paling terasa, dan urutannya
    // saja yang salah: jendela 2 hari selesai dalam hitungan detik.
    runHcSync({ days: 2, silent: true })
      .then(() => runHcSync({ days: 30, silent: true }))
      .then(runHcDeepBackfill)
      .then(() => healHcHoles()); 
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      sync(2);  // tidur semalam & hari ini — murah, hampir tanpa jeda
      sync(7);  // sapuan penambal lubang — tetap 10 menit sekali, diantre di belakang yang cepat
    };
    document.addEventListener('visibilitychange', onVisible);
    const poll = setInterval(() => sync(7), 30 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(poll);
    };
  }, [healthConnectEnabled, isDataLoaded]);

  const handleToggleHealthConnect = async () => {
    if (healthConnectEnabled) { setHealthConnectEnabled(false); return; }
    try {
      await hcRequestPermissions();
      await hcRequestWorkoutWritePermission();
      setHealthConnectEnabled(true);
      handleHcBackfill(30);
    } catch (e) {
      showOtaAlert('Gagal menyambungkan Health Connect: ' + e.message);
    }
  };


  const [activeTab, _setActiveTab] = useState('dashboard');
  // BottomNav pakai activeTab (urgent, pindah seketika), isi <main> pakai contentTab.
  // Sebelumnya _setActiveTab dibungkus startTransition — itu ikut menahan animasi navnya
  // sampai tab berat selesai render, jadi tap terasa nyangkut. useDeferredValue menunda
  // yang beratnya saja, dan render tundaannya bisa dipotong React supaya frame animasi lewat.
  const contentTab = useDeferredValue(activeTab);
  const [tabSlideDir, setTabSlideDir] = useState('');
  
  const [expandedSessions, _setExpandedSessions] = useState(() => {
    try {
      const saved = sessionStorage.getItem('lyfit_expandedSessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const setExpandedSessions = (val) => {
    _setExpandedSessions(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      sessionStorage.setItem('lyfit_expandedSessions', JSON.stringify(next));
      return next;
    });
  };

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


  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [resumeDurationSecs, setResumeDurationSecs] = useState(0);
  const [sessionSnapshot, setSessionSnapshot] = useState(null);
  const [restTargetTime, setRestTargetTime] = useState(null);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [sessionToRun, setSessionToRun] = useState(null);
  const sessionToRunRef = useRef(null);
  useEffect(() => { sessionToRunRef.current = sessionToRun; }, [sessionToRun]);

  const [selectedDate, setSelectedDate] = useState(getLocalYMD(new Date()));
  const [loadedDate, setLoadedDate] = useState(null);
  const [activePlanIds, _setActivePlanIds] = useState(() => __previewUser ? ['custom'] : readCache('__CACHED_ACTIVE_PLAN_IDS', ['custom']));
  useEffect(() => {
    writeCache('__CACHED_ACTIVE_PLAN_IDS', activePlanIds);
  }, [activePlanIds]);
  const setActivePlanIds = _setActivePlanIds;
  const [activeProgramId, setActiveProgramId] = useState(defaultPrograms[0]?.id || null);
  const [focusWorkoutId, setFocusWorkoutId] = useState(null);
  const autoSaveQueue = useRef([]);
  // Latihan yang SEDANG dikerjakan = latihan yang set-nya terakhir dicentang user. Dipakai untuk
  // memutuskan di mana mode immersive terbuka dan ke mana daftar kartu digulirkan.
  //
  // Dulu ini variabel global `window.logymLastInteractedExId`: tidak reaktif, tidak pernah
  // dibersihkan, dan hilang setiap aplikasi dimuat ulang — jadi sesi yang dilanjutkan setelah
  // aplikasi ditutup selalu balik ke latihan pertama. Sekarang state biasa yang ikut disimpan
  // bersama sesi aktif.
  const [activeExerciseId, setActiveExerciseId] = useState(null);
  // Tanggal milik sesi yang sedang berjalan, dikunci saat sesi DIMULAI. Sengaja tidak ikut
  // `selectedDate`: user boleh menjelajah kalender saat latihan, dan tombol "Lanjutkan" harus
  // tetap tahu sesi aslinya milik hari yang mana.
  const [activeWorkoutDate, setActiveWorkoutDate] = useState(null);
  useEffect(() => {
    // Deps sengaja hanya isWorkoutActive — selectedDate dibaca dari closure supaya nilainya
    // terkunci pada saat sesi dimulai, bukan mengikuti kalender yang sedang dilihat.
    if (isWorkoutActive) setActiveWorkoutDate(prev => prev || selectedDate);
    else setActiveWorkoutDate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutActive]);

  useEffect(() => {
    if (!programs || programs.length === 0) return;
    let changed = false;

    const seenProgIds = new Set();
    let dedupedPrograms = programs.filter(p => {
       if (seenProgIds.has(p.id)) { changed = true; return false; }
       seenProgIds.add(p.id);
       return true;
    });

    const newProgs = dedupedPrograms.map(p => {
       if (!p.exercises || p.exercises.length === 0) return p;
       
       let pChanged = false;
       const seen = new Set();
       const newExs = p.exercises.map(ex => {
          const exIdStr = String(ex.id);
          if (seen.has(exIdStr)) {
             pChanged = true;
             const newId = exIdStr + '-' + Math.random().toString(36).substr(2, 5);
             seen.add(newId);
             return { ...ex, id: newId };
          }
          seen.add(exIdStr);
          return ex;
       });

       if (pChanged) { 
           changed = true; 
           return { ...p, exercises: newExs }; 
       }
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

  const handlePostCreated = (postId) => {
    setProfileForceTab('beranda');
    setShowProfileModal(true);
    if (postId) setHighlightPostId(postId);
    setTimeout(() => setProfileForceTab(null), 500);
  };

  const [profileViewRequest, setProfileViewRequest] = useState(null);
  const openUserProfile = (userId) => {
    setProfileViewRequest({ userId, nonce: Date.now() });
    setShowProfileModal(true);
  };
  const [showHelp, setShowHelp] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [globalDetailExercise, setGlobalDetailExercise] = useState(null);

  const urlParamsHandled = useRef(false);
  useEffect(() => {
    if (isAuthChecking || urlParamsHandled.current) return;
    urlParamsHandled.current = true;

    const handleUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const u = params.get('u');
      if (u) {
        if (u.length > 20) {
          openUserProfile(u);
        } else {
          try {
            const usernameRef = doc(db, 'logym_usernames', u.toLowerCase());
            const snap = await getDoc(usernameRef);
            if (snap.exists() && snap.data().uid) {
              openUserProfile(snap.data().uid);
            }
          } catch (e) {
            console.error("Error fetching username:", e);
          }
        }
      }
    };
    handleUrlParams();
  }, [isAuthChecking]);
  const [isFreshAccount, setIsFreshAccount] = useState(false);
  const [showGymManager, setShowGymManager] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [activeAddModalTarget, setActiveAddModalTarget] = useState(null);

  const [showAiChat, setShowAiChat] = useState(false);
  const [avatarPos, setAvatarPos] = useState(null); 
  const { dialog: aiDialog, showAlert: showAiAlert } = useDialog(theme === 'dark');

  const plateauInsights = useMemo(() => {
    if (activeTab !== 'dashboard') return [];
    return detectPlateaus(history, 3, 2);
  }, [history, activeTab]);

  const readiness = useMemo(() => {
    if (!user || activeTab !== 'dashboard') return null; 
    const todayStr = getLocalYMD(new Date());
    const todayData = history[todayStr] || {};
    
    const hasWorkoutToday = (todayData.workouts && todayData.workouts.length > 0) || todayData.programId;
    if (!hasWorkoutToday) return null;

    const todayBioData = todayData.bioData || {};
    return calculateReadiness(todayBioData, restingHrBaseline(history, todayStr));
  }, [history, user, activeTab]);

  const scheduleLogyPush = async (type, id, vars) => {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
      const copy = getLogyNotification(type, logyPersona, vars);
      if (!copy) return;
      const [h, m] = (defaultReminderTime || '09:00').split(':');
      const fireAt = new Date();
      fireAt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      if (fireAt.getTime() <= Date.now()) fireAt.setDate(fireAt.getDate() + 1); 
      await LocalNotifications.schedule({
        notifications: [{
          id,
          title: copy.title,
          body: copy.body,
          schedule: { at: fireAt },
          // smallIcon: logo Logym putih 24dp (drawable/ic_stat_logym), bukan ikon 'i' bawaan
          // Capacitor. Ditulis di tiap notifikasi, BUKAN cuma di capacitor.config.json: config
          // itu ikut ter-bundle ke APK, jadi perubahannya tidak pernah sampai lewat OTA.
          // largeIcon sengaja tidak dipakai — foto coach di kanan notifikasi bikin ramai.
          smallIcon: 'ic_stat_logym',
        }]
      });
      return id;
    } catch (err) {
      console.warn('Logy push notif error:', err);
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const scheduleDailyReminder = async () => {
      try {
        // Dijadwalkan TUJUH HARI ke depan, satu notifikasi per hari (id 8888..8894).
        //
        // Versi lama memakai satu alarm `repeats: true` dengan teks tetap "Latihan hari ini" —
        // tidak pernah membaca jadwal, jadi hari istirahat pun tetap disuruh latihan. Teks yang
        // menyesuaikan mustahil dengan alarm berulang, karena isinya dikunci sekali di awal.
        //
        // Kenapa tujuh dan bukan satu: alarm berulang punya satu keunggulan nyata yang tidak
        // boleh hilang — tetap berbunyi walau aplikasi tidak pernah dibuka lagi. Menjadwalkan
        // sepekan ke depan mempertahankan itu; tiap kali aplikasi dibuka, jadwalnya disegarkan.
        const ids = Array.from({ length: 7 }, (_, i) => 8888 + i);
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
        if (!reminderEnabled) return;

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') return;

        const [h, m] = (defaultReminderTime || '09:00').split(':');
        const notifications = [];

        for (let i = 0; i < 7; i++) {
          const fireAt = new Date();
          fireAt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
          fireAt.setDate(fireAt.getDate() + i);
          if (fireAt.getTime() <= Date.now()) continue; // jam hari ini sudah lewat

          const ymd = getLocalYMD(fireAt);
          const terjadwal = getDayWorkouts(history, programs, activePlanIds, ymd)
            .filter(w => w.status !== 'completed');
          const nama = terjadwal.map(w => w.programName || w.name).filter(Boolean).join(' + ');

          const copy = terjadwal.length > 0
            ? getLogyNotification('start', logyPersona, { program: nama || 'Latihan hari ini' })
            : getLogyNotification('rest', logyPersona, {});
          if (!copy) continue;

          notifications.push({
            id: ids[i],
            title: copy.title,
            body: copy.body,
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_stat_logym', // lihat catatan di scheduleLogyPush
          });
        }

        if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
      } catch (err) {
        console.warn('Daily reminder error:', err);
      }
    };
    scheduleDailyReminder();
  }, [reminderEnabled, defaultReminderTime, logyPersona, history, programs, activePlanIds]);


  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !reminderEnabled) return;
    // Riwayat & program HARUS sudah selesai dimuat. Efek ini ikut berjalan pada render pertama
    // ketika history masih kosong/separuh dari cache — hitungannya jadi ngawur (mis. "7 hari"
    // padahal kemarin latihan), notifikasinya terlanjur dijadwalkan, dan dedup menyimpan angka
    // salah itu sehingga tidak pernah dikoreksi.
    if (!isDataLoaded || !isHistoryLoaded) return;

    const MISSED_THRESHOLD_DAYS = 2;
    const todayYmd = getLocalYMD(new Date());
    // Hari TERJADWAL yang dilewatkan — bukan "hari sejak latihan terakhir". Yang lama menghitung
    // hari istirahat sebagai bolos, jadi program 3x seminggu memicu tuduhan ini tiap minggu.
    const daysMissed = countMissedScheduledDays(history, programs, activePlanIds, todayYmd);

    // Notifikasi "bolos" dijadwalkan ke JAM PENGINGAT, bisa besok — kalau user latihan lagi
    // sebelum jamnya tiba, tuduhan basi itu tetap berbunyi. Jadi yang tertunda selalu dibatalkan
    // dulu, baik saat angkanya berubah maupun saat user sudah kembali ke jadwal.
    const dedupKey = `lyfit_missed_notif_${user?.uid || 'guest'}`;
    const pendingKey = `lyfit_missed_notif_id_${user?.uid || 'guest'}`;
    const batalkanTertunda = async () => {
      const idLama = Number(localStorage.getItem(pendingKey));
      if (!idLama) return;
      try { await LocalNotifications.cancel({ notifications: [{ id: idLama }] }); } catch (e) {}
      localStorage.removeItem(pendingKey);
    };

    if (daysMissed < MISSED_THRESHOLD_DAYS) {
      batalkanTertunda();
      localStorage.removeItem(dedupKey);
      return;
    }

    const dedupVal = `${todayYmd}_${daysMissed}`;
    if (localStorage.getItem(dedupKey) === dedupVal) return;

    const id = 88000000 + (daysMissed % 1000);
    batalkanTertunda().then(() =>
      scheduleLogyPush('missed', id, { days: daysMissed }).then(() => {
        localStorage.setItem(dedupKey, dedupVal);
        localStorage.setItem(pendingKey, String(id));
      })
    );
  }, [history, programs, activePlanIds, reminderEnabled, logyPersona, defaultReminderTime, user?.uid, isDataLoaded, isHistoryLoaded]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !reminderEnabled) return;
    const top = plateauInsights?.[0];
    if (!top) return;
    const insightKey = `${top.name}_${top.weeks}_${top.maxWeight}`;
    const dedupKey = `lyfit_insight_notif_${user?.uid || 'guest'}`;
    if (localStorage.getItem(dedupKey) === insightKey) return;

    scheduleLogyPush('insight', 89000000 + (top.weeks % 1000), { exName: top.name, weeks: top.weeks, maxWeight: top.maxWeight })
      .then(() => localStorage.setItem(dedupKey, insightKey));
  }, [plateauInsights, reminderEnabled, logyPersona, defaultReminderTime, user?.uid]);

  const handleAcceptAiProgram = React.useCallback(async (programData) => {
    const isUpdate = programData.action === 'update' && programData.targetPlanId;
    const planId = isUpdate ? programData.targetPlanId : `plan_ai_${Date.now()}`;

    // Nama plan yang SUDAH ADA selalu menang saat mengedit — user boleh rename, Logy tidak boleh
    // menimpanya balik. Nama baru dari AI dirapikan dulu ("Program Full Body 3 Hari Logym" ->
    // "Full Body"); lihat programNaming.js.
    const rutinLama = isUpdate ? programs.filter(p => p.planId === planId) : [];
    const existingPlanName = isUpdate
      ? rutinLama[0]?.planName || rapikanNamaProgram(programData.planName, 'Program AI')
      : rapikanNamaProgram(programData.planName, 'Program AI');

    const ts = Date.now();
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
        // Nama hari dibuang dari nama sesi ("Rabu: Full Body A" -> "Full Body A"); harinya
        // ditampilkan sebagai badge terpisah di kartu program.
        name: rapikanNamaSesi(r.name, `Sesi ${i + 1}`),
        exercises,
        restTime: 90,
        source: 'ai'
      };
    });

    // Sesi yang sudah di-rename user tidak boleh balik ke nama karangan AI saat program diedit.
    const routinesFinal = isUpdate ? pertahankanNamaSesi(routines, rutinLama) : routines;

    try {
      if (isUpdate) {
        setPrograms(prev => [...routinesFinal, ...prev.filter(p => p.planId !== planId)]);
        await showAiAlert('Program berhasil diperbarui sesuai saran Coach Logy!', { type: 'success' });
      } else {
        setPrograms(prev => [...routinesFinal, ...prev]);
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
  const connectedAppsView = useMemo(
    () => ({ ...connectedApps, healthConnect: healthConnectEnabled }),
    [connectedApps, healthConnectEnabled]
  );

  const [exerciseLogs, setExerciseLogs] = useState({});
  const [skippedExercises, setSkippedExercises] = useState({});
  const [extraExercises, setExtraExercises] = useState([]);
  const [sessionExercises, setSessionExercises] = useState([]);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showExitToast, setShowExitToast] = useState(false);
  const [showSupersetToast, setShowSupersetToast] = useState(false);
  const [showRestoreToast, setShowRestoreToast] = useState('');
  const backPressedOnce = useRef(false);
  const scrollPositions = useRef({});
  const prevTab = useRef(activeTab);
  const restoringUntil = useRef(0);

  const profileModalOpened = useRef(false);
  if (showProfileModal) profileModalOpened.current = true;
  const questionnaireOpened = useRef(false);
  if (showQuestionnaire) questionnaireOpened.current = true;

  useEffect(() => {
    const timers = [];
    // Sengaja contentTab, bukan activeTab: yang menentukan tinggi dokumen adalah isi yang
    // benar-benar sudah ter-commit, bukan pill nav yang sudah pindah duluan.
    if (prevTab.current !== contentTab) {
      prevTab.current = contentTab;
      // Posisi dibaca SEKARANG, bukan di dalam timeout. Begitu tab lama dilepas dokumen
      // memendek, browser menembakkan event scroll (clamp ke 0) yang mendarat di listener
      // tab BARU — jadi posisi tersimpan sudah jadi 0 sebelum sempat dipulihkan.
      const target = scrollPositions.current[contentTab] || 0;
      restoringUntil.current = Date.now() + 300; // abaikan clamp selama tab baru menata diri
      const restore = () => window.scrollTo(0, target);
      restore();
      // Konten tab baru sering belum setinggi target di frame pertama → scrollTo ke-clamp.
      if (target > 0) timers.push(setTimeout(restore, 80), setTimeout(restore, 250));
    }

    const handleScroll = () => {
      if (Date.now() < restoringUntil.current) return;
      scrollPositions.current[contentTab] = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [contentTab]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          StatusBar.setOverlaysWebView({ overlay: true }).catch(err => console.log(err));
          StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(err => console.log(err));
      });
    } else {
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

  useEffect(() => {
    const timer = setTimeout(() => { fetchExercisesFromApi(); }, 2500);
    return () => clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    const alreadyDone = user?.uid ? localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true' : false;
    if (isDataLoaded && user && isFreshAccount && !alreadyDone) {
      setShowQuestionnaire(true);
      setIsFreshAccount(false); 
    } else if (isFreshAccount) {
      setIsFreshAccount(false); 
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

    if (user?.uid) {
      setDoc(doc(db, 'logym_users', user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => {});
    }

    setTimeout(() => {
      const layout = window.innerWidth < 640 ? 'mobile' : 'desktop';
      const el = document.getElementById(`plan-${layout}-${newPlanId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
        WorkoutTimerPlugin.setAppState({ isActive }).catch(() => {});
      });
      return () => {
        sub.then(listener => listener.remove());
      };
    }
  }, []);

  // Nama sesi yang BENAR-BENAR sedang dijalankan. Notifikasi & overlay native dulu memakai
  // `activeProgramId` — variabel yang cuma menandai program terakhir yang dipilih di UI, jadi
  // barnya bisa menyebut program yang tidak sedang dikerjakan sama sekali.
  const runningWorkoutName = useMemo(() => {
    const id = sessionToRun;
    const fallback = programs?.find(p => p.id === activeProgramId)?.name || 'Sesi Latihan Aktif';
    if (!id) return fallback;
    if (id === 'extra') return 'Latihan Ekstra';
    const day = history[activeWorkoutDate || selectedDate];
    const w = (day?.workouts || []).find(x => x.id === id || x.programId === id);
    if (w?.programId === 'adhoc') return w.programName || 'Latihan Ekstra';
    let progId = w?.programId || id;
    if (typeof progId === 'string' && progId.startsWith('projected_')) progId = resolveProjectedProgramId(progId);
    return programs?.find(p => p.id === progId)?.name || w?.programName || fallback;
  }, [sessionToRun, history, activeWorkoutDate, selectedDate, programs, activeProgramId]);

  // SATU pemilik untuk nama latihan di notifikasi. Sisi Kotlin memasang field ini lewat `?.let`
  // sehingga nilainya menetap sampai ditimpa; dulu satu-satunya penulis adalah ImmersiveWorkout,
  // jadi begitu immersive ditutup notifikasi membeku di latihan terakhir yang tampil di sana —
  // sering milik sesi lain. Sekarang diturunkan dari activeExerciseId, yang ikut berpindah baik
  // lewat kartu maupun lewat tombol "Latihan Berikutnya" di immersive.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    // JANGAN memanggil plugin sama sekali kalau tidak ada sesi berjalan. updateTimer memakai
    // context.startService(), dan di Android itu MENGHIDUPKAN service yang belum jalan — service
    // lahir dengan currentStartTime = 0 lalu memasang notifikasi "Sesi Latihan Aktif" berdurasi
    // sejak 1970 (496444:26:23). Lebih parah: notifikasinya setOngoing(true) tapi service-nya tidak
    // pernah startForeground, jadi stopTimer tidak bisa mencabutnya dan user pun tidak bisa
    // menggesernya. Mengosongkan exerciseName di sini juga tidak perlu — sesi yang berakhir sudah
    // dibersihkan stopTimer.
    if (!isWorkoutActive) return;
    const ex = (sessionExercises || []).find(e => String(e.id) === String(activeExerciseId));
    // Tidak ketemu = daftar sesi belum sempat dilaporkan WorkoutTab. Biarkan nama lama daripada
    // mengosongkannya bolak-balik tiap pindah tab.
    if (!ex?.name) return;
    WorkoutTimerPlugin.updateTimer({ exerciseName: ex.name }).catch(() => {});
  }, [activeExerciseId, sessionExercises, isWorkoutActive]);

  useEffect(() => {
    if (!restTargetTime) return;
    
    const timeRemainingMs = restTargetTime - Date.now();
    
    if (timeRemainingMs <= 0) return;

    const timeout = setTimeout(() => {
      // Kalau aplikasi sedang tidak terlihat, service native SUDAH membunyikan berkas yang sama
      // di stream ALARM (WorkoutTimerService.kt, gerbang !isAppActive) berikut getarannya. Ikut
      // membunyikannya di sini berarti dua kali: satu lantang lewat alarm, satu pelan lewat media.
      const dibunyikanNative = Capacitor.isNativePlatform() && document.visibilityState === 'hidden';
      if (dibunyikanNative) return;
      if (soundEnabled) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
      }
      // 'timerEnd', bukan 'success': ini timer istirahat habis, dan nadanya harus sama persis
      // dengan yang dibunyikan service native kalau aplikasi sedang ditutup.
      playSoundEffect('timerEnd', soundEnabled);

      // SENGAJA tidak mengirim isResting:false di sini. Dulu baris inilah yang membuat floating
      // timer LENYAP begitu hitungan mencapai nol: overlay native hanya tampil saat
      // (!isAppActive && isResting), jadi mematikan isResting menyembunyikannya seketika —
      // padahal justru itu momen user paling perlu melihatnya. Native sudah siap menampilkan
      // hitungan negatif (updateFloatingWidgetData menulis "-MM:SS" merah), tinggal dibiarkan
      // berjalan. Overlay baru ditutup saat user benar-benar mengakhiri istirahat, lewat
      // cleanup di bawah ketika restTargetTime jadi null.
    }, timeRemainingMs);

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        WorkoutTimerPlugin.updateTimer({ 
            isResting: true, 
            targetTime: restTargetTime, 
            workoutName: runningWorkoutName
        }).catch(console.warn);
    }

    return () => {
        clearTimeout(timeout);
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            WorkoutTimerPlugin.updateTimer({ 
                isResting: false, 
                targetTime: 0, 
                workoutName: runningWorkoutName
            }).catch(console.warn);
        }
    };
  }, [restTargetTime, soundEnabled, runningWorkoutName]);

  useEffect(() => {
     if (!isDataLoaded || !activityTargets) return;
     const todayStr = getLocalYMD(new Date());
     setHistory(prev => {
        const existingBio = prev[todayStr]?.bioData || {};
        
        if (
           existingBio.targetSteps === activityTargets.steps &&
           existingBio.targetActiveMinutes === (activityTargets.dailyActiveMinutes || (activityTargets.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 5) : 30)) &&
           existingBio.targetSleep === activityTargets.sleep &&
           existingBio.targetCalories === activityTargets.activityCalories
        ) {
           return prev;
        }
        
        return {
           ...prev,
           [todayStr]: {
               ...(prev[todayStr] || {}),
               bioData: {
                   ...existingBio,
                   targetSteps: activityTargets.steps,
                   targetActiveMinutes: activityTargets.dailyActiveMinutes || (activityTargets.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 5) : 30),
                   targetSleep: activityTargets.sleep,
                   targetCalories: activityTargets.activityCalories,
               }
           }
        };
     });
  }, [isDataLoaded, activityTargets]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const NOTIF_ID = 9999;

    const showNotification = async () => {
      try {
        if (Capacitor.getPlatform() === 'android') {
           const activeEx = (sessionExercises || []).find(e => String(e.id) === String(activeExerciseId));
           await WorkoutTimerPlugin.startTimer({ 
             startTime: workoutStartTime || Date.now(), 
             workoutName: runningWorkoutName,
             exerciseName: activeEx?.name || '',
             isResting: !!restTargetTime,
             targetTime: restTargetTime || 0
           });
        }
      } catch (err) {
        console.warn('Notification error:', err);
      }
    };

    const cancelNotification = async () => {
      try {
        if (Capacitor.getPlatform() === 'android') {
           await WorkoutTimerPlugin.stopTimer();
           // Pembersih notifikasi 9999 yang terlanjur yatim. stopForeground() cuma mencabut
           // notifikasi kalau service-nya memang pernah startForeground; notifikasi yang dipasang
           // lewat NotificationManager.notify() bertahan walau service-nya sudah mati, dan karena
           // setOngoing(true) user tidak bisa menggesernya sendiri. NotificationManager.cancel(id)
           // berlaku untuk seluruh aplikasi, jadi ini menyapunya dari mana pun asalnya.
           await LocalNotifications.cancel({ notifications: [{ id: 9999 }] }).catch(() => {});
        }
      } catch (err) {
        console.warn('Cancel notification error:', err);
      }
    };

    if (isWorkoutActive) {
      showNotification();
      return () => {
      };
    } else {
      cancelNotification();
    }
  }, [isWorkoutActive, workoutStartTime]);

  useEffect(() => {
    if (localStorage.getItem('__PREVIEW_USER')) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const cached = localStorage.getItem('__CACHED_UID');
      if (currentUser) {
        if (currentUser.uid !== cached) {
          setIsDataLoaded(false);
          setIsHistoryLoaded(false);
          setHistoryBaseline(null);
          setMainBaseline(null);
          localStorage.removeItem('__CACHED_HISTORY');
        }
        const profileCached = readCache('__CACHED_PROFILE', null);
        const resolvedName = currentUser.displayName || profileCached?.name || localStorage.getItem('__CACHED_USER_NAME') || '';
        setUser({
           uid: currentUser.uid, 
           email: currentUser.email, 
           name: resolvedName,
           photoURL: currentUser.photoURL || profileCached?.photoURL || localStorage.getItem('__CACHED_USER_PHOTO') || null
        });
        localStorage.setItem('__CACHED_UID', currentUser.uid);
        if (resolvedName) localStorage.setItem('__CACHED_USER_NAME', resolvedName);
        if (currentUser.photoURL) localStorage.setItem('__CACHED_USER_PHOTO', currentUser.photoURL);
      } else {
        localStorage.removeItem('__CACHED_UID');
        localStorage.removeItem('__CACHED_USER_NAME');
        localStorage.removeItem('__CACHED_USER_PHOTO');
        setHistoryBaseline(null);
        setMainBaseline(null);
        setUser(null);
        setIsDataLoaded(true);
        setIsHistoryLoaded(true);
        setHistory({});
        setPrograms(defaultPrograms);
        setExerciseLibrary(defaultMasterExercises);

        setExerciseLogs({});
        setExtraExercises([]);
        setSkippedExercises({});
        setUserApiKeys([]);

        setUserProfile(null);
        setTheme('dark');
        setLanguage('ID');
        setSoundEnabled(true);
        setDefaultRestTime(60);
        setUnits({ weight: 'kg', height: 'cm', distance: 'km', temp: 'c' });
        setGymProfiles([{ id: 'default', name: 'Logym', equipment: 'all', config: {} }]);
        setActiveGymId('default');
        setActivityTargets({ steps: 10000, dailyActiveMinutes: 30, sleep: 8 });
        setActivePlanIds(['custom']);
        setBiometricStandard('asia');
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const isUpdatingFromServer = useRef(false);
  const [hasParseError, setHasParseError] = useState(false);
  const pendingMainSaveRef = useRef(null);
  const pendingHistorySaveRef = useRef(null);
  const hasSyncedMainRef = useRef(false);
  const hasSyncedHistoryRef = useRef(false);
  const legacyMigrationRan = useRef(false); 
  const [cloudSaveError, setCloudSaveError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); 

  const mainBaselineRef = useRef(null);
  const takeServer = (key, prev) => {
     const base = mainBaselineRef.current?.[key];
     if (base === undefined) return true; 
     return stableStringify(prev) === base;
  };
  const setMainBaseline = (next) => { mainBaselineRef.current = next; };
  try { localStorage.removeItem('__CACHED_MAIN_BASE'); } catch { /* diabaikan */ }

  useEffect(() => {
    let unsubscribeMain = null;
    let unsubscribeHistory = null;

    hasSyncedMainRef.current = false;
    hasSyncedHistoryRef.current = false;

    if (localStorage.getItem('__PREVIEW_USER')) { setIsDataLoaded(true); setIsHistoryLoaded(true); return; }

    const activeUid = user?.uid;

    if (isAuthChecking || !activeUid) {
       return;
    }

    if (activeUid) {

      const currentYear = new Date().getFullYear().toString();
      const mainDocRef = doc(db, "logym_users", activeUid);
      const historyDocRef = doc(db, "logym_users", activeUid, "history_years", currentYear);

      unsubscribeMain = onSnapshot(mainDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          isUpdatingFromServer.current = true;
          try {
            const data = docSnap.data();

            if (data.isBanned) {
              localStorage.setItem('lyfit_banned_msg', 'Akun Anda telah dinonaktifkan secara permanen karena melanggar panduan komunitas kami.');
              signOut(auth);
              return;
            }

            if (data.history && !legacyMigrationRan.current) {
              legacyMigrationRan.current = true;
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

              const migratedBase = {};
              Object.keys(migratedHistory).forEach(d => { migratedBase[d] = dayFingerprint(migratedHistory[d]); });
              setHistoryBaseline(migratedBase);

              const historyByYear = {};
              Object.keys(migratedHistory).forEach(dateStr => {
                 const year = dateStr.substring(0, 4);
                 if (!historyByYear[year]) historyByYear[year] = {};
                 historyByYear[year][dateStr] = migratedHistory[dateStr];
              });
              
              for (const year of Object.keys(historyByYear)) {
                 const yearRef = doc(db, "logym_users", user.uid, "history_years", year);
                 await setDoc(yearRef, historyByYear[year], { merge: true });
              }
              
              await setDoc(mainDocRef, { history: deleteField() }, { merge: true });
              console.log("Migrasi sukses! History dipindahkan ke history_years.");
            }

            if (data.programs && Array.isArray(data.programs) && data.programs.length > 0) {
              const parsedPrograms = typeof data.programs === 'string' ? JSON.parse(data.programs) : data.programs;
              const DEFAULT_DAYS = { 'prog-1': ['Sel'], 'prog-2': ['Rab'], 'prog-3': ['Jum'], 'prog-4': ['Min'] };
              const migratedPrograms = parsedPrograms.map(p => ({
                ...p,
                restTime: p.restTime ?? 120,
                warmupVideoUrls: p.warmupVideoUrls ?? [],
                planId: p.planId ?? (DEFAULT_DAYS[p.id] ? 'custom' : null),
                planName: p.planName ?? (DEFAULT_DAYS[p.id] ? 'Program Default' : null),
                assignedDays: p.assignedDays ?? DEFAULT_DAYS[p.id] ?? [],
                exercises: p.exercises ? p.exercises.map(ex => {
                  if (ex.id === 121 && (ex.name === 'Pull Through' || ex.name === 'Cable Pull Through')) {
                    return canonicalizeExercise({ ...ex, name: 'Cable Hip Abduction', target: ['Glutes'] });
                  }
                  return canonicalizeExercise(ex);
                }) : []
              }));
              setPrograms(prev => (!takeServer('programs', prev) || JSON.stringify(prev) === JSON.stringify(migratedPrograms)) ? prev : migratedPrograms);
            }
            if (data.exerciseLibrary) {
              const parsedLib = typeof data.exerciseLibrary === 'string' ? JSON.parse(data.exerciseLibrary) : data.exerciseLibrary;
              const migratedLib = parsedLib.map(ex => {
                if (ex.id === 121 && (ex.name === 'Pull Through' || ex.name === 'Cable Pull Through')) {
                  return canonicalizeExercise({ ...ex, name: 'Cable Hip Abduction', target: ['Glutes'] });
                }
                return canonicalizeExercise(ex);
              });
              
              const existingIds = new Set(migratedLib.map(ex => ex.id));
              defaultMasterExercises.forEach(defaultEx => {
                  if (!existingIds.has(defaultEx.id)) {
                      migratedLib.push(defaultEx);
                  }
              });

              setExerciseLibrary(prev => (!takeServer('exerciseLibrary', prev) || JSON.stringify(prev) === JSON.stringify(migratedLib)) ? prev : migratedLib);
            }
            if (data.settings) {
              const parsedSettings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
              if (parsedSettings.theme) setTheme(parsedSettings.theme);
              if (parsedSettings.language) setLanguage(parsedSettings.language.toUpperCase());
              if (parsedSettings.soundEnabled !== undefined) setSoundEnabled(parsedSettings.soundEnabled);
              if (parsedSettings.healthConnectEnabled !== undefined) setHealthConnectEnabled(parsedSettings.healthConnectEnabled);
              if (parsedSettings.defaultRestTime) setDefaultRestTime(parsedSettings.defaultRestTime);
              if (parsedSettings.warmupVideos) setWarmupVideos(prev => takeServer('warmupVideos', prev) ? parsedSettings.warmupVideos : prev);
              if (parsedSettings.cooldownVideos) setCooldownVideos(prev => takeServer('cooldownVideos', prev) ? parsedSettings.cooldownVideos : prev);
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
                          return { ...g, name: 'Logym' };
                      }
                      return g;
                  });
                  setGymProfiles(prev => takeServer('gymProfiles', prev) ? migratedProfiles : prev);
              }
              if (parsedSettings.activeGymId) setActiveGymId(prev => takeServer('activeGymId', prev) ? parsedSettings.activeGymId : prev);
              if (parsedSettings.activityTargets) setActivityTargets(prev => takeServer('activityTargets', prev) ? parsedSettings.activityTargets : prev);

              setActivePlanIds(prev => {
                 if (!takeServer('activePlanIds', prev)) return prev;
                 if (parsedSettings.activePlanIds) return parsedSettings.activePlanIds;
                 if (parsedSettings.activePlanId) return [parsedSettings.activePlanId];
                 return ['custom']; 
              });

              setUserProfile(prev => {
                 if (!takeServer('userProfile', prev)) return prev;
                 return parsedSettings.userProfile || null;
              });
              
              let migratedKeys = parsedSettings.userApiKeys || [];
              if (migratedKeys.length === 0) {
                  if (parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userApiKey);
                  if (parsedSettings.userGeminiApiKey && parsedSettings.userGeminiApiKey !== parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userGeminiApiKey);
              }
              migratedKeys = migratedKeys.filter(k => k && k.trim());
              setUserApiKeys(prev => takeServer('userApiKeys', prev) ? migratedKeys : prev);

              setLogyPersona(parsedSettings.logyPersona || 'santai');
              setLogyCustomInstruction(parsedSettings.logyCustomInstruction || '');
              setLogyMemory(prev => takeServer('logyMemory', prev) ? (Array.isArray(parsedSettings.logyMemory) ? parsedSettings.logyMemory : []) : prev);
            }
            if (data.userAchievements) setUserAchievements(data.userAchievements);
            setUser(prev => {
                if (!prev) return prev;
                const next = {
                    ...prev,
                    ...(data.lastPhotoUpdate !== undefined && { lastPhotoUpdate: data.lastPhotoUpdate }),
                    ...(data.customCardBg !== undefined && { customCardBg: data.customCardBg }),
                    ...(data.customCardSettings !== undefined && { customCardSettings: data.customCardSettings }),
                    ...(data.uploadedPhotos !== undefined && { uploadedPhotos: data.uploadedPhotos }),
                    ...(data.uploadedBackgrounds !== undefined && { uploadedBackgrounds: data.uploadedBackgrounds }),
                    ...(data.cardBgUploads !== undefined && { cardBgUploads: data.cardBgUploads }),
                };
                return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
            });
            if (data.onboardingCompleted && user.uid) {
              localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
            }
          } catch (err) {
            console.error("Parse Error saat load data utama (MENCEGAH AUTO-SAVE UNTUK MENGHINDARI DATA HILANG):", err);
            setHasParseError(true);
          }

          setIsDataLoaded(true);
          if (!docSnap.metadata.fromCache) hasSyncedMainRef.current = true;
          setTimeout(() => { isUpdatingFromServer.current = false; }, 3000);
        } else {
          const alreadyDone = user?.uid ? localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true' : false;
          if (!alreadyDone) {
            setIsFreshAccount(true);
          }
          setIsDataLoaded(true);
          if (!docSnap.metadata.fromCache) hasSyncedMainRef.current = true;
        }
      }, (error) => {
        console.error("Gagal menarik data utama (transport):", error);
        setCloudSaveError(`Koneksi ke cloud bermasalah: ${error?.message || error}. Perubahan disimpan lokal dan dikirim ulang otomatis.`);
        setIsDataLoaded(true);
      });

      unsubscribeHistory = onSnapshot(historyDocRef, (docSnap) => {
        if (docSnap.exists()) {
           isUpdatingFromServer.current = true;
           try {
             const data = docSnap.data();

             setHistory(prev => {
                const { next, baseline, kept, blockedDeletes } = reconcileHistory(prev, data, lastSavedHistoryJson.current, docSnap.id);
                setHistoryBaseline(baseline);
                if (kept.length > 0) console.log('[Sync] Perubahan lokal dipertahankan, belum terkirim:', kept);
                if (blockedDeletes?.length > 0) {
                   console.error('[Sync] Penghapusan massal DITAHAN:', blockedDeletes);
                   setCloudSaveError(`Server mengirim penghapusan ${blockedDeletes.length} tanggal sekaligus — ditahan karena mencurigakan. Data di perangkat ini masih utuh. JANGAN hapus aplikasi; laporkan dulu.`);
                }
                return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
             });
           } catch (err) {
             console.error("Parse Error saat load history tahun ini:", err);
             setHasParseError(true);
           }
           setTimeout(() => { isUpdatingFromServer.current = false; }, 3000);
        } else if (!docSnap.metadata.fromCache) {
           const tahun = docSnap.id;
           const punyaLokal = Object.keys(historyMirror.current || {}).filter(d => d.startsWith(tahun));
           if (punyaLokal.length > 0) {
              console.warn(`[Self-heal] Dokumen ${tahun} hilang di server — mengunggah ulang ${punyaLokal.length} tanggal dari perangkat ini.`);
              const base = { ...(lastSavedHistoryJson.current || {}) };
              punyaLokal.forEach(d => { delete base[d]; });
              setHistoryBaseline(base);
              setCloudSaveError(`Data ${tahun} hilang di server — sedang diunggah ulang dari perangkat ini (${punyaLokal.length} tanggal). Biarkan aplikasi terbuka sampai selesai.`);
           }
        }
        if (!docSnap.metadata.fromCache) hasSyncedHistoryRef.current = true;
        setIsHistoryLoaded(true);
      }, (error) => {
         console.error("Gagal menarik history tahun ini (transport):", error);
         setCloudSaveError(`Koneksi ke cloud bermasalah: ${error?.message || error}. Perubahan disimpan lokal dan dikirim ulang otomatis.`);
         setIsHistoryLoaded(true);
      });

      const prevYear = String(Number(currentYear) - 1);
      getDoc(doc(db, "logym_users", activeUid, "history_years", prevYear))
        .then(snap => {
          if (!snap.exists()) return;
          setHistory(prev => {
            const { next, baseline, kept } = reconcileHistory(prev, snap.data(), lastSavedHistoryJson.current, prevYear);
            setHistoryBaseline(baseline);
            if (kept.length > 0) console.log(`[Sync] ${prevYear}: perubahan lokal dipertahankan:`, kept);
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
        })
        .catch(e => console.warn(`Gagal menarik history ${prevYear}:`, e));

    } else {
      setIsDataLoaded(true);
      setIsHistoryLoaded(true);
    }

    return () => {
      if (unsubscribeMain) unsubscribeMain();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, [user?.uid, isAuthChecking]);

  useEffect(() => {
    if (user && isDataLoaded && !hasParseError) {
      let retryTimer = null;
      const attemptSave = () => {
        if (isUpdatingFromServer.current) {
          retryTimer = setTimeout(attemptSave, 500);
          return;
        }
        const mainDocRef = doc(db, "logym_users", user.uid);

        const localMain = {
          programs, exerciseLibrary, userAchievements,
          theme, language, soundEnabled, healthConnectEnabled, defaultRestTime, warmupVideos,
          cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard,
          unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, userProfile,
          userApiKeys: (userApiKeys || []).filter(k => k && k.trim()),
          logyPersona, logyCustomInstruction, logyMemory
        };
        const { changed, nextBaseline, changedKeys } = diffFields(localMain, mainBaselineRef.current);
        if (changedKeys.length === 0) return;

        // Menunggu snapshot pertama — TAPI hanya setelah tahu memang ada yang perlu ditulis.
        //
        // Versi sebelumnya menyalakan status 'syncing' sebelum diff dihitung, jadi ikon sinkron
        // berputar tanpa henti walau tidak ada satu pun perubahan tertunda. Berputar selamanya
        // untuk pekerjaan yang tidak ada adalah alarm palsu, dan alarm palsu membuat alarm yang
        // sungguhan berhenti dipercaya. Sekarang berputar hanya kalau ada yang benar-benar
        // menunggu dikirim.
        if (!hasSyncedMainRef.current) {
          retryTimer = setTimeout(attemptSave, 2000);
          setSyncStatus('syncing');
          return;
        }

        const { programs: pChanged, exerciseLibrary: lChanged, userAchievements: aChanged, ...settingsChanged } = changed;
        const payload = { updatedAt: new Date().toISOString() };
        if (pChanged !== undefined) payload.programs = pChanged;
        if (lChanged !== undefined) payload.exerciseLibrary = lChanged;
        if (aChanged !== undefined) payload.userAchievements = aChanged;
        if (Object.keys(settingsChanged).length > 0) payload.settings = settingsChanged;

        setSyncStatus('syncing');
        // BATAS WAKTU, sama seperti jalur history. Tanpa ini, `setDoc` yang tersangkut di antrean
        // offline Firestore tidak pernah resolve DAN tidak pernah reject — statusnya menggantung
        // di 'syncing' selamanya, tanpa pernah jadi error yang bisa dilihat atau dilaporkan user.
        // Ikon yang berputar tanpa akhir terlihat sama persis dengan aplikasi yang sedang bekerja.
        const peringatanTertunda = setTimeout(() => setSyncStatus('error'), 15000);
        const prevBaseline = mainBaselineRef.current;
        setMainBaseline(nextBaseline);
        const safePayload = cleanFirestoreData(payload);
        try {
          return setDoc(mainDocRef, safePayload, { merge: true })
            .then(() => {
              clearTimeout(peringatanTertunda);
              setCloudSaveError(null);
              setSyncStatus('synced');
            })
            .catch(err => {
              clearTimeout(peringatanTertunda);
              console.error("Auto-save Cloud gagal:", err);
              setSyncStatus('error');
              setCloudSaveError(err?.message || String(err));
              setMainBaseline(prevBaseline); 
            });
        } catch (err) {
          console.error("Auto-save Cloud gagal (sync):", err);
          setSyncStatus('error');
          setCloudSaveError(err?.message || String(err));
          setMainBaseline(prevBaseline);
        }
      };
      const timer = setTimeout(attemptSave, 2000);
      pendingMainSaveRef.current = { timer, attemptSave };

      return () => { clearTimeout(timer); if (retryTimer) clearTimeout(retryTimer); pendingMainSaveRef.current = null; };
    }
  }, [programs, exerciseLibrary, theme, language, soundEnabled, healthConnectEnabled, defaultRestTime, warmupVideos, cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard, unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, user?.uid, isDataLoaded, userAchievements, userProfile, userApiKeys, logyPersona, logyCustomInstruction, logyMemory]);

  const lastSavedHistoryJson = useRef(migrateBaseline(readCache('__CACHED_HISTORY_BASE', null)));
  const setHistoryBaseline = (next) => {
     lastSavedHistoryJson.current = next;
     if (!next) { try { localStorage.removeItem('__CACHED_HISTORY_BASE'); } catch { /* diabaikan */ } return; }
     if (!writeCache('__CACHED_HISTORY_BASE', next)) {
        setCloudSaveError('Penyimpanan lokal penuh — penanda sinkronisasi tidak bisa disimpan. Kosongkan ruang penyimpanan sebelum latihan lagi dari perangkat lain.');
     }
  };
  const historyBurstStart = useRef(0);
  const HISTORY_SAVE_MAX_WAIT = 8000;

  useEffect(() => {
    if (user && isDataLoaded && !hasParseError) {
      let retryTimer = null;
      const attemptSave = () => {
        if (isUpdatingFromServer.current) {
          retryTimer = setTimeout(attemptSave, 500);
          return;
        }
        if (!hasSyncedHistoryRef.current) {
          // Penjaganya benar — menulis sebelum snapshot pertama tiba bisa menimpa sesi device
          // lain (invarian 1). Yang salah dulu adalah `return` POLOS: efek ini cuma dijalankan
          // ulang kalau `history` berubah lagi, dan `flush` di pagehide memanggil attemptSave
          // yang sama lalu tertahan di penjaga ini juga. Jadi sesi yang disimpan sebelum
          // snapshot pertama sampai (jaringan lambat, offline, atau app baru dibuka lalu
          // langsung latihan) TIDAK PERNAH terkirim — tanpa error, tanpa banner, datanya hidup
          // cuma di localStorage perangkat itu. Persis gejala 23/08/2026: sesi ada di HP,
          // tidak ada di web app, tidak ada peringatan apa pun.
          //
          // Menunggu itu benar; menyerah tidak. TAPI hanya kalau memang ada yang menunggu:
          // memutar ikon sinkron tanpa henti untuk pekerjaan yang tidak ada adalah alarm palsu,
          // dan alarm palsu membuat alarm sungguhan berhenti dipercaya. Kalau tidak ada tanggal
          // yang berbeda dari baseline, tidak ada yang perlu ditulis — diam saja, dan jangan
          // menjadwalkan percobaan ulang sama sekali.
          const dasar = lastSavedHistoryJson.current || {};
          const adaYangMenunggu = Object.keys(history).some(d => dasar[d] !== dayFingerprint(history[d]));
          if (!adaYangMenunggu) return;
          retryTimer = setTimeout(attemptSave, 2000);
          setSyncStatus('syncing');
          return;
        }

        const baseline = lastSavedHistoryJson.current || {};
        const newBaseline = { ...baseline };
        const dirtyByYear = {};
        const deletedDates = [];

        Object.keys(history).forEach(dateStr => {
           const json = dayFingerprint(history[dateStr]);
           if (baseline[dateStr] === json) return; 

           const year = dateStr.substring(0, 4);
           if (!dirtyByYear[year]) dirtyByYear[year] = {};

           if (history[dateStr] && history[dateStr]._delete) {
               dirtyByYear[year][dateStr] = deleteField();
               deletedDates.push(dateStr);
           } else if (history[dateStr] && typeof history[dateStr] === 'object') {
               const { _activeSession, ...dayData } = history[dateStr];
               dirtyByYear[year][dateStr] = {
                  ...dayData,
                  ...(dayData.workouts !== undefined ? {
                     workouts: workoutsToMap(
                        dayData.workouts,
                        workoutIdsFromBaseline(baseline[dateStr]),
                        deleteField()
                     )
                  } : {}),
                  ...(dayData.bioData ? { bioData: stripLomealOwned(dayData.bioData) } : {}),
                  _activeSession: deleteField()
               };
           } else {
               dirtyByYear[year][dateStr] = history[dateStr];
           }
           newBaseline[dateStr] = json;
        });

        const dirtyYears = Object.keys(dirtyByYear);
        if (dirtyYears.length === 0) return; 

        dirtyYears.forEach(year => {
           const yearBytes = Object.keys(history)
              .filter(d => d.startsWith(year))
              .reduce((n, d) => n + serializeDay(history[d]).length, 0);
           if (yearBytes > 800_000) {
              console.warn(`[Ukuran] history_years/${year} ≈ ${Math.round(yearBytes / 1024)} KB — mendekati batas 1 MiB Firestore.`);
              setCloudSaveError(`Data tahun ${year} sudah ${Math.round(yearBytes / 1024)} KB, mendekati batas 1 MB per dokumen. Di atas batas itu latihan berhenti tersimpan — laporkan ini supaya datanya bisa diringkas.`);
           }
        });

        const commitBaselineFor = (year) => {
           const base = { ...(lastSavedHistoryJson.current || {}) };
           Object.keys(dirtyByYear[year]).forEach(d => { base[d] = newBaseline[d]; });
           setHistoryBaseline(base);
        };

        setSyncStatus('syncing');
        const pendingWarn = setTimeout(() => {
           setSyncStatus('error');
        }, 15000);

        const failedYears = new Set();
        const writes = dirtyYears.map(year => {
           const yearRef = doc(db, "logym_users", user.uid, "history_years", year);
           const onFail = (err, label) => {
              failedYears.add(year);
              console.error(`Auto-save History ${year} gagal${label}:`, err);
              setSyncStatus('error');
              setCloudSaveError(err?.message || String(err));
           };
           try {
              const safeYearData = cleanFirestoreData(dirtyByYear[year]);
              return setDoc(yearRef, safeYearData, { merge: true })
                 .then(() => {
                    clearTimeout(pendingWarn);
                    commitBaselineFor(year); 
                    setCloudSaveError(null);
                    setSyncStatus('synced');
                 })
                 .catch(err => onFail(err, ''));
           } catch (err) {
              onFail(err, ' (sync)');
              return Promise.resolve();
           }
        });
        historyBurstStart.current = 0;
        return Promise.all(writes).then(() => {
           clearTimeout(pendingWarn);

           try {
              const todayStr = getLocalYMD(new Date());
              const sesiSelesai = Object.values(history)
                .reduce((n, d) => n + (d?.workouts || []).filter(w => w?.status === 'completed').length, 0);
              const todayFingerprint = dayFingerprint(history[todayStr]);
              const backupKey = `${todayStr}:${sesiSelesai}:${todayFingerprint}`;
              const memoKey = `lyfit_last_backup_key_${user.uid}`;
              if (localStorage.getItem(memoKey) !== backupKey && Object.keys(history).length > 0 && sesiSelesai > 0) {
                const backupDocId = `${todayStr}_${Date.now()}`;
                const backupRef = doc(db, 'logym_users', user.uid, 'history_backups', backupDocId);
                setDoc(backupRef, {
                  payload: JSON.stringify(history),
                  timestamp: Date.now(),
                  sessions: sesiSelesai,
                  expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                })
                  .then(() => {
                    localStorage.setItem(memoKey, backupKey);
                    console.log(`[Auto-Backup] Tersimpan: ${backupDocId} (${sesiSelesai} sesi), kedaluwarsa 7 hari.`);
                  })
                  .catch(err => console.error('[Auto-Backup] Gagal menyimpan backup:', err));
              }
            } catch (e) {
              console.error('[Auto-Backup] Error:', e);
            }

           const sent = deletedDates.filter(d => !failedYears.has(d.substring(0, 4)));
           if (sent.length === 0) return;
           setHistory(prev => {
              const next = { ...prev };
              let changed = false;
              sent.forEach(d => { if (next[d]?._delete) { delete next[d]; changed = true; } });
              return changed ? next : prev;
           });
           const cleaned = { ...(lastSavedHistoryJson.current || {}) };
           sent.forEach(d => { delete cleaned[d]; });
           setHistoryBaseline(cleaned);
        });
      };
      if (!historyBurstStart.current) historyBurstStart.current = Date.now();
      const elapsed = Date.now() - historyBurstStart.current;
      const timer = setTimeout(attemptSave, elapsed >= HISTORY_SAVE_MAX_WAIT ? 0 : 2000);
      pendingHistorySaveRef.current = { timer, attemptSave };

      return () => { clearTimeout(timer); if (retryTimer) clearTimeout(retryTimer); pendingHistorySaveRef.current = null; };
    }
  }, [history, user, isDataLoaded]);

  // Sinkronisasi ringkasan aktivitas hari ini ke Lomeal via dokumen root `logym_users/{uid}`
  const lastLogymSyncRef = useRef('');
  useEffect(() => {
    if (!user?.uid || !isDataLoaded) return;
    try {
      const syncPayload = buildLogymSyncPayload(history, userProfile?.weight);
      const syncStr = JSON.stringify(syncPayload);
      if (lastLogymSyncRef.current === syncStr) return;

      const timer = setTimeout(() => {
        lastLogymSyncRef.current = syncStr;
        const safePayload = cleanFirestoreData(syncPayload);
        setDoc(doc(db, 'logym_users', user.uid), safePayload, { merge: true })
          .then(() => {
            console.log('[LogymSync] Terkirim ke Lomeal:', syncPayload.logymSync.today);
          })
          .catch(err => console.warn('[LogymSync] Gagal auto-sync ke Lomeal:', err));
      }, 1000);

      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('[LogymSync] Error build payload:', e);
    }
  }, [history, user?.uid, isDataLoaded, userProfile?.weight]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'visible') return;
      [pendingHistorySaveRef, pendingMainSaveRef, pendingCloudSessionRef].forEach(ref => {
        if (!ref.current) return;
        clearTimeout(ref.current.timer);
        try { ref.current.attemptSave(); } catch (e) { console.warn('flush gagal:', e); }
      });
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const historyRef = useRef(history);
  const poppedBadgesRef = useRef(new Set());

  useEffect(() => {
    if (history === historyRef.current || !isDataLoaded) return;
    const timer = setTimeout(() => {
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
      const isRetroactiveSpam = userAchievements.length === 0 && Object.keys(history).length > 1;
      
      const newlyEarned = [];
      newBadges.forEach(b => {
          if (!poppedBadgesRef.current.has(b.id)) {
              newlyEarned.push(b);
              poppedBadgesRef.current.add(b.id);
          }
      });

      if (newlyEarned.length > 0) {
        if (!isRetroactiveSpam) {
          if (soundEnabled) {
            const audio = new Audio('/cheer.wav');
            audio.volume = 1.0;
            audio.play().catch(() => {});
          }
          setUnlockedAchievementsPopup(prev => [...prev, ...newlyEarned]);
        }
        setUserAchievements(prev => {
          const newSet = new Set([...prev, ...newlyEarned.map(b => b.id)]);
          return Array.from(newSet);
        });
      }
      historyRef.current = history;
    }, 800);
    return () => clearTimeout(timer);
  }, [history, isDataLoaded, userAchievements, soundEnabled]);

  useEffect(() => {
    const handleShowAchievement = (e) => {
      const detail = e.detail;
      if (!detail || !detail.id) return;
      if (poppedBadgesRef.current.has(detail.id)) return;
      poppedBadgesRef.current.add(detail.id);
      
      if (soundEnabled) {
        const audio = new Audio('/cheer.wav');
        audio.volume = 1.0;
        audio.play().catch(() => {});
      }
      setUnlockedAchievementsPopup(prev => [...prev, detail]);
    };
    window.addEventListener('show-achievement', handleShowAchievement);
    return () => window.removeEventListener('show-achievement', handleShowAchievement);
  }, [soundEnabled]);

  useEffect(() => {
    if (contentTab === 'workout') {
      setHistory(prev => {
        const dayData = prev[selectedDate];
        if (dayData && dayData.workouts) {
          // Efek ini juga jalan cuma gara-gara pindah tab. Tanpa cek ini, history diganti
          // objek baru → seluruh useMemo yang bergantung padanya dihitung ulang tepat saat
          // animasi BottomNav berjalan, dan navnya kelihatan macet di tengah.
          const cur = dayData._activeSession;
          if (cur && cur.exerciseLogs === exerciseLogs && cur.skippedExercises === skippedExercises && cur.extraExercises === extraExercises) return prev;
          return {
            ...prev,
            [selectedDate]: { ...dayData, _activeSession: { exerciseLogs, skippedExercises, extraExercises } }
          };
        }
        return prev;
      });
    }
  }, [exerciseLogs, skippedExercises, extraExercises, contentTab, selectedDate]);

  const deviceId = useRef(null);
  if (!deviceId.current) {
    let id = localStorage.getItem('__DEVICE_ID');
    if (!id) {
      id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      try { localStorage.setItem('__DEVICE_ID', id); } catch { /* diabaikan */ }
    }
    deviceId.current = id;
  }
  const cloudSessionRef = () => (user?.uid ? doc(db, 'logym_users', user.uid, 'active_sessions', deviceId.current) : null);
  const lastCloudSessionPush = useRef(0);
  const pendingCloudSessionRef = useRef(null);

  useEffect(() => {
    if (!user?.uid || !isDataLoaded) return;
    if (Object.keys(exerciseLogs).length === 0 && Object.keys(skippedExercises).length === 0 && extraExercises.length === 0) return;
    const payload = { date: selectedDate, savedAt: Date.now(), exerciseLogs, skippedExercises, extraExercises };
    try {
      localStorage.setItem(`lyfit_active_session_${user.uid}`, JSON.stringify(payload));
    } catch { /* storage penuh/diblokir — abaikan, sesi tetap jalan di memori */ }

    // DEBOUNCE EKOR, bukan throttle kepala. Versi lama: `if (now - last < 30_000) return` —
    // perubahannya tidak ditunda, tapi DIBUANG, dan tidak ada yang menjadwalkannya lagi. Artinya
    // set terakhir yang dicentang sebelum app ditutup atau crash sangat mungkin tidak pernah
    // sampai ke cloud sama sekali, betapapun lamanya sesi itu berjalan. Yang paling akhir justru
    // yang paling rawan hilang.
    //
    // Sekarang setiap centang menjadwalkan tulisan 2 detik ke depan, dan setiap centang baru
    // menggeser jadwalnya. Yang tertulis SELALU keadaan terakhir, dan tidak ada satu pun
    // perubahan yang berakhir tanpa jadwal. Tidak sekali-tulis-per-centang: mencentang 40 set
    // beruntun tetap satu tulisan, bukan 40.
    const kirim = () => {
      const ref = cloudSessionRef();
      const p = pendingCloudSessionRef.current?.payload;
      if (!ref || !p) return;
      lastCloudSessionPush.current = Date.now();
      return setDoc(ref, {
        deviceId: deviceId.current,
        date: p.date,
        savedAt: p.savedAt,
        payload: JSON.stringify({
          exerciseLogs: p.exerciseLogs,
          skippedExercises: p.skippedExercises,
          extraExercises: p.extraExercises,
        }),
      }).catch(e => console.warn('[Sesi] gagal menulis sesi berjalan ke cloud:', e?.message || e));
    };
    if (pendingCloudSessionRef.current?.timer) clearTimeout(pendingCloudSessionRef.current.timer);
    const timer = setTimeout(kirim, 2000);
    // Bentuk { timer, attemptSave } sengaja sama dengan pendingHistorySaveRef/pendingMainSaveRef
    // supaya efek flush di bawah bisa memperlakukan ketiganya identik saat app disembunyikan.
    pendingCloudSessionRef.current = { timer, attemptSave: kirim, payload };
    return () => clearTimeout(timer);
  }, [exerciseLogs, skippedExercises, extraExercises, selectedDate, user?.uid, isDataLoaded]);

  const clearCloudSession = () => {
    const ref = cloudSessionRef();
    if (ref) deleteDoc(ref).catch(() => {});
  };

  const TIMER_KEY = user?.uid ? `lyfit_active_timer_${user.uid}` : null;
  useEffect(() => {
    if (!TIMER_KEY) return;
    if (!isWorkoutActive || !workoutStartTime) { localStorage.removeItem(TIMER_KEY); return; }
    const beat = () => {
      try {
        localStorage.setItem(TIMER_KEY, JSON.stringify({ startTime: workoutStartTime, savedAt: Date.now(), date: selectedDate, workoutDate: activeWorkoutDate, activeExerciseId }));
      } catch { /* storage penuh/diblokir — sesi tetap jalan di memori */ }
    };
    beat();
    const id = setInterval(beat, 15 * 1000);
    return () => clearInterval(id);
  }, [isWorkoutActive, workoutStartTime, selectedDate, activeWorkoutDate, activeExerciseId, TIMER_KEY]);

  const timerRestored = useRef(false);
  useEffect(() => {
    if (!TIMER_KEY || timerRestored.current || !isDataLoaded) return;
    timerRestored.current = true;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const startTime = Number(saved?.startTime) || 0;
      const savedAt = Number(saved?.savedAt) || 0;
      const ageHours = (Date.now() - savedAt) / 3600000;
      if (!startTime || !savedAt || ageHours > 24) {
        localStorage.removeItem(TIMER_KEY);
        return;
      }
      const secs = recoveredWorkoutSeconds(startTime, savedAt);
      if (secs > 0) setResumeDurationSecs(secs);
      // Pulihkan latihan yang sedang dikerjakan, supaya sesi yang dilanjutkan setelah aplikasi
      // ditutup kembali ke tempat user berhenti — bukan ke latihan pertama.
      if (saved.activeExerciseId != null) setActiveExerciseId(saved.activeExerciseId);
      if (saved.workoutDate) setActiveWorkoutDate(saved.workoutDate);
    } catch { localStorage.removeItem(TIMER_KEY); }
  }, [isDataLoaded, TIMER_KEY]);

  const activeSessionRestored = useRef(false);
  useEffect(() => { activeSessionRestored.current = false; }, [user?.uid]);
  // Seberapa "berisi" sebuah sesi: jumlah set yang benar-benar tercatat. Dipakai untuk memilih
  // sesi mana yang menang saat beberapa perangkat sama-sama punya sesi hari ini.
  const bobotSesi = (payload) => {
    let n = 0;
    Object.values(payload?.exerciseLogs || {}).forEach(sets => {
      Object.values(sets || {}).forEach(s => { if (s && (s.done || Number(s.w) > 0 || Number(s.r) > 0 || Number(s.d) > 0)) n++; });
    });
    return n;
  };

  const restoreRemoteSession = async (localSavedAt, localPayload = null) => {
    if (!user?.uid) return;
    let docs = [];
    try {
      docs = (await getDocs(collection(db, 'logym_users', user.uid, 'active_sessions'))).docs;
    } catch (e) {
      console.warn('[Sesi] gagal membaca sesi perangkat lain:', e?.message || e);
      return;
    }
    // PEMENANGNYA YANG PALING BERISI, baru yang paling baru.
    //
    // Dulu murni `savedAt` terbaru. Kejadian nyata: HP mencatat 5 latihan (19:09), lalu PWA yang
    // cuma punya 1 latihan menyimpan sesinya jam 19:42 — dan sesi 1-latihan itu menang, menimpa
    // tampilan sesi HP yang jauh lebih lengkap. Set yang sudah dikerjakan hilang dari layar
    // sebelum sempat disimpan jadi riwayat.
    const kandidat = docs
      .map(d => d.data())
      .filter(s => s && s.deviceId !== deviceId.current && s.date === getLocalYMD(new Date()))
      .filter(s => Date.now() - (Number(s.savedAt) || 0) < 12 * 60 * 60 * 1000)
      .map(s => { let p = null; try { p = JSON.parse(s.payload || '{}'); } catch {} return { ...s, _p: p, _bobot: bobotSesi(p) }; })
      .filter(s => s._p)
      .sort((a, b) => (b._bobot - a._bobot) || ((b.savedAt || 0) - (a.savedAt || 0)))[0];
    if (!kandidat) return;

    // Sesi lokal hanya kalah kalau kandidatnya BENAR-BENAR lebih berisi; kalau sama berisinya,
    // barulah yang lebih baru menang.
    const bobotLokal = bobotSesi(localPayload);
    if (kandidat._bobot < bobotLokal) return;
    if (kandidat._bobot === bobotLokal && localSavedAt && kandidat.savedAt <= localSavedAt) return;

    const parsed = kandidat._p;
    if (Object.keys(parsed.exerciseLogs || {}).length === 0) return;

    setHistory(prev => {
      const day = prev[kandidat.date] || { workouts: [] };
      return {
        ...prev,
        [kandidat.date]: {
          ...day,
          _activeSession: {
            exerciseLogs: parsed.exerciseLogs || {},
            skippedExercises: parsed.skippedExercises || {},
            extraExercises: parsed.extraExercises || [],
          },
        },
      };
    });
    const jam = new Date(kandidat.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setShowRestoreToast(`Sesi latihan dari perangkat lain (terakhir tersimpan ${jam}) dilanjutkan.`);
    setTimeout(() => setShowRestoreToast(''), 5000);
  };

  useEffect(() => {
    if (!isDataLoaded || !isHistoryLoaded || !user?.uid || activeSessionRestored.current) return;
    try {
      const raw = localStorage.getItem(`lyfit_active_session_${user.uid}`);
      if (!raw) { activeSessionRestored.current = true; restoreRemoteSession(0); return; }
      const saved = JSON.parse(raw);
      if (!saved?.date || Date.now() - (saved.savedAt || 0) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`lyfit_active_session_${user.uid}`);
        activeSessionRestored.current = true;
        restoreRemoteSession(0);
        return;
      }
      activeSessionRestored.current = true;
      // Isi sesi lokal ikut dikirim: penentunya sekarang seberapa berisi, bukan cuma yang terbaru.
      restoreRemoteSession(saved.savedAt || 0, saved);
      setHistory(prev => {
        const day = prev[saved.date] || { workouts: [] };
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
      restoreRemoteSession(0);
    }
  }, [isDataLoaded, isHistoryLoaded, user?.uid]);

  useEffect(() => {
    if (!isHistoryLoaded || Object.keys(history).length === 0) return;
    const LOG_FIELDS = ['heartRateLog', 'oxygenSaturationLog', 'bloodPressureLog'];
    const timer = setTimeout(() => {
      setHistory(prev => {
        const next = { ...prev };
        let healed = 0;
        let pointsDropped = 0;
        Object.keys(prev).forEach(ymd => {
          const bio = prev[ymd]?.bioData;
          if (!bio) return;
          const patch = {};
          LOG_FIELDS.forEach(f => {
            const capped = capIntradayLog(bio[f]);
            if (capped !== bio[f]) { patch[f] = capped; pointsDropped += bio[f].length - capped.length; }
          });
          if (Object.keys(patch).length === 0) return;
          next[ymd] = { ...prev[ymd], bioData: { ...bio, ...patch } };
          healed++;
        });
        if (healed === 0) return prev; 
        console.log(`[Heal] ${healed} hari diringkas, ${pointsDropped} titik log dibuang.`);
        return next;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [isHistoryLoaded, history]);

  const historyBackfillDone = useRef(false);
  useEffect(() => { historyBackfillDone.current = false; }, [user?.uid]);
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

  const hcPingPongCleanupDone = useRef(false);
  useEffect(() => { hcPingPongCleanupDone.current = false; }, [user?.uid]);
  useEffect(() => {
    if (!isHistoryLoaded || hcPingPongCleanupDone.current) return;
    if (Object.keys(history).length === 0) return;
    hcPingPongCleanupDone.current = true;

    setHistory(prev => {
      let changed = false;
      const next = { ...prev };
      Object.keys(prev).forEach(dateStr => {
        const day = prev[dateStr];
        if (!day?.workouts || day.workouts.length < 2) return;

        const nativeWorkouts = day.workouts.filter(w => !w.id?.startsWith('hc_'));
        if (nativeWorkouts.length === 0) return;

        const filtered = day.workouts.filter(w => {
          if (!w.id?.startsWith('hc_')) return true; 
          const isEmpty = (!w.exercises || w.exercises.length === 0) && (!w.log || Object.keys(w.log).length === 0);
          if (!isEmpty) return true; 
          const [hcH, hcM] = (w.timestamp || '00:00').split(':').map(Number);
          const isDuplicate = nativeWorkouts.some(nat => {
            if (!nat.timestamp) return false;
            const [nH, nM] = nat.timestamp.split(':').map(Number);
            return Math.abs((hcH * 60 + hcM) - (nH * 60 + nM)) < 45;
          });
          return !isDuplicate; 
        });

        if (filtered.length !== day.workouts.length) {
          changed = true;
          next[dateStr] = { ...day, workouts: filtered };
        }
      });
      return changed ? next : prev;
    });
  }, [isHistoryLoaded, user?.uid]);

  // SEKALI JALAN: tidur yang terlanjur tersimpan di tanggal MULAI dipindah ke tanggal BANGUN.
  // Sebelum perbaikan di sleepPerDay (healthConnect.js), sesi 23:00 -> 07:00 dikelompokkan ke
  // tanggal kemarin, jadi grafik selalu bolong satu hari di ujung. Sync HC berikutnya menulis ke
  // tanggal yang benar tapi TIDAK menghapus sisa di tanggal lama (dan hari yang sudah tidak lagi
  // disimpan Health Connect tidak pernah tersentuh), jadi pembersihannya harus dari sini.
  //
  // Hanya hari yang punya sleepLog yang disentuh — input manual tidak punya log dan memang sudah
  // memakai tanggal yang dimaksud user. Tidur siang (mulai >= 12:00 dan tidak lewat tengah malam)
  // dulu sudah jatuh di tanggal yang benar, jadi tidak digeser.
  const SLEEP_FIELDS = ['sleep', 'sleepAwake', 'sleepRem', 'sleepLight', 'sleepDeep', 'sleepLog'];
  const sleepWakeDayFixDone = useRef(false);
  useEffect(() => { sleepWakeDayFixDone.current = false; }, [user?.uid]);
  useEffect(() => {
    if (!isHistoryLoaded || sleepWakeDayFixDone.current) return;
    if (Object.keys(history).length === 0) return;
    sleepWakeDayFixDone.current = true;
    // localStorage cuma penjaga MURAH supaya tidak menyapu riwayat tiap buka app. Penjaga yang
    // sebenarnya ada di DATANYA (`_sleepWakeDay` per hari, lihat di bawah): kunci di localStorage
    // hilang begitu user clear site data / ganti browser, dan kalau itu satu-satunya penjaga,
    // migrasinya jalan lagi di atas data yang sudah benar dan menggeser rantai hari DUA KALI.
    const KEY = `hc_sleep_wakeday_fix2_${user?.uid || 'anon'}`;
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, '1');

    const hariIni = getLocalYMD(new Date());
    setHistory(prev => {
      // SEMUA keputusan dihitung dari `prev` dulu, penulisan belakangan. Versi pertama menghapus
      // dan memindah dalam satu loop: hari D dipindah ke D+1, lalu giliran D+1 diproses dan
      // menghapus isi yang baru saja pindah ke situ. Deretan hari berurutan hilang gara-gara itu.
      const mnt = (e) => { const [h, m] = (e?.time || '').split(':').map(Number); return h * 60 + m; };
      const sumber = [];
      Object.keys(prev).sort().forEach(dateStr => {
        const bio = prev[dateStr]?.bioData;
        const log = bio?.sleepLog;
        if (!Array.isArray(log) || log.length < 2) return;
        if (bio._manualFlags?.sleep !== undefined) return;
        // Sudah pernah dipindah ke sini oleh migrasi ini — jangan digeser lagi. Penanda ini ikut
        // tersinkron ke server, jadi berlaku juga di browser/perangkat lain yang baru pertama
        // menjalankan migrasinya.
        if (bio._sleepWakeDay) return;

        const mulai = mnt(log[0]);
        if (!Number.isFinite(mulai)) return;
        const lewatTengahMalam = log.some((e, i) => i > 0 && mnt(e) < mnt(log[i - 1]));
        if (mulai >= 12 * 60 && !lewatTengahMalam) return;

        const besok = getLocalYMD(new Date(new Date(`${dateStr}T12:00:00`).getTime() + 864e5));
        if (besok > hariIni) return;
        sumber.push({ dateStr, besok, bio });
      });

      const ikutPindah = new Set(sumber.map(s => s.dateStr));
      // Tanggal tujuan yang sudah punya tidur SAH (bukan sisa geseran — mis. sudah ditulis ulang
      // sync HC, atau tidur siang) tidak boleh ditimpa. Hari sumbernya dibiarkan utuh juga:
      // duplikat masih bisa dilihat user, data hilang tidak.
      const dipakai = sumber.filter(s => ikutPindah.has(s.besok) || !(Number(prev[s.besok]?.bioData?.sleep) > 0));
      if (dipakai.length === 0) return prev;

      const next = { ...prev };
      dipakai.forEach(({ dateStr }) => {
        const bersih = { ...prev[dateStr].bioData };
        SLEEP_FIELDS.forEach(f => delete bersih[f]);
        next[dateStr] = { ...prev[dateStr], bioData: bersih };
      });
      dipakai.forEach(({ besok, bio }) => {
        const tujuan = { ...(next[besok]?.bioData || {}) };
        SLEEP_FIELDS.forEach(f => { if (bio[f] !== undefined) tujuan[f] = bio[f]; else delete tujuan[f]; });
        tujuan._sleepWakeDay = true; // penanda: hari ini hasil geseran, jangan digeser lagi
        next[besok] = { ...(next[besok] || prev[besok] || {}), bioData: tujuan };
      });
      return next;
    });
  }, [isHistoryLoaded, user?.uid]);


  useEffect(() => {
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

      if (globalDetailExercise) { setGlobalDetailExercise(null); window.history.pushState({ lyfit: true }, ''); return; }
      if (showProfileModal) { setShowProfileModal(false); window.history.pushState({ lyfit: true }, ''); return; }
      if (showSettings) { setShowSettings(false); window.history.pushState({ lyfit: true }, ''); return; }
      if (showHelp) { setShowHelp(false); window.history.pushState({ lyfit: true }, ''); return; }
      if (confirmModal.isOpen) { setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null }); window.history.pushState({ lyfit: true }, ''); return; }
      if (activeAddModalTarget) { setActiveAddModalTarget(null); window.history.pushState({ lyfit: true }, ''); return; }

      if (activeTab !== 'dashboard') { setActiveTab('dashboard'); window.history.pushState({ lyfit: true }, ''); return; }

      if (backPressedOnce.current) {
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

  const [lastActionTime, setLastActionTime] = useState(0);

  useEffect(() => {
    if (lastActionTime === 0) return;
    
    setHistory(prev => {
      const dayData = prev[selectedDate] || { workouts: [] };
      let workouts = [...(dayData.workouts || [])];

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

  const MAX_UNDO_STEPS = 20; 

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
      a.href = url; a.download = `Logym_Backup_${getLocalYMD(new Date())}.json`;
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
              setUserProfile(data.userProfile || {});
              localStorage.setItem('__CACHED_PROFILE', JSON.stringify(data.userProfile || {}));

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
      if (pendingMainSaveRef.current) {
        clearTimeout(pendingMainSaveRef.current.timer);
        await pendingMainSaveRef.current.attemptSave();
        pendingMainSaveRef.current = null;
      }
      if (pendingHistorySaveRef.current) {
        clearTimeout(pendingHistorySaveRef.current.timer);
        await pendingHistorySaveRef.current.attemptSave();
        pendingHistorySaveRef.current = null;
      }
      setActiveAddModalTarget(null);
      setShowProfileModal(false);
      setShowSettings(false);
      setUserApiKeys([]);
      await signOut(auth);
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  const deleteAllUserData = async (uid) => {
    const refsToDelete = [];

    const safeGetDocs = async (q) => {
      try { return (await getDocs(q)).docs; } catch { return []; }
    };

    refsToDelete.push(...(await safeGetDocs(collection(db, 'logym_users', uid, 'history_years'))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(collection(db, 'logym_users', uid, 'history_backups'))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(collection(db, 'logym_users', uid, 'active_sessions'))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_community_posts'), where('userId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_notifications'), where('toUserId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_follows'), where('followerId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_follows'), where('followingId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_blocks'), where('blockerId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_blocks'), where('blockedId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(doc(db, 'logym_community_users', uid));
    refsToDelete.push(doc(db, 'logym_users', uid));
    refsToDelete.push(doc(db, 'logym_userData', uid));
    if (userProfile?.username) {
      refsToDelete.push(doc(db, 'logym_usernames', userProfile.username));
    }

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
      await deleteAllUserData(user.uid);
      localStorage.clear();
      await deleteUser(auth.currentUser);
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
  const lang = useMemo(() => ({ ...(dict[language] || dict['ID']), id: language }), [language]);

  const t = useMemo(() => ({
    bgApp: theme === 'dark' ? 'app-bg-dark' : 'app-bg-light',
    bgCard: theme === 'dark' ? 'bg-white/[0.045] glass-card' : 'bg-white/60 glass-card',
    bgCardSoft: theme === 'dark' ? 'bg-white/[0.02] glass-card' : 'bg-black/[0.02] glass-card',
    // Permukaan legap, TANPA backdrop-filter. Wajib dipakai untuk apa pun yang punya animasi
    // masuk: `opacity`/`transform` pada ancestor menjadikannya backdrop root di Chromium, jadi
    // elemen `glass-card` di dalamnya kehilangan sampel latarnya selama animasi berjalan lalu
    // blur-nya menyala mendadak begitu animasi selesai — itu yang terlihat sebagai kedipan layer.
    bgCardSolid: theme === 'dark' ? 'bg-[#121a2f]' : 'bg-white',
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
    navIconActive: 'text-[#3b82f6]',
    navIconInactive: theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
    navBorderActive: 'border-[#3b82f6]/30',
    placeholderAccent: theme === 'dark' ? 'placeholder-sky-400/40' : 'placeholder-[#3b82f6]/40',
    borderDashed: theme === 'dark' ? 'border-white/10' : 'border-black/10',
    bgBox: theme === 'dark' ? 'bg-black/20' : 'bg-[#3b82f6]/10',
    glow: theme === 'dark' ? 'shadow-[0_8px_32px_-10px_rgba(59,130,246,0.35)]' : 'shadow-[0_8px_32px_-14px_rgba(59,130,246,0.25)]'
  }), [theme]);

  const navigateToWorkoutDate = (dateStr, progId) => {
    const doNav = () => {
       playSoundEffect('click', soundEnabled); setSelectedDate(dateStr);
       if(progId) {
          setActiveProgramId(progId);
          setFocusWorkoutId(progId === 'adhoc' ? 'extra' : progId);
          setSessionToRun(progId === 'adhoc' ? 'extra' : progId);
       }
       setResumeDurationSecs(0);
       setActiveTab('workout'); setIsEditingMode(false); 
    };

    const isJustSwitchingDate = !progId;
    const isTargetSameAsActive = isWorkoutActive && (
       sessionToRunRef.current === progId || 
       (sessionToRunRef.current === 'extra' && progId === 'adhoc')
    );

    if (isWorkoutActive && !isTargetSameAsActive && !isJustSwitchingDate) {
       setConfirmModal({
          isOpen: true,
          title: 'Pindah Sesi Latihan',
          message: 'Kamu sedang memiliki sesi latihan yang aktif berjalan. Selesaikan dan simpan sesi yang berjalan saat ini, atau langsung membuangnya dan berpindah ke sesi baru ini?',
          onConfirm: () => {
             if (sessionToRunRef.current) handleSaveWorkout(sessionToRunRef.current);
             setTimeout(doNav, 100);
          },
          confirmText: 'Simpan & Lanjut',
          onDiscard: () => {
             handleCancelWorkout(sessionToRunRef.current);
             setTimeout(doNav, 100);
          },
          discardText: 'Buang Sesi Sebelumnya'
       });
    } else {
       doNav();
    }
  };

  const getDayHistory = (dateStr) => {
    const val = history[dateStr]; if (!val) return null;
    if (typeof val === 'string') { const p = programs.find(prog => prog.name === val); return { programId: p?.id, programName: val, status: 'completed', log: {} }; }
    if (val.programId && !val.programName) { const p = programs.find(prog => prog.id === val.programId); return { ...val, programName: p ? p.name : 'Unknown' }; }
    return val;
  };

  useEffect(() => {
    if (!isDataLoaded || !isHistoryLoaded) return;
    if (isWorkoutActive) return;
    if (loadedDate === selectedDate) return;

    const dayData = getDayHistory(selectedDate);
    if (dayData) {
      if (dayData.programId && programs.find(p => p.id === dayData.programId)) setActiveProgramId(dayData.programId);
      
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
        setExerciseLogs(dayData.log.exerciseLogs || {}); 
        setSkippedExercises(dayData.log.skippedExercises || {}); 
        setExtraExercises(dayData.log.extraExercises || []);
      } else { 
        setExerciseLogs({}); setSkippedExercises({}); setExtraExercises([]); 
      }
    } else { setExerciseLogs({}); setSkippedExercises({}); setExtraExercises([]); }
    
    setLoadedDate(selectedDate);
  }, [selectedDate, activeProgramId, history, programs, isDataLoaded, isHistoryLoaded, loadedDate]);

  const getBaseEx = (exId, specificWorkoutId = null) => {
    if (!exId) return null;
    const exIdStr = String(exId);
    
    const isSimpleMatch = (e, baseStr) => {
      if (!e) return false;
      const eIdStr = String(e.id);
      const eOrigIdStr = e.originalId ? String(e.originalId) : null;
      return baseStr === eIdStr || (eOrigIdStr && baseStr === eOrigIdStr) ||
             baseStr.startsWith(eIdStr + '-') || (eOrigIdStr && baseStr.startsWith(eOrigIdStr + '-'));
    };

    // 1. Extra exercises have absolute priority for live extra exercises
    const extraMatch = extraExercises.find(e => isSimpleMatch(e, exIdStr));
    if (extraMatch) return { ...extraMatch, workoutId: 'extra' };

    // 2. Identify candidate workout sessions for today
    const todayData = history[selectedDate];
    const sourceWorkouts = getDayWorkouts(history, programs, activePlanIds, selectedDate) || [];
    const historyWorkouts = (todayData && todayData.workouts) || [];
    const allDayWorkouts = [...sourceWorkouts, ...historyWorkouts];

    let matchedWorkout = specificWorkoutId ? allDayWorkouts.find(w => w.id === specificWorkoutId) : null;
    let baseExIdStr = exIdStr;

    if (!matchedWorkout) {
      for (const w of allDayWorkouts) {
        if (w.id && exIdStr.endsWith(`-${w.id}`)) {
          matchedWorkout = w;
          baseExIdStr = exIdStr.slice(0, -(w.id.length + 1));
          break;
        }
      }
    }

    let matchedProg = null;
    if (!matchedWorkout) {
      for (const p of programs) {
        if (p.id && exIdStr.endsWith(`-${p.id}`)) {
          matchedProg = p;
          baseExIdStr = exIdStr.slice(0, -(p.id.length + 1));
          break;
        }
      }
    }

    if (matchedWorkout) {
      const isSubMatch = (e) => isSimpleMatch(e, baseExIdStr);
      const foundInTarget = (matchedWorkout.overriddenExercises || matchedWorkout.exercises || []).find(isSubMatch) ||
                            (programs.find(p => p.id === matchedWorkout.programId)?.exercises || []).find(isSubMatch);
      if (foundInTarget) {
        return { ...foundInTarget, workoutId: matchedWorkout.id };
      }
    }

    if (matchedProg) {
      const foundInProg = (matchedProg.exercises || []).find(e => isSimpleMatch(e, baseExIdStr));
      if (foundInProg) {
        return { ...foundInProg, workoutId: matchedProg.id };
      }
    }

    // Fallback if no suffix matched: check active session / running workout
    if (sessionToRun) {
      const sWorkout = allDayWorkouts.find(w => w.id === sessionToRun || w.programId === sessionToRun);
      if (sWorkout) {
        const found = (sWorkout.overriddenExercises || sWorkout.exercises || []).find(e => isSimpleMatch(e, exIdStr)) ||
                      (programs.find(p => p.id === sWorkout.programId)?.exercises || []).find(e => isSimpleMatch(e, exIdStr));
        if (found) return { ...found, workoutId: sWorkout.id };
      }
    }

    // Search active program
    const activeProg = programs.find(p => p.id === activeProgramId);
    if (activeProg && activeProg.exercises) {
      const found = activeProg.exercises.find(e => isSimpleMatch(e, exIdStr));
      if (found) return { ...found, workoutId: activeProg.id };
    }

    // Search any workout in today's workouts
    for (const w of allDayWorkouts) {
      const found = (w.overriddenExercises || w.exercises || []).find(e => isSimpleMatch(e, exIdStr)) ||
                    (programs.find(p => p.id === w.programId)?.exercises || []).find(e => isSimpleMatch(e, exIdStr));
      if (found) return { ...found, workoutId: w.id };
    }

    // Search any program
    for (const p of programs) {
      const found = (p.exercises || []).find(e => isSimpleMatch(e, exIdStr));
      if (found) return { ...found, workoutId: p.id };
    }

    // Fallback ke exerciseLibrary
    const libMatch = exerciseLibrary.find(e => 
      String(e.id) === exIdStr || exIdStr.startsWith(String(e.id) + '-') ||
      (e.name && e.name.toLowerCase() === exIdStr.toLowerCase())
    );
    if (libMatch) return { ...libMatch, sets: 3 };

    return null;
  };

  const getSetLogs = (ex, idToCheck, customLogsState = null) => {
    const logs = customLogsState || exerciseLogs;
    if (idToCheck && logs[idToCheck]) return [...logs[idToCheck]];
    
    const matchingKey = Object.keys(logs).find(key => 
      idToCheck && typeof idToCheck === 'string' && (idToCheck === key || idToCheck.startsWith(key + '-') || key.startsWith(idToCheck + '-'))
    );
    if (matchingKey && logs[matchingKey]) return [...logs[matchingKey]];
    
    // Cari di riwayat tersimpan (history) hari ini HANYA jika workoutId spesifik cocok
    const dayData = history[selectedDate];
    let workoutId = ex?.workoutId;
    if (!workoutId && idToCheck && typeof idToCheck === 'string' && dayData?.workouts) {
      const foundW = dayData.workouts.find(w => w.id && (idToCheck.endsWith(`-${w.id}`) || idToCheck === w.id));
      if (foundW) workoutId = foundW.id;
    }
    if (!workoutId) workoutId = sessionToRun;

    if (dayData && dayData.workouts && workoutId) {
      const targetWorkouts = dayData.workouts.filter(w => w.id === workoutId);

      for (const workoutEntry of targetWorkouts) {
        if (workoutEntry && workoutEntry.log) {
          const candidateKeys = [
            idToCheck,
            ex?.id,
            ex?.originalId,
            idToCheck && workoutEntry.id ? `${idToCheck}-${workoutEntry.id}` : null,
            ex?.id && workoutEntry.id ? `${ex.id}-${workoutEntry.id}` : null,
            ex?.originalId && workoutEntry.id ? `${ex.originalId}-${workoutEntry.id}` : null,
          ].filter(Boolean).map(String);

          for (const k of candidateKeys) {
            if (workoutEntry.log[k]) return [...workoutEntry.log[k]];
          }

          const rawId = ex?.id || idToCheck;
          if (rawId) {
            const prefixMatch = Object.entries(workoutEntry.log).find(([k]) => 
              k === String(rawId) || k.startsWith(`${rawId}-`) || (ex?.originalId && (k === String(ex.originalId) || k.startsWith(`${ex.originalId}-`)))
            );
            if (prefixMatch && prefixMatch[1]) return [...prefixMatch[1]];
          }
        }
      }
    }
    
    // originalId ikut dicocokkan: latihan program adalah salinan beku ber-UUID, jadi tanpa klausa
    // ini pencocokan cuma jalan lewat nama — dan dua salinan lain dari fungsi yang sama
    // (WorkoutTab, ImmersiveWorkout) sudah punya klausa itu sejak dulu.
    const libMatch = exerciseLibrary.find(e => e.id === ex?.originalId || e.id === ex?.id || e.name?.toLowerCase() === ex?.name?.toLowerCase());
    const step = gymStepFor(gymProfiles, activeGymId, ex?.equipment, units?.weight === 'lbs');
    let suggestedWeight = defaultSetWeight(libMatch, ex, step);
    
    const isDeload = history?.[selectedDate]?.wellness === 'deload' || history?.[selectedDate]?.isDeloadWeek;
    if (isDeload && suggestedWeight > 0) {
      suggestedWeight = Math.max(0, Math.round((suggestedWeight * 0.825) / step) * step);
    }

    const eqConf = getEquipmentConfig(gymProfiles, activeGymId, ex, userProfile);
    const total_w = calculateActualWeight(suggestedWeight, eqConf);

    return Array.from({length: ex?.sets || 3}).map(() => ({ 
      w: suggestedWeight, 
      input_w: suggestedWeight,
      base_w: eqConf.baseWeight,
      ratio: eqConf.ratio,
      total_w: total_w,
      r: ex?.reps || 10, 
      d: ex?.duration || 10, 
      done: false,
      skipped: false
    }));
  };

  const handleSetChange = (exId, setIdx, field, val, exParam = null) => {
    setExerciseLogs(prev => {
      const ex = exParam || getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : [...getSetLogs(ex, exId, prev)];
      
      const finalVal = (field === 'notes') ? val : Number(val);
      const eqConf = getEquipmentConfig(gymProfiles, activeGymId, ex, userProfile);
      
      let updatedSet = { ...currentLogs[setIdx], [field]: finalVal };
      if (field === 'w' || field === 'input_w') {
        const input_w = Number(val) || 0;
        const total_w = calculateActualWeight(input_w, eqConf);
        updatedSet = {
          ...updatedSet,
          w: input_w,
          input_w: input_w,
          base_w: eqConf.baseWeight,
          ratio: eqConf.ratio,
          total_w: total_w
        };
      }

      currentLogs[setIdx] = updatedSet;

      if (['w', 'r', 'd', 'input_w'].includes(field)) {
        if (currentLogs[setIdx].type !== 'warmup') {
          for (let i = setIdx + 1; i < currentLogs.length; i++) {
            if (!currentLogs[i].done && currentLogs[i].type !== 'warmup') {
              if (field === 'w' || field === 'input_w') {
                currentLogs[i] = {
                  ...currentLogs[i],
                  w: updatedSet.w,
                  input_w: updatedSet.input_w,
                  base_w: updatedSet.base_w,
                  ratio: updatedSet.ratio,
                  total_w: updatedSet.total_w
                };
              } else {
                currentLogs[i] = { ...currentLogs[i], [field]: finalVal };
              }
            }
          }
        }
      }

      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); 
  };

  const handleToggleSet = (exId, setIdx, siblingIds = null, exParam = null) => {
    playSoundEffect('click', soundEnabled);
    setExerciseLogs(prev => {
      const ex = exParam || getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : [...getSetLogs(ex, exId, prev)];
      const isDoneNow = !currentLogs[setIdx].done;
      // `at` = KAPAN set ini diselesaikan. Dipakai untuk menghitung durasi PER SESI di
      // handleSaveWorkout: tanpa ini, sesi mana pun yang disimpan belakangan mengambil seluruh
      // waktu timer. Kejadian nyata: sesi ekstra treadmill 8 menit tercatat 1 jam 4 menit karena
      // ikut memakan waktu sesi beban yang belum disimpan.
      currentLogs[setIdx] = { ...currentLogs[setIdx], done: isDoneNow };
      if (isDoneNow) currentLogs[setIdx].at = Date.now();
      else delete currentLogs[setIdx].at; // undefined ditolak Firestore — hapus kuncinya
      if (!isDoneNow) {
        currentLogs[setIdx].skipped = false;
      }
      
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
        const weight = Number(currentLogs[setIdx].w) || 0;
        const reps = Number(currentLogs[setIdx].r) || 0;
        if (ex && weight > 0 && (!ex.type || ex.type === 'weight' || ex.type === 'reps')) {
           const c10RM = estimate10RM(weight, reps);

           // rm10 SENGAJA tidak ditulis di sini lagi. Dua alasannya:
           //
           //  1. Aturannya dulu `if (c10RM > existingRm)` — maksimum seumur hidup. 10RM jadi tidak
           //     pernah bisa turun, sehingga deload maupun koreksi salah ketik (100 kg padahal
           //     10 kg) tidak pernah tercermin di saran beban.
           //  2. Penulisan itu terjadi di handler yang SAMA dengan pencentangan set, jadi saat
           //     getOverloadHint dievaluasi, acuannya sudah terlanjur naik ke nilai sesi ini —
           //     badge "REKOR BARU" karena itu tidak pernah muncul lagi.
           //
           // Nilai yang benar dihitung ulang oleh efek pendingRmLogKeys (recomputeStrengthRecords
           // + mergeRm10) setelah sesinya disimpan. lastWeight tetap ditulis di sini: itu memang
           // "beban terakhir yang diketik", wajar naik-turun seketika.
           setExerciseLibrary(lib => {
              const existingIdx = lib.findIndex(e => e.name?.toLowerCase() === ex.name?.toLowerCase() || e.id === ex.id);
              if (existingIdx >= 0) {
                  const cur = lib[existingIdx];
                  const updatedLastWeight = weight > 0 ? weight : cur.lastWeight;
                  const updatedRm10 = cur.rm10 ? cur.rm10 : c10RM;
                  const updatedRm10Best = Math.max(Number(cur.rm10Best) || 0, c10RM);
                  if (cur.lastWeight === updatedLastWeight && cur.rm10 === updatedRm10 && (cur.rm10Best || 0) === updatedRm10Best) return lib;
                  const newLib = [...lib];
                  newLib[existingIdx] = { ...cur, lastWeight: updatedLastWeight, rm10: updatedRm10, rm10Best: updatedRm10Best };
                  return newLib;
              }
              return lib;
           });
        }

        const activateWorkoutFromCard = () => {
           let prevSecsToUse = resumeDurationSecs || 0;
           if (!prevSecsToUse) {
              const todayData = history[selectedDate];
              if (todayData && todayData.workouts) {
                 const progId = sessionToRun || activeProgramId;
                 const wInHistory = todayData.workouts.find(w => w.programId === progId || w.id === progId || (progId === 'extra' && w.programId === 'adhoc' && w.status !== 'completed'));
                 if (wInHistory && wInHistory.duration) {
                    if (typeof wInHistory.duration === 'number') prevSecsToUse = wInHistory.duration * 60;
                    else if (typeof wInHistory.duration === 'string') {
                       const parts = wInHistory.duration.split(':').map(Number);
                       if (parts.length === 3) prevSecsToUse = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                       else if (parts.length === 2) prevSecsToUse = (parts[0] || 0) * 60 + (parts[1] || 0);
                    }
                 }
              }
           }
           setSessionSnapshot({ exerciseLogs: JSON.parse(JSON.stringify(exerciseLogs)), skippedExercises: JSON.parse(JSON.stringify(skippedExercises)), extraExercises: JSON.parse(JSON.stringify(extraExercises)) });
           setIsWorkoutActive(true);
           setWorkoutStartTime(Date.now() - (prevSecsToUse * 1000));
           setResumeDurationSecs(0);
        };

        if (!isWorkoutActive) {
          activateWorkoutFromCard();
        }
        if (!isSuperset || isSupersetComplete) {
          setRestTargetTime(Date.now() + (programRestTime * 1000));
        } else if (isSuperset) {
          setShowSupersetToast(true);
          setTimeout(() => setShowSupersetToast(false), 3000);
        }
      }
      return { ...prev, [exId]: currentLogs };
    });
    setLastActionTime(Date.now()); 
  };

  const handleSkipSet = (exId, setIdx, exParam = null) => {
    playSoundEffect('click', soundEnabled);
    setExerciseLogs(prev => {
      const ex = exParam || getBaseEx(exId);
      const currentLogs = prev[exId] ? [...prev[exId]] : [...getSetLogs(ex, exId, prev)];
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
        const currentLogs = newPrev[id] ? [...newPrev[id]] : [...getSetLogs(ex, id, newPrev)];
        const lastSet = currentLogs[currentLogs.length - 1] || { w: ex.defaultWeight || 0, r: ex.reps || 10, d: ex.duration || 10 };
        currentLogs.push({ w: lastSet.w, r: lastSet.r, d: lastSet.d, done: false, skipped: false });
        newPrev[id] = currentLogs;
      });
      return newPrev;
    });
    setLastActionTime(Date.now()); 
  };

  const handleAddWarmupSets = (exIds) => {
    playSoundEffect('click', soundEnabled);
    const ids = Array.isArray(exIds) ? exIds : [exIds];
    setExerciseLogs(prev => {
      let newPrev = { ...prev };
      ids.forEach(id => {
        const ex = getBaseEx(id);
        if (!ex) return;
        const currentLogs = newPrev[id] ? [...newPrev[id]] : [...getSetLogs(ex, id, newPrev)];
        
        const firstWorkingSet = currentLogs.find(s => s.type !== 'warmup') || currentLogs[0] || { w: ex.defaultWeight || 20 };
        const targetW = Number(firstWorkingSet?.w) || 20;
        
        const warmupSets = [
          { w: Math.round(targetW * 0.5), r: 8, d: 0, type: 'warmup', notes: 'Warm-up 50%', done: false, skipped: false },
          { w: Math.round(targetW * 0.75), r: 4, d: 0, type: 'warmup', notes: 'Warm-up 75%', done: false, skipped: false }
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
        const currentLogs = newPrev[id] ? [...newPrev[id]] : [...getSetLogs(ex, id, newPrev)];
        currentLogs.splice(setIdx, 1);
        newPrev[id] = currentLogs;
      });
      return newPrev;
    });
    setLastActionTime(Date.now()); 
  };

  const handleToggleSkip = (exId) => {
    playSoundEffect('click', soundEnabled);
    setSkippedExercises(prev => ({...prev, [exId]: !prev[exId]}));
    setLastActionTime(Date.now()); 
  };

  const handleRemoveExtraEx = (exId) => {
    playSoundEffect('click', soundEnabled);
    setConfirmModal({ 
        isOpen: true, 
        title: 'Hapus Latihan', 
        message: 'Yakin hapus dari sesi ini?', 
        onConfirm: () => {
            setExtraExercises(prev => prev.filter(ex => ex.id !== exId));
            setLastActionTime(Date.now()); 
        } 
    });
  };

  const handleRemoveProgramExercise = (ex) => {
    playSoundEffect('click', soundEnabled);
    const compositeId = ex.id;
    const originalId = ex.originalId ?? ex.id;
    const workoutId = ex.workoutId;

    const dayData = history[selectedDate];
    const targetW = dayData?.workouts?.find(w => w.id === workoutId);
    const srcProg = targetW ? programs.find(p => p.id === targetW.programId) : null;
    const baseList = targetW?.overriddenExercises?.length > 0 ? targetW.overriddenExercises : (srcProg?.exercises || []);
    if (baseList.filter(e => e.id !== originalId).length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Tidak Bisa Dihapus',
        message: 'Ini exercise terakhir di sesi ini. Untuk menghapus semuanya, hapus seluruh jadwal lewat tombol "Hapus Jadwal" di Kalender.',
        onConfirm: () => {}
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Latihan',
      message: 'Yakin hapus exercise ini dari riwayat sesi yang sudah selesai? Log dan kalorinya ikut hilang permanen.',
      onConfirm: () => {
        setExerciseLogs(prev => {
          const next = { ...prev };
          delete next[compositeId];
          return next;
        });
        setSkippedExercises(prev => {
          const next = { ...prev };
          delete next[compositeId];
          return next;
        });
        setHistory(prev => {
          const day = prev[selectedDate];
          if (!day?.workouts) return prev;
          const workouts = day.workouts.map(w => {
            if (w.id !== workoutId) return w;
            const prog = programs.find(p => p.id === w.programId);
            const list = w.overriddenExercises?.length > 0 ? w.overriddenExercises : (prog?.exercises || []);
            const newLog = { ...(w.log || {}) };
            delete newLog[compositeId];
            return { ...w, overriddenExercises: list.filter(e => e.id !== originalId), log: newLog };
          });
          return { ...prev, [selectedDate]: { ...day, workouts } };
        });
        setLastActionTime(Date.now());
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
            clearCloudSession(); 
            const targetDateStr = selectedDate;
            
            // Membatalkan SATU sesi tidak boleh menggulung sesi lain yang belum disimpan.
            // Snapshot dipulihkan hanya untuk kunci milik sesi yang dibatalkan; kunci sesi lain
            // dibiarkan seperti sekarang. extras cuma ikut dipulihkan kalau yang dibatalkan
            // memang sesi Ekstra.
            const batalEkstra = progId === 'extra';
            const targetProgExs = progId === 'extra'
              ? (extraExercises || [])
              : (programs.find(p => p.id === progId || p.id === focusWorkoutId)?.exercises
                 || (history[targetDateStr]?.workouts?.find(w => w.id === focusWorkoutId || w.programId === progId)?.overriddenExercises)
                 || sessionExercises
                 || []);
            const opsiBelah = { progId, workoutId: focusWorkoutId, extraExercises, sessionExercises: targetProgExs };
            const sisaLogsBatal = splitSessionLogs(exerciseLogs, opsiBelah).sisa;
            const sisaSkipBatal = splitSessionLogs(skippedExercises, opsiBelah).sisa;

            let restoredLogs = sisaLogsBatal;
            let restoredSkipped = sisaSkipBatal;
            let restoredExtra = extraExercises || [];

            if (sessionSnapshot) {
               const snapLogs = splitSessionLogs(sessionSnapshot.exerciseLogs, opsiBelah).milikSesi;
               const snapSkip = splitSessionLogs(sessionSnapshot.skippedExercises, opsiBelah).milikSesi;
               restoredLogs = { ...sisaLogsBatal, ...snapLogs };
               restoredSkipped = { ...sisaSkipBatal, ...snapSkip };
               if (batalEkstra) restoredExtra = sessionSnapshot.extraExercises || [];
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

  const [backupList, setBackupList] = useState(null); 
  const [isRestoring, setIsRestoring] = useState(false);

  const loadBackupList = async () => {
    if (!user?.uid) return;
    setIsRestoring(true);
    try {
      const snap = await getDocs(collection(db, 'logym_users', user.uid, 'history_backups'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setBackupList(list);
      if (list.length === 0) showOtaAlert('Belum ada backup tersimpan. Backup dibuat otomatis setiap selesai latihan.');
    } catch (e) {
      showOtaAlert('Gagal membaca daftar backup: ' + (e?.message || e));
      setBackupList([]);
    } finally {
      setIsRestoring(false);
    }
  };

  const restoreFromBackup = async (backup) => {
    let data;
    try {
      data = JSON.parse(backup?.payload || '{}');
    } catch {
      showOtaAlert('Backup ini rusak dan tidak bisa dibaca.');
      return;
    }
    const tanggalBackup = Object.keys(data);
    if (tanggalBackup.length === 0) { showOtaAlert('Backup ini kosong.'); return; }

    // Penghitungnya dihitung DI LUAR updater: updater React boleh dipanggil dua kali (StrictMode),
    // dan pesan "3 sesi dipulihkan" yang jadi 6 di layar bikin user tidak percaya pemulihannya.
    const { next, tanggalBaru, sesiDitambal } = mergeBackupIntoHistory(historyMirror.current, data);
    if (tanggalBaru > 0 || sesiDitambal > 0) setHistory(next);

    const bagian = [];
    if (tanggalBaru > 0) bagian.push(`${tanggalBaru} tanggal`);
    if (sesiDitambal > 0) bagian.push(`${sesiDitambal} sesi ke tanggal yang sudah ada`);
    showOtaAlert(bagian.length > 0
      ? `${bagian.join(' dan ')} dipulihkan dari backup ${backup.id}. Tidak ada data lama yang ditimpa atau dihapus.`
      : `Tidak ada yang perlu dipulihkan — semua ${tanggalBackup.length} tanggal dan sesi di backup ini sudah ada di perangkat.`);
  };

  // Hitung ulang beban aktual seluruh riwayat setelah beban dasar alat diisi di Kelola Gym.
  //
  const pendingRmLogKeys = useRef(null);
  useEffect(() => {
    const keys = pendingRmLogKeys.current;
    if (!keys) return;
    pendingRmLogKeys.current = null;
    // Dikunci per NAMA, bukan per id. Latihan program adalah salinan ber-UUID (crypto.randomUUID
    // di handleAddExerciseToProgram/handleReplaceExercise) yang tidak pernah sama dengan id
    // pustaka, jadi versi lama — `records[String(e.id)]` di bawah — praktis tidak pernah cocok:
    // rm10 tidak pernah sampai ke pustaka untuk latihan apa pun yang ditambahkan user, dan
    // riwayat dari program LAIN tidak ikut terhitung.
    const lookup = buildExLookupByName(history, exerciseLibrary, extraExercises,
      ...programs.map(p => p.exercises));
    const records = recomputeStrengthRecords(history, keys, lookup);
    if (Object.keys(records).length === 0) return;
    setExerciseLibrary(lib => {
      let changed = false;
      const next = lib.map(e => {
        const r = records[canonicalExId(e.name)] || records[String(e.id)] || (e.originalId ? records[String(e.originalId)] : null);
        if (!r) return e;
        // Versi lama menimpa rm10 TANPA SYARAT dengan nilai turunan riwayat setiap kali latihan
        // disimpan — 10RM yang disimpan manual hilang di sesi berikutnya, dan rekor yang sesi
        // asalnya tidak ada lagi di `history` ikut lenyap. Itu "10RM selalu hilang tiap sesi baru".
        // mergeRm10 menghormati override manual tanpa membekukannya selamanya.
        // lastWeight TIDAK ikut aturan ini: itu memang "beban terakhir dipakai", wajar turun.
        const rm10 = mergeRm10(e.rm10, e.rm10ManualAt, r.rm10, r.rm10At);
        // rm10Best dihitung recomputeStrengthRecords tapi dulu dibuang. Padahal itulah acuan
        // "rekor baru dipecahkan" — satu-satunya angka yang TIDAK boleh ikut turun saat rm10
        // turun karena deload atau koreksi input.
        const rm10Best = Math.max(Number(e.rm10Best) || 0, Number(r.rm10Best) || 0);
        if (e.rm10 === rm10 && e.lastWeight === r.lastWeight && (e.rm10Best || 0) === rm10Best) return e;
        changed = true;
        return { ...e, rm10, rm10Best, lastWeight: r.lastWeight };
      });
      return changed ? next : lib;
    });
  }, [history]);

  // opts.workoutId menunjuk sesi yang disimpan SECARA EKSPLISIT. Tanpa itu, penyimpanan
  // beruntun harus lewat setFocusWorkoutId dan menunggu state — dan sesi kedua akan memakai
  // fokus sesi pertama yang belum sempat berubah.
  const handleSaveWorkout = (progId, opts = {}) => {
    const fokusSesi = opts.workoutId !== undefined ? opts.workoutId : focusWorkoutId;
    playSoundEffect('success', soundEnabled);

    // DURASI SESI INI SAJA, bukan seluruh waktu timer.
    //
    // Timer global menghitung sejak "Mulai Latihan" sampai sekarang. Kalau dalam satu periode ada
    // dua sesi (mis. Full Body B lalu ditambah sesi ekstra treadmill), sesi yang disimpan duluan
    // menelan seluruh waktu itu — treadmill 8 menit tercatat 1 jam 4 menit, dan sesi bebannya
    // kehilangan durasinya. Sekarang rentangnya dihitung dari stempel `at` set-set MILIK sesi ini.
    // Sesi/riwayat tanpa stempel (data lama) tetap memakai timer global seperti sebelumnya.
    // sessionSpanSeconds dipindah ke workoutCalc.js supaya ada tesnya: versi di sini dulu
    // menyerah pada sesi bersatu-set (`stamps.length < 2`) dan mengembalikan 0, yang berarti
    // "pakai timer global" — plank ekstra 1 detik jadi mewarisi 45 menit dan ~130 kkal.
    const baseProgId = resolveProjectedProgramId(progId);
    const baseFokusId = resolveProjectedProgramId(fokusSesi);

    const rentangSesiSecs = sessionSpanSeconds(
      progId === 'extra'
        ? (extraExercises || [])
        : (programs.find(p => p.id === progId || p.id === baseProgId || p.id === fokusSesi || p.id === baseFokusId)?.exercises || sessionExercises || []),
      exerciseLogs
    );

    const durationSecs = rentangSesiSecs > 0
      ? rentangSesiSecs
      : (workoutStartTime ? Math.floor((Date.now() - workoutStartTime) / 1000) : 0);
    if (healthConnectEnabled && workoutStartTime) {
      hcPushAfterSave.current = true;
    }

    {
      const lookup = {};
      programs.forEach(p => p.exercises?.forEach(ex => { lookup[ex.id] = ex; }));
      exerciseLibrary.forEach(ex => { lookup[ex.id] = ex; });
      (extraExercises || []).forEach(ex => { lookup[ex.id] = ex; });
      const doneNames = Object.entries(exerciseLogs || {})
        .filter(([, sets]) => Object.values(sets || {}).some(s => s?.done))
        .map(([k]) => resolveLoggedExercise(k, lookup)?.name)
        .filter(Boolean);
      if (doneNames.length > 0) bumpExercisePopularity(doneNames, `${selectedDate}_${progId || fokusSesi || 'sesi'}`);
    }
    const endedAt = Date.now();
    const endStamp = `${String(new Date(endedAt).getHours()).padStart(2, '0')}:${String(new Date(endedAt).getMinutes()).padStart(2, '0')}`;
    const startedAtFor = (secs) => endedAt - secs * 1000;
    const formatDur = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const calcFallbackDurationSecs = (logs, defaultSecs) => {
      if (defaultSecs > 0) return defaultSecs;
      const totalDoneSets = Object.values(logs || {}).reduce((n, sets) => n + Object.values(sets || {}).filter(s => s?.done).length, 0);
      return totalDoneSets > 0 ? Math.max(60, totalDoneSets * 90) : 0;
    };

    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setRestTargetTime(null);
    clearCloudSession(); 

    // HANYA log milik sesi ini yang disimpan & dibuang dari state. Versi lama mengosongkan
    // exerciseLogs/skippedExercises/extraExercises tanpa syarat dan menulis SELURUH log hari itu
    // ke sesi yang kebetulan disimpan duluan.
    const targetDateStr = activeWorkoutDate || selectedDate;
    const targetSessionExercises = progId === 'extra'
      ? (extraExercises || [])
      : (programs.find(p => p.id === progId || p.id === baseProgId || p.id === fokusSesi || p.id === baseFokusId)?.exercises
         || (history[targetDateStr]?.workouts?.find(w => w.id === fokusSesi || w.id === progId || w.programId === progId || w.programId === baseProgId)?.overriddenExercises)
         || sessionExercises
         || []);

    const belah = splitSessionLogs(exerciseLogs, { progId, workoutId: fokusSesi, extraExercises, sessionExercises: targetSessionExercises });
    const belahSkip = splitSessionLogs(skippedExercises, { progId, workoutId: fokusSesi, extraExercises, sessionExercises: targetSessionExercises });
    // extras cuma dibersihkan kalau yang disimpan memang sesi Ekstra — invarian lama yang sempat
    // hilang (lihat memori extra-exercises-are-adhoc-only).
    const isSesiEkstra = progId === 'extra';

    // SESI LAIN YANG SUDAH SELESAI IKUT DISIMPAN.
    //
    // Sesi yang belum tersimpan hidup di exerciseLogs/_activeSession, dan _activeSession sengaja
    // dibuang sebelum ditulis ke cloud — jadi sesi "Belum disimpan" itu ada di SATU perangkat
    // saja. Membiarkannya menggantung setelah user menyimpan sesi berikutnya berarti membiarkan
    // data itu tetap rapuh, bentuk yang sama dengan kehilangan data.
    //
    // Hanya yang SETNYA SUDAH PENUH yang ikut; yang masih separuh dibiarkan, karena user mungkin
    // masih mengerjakannya dan menutup sesi berjalan tidak bisa dibatalkan.
    if (!opts.auto) {
      const hariIni = getDayWorkouts(history, programs, activePlanIds, targetDateStr);
      const exerciseOf = (w) => (w.programId === 'adhoc'
        ? (w.exercises || [])
        : (w.overriddenExercises || programs.find(pr => pr.id === w.programId || pr.id === resolveProjectedProgramId(w.programId))?.exercises || []));
      autoSaveQueue.current = sessionsPendingSave(
        hariIni, exerciseOf, belah.sisa, belahSkip.sisa,
        [progId, fokusSesi, focusWorkoutId].filter(Boolean)
      );
    }

    setExerciseLogs(belah.sisa);
    setSkippedExercises(belahSkip.sisa);
    if (isSesiEkstra) setExtraExercises([]);
    setSessionSnapshot(null);

    let cleanLogs = {};
    let cleanSkipped = {};
    let cleanExtra = [];
    let sisaLogs = {};
    let sisaSkipped = {};
    try {
      cleanLogs = JSON.parse(JSON.stringify(belah.milikSesi));
      cleanSkipped = JSON.parse(JSON.stringify(belahSkip.milikSesi));
      cleanExtra = JSON.parse(JSON.stringify(extraExercises || []));
      sisaLogs = JSON.parse(JSON.stringify(belah.sisa));
      sisaSkipped = JSON.parse(JSON.stringify(belahSkip.sisa));
    } catch (e) {
      console.warn("Failed to sanitize workout logs", e);
    }

    setHistory(prev => {
      const h = { ...prev };
      const dayData = h[targetDateStr] || { workouts: [] };
      let workouts = [...(dayData.workouts || [])];
      
      if (progId === 'extra') {
        const adhocIdx = workouts.findIndex(w => w.programId === 'adhoc' && w.status !== 'completed');
        const targetAdhocIdx = (fokusSesi && fokusSesi !== 'extra') ? workouts.findIndex(w => w.id === fokusSesi) : -1;
        const matchedIdx = adhocIdx >= 0 ? adhocIdx : targetAdhocIdx;

        if (matchedIdx >= 0) {
          const existingW = workouts[matchedIdx];
          let existingSecs = 0;
          if (existingW.duration) {
            if (typeof existingW.duration === 'number') existingSecs = existingW.duration * 60;
            else if (typeof existingW.duration === 'string') {
              const parts = existingW.duration.split(':').map(Number);
              if (parts.length === 3) existingSecs = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
              else if (parts.length === 2) existingSecs = (parts[0] || 0) * 60 + (parts[1] || 0);
            }
          }
          const finalSecs = calcFallbackDurationSecs(cleanLogs, Math.max(durationSecs, existingSecs));
          workouts[matchedIdx] = {
            ...existingW,
            status: 'completed',
            log: cleanLogs,
            skipped: cleanSkipped,
            exercises: cleanExtra,
            timestamp: endStamp,
            startedAt: startedAtFor(finalSecs),
            duration: formatDur(finalSecs)
          };
        } else {
          const finalSecs = calcFallbackDurationSecs(cleanLogs, durationSecs);
          workouts.push({
            id: (fokusSesi && fokusSesi !== 'extra') ? fokusSesi : `adhoc_${Date.now()}`,
            programId: 'adhoc',
            programName: 'Ekstra',
            status: 'completed',
            log: cleanLogs,
            skipped: cleanSkipped,
            exercises: cleanExtra,
            timestamp: endStamp,
            startedAt: startedAtFor(finalSecs),
            duration: formatDur(finalSecs)
          });
        }
      } else {
        let isTargetFound = false;
        workouts = workouts.map(w => {
          const isTargetWorkout = fokusSesi 
            ? (w.id === fokusSesi || (w.programId === fokusSesi && w.status !== 'completed'))
            : (progId ? (w.id === progId || (w.programId === progId && w.status !== 'completed')) : w.status === 'planned');
            
          if (isTargetWorkout) {
            isTargetFound = true;
            let realProgramId = w.programId;
            if (realProgramId && realProgramId.startsWith('projected_')) {
                realProgramId = resolveProjectedProgramId(realProgramId);
            }

            let frozenExercises = w.overriddenExercises;
            if (!frozenExercises || frozenExercises.length === 0) {
              const srcProg = programs.find(pr => pr.id === realProgramId);
              if (srcProg?.exercises?.length > 0) frozenExercises = JSON.parse(JSON.stringify(srcProg.exercises));
              else frozenExercises = [];
            }
            {
              const known = new Set(frozenExercises.map(ex => String(ex.id)));
              const lookup = {};
              programs.forEach(p => p.exercises?.forEach(ex => { lookup[ex.id] = ex; }));
              exerciseLibrary.forEach(ex => { lookup[ex.id] = ex; });
              (w.overriddenExercises || []).forEach(ex => { lookup[ex.id] = ex; });
              Object.keys(cleanLogs).forEach(k => {
                const isExplicitlyForSession = (fokusSesi && k.endsWith(`-${fokusSesi}`)) || (progId && k.endsWith(`-${progId}`));
                if (isExplicitlyForSession) {
                  const ex = resolveLoggedExercise(k, lookup);
                  if (ex && !known.has(String(ex.id))) {
                    known.add(String(ex.id));
                    frozenExercises = [...frozenExercises, JSON.parse(JSON.stringify(ex))];
                  }
                }
              });
            }
            
            let existingSecs = 0;
            if (w.duration) {
              if (typeof w.duration === 'number') {
                existingSecs = w.duration * 60;
              } else if (typeof w.duration === 'string') {
                const parts = w.duration.split(':').map(Number);
                if (parts.length === 3) {
                  existingSecs = (parts[0]||0)*3600+(parts[1]||0)*60+(parts[2]||0);
                } else if (parts.length === 2) {
                  existingSecs = (parts[0]||0)*60+(parts[1]||0);
                }
              }
            }
            const finalSecs = calcFallbackDurationSecs(cleanLogs, Math.max(durationSecs, existingSecs));

            return {
              ...w,
              programId: realProgramId,
              status: 'completed',
              log: cleanLogs,
              skipped: cleanSkipped,
              timestamp: endStamp,
              startedAt: startedAtFor(finalSecs),
              duration: formatDur(finalSecs),
              ...(frozenExercises ? { overriddenExercises: frozenExercises } : {})
            };
          }
          return w;
        });

        if (!isTargetFound) {
            let resolvedProgId = progId;
            if (focusWorkoutId && focusWorkoutId.startsWith('projected_')) {
                resolvedProgId = resolveProjectedProgramId(focusWorkoutId);
            } else if (progId && progId.startsWith('projected_')) {
                resolvedProgId = resolveProjectedProgramId(progId);
            }

            const secondPassIdx = workouts.findIndex(w => 
              w.programId === resolvedProgId && w.status !== 'completed'
            );

            if (secondPassIdx >= 0) {
              const existingW = workouts[secondPassIdx];
              let realProgramId = existingW.programId || resolvedProgId;
              let frozenExercises = existingW.overriddenExercises;
              if (!frozenExercises || frozenExercises.length === 0) {
                const srcProg = programs.find(pr => pr.id === realProgramId);
                if (srcProg?.exercises?.length > 0) frozenExercises = JSON.parse(JSON.stringify(srcProg.exercises));
                else frozenExercises = [];
              }
              let existingSecs = 0;
              if (existingW.duration) {
                if (typeof existingW.duration === 'number') existingSecs = existingW.duration * 60;
                else if (typeof existingW.duration === 'string') {
                  const parts = existingW.duration.split(':').map(Number);
                  if (parts.length === 3) existingSecs = (parts[0]||0)*3600+(parts[1]||0)*60+(parts[2]||0);
                  else if (parts.length === 2) existingSecs = (parts[0]||0)*60+(parts[1]||0);
                }
              }
              const finalSecs = calcFallbackDurationSecs(cleanLogs, Math.max(durationSecs, existingSecs));
              workouts[secondPassIdx] = {
                ...existingW,
                programId: realProgramId,
                status: 'completed',
                log: cleanLogs,
                skipped: cleanSkipped,
                timestamp: endStamp,
                startedAt: startedAtFor(finalSecs),
                duration: formatDur(finalSecs),
                ...(frozenExercises ? { overriddenExercises: frozenExercises } : {})
              };
            } else {
              let pName = 'Sesi Latihan';
              let pId = resolvedProgId;
              const p = programs.find(pr => pr.id === pId || pr.id === progId);
              if (p) {
                 pName = p.name;
                 pId = p.id;
              }
              const finalSecs = calcFallbackDurationSecs(cleanLogs, durationSecs);
              workouts.push({
                 id: focusWorkoutId || progId || `completed_${Date.now()}`,
                 programId: pId,
                 programName: pName,
                 status: 'completed',
                 log: cleanLogs,
                 skipped: cleanSkipped,
                 timestamp: endStamp,
                 startedAt: startedAtFor(finalSecs),
                 duration: formatDur(finalSecs),
                 ...(p?.exercises?.length > 0 ? { overriddenExercises: JSON.parse(JSON.stringify(p.exercises)) } : {})
              });
            }
        }
      }
      
      h[targetDateStr] = {
        ...dayData,
        workouts,
        // Sesi lain yang masih menggantung TETAP hidup di _activeSession — itulah yang membuat
        // kalender masih menandainya "Belum disimpan" alih-alih menghapusnya diam-diam.
        _activeSession: {
          ...(dayData._activeSession || {}),
          exerciseLogs: sisaLogs,
          skippedExercises: sisaSkipped,
          extraExercises: isSesiEkstra ? [] : (cleanExtra || [])
        }
      };
      
      const bio = h[targetDateStr].bioData || {};
      const burn = dailyBurnCalories(bio, workouts, userProfile?.weight, h[targetDateStr]?.exerciseLogs, userProfile);
      h[targetDateStr].bioData = { ...bio, activityCalories: burn.total, activityCaloriesFloor: burn.floor };

      return h;
    });

    pendingRmLogKeys.current = Object.keys(cleanLogs);

    localStorage.setItem('logym_calendar_mode', 'weekly');
    localStorage.setItem('logym_show_monthly_stats', 'true');
    setActiveTab('calendar');
  };

  // Kuras antrean sesi yang ikut disimpan, SATU per render.
  //
  // Sengaja lewat efek, bukan panggilan beruntun di dalam handleSaveWorkout: fungsi itu membaca
  // exerciseLogs dari closure-nya, jadi pemanggilan kedua di tick yang sama masih akan melihat
  // log sesi pertama yang belum terpotong dan menuliskannya dua kali. Menunggu state turun dulu
  // membuat tiap sesi memakai sisa log miliknya sendiri — dan durasinya sendiri, lewat
  // sessionSpanSeconds.
  //
  // opts.auto mencegah putaran ini menambah antrean baru dari dalam dirinya sendiri.
  useEffect(() => {
    if (autoSaveQueue.current.length === 0) return;
    const id = autoSaveQueue.current.shift();
    const t = setTimeout(() => handleSaveWorkout(id, { workoutId: id, auto: true }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseLogs]);

  const handleEditPastWorkout = (dateStr, w) => {
    const doEdit = () => {
      playSoundEffect('click', soundEnabled);
      setSelectedDate(dateStr);
      setActiveProgramId(w.programId);
      setFocusWorkoutId(w.id);
      setSessionToRun(w.id);

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
      
      setIsWorkoutActive(true);
      setWorkoutStartTime(Date.now() - (prevSecs * 1000));
      setResumeDurationSecs(0);
      
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
          if (dayData && dayData.workouts) {
            dayData.workouts.forEach(work => {
              if (work.log) logsToLoad = { ...logsToLoad, ...work.log };
            });
          }
        }
      }
      
      if (w.programId !== 'adhoc' && dayData && dayData._activeSession && dayData._activeSession.extraExercises) {
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

    if (isWorkoutActive) {
       setConfirmModal({
          isOpen: true,
          title: 'Pindah Sesi Latihan',
          message: 'Kamu sedang memiliki sesi latihan yang aktif berjalan. Selesaikan dan simpan sesi yang berjalan saat ini, atau langsung membuangnya dan berpindah untuk mengedit riwayat latihan ini?',
          onConfirm: () => {
             if (sessionToRunRef.current) handleSaveWorkout(sessionToRunRef.current);
             setTimeout(doEdit, 100);
          },
          confirmText: 'Simpan & Lanjut',
          onDiscard: () => {
             setIsImmersiveMode(false);
             setIsWorkoutActive(false);
             setWorkoutStartTime(null);
             setRestTargetTime(null);

             setTimeout(doEdit, 100);
          },
          discardText: 'Buang Sesi Sebelumnya'
       });
    } else {
       doEdit();
    }
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
      setLastActionTime(Date.now()); 
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

  const globalTouchStartX = useRef(null);
  const globalTouchStartY = useRef(null);
  const swipeAreaRef = useRef(null);

  // SATU penjaga untuk semua dialog, bukan satu penanda per dialog.
  //
  // Modal di app ini dirender lewat createPortal ke document.body — tapi React mengalirkan event
  // lewat pohon KOMPONEN, bukan pohon DOM, jadi sentuhan di dalam modal tetap sampai ke handler
  // swipe ini. Penjaga lama mengandalkan tiap modal menandai dirinya (`no-swipe` atau
  // role="dialog"), dan dari ~14 root portal cuma 2 yang melakukannya. Sisanya bocor: swipe di
  // dalam Detail Latihan layar penuh ikut menggeser tab di belakangnya.
  //
  // Pemeriksaan containment DOM menutup semuanya sekaligus, termasuk modal yang belum ditulis:
  // apa pun yang tidak berada di dalam area swipe secara fisik bukan gestur untuk area ini.
  const diLuarAreaSwipe = (e) => {
    const el = e.target;
    if (swipeAreaRef.current && el instanceof Node && !swipeAreaRef.current.contains(el)) return true;
    const isTablet = typeof window !== 'undefined' && window.innerWidth >= 640;
    if (isTablet && el.closest?.('.sm\\:no-swipe')) return true;
    return !!(el.closest?.('input[type="range"]') || el.closest?.('[role="dialog"]') || el.closest?.('.no-swipe'));
  };

  const handleGlobalTouchStart = (e) => {
    if (diLuarAreaSwipe(e)) return;
    globalTouchStartX.current = e.touches[0].clientX;
    globalTouchStartY.current = e.touches[0].clientY;
  };

  const handleGlobalTouchEnd = (e) => {
    if (globalTouchStartX.current === null || globalTouchStartY.current === null) return;
    if (diLuarAreaSwipe(e)) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const distanceX = globalTouchStartX.current - touchEndX;
    const distanceY = globalTouchStartY.current - touchEndY;
    
    globalTouchStartX.current = null;
    globalTouchStartY.current = null;

    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }

    if (Math.abs(distanceX) > 60 && Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      const tabs = ['dashboard', 'workout', 'calendar', 'program', 'database'];
      const currentIndex = tabs.indexOf(activeTab);
      
      // Sengaja tanpa suara: pindah tab terjadi puluhan kali per sesi, bunyinya jadi berisik.
      // Tap di BottomNav juga sudah senyap, jadi kedua cara pindah tab konsisten.
      if (distanceX > 0) {
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1]);
        }
      } else {
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1]);
        }
      }
    }
  };

  const __cachedUidRender = localStorage.getItem('__CACHED_UID');
  const isWaitingForAuth = isAuthChecking && !__cachedUidRender;
  
  if (isInitialSplash || isWaitingForAuth || (user && (!isDataLoaded || !isHistoryLoaded))) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#05070d] select-none touch-none overscroll-none overflow-hidden">
         <img src="/logo-dark.webp" alt="Logym Logo" className="w-40 h-40 object-contain animate-pulse drop-shadow-2xl" />
         
         {isSlowLoading && user && (!isDataLoaded || !isHistoryLoaded) && (
           <div className="absolute bottom-12 left-0 right-0 px-8 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Loader2 className="w-5 h-5 animate-spin mb-3 text-zinc-500" />
             <p className="text-sm font-medium text-zinc-400">Mengambil data dari server...</p>
             <p className="text-[10px] mt-1.5 leading-relaxed max-w-[250px] mx-auto text-zinc-500">Koneksi mungkin sedang lambat, mohon tunggu sebentar agar data tersinkronisasi.</p>
           </div>
         )}
      </div>
    );
  }

  if (!user) {
    return <AuthPage t={t} theme={theme} soundEnabled={soundEnabled} onLogin={() => {}} />;
  }

  const isOnboarded = !!(
    userProfile?.hasCompletedOnboarding ||
    userProfile?.onboardingCompleted ||
    (user?.uid && localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true')
  );
  if (user && isDataLoaded && !isOnboarded) {
    return (
      <OnboardingFlow
        t={t}
        theme={theme}
        onComplete={(answers) => {
          if (user?.uid) localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
          setUserProfile((prev) => ({
            ...(prev || {}),
            hasCompletedOnboarding: true,
            name: answers?.name ?? prev?.name,
            gender: answers?.gender ?? prev?.gender,
            dob: answers?.dob ?? prev?.dob,
            weight: answers?.weight ?? prev?.weight,
            height: answers?.height ?? prev?.height,
            activityLevel: prev?.activityLevel || 'moderate',
          }));
        }}
      />
    );
  }

  return (
    <>
      <div 
      className={`min-h-screen flex flex-col ${t.bgApp} ${t.textMain} font-sans ${contentTab === 'calendar' ? 'h-[100dvh] overflow-hidden' : 'pb-32'} transition-colors duration-300 w-full`}
      ref={swipeAreaRef}
      onTouchStart={handleGlobalTouchStart}
      onTouchEnd={handleGlobalTouchEnd}
    >
      <ConfirmModal confirmModal={confirmModal} setConfirmModal={setConfirmModal} t={t} lang={lang} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} />

      {(hasParseError || cloudSaveError) && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md p-3 px-4 rounded-2xl bg-rose-600 text-white shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black mb-0.5">
              {hasParseError ? 'Perubahan TIDAK tersimpan' : 'Gagal menyimpan ke cloud'}
            </p>
            <p className="text-[11px] leading-snug text-white/85 break-words">
              {hasParseError
                ? 'Data dari server tidak terbaca, jadi penyimpanan otomatis dimatikan supaya data lamamu tidak tertimpa. Tutup dan buka ulang app. Jangan latihan dulu sebelum pesan ini hilang.'
                : cloudSaveError}
            </p>
          </div>
          {!hasParseError && (
            <button onClick={() => setCloudSaveError(null)} className="shrink-0 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10">
              <X size={14} />
            </button>
          )}
        </div>
      )}
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
         userProfile={userProfile}
         onClose={() => {
           setShowQuestionnaire(false);
           if (user?.uid) {
             localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
           }
           if (user?.uid) {
             setDoc(doc(db, 'logym_users', user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => {});
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
         keyStatuses={keyStatuses}
         setKeyStatuses={setKeyStatuses}
         setShowSettings={setShowSettings}
      />
      </React.Suspense>
      )}

      {(showProfileModal || profileModalOpened.current) && (
      <React.Suspense fallback={null}>
        <ProfileModal
           showProfileModal={showProfileModal} setShowProfileModal={setShowProfileModal} 
           initialViewingUserId={profileViewRequest}
           user={user} setUser={setUser} t={t} theme={theme} handleLogout={handleLogout} history={history} setHistory={setHistory}
           activityTargets={activityTargets} programs={programs} setPrograms={setPrograms} exerciseLibrary={exerciseLibrary}
           lang={lang} language={language} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} selectedDate={selectedDate} units={units} activePlanIds={activePlanIds}
           userAchievements={userAchievements} userProfile={userProfile} setUserProfile={setUserProfile}
           highlightPostId={highlightPostId}
           onClearHighlight={() => setHighlightPostId(null)}
           forceTab={profileForceTab}
           setActiveTab={setActiveTab}
           onAchievementShareComplete={handlePostCreated}
           onPostCreated={handlePostCreated}
        />
      </React.Suspense>
      )}

        <SettingsModal
           showSettings={showSettings} setShowSettings={setShowSettings} t={t} lang={lang} 
           theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} 
           soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
           userApiKeys={userApiKeys} setUserApiKeys={setUserApiKeys}
           keyStatuses={keyStatuses}
           userProfile={userProfile}
           bleManager={bleManager}
           logyPersona={logyPersona} setLogyPersona={setLogyPersona}
           logyCustomInstruction={logyCustomInstruction} setLogyCustomInstruction={setLogyCustomInstruction}
           logyMemory={logyMemory} setLogyMemory={setLogyMemory}
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
         otaAvailable={!!otaState.version && otaState.version !== currentVer}
         otaState={otaState} currentVer={currentVer} onUpdateApp={handleUpdateApp} downloadProgress={downloadProgress}
         healthConnectEnabled={healthConnectEnabled} onToggleHealthConnect={handleToggleHealthConnect}
         healthAvailable={healthAvailable} onHcBackfill={handleHcBackfill}
         setHistory={setHistory}
         backupList={backupList} isRestoring={isRestoring} onLoadBackups={loadBackupList} onRestoreBackup={restoreFromBackup}
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
            // like/comment/repost — repost's postId points at the ORIGINAL post it shared
            setHighlightPostId(notif.postId);
            setShowProfileModal(true);
          } else if (notif.fromUserId) {
            // follow — go straight to the follower's profile
            openUserProfile(notif.fromUserId);
          }
        }}
      />
      
      <main className={`${contentTab === 'calendar' ? 'p-0 flex-1 flex flex-col min-h-0 overflow-hidden' : contentTab === 'database' ? 'px-4 pb-4 pt-0 min-h-[70vh] max-w-5xl mx-auto w-full' : 'p-4 min-h-[70vh] max-w-5xl mx-auto w-full'}`}>
        <TabSlider activeTab={contentTab} tabIndex={['dashboard','workout','calendar','program','database'].indexOf(contentTab)} className={contentTab === 'calendar' ? 'flex-1 flex flex-col min-h-0' : ''}>
         <div style={{ display: contentTab === 'dashboard' ? 'contents' : 'none' }}>
             <DashboardTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} language={language} user={user} 
               history={history} setHistory={setHistory} 
               programs={programs} exerciseLibrary={exerciseLibrary} 
               navigateToWorkoutDate={navigateToWorkoutDate}
               soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
               theme={theme} selectedDate={selectedDate}
               biometricStandard={biometricStandard} units={units}
               activityTargets={activityTargets} setActivityTargets={setActivityTargets}
               syncStatus={syncStatus} isBleBusy={bleManager.isBleBusy}
               gymProfiles={gymProfiles} activeGymId={activeGymId}
               activePlanIds={activePlanIds}
               userApiKeys={userApiKeys}
               keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses}
               setShowSettings={setShowSettings}
               userAchievements={userAchievements} connectedApps={connectedAppsView}
               userProfile={userProfile}
               lomealToday={lomealToday} lomealTargets={lomealTargets}
               expandedSessions={expandedSessions}
               bleManager={bleManager}
             />
         </div>
         
         {contentTab === 'workout' && (
             <WorkoutTab 
              setConfirmModal={setConfirmModal}
              t={t} theme={theme} lang={lang} language={language} programs={programs} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              history={history} setHistory={setHistory} setActiveTab={setActiveTab}
              units={units} userProfile={userProfile}
              tabSlideDir={tabSlideDir}
              activeProgramId={activeProgramId} setActiveProgramId={setActiveProgramId} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
               warmupVideos={warmupVideos} cooldownVideos={cooldownVideos} onOpenDetail={setGlobalDetailExercise}
               exerciseLibrary={exerciseLibrary} setExerciseLibrary={setExerciseLibrary}
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} extraExercises={extraExercises}
               expandedSessions={expandedSessions} setExpandedSessions={setExpandedSessions}
               onSetChange={handleSetChange} onToggleSet={handleToggleSet} onSkipSet={handleSkipSet} onAddSet={handleAddSet} onAddWarmupSets={handleAddWarmupSets} onRemoveSet={handleRemoveSet}
               onToggleSkip={handleToggleSkip} onRemoveExtra={handleRemoveExtraEx} onRemoveProgramExercise={handleRemoveProgramExercise}
               isCurrentlyCompleted={isCurrentlyCompleted} onSaveWorkout={handleSaveWorkout} onCancelWorkout={handleCancelWorkout}
               gymProfiles={gymProfiles} activeGymId={activeGymId}
               onAddExtraClick={() => setActiveAddModalTarget({type: 'adhoc'})} 
               onAddExtraExercise={(ex) => setExtraExercises([...extraExercises, ex])}
               
               // New Global Timer Props
               isWorkoutActive={isWorkoutActive} setIsWorkoutActive={setIsWorkoutActive}
               workoutStartTime={workoutStartTime} setWorkoutStartTime={setWorkoutStartTime}
               restTargetTime={restTargetTime} setRestTargetTime={setRestTargetTime}
               isImmersiveMode={isImmersiveMode} setIsImmersiveMode={setIsImmersiveMode}
               sessionToRun={sessionToRun} setSessionToRun={setSessionToRun}
               onSessionExercises={setSessionExercises}
               resumeDurationSecs={resumeDurationSecs} setResumeDurationSecs={setResumeDurationSecs}
               showSupersetToast={showSupersetToast}
               
               // Focus
               focusWorkoutId={focusWorkoutId} setFocusWorkoutId={setFocusWorkoutId}
               activeExerciseId={activeExerciseId} setActiveExerciseId={setActiveExerciseId}
               activePlanIds={activePlanIds}
             />
         )}
         
         {contentTab === 'calendar' && (
             <CalendarTab setConfirmModal={setConfirmModal} 
               t={t} lang={lang} theme={theme} history={history} setHistory={setHistory} programs={programs} 
               soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} navigateToWorkoutDate={navigateToWorkoutDate} 
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} handleEditPastWorkout={handleEditPastWorkout}
               sessionToRun={sessionToRun} isWorkoutActive={isWorkoutActive}
               selectedDate={selectedDate} setSelectedDate={setSelectedDate} setActiveTab={setActiveTab}
               weekStartDay={weekStartDay} defaultReminderTime={defaultReminderTime} reminderEnabled={reminderEnabled}
               units={units}
               activePlanIds={activePlanIds}
               userProfile={userProfile}
               logyPersona={logyPersona}
               activityTargets={activityTargets}
               workoutStartTime={workoutStartTime}
             />
         )}

         {contentTab === 'program' && (
             <ProgramTab setConfirmModal={setConfirmModal} 
               onPostCreated={handlePostCreated}
               t={t} theme={theme} lang={lang} programs={programs} setPrograms={setPrograms} 
               user={user} exerciseLibrary={exerciseLibrary} soundEnabled={soundEnabled}
               setActiveAddModalTarget={setActiveAddModalTarget}
               saveStateToHistory={saveStateToHistory}
               openQuestionnaire={() => setShowQuestionnaire(true)}
               activePlanIds={activePlanIds} setActivePlanIds={setActivePlanIds}
               // activeGymId ikut dikirim supaya dialog "Alternatif Latihan" di editor program
               // menyaring alat sesuai gym aktif — sama persis dengan yang dibuka dari tab Latihan.
               gymProfiles={gymProfiles} activeGymId={activeGymId}
               focusRoutineId={focusRoutineId} setFocusRoutineId={setFocusRoutineId}
               activityTargets={activityTargets}
               userApiKeys={userApiKeys}
               keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses}
               userProfile={userProfile} history={history}
               setShowSettings={setShowSettings}
               onAcceptProgram={handleAcceptAiProgram}
               setHighlightPostId={setHighlightPostId}
               setShowProfileModal={setShowProfileModal}
               setProfileForceTab={setProfileForceTab}
             />
         )}

         {contentTab === 'database' && (
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
        </TabSlider>
      </main>

      <FloatingTimer 
        restTargetTime={restTargetTime} setRestTargetTime={setRestTargetTime} defaultRestTime={defaultRestTime} 
        t={t} soundEnabled={soundEnabled} 
        isWorkoutActive={isWorkoutActive} activeTab={activeTab}
        setActiveTab={setActiveTab} workoutStartTime={workoutStartTime}
        activeWorkoutDate={activeWorkoutDate} setSelectedDate={setSelectedDate}
        isImmersiveMode={isImmersiveMode} setIsImmersiveMode={setIsImmersiveMode}
        sessionToRun={sessionToRun} setSessionToRun={setSessionToRun}
        userProfile={userProfile}
        focusWorkoutId={focusWorkoutId} setFocusWorkoutId={setFocusWorkoutId}
        exerciseLogs={exerciseLogs} sessionExercises={sessionExercises}
        activeExerciseId={activeExerciseId}
      />

      {/* === GLOBAL COACH LOGI FLOAT === */}
      {user && (
        <CoachLogyFloat
          onOpenChat={() => setShowAiChat(true)}
          plateauInsights={plateauInsights}
          hasUnreadChat={hasUnreadChat}
          isWorkoutActive={isImmersiveMode}
          activeTab={activeTab}
          onPositionChange={setAvatarPos}
          readiness={readiness}
        />
      )}

      {/* === GLOBAL GYMCHAT (accessible from any tab) === */}
      <GymAIChat
        isOpen={showAiChat}
        onClose={() => setShowAiChat(false)}
        userApiKeys={userApiKeys}
        keyStatuses={keyStatuses}
        setKeyStatuses={setKeyStatuses}
        setShowSettings={setShowSettings}
        userProfile={userProfile}
        history={history}
        exerciseLibrary={exerciseLibrary}
        programs={programs}
        activePlanIds={activePlanIds}
        plateauInsights={plateauInsights}
        logyPersona={logyPersona}
        logyCustomInstruction={logyCustomInstruction}
        logyMemory={logyMemory}
        setLogyMemory={setLogyMemory}
        onUnreadChange={setHasUnreadChat}
        onAcceptProgram={handleAcceptAiProgram}
        user={user}
        setConfirmModal={setConfirmModal}
        avatarOrigin={avatarPos}
        lomealToday={lomealToday}
        lomealTargets={lomealTargets}
        readiness={readiness}
        activityTargets={activityTargets}
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
      {/* OVERLAYS & NOTIFICATIONS */}
      {otaDialog}
      <UpdaterAlert
        open={otaState.open}
        force={otaState.force}
        releaseNotes={otaState.notes}
        theme={t}
        currentVersion={currentVer}
        newVersion={otaState.version}
        progress={downloadProgress}
        onUpdate={handleUpdateApp}
        onClose={() => {
          localStorage.setItem('logym_dismissed_ota', otaState.version);
          setOtaState(prev => ({ ...prev, open: false }));
        }}
      />
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
          // Open ProfileModal on the community feed tab, scrolled to the post just shared
          setProfileForceTab('beranda');
          setShowProfileModal(true);
          if (postId) setHighlightPostId(postId);
        }}
      />

      {/* PWA Install Prompt */}
      <PwaInstallPrompt />

      <BottomNav t={t} lang={lang} activeTab={activeTab} setActiveTab={setActiveTab} setIsEditingMode={setIsEditingMode} />
    </div>
    </>
  );
}
