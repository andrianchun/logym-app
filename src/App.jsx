import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- IMPORT CAPACITOR (FULLSCREEN) ---
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- IMPORT MESIN FIREBASE ---
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, deleteField, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

// --- IMPORT KOMPONEN UI ---
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TabSlider from './components/TabSlider';
import FloatingTimer from './components/FloatingTimer';
import CoachLogiFloat from './components/CoachLogiFloat';
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
import { AI_MODELS, detectPlateaus, getLogiNotification } from './utils/aiAgent';
import { calculateReadiness } from './utils/readinessEngine';
import { calcBMR, ACTIVITY_MULTIPLIERS } from './utils/bmr';
import { calculateWorkoutCalories, calculateSmartWorkoutCalories, parseWorkoutDurationMinutes, guessWorkoutType } from './utils/workoutCalc';
import { hcAvailable, hcRequestPermissions, hcReadRange, hcBackfillHistory, hcWriteWorkoutCalories, hcCheckStatus, hcInventory, hcWriteWorkoutSession, hcRequestWorkoutWritePermission, hcCheckWorkoutWritePermission } from './utils/healthConnect';
import useDialog from './hooks/useDialog';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import UpdaterAlert from './components/UpdaterAlert';
import { getLocalYMD, defaultMasterExercises, defaultPrograms, defaultWarmupVideos, defaultCooldownVideos } from './data/constants';
import { Loader2, Download, X } from 'lucide-react';

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

// Kalau device ini baru aja nulis lokal (dalam LOCAL_WRITE_GUARD_MS terakhir), skip snapshot
// yang masuk SEKALI SAJA — jangan diretry. Tulisan lokal yang masih pending bakal ke-upload
// sendiri sebentar lagi dan memicu snapshot baru yang sudah benar; retry di sini yang dulu
// bikin livelock (device saling nunda ke device lain tanpa henti).
const LOCAL_WRITE_GUARD_MS = 3000;
const isRecentLocalWrite = (lastWriteAtRef) => (Date.now() - lastWriteAtRef.current) <= LOCAL_WRITE_GUARD_MS;

export default function App() {
  // --- STATE AUTH & LOADING ---
  const __previewUser = JSON.parse(localStorage.getItem('__PREVIEW_USER') || 'null');
  const __cachedUid = localStorage.getItem('__CACHED_UID');
  const __cachedUser = __cachedUid ? { uid: __cachedUid, name: 'Sobat Logym' } : null;
  const [user, setUser] = useState(__previewUser || __cachedUser);
  const [isAuthChecking, setIsAuthChecking] = useState(!__previewUser);
  const __cachedHistory = JSON.parse(localStorage.getItem('__CACHED_HISTORY') || '{}');
  const __cachedProfile = JSON.parse(localStorage.getItem('__CACHED_PROFILE') || 'null');
  const [isDataLoaded, setIsDataLoaded] = useState(!!__previewUser || !!__cachedUser);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(!!__previewUser || !!__cachedUser);
  useEffect(() => {
    const slowTimer = setTimeout(() => {
      setIsSlowLoading(true);
    }, 4000);
    return () => { clearTimeout(slowTimer); };
  }, []);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- SINKRON LOMEAL (app pencatat kalori pendamping) — baca kalori dimakan hari ini +
  // target kalori/makro (delta bulking/cutting sekarang murni diatur di Lomeal, Logym cuma
  // baca, gak punya preset delta sendiri lagi — lihat Lomeal src/utils/biometricSync.js). ---
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

  // --- OTA / AUTO-UPDATE (port dari lomeal-app, lihat OTA-TEMPLATE.md di sana) ---
  // Gantikan PwaUpdater lama (vite-plugin-pwa registerSW prompt): itu cuma nangkep event SW
  // di web, gak pernah tahu nomor versi, dan gak bisa dipakai di APK native sama sekali.
  // Sekarang PWA & APK sama-sama baca /ota/version.json — satu jalur, satu sumber kebenaran.
  // (showOtaAlert didefinisikan di bawah, sesudah state `theme` — lihat komentar di situ.)
  const [otaState, setOtaState] = useState({ open: false, force: false, url: '', version: '', notes: '' });
  // __APP_VERSION__ di-inject vite dari package.json (lihat vite.config.js).
  const [currentVer, setCurrentVer] = useState(__APP_VERSION__);
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    // Path relatif di web (dev tidak punya /ota -> 404, aman); native butuh URL absolut,
    // karena WebView Capacitor jalan dari origin https://localhost, bukan domain hosting asli.
    const otaUrl = isNative ? 'https://logym.web.app/ota/version.json' : '/ota/version.json';

    const checkOta = async () => {
      try {
        const installedVer = __APP_VERSION__;
        setCurrentVer(installedVer);

        const res = await fetch(`${otaUrl}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Sengaja !== bukan >: mem-publish versi lama = rollback, dan itu harus ikut terkirim.
          if (data.ota_version && data.ota_version !== installedVer) {
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
        console.error('Failed to check OTA', err);
      }
    };

    checkOta();

    // Tiga pemicu supaya update muncul sendiri tanpa user refresh/hapus cache: saat dibuka,
    // saat kembali ke foreground, dan tiap 5 menit selama app terbuka.
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
    if (!Capacitor.isNativePlatform()) return;
    let dlListener;
    CapacitorUpdater.addListener('download', (info) => {
      setDownloadProgress(Math.round(info.percent));
    }).then(l => dlListener = l);
    return () => { if (dlListener) dlListener.remove(); };
  }, []);

  const handleUpdateApp = async () => {
    localStorage.removeItem('logym_dismissed_ota');

    // Web: index.html di-serve NetworkFirst (lihat vite.config.js), jadi reload biasa
    // sudah pasti dapat HTML + chunk baru. Tidak ada yang perlu diunduh manual.
    if (!Capacitor.isNativePlatform()) {
      setDownloadProgress(0);
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
      return;
    }

    try {
      // Kartu/modal sengaja TIDAK ditutup: progress bar-nya tampil di situ, karena
      // bundle-nya puluhan MB dan tanpa indikator user ngira tombolnya macet.
      setDownloadProgress(0);
      const bundle = await CapacitorUpdater.download({ url: otaState.url, version: otaState.version });
      await CapacitorUpdater.set(bundle); // destroy JS context — baris setelah ini tidak jalan
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

  // --- STATE UTAMA ---
  const [theme, setTheme] = useState('dark');
  // Dipakai handleUpdateApp di atas (closure — aman, baru benar-benar dipanggil user
  // belakangan, bukan saat didefinisikan) buat nampilin error unduh OTA.
  const { dialog: otaDialog, showAlert: showOtaAlert } = useDialog(theme === 'dark');
  const [language, setLanguage] = useState('ID');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [healthConnectEnabled, setHealthConnectEnabled] = useState(false);
  const [defaultRestTime, setDefaultRestTime] = useState(120);
  const [warmupVideos, setWarmupVideos] = useState(defaultWarmupVideos);
  const [cooldownVideos, setCooldownVideos] = useState(defaultCooldownVideos);
  const [weekStartDay, setWeekStartDay] = useState(0); // 0: Sunday, 1: Monday
  const [defaultReminderTime, setDefaultReminderTime] = useState("15:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [biometricStandard, setBiometricStandard] = useState('asia'); // 'asia' | 'western'
  const [unitSystem, setUnitSystem] = useState('metric'); // deprecated, kept for safety during transition
  const [units, setUnits] = useState({ weight: 'kg', height: 'cm', distance: 'km', temp: 'c' });
  const [userProfile, setUserProfile] = useState(__previewUser ? null : __cachedProfile);

  useEffect(() => {
    localStorage.setItem('__CACHED_PROFILE', JSON.stringify(userProfile));
  }, [userProfile]);

  const [gymProfiles, setGymProfiles] = useState([{ id: 'default', name: 'Logym', equipment: 'all', config: {} }]);
  const [activeGymId, setActiveGymId] = useState('default');
  const [userApiKeys, setUserApiKeys] = useState([]);
  const [keyStatuses, setKeyStatuses] = useState({});
  const [logiPersona, setLogiPersona] = useState('santai');
  const [logiCustomInstruction, setLogiCustomInstruction] = useState('');
  const [logiMemory, setLogiMemory] = useState([]);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [activityTargets, setActivityTargets] = useState({ steps: 10000, weeklyDuration: 150, sleep: 8 });

  // TDEE hidup — dihitung ulang tiap biometrik/activityLevel berubah (termasuk dari sinkron
  // Lomeal), bukan dibekukan sejak onboarding kayak sebelumnya. Tunggu isDataLoaded biar gak
  // nimpa activityTargets.tdee pakai default kosong sebelum Firestore selesai hydrate.
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

  const __cachedAchievements = JSON.parse(localStorage.getItem('__CACHED_ACHIEVEMENTS') || 'null');
  const [userAchievements, setUserAchievements] = useState(__previewUser ? [] : (__cachedAchievements || []));
  useEffect(() => {
    localStorage.setItem('__CACHED_ACHIEVEMENTS', JSON.stringify(userAchievements));
  }, [userAchievements]);
  const [unlockedAchievementsPopup, setUnlockedAchievementsPopup] = useState([]);

  const __cachedExerciseLibrary = JSON.parse(localStorage.getItem('__CACHED_EXERCISE_LIBRARY') || 'null');
  const [exerciseLibrary, _setExerciseLibrary] = useState(__previewUser ? defaultMasterExercises : (__cachedExerciseLibrary || defaultMasterExercises));
  useEffect(() => {
    localStorage.setItem('__CACHED_EXERCISE_LIBRARY', JSON.stringify(exerciseLibrary));
  }, [exerciseLibrary]);
  const setExerciseLibrary = (val) => {
      if (!isExecutingSnapshot.current) lastLocalWriteAt.current = Date.now();
      _setExerciseLibrary(val);
  };
  const __cachedPrograms = JSON.parse(localStorage.getItem('__CACHED_PROGRAMS') || 'null');
  const [programs, _setPrograms] = useState(__previewUser ? defaultPrograms : (__cachedPrograms || defaultPrograms));
  useEffect(() => {
    localStorage.setItem('__CACHED_PROGRAMS', JSON.stringify(programs));
  }, [programs]);
  const lastLocalWriteAt = useRef(0);
  const isExecutingSnapshot = useRef(false);

  const setPrograms = (val) => {
      if (!isExecutingSnapshot.current) lastLocalWriteAt.current = Date.now();
      _setPrograms(val);
  };

  // --- HISTORY & STATS (dokumen terpisah per tahun) ---
  const [history, _setHistory] = useState(__previewUser ? {} : __cachedHistory);
  useEffect(() => {
    localStorage.setItem('__CACHED_HISTORY', JSON.stringify(history));
  }, [history]);
  
  const lastLocalHistoryWriteAt = useRef(0);
  const setHistory = (val) => {
     if (!isExecutingSnapshot.current) lastLocalHistoryWriteAt.current = Date.now();
     _setHistory(val);
  };

  // --- Health Connect: baca live (hari ini) + backfill histori ---
  const [healthAvailable, setHealthAvailable] = useState(false);
  useEffect(() => { hcAvailable().then(setHealthAvailable); }, []);

  // Field yang boleh diisi backfill/live-sync — TIDAK PERNAH nimpa field yang udah manual
  // (_manualFlags, lihat handleSaveManualData di DashboardTab.jsx) atau yang udah ada isinya
  // dari sumber lain (mis. activityCalories hasil hitung workout Logym sendiri).
  const HC_FIELDS = ['steps', 'activityCalories', 'heartRate', 'minHeartRate', 'maxHeartRate', 'restingHeartRate', 'weight', 'height', 'bodyFat', 'oxygenSaturation', 'bloodPressure', 'sleep', 'sleepAwake', 'sleepRem', 'sleepLight', 'sleepDeep', 'sleepLog', 'distance', 'bmr', 'heartRateLog', 'oxygenSaturationLog', 'bloodPressureLog'];

  const mergeHcDayData = (ymd, hcData) => {
    setHistory(prev => {
      const existingBio = prev[ymd]?.bioData || {};
      const manualFlags = existingBio._manualFlags || {};
      const patch = {};
      HC_FIELDS.forEach((k) => {
        if (hcData[k] === undefined) return;
        if (manualFlags[k] !== undefined) return;
        // JANGAN DIBLOKIR: Health Connect bersifat kumulatif (contoh: langkah nambah terus).
        // Kalau diblokir saat existingVal !== 0, data cuma narik sekali di pagi hari lalu nyangkut selamanya.
        patch[k] = hcData[k];
      });
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, [ymd]: { ...(prev[ymd] || {}), bioData: { ...existingBio, ...patch } } };
    });
  };

  // Sinkron dua arah dengan Health Connect.
  //
  // `silent` (dipakai sinkron OTOMATIS): tidak pernah memunculkan dialog izin dan tidak
  // menampilkan popup hasil — cuma memakai izin yang sudah ada. Minta izin cuma boleh saat
  // user memang menekan tombol/menyambungkan, bukan tiba-tiba pas app dibuka.
  const hcSyncing = useRef(false);
  const hcLastSync = useRef(0);
  const runHcSync = async ({ days = 30, silent = true } = {}) => {
    if (!healthConnectEnabled || !isDataLoaded) return;
    if (hcSyncing.current) return; // cegah dua sinkron tumpang tindih (dobel tulis)
    hcSyncing.current = true;
    try {
    if (!silent) {
      // Idempoten: kalau semua izin sudah ada, plugin resolve langsung tanpa dialog.
      // Perlu supaya tipe yang BARU ditambahkan (mis. totalCalories) tetap diminta walau
      // user sudah "Terhubung" sejak versi sebelumnya.
      try { await hcRequestPermissions(); } catch (e) { console.warn('re-request izin gagal:', e); }
    }
    // hcInventory(90) sengaja TIDAK dipanggil di sini — 25 kueri sekaligus tiap sinkron itu
    // mahal. Fungsinya masih ada di utils/healthConnect.js buat dipanggil manual kalau perlu
    // mendiagnosa isi Health Connect lagi (hasilnya di-log dengan prefix HC_INVENTORY).
    const status = silent ? null : await hcCheckStatus();
    let filled = 0;
    await hcBackfillHistory(days, () => false, (ymd, summary) => { filled++; mergeHcDayData(ymd, summary); });

    // SENGAJA gak baca balik sesi latihan dari Health Connect (hcReadWorkouts/mergeHcWorkouts
    // dihapus) — kayak app lain pada umumnya, Logym cuma jadi PENULIS buat sesi latihannya
    // sendiri. Baca balik bikin ping-pong: sesi yang Logym push ke HC bisa ke-tarik lagi jadi
    // "sesi baru" kalau heuristik dedup timestamp-nya meleset (lihat riwayat bug: 2026-08-05).

    // Arah sebaliknya: dorong histori latihan Logym (kalori terbakar) ke Health Connect.
    // Health Connect menerima record bertanggal lampau — yang dibatasi cuma MEMBACA data
    // lama (butuh READ_HEALTH_DATA_HISTORY), menulis ke belakang tidak dibatasi.
    // Aman diulang: tiap sesi dicatat lewat dedupeKey (id sesi), jadi tidak pernah dobel.
    let pushed = 0;
    let sessions = 0;
    // Saat silent, jangan minta izin (bisa memunculkan dialog tiba-tiba) — cukup pakai yang
    // sudah ada. Kalau belum diberikan, sesi latihan dilewati dan akan terkirim di sinkron
    // manual berikutnya.
    const canWriteSession = silent ? await hcCheckWorkoutWritePermission() : await hcRequestWorkoutWritePermission();
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ymd = getLocalYMD(d);
      for (const w of history[ymd]?.workouts || []) {
        if (w.status !== 'completed') continue;
        // JANGAN kirim balik sesi yang justru berasal dari Health Connect — itu bikin
        // lingkaran duplikat (impor -> kirim balik -> terbaca lagi sebagai sesi baru).
        if (w.source === 'healthconnect') continue;
        const mins = parseWorkoutDurationMinutes(w.duration);
        if (mins <= 0) continue;
        const kcal = calculateSmartWorkoutCalories(userProfile?.weight, w, w.log);
        // timestamp cuma "HH:MM" jam selesai; kalau tidak ada, taruh di siang hari.
        const end = new Date(`${ymd}T${w.timestamp && /^\d{2}:\d{2}$/.test(w.timestamp) ? w.timestamp : '12:00'}:00`);
        const start = new Date(end.getTime() - mins * 60000);
        if (await hcWriteWorkoutCalories(start.toISOString(), end.toISOString(), kcal, w.id)) pushed++;
        if (canWriteSession && await hcWriteWorkoutSession({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          exerciseType: guessWorkoutType(w.overriddenExercises || w.exercises),
          title: w.programName || 'Latihan',
          dedupeKey: w.id,
        })) sessions++;
      }
    }

    if (status) {
      const denied = [...(status.readDenied || []), ...(status.writeDenied || [])];
      // Sengaja gak di-await — tombol yang manggil ini harus langsung balik normal begitu
      // proses selesai, gak boleh nunggu user tekan OK di popup buat lepas loading state-nya.
      showOtaAlert(
        `Izin Health Connect — baca: ${status.readAuthorized?.length || 0} tipe, tulis: ${status.writeAuthorized?.length || 0} tipe.` +
        (denied.length ? ` Ditolak: ${denied.join(', ')}.` : '') +
        // Tanpa pembagi: rentangnya inklusif dua ujung (hari ini + N hari ke belakang = N+1)
        // dan beda zona waktu bisa nambah satu lagi, jadi "32/30" bikin bingung.
        ` Histori masuk: ${filled} hari. Terkirim ke Health Connect: ${pushed} kalori, ${sessions} sesi latihan.`
      );
    }
    } finally {
      hcSyncing.current = false;
      hcLastSync.current = Date.now();
    }
  };

  // Tombol "Sinkron Ulang" di Pengaturan — dengan dialog izin & popup hasil.
  const handleHcBackfill = (days = 30) => runHcSync({ days, silent: false });

  // SINKRON OTOMATIS: begitu tersambung, user tidak perlu menekan apa pun lagi.
  // Jalan saat app dibuka, tiap kembali ke depan (mis. habis buka Samsung Health), dan tiap
  // 30 menit selama app terbuka — dibatasi minimal 10 menit sekali biar tidak boros baterai.
  useEffect(() => {
    if (!healthConnectEnabled || !isDataLoaded) return;
    const sync = (days) => {
      if (Date.now() - hcLastSync.current < 10 * 60 * 1000) return;
      runHcSync({ days, silent: true });
    };
    runHcSync({ days: 30, silent: true }); // pertama kali: langsung, tanpa jeda
    const onVisible = () => { if (document.visibilityState === 'visible') sync(7); };
    document.addEventListener('visibilitychange', onVisible);
    const poll = setInterval(() => sync(7), 30 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthConnectEnabled, isDataLoaded]);

  const handleToggleHealthConnect = async () => {
    if (healthConnectEnabled) { setHealthConnectEnabled(false); return; }
    try {
      await hcRequestPermissions();
      // Izin menulis sesi latihan diminta sekalian di sini — satu-satunya izin yang tidak
      // ikut dalam permintaan di atas (dia lewat plugin lokal ExerciseWriterPlugin.kt).
      // Diminta sekarang supaya sinkron otomatis setelahnya tidak perlu memunculkan dialog.
      await hcRequestWorkoutWritePermission();
      setHealthConnectEnabled(true);
      handleHcBackfill(30);
    } catch (e) {
      showOtaAlert('Gagal menyambungkan Health Connect: ' + e.message);
    }
  };


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
  const __cachedActivePlanIds = JSON.parse(localStorage.getItem('__CACHED_ACTIVE_PLAN_IDS') || 'null');
  const [activePlanIds, _setActivePlanIds] = useState(__previewUser ? ['custom'] : (__cachedActivePlanIds || ['custom']));
  useEffect(() => {
    localStorage.setItem('__CACHED_ACTIVE_PLAN_IDS', JSON.stringify(activePlanIds));
  }, [activePlanIds]);
  const setActivePlanIds = (val) => {
      if (!isExecutingSnapshot.current) lastLocalWriteAt.current = Date.now();
      _setActivePlanIds(val);
  };
  const [activeProgramId, setActiveProgramId] = useState(defaultPrograms[0]?.id || null);
  const [focusWorkoutId, setFocusWorkoutId] = useState(null);

  // Self-healing: Hapus duplikat ID pada latihan (menghindari error DndKit dari state lama)
  useEffect(() => {
    if (!programs || programs.length === 0) return;
    let changed = false;
    const newProgs = programs.map(p => {
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
    // Tunggu onAuthStateChanged selesai dulu — usernames/{username} & community_users
    // butuh isSignedIn() di rules, jadi query yang nembak sebelum token auth terpasang
    // bakal kena permission-denied diam-diam (link share ?u= kelihatan gak ngapa-ngapain).
    if (isAuthChecking || urlParamsHandled.current) return;
    urlParamsHandled.current = true;

    const handleUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const u = params.get('u');
      if (u) {
        if (u.length > 20) {
          // likely a UID
          openUserProfile(u);
        } else {
          // likely a username
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

  // --- GLOBAL COACH LOGI STATE ---
  const [showAiChat, setShowAiChat] = useState(false);
  const [avatarPos, setAvatarPos] = useState(null); // {x,y} center of float avatar
  const { dialog: aiDialog, showAlert: showAiAlert } = useDialog(theme === 'dark');

  // Plateau detection — pure rule-based, no AI call
  const plateauInsights = useMemo(() => {
    // Only recalculate insights when on the dashboard
    if (activeTab !== 'dashboard') return [];
    return detectPlateaus(history, 3, 2);
  }, [history, activeTab]);

  const readiness = useMemo(() => {
    if (!user || activeTab !== 'dashboard') return null; // Only show on dashboard
    const todayStr = getLocalYMD(new Date());
    const todayData = history[todayStr] || {};
    
    // Hanya muncul jika hari ini ada jadwal latihan atau ada histori latihan
    const hasWorkoutToday = (todayData.workouts && todayData.workouts.length > 0) || todayData.programId;
    if (!hasWorkoutToday) return null;

    const todayBioData = todayData.bioData || {};
    return calculateReadiness(todayBioData);
  }, [history, user, activeTab]);

  const scheduleLogiPush = async (type, id, vars) => {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
      const copy = getLogiNotification(type, logiPersona, vars);
      if (!copy) return;
      const [h, m] = (defaultReminderTime || '09:00').split(':');
      const fireAt = new Date();
      fireAt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      if (fireAt.getTime() <= Date.now()) fireAt.setDate(fireAt.getDate() + 1); // slot udah lewat hari ini -> besok pagi
      await LocalNotifications.schedule({
        notifications: [{
          id,
          title: copy.title,
          body: copy.body,
          schedule: { at: fireAt },
          largeIcon: 'coach_logi_avatar',
        }]
      });
    } catch (err) {
      console.warn('Logi push notif error:', err);
    }
  };

  // Nudge kalau user belum latihan N hari — dijadwalkan ulang tiap hari count-nya berubah,
  // tapi cuma sekali per hari yang sama (dedup via localStorage) supaya tidak spam tiap app dibuka.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !reminderEnabled) return;
    const MISSED_THRESHOLD_DAYS = 2;
    const completedDates = Object.keys(history).filter(d => {
      const day = history[d];
      const workouts = day?.workouts || (day?.status ? [day] : []);
      return workouts.some(w => w.status === 'completed');
    }).sort((a, b) => b.localeCompare(a));
    if (completedDates.length === 0) return; // belum ada riwayat sama sekali, jangan nagih dulu

    const daysSince = Math.floor((Date.now() - new Date(completedDates[0]).getTime()) / 86400000);
    if (daysSince < MISSED_THRESHOLD_DAYS) return;

    const dedupKey = `lyfit_missed_notif_${user?.uid || 'guest'}`;
    const dedupVal = `${completedDates[0]}_${daysSince}`;
    if (localStorage.getItem(dedupKey) === dedupVal) return;

    scheduleLogiPush('missed', 88000000 + (daysSince % 1000), { days: daysSince })
      .then(() => localStorage.setItem(dedupKey, dedupVal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, reminderEnabled, logiPersona, defaultReminderTime, user?.uid]);

  // Plateau insight juga didorong sebagai notifikasi native, bukan cuma bubble in-app —
  // dedup terpisah dari yang dipakai GymAIChat karena tujuannya beda (push vs sesi chat).
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !reminderEnabled) return;
    const top = plateauInsights?.[0];
    if (!top) return;
    const insightKey = `${top.name}_${top.weeks}_${top.maxWeight}`;
    const dedupKey = `lyfit_insight_notif_${user?.uid || 'guest'}`;
    if (localStorage.getItem(dedupKey) === insightKey) return;

    scheduleLogiPush('insight', 89000000 + (top.weeks % 1000), { exName: top.name, weeks: top.weeks, maxWeight: top.maxWeight })
      .then(() => localStorage.setItem(dedupKey, insightKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateauInsights, reminderEnabled, logiPersona, defaultReminderTime, user?.uid]);

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
        await showAiAlert('Program berhasil diperbarui sesuai saran Coach Logi!', { type: 'success' });
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
        new Notification("Logym Workout", { 
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
            body: `Durasi: ${formatNotifTime(elapsed)} — Ketuk untuk kembali ke Logym`,
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
      const cached = localStorage.getItem('__CACHED_UID');
      if (currentUser) {
        if (currentUser.uid !== cached) {
          setIsDataLoaded(false);
          setIsHistoryLoaded(false);
        }
        lastLocalWriteAt.current = 0;
        lastLocalHistoryWriteAt.current = 0;
        setUser({ 
           uid: currentUser.uid, 
           email: currentUser.email, 
           name: currentUser.displayName || 'Sobat Logym',
           photoURL: currentUser.photoURL
        });
        localStorage.setItem('__CACHED_UID', currentUser.uid);
      } else {
        localStorage.removeItem('__CACHED_UID');
        setUser(null);
        setIsDataLoaded(true);
        setIsHistoryLoaded(true);
        setHistory({});
        setPrograms(defaultPrograms);
        setExerciseLibrary(defaultMasterExercises);
        // PENTING: Reset timestamp debounce supaya reset state ini tidak 
        // dianggap sebagai "perubahan lokal baru" yang memblokir sinkronisasi onSnapshot
        lastLocalWriteAt.current = 0;
        lastLocalHistoryWriteAt.current = 0;
        
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
  const pendingMainSaveRef = useRef(null);
  const pendingHistorySaveRef = useRef(null);
  // Cache lokal (__CACHED_*) bikin isDataLoaded/isHistoryLoaded true SEBELUM snapshot server
  // pertama nyampe (biar gak flash kosong pas buka app). Tapi itu artinya auto-save effect
  // di bawah bisa nyoba nulis ke Firestore pakai data cache yang mungkin basi (device lain
  // sempat nambah data baru) SEBELUM sempat direkonsiliasi dengan data server — nimpa
  // perubahan dari device lain. Dua flag ini WAJIB true dulu (di-set di onSnapshot) sebelum
  // auto-save boleh jalan, supaya kita selalu nulis di atas baseline server yang valid.
  const hasSyncedMainRef = useRef(false);
  const hasSyncedHistoryRef = useRef(false);
  // Kegagalan auto-save selama ini cuma nyangkut di console — user gak pernah tahu, padahal
  // gejalanya fatal: perubahan "kesimpan" di layar lalu balik sendiri begitu snapshot server
  // datang. Tampilkan di UI supaya ketahuan dan bisa dilaporkan.
  const [cloudSaveError, setCloudSaveError] = useState(null);

  useEffect(() => {
    let unsubscribeMain = null;
    let unsubscribeHistory = null;

    // Baseline diff milik user sebelumnya tidak berlaku lagi
    lastSavedHistoryJson.current = null;
    hasSyncedMainRef.current = false;
    hasSyncedHistoryRef.current = false;

    if (localStorage.getItem('__PREVIEW_USER')) { setIsDataLoaded(true); setIsHistoryLoaded(true); return; }

    const activeUid = user?.uid;

    // JANGAN PERNAH subscribe Firestore sebelum Firebase Auth selesai (isAuthChecking = true).
    // Jika kita paksa subscribe tanpa token Auth, Firestore akan melempar error
    // "Missing or insufficient permissions" dan memblokir data selamanya!
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
          isExecutingSnapshot.current = true;
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
                 const yearRef = doc(db, "logym_users", user.uid, "history_years", year);
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
                // Migrate built-in default programs: add planId + assignedDays if missing.
                // null, BUKAN undefined — Firestore menolak seluruh dokumen yang mengandung
                // undefined, yang bikin SEMUA auto-save gagal diam-diam sejak program ini masuk state.
                planId: p.planId ?? (DEFAULT_DAYS[p.id] ? 'custom' : null),
                planName: p.planName ?? (DEFAULT_DAYS[p.id] ? 'Program Default' : null),
                assignedDays: p.assignedDays ?? DEFAULT_DAYS[p.id] ?? [],
                exercises: p.exercises ? p.exercises.map(ex => 
                  (ex.id === 101 && ex.name === 'Incline Smith Machine Press') ? { ...ex, name: 'Smith Machine Incline Bench Press' } : ex
                ) : []
              }));
              if (!isRecentLocalWrite(lastLocalWriteAt)) {
                 setPrograms(prev => JSON.stringify(prev) === JSON.stringify(migratedPrograms) ? prev : migratedPrograms);
              }
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

              if (!isRecentLocalWrite(lastLocalWriteAt)) {
                 setExerciseLibrary(prev => JSON.stringify(prev) === JSON.stringify(migratedLib) ? prev : migratedLib);
              }
            }
            if (data.settings) {
              const parsedSettings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
              if (parsedSettings.theme) setTheme(parsedSettings.theme);
              // .toUpperCase() untuk self-heal akun yang sempat kesimpan 'id' huruf kecil
              // (lihat komentar di reset state saat logout) — tanpa ini, target otot tidak
              // pernah ketemu di muscleDictionary (keys-nya 'EN'/'ID' uppercase).
              if (parsedSettings.language) setLanguage(parsedSettings.language.toUpperCase());
              if (parsedSettings.soundEnabled !== undefined) setSoundEnabled(parsedSettings.soundEnabled);
              if (parsedSettings.healthConnectEnabled !== undefined) setHealthConnectEnabled(parsedSettings.healthConnectEnabled);
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
                          return { ...g, name: 'Logym' };
                      }
                      return g;
                  });
                  setGymProfiles(migratedProfiles);
              }
              if (parsedSettings.activeGymId) setActiveGymId(parsedSettings.activeGymId);
              if (parsedSettings.activityTargets) setActivityTargets(parsedSettings.activityTargets);
              
              if (!isRecentLocalWrite(lastLocalWriteAt)) {
                 if (parsedSettings.activePlanIds) setActivePlanIds(parsedSettings.activePlanIds);
                 else if (parsedSettings.activePlanId) setActivePlanIds([parsedSettings.activePlanId]);
                 else setActivePlanIds(['custom']); // default: always activate the built-in default plan
              }
              
              if (parsedSettings.userProfile) setUserProfile(parsedSettings.userProfile);
              else setUserProfile(null);
              
              // Migrate old single keys to the new array
              let migratedKeys = parsedSettings.userApiKeys || [];
              if (migratedKeys.length === 0) {
                  if (parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userApiKey);
                  if (parsedSettings.userGeminiApiKey && parsedSettings.userGeminiApiKey !== parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userGeminiApiKey);
              }
              // Buang entri kosong yang kepencet "+ Tambah" tapi gak jadi diisi — biar gak
              // nyangkut sebagai baris kosong yang "muncul lagi" tiap kali data di-refresh.
              migratedKeys = migratedKeys.filter(k => k && k.trim());
              setUserApiKeys(migratedKeys);

              // Saved model IDs from older versions may no longer exist on the APIs

              setLogiPersona(parsedSettings.logiPersona || 'santai');
              setLogiCustomInstruction(parsedSettings.logiCustomInstruction || '');
              setLogiMemory(Array.isArray(parsedSettings.logiMemory) ? parsedSettings.logiMemory : []);
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
            // Sync onboarding flag from Firebase to localStorage
            if (data.onboardingCompleted && user.uid) {
              localStorage.setItem(`lyfit_onboarding_completed_${user.uid}`, 'true');
            }
          } catch (err) {
            console.error("Parse Error saat load data utama (MENCEGAH AUTO-SAVE UNTUK MENGHINDARI DATA HILANG):", err);
            setHasParseError(true);
          }

          isExecutingSnapshot.current = false;
          setIsDataLoaded(true);
          hasSyncedMainRef.current = true;
          setTimeout(() => { isUpdatingFromServer.current = false; }, 3000); // diperpanjang untuk cegah race condition auto-save
        } else {
          // No Firebase data yet — only show questionnaire if not already completed
          const alreadyDone = user?.uid ? localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true' : false;
          if (!alreadyDone) {
            setIsFreshAccount(true);
          }
          setIsDataLoaded(true);
          hasSyncedMainRef.current = true;
        }
      }, (error) => {
        console.error("Gagal menarik data utama:", error);
        setHasParseError(true);
        setIsDataLoaded(true);
      });

      unsubscribeHistory = onSnapshot(historyDocRef, (docSnap) => {
        if (docSnap.exists()) {
           isUpdatingFromServer.current = true;
           isExecutingSnapshot.current = true;
           try {
             const data = docSnap.data();
             // Seed baseline diff: tanggal yang datang dari server dianggap sudah tersimpan,
             // sehingga auto-save berikutnya hanya mengirim tanggal yang benar-benar berubah.
             const base = { ...(lastSavedHistoryJson.current || {}) };
             Object.keys(data).forEach(d => { base[d] = serializeDay(data[d]); });
             lastSavedHistoryJson.current = base;
             
             if (!isRecentLocalWrite(lastLocalHistoryWriteAt)) {
                setHistory(prev => {
                   const newState = { ...prev };
                   Object.keys(data).forEach(d => {
                      const existingDay = newState[d] || {};
                      newState[d] = {
                         ...data[d],
                         ...(existingDay._activeSession ? { _activeSession: existingDay._activeSession } : {})
                      };
                   });
                   const finalState = JSON.stringify(prev) === JSON.stringify(newState) ? prev : newState;
                   localStorage.setItem('__CACHED_HISTORY', JSON.stringify(finalState));
                   return finalState;
                });
             }
           } catch (err) {
             console.error("Parse Error saat load history tahun ini:", err);
             setHasParseError(true);
           }
           isExecutingSnapshot.current = false;
           setTimeout(() => { isUpdatingFromServer.current = false; }, 3000);
        }
        hasSyncedHistoryRef.current = true;
        setIsHistoryLoaded(true);
      }, (error) => {
         console.error("Gagal menarik history tahun ini:", error);
         setIsHistoryLoaded(true);
      });

    } else {
      setIsDataLoaded(true);
      setIsHistoryLoaded(true);
    }

    return () => {
      if (unsubscribeMain) unsubscribeMain();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  // isAuthChecking WAJIB ikut deps — cache-first (__CACHED_UID) bikin user.uid sudah keisi
  // SEBELUM Firebase Auth asli selesai resolve, jadi effect ini kena guard "isAuthChecking"
  // dan return duluan. Tanpa isAuthChecking di sini, begitu auth asli resolve (isAuthChecking
  // jadi false) dengan uid yang SAMA PERSIS seperti cache, effect ini tidak pernah dijalankan
  // ulang — listener Firestore tidak pernah terpasang sepanjang sesi itu, dua arah (baca
  // maupun tulis) buntu total sampai user logout-login paksa uid berubah.
  }, [user?.uid, isAuthChecking]);

  // ==========================================
  // 3. SISTEM AUTO-SAVE KE CLOUD (DEBOUNCE)
  // Dipisah dua effect agar log latihan tidak ikut menulis ulang dokumen utama:
  //  - 3a: dokumen utama (programs, library, settings) — hanya saat bagian itu berubah
  //  - 3b: history — diff per tanggal, hanya tanggal yang berubah yang dikirim
  // ==========================================
  useEffect(() => {
    // Gunakan user?.uid langsung karena autosave gak butuh ngebut di detik 0 (isAuthChecking)
    if (user && isDataLoaded && !hasParseError) {
      let retryTimer = null;
      // Jika onSnapshot sedang menulis data dari server saat timer ini berbunyi, JANGAN
      // buang perubahan lokal — coba lagi tiap 500ms sampai guard-nya lepas, supaya
      // perubahan yang kebetulan terjadi persis di window 3 detik itu tidak hilang.
      const attemptSave = () => {
        if (isUpdatingFromServer.current) {
          retryTimer = setTimeout(attemptSave, 500);
          return;
        }
        // SAFETY: Jangan simpan ke Firestore sebelum snapshot server PERTAMA nyampe sesi ini —
        // tanpa ini, data cache lokal (__CACHED_PROGRAMS/dst, dipakai biar gak flash kosong
        // pas buka app) bisa kepush ke server duluan sebelum sempat direkonsiliasi, nimpa
        // perubahan yang barusan masuk dari device lain.
        if (!hasSyncedMainRef.current) {
          console.log('[Auto-save] Belum sinkron dari server — skip save, tunggu snapshot pertama selesai.');
          return;
        }
        // SAFETY: Jangan simpan ke Firestore jika programs masih sama dengan defaultPrograms —
        // ini indikasi data user belum selesai di-load dari server (race condition).
        // Biarkan onSnapshot selesai dulu, baru auto-save boleh jalan.
        if (JSON.stringify(programs) === JSON.stringify(defaultPrograms)) {
          console.warn('[Auto-save] Programs masih default — skip save, tunggu load Firestore selesai.');
          return;
        }
        const mainDocRef = doc(db, "logym_users", user.uid);

        // Simpan Profil & Program ke Dokumen Utama.
        // try/catch WAJIB: setDoc melempar SINKRON (bukan promise rejection) kalau datanya
        // mengandung undefined — .catch() saja tidak pernah kena, dan errornya lenyap tanpa jejak.
        try {
          return setDoc(mainDocRef, {
            programs,
            exerciseLibrary,
            settings: { theme, language, soundEnabled, healthConnectEnabled, defaultRestTime, warmupVideos, cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard, unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, userProfile, userApiKeys: (userApiKeys || []).filter(k => k && k.trim()), logiPersona, logiCustomInstruction, logiMemory },
            userAchievements,
            updatedAt: new Date().toISOString()
          }, { merge: true })
            .then(() => setCloudSaveError(null))
            .catch(err => { console.error("Auto-save Cloud gagal:", err); setCloudSaveError(err?.message || String(err)); });
        } catch (err) {
          console.error("Auto-save Cloud gagal (sync):", err);
          setCloudSaveError(err?.message || String(err));
        }
      };
      const timer = setTimeout(attemptSave, 2000);
      // Simpan supaya handleLogout bisa flush save yang masih tertunda sebelum signOut,
      // alih-alih dibatalkan begitu saja oleh cleanup effect ini.
      pendingMainSaveRef.current = { timer, attemptSave };

      return () => { clearTimeout(timer); if (retryTimer) clearTimeout(retryTimer); pendingMainSaveRef.current = null; };
    }
  }, [programs, exerciseLibrary, theme, language, soundEnabled, healthConnectEnabled, defaultRestTime, warmupVideos, cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard, unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, user?.uid, isDataLoaded, userAchievements, userProfile, userApiKeys, logiPersona, logiCustomInstruction, logiMemory]);

  // Baseline serialisasi per tanggal — merepresentasikan kondisi terakhir yang tersimpan di server.
  // Tanggal yang serialisasinya sama dengan baseline tidak perlu dikirim ulang.
  const lastSavedHistoryJson = useRef(null);
  // maxWait buat debounce di bawah — lihat komentar di titik pemakaiannya.
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
        // SAFETY: sama seperti auto-save dokumen utama — jangan kirim diff apa pun sebelum
        // snapshot history server pertama nyampe, supaya baseline diff-nya bukan cache basi.
        if (!hasSyncedHistoryRef.current) {
          console.log('[Auto-save] History belum sinkron dari server — skip save.');
          return;
        }

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
        const writes = dirtyYears.map(year => {
           const yearRef = doc(db, "logym_users", user.uid, "history_years", year);
           // Batalkan baseline tanggal yang gagal supaya dicoba lagi pada save berikutnya
           const rollback = (err, label) => {
              console.error(`Auto-save History ${year} gagal${label}:`, err);
              setCloudSaveError(err?.message || String(err));
              if (lastSavedHistoryJson.current) {
                 Object.keys(dirtyByYear[year]).forEach(d => { delete lastSavedHistoryJson.current[d]; });
              }
           };
           // try/catch WAJIB: setDoc melempar SINKRON kalau data mengandung undefined —
           // tanpa ini baseline sudah terlanjur di-update dan tanggal itu dianggap "tersimpan"
           // selamanya padahal tidak pernah ketulis (data hilang diam-diam sampai reload).
           try {
              return setDoc(yearRef, dirtyByYear[year], { merge: true })
                 .then(() => setCloudSaveError(null))
                 .catch(err => rollback(err, ''));
           } catch (err) {
              rollback(err, ' (sync)');
              return Promise.resolve();
           }
        });
        historyBurstStart.current = 0;
        return Promise.all(writes);
      };
      // Debounce dengan maxWait: efek ini ngulang tiap `history` dapat reference baru, dan
      // reset timer 2 detiknya tiap kali. Kalau `history` terus berubah lebih cepat dari 2
      // detik antar perubahan (mis. sync HC yang narik heartRateLog/bloodPressureLog/
      // oxygenSaturationLog — banyak promise readSamples native yang resolve bergantian dalam
      // rentang beberapa detik), timer-nya nggak pernah dapat jeda tenang buat nembak —
      // livelock, data ketumpuk lokal tapi nggak pernah nyampe Firestore. Tanpa maxWait ini,
      // "keluar-masuk tab" doang yang kelihatan mancingnya, karena kebetulan itu momen HC
      // sync-nya udah selesai dan history akhirnya diam.
      if (!historyBurstStart.current) historyBurstStart.current = Date.now();
      const elapsed = Date.now() - historyBurstStart.current;
      const timer = setTimeout(attemptSave, elapsed >= HISTORY_SAVE_MAX_WAIT ? 0 : 2000);
      // Simpan supaya handleLogout bisa flush save history (log latihan) yang masih
      // tertunda sebelum signOut — tanpa ini, logout langsung setelah selesai latihan
      // bisa membatalkan timer ini dan latihan yang baru dicatat hilang tanpa jejak.
      pendingHistorySaveRef.current = { timer, attemptSave };

      return () => { clearTimeout(timer); if (retryTimer) clearTimeout(retryTimer); pendingHistorySaveRef.current = null; };
    }
  }, [history, user, isDataLoaded]);


  // --- CEK ACHIEVEMENTS ---
  const historyRef = useRef(history);
  useEffect(() => {
    // Only run if history actually changed (new completion)
    if (history === historyRef.current || !isDataLoaded) return;
    // Debounce: `history` dapat reference baru tiap keystroke saat lagi ngetik reps/berat
    // (lihat efek "REAL-TIME SYNC EXERCISE LOGS TO HISTORY"). checkAchievements scan seluruh
    // history tahun ini — jangan jalanin scan itu di setiap ketukan, tunggu user berhenti dulu.
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
      if (newBadges.length > 0) {
        if (soundEnabled) {
          const audio = new Audio('/cheer.wav');
          audio.volume = 1.0;
          audio.play().catch(() => {});
        }
        setUnlockedAchievementsPopup(prev => [...prev, ...newBadges]);
        setUserAchievements(prev => {
          const newSet = new Set([...prev, ...newBadges.map(b => b.id)]);
          return Array.from(newSet);
        });
      }
      historyRef.current = history;
    }, 800);
    return () => clearTimeout(timer);
  }, [history, isDataLoaded, userAchievements, soundEnabled]);

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
    // Tunggu isHistoryLoaded (bukan cuma isDataLoaded) — itu tanda snapshot history tahun ini
    // sudah datang sekali (ada isinya atau tidak), jadi efek ini gak nunggu selamanya.
    if (!isDataLoaded || !isHistoryLoaded || !user?.uid || activeSessionRestored.current) return;
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
      activeSessionRestored.current = true;
      setHistory(prev => {
        // Kalau harinya belum ada sama sekali di history (scaffold "workouts" belum sempat
        // ke-flush ke Firestore sebelum app di-force-close), buat scaffold kosong di sini —
        // jangan nunggu Firestore yang bisa jadi memang tidak pernah menerima tulisan itu,
        // karena itu bikin _activeSession di localStorage nyangkut selamanya, gak pernah
        // ke-restore ke layar meskipun datanya aman.
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
    }
  }, [isDataLoaded, isHistoryLoaded, user?.uid]);

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
  // 3.8. ONE-TIME CLEANUP: HAPUS SESI HC PING-PONG
  // Sesi HC kosong (programId='healthconnect', exercises=[], log={}) yang berada di hari
  // yang sama dengan sesi Logym asli (non-hc_) dalam window ±45 menit adalah duplikat
  // ping-pong (Logym → HC → Logym). Bersihkan sekali saat history sudah loaded.
  // ==========================================
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

        // Kumpulkan sesi Logym asli (bukan dari HC import)
        const nativeWorkouts = day.workouts.filter(w => !w.id?.startsWith('hc_'));
        if (nativeWorkouts.length === 0) return;

        const filtered = day.workouts.filter(w => {
          if (!w.id?.startsWith('hc_')) return true; // selalu pertahankan sesi Logym asli
          // Hanya hapus kalau sesi HC ini benar-benar kosong (ping-pong ghost)
          const isEmpty = (!w.exercises || w.exercises.length === 0) && (!w.log || Object.keys(w.log).length === 0);
          if (!isEmpty) return true; // pertahankan sesi HC yang punya data nyata (dari Samsung Health dll)
          // Cek apakah ada sesi Logym asli dalam window ±45 menit
          const [hcH, hcM] = (w.timestamp || '00:00').split(':').map(Number);
          const isDuplicate = nativeWorkouts.some(nat => {
            if (!nat.timestamp) return false;
            const [nH, nM] = nat.timestamp.split(':').map(Number);
            return Math.abs((hcH * 60 + hcM) - (nH * 60 + nM)) < 45;
          });
          return !isDuplicate; // hapus kalau duplikat
        });

        if (filtered.length !== day.workouts.length) {
          changed = true;
          next[dateStr] = { ...day, workouts: filtered };
        }
      });
      return changed ? next : prev;
    });
  }, [isHistoryLoaded, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps


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
      // Flush save yang masih menunggu debounce (2 detik) sebelum signOut — kalau tidak,
      // effect auto-save akan membatalkan timernya begitu user jadi null dan perubahan
      // (mis. latihan yang baru selesai dicatat) hilang tanpa pernah sampai ke Firestore.
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

  // Hapus semua jejak data user di Firestore (dokumen utama, history per tahun, dan data komunitas).
  // Catatan: solusi jangka panjang yang lebih kuat adalah Cloud Function onUserDeleted dengan Admin SDK.
  const deleteAllUserData = async (uid) => {
    const refsToDelete = [];

    const safeGetDocs = async (q) => {
      try { return (await getDocs(q)).docs; } catch { return []; }
    };

    // Subkoleksi history per tahun
    refsToDelete.push(...(await safeGetDocs(collection(db, 'logym_users', uid, 'history_years'))).map(d => d.ref));
    // Postingan komunitas milik user
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_community_posts'), where('userId', '==', uid)))).map(d => d.ref));
    // Notifikasi untuk user
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_notifications'), where('toUserId', '==', uid)))).map(d => d.ref));
    // Relasi follow & block dua arah
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_follows'), where('followerId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_follows'), where('followingId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_blocks'), where('blockerId', '==', uid)))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(query(collection(db, 'logym_blocks'), where('blockedId', '==', uid)))).map(d => d.ref));
    // Profil komunitas, dokumen utama, dan dokumen legacy 'userData'
    refsToDelete.push(doc(db, 'logym_community_users', uid));
    refsToDelete.push(doc(db, 'logym_users', uid));
    refsToDelete.push(doc(db, 'logym_userData', uid));
    // Lepaskan reservasi username supaya tidak nyangkut selamanya di akun yang sudah dihapus
    if (userProfile?.username) {
      refsToDelete.push(doc(db, 'logym_usernames', userProfile.username));
    }

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

      // 2. Clear local storage SEKARANG, bukan sesudah deleteUser — deleteUser sering gagal
      // (auth/requires-recent-login) kalau sesinya gak baru, dan kalau localStorage.clear()
      // nunggu di bawahnya, flag `lyfit_onboarding_completed_${uid}` nyangkut 'true' selamanya
      // walau profil Firestore-nya udah kehapus di step 1 — bikin akun yang "gagal" dihapus
      // keliatan udah onboarded lagi pas login ulang, padahal datanya kosong.
      localStorage.clear();

      // 3. Delete user from auth
      await deleteUser(auth.currentUser);

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
    // Sengaja pakai #3b82f6 (bukan sky-400 kayak textAccent/borderAccent dark-mode lainnya) —
    // biar konsisten sama bgAccentSoft-nya pill nav aktif, gak ada warna biru yang lebih terang nyelip.
    navIconActive: 'text-[#3b82f6]',
    navIconInactive: theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
    navBorderActive: 'border-[#3b82f6]/30',
    placeholderAccent: theme === 'dark' ? 'placeholder-sky-400/40' : 'placeholder-[#3b82f6]/40',
    borderDashed: theme === 'dark' ? 'border-white/10' : 'border-black/10',
    bgBox: theme === 'dark' ? 'bg-black/20' : 'bg-[#3b82f6]/10',
    glow: theme === 'dark' ? 'shadow-[0_8px_32px_-10px_rgba(59,130,246,0.35)]' : 'shadow-[0_8px_32px_-14px_rgba(59,130,246,0.25)]'
  };

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
          title: 'Sesi Latihan Berjalan',
          message: 'Kamu sedang memiliki sesi latihan yang aktif berjalan. Apakah kamu ingin menyimpan sesi yang berjalan saat ini, atau langsung membuangnya dan berpindah ke sesi baru ini?',
          onConfirm: () => {
             if (sessionToRunRef.current) handleSaveWorkout(sessionToRunRef.current);
             setTimeout(doNav, 100);
          },
          confirmText: 'Simpan Perubahan',
          onDiscard: () => {
             handleCancelWorkout(sessionToRunRef.current);
             setTimeout(doNav, 100);
          },
          discardText: 'Buang Perubahan'
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
    // Tunggu history (bukan cuma dokumen utama) — kalau tidak, efek ini bisa jalan duluan
    // dengan history={} (kosong), langsung mengunci loadedDate, dan begitu history yang asli
    // (berikut _activeSession hasil restore dari localStorage) datang belakangan, efek ini
    // sudah tidak jalan lagi karena dianggap "sudah di-load" untuk tanggal itu.
    if (!isDataLoaded || !isHistoryLoaded) return;

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
  }, [selectedDate, activeProgramId, history, programs, isDataLoaded, isHistoryLoaded, loadedDate]);

  const getBaseEx = (exId) => {
    const exIdStr = String(exId);
    
    // Helper function to check if an exercise matches the exId
    const isMatch = (e) => {
      if (!e) return false;
      const eIdStr = String(e.id);
      const eOrigIdStr = e.originalId ? String(e.originalId) : null;
      return exIdStr === eIdStr || exIdStr.startsWith(eIdStr + '-') ||
             (eOrigIdStr && (exIdStr === eOrigIdStr || exIdStr.startsWith(eOrigIdStr + '-')));
    };
    
    // 1. Cari di history hari ini (overriddenExercises atau exercises)
    const todayData = history[selectedDate];
    if (todayData && todayData.workouts) {
       for (const w of todayData.workouts) {
          const found = (w.overriddenExercises || w.exercises || []).find(isMatch);
          if (found) return found;
       }
    }

    // 2. Cari di programs & extraExercises
    return [...programs.map(p => p.exercises || []).flat(), ...extraExercises].find(isMatch);
  };

  const getSetLogs = (ex, idToCheck) => {
    if (exerciseLogs[idToCheck]) return exerciseLogs[idToCheck];
    
    // Fallback if the idToCheck is a composite ID but history was loaded with the base ID
    const matchingKey = Object.keys(exerciseLogs).find(key => 
      idToCheck && typeof idToCheck === 'string' && idToCheck.startsWith(key + '-')
    );
    if (matchingKey) return exerciseLogs[matchingKey];
    
    // Fallback to history for completed workouts
    if (ex?.workoutId) {
      const dayData = history[selectedDate];
      if (dayData && dayData.workouts) {
        const workoutEntry = dayData.workouts.find(w => w.id === ex.workoutId);
        if (workoutEntry && workoutEntry.log) {
          const savedLog = workoutEntry.log[ex.id] || workoutEntry.log[ex.originalId];
          if (savedLog) return savedLog;
        }
      }
    }
    
    const libMatch = exerciseLibrary.find(e => e.id === ex?.id || e.name?.toLowerCase() === ex?.name?.toLowerCase());
    const suggestedWeight = libMatch?.lastWeight || libMatch?.rm10 || ex?.defaultWeight || 0;
    
    return Array.from({length: ex?.sets || 3}).map(() => ({ 
      w: suggestedWeight, 
      r: ex?.reps || 10, 
      d: ex?.duration || 10, 
      done: false 
    }));
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
        // --- UPDATE LAST WEIGHT AND RM10 ONLY ---
        const weight = Number(currentLogs[setIdx].w) || 0;
        const reps = Number(currentLogs[setIdx].r) || 0;
        if (ex && weight > 0 && (!ex.type || ex.type === 'weight' || ex.type === 'reps')) {
           const c1RM = weight * (1 + reps / 30);
           const c10RM = Math.round((c1RM / 1.3333) * 10) / 10;
           
           setExerciseLibrary(lib => {
              const existingIdx = lib.findIndex(e => e.name?.toLowerCase() === ex.name?.toLowerCase() || e.id === ex.id);
              if (existingIdx >= 0) {
                  const existingRm = lib[existingIdx].rm10 || 0;
                  const newLib = [...lib];
                  let updated = false;
                  if (lib[existingIdx].lastWeight !== weight) {
                     newLib[existingIdx] = { ...newLib[existingIdx], lastWeight: weight };
                     updated = true;
                  }
                  if (c10RM > existingRm) {
                     newLib[existingIdx] = { ...newLib[existingIdx], rm10: c10RM };
                     updated = true;
                  }
                  if (updated) return newLib;
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

  // Hapus permanen 1 exercise dari sesi PROGRAM yang SUDAH SELESAI (koreksi riwayat lewat Kalender).
  // Beda dari handleRemoveExtraEx (yang hapus dari extraExercises/"Latihan Ekstra") — exercise
  // program gak punya array terpisah, jadi harus difilter langsung dari overriddenExercises (atau
  // dibekukan dulu dari rutinitas live kalau belum pernah dibekukan) milik entri workout itu di history.
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
      // Semua exercise di sesi ini bakal kehapus — overriddenExercises jadi [] bikin save berikutnya
      // mengira "belum pernah dibekukan" dan narik ulang rutinitas live (lihat handleSaveWorkout).
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
    if (healthConnectEnabled && workoutStartTime && durationSecs >= 60) {
      const kcal = calculateWorkoutCalories(userProfile?.weight, durationSecs / 60);
      const startISO = new Date(workoutStartTime).toISOString();
      const endISO = new Date().toISOString();
      hcWriteWorkoutCalories(startISO, endISO, kcal);
      // Sesi latihan formal (jenis olahraga + durasi) supaya kebaca app lain sebagai "Workout",
      // bukan cuma angka kalori. Lewat plugin lokal ExerciseWriterPlugin.kt.
      // Daftar latihan dirakit sama seperti yang nanti dibekukan ke riwayat di bawah, biar
      // jenis olahraganya (kardio vs beban) ditebak dari isi sesi yang sebenarnya.
      const srcProg = programs.find((pr) => pr.id === (progId || '').toString().replace('projected_', '').split('_')[0]);
      const sessionExercises = [...(srcProg?.exercises || []), ...(extraExercises || [])];
      const sessionTitle = progId === 'extra' ? 'Ekstra' : (srcProg?.name || 'Latihan Logym');
      hcRequestWorkoutWritePermission().then((ok) => {
        if (ok) hcWriteWorkoutSession({
          startDate: startISO,
          endDate: endISO,
          exerciseType: guessWorkoutType(sessionExercises),
          title: sessionTitle,
        });
      });
    }
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

    let cleanLogs = {};
    let cleanSkipped = {};
    let cleanExtra = [];
    try {
      cleanLogs = JSON.parse(JSON.stringify(exerciseLogs || {}));
      cleanSkipped = JSON.parse(JSON.stringify(skippedExercises || {}));
      cleanExtra = JSON.parse(JSON.stringify(extraExercises || []));
    } catch (e) {
      console.warn("Failed to sanitize workout logs", e);
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
            skipped: cleanSkipped,
            exercises: cleanExtra,
            timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
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
                skipped: cleanSkipped,
                exercises: cleanExtra,
                timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                duration: formatDur(finalSecs)
              };
          } else {
              workouts.push({
                id: `adhoc_${Date.now()}`,
                programId: 'adhoc',
                programName: 'Ekstra',
                status: 'completed',
                log: cleanLogs,
                skipped: cleanSkipped,
                exercises: cleanExtra,
                timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                duration: formatDur(durationSecs)
              });
          }
        }
      } else {
        // Untuk program biasa
        let isTargetFound = false;
        workouts = workouts.map(w => {
          const isTargetWorkout = focusWorkoutId 
            ? (w.id === focusWorkoutId || w.programId === focusWorkoutId)
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
              else frozenExercises = [];
            }
            if (extraExercises && extraExercises.length > 0) {
                const existingIds = new Set(frozenExercises.map(e => e.id));
                const newExtras = extraExercises.filter(e => !existingIds.has(e.id));
                frozenExercises = [...frozenExercises, ...JSON.parse(JSON.stringify(newExtras))];
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
              skipped: cleanSkipped,
              timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
              duration: formatDur(finalSecs),
              ...(frozenExercises ? { overriddenExercises: frozenExercises } : {})
            };
          }
          return w;
        });

        if (!isTargetFound) {
            // Second-pass: try any planned/non-completed workout matching progId
            // This catches cases where focusWorkoutId mismatches but the correct session exists
            let resolvedProgId = progId;
            if (focusWorkoutId && focusWorkoutId.startsWith('projected_')) {
                resolvedProgId = focusWorkoutId.replace('projected_','').split('_')[0];
            } else if (progId && progId.startsWith('projected_')) {
                resolvedProgId = progId.replace('projected_','').split('_')[0];
            }

            const secondPassIdx = workouts.findIndex(w => 
              w.programId === resolvedProgId && w.status !== 'completed'
            );

            if (secondPassIdx >= 0) {
              // Found a matching planned session — update it instead of creating new
              const existingW = workouts[secondPassIdx];
              let realProgramId = existingW.programId || resolvedProgId;
              let frozenExercises = existingW.overriddenExercises;
              if (!frozenExercises || frozenExercises.length === 0) {
                const srcProg = programs.find(pr => pr.id === realProgramId);
                if (srcProg?.exercises?.length > 0) frozenExercises = JSON.parse(JSON.stringify(srcProg.exercises));
                else frozenExercises = [];
              }
              if (extraExercises && extraExercises.length > 0) {
                  const existingIds = new Set(frozenExercises.map(e => e.id));
                  const newExtras = extraExercises.filter(e => !existingIds.has(e.id));
                  frozenExercises = [...frozenExercises, ...JSON.parse(JSON.stringify(newExtras))];
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
              const finalSecs = Math.max(durationSecs, existingSecs);
              workouts[secondPassIdx] = {
                ...existingW,
                programId: realProgramId,
                status: 'completed',
                log: cleanLogs,
                skipped: cleanSkipped,
                exercises: cleanExtra,
                timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                duration: formatDur(finalSecs),
                ...(frozenExercises ? { overriddenExercises: frozenExercises } : {})
              };
            } else {
              // Truly no match — create new entry
              let pName = 'Sesi Latihan';
              let pId = resolvedProgId;
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
                 skipped: skippedExercises,
                 timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                 duration: durationSecs > 0 ? formatDur(durationSecs) : '00:00',
                 ...(p?.exercises?.length > 0 ? { overriddenExercises: JSON.parse(JSON.stringify(p.exercises)) } : {})
              });
            }
        }
      }
      
      h[targetDateStr] = { ...dayData, workouts, _activeSession: { ...(dayData._activeSession || {}), extraExercises: [] } };
      
      // --- SINKRONISASI KALORI DENGAN LOMEAL ---
      // Hitung kalori hari ini seketika agar langsung dikirim ke server oleh auto-save,
      // tanpa harus pindah ke DashboardTab terlebih dahulu.
      const currentWeight = Number(userProfile?.weight) || 70;
      let intTodayCals = 0;
      const todayCompletedWks = workouts.filter(w => w.status === 'completed' || w.programId === 'adhoc');
      todayCompletedWks.forEach(w => {
         intTodayCals += calculateSmartWorkoutCalories(currentWeight, w, w.log);
      });
      const bio = h[targetDateStr].bioData || {};
      const bmrCalories = bio.bmr || 1600;
      const stepsCalories = Math.round((Number(bio.steps || 0) * 0.04));
      const workoutCalories = intTodayCals;
      const totalDailyCals = bmrCalories + stepsCalories + workoutCalories;
      const isDailyCalsManual = !!bio._manualFlags?.activityCalories;
      const manualCals = isDailyCalsManual ? (Number(bio._manualFlags.activityCalories) || 0) : 0;
      const dailyCals = isDailyCalsManual ? Math.max(bmrCalories, manualCals) + workoutCalories : totalDailyCals;
      
      h[targetDateStr].bioData = { ...bio, activityCalories: dailyCals, activityCaloriesFloor: totalDailyCals };

      // Update Exercise Library dengan True 10RM dari seluruh riwayat
      setExerciseLibrary(lib => {
        let newLib = [...lib];
        let libChanged = false;
        Object.keys(cleanLogs).forEach(suffixedId => {
           const baseIdStr = typeof suffixedId === 'string' && suffixedId.includes('-') ? suffixedId.split('-')[0] : String(suffixedId);
           
           let true10RM = 0;
           let lastWeight = 0;
           let mostRecentDateMs = 0;

           Object.keys(h).forEach(dateStr => {
             const day = h[dateStr];
             const dateMs = new Date(dateStr).getTime();
             if (day.workouts) {
               day.workouts.forEach(wk => {
                 if (wk.status === 'completed' && wk.log) {
                   const targetKeys = Object.keys(wk.log).filter(k => 
                     String(k) === baseIdStr || (typeof k === 'string' && k.startsWith(`${baseIdStr}-`))
                   );
                   
                   targetKeys.forEach(k => {
                     let bestWeightInSession = 0;
                     wk.log[k].forEach(s => {
                       if (!s.skipped && s.w > 0 && s.r > 0) {
                         const c1RM = Number(s.w) * (1 + Number(s.r) / 30);
                         const c10RM = c1RM / 1.3333;
                         if (c10RM > true10RM) true10RM = c10RM;
                         if (Number(s.w) > bestWeightInSession) {
                           bestWeightInSession = Number(s.w);
                         }
                       }
                     });
                     
                     // If we found a valid weight, and this session is the most recent (or same day but we process it now)
                     if (bestWeightInSession > 0 && dateMs >= mostRecentDateMs) {
                        mostRecentDateMs = dateMs;
                        lastWeight = bestWeightInSession;
                     }
                   });
                 }
               });
             }
           });
           
           if (true10RM > 0) {
              const existingIdx = newLib.findIndex(e => String(e.id) === baseIdStr);
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

    localStorage.setItem('logym_calendar_mode', 'weekly');
    localStorage.setItem('logym_show_monthly_stats', 'true');
    setActiveTab('calendar');
  };

  const handleEditPastWorkout = (dateStr, w) => {
    const doEdit = () => {
      playSoundEffect('click', soundEnabled);
      setSelectedDate(dateStr);
      setActiveProgramId(w.programId);
      setFocusWorkoutId(w.programId === 'adhoc' ? 'extra' : w.id);
      setSessionToRun(w.programId === 'adhoc' ? 'extra' : w.id);

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

    if (isWorkoutActive) {
       setConfirmModal({
          isOpen: true,
          title: 'Sesi Latihan Berjalan',
          message: 'Kamu sedang memiliki sesi latihan yang aktif berjalan. Apakah kamu ingin menyimpan sesi yang berjalan saat ini, atau langsung membuangnya dan berpindah untuk mengedit riwayat latihan ini?',
          onConfirm: () => {
             if (sessionToRunRef.current) handleSaveWorkout(sessionToRunRef.current);
             setTimeout(doEdit, 100);
          },
          confirmText: 'Simpan Perubahan',
          onDiscard: () => {
             // Directly cancel without a second modal
             setIsImmersiveMode(false);
             setIsWorkoutActive(false);
             setWorkoutStartTime(null);
             setRestTargetTime(null);
             setRestTimer(0);
             setTimeout(doEdit, 100);
          },
          discardText: 'Buang Perubahan'
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
  const __cachedUidRender = localStorage.getItem('__CACHED_UID');
  const isWaitingForAuth = isAuthChecking && !__cachedUidRender;
  
  if (isWaitingForAuth || (user && (!isDataLoaded || !isHistoryLoaded))) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f1115]' : 'bg-white'}`}>
         <img src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} alt="Logym Logo" className="w-40 h-40 object-contain animate-pulse drop-shadow-2xl" />
         
         {isSlowLoading && user && (!isDataLoaded || !isHistoryLoaded) && (
           <div className="absolute bottom-12 left-0 right-0 px-8 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
             <Loader2 className={`w-5 h-5 animate-spin mb-3 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
             <p className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Mengambil data dari server...</p>
             <p className={`text-[10px] mt-1.5 leading-relaxed max-w-[250px] mx-auto ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Koneksi mungkin sedang lambat, mohon tunggu sebentar agar data tersinkronisasi.</p>
           </div>
         )}
      </div>
    );
  }

  // JIKA USER BELUM LOGIN
  if (!user) {
    {/* onLogin sengaja no-op: setUser hanya boleh terjadi lewat onAuthStateChanged
        di atas, karena itu satu-satunya jalur yang me-reset isDataLoaded/isHistoryLoaded.
        Kalau AuthPage langsung setUser sendiri, race dengan reset itu bikin UI render
        data lama/kosong sebelum onSnapshot sempat narik data user baru. */}
    return <AuthPage t={t} theme={theme} soundEnabled={soundEnabled} onLogin={() => {}} />;
  }

  // JIKA USER SUDAH LOGIN TAPI BELUM ONBOARDING
  //
  // Ada 3 penanda "sudah onboarding" yang beda-beda dari beberapa generasi kode:
  // - userProfile.hasCompletedOnboarding (alur lama, field di settings.userProfile)
  // - localStorage lyfit_onboarding_completed_{uid} (di-mirror dari field FLAT Firestore
  //   `onboardingCompleted` di logym_users/{uid} tiap snapshot masuk — lihat useEffect
  //   snapshot di atas)
  // Dulu di sini cuma dicek `userProfile.onboardingCompleted` — field itu TIDAK PERNAH
  // ditulis oleh kode manapun (beda nama sama `hasCompletedOnboarding`, beda tempat dari
  // field flat), jadi selalu falsy dan SEMUA user — baru maupun lama yang udah pernah
  // selesai onboarding — kejebak di layar ini selamanya, gak ada jalan balik ke app.
  // Juga dulu ada 2 blok kondisi yang kondisi pertama superset dari kedua (selalu duluan
  // kena, `onComplete` no-op) — blok kedua yang beneran nutup gate gak pernah kepanggil.
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
          // Update optimistic lokal — OnboardingFlow.finish() sendiri yang nulis ke
          // Firestore (logym_users/{uid}), ini cuma biar gate-nya langsung ketutup
          // tanpa nunggu snapshot round-trip balik.
          // PENTING: argumen `answers` sebelumnya DIBUANG di sini — OnboardingFlow.finish()
          // udah bener ngirim onComplete(answers) berisi name/gender/dob/weight/height,
          // tapi gate ini gak pernah nampung, jadi `userProfile` (satu-satunya state yang
          // dibaca ProgramQuestionnaireModal & fitur lain) tetap kosong walau onboarding
          // udah selesai — makanya kuesioner berikutnya nunjukin nama/dob/dst kosong lagi.
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
      className={`min-h-screen flex flex-col ${t.bgApp} ${t.textMain} font-sans ${activeTab === 'calendar' ? 'h-[100dvh] overflow-hidden' : 'pb-32'} transition-colors duration-300`}
      onTouchStart={handleGlobalTouchStart}
      onTouchEnd={handleGlobalTouchEnd}
    >
      <ConfirmModal confirmModal={confirmModal} setConfirmModal={setConfirmModal} t={t} lang={lang} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} />

      {cloudSaveError && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md p-3 px-4 rounded-2xl bg-rose-600 text-white shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black mb-0.5">Gagal menyimpan ke cloud</p>
            <p className="text-[11px] leading-snug text-white/85 break-words">{cloudSaveError}</p>
          </div>
          <button onClick={() => setCloudSaveError(null)} className="shrink-0 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <X size={14} />
          </button>
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
           // Persist to Firebase so it syncs across all devices
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
           user={user} setUser={setUser} t={t} theme={theme} handleLogout={handleLogout} history={history}
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
           logiPersona={logiPersona} setLogiPersona={setLogiPersona}
           logiCustomInstruction={logiCustomInstruction} setLogiCustomInstruction={setLogiCustomInstruction}
           logiMemory={logiMemory} setLogiMemory={setLogiMemory}
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
      
      <main className={`${activeTab === 'calendar' ? 'p-0 flex-1 flex flex-col min-h-0 overflow-hidden' : activeTab === 'database' ? 'px-4 pb-4 pt-0 min-h-[70vh] max-w-5xl mx-auto w-full' : 'p-4 min-h-[70vh] max-w-5xl mx-auto w-full'}`}>
        <TabSlider activeTab={activeTab} tabIndex={['dashboard','workout','calendar','program','database'].indexOf(activeTab)} className={activeTab === 'calendar' ? 'flex-1 flex flex-col min-h-0' : ''}>
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
               userApiKeys={userApiKeys}
               keyStatuses={keyStatuses} setKeyStatuses={setKeyStatuses}
               setShowSettings={setShowSettings}
               userAchievements={userAchievements} connectedApps={connectedApps}
               userProfile={userProfile}
               lomealToday={lomealToday} lomealTargets={lomealTargets}
             />
         )}
         
         {activeTab === 'workout' && (
             <WorkoutTab 
              setConfirmModal={setConfirmModal}
              t={t} lang={lang} language={language} programs={programs} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              history={history} setHistory={setHistory} setActiveTab={setActiveTab}
              units={units} userProfile={userProfile}
              tabSlideDir={tabSlideDir}
              activeProgramId={activeProgramId} setActiveProgramId={setActiveProgramId} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect} 
               warmupVideos={warmupVideos} cooldownVideos={cooldownVideos} onOpenDetail={setGlobalDetailExercise}
               exerciseLibrary={exerciseLibrary} setExerciseLibrary={setExerciseLibrary}
               exerciseLogs={exerciseLogs} skippedExercises={skippedExercises} extraExercises={extraExercises}
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
               sessionToRun={sessionToRun} isWorkoutActive={isWorkoutActive}
               selectedDate={selectedDate} setSelectedDate={setSelectedDate} setActiveTab={setActiveTab}
               weekStartDay={weekStartDay} defaultReminderTime={defaultReminderTime} reminderEnabled={reminderEnabled}
               units={units}
               activePlanIds={activePlanIds}
               userProfile={userProfile}
               logiPersona={logiPersona}
               activityTargets={activityTargets}
             />
         )}

         {activeTab === 'program' && (
             <ProgramTab setConfirmModal={setConfirmModal} 
               onPostCreated={handlePostCreated}
               t={t} lang={lang} programs={programs} setPrograms={setPrograms} 
               user={user} exerciseLibrary={exerciseLibrary} soundEnabled={soundEnabled}
               setActiveAddModalTarget={setActiveAddModalTarget}
               saveStateToHistory={saveStateToHistory}
               openQuestionnaire={() => setShowQuestionnaire(true)}
               activePlanIds={activePlanIds} setActivePlanIds={setActivePlanIds}
               gymProfiles={gymProfiles}
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
        </TabSlider>
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
        exerciseLogs={exerciseLogs} exerciseLibrary={exerciseLibrary}
      />

      {/* === GLOBAL COACH LOGI FLOAT === */}
      {user && (
        <CoachLogiFloat
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
        logiPersona={logiPersona}
        logiCustomInstruction={logiCustomInstruction}
        logiMemory={logiMemory}
        setLogiMemory={setLogiMemory}
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
      {showInstallPrompt && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-bottom-8 duration-300 ${t.bgCard} ${t.border} border`}>
             <img src="/icon-192.png" className="w-20 h-20 rounded-2xl mb-4 shadow-xl border border-white/10" alt="Logym Logo" />
             <h3 className={`text-xl font-black ${t.textMain} mb-2`}>Install Logym App</h3>
             <p className={`text-sm ${t.textMuted} mb-6`}>Install aplikasi Logym di perangkatmu untuk akses lebih cepat, latihan offline, dan pengalaman yang lebih mulus.</p>
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
    </>
  );
}
