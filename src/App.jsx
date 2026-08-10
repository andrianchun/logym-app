import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- IMPORT CAPACITOR (FULLSCREEN) ---
import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapApp } from '@capacitor/app';

export const WorkoutTimerPlugin = registerPlugin('WorkoutTimer');


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
import { calculateSmartWorkoutCalories, parseWorkoutDurationMinutes, guessWorkoutType, workoutWindow, summarizeHeartRate, recoveredWorkoutSeconds, dailyBurnCalories, recomputeStrengthRecords, buildHcSessionDetail } from './utils/workoutCalc';
import { hcAvailable, hcRequestPermissions, hcReadRange, hcBackfillHistory, hcReadHeartRateWindow, hcCheckStatus, hcInventory, hcWriteWorkoutSession, hcRequestWorkoutWritePermission, hcCheckWorkoutWritePermission, capIntradayLog } from './utils/healthConnect';
import { bumpExercisePopularity } from './utils/exercisePopularity';
import useDialog from './hooks/useDialog';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import UpdaterAlert from './components/UpdaterAlert';
import { getLocalYMD, resolveProjectedProgramId, isLomealOwned, resolveLoggedExercise, defaultMasterExercises, defaultPrograms, defaultWarmupVideos, defaultCooldownVideos } from './data/constants';
import { serializeDay, dayFingerprint, migrateBaseline, reconcileHistory, workoutsToMap, workoutIdsFromBaseline, diffFields, stableStringify } from './utils/historySync';
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
// boot, bukan sumber kebenaran — gagal menulisnya tidak boleh pernah fatal.
const writeCache = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { console.warn(`[Cache] gagal menulis ${key} (kuota penuh?)`); return false; }
};

export default function App() {
  // --- STATE AUTH & LOADING ---
  const __previewUser = readCache('__PREVIEW_USER', null);
  const __cachedUid = localStorage.getItem('__CACHED_UID');
  const __cachedUser = __cachedUid ? { uid: __cachedUid, name: 'Sobat Logym' } : null;
  const [user, setUser] = useState(__previewUser || __cachedUser);
  const [isAuthChecking, setIsAuthChecking] = useState(!__previewUser);
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
  const [warmupVideos, _setWarmupVideos] = useState(defaultWarmupVideos);
  const setWarmupVideos = _setWarmupVideos;
  const [cooldownVideos, _setCooldownVideos] = useState(defaultCooldownVideos);
  const setCooldownVideos = _setCooldownVideos;
  const [weekStartDay, setWeekStartDay] = useState(0); // 0: Sunday, 1: Monday
  const [defaultReminderTime, setDefaultReminderTime] = useState("15:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [biometricStandard, setBiometricStandard] = useState('asia'); // 'asia' | 'western'
  const [unitSystem, setUnitSystem] = useState('metric'); // deprecated, kept for safety during transition
  const [units, setUnits] = useState({ weight: 'kg', height: 'cm', distance: 'km', temp: 'c' });
  // Initializer FUNGSI, bukan nilai. Sebagai nilai, ekspresinya dievaluasi ulang di SETIAP
  // render lalu hasilnya dibuang useState — artinya seluruh cache di-parse ulang tiap ketukan
  // angka reps. Untuk `history` itu berarti mem-parse JSON setahun penuh, puluhan kali per detik.
  const [userProfile, _setUserProfile] = useState(() => __previewUser ? null : readCache('__CACHED_PROFILE', null));
  const setUserProfile = _setUserProfile;

  useEffect(() => {
    writeCache('__CACHED_PROFILE', userProfile);
  }, [userProfile]);

  const [gymProfiles, _setGymProfiles] = useState([{ id: 'default', name: 'Logym', equipment: 'all', config: {} }]);
  const setGymProfiles = _setGymProfiles;
  const [activeGymId, _setActiveGymId] = useState('default');
  const setActiveGymId = _setActiveGymId;
  const [userApiKeys, _setUserApiKeys] = useState([]);
  const setUserApiKeys = _setUserApiKeys;
  const [keyStatuses, setKeyStatuses] = useState({});
  const [logiPersona, setLogiPersona] = useState('santai');
  const [logiCustomInstruction, setLogiCustomInstruction] = useState('');
  const [logiMemory, _setLogiMemory] = useState([]);
  const setLogiMemory = _setLogiMemory;
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [activityTargets, _setActivityTargets] = useState({ steps: 10000, weeklyDuration: 150, sleep: 8 });
  const setActivityTargets = _setActivityTargets;

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

  const [userAchievements, setUserAchievements] = useState(() => __previewUser ? [] : readCache('__CACHED_ACHIEVEMENTS', []));
  useEffect(() => {
    writeCache('__CACHED_ACHIEVEMENTS', userAchievements);
  }, [userAchievements]);
  const [unlockedAchievementsPopup, setUnlockedAchievementsPopup] = useState([]);

  const [exerciseLibrary, _setExerciseLibrary] = useState(() => __previewUser ? defaultMasterExercises : readCache('__CACHED_EXERCISE_LIBRARY', defaultMasterExercises));
  useEffect(() => {
    writeCache('__CACHED_EXERCISE_LIBRARY', exerciseLibrary);
  }, [exerciseLibrary]);
  const setExerciseLibrary = _setExerciseLibrary;
  const [programs, _setPrograms] = useState(() => __previewUser ? defaultPrograms : readCache('__CACHED_PROGRAMS', defaultPrograms));
  useEffect(() => {
    writeCache('__CACHED_PROGRAMS', programs);
  }, [programs]);
  // Dulu di sini ada isExecutingSnapshot: penanda "sedang menerapkan data server" supaya
  // setter tidak salah dianggap tulisan lokal user. Ikut hilang bersama guard waktunya —
  // sekarang lokal vs server dibedakan dari ISI (baseline), bukan dari siapa yang memanggil
  // setter atau kapan. Kalau butuh membedakan asal perubahan lagi, bandingkan ke baseline;
  // jangan hidupkan lagi penanda global seperti ini.
  const setPrograms = _setPrograms;

  // --- HISTORY & STATS (dokumen terpisah per tahun) ---
  const [history, _setHistory] = useState(() => __previewUser ? {} : readCache('__CACHED_HISTORY', {}));
  // Cermin `history` yang selalu terkini, untuk dibaca dari dalam closure yang umurnya panjang
  // (listener onSnapshot dibuat sekali saja, jadi variabel state yang ditangkapnya membeku).
  // Di-assign saat render, bukan di useEffect — supaya tidak pernah tertinggal satu putaran.
  const historyMirror = useRef(history);
  historyMirror.current = history;
  // Gagal menulis cache history BUKAN sekadar "boot berikutnya lebih lambat". Baseline
  // (__CACHED_HISTORY_BASE) ikut mati di titik yang sama, dan baseline basi membuat rekonsiliasi
  // menyimpulkan "ada perubahan lokal belum terkirim" untuk tanggal yang sebenarnya cuma salinan
  // lama — snapshot server ditolak, lalu salinan basi itu dikirim menimpanya. Itu jalur
  // kehilangan data lintas device, jadi harus kelihatan di layar, bukan cuma di console.
  useEffect(() => {
    if (!writeCache('__CACHED_HISTORY', history)) {
      setCloudSaveError('Penyimpanan lokal penuh — cache latihan tidak bisa ditulis. Kosongkan ruang penyimpanan; sampai itu beres, data antar perangkat bisa tidak sinkron.');
    }
  }, [history]);
  
  // Dulu di sini ada lastLocalHistoryWriteAt: tiap setHistory menaikkan stempel waktu, dan
  // listener history membuang snapshot server kalau stempelnya < 3 detik. Masalahnya yang
  // memanggil setHistory bukan cuma aksi user — tiap ketukan angka reps, tiap hari yang
  // di-merge dari Health Connect (30 panggilan beruntun) ikut menaikkannya, jadi selama sesi
  // latihan atau sinkron HC guard-nya tidak pernah lepas dan device buta terhadap server.
  // Diganti rekonsiliasi berbasis ISI di listener history (lihat komentar di sana).
  const setHistory = _setHistory;

  // --- Health Connect: baca live (hari ini) + backfill histori ---
  const [healthAvailable, setHealthAvailable] = useState(false);
  useEffect(() => { hcAvailable().then(setHealthAvailable); }, []);

  // Field yang boleh diisi backfill/live-sync — TIDAK PERNAH nimpa field yang udah manual
  // (_manualFlags, lihat handleSaveManualData di DashboardTab.jsx).
  //
  // `activityCalories` SENGAJA TIDAK ADA DI SINI, jangan ditambahkan lagi. Field itu milik Logym
  // (BMR + langkah + latihan, lihat dailyBurnCalories); versi Health Connect punya satuan berbeda
  // (aktif saja, tanpa BMR) DAN sudah mengandung kalori yang Logym sendiri push ke sana, jadi
  // menimpakannya bikin satu sesi terhitung dua kali. Angka HC-nya tetap masuk sebagai
  // `hcCalories` (+ `hcCaloriesType`: 'active' atau 'total') — pembanding, bukan sumber hitungan.
  const HC_FIELDS = ['steps', 'stepMinutes', 'hcCalories', 'hcCaloriesType', 'heartRate', 'minHeartRate', 'maxHeartRate', 'restingHeartRate', 'weight', 'height', 'bodyFat', 'oxygenSaturation', 'bloodPressure', 'sleep', 'sleepAwake', 'sleepRem', 'sleepLight', 'sleepDeep', 'sleepLog', 'distance', 'bmr', 'heartRateLog', 'oxygenSaturationLog', 'bloodPressureLog'];

  // SATU setHistory untuk seluruh hasil sinkron, bukan satu per hari. Versi lama memanggilnya
  // 30x beruntun (sekali per hari) — 30 render seluruh app per sinkron, dan dulu itu juga yang
  // membuat guard "baru saja menulis lokal" tidak pernah lepas sepanjang sinkron.
  const mergeHcDays = (byDay) => {
    setHistory(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(byDay).forEach(([ymd, hcData]) => {
        const existingBio = prev[ymd]?.bioData || {};
        const manualFlags = existingBio._manualFlags || {};
        const patch = {};
        HC_FIELDS.forEach((k) => {
          if (hcData[k] === undefined) return;
          if (manualFlags[k] !== undefined) return;
          // JANGAN DIBLOKIR: Health Connect bersifat kumulatif (contoh: langkah nambah terus).
          // Kalau diblokir saat existingVal !== 0, data cuma narik sekali di pagi hari lalu nyangkut selamanya.
          // Menulis ulang nilai yang sama juga tidak bikin boros: auto-save membandingkan isi,
          // jadi hari yang nilainya tidak berubah tidak pernah dikirim ke Firestore.
          if (existingBio[k] !== hcData[k]) patch[k] = hcData[k];
        });
        if (Object.keys(patch).length === 0) return;
        next[ymd] = { ...(prev[ymd] || {}), bioData: { ...existingBio, ...patch } };
        changed = true;
      });
      return changed ? next : prev;
    });
  };

  // Buang field milik Lomeal dari bioData yang mau dikirim ke Firestore. Logym cuma MENAMPILKAN
  // dua angka ini; Lomeal yang menulisnya, untuk hari mana pun, kapan pun user mengedit.
  //
  // `_manualFlags` ikut dibersihkan dari kunci yang sama: kalau flag-nya tetap dikirim sementara
  // nilainya tidak, hari itu bisa berakhir bertanda "punya Lomeal" padahal angkanya milik Logym.
  const stripLomealOwned = (bioData) => {
    const owned = ['nutritionCalories', 'activityCalories'].filter(f => isLomealOwned(bioData, f));
    if (owned.length === 0) return bioData;
    const clean = { ...bioData };
    const flags = { ...(clean._manualFlags || {}) };
    owned.forEach(f => { delete clean[f]; delete flags[f]; });
    if (Object.keys(flags).length > 0) clean._manualFlags = flags; else delete clean._manualFlags;
    return clean;
  };

  // Isi nadi asli (dari jam tangan, lewat Health Connect) ke sesi latihan yang belum punya,
  // sejauh `days` hari ke belakang. MEMBACA SAJA — tidak menulis apa pun ke Health Connect.
  //
  // Dipakai dua jalur: sinkron rutin (30/7 hari) dan sapuan dalam sekali-jalan (setahun). Kalori
  // sengaja TIDAK diambil dari sini: itu tetap hitungan Logym berbasis set, yang lebih presisi
  // daripada taksiran wearable.
  //
  // Satu setHistory di akhir, bukan per sesi — setHistory per sesi berarti satu render seluruh
  // app per sesi (alasan yang sama dengan mergeHcDays).
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
        // `guessed` = jam sesinya tidak diketahui sama sekali (jatuh ke siang hari). Jangan
        // ditarik: yang didapat adalah nadi pukul 12 siang, lalu tampil berlabel "HEALTH CONNECT"
        // seolah nadi latihan sungguhan. Kurva dummy yang jujur mengaku dummy lebih baik.
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

  // Dorong sesi latihan Logym (kalori + record sesi) ke Health Connect, sejauh `days` ke belakang.
  //
  // Health Connect menerima record bertanggal lampau — yang dibatasi cuma MEMBACA data lama
  // (butuh READ_HEALTH_DATA_HISTORY), menulis ke belakang tidak dibatasi sama sekali.
  // Aman diulang: tiap sesi dicatat lewat dedupeKey (id sesi), jadi tidak pernah dobel.
  // PENANDA ANTI-DUPLIKAT ADA DI RECORD SESINYA (`w.hcSync`), bukan di localStorage.
  //
  // Versi lama hanya mengandalkan memo localStorage di utils/healthConnect.js. Memo itu hilang
  // begitu app di-reinstall atau datanya dibersihkan — dan sesudahnya sapuan setahun menulis
  // ULANG semua sesi. Health Connect menjumlahkan record dan tidak punya jalur hapus lewat plugin
  // ini, jadi kalori di Samsung Health melonjak dua kali lipat, permanen, tanpa cara membatalkan.
  //
  // `hcSync: { kcal, v }` ikut ke Firestore bersama sesinya: selamat dari reinstall, dan berlaku
  // sama di semua perangkat. `kcal` disimpan supaya sesi yang angkanya BERUBAH (durasi diperbaiki,
  // set ditambah) bisa dikirim ulang dengan versi naik — Health Connect meng-upsert lewat
  // clientRecordId, jadi yang lama diganti, bukan ditumpuki.
  const pushWorkoutsToHc = async (days, canWriteSession) => {
    let sessions = 0;
    const stamp = {}; // ymd -> { idSesi: { kcal, v } }
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
        const logsToUse = (w.log && Object.keys(w.log).length > 0) ? w.log : (history[ymd]?.exerciseLogs);
        const kcal = calculateSmartWorkoutCalories(userProfile?.weight, w, logsToUse);
        // Sudah pernah dikirim DENGAN ANGKA YANG SAMA — tidak ada yang perlu diperbarui.
        if (w.hcSync && w.hcSync.kcal === kcal) continue;
        const version = (Number(w.hcSync?.v) || 0) + 1;
        // Satu sumber jendela waktu — sama persis dengan yang dipakai fillSessionHeartRates,
        // supaya nadi dan record yang dikirim ke HC menggambarkan rentang yang identik.
        const { start, end } = workoutWindow(w, ymd);
        // Kalori TIDAK bisa di-upsert (plugin capgo tidak mengekspos metadata), jadi versi ulang
        // sengaja tidak dikirim: yang boleh ditulis cuma sekali, saat pertama kali.
        // KALORI SENGAJA TIDAK DITULIS KE HEALTH CONNECT. Jangan dihidupkan lagi.
        //
        // Health Connect MENJUMLAHKAN semua sumber untuk satu hari. Samsung Health sudah mencatat
        // kalori aktif jam yang sama dari sensor detak jantung; menambahkan taksiran Logym di
        // atasnya bukan melengkapi, tapi menghitung dua kali. Kejadian nyata: satu hari tercatat
        // ~2.000 kkal di HC padahal sesi Logym-nya 400.
        //
        // Tidak bisa ditambal dengan dedup: plugin capgo tidak mengekspos metadata sama sekali,
        // jadi record kalori tidak punya clientRecordId (beda dengan record sesi di bawah), tidak
        // bisa di-upsert, dan tidak bisa dihapus. Sekali tertulis, menetap selamanya.
        //
        // Yang hilang cuma angka kalori versi Logym di app lain — dan itu justru taksiran MET yang
        // lebih kasar daripada hitungan berbasis nadi milik Samsung. Yang berharga (jenis latihan,
        // durasi, daftar latihan, set x reps) tetap terkirim lewat record sesi di bawah.
        // Rincian isi sesi — segmen per latihan + ringkasan "3x10 @40kg". Dibangun dari log yang
        // sama dengan yang dipakai menghitung kalori, jadi apa yang muncul di Samsung Health
        // selalu menggambarkan set yang benar-benar dicentang, bukan yang dijadwalkan.
        const { segments, notes } = buildHcSessionDetail(w, logsToUse, start.getTime(), end.getTime());
        if (canWriteSession && await hcWriteWorkoutSession({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          exerciseType: guessWorkoutType(w.overriddenExercises || w.exercises),
          title: w.programName || 'Latihan',
          dedupeKey: w.id,
          version, segments, notes,
        })) sessions++;
        (stamp[ymd] = stamp[ymd] || {})[w.id] = { kcal, v: version };
      }
    }

    // Satu setHistory di akhir, bukan per sesi (alasan yang sama dengan mergeHcDays).
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
    const hcByDay = {};
    await hcBackfillHistory(days, () => false, (ymd, summary) => { filled++; hcByDay[ymd] = summary; });
    if (filled > 0) mergeHcDays(hcByDay);

    // SENGAJA gak baca balik sesi latihan dari Health Connect (hcReadWorkouts/mergeHcWorkouts
    // dihapus) — kayak app lain pada umumnya, Logym cuma jadi PENULIS buat sesi latihannya
    // sendiri. Baca balik bikin ping-pong: sesi yang Logym push ke HC bisa ke-tarik lagi jadi
    // "sesi baru" kalau heuristik dedup timestamp-nya meleset (lihat riwayat bug: 2026-08-05).

    // Arah sebaliknya: dorong histori latihan Logym (kalori terbakar) ke Health Connect.
    // Health Connect menerima record bertanggal lampau — yang dibatasi cuma MEMBACA data
    // lama (butuh READ_HEALTH_DATA_HISTORY), menulis ke belakang tidak dibatasi.
    // Aman diulang: tiap sesi dicatat lewat dedupeKey (id sesi), jadi tidak pernah dobel.
    const hrFilled = await fillSessionHeartRates(days);
    // Saat silent, jangan minta izin (bisa memunculkan dialog tiba-tiba) — cukup pakai yang
    // sudah ada. Kalau belum diberikan, sesi latihan dilewati dan akan terkirim di sinkron
    // manual berikutnya.
    const canWriteSession = silent ? await hcCheckWorkoutWritePermission() : await hcRequestWorkoutWritePermission();
    const { sessions } = await pushWorkoutsToHc(days, canWriteSession);

    if (status) {
      const denied = [...(status.readDenied || []), ...(status.writeDenied || [])];
      // Sengaja gak di-await — tombol yang manggil ini harus langsung balik normal begitu
      // proses selesai, gak boleh nunggu user tekan OK di popup buat lepas loading state-nya.
      showOtaAlert(
        `Izin Health Connect — baca: ${status.readAuthorized?.length || 0} tipe, tulis: ${status.writeAuthorized?.length || 0} tipe.` +
        (denied.length ? ` Ditolak: ${denied.join(', ')}.` : '') +
        // Tanpa pembagi: rentangnya inklusif dua ujung (hari ini + N hari ke belakang = N+1)
        // dan beda zona waktu bisa nambah satu lagi, jadi "32/30" bikin bingung.
        ` Histori masuk: ${filled} hari, nadi ${hrFilled} sesi. Terkirim ke Health Connect: ${sessions} sesi latihan.`
      );
    }
    } finally {
      hcSyncing.current = false;
      hcLastSync.current = Date.now();
    }
  };

  // Tombol "Sinkron Ulang" di Pengaturan — dengan dialog izin & popup hasil.
  const handleHcBackfill = (days = 30) => runHcSync({ days, silent: false });

  // SAPUAN DALAM SEKALI-JALAN, setahun ke belakang, DUA ARAH:
  //   masuk  — nadi asli per sesi buat latihan lama yang belum punya
  //   keluar — kalori + record sesi Logym yang belum pernah terkirim ke Health Connect
  //
  // Sengaja terpisah dari runHcSync dan tidak sekadar menaikkan `days` jadi 365 di sana: sinkron
  // rutin juga menarik RINGKASAN HARIAN, dan menariknya setahun sekaligus berarti kueri selebar
  // setahun per tipe data plus penulisan setahun bioData ke Firestore — dokumen tahunan itu
  // berbatas 1 MiB dan minggu ini baru saja menabrak batas index entry-nya.
  //
  // Arah keluar tidak bisa dibatalkan: plugin ini tidak punya jalur hapus, jadi ratusan latihan
  // bertanggal lampau yang muncul di Samsung Health akan menetap. Ini permintaan eksplisit user,
  // bukan efek samping — jangan diaktifkan diam-diam kalau kelak fungsi ini dipakai ulang.
  //
  // Penanda "sudah" baru dipasang setelah selesai. Kalau app ditutup di tengah jalan, sapuannya
  // diulang di pembukaan berikutnya — murah, karena sesi yang sudah punya nadi langsung dilewati
  // dan yang sudah terkirim ditahan memo dedupe.
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

  // Dorong sesi yang baru selesai ke Health Connect, setelah sesinya benar-benar masuk
  // `history` (id-nya baru ada di situ, dan id itulah dedupeKey-nya). Lihat catatan panjang
  // di handleSaveWorkout: ini satu-satunya jalur penulisan sesi ke HC.
  const hcPushAfterSave = useRef(false);
  useEffect(() => {
    if (!hcPushAfterSave.current) return;
    hcPushAfterSave.current = false;
    runHcSync({ days: 1, silent: true }); // sengaja lewat throttle 10 menit — ini dipicu user
  }, [history]);

  // SINKRON OTOMATIS: begitu tersambung, user tidak perlu menekan apa pun lagi.
  // Jalan saat app dibuka, tiap kembali ke depan (mis. habis buka Samsung Health), dan tiap
  // 30 menit selama app terbuka — dibatasi minimal 10 menit sekali biar tidak boros baterai.
  useEffect(() => {
    if (!healthConnectEnabled || !isDataLoaded) return;
    const sync = (days) => {
      if (Date.now() - hcLastSync.current < 10 * 60 * 1000) return;
      runHcSync({ days, silent: true });
    };
    // Sapuan setahun DIRANGKAI setelah sinkron biasa selesai, bukan dijalankan berbarengan:
    // keduanya memakai fillSessionHeartRates & pushWorkoutsToHc, dan kalau tumpang tindih, 30 hari
    // terakhir dikerjakan dua kali karena masing-masing membaca `history` versi sebelum yang lain
    // menulis (`hcSyncing` cuma menjaga runHcSync dari dirinya sendiri, bukan dari sapuan ini).
    runHcSync({ days: 30, silent: true }).then(runHcDeepBackfill); // pertama kali: langsung, tanpa jeda
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
  const [activePlanIds, _setActivePlanIds] = useState(() => __previewUser ? ['custom'] : readCache('__CACHED_ACTIVE_PLAN_IDS', ['custom']));
  useEffect(() => {
    writeCache('__CACHED_ACTIVE_PLAN_IDS', activePlanIds);
  }, [activePlanIds]);
  const setActivePlanIds = _setActivePlanIds;
  const [activeProgramId, setActiveProgramId] = useState(defaultPrograms[0]?.id || null);
  const [focusWorkoutId, setFocusWorkoutId] = useState(null);

  // Self-healing: Hapus duplikat ID pada program & latihan (menghindari React key warning /
  // error DndKit dari state lama — mis. sisa duplikat dari bug sinkron yang sempat nulis
  // dobel sebelum ke-perbaiki).
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const scheduleDailyReminder = async () => {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 8888 }] });
        if (!reminderEnabled) return;

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') return;

        const copy = getLogiNotification('start', logiPersona, { program: 'Latihan hari ini' });
        if (!copy) return;

        const [h, m] = (defaultReminderTime || '09:00').split(':');
        
        await LocalNotifications.schedule({
          notifications: [{
            id: 8888,
            title: copy.title,
            body: copy.body,
            schedule: { 
              on: {
                hour: parseInt(h, 10),
                minute: parseInt(m, 10)
              },
              repeats: true,
              allowWhileIdle: true
            },
            largeIcon: 'coach_logi_avatar',
          }]
        });
      } catch (err) {
        console.warn('Daily reminder error:', err);
      }
    };
    scheduleDailyReminder();
  }, [reminderEnabled, defaultReminderTime, logiPersona]);


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
  // Daftar latihan sesi yang lagi jalan, dilaporkan oleh WorkoutTab (satu-satunya tempat id
  // gabungan `${ex.id}-${workoutId}` dirakit). FloatingTimer butuh ini biar kalorinya sama.
  const [sessionExercises, setSessionExercises] = useState([]);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showExitToast, setShowExitToast] = useState(false);
  const [showSupersetToast, setShowSupersetToast] = useState(false);
  const [showRestoreToast, setShowRestoreToast] = useState('');
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
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
        WorkoutTimerPlugin.setAppState({ isActive }).catch(() => {});
      });
      return () => {
        sub.then(listener => listener.remove());
      };
    }
  }, []);

  useEffect(() => {
    if (!restTargetTime) return;
    
    const timeRemainingMs = restTargetTime - Date.now();
    
    // If the timer is already in the past, don't trigger
    if (timeRemainingMs <= 0) return;

    const timeout = setTimeout(() => {
      if (soundEnabled) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
      }
      playSoundEffect('success', soundEnabled);

      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        WorkoutTimerPlugin.updateTimer({ 
            isResting: false, 
            targetTime: 0, 
            workoutName: programs?.find(p => p.id === activeProgramId)?.name || 'Sesi Latihan Aktif' 
        }).catch(console.warn);
      }
    }, timeRemainingMs);

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        WorkoutTimerPlugin.updateTimer({ 
            isResting: true, 
            targetTime: restTargetTime, 
            workoutName: programs?.find(p => p.id === activeProgramId)?.name || 'Sesi Latihan Aktif' 
        }).catch(console.warn);
    }

    return () => {
        clearTimeout(timeout);
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            WorkoutTimerPlugin.updateTimer({ 
                isResting: false, 
                targetTime: 0, 
                workoutName: programs?.find(p => p.id === activeProgramId)?.name || 'Sesi Latihan Aktif' 
            }).catch(console.warn);
        }
    };
  }, [restTargetTime, soundEnabled, activeProgramId, programs]);

  // Target Memori: Stempel target hari ini ke bioData agar grafik riwayat tidak berubah
  // saat target diganti di kemudian hari.
  useEffect(() => {
     if (!isDataLoaded || !activityTargets) return;
     const todayStr = getLocalYMD(new Date());
     setHistory(prev => {
        const existingBio = prev[todayStr]?.bioData || {};
        
        if (
           existingBio.targetSteps === activityTargets.steps &&
           existingBio.targetActiveMinutes === activityTargets.weeklyDuration &&
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
                   targetActiveMinutes: activityTargets.weeklyDuration,
                   targetSleep: activityTargets.sleep,
                   targetCalories: activityTargets.activityCalories,
               }
           }
        };
     });
  }, [isDataLoaded, activityTargets]);

  // ==========================================
  // PERSISTENT WORKOUT NOTIFICATION (Android)
  // ==========================================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const NOTIF_ID = 9999;

    const showNotification = async () => {
      try {
        if (Capacitor.getPlatform() === 'android') {
           const workoutName = programs?.find(p => p.id === activeProgramId)?.name || 'Sesi Latihan Aktif';
           await WorkoutTimerPlugin.startTimer({ startTime: workoutStartTime || Date.now(), workoutName });
        }
      } catch (err) {
        console.warn('Notification error:', err);
      }
    };

    const cancelNotification = async () => {
      try {
        if (Capacitor.getPlatform() === 'android') {
           await WorkoutTimerPlugin.stopTimer();
        }
      } catch (err) {
        console.warn('Cancel notification error:', err);
      }
    };

    if (isWorkoutActive) {
      showNotification();
      return () => {
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
          // Akun berganti: cache & baseline milik akun sebelumnya tidak boleh dipakai sebagai
          // pembanding untuk data akun ini (bisa menimpa data orang lain / menahan data sendiri).
          setHistoryBaseline(null);
          setMainBaseline(null);
          localStorage.removeItem('__CACHED_HISTORY');
        }
        setUser({
           uid: currentUser.uid, 
           email: currentUser.email, 
           name: currentUser.displayName || 'Sobat Logym',
           photoURL: currentUser.photoURL
        });
        localStorage.setItem('__CACHED_UID', currentUser.uid);
      } else {
        localStorage.removeItem('__CACHED_UID');
        setHistoryBaseline(null);
        setMainBaseline(null);
        setUser(null);
        setIsDataLoaded(true);
        setIsHistoryLoaded(true);
        setHistory({});
        setPrograms(defaultPrograms);
        setExerciseLibrary(defaultMasterExercises);
        // PENTING: Reset timestamp debounce supaya reset state ini tidak 
        // dianggap sebagai "perubahan lokal baru" yang memblokir sinkronisasi onSnapshot

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
  const legacyMigrationRan = useRef(false); // lihat blok AUTOMATIC MIGRATION di listener utama
  // Kegagalan auto-save selama ini cuma nyangkut di console — user gak pernah tahu, padahal
  // gejalanya fatal: perubahan "kesimpan" di layar lalu balik sendiri begitu snapshot server
  // datang. Tampilkan di UI supaya ketahuan dan bisa dilaporkan.
  const [cloudSaveError, setCloudSaveError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'error'

  // Baseline per-field dokumen utama — kondisi terakhir yang diketahui tersimpan di server.
  // Ikut persist dengan alasan yang sama seperti baseline history: kalau mulai kosong tiap
  // boot, save pertama mengirim SELURUH isi dokumen lagi dan kita kembali ke perilaku
  // "device terakhir menang" yang justru mau dihilangkan.
  // SENGAJA in-memory, TIDAK persist. Baseline hanya sah kalau state lokal yang dibandingkan
  // ikut bertahan lintas reload. History memenuhi itu (__CACHED_HISTORY). Dokumen utama TIDAK:
  // gymProfiles, activeGymId, activityTargets, dan userApiKeys tidak punya cache lokal dan
  // balik ke default tiap boot. Kalau baselinenya persist, selisih "default vs terakhir
  // disimpan" salah dibaca sebagai editan lokal baru — server ditolak, lalu daftar default
  // dikirim menimpa data asli. Itu yang menghapus gym.
  //
  // Mulai null tiap boot berarti snapshot pertama selalu menang (benar: kita memang belum
  // menyimpan apa pun sesi ini), dan save pertama sesudahnya idempoten karena state sudah
  // sama dengan server.
  const mainBaselineRef = useRef(null);
  // Boleh ambil nilai server untuk field ini? Ya, kalau nilai lokal masih sama dengan baseline
  // (tidak ada perubahan lokal yang belum terkirim). WAJIB dipanggil dari bentuk functional
  // setState: closure listener onSnapshot dibuat sekali saja (deps [user?.uid, isAuthChecking]),
  // jadi variabel state yang ditangkapnya basi — hanya `prev` yang selalu terkini.
  const takeServer = (key, prev) => {
     const base = mainBaselineRef.current?.[key];
     if (base === undefined) return true; // belum pernah device ini simpan — server yang berlaku
     return stableStringify(prev) === base;
  };
  const setMainBaseline = (next) => { mainBaselineRef.current = next; };
  // Buang sisa kunci dari versi yang sempat mem-persist baseline ini (lihat catatan di atas).
  try { localStorage.removeItem('__CACHED_MAIN_BASE'); } catch { /* diabaikan */ }

  useEffect(() => {
    let unsubscribeMain = null;
    let unsubscribeHistory = null;

    // CATATAN: baseline history SENGAJA tidak di-reset di sini. Effect ini juga jalan di
    // setiap boot biasa, dan baseline yang ikut persist bareng __CACHED_HISTORY justru harus
    // bertahan lintas restart supaya rekonsiliasi bisa membedakan "perubahan lokal belum
    // terkirim" dari "salinan basi". Resetnya dilakukan di onAuthStateChanged, hanya saat
    // akunnya benar-benar berganti.
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
          try {
            const data = docSnap.data();

            // --- Cek Global Ban ---
            if (data.isBanned) {
              localStorage.setItem('lyfit_banned_msg', 'Akun Anda telah dinonaktifkan secara permanen karena melanggar panduan komunitas kami.');
              signOut(auth);
              return;
            }

            // --- AUTOMATIC MIGRATION: Jika history masih ada di dokumen utama, pindahkan! ---
            // Penjaga sekali-jalan. Migrasi ini menulis ke Firestore, dan tulisannya memicu
            // snapshot berikutnya — kalau `deleteField()` penutupnya gagal (offline, atau
            // dokumennya menabrak batas ukuran), blok ini jalan lagi, menulis lagi, memicu
            // snapshot lagi: lingkaran tulis yang tidak pernah berhenti selama app terbuka.
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

              // Seed baseline diff dari hasil migrasi (jalur ini menulis year docs sendiri di bawah)
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
              setPrograms(prev => (!takeServer('programs', prev) || JSON.stringify(prev) === JSON.stringify(migratedPrograms)) ? prev : migratedPrograms);
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

              setExerciseLibrary(prev => (!takeServer('exerciseLibrary', prev) || JSON.stringify(prev) === JSON.stringify(migratedLib)) ? prev : migratedLib);
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
                 return ['custom']; // default: always activate the built-in default plan
              });

              setUserProfile(prev => {
                 if (!takeServer('userProfile', prev)) return prev;
                 return parsedSettings.userProfile || null;
              });
              
              // Migrate old single keys to the new array
              let migratedKeys = parsedSettings.userApiKeys || [];
              if (migratedKeys.length === 0) {
                  if (parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userApiKey);
                  if (parsedSettings.userGeminiApiKey && parsedSettings.userGeminiApiKey !== parsedSettings.userApiKey) migratedKeys.push(parsedSettings.userGeminiApiKey);
              }
              // Buang entri kosong yang kepencet "+ Tambah" tapi gak jadi diisi — biar gak
              // nyangkut sebagai baris kosong yang "muncul lagi" tiap kali data di-refresh.
              migratedKeys = migratedKeys.filter(k => k && k.trim());
              setUserApiKeys(prev => takeServer('userApiKeys', prev) ? migratedKeys : prev);

              // Saved model IDs from older versions may no longer exist on the APIs

              setLogiPersona(parsedSettings.logiPersona || 'santai');
              setLogiCustomInstruction(parsedSettings.logiCustomInstruction || '');
              setLogiMemory(prev => takeServer('logiMemory', prev) ? (Array.isArray(parsedSettings.logiMemory) ? parsedSettings.logiMemory : []) : prev);
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

          setIsDataLoaded(true);
          // Sama seperti listener history: snapshot dari cache IndexedDB tidak boleh melepas
          // guard ini, karena baseline diff-nya harus berasal dari server.
          if (!docSnap.metadata.fromCache) hasSyncedMainRef.current = true;
          setTimeout(() => { isUpdatingFromServer.current = false; }, 3000); // diperpanjang untuk cegah race condition auto-save
        } else {
          // No Firebase data yet — only show questionnaire if not already completed
          const alreadyDone = user?.uid ? localStorage.getItem(`lyfit_onboarding_completed_${user.uid}`) === 'true' : false;
          if (!alreadyDone) {
            setIsFreshAccount(true);
          }
          setIsDataLoaded(true);
          if (!docSnap.metadata.fromCache) hasSyncedMainRef.current = true;
        }
      }, (error) => {
        // BUKAN parse error. Ini kegagalan transport (jaringan putus, izin sesaat, listener
        // dilepas) — datanya di server baik-baik saja. Dulu di sini setHasParseError(true),
        // yang mematikan KEDUA auto-save untuk seumur sesi tanpa pernah di-reset dan tanpa
        // tanda apa pun di layar: user terus latihan dan tidak ada satu pun yang tersimpan.
        // Auto-save dibiarkan hidup — Firestore sendiri yang antre offline dan mengirim ulang.
        console.error("Gagal menarik data utama (transport):", error);
        setCloudSaveError(`Koneksi ke cloud bermasalah: ${error?.message || error}. Perubahan disimpan lokal dan dikirim ulang otomatis.`);
        setIsDataLoaded(true);
      });

      unsubscribeHistory = onSnapshot(historyDocRef, (docSnap) => {
        if (docSnap.exists()) {
           isUpdatingFromServer.current = true;
           try {
             const data = docSnap.data();

             // Rekonsiliasi per tanggal berbasis ISI, bukan waktu — lihat utils/historySync.js
             // untuk alasan lengkapnya dan tesnya.
             setHistory(prev => {
                const { next, baseline, kept, blockedDeletes } = reconcileHistory(prev, data, lastSavedHistoryJson.current, docSnap.id);
                setHistoryBaseline(baseline);
                if (kept.length > 0) console.log('[Sync] Perubahan lokal dipertahankan, belum terkirim:', kept);
                if (blockedDeletes?.length > 0) {
                   // Snapshot menghapus banyak tanggal sekaligus — bentuk itu bukan penghapusan
                   // oleh user. Ditahan, dan user diberi tahu supaya bisa lapor SEBELUM cache
                   // lokalnya (satu-satunya sisa datanya) ikut tertimpa di perangkat lain.
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
           // DOKUMEN TAHUNAN HILANG SELURUHNYA, dan ini kabar dari server (bukan cache kosong).
           //
           // Data lokal memang selamat — blok rekonsiliasi di atas dilewati, jadi tidak ada yang
           // menghapusnya. Tapi ia juga TIDAK PERNAH KEMBALI ke server: lokal masih sama dengan
           // baseline, jadi auto-save menyimpulkan "tidak ada perubahan" dan tidak mengirim apa
           // pun. Riwayatnya duduk di satu perangkat selamanya; reinstall = hilang beneran.
           //
           // Baseline tanggal tahun ini dibuang supaya semuanya kembali terlihat "belum terkirim"
           // dan auto-save mengunggahnya ulang. Inilah penyembuhan otomatisnya: dokumen yang
           // terhapus di server dibangun kembali dari perangkat yang masih memilikinya.
           // Aman diulang — menulis isi yang sama ke tanggal yang sama itu idempoten.
           const tahun = docSnap.id;
           // historyMirror, BUKAN `history`. Closure listener ini dibuat sekali saja (deps
           // [user?.uid, isAuthChecking]), jadi variabel state yang ditangkapnya membeku di nilai
           // saat listener dipasang — biasanya kosong. Membacanya langsung berarti menyimpulkan
           // "tidak ada data lokal" dan penyembuhannya tidak pernah jalan.
           const punyaLokal = Object.keys(historyMirror.current || {}).filter(d => d.startsWith(tahun));
           if (punyaLokal.length > 0) {
              console.warn(`[Self-heal] Dokumen ${tahun} hilang di server — mengunggah ulang ${punyaLokal.length} tanggal dari perangkat ini.`);
              const base = { ...(lastSavedHistoryJson.current || {}) };
              punyaLokal.forEach(d => { delete base[d]; });
              setHistoryBaseline(base);
              setCloudSaveError(`Data ${tahun} hilang di server — sedang diunggah ulang dari perangkat ini (${punyaLokal.length} tanggal). Biarkan aplikasi terbuka sampai selesai.`);
           }
        }
        // Snapshot dari CACHE Firestore (IndexedDB) berbunyi duluan, sebelum server terhubung.
        // Guard "sudah sinkron" tidak boleh lepas karenanya: seluruh gunanya adalah memastikan
        // baseline diff berasal dari server, bukan salinan lokal yang bisa saja ketinggalan
        // dibanding perubahan device lain. UI tetap dilepas (setIsHistoryLoaded) supaya layar
        // tidak menunggu jaringan.
        if (!docSnap.metadata.fromCache) hasSyncedHistoryRef.current = true;
        setIsHistoryLoaded(true);
      }, (error) => {
         console.error("Gagal menarik history tahun ini (transport):", error);
         setCloudSaveError(`Koneksi ke cloud bermasalah: ${error?.message || error}. Perubahan disimpan lokal dan dikirim ulang otomatis.`);
         setIsHistoryLoaded(true);
      });

      // TAHUN SEBELUMNYA — sekali baca, bukan onSnapshot.
      //
      // Sebelum ini hanya dokumen tahun BERJALAN yang pernah dibaca. Riwayat tahun lalu bertahan
      // semata-mata karena kebetulan masih nyangkut di __CACHED_HISTORY: di perangkat baru — atau
      // setelah cache dibersihkan — seluruh riwayat tahun sebelumnya lenyap dari kalender, progres,
      // dan grafik pada 1 Januari. Datanya aman di Firestore, cuma tidak pernah ditarik.
      //
      // getDoc, bukan listener: dokumen tahun lalu praktis tidak pernah berubah lagi, dan satu
      // listener tambahan berarti satu koneksi yang dijaga seumur sesi tanpa guna. Kalau ada
      // perubahan lokal di tanggal tahun lalu (mis. mengedit sesi lama), auto-save tetap
      // mengirimnya — dirtyByYear sudah lama memisahkan tulisan per tahun.
      //
      // Rekonsiliasinya persis sama dengan tahun berjalan, termasuk penggeseran baseline: tanpa
      // itu, semua tanggal tahun lalu terlihat sebagai "perubahan lokal belum terkirim" dan
      // dikirim ulang utuh di penyimpanan berikutnya.
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
        // Dulu di sini ada guard `programs === defaultPrograms` yang maksudnya mencegah nulis
        // sebelum data server datang. Itu SUDAH dikerjakan hasSyncedMainRef di atas, sementara
        // guard lamanya memblokir SELURUH dokumen ini — bukan cuma programs, tapi juga
        // exerciseLibrary, userAchievements, dan seluruh settings (gymProfiles, userProfile,
        // units, dst). Akun yang programnya kebetulan masih persis default jadi tidak pernah
        // bisa menyimpan gym baru atau preferensi apa pun. Dibuang, jangan dihidupkan lagi.
        const mainDocRef = doc(db, "logym_users", user.uid);

        // Simpan Profil & Program ke Dokumen Utama.
        // try/catch WAJIB: setDoc melempar SINKRON (bukan promise rejection) kalau datanya
        // mengandung undefined — .catch() saja tidak pernah kena, dan errornya lenyap tanpa jejak.
        // Kirim HANYA field yang berubah di device ini. Dulu seluruh isi dokumen dikirim tiap
        // kali menyimpan — termasuk field yang device ini tidak pernah sentuh — jadi device
        // terakhir yang menyimpan selalu menang untuk SEMUA setting sekaligus. Itu yang bikin
        // gym baru di satu device lenyap gara-gara device lain sekadar mengubah tema.
        // `settings` dikirim sebagai map parsial: setDoc merge menggabungkan map bersarang,
        // jadi key settings yang tidak disebut tetap utuh di server.
        const localMain = {
          programs, exerciseLibrary, userAchievements,
          theme, language, soundEnabled, healthConnectEnabled, defaultRestTime, warmupVideos,
          cooldownVideos, weekStartDay, defaultReminderTime, reminderEnabled, biometricStandard,
          unitSystem, units, gymProfiles, activeGymId, activityTargets, activePlanIds, userProfile,
          userApiKeys: (userApiKeys || []).filter(k => k && k.trim()),
          logiPersona, logiCustomInstruction, logiMemory
        };
        const { changed, nextBaseline, changedKeys } = diffFields(localMain, mainBaselineRef.current);
        if (changedKeys.length === 0) return; // tidak ada yang berubah — jangan tulis apa pun

        const { programs: pChanged, exerciseLibrary: lChanged, userAchievements: aChanged, ...settingsChanged } = changed;
        const payload = { updatedAt: new Date().toISOString() };
        if (pChanged !== undefined) payload.programs = pChanged;
        if (lChanged !== undefined) payload.exerciseLibrary = lChanged;
        if (aChanged !== undefined) payload.userAchievements = aChanged;
        if (Object.keys(settingsChanged).length > 0) payload.settings = settingsChanged;

        setSyncStatus('syncing');
        const prevBaseline = mainBaselineRef.current;
        setMainBaseline(nextBaseline);
        // try/catch WAJIB: setDoc melempar SINKRON (bukan promise rejection) kalau datanya
        // mengandung undefined — .catch() saja tidak pernah kena, dan errornya lenyap tanpa jejak.
        try {
          return setDoc(mainDocRef, payload, { merge: true })
            .then(() => {
              setCloudSaveError(null);
              setSyncStatus('synced');
            })
            .catch(err => {
              console.error("Auto-save Cloud gagal:", err);
              setSyncStatus('error');
              setCloudSaveError(err?.message || String(err));
              setMainBaseline(prevBaseline); // gagal kirim — jangan anggap tersimpan
            });
        } catch (err) {
          console.error("Auto-save Cloud gagal (sync):", err);
          setSyncStatus('error');
          setCloudSaveError(err?.message || String(err));
          setMainBaseline(prevBaseline);
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
  //
  // WAJIB ikut persist bareng __CACHED_HISTORY. Rekonsiliasi di listener history memakai
  // baseline untuk membedakan "lokal punya perubahan yang belum terkirim" dari "lokal cuma
  // salinan basi". Kalau baseline mulai kosong tiap boot sementara cache sudah terisi, SEMUA
  // tanggal cache terlihat seperti perubahan lokal dan snapshot server selalu ditolak —
  // persis kebalikan dari yang kita mau.
  // migrateBaseline: baseline versi lama menyimpan serializeDay UTUH (salinan kedua seluruh
  // riwayat di localStorage). Nilai lamanya persis serializeDay, jadi sidik jarinya bisa dihitung
  // langsung dari situ — tanpa migrasi ini semua tanggal terlihat berubah dan seluruh riwayat
  // setahun dikirim ulang sekali tanpa perlu.
  const lastSavedHistoryJson = useRef(migrateBaseline(readCache('__CACHED_HISTORY_BASE', null)));
  const setHistoryBaseline = (next) => {
     lastSavedHistoryJson.current = next;
     if (!next) { try { localStorage.removeItem('__CACHED_HISTORY_BASE'); } catch { /* diabaikan */ } return; }
     // Kuota penuh di sini TIDAK boleh diam. Baseline yang membeku di versi lama membuat
     // rekonsiliasi salah membaca salinan basi sebagai "perubahan lokal belum terkirim", lalu
     // mengirimnya menimpa data server yang lebih baru — kehilangan data lintas device.
     if (!writeCache('__CACHED_HISTORY_BASE', next)) {
        setCloudSaveError('Penyimpanan lokal penuh — penanda sinkronisasi tidak bisa disimpan. Kosongkan ruang penyimpanan sebelum latihan lagi dari perangkat lain.');
     }
  };
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
        const deletedDates = [];

        Object.keys(history).forEach(dateStr => {
           const json = dayFingerprint(history[dateStr]);
           if (baseline[dateStr] === json) return; // tidak berubah sejak save terakhir — skip

           const year = dateStr.substring(0, 4);
           if (!dirtyByYear[year]) dirtyByYear[year] = {};

           if (history[dateStr] && history[dateStr]._delete) {
               dirtyByYear[year][dateStr] = deleteField();
               deletedDates.push(dateStr);
           } else if (history[dateStr] && typeof history[dateStr] === 'object') {
               // _activeSession adalah state sementara per-device — JANGAN sinkron ke cloud.
               // deleteField() sekaligus membersihkan salinan lama yang terlanjur tersimpan di server.
               const { _activeSession, ...dayData } = history[dateStr];
               dirtyByYear[year][dateStr] = {
                  ...dayData,
                  // ARRAY -> MAP ber-key id. Array tidak bisa di-merge Firestore: menulis
                  // seluruh array berarti device ini memutuskan nasib SEMUA sesi hari itu,
                  // termasuk yang dibuat device lain dan belum pernah dia lihat. Sebagai map,
                  // Firestore menggabungkan per-sesi. Sesi yang memang dihapus user harus
                  // disebut eksplisit lewat deleteField(), karena key yang tidak disebut
                  // sekarang dibiarkan hidup.
                  ...(dayData.workouts !== undefined ? {
                     workouts: workoutsToMap(
                        dayData.workouts,
                        workoutIdsFromBaseline(baseline[dateStr]),
                        deleteField()
                     )
                  } : {}),
                  // Field yang PEMILIKNYA Lomeal dibuang dari kiriman. `bioData` dikirim utuh
                  // sebagai map, dan merge Firestore menggabungkan per key — jadi tanpa ini
                  // salinan LAMA milik Logym menimpa balik angka yang baru saja ditulis Lomeal.
                  // Itulah sebabnya mengedit makanan kemarin di Lomeal tidak pernah terlihat di
                  // grafik Logym: datanya masuk, lalu ditimpa lagi oleh sinkron Logym berikutnya.
                  ...(dayData.bioData ? { bioData: stripLomealOwned(dayData.bioData) } : {}),
                  _activeSession: deleteField()
               };
           } else {
               dirtyByYear[year][dateStr] = history[dateStr];
           }
           newBaseline[dateStr] = json;
        });

        const dirtyYears = Object.keys(dirtyByYear);
        if (dirtyYears.length === 0) return; // tidak ada perubahan — jangan tulis apa pun

        // PERINGATAN DINI BATAS 1 MiB. Dokumen history_years/<tahun> menampung SELURUH tanggal
        // di tahun itu; kalau tembus batas Firestore, yang gagal bukan satu tanggal melainkan
        // SEMUA tulisan tahun itu — latihan berhenti tersimpan tanpa gejala yang jelas. Ukuran
        // lokal cuma taksiran (server bisa punya tanggal yang belum ada di device ini), tapi
        // taksiran yang muncul di layar jauh lebih baik daripada tabrakan senyap.
        // Ambangnya 800 KB, bukan 1 MiB: harus ada ruang untuk memperbaiki sebelum mentok.
        dirtyYears.forEach(year => {
           const yearBytes = Object.keys(history)
              .filter(d => d.startsWith(year))
              .reduce((n, d) => n + serializeDay(history[d]).length, 0);
           if (yearBytes > 800_000) {
              console.warn(`[Ukuran] history_years/${year} ≈ ${Math.round(yearBytes / 1024)} KB — mendekati batas 1 MiB Firestore.`);
              setCloudSaveError(`Data tahun ${year} sudah ${Math.round(yearBytes / 1024)} KB, mendekati batas 1 MB per dokumen. Di atas batas itu latihan berhenti tersimpan — laporkan ini supaya datanya bisa diringkas.`);
           }
        });

        // BASELINE DIGESER HANYA SETELAH TULISANNYA BENAR-BENAR SAMPAI SERVER — jangan pernah
        // di sini, sebelum setDoc.
        //
        // Sebabnya: saat Firestore tidak terjangkau, setDoc TIDAK menolak. Promise-nya cuma
        // menggantung sampai server mengakui. Jadi `.catch` tidak pernah jalan, rollback tidak
        // pernah jalan, dan baseline versi lama ikut tersimpan ke localStorage seolah-olah sudah
        // aman di server. Begitu app ditutup, tulisan yang masih mengantre itu ikut mati.
        //
        // Boot berikutnya: lokal == baseline, jadi rekonsiliasi menyimpulkan "tidak ada perubahan
        // lokal" dan MENGAMBIL versi server yang lebih tua — sesi yang baru selesai lenyap dari
        // perangkat, dan cache lokal ikut tertimpa. Persis kejadian 9 Agu 2026: sesi sudah selesai
        // dan sudah terkirim ke Health Connect, tapi hilang dari Logym waktu Firebase down.
        //
        // Dengan digeser belakangan, tulisan yang tidak pernah sampai membuat baseline tetap lama
        // → lokal != baseline → rekonsiliasi MEMPERTAHANKAN lokal, dan datanya dikirim ulang
        // sendiri begitu koneksi pulih. Ini invarian #1 di catatan audit sinkron.
        const commitBaselineFor = (year) => {
           const base = { ...(lastSavedHistoryJson.current || {}) };
           Object.keys(dirtyByYear[year]).forEach(d => { base[d] = newBaseline[d]; });
           setHistoryBaseline(base);
        };

        // Firestore diam saja saat offline — tanpa penanda ini user mengira datanya sudah aman
        // di cloud padahal masih mengantre di memori dan akan hilang kalau app ditutup.
        setSyncStatus('syncing');
        const pendingWarn = setTimeout(() => {
           setSyncStatus('error');
        }, 15000);

        const failedYears = new Set();
        // history_years/<tahun> itu dokumen blob: SEMUA tanggal di tahun itu ada di satu dokumen,
        // tiap tanggal berisi map bersarang (workouts, exerciseLogs, deletedProjected). Firestore
        // mengindeks tiap key map sebagai field path tersendiri, jadi index entry per dokumen
        // menumpuk sepanjang tahun sampai menabrak batas 40.000 → tulisan ditolak dengan
        // "too many index entries for entity". Dokumen ini tidak pernah di-query (selalu getDoc
        // per ID), jadi indeksnya murni beban: dimatikan lewat fieldOverrides wildcard di
        // firestore.indexes.json. Kalau error itu muncul lagi, cek exemption-nya masih ter-deploy.
        const writes = dirtyYears.map(year => {
           const yearRef = doc(db, "logym_users", user.uid, "history_years", year);
           // Baseline tidak perlu dibatalkan lagi saat gagal — sekarang memang belum pernah
           // digeser sampai tulisannya sukses. Sisanya cuma melapor.
           const onFail = (err, label) => {
              failedYears.add(year);
              console.error(`Auto-save History ${year} gagal${label}:`, err);
              setSyncStatus('error');
              setCloudSaveError(err?.message || String(err));
           };
           // try/catch WAJIB: setDoc melempar SINKRON kalau data mengandung undefined.
           try {
              return setDoc(yearRef, dirtyByYear[year], { merge: true })
                 .then(() => {
                    clearTimeout(pendingWarn);
                    commitBaselineFor(year); // ← baru di sini tanggalnya dianggap tersimpan
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

           // ---------------------------------------------------------
           // AUTO-BACKUP KE FIRESTORE (Jaring Pengaman)
           //
           // Dipicu tiap HARI BERGANTI *atau* tiap ADA SESI SELESAI BARU — bukan sekali sehari
           // seperti sebelumnya. Latihan hari ini adalah data yang paling belum teruji dan paling
           // sakit kalau hilang; menunggu besok untuk mem-backup-nya melewatkan justru itu.
           //
           // TETAP SATU DOKUMEN PER TANGGAL (id = tanggal), jadi latihan kedua di hari yang sama
           // menimpa backup hari itu, bukan menambah dokumen baru. Jumlah dokumen karena itu
           // dibatasi oleh RETENSI, bukan oleh seberapa sering user latihan.
           //
           // Retensi 30 hari lewat `expireAt` + TTL policy Firestore — Google yang menghapus,
           // tanpa Cloud Function dan tanpa penyapu buatan sendiri. AKTIFKAN SEKALI di konsol:
           // Firestore > TTL > koleksi `history_backups`, field `expireAt`. Tanpa itu dokumennya
           // menumpuk selamanya; kodenya sendiri tidak akan tahu bedanya.
           // ---------------------------------------------------------
           try {
             const todayStr = getLocalYMD(new Date());
             // Kunci penanda ikut menghitung sesi selesai, jadi "sudah backup hari ini" tidak lagi
             // berarti "tidak usah backup lagi apa pun yang terjadi hari ini".
             const sesiSelesai = Object.values(history)
               .reduce((n, d) => n + (d?.workouts || []).filter(w => w?.status === 'completed').length, 0);
             const backupKey = `${todayStr}:${sesiSelesai}`;
             const memoKey = `lyfit_last_backup_key_${user.uid}`;
             if (localStorage.getItem(memoKey) !== backupKey && Object.keys(history).length > 0) {
               // Id dokumen ikut memuat jumlah sesi, BUKAN tanggal saja. Dengan id tanggal saja,
               // backup kedua hari ini menimpa yang pertama — jadi kalau siang ini ada bug yang
               // merusak history, salinan pagi yang masih bagus ikut tertimpa versi rusaknya.
               // Perlindungannya hilang persis di hari yang paling membutuhkannya.
               // Isi berbeda = dokumen berbeda; semuanya tetap kedaluwarsa 30 hari.
               const backupRef = doc(db, "logym_users", user.uid, "history_backups", `${todayStr}_${sesiSelesai}`);
               // Disimpan sebagai STRING: dokumen ini tidak pernah di-query, dan sebagai map
               // bersarang tiap key-nya jadi field path tersendiri di index — jalan yang sama
               // menuju "too many index entries" yang sudah pernah menjatuhkan dokumen tahunan.
               setDoc(backupRef, {
                 payload: JSON.stringify(history),
                 timestamp: Date.now(),
                 sessions: sesiSelesai,
                 expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
               })
                 .then(() => {
                   localStorage.setItem(memoKey, backupKey);
                   console.log(`[Auto-Backup] Tersimpan: ${todayStr} (${sesiSelesai} sesi), kedaluwarsa 30 hari.`);
                 })
                 .catch(err => console.error('[Auto-Backup] Gagal menyimpan backup:', err));
             }
           } catch (e) {
             console.error('[Auto-Backup] Error:', e);
           }
           // ---------------------------------------------------------

           // Penanda {_delete:true} dulu menetap selamanya di state DAN di __CACHED_HISTORY.
           // Tiap boot berikutnya baseline kosong untuk tanggal itu, jadi dianggap berubah dan
           // deleteField() dikirim LAGI — kalau sementara itu device lain membuat data baru di
           // tanggal itu, device ini menghapusnya. Setelah benar-benar terkirim, buang.
           // HANYA yang tulisannya sukses. rollback() menelan error-nya supaya Promise.all
           // tetap resolve, jadi tanpa cek ini penanda bisa terbuang padahal tanggalnya belum
           // pernah benar-benar terhapus di server.
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


  // ==========================================
  // 3.4. FLUSH SAAT APP DITINGGALKAN
  // Auto-save di atas ditunda 2 detik. Di ponsel, timer di tab yang tersembunyi diperlambat atau
  // dimatikan sama sekali, jadi "selesai latihan lalu langsung pindah app" bisa membuat timer itu
  // tidak pernah berbunyi. Datanya tidak hilang — baseline belum digeser, jadi dikirim ulang di
  // pembukaan berikutnya — tapi sampai saat itu sesinya cuma ada di satu perangkat.
  //
  // `visibilitychange` (bukan `beforeunload`) karena itu satu-satunya yang andal di WebView
  // Android dan PWA iOS; `pagehide` menutup jalur tab benar-benar ditutup.
  // ==========================================
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'visible') return;
      [pendingHistorySaveRef, pendingMainSaveRef].forEach(ref => {
        if (!ref.current) return;
        clearTimeout(ref.current.timer);
        // attemptSave sudah punya semua penjaganya sendiri (guard snapshot server, retry saat
        // sedang menerima data) — jangan duplikasi di sini.
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
  // 3.6. PERSIST SESI AKTIF — LOCALSTORAGE + SATU DOKUMEN PER PERANGKAT
  //
  // `_activeSession` sengaja TIDAK ikut ke history_years: itu state sesi berjalan, dan
  // menyinkronkannya lewat dokumen yang sama membuat dua perangkat saling menimpa set yang
  // sedang diketik. Tapi konsekuensi versi lama (localStorage saja) juga nyata: HP mati di menit
  // ke-40, dilanjutkan di tablet = semua set hilang. Heartbeat 3.6b cuma menyelamatkan DURASI,
  // dan cuma di perangkat yang sama.
  //
  // Jalan tengahnya satu dokumen PER PERANGKAT: tidak ada yang saling menimpa (masing-masing
  // menulis key-nya sendiri), tapi perangkat lain tetap bisa membacanya. Sengaja di luar
  // history_years supaya denyut tiap 30 detik ini tidak ikut menggemukkan dokumen tahunan yang
  // berbatas 1 MiB, dan tidak ikut lewat mesin baseline/rekonsiliasi sama sekali.
  //
  // CATATAN DEPLOY: butuh aturan baru di firestore.rules master (repo darka-app) untuk
  // subcollection `active_sessions`. Tanpa itu tulisannya ditolak — sengaja dibuat tidak fatal
  // (cuma console.warn), jadi gejalanya adalah fitur lintas-perangkat ini diam saja, bukan crash.
  // ==========================================
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

  useEffect(() => {
    if (!user?.uid || !isDataLoaded) return;
    if (Object.keys(exerciseLogs).length === 0 && Object.keys(skippedExercises).length === 0 && extraExercises.length === 0) return;
    const payload = { date: selectedDate, savedAt: Date.now(), exerciseLogs, skippedExercises, extraExercises };
    try {
      localStorage.setItem(`lyfit_active_session_${user.uid}`, JSON.stringify(payload));
    } catch { /* storage penuh/diblokir — abaikan, sesi tetap jalan di memori */ }

    // Dibatasi 30 detik. Efek ini jalan di TIAP ketukan angka reps; tanpa batas ini satu sesi
    // latihan berarti ratusan tulisan Firestore. 30 detik = paling banyak setengah menit set
    // terakhir yang hilang kalau perangkatnya mati mendadak — sepadan.
    if (Date.now() - lastCloudSessionPush.current < 30_000) return;
    lastCloudSessionPush.current = Date.now();
    const ref = cloudSessionRef();
    if (!ref) return;
    // JSON.stringify: log latihan itu map bersarang dalam-dalam, dan tiap key-nya jadi field path
    // tersendiri di index Firestore — persis penyebab "too many index entries" di dokumen tahunan.
    // Sebagai satu string, dokumen ini tidak pernah bisa mengulang masalah itu.
    setDoc(ref, {
      deviceId: deviceId.current,
      date: selectedDate,
      savedAt: payload.savedAt,
      payload: JSON.stringify({ exerciseLogs, skippedExercises, extraExercises }),
    }).catch(e => console.warn('[Sesi] gagal menulis sesi berjalan ke cloud:', e?.message || e));
  }, [exerciseLogs, skippedExercises, extraExercises, selectedDate, user?.uid, isDataLoaded]);

  // Sesi selesai/dibatalkan: hapus penanda cloud supaya perangkat lain tidak menawarkan
  // melanjutkan sesi yang sudah tidak ada. Gagal hapus tidak fatal — pembaca mengabaikan
  // dokumen yang lebih tua dari 12 jam.
  const clearCloudSession = () => {
    const ref = cloudSessionRef();
    if (ref) deleteDoc(ref).catch(() => {});
  };

  // ==========================================
  // 3.6b. PERSIST JAM MULAI SESI KE LOCALSTORAGE
  // Set yang sudah dipencet done sudah aman (efek 3.6 di atas), tapi DURASI dulu tidak:
  // workoutStartTime cuma state di memori dan tidak pernah ditulis sebagian di tengah sesi, jadi
  // force-close di menit ke-40 bikin timer mulai lagi dari nol — set-nya utuh, 40 menitnya hilang.
  // Ikut hilang juga kalori kardio dan `startedAt` (jendela nadi), karena keduanya turunan durasi.
  //
  // Kuncinya TERPISAH dari sesi aktif: kunci sesi aktif sengaja tidak dihapus saat latihan selesai
  // (baru kedaluwarsa 24 jam), jadi kalau numpang di sana, timer sesi yang sudah kelar ikut hidup
  // lagi. Di sini `workoutStartTime` jadi null begitu latihan berakhir, dan efek ini menghapusnya.
  // ==========================================
  const TIMER_KEY = user?.uid ? `lyfit_active_timer_${user.uid}` : null;
  useEffect(() => {
    if (!TIMER_KEY) return;
    if (!isWorkoutActive || !workoutStartTime) { localStorage.removeItem(TIMER_KEY); return; }
    // `savedAt` = kapan app terakhir diketahui hidup. Diperbarui berkala, bukan sekali di awal:
    // tanpa denyut ini, waktu mati tidak bisa dibedakan dari waktu latihan.
    //
    // Selang denyut = seberapa banyak durasi yang paling banyak hilang saat crash, karena waktu
    // mati memang tidak dihitung. 15 detik: cukup rapat supaya kehilangannya tidak terasa, dan
    // menulis ~100 byte ke localStorage setiap 15 detik itu murah. Ini knob kalibrasi.
    const beat = () => {
      try {
        localStorage.setItem(TIMER_KEY, JSON.stringify({ startTime: workoutStartTime, savedAt: Date.now(), date: selectedDate }));
      } catch { /* storage penuh/diblokir — sesi tetap jalan di memori */ }
    };
    beat();
    const id = setInterval(beat, 15 * 1000);
    return () => clearInterval(id);
  }, [isWorkoutActive, workoutStartTime, selectedDate, TIMER_KEY]);

  // Pulihkan durasi setelah crash. Tidak mengaktifkan latihan sendiri — cukup mengisi
  // `resumeDurationSecs`, yang memang sudah jadi jalur "lanjutkan durasi sebelumnya" di
  // WorkoutTab & activateWorkoutFromCard. Tidak ada mesin baru.
  //
  // Waktu selama app mati TIDAK dihitung sama sekali (keputusan user) — lihat
  // recoveredWorkoutSeconds untuk alasannya.
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
      if (!startTime || !savedAt || saved.date !== getLocalYMD(new Date())) {
        localStorage.removeItem(TIMER_KEY);
        return;
      }
      const secs = recoveredWorkoutSeconds(startTime, savedAt);
      if (secs > 0) setResumeDurationSecs(secs);
    } catch { localStorage.removeItem(TIMER_KEY); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded, TIMER_KEY]);

  const activeSessionRestored = useRef(false);
  useEffect(() => { activeSessionRestored.current = false; }, [user?.uid]); // reset saat ganti akun
  // Sesi berjalan dari PERANGKAT LAIN. Dibaca sekali saat boot, sesudah pemulihan lokal di
  // bawah sempat jalan — sesi di perangkat ini selalu menang kalau denyutnya lebih baru.
  //
  // Batas 12 jam (bukan 24 seperti versi lokal): sesi milik perangkat lain jauh lebih mungkin
  // sekadar lupa ditutup, dan memulihkan set latihan kemarin ke layar hari ini itu mengarang.
  const restoreRemoteSession = async (localSavedAt) => {
    if (!user?.uid) return;
    let docs = [];
    try {
      docs = (await getDocs(collection(db, 'logym_users', user.uid, 'active_sessions'))).docs;
    } catch (e) {
      // Umumnya berarti aturan Firestore untuk subcollection ini belum ter-deploy. Bukan alasan
      // untuk menggagalkan boot — pemulihan lokal sudah jalan duluan.
      console.warn('[Sesi] gagal membaca sesi perangkat lain:', e?.message || e);
      return;
    }
    const kandidat = docs
      .map(d => d.data())
      .filter(s => s && s.deviceId !== deviceId.current && s.date === getLocalYMD(new Date()))
      .filter(s => Date.now() - (Number(s.savedAt) || 0) < 12 * 60 * 60 * 1000)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
    if (!kandidat) return;
    // Perangkat ini punya sesi yang lebih baru — jangan diganti dengan yang lebih tua.
    if (localSavedAt && kandidat.savedAt <= localSavedAt) return;

    let parsed;
    try { parsed = JSON.parse(kandidat.payload || '{}'); } catch { return; }
    if (!parsed || Object.keys(parsed.exerciseLogs || {}).length === 0) return;

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
    // Tunggu isHistoryLoaded (bukan cuma isDataLoaded) — itu tanda snapshot history tahun ini
    // sudah datang sekali (ada isinya atau tidak), jadi efek ini gak nunggu selamanya.
    if (!isDataLoaded || !isHistoryLoaded || !user?.uid || activeSessionRestored.current) return;
    try {
      const raw = localStorage.getItem(`lyfit_active_session_${user.uid}`);
      if (!raw) { activeSessionRestored.current = true; restoreRemoteSession(0); return; }
      const saved = JSON.parse(raw);
      // Sesi lebih dari 24 jam dianggap basi
      if (!saved?.date || Date.now() - (saved.savedAt || 0) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`lyfit_active_session_${user.uid}`);
        activeSessionRestored.current = true;
        restoreRemoteSession(0);
        return;
      }
      activeSessionRestored.current = true;
      restoreRemoteSession(saved.savedAt || 0);
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
      restoreRemoteSession(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded, isHistoryLoaded, user?.uid]);

  // ==========================================
  // 3.6c. HEAL: RINGKAS LOG INTRADAY YANG TERLANJUR GEMUK
  //
  // heartRateLog/oxygenSaturationLog/bloodPressureLog dulu menyimpan SETIAP sampel Health Connect
  // apa adanya — jam tangan merekam nadi hampir tiap menit, jadi puluhan KB per hari menumpuk di
  // dokumen history_years/<tahun> yang berbatas 1 MiB. Begitu batas itu tertabrak, yang gagal
  // bukan satu tanggal melainkan SELURUH tulisan tahun itu: latihan berhenti tersimpan.
  //
  // logPerDay sekarang meringkas data BARU, tapi sinkron rutin cuma menyentuh 7–30 hari terakhir
  // — hari yang lebih tua tidak akan pernah sembuh sendiri. Sapuan ini meringkasnya di tempat,
  // sekali, lalu auto-save mengirim versi rampingnya. Sengaja jalan atas history yang SUDAH ada
  // di memori: tidak ada kueri tambahan, tidak ada pembacaan Health Connect.
  //
  // SENGAJA tidak dijaga penanda "sudah pernah jalan". isHistoryLoaded sudah true dari cache
  // lokal SEBELUM snapshot server datang, jadi sapuan sekali-jalan akan menandai dirinya selesai
  // setelah memeriksa cache saja — dan hari gemuk yang baru menyusul dari server tidak pernah
  // tersentuh. Sapuannya idempoten dan murah (capIntradayLog mengembalikan referensi yang sama
  // kalau tidak ada yang perlu diringkas, jadi ini cuma pengecekan panjang array per hari), jadi
  // membiarkannya berjalan tiap kali history mengendap lebih benar daripada menebak kapan
  // "cukup lengkap". Debounce-nya menghindari pemindaian di tiap ketukan angka reps.
  // ==========================================
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
            // Referensi SAMA = tidak ada yang berubah. Hari yang begitu tidak boleh ikut ditandai
            // kotor, karena itu berarti mengirim ulang seluruh riwayat ke Firestore tanpa satu
            // byte pun yang isinya berbeda.
            if (capped !== bio[f]) { patch[f] = capped; pointsDropped += bio[f].length - capped.length; }
          });
          if (Object.keys(patch).length === 0) return;
          next[ymd] = { ...prev[ymd], bioData: { ...bio, ...patch } };
          healed++;
        });
        if (healed === 0) return prev; // referensi lama dikembalikan — tidak memicu render/save
        console.log(`[Heal] ${healed} hari diringkas, ${pointsDropped} titik log dibuang.`);
        return next;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [isHistoryLoaded, history]);

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
    // Backup harian + sesi berjalan per perangkat. Keduanya subkoleksi yang tidak akan pernah
    // ikut terhapus bersama dokumen induknya (Firestore tidak menghapus subkoleksi secara
    // rekursif) — tanpa ini, data latihan menetap di server setelah user menghapus akunnya.
    refsToDelete.push(...(await safeGetDocs(collection(db, 'logym_users', uid, 'history_backups'))).map(d => d.ref));
    refsToDelete.push(...(await safeGetDocs(collection(db, 'logym_users', uid, 'active_sessions'))).map(d => d.ref));
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

        const activateWorkoutFromCard = () => {
           let prevSecsToUse = resumeDurationSecs || 0;
           if (!prevSecsToUse) {
              const todayData = history[selectedDate];
              if (todayData && todayData.workouts) {
                 const progId = sessionToRun || activeProgramId;
                 const wInHistory = todayData.workouts.find(w => w.programId === progId || w.id === progId || (progId === 'extra' && w.programId === 'adhoc'));
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

        if (!isSuperset || isSupersetComplete) {
          setRestTargetTime(Date.now() + (programRestTime * 1000));
          if (!isWorkoutActive) {
            activateWorkoutFromCard();
          }
        } else if (isSuperset) {
          setShowSupersetToast(true);
          setTimeout(() => setShowSupersetToast(false), 3000);
          if (!isWorkoutActive) {
            activateWorkoutFromCard();
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
            clearCloudSession(); // sesi dibatalkan — jangan ditawarkan lagi di perangkat lain
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

  // ==========================================
  // PULIHKAN DARI BACKUP
  //
  // `history_backups` selama ini cuma DITULIS — tidak ada satu baris pun yang membacanya, jadi
  // satu-satunya cara memakainya adalah membuka konsol Firebase dan menyalin JSON secara manual.
  // Jaring pengaman tanpa gagang bukan jaring pengaman.
  //
  // Aturannya sengaja HANYA MENAMBAH: tanggal yang sudah ada di perangkat tidak pernah disentuh,
  // yang dipulihkan cuma tanggal yang hilang. Dengan begitu memulihkan tidak akan pernah bisa
  // merusak apa pun — pemulihan yang bisa menimpa data baik itu justru sumber bencana kedua.
  // ==========================================
  const [backupList, setBackupList] = useState(null); // null = belum dimuat
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

    let dipulihkan = 0;
    setHistory(prev => {
      const next = { ...prev };
      tanggalBackup.forEach(d => {
        // HANYA yang hilang. Tanggal yang ada di perangkat selalu menang — termasuk kalau isinya
        // lebih sedikit, karena bisa jadi user memang sengaja menghapus sesuatu di sana.
        if (next[d] !== undefined) return;
        const { _activeSession, _delete, ...bersih } = data[d] || {};
        if (_delete) return; // jangan hidupkan lagi penanda hapus dari masa lalu
        next[d] = bersih;
        dipulihkan++;
      });
      return dipulihkan > 0 ? next : prev;
    });

    showOtaAlert(dipulihkan > 0
      ? `${dipulihkan} tanggal dipulihkan dari backup ${backup.id}. Data yang sudah ada di perangkat ini tidak diubah sama sekali.`
      : `Tidak ada yang perlu dipulihkan — semua ${tanggalBackup.length} tanggal di backup ini sudah ada di perangkat.`);
  };

  // Kunci log sesi yang baru disimpan, menunggu rekor kekuatannya dihitung ulang (lihat
  // catatan di handleSaveWorkout). Ref, bukan state: ini antrean kerja satu langkah, bukan
  // sesuatu yang ikut menggambar layar.
  const pendingRmLogKeys = useRef(null);
  useEffect(() => {
    const keys = pendingRmLogKeys.current;
    if (!keys) return;
    pendingRmLogKeys.current = null;
    const lookup = {};
    programs.forEach(p => p.exercises?.forEach(ex => { lookup[ex.id] = ex; }));
    exerciseLibrary.forEach(ex => { lookup[ex.id] = ex; });
    (extraExercises || []).forEach(ex => { lookup[ex.id] = ex; });
    const records = recomputeStrengthRecords(history, keys, lookup);
    if (Object.keys(records).length === 0) return;
    setExerciseLibrary(lib => {
      let changed = false;
      const next = lib.map(e => {
        const r = records[String(e.id)];
        if (!r || (e.rm10 === r.rm10 && e.lastWeight === r.lastWeight)) return e;
        changed = true;
        return { ...e, rm10: r.rm10, lastWeight: r.lastWeight };
      });
      return changed ? next : lib;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const handleSaveWorkout = (progId) => {
    playSoundEffect('success', soundEnabled);
    const durationSecs = workoutStartTime ? Math.floor((Date.now() - workoutStartTime) / 1000) : 0;
    // Penulisan ke Health Connect SENGAJA tidak dilakukan di sini.
    //
    // Dulu di titik ini sesi ditulis langsung ke HC TANPA dedupeKey, padahal runHcSync juga
    // menulis sesi yang sama dengan dedupeKey: w.id. Memo dedupe-nya belum ada (yang pertama
    // tidak menaruh memo), jadi sinkron berikutnya menulisnya LAGI — dua record untuk satu
    // sesi, dan HC tidak bisa menghapus record lewat plugin ini, jadi duplikatnya permanen.
    // Lebih buruk lagi keduanya memakai rumus berbeda: yang di sini calculateWorkoutCalories
    // (durasi x MET, kasar), yang di runHcSync calculateSmartWorkoutCalories (berbasis set,
    // sama dengan yang ditampilkan UI) — jadi angka di Samsung Health tidak pernah cocok
    // dengan angka di Logym, dan ada dua-duanya.
    //
    // Sekarang satu penulis saja: runHcSync. Dia butuh sesinya sudah masuk `history` dulu
    // (id-nya baru ada setelah setHistory di bawah), makanya ditandai di sini dan dieksekusi
    // oleh efek yang menunggu history berubah.
    if (healthConnectEnabled && workoutStartTime) {
      hcPushAfterSave.current = true;
    }

    // Sumbang hitungan pemakaian ke peringkat global (semua pengguna Logym). Namanya saja yang
    // dikirim — bukan beban, repetisi, tanggal, atau apa pun yang mengikat ke orang tertentu.
    // Sengaja tidak di-await: statistik hiasan tidak boleh menunda penyimpanan sesi, dan
    // kegagalannya sudah ditelan di dalam.
    {
      const lookup = {};
      programs.forEach(p => p.exercises?.forEach(ex => { lookup[ex.id] = ex; }));
      exerciseLibrary.forEach(ex => { lookup[ex.id] = ex; });
      (extraExercises || []).forEach(ex => { lookup[ex.id] = ex; });
      // Hanya latihan yang BENAR-BENAR ada setnya dicentang selesai yang dihitung — kalau semua
      // latihan terjadwal ikut dihitung, peringkatnya jadi cerminan program orang, bukan yang
      // sungguh-sungguh dikerjakan.
      const doneNames = Object.entries(exerciseLogs || {})
        .filter(([, sets]) => Object.values(sets || {}).some(s => s?.done))
        .map(([k]) => resolveLoggedExercise(k, lookup)?.name)
        .filter(Boolean);
      if (doneNames.length > 0) bumpExercisePopularity(doneNames, `${selectedDate}_${progId || focusWorkoutId || 'sesi'}`);
    }
    // Jam selesai dipatok SEKALI di sini, bukan `new Date()` baru di tiap cabang penyimpanan —
    // dengan begitu `timestamp` dan `startedAt` dijamin menggambarkan sesi yang sama.
    //
    // `startedAt` = jam selesai dikurangi durasi yang BENAR-BENAR disimpan (bukan mentah dari
    // workoutStartTime): di sesi yang dilanjutkan, durasi tersimpan bisa lebih panjang dari
    // hitungan mundur sesi ini. Kalau startedAt tidak ikut durasi itu, jendela sesinya berujung
    // di masa depan dan Health Connect menolak record-nya.
    if (remote.status === 'in-progress' && !hasLocalActive) {
         if (remote.updatedAt > localUpdatedAt) {
             const t = new Date(remote.updatedAt);
             const timeStr = isNaN(t.getTime()) ? '' : `(${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')})`;
             
             // Ganti popup blokir dengan toast yang lebih ramah
             setShowRestoreToast(`Sesi latihan dari perangkat lain ${timeStr} dilanjutkan.`);
             setTimeout(() => setShowRestoreToast(''), 5000);
             
             return remote;
         }
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

    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setRestTargetTime(null);
    clearCloudSession(); // sesi selesai — jangan ditawarkan lagi di perangkat lain

    // setExerciseLogs({});
    // setSkippedExercises({});
    // Latihan ekstra milik sesi adhoc ("Ekstra"), bukan sesi program. Menyelesaikan sesi program
    // tidak boleh ikut menghapusnya — dulu itu bikin kartu Ekstra lenyap sebelum sempat disimpan.
    if (progId === 'extra') setExtraExercises([]);
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
            timestamp: endStamp,
            startedAt: startedAtFor(durationSecs),
            duration: formatDur(durationSecs)
          };
        } else {
          // Sesi adhoc yang sudah 'completed' lalu ditambah lagi di hari yang sama.
          // focusWorkoutId untuk adhoc selalu bernilai 'extra' (lihat handleResume/handleStart),
          // bukan id aslinya (`adhoc_123…`) — mencocokkan w.id saja tidak pernah kena, dan
          // hasilnya entri adhoc kedua yang isinya log yang sama persis (riwayat & kalori dobel).
          const isSameAdhoc = (w) => w.programId === 'adhoc' && (w.id === focusWorkoutId || focusWorkoutId === 'extra');
          const completedAdhocIdx = workouts.map((w, i) => (isSameAdhoc(w) ? i : -1)).filter(i => i >= 0).pop() ?? -1;
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
                timestamp: endStamp,
                startedAt: startedAtFor(finalSecs),
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
                timestamp: endStamp,
                startedAt: startedAtFor(durationSecs),
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
                realProgramId = resolveProjectedProgramId(realProgramId);
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
            // JARING PENGAMAN LATIHAN ALTERNATIF. Sesi yang dibangun dari proyeksi program tidak
            // punya `overriddenExercises`, jadi daftarnya dibangun ulang dari program asli — dan
            // latihan yang tadi diganti alternatif lenyap dari riwayat. Lognya sendiri tidak
            // hilang, tapi berkunci id latihan ALTERNATIF, sehingga tidak cocok dengan daftar di
            // atas: breakdown per-exercise kehilangan barisnya dan kalorinya tidak terhitung.
            //
            // Di sini tiap kunci log dikembalikan jadi latihannya (resolveLoggedExercise sudah
            // menangani semua bentuk kunci), lalu yang belum ada di daftar ditambahkan. Yang
            // benar-benar dikerjakan selalu menang atas apa yang dijadwalkan.
            {
              const known = new Set(frozenExercises.map(ex => String(ex.id)));
              const lookup = {};
              programs.forEach(p => p.exercises?.forEach(ex => { lookup[ex.id] = ex; }));
              exerciseLibrary.forEach(ex => { lookup[ex.id] = ex; });
              (w.overriddenExercises || []).forEach(ex => { lookup[ex.id] = ex; });
              Object.keys(cleanLogs).forEach(k => {
                const ex = resolveLoggedExercise(k, lookup);
                if (ex && !known.has(String(ex.id))) {
                  known.add(String(ex.id));
                  frozenExercises = [...frozenExercises, JSON.parse(JSON.stringify(ex))];
                }
              });
            }
            // Latihan ekstra TIDAK digabung ke sini: WorkoutTab tidak pernah mengikutkannya ke
            // sesi program (lihat prop extraExercises), jadi menyerapnya ke riwayat program
            // cuma bikin kartu "Ekstra" hilang tanpa jejak. Extras disimpan lewat sesi adhoc.

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
              timestamp: endStamp,
              startedAt: startedAtFor(finalSecs),
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
                resolvedProgId = resolveProjectedProgramId(focusWorkoutId);
            } else if (progId && progId.startsWith('projected_')) {
                resolvedProgId = resolveProjectedProgramId(progId);
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
                timestamp: endStamp,
                startedAt: startedAtFor(finalSecs),
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
                 skipped: cleanSkipped,
                 timestamp: endStamp,
                 startedAt: startedAtFor(durationSecs),
                 duration: durationSecs > 0 ? formatDur(durationSecs) : '00:00',
                 ...(p?.exercises?.length > 0 ? { overriddenExercises: JSON.parse(JSON.stringify(p.exercises)) } : {})
              });
            }
        }
      }
      
      // Sama seperti state di atas: extras cuma dikosongkan kalau sesi Ekstra-nya yang diselesaikan.
      h[targetDateStr] = {
        ...dayData,
        workouts,
        _activeSession: {
          ...(dayData._activeSession || {}),
          ...(progId === 'extra' ? { extraExercises: [] } : {})
        }
      };
      
      // --- SINKRONISASI KALORI DENGAN LOMEAL ---
      // Hitung kalori hari ini seketika agar langsung dikirim ke server oleh auto-save,
      // tanpa harus pindah ke DashboardTab terlebih dahulu.
      const bio = h[targetDateStr].bioData || {};
      // Rumusnya SATU, di workoutCalc.js. Salinan yang dulu ada di sini sempat berbeda dari versi
      // DashboardTab (yang ini membaca _manualFlags mentah lewat Number(), jadi override Lomeal
      // yang bertanda boolean `true` runtuh jadi 1 kkal) — dua layar, dua angka, hari yang sama.
      const burn = dailyBurnCalories(bio, workouts, userProfile?.weight, h[targetDateStr]?.exerciseLogs, userProfile);
      h[targetDateStr].bioData = { ...bio, activityCalories: burn.total, activityCaloriesFloor: burn.floor };

      return h;
    });

    // Update Exercise Library dengan True 10RM. SENGAJA di luar updater setHistory: memanggil
    // setter state lain dari dalam sebuah updater itu efek samping di tempat yang React anggap
    // murni — di StrictMode updater dijalankan DUA KALI, dan scan seluruh riwayat × tiap kunci log
    // ikut jalan dua kali bersamanya. Dijadwalkan lewat ref, dikerjakan efek di bawah begitu
    // `history` yang baru sudah benar-benar terpasang.
    pendingRmLogKeys.current = Object.keys(cleanLogs);

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
  // kena, `onComplete` no-op) — blok kedua yang beneran nutup gate kegak pernah kepanggil.
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

      {/* hasParseError mematikan KEDUA auto-save sampai app dibuka ulang. Dulu itu terjadi
          diam-diam — layar terlihat normal padahal tidak ada yang tersimpan. Sekarang wajib
          kelihatan, dan sengaja TIDAK bisa ditutup selama kondisinya masih aktif. */}
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
               syncStatus={syncStatus}
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
               sessionToRun={sessionToRun} setSessionToRun={setSessionToRun}
               onSessionExercises={setSessionExercises}
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
        restTargetTime={restTargetTime} setRestTargetTime={setRestTargetTime} defaultRestTime={defaultRestTime} 
        t={t} soundEnabled={soundEnabled} 
        isWorkoutActive={isWorkoutActive} activeTab={activeTab} 
        setActiveTab={setActiveTab} workoutStartTime={workoutStartTime}
        isImmersiveMode={isImmersiveMode} setIsImmersiveMode={setIsImmersiveMode}
        sessionToRun={sessionToRun} setSessionToRun={setSessionToRun}
        userProfile={userProfile}
        focusWorkoutId={focusWorkoutId} setFocusWorkoutId={setFocusWorkoutId}
        exerciseLogs={exerciseLogs} sessionExercises={sessionExercises}
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
