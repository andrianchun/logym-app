import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Info, CheckCircle, CalendarDays, Edit2, PlayCircle, X, Copy, Repeat, Plus, Clock, Bell, CalendarPlus, CalendarCheck, BellOff, BellRing, ToggleLeft, ToggleRight, Flame, Check } from 'lucide-react';
import SwipeInput from '../components/SwipeInput';
import { getLocalYMD } from '../data/constants';
import { formatNumber } from '../utils/numberFormat';
import { parseWorkoutDurationMinutes, calculateWorkoutCalories } from '../utils/workoutCalc';
import PanoramicSlider from '../components/PanoramicSlider';
import { LocalNotifications } from '@capacitor/local-notifications';

const CalendarTab = ({
  t, lang, theme, history, setHistory, programs,
  selectedDate, setSelectedDate,
  setActiveTab, soundEnabled, playSoundEffect, navigateToWorkoutDate,
  exerciseLogs, skippedExercises, handleEditPastWorkout,
  weekStartDay = 0, defaultReminderTime = "15:00", reminderEnabled = true,
  unitSystem, setConfirmModal, activePlanIds = [], userProfile
}) => {
  const isImp = unitSystem === 'imperial';
  const [calendarDate, setCalendarDate] = useState(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-');
      return new Date(y, parseInt(m)-1, d);
    }
    return new Date();
  });
  
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 640);
  const [calendarMode, setCalendarMode] = useState('monthly');
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Mode Bulanan: daftar bulan yang bisa di-scroll vertikal terus-menerus (bukan swipe per-bulan).
  // Rentang awal 24 bulan ke belakang, 12 ke depan — cukup luas untuk "puluhan bulan" tanpa
  // merender ratusan panel yang berat di device low-end. Meluas otomatis (lihat ensureMonthInRange)
  // kalau user lompat lewat picker tahun/bulan ke luar rentang ini.
  const [monthRange, setMonthRange] = useState(() => {
    const base = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const range = [];
    for (let i = -24; i <= 12; i++) {
      range.push(new Date(base.getFullYear(), base.getMonth() + i, 1));
    }
    return range;
  });
  const monthListRef = useRef(null);
  const isProgrammaticScroll = useRef(false);

  const ensureMonthInRange = (dateObj) => {
    const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    setMonthRange(prev => {
      const first = prev[0];
      const last = prev[prev.length - 1];
      if (target >= first && target <= last) return prev;
      const newStart = target < first ? target : first;
      const newEnd = target > last ? target : last;
      const range = [];
      let cursor = new Date(newStart);
      while (cursor <= newEnd) {
        range.push(new Date(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      return range;
    });
  };

  const scrollToMonth = (dateObj, behavior = 'smooth') => {
    const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
    const container = monthListRef.current;
    const el = container?.querySelector(`[data-month-key="${key}"]`);
    if (el && container) {
      isProgrammaticScroll.current = true;
      // Hindari scrollIntoView(): ia ikut men-scroll ancestor overflow-hidden di luar
      // monthListRef (menutupi top nav kalender), jadi hitung & scroll manual hanya di container ini.
      const targetTop = container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top);
      container.scrollTo({ top: targetTop, behavior });
      setTimeout(() => { isProgrammaticScroll.current = false; }, behavior === 'smooth' ? 500 : 80);
    }
  };

  // Begitu masuk mode bulanan (baik saat mount maupun berpindah dari mode lain), langsung
  // scroll ke bulan yang sedang aktif. Sengaja hanya bereaksi ke perubahan MODE, bukan tiap
  // kali calendarDate berubah — karena calendarDate juga di-update oleh scroll observer di
  // bawah, dan kalau effect ini ikut dengar calendarDate akan jadi tarik-menarik dengan scroll user.
  useEffect(() => {
    if (calendarMode === 'monthly') {
      ensureMonthInRange(calendarDate);
      // Delay supaya render ulang monthRange (kalau diperluas oleh ensureMonthInRange) sempat
      // masuk DOM dulu sebelum kita cari elemennya untuk di-scroll.
      const timer = setTimeout(() => scrollToMonth(calendarDate, 'auto'), 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMode]);

  // Deteksi bulan mana yang sedang terlihat saat discroll, lalu sinkronkan ke header tahun.
  useEffect(() => {
    if (calendarMode !== 'monthly' || !monthListRef.current) return;
    const container = monthListRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (isProgrammaticScroll.current) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const [y, m] = entry.target.dataset.monthKey.split('-').map(Number);
          setCalendarDate(prev => (prev.getFullYear() === y && prev.getMonth() === m) ? prev : new Date(y, m, 1));
        }
      });
    }, { root: container, rootMargin: '0px 0px -80% 0px', threshold: 0 });

    const panels = container.querySelectorAll('[data-month-key]');
    panels.forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [calendarMode, monthRange]);

  useEffect(() => {
    const handleResize = () => {
      const tablet = window.innerWidth >= 640;
      setIsTablet(tablet);
      if (tablet && calendarMode === 'weekly') {
        setCalendarMode('monthly');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calendarMode]);

  
  const [showActionMenu, setShowActionMenu] = useState(null); 
  const [showProgramSelect, setShowProgramSelect] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');

  const scrollContainerRef = useRef(null);
  const calendarSliderRef = useRef(null);
  const sheetRef = useRef(null);
  const sheetContentRef = useRef(null);
  const headerColRef = useRef(null);
  const fixedHeaderRef = useRef(null);
  const weeklyRulerRef = useRef(null);

  // Reset posisi scroll sheet ke atas setiap kali tanggal berubah —
  // mencegah konten "hilang ke atas" karena scroll container masih di posisi lama.
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedDate]);

  // Tinggi maksimal "peek" sheet di mode bulanan = tinggi blok kalender mingguan yang
  // sebenarnya (top nav + label hari + 1 baris tanggal). Diukur dari fixedHeaderRef (selalu
  // sama tingginya di kedua mode, tidak ikut transisi) + weeklyRulerRef, sebuah "penggaris"
  // tersembunyi yang selalu ter-mount dengan struktur identik ke grid mingguan asli — supaya
  // tidak pernah menangkap ukuran di tengah animasi transisi kolom header (pernah kejadian
  // terukur 655-779px, jauh melebihi ukuran compact aslinya ~168px).
  const [weeklyBlockHeight, setWeeklyBlockHeight] = useState(168);
  const [peekHeight, setPeekHeight] = useState(48);

  useEffect(() => {
    const measure = () => {
      // +32 = padding kolom header di mode mingguan (pt-2 + pb-6) yang tidak ikut terukur
      // dari fixedHeaderRef/weeklyRulerRef sendiri.
      const h = (fixedHeaderRef.current?.getBoundingClientRect().height || 0) + (weeklyRulerRef.current?.getBoundingClientRect().height || 0) + 32;
      if (h > 32) setWeeklyBlockHeight(h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Bottom nav mengambang (fixed, tidak makan ruang layout) di atas konten — jadi peek sheet
  // perlu ekstra jarak seukuran tinggi nav supaya tombol di dalam peek tidak ketutupan olehnya.
  const [bottomNavClearance, setBottomNavClearance] = useState(90);
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('[data-bottom-nav]');
      if (nav) setBottomNavClearance(nav.getBoundingClientRect().height + 16);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // --- DRAG STATE untuk bottom sheet (persis seperti AuthPage) ---
  const sheetDragStartRef = useRef({ y: 0, translate: 0 });
  // Lacak kecepatan drag (px/ms) supaya flick cepat langsung snap ke arah yang dituju,
  // sama seperti buka/tutup komentar IG/TikTok — bukan cuma berdasar jarak drag akhir.
  const sheetVelocityRef = useRef({ lastY: 0, lastT: 0, v: 0 });
  const [sheetDragY, setSheetDragY] = useState(null); // null = tidak drag, number = sedang drag

  // Dipakai effect di bawah supaya bisa baca mode TERKINI tanpa mendaftarkannya sebagai
  // dependency — kalau calendarMode ikut jadi dependency, toggle manual / drag balik ke
  // bulanan langsung ke-trigger ulang efek ini dan "ditarik paksa" balik ke mingguan lagi.
  const calendarModeRef = useRef(calendarMode);
  calendarModeRef.current = calendarMode;

  // Ukur konten sheet (heading + tombol Tambah Sesi / Mulai Latihan) tiap kali tanggal terpilih
  // atau isinya berubah, supaya peek di mode bulanan pas sampai bawah tombol — bukan cuma
  // menampilkan drag handle-nya seperti sebelumnya. Peek di-cap ke weeklyBlockHeight, TIDAK
  // pernah memaksa ganti mode (biar toggle/drag manual user selalu dituruti).
  useEffect(() => {
    if (calendarMode !== 'monthly') return;
    const timer = setTimeout(() => {
      const contentH = sheetContentRef.current?.scrollHeight || 0;
      const handleH = 40; // area drag handle (pt-4 + bar + pb-2)
      setPeekHeight(handleH + Math.min(contentH, weeklyBlockHeight) + bottomNavClearance);
    }, 50);
    return () => clearTimeout(timer);
  }, [calendarMode, selectedDate, history, programs, activePlanIds, weeklyBlockHeight, bottomNavClearance]);

  // Note: auto-switch ke weekly dihapus — mode hanya berubah lewat gesture user (toggle / drag handle).

  const handleSheetPointerDown = (e) => {
    const startTranslate = calendarMode === 'monthly' ? ((sheetRef.current?.offsetHeight || 500) - peekHeight) : 0;
    sheetDragStartRef.current = { y: e.clientY, translate: startTranslate };
    sheetVelocityRef.current = { lastY: e.clientY, lastT: performance.now(), v: 0 };
    setSheetDragY(startTranslate);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSheetPointerMove = (e) => {
    if (sheetDragY === null) return;
    const { y, translate } = sheetDragStartRef.current;
    const maxH = sheetRef.current?.offsetHeight || 500;
    const delta = e.clientY - y;
    setSheetDragY(Math.min(maxH, Math.max(0, translate + delta)));

    const now = performance.now();
    const { lastY, lastT } = sheetVelocityRef.current;
    const dt = now - lastT;
    if (dt > 0) {
      // EMA ringan supaya tidak terlalu sensitif ke noise sentuhan satu frame terakhir.
      const instantV = (e.clientY - lastY) / dt;
      sheetVelocityRef.current = { lastY: e.clientY, lastT: now, v: sheetVelocityRef.current.v * 0.5 + instantV * 0.5 };
    }
  };

  const handleSheetPointerUp = () => {
    if (sheetDragY === null) return;
    const maxH = sheetRef.current?.offsetHeight || 500;
    const { translate: startTranslate } = sheetDragStartRef.current;
    const moved = Math.abs(sheetDragY - startTranslate);
    const velocity = sheetVelocityRef.current.v; // px/ms, positif = ke bawah
    const FLICK_VELOCITY = 0.5;
    let nextMode;
    if (moved < 8) {
      // Tap: toggle
      nextMode = calendarMode === 'monthly' ? 'weekly' : 'monthly';
    } else if (Math.abs(velocity) > FLICK_VELOCITY) {
      // Flick cepat: langsung ikuti arah gestur, tidak peduli seberapa jauh sudah tertarik.
      nextMode = velocity < 0 ? 'weekly' : 'monthly';
    } else {
      nextMode = sheetDragY < maxH / 2 ? 'weekly' : 'monthly';
    }
    if (nextMode !== calendarMode) {
      playSoundEffect('click', soundEnabled);
      setCalendarMode(nextMode);
      setShowBottomSheet(nextMode === 'weekly');
    }
    setSheetDragY(null);
  };

  const [repeatDays, setRepeatDays] = useState(1);
  const [repeatCount, setRepeatCount] = useState(4);
  const [draggedDate, setDraggedDate] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [notificationModalTarget, setNotificationModalTarget] = useState(null);
  const [slideDirection, setSlideDirection] = useState('right');
  
  const [detailSlideAnim, setDetailSlideAnim] = useState(null);
  const changeSelectedDateWithAnim = (newDateStr) => {
    if (newDateStr === selectedDate) return;
    const isNext = newDateStr > selectedDate;
    setDetailSlideAnim(isNext ? 'left' : 'right');
    setSelectedDate(newDateStr);
    setTimeout(() => setDetailSlideAnim(null), 300);
  };

  // Swipe states for Header
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const touchStartY = useRef(null);
  const touchEndY = useRef(null);

  const onTouchStartEvent = (e) => {
    touchEnd.current = null;
    touchEndY.current = null;
    touchStart.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };
  const onTouchMoveEvent = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };
  const onTouchEndEvent = () => {
    if (touchStart.current === null || touchEnd.current === null || touchStartY.current === null || touchEndY.current === null) return;
    const distanceX = touchStart.current - touchEnd.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const isLeftSwipe = distanceX > 40 && Math.abs(distanceX) > Math.abs(distanceY);
    const isRightSwipe = distanceX < -40 && Math.abs(distanceX) > Math.abs(distanceY);
    const isUpSwipe = distanceY > 40 && Math.abs(distanceY) > Math.abs(distanceX);
    const isDownSwipe = distanceY < -40 && Math.abs(distanceY) > Math.abs(distanceX);

    if (isUpSwipe && calendarMode === 'monthly') { setCalendarDate(new Date(selectedDate)); setCalendarMode('weekly'); playSoundEffect('click', soundEnabled); }
    else if (isDownSwipe && calendarMode === 'weekly') { setCalendarMode('monthly'); playSoundEffect('click', soundEnabled); }
    else if (isLeftSwipe) { 
        playSoundEffect('click', soundEnabled); 
        setSlideDirection('right');
        if (calendarMode === 'weekly') setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + 7));
        else setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)); 
    }
    else if (isRightSwipe) { 
        playSoundEffect('click', soundEnabled); 
        setSlideDirection('left');
        if (calendarMode === 'weekly') setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() - 7));
        else setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)); 
    }
  };

  // Swipe states for Content Area
  const detTouchStart = useRef(null);
  const detTouchEnd = useRef(null);
  const detTouchStartY = useRef(null);
  const detTouchEndY = useRef(null);

  const onDetTouchStart = (e) => { 
     detTouchEnd.current = null; 
     detTouchEndY.current = null;
     detTouchStart.current = e.targetTouches[0].clientX; 
     detTouchStartY.current = e.targetTouches[0].clientY;
  };
  const onDetTouchMove = (e) => {
     detTouchEnd.current = e.targetTouches[0].clientX;
     detTouchEndY.current = e.targetTouches[0].clientY;
  };
  const onDetTouchEnd = (e) => {
    if (detTouchStart.current === null || detTouchEnd.current === null || detTouchStartY.current === null || detTouchEndY.current === null) return;
    const distanceX = detTouchStart.current - detTouchEnd.current;
    const distanceY = detTouchStartY.current - detTouchEndY.current;

    if (distanceY < -40 && Math.abs(distanceY) > Math.abs(distanceX)) {
       if (e.currentTarget.scrollTop <= 10) {
           setCalendarMode('monthly');
           playSoundEffect('click', soundEnabled);
       }
       return;
    }

    const currentSelected = new Date(selectedDate);
    if (distanceX > 50 && Math.abs(distanceX) > Math.abs(distanceY)) { 
       currentSelected.setDate(currentSelected.getDate() + 1); 
       changeSelectedDateWithAnim(getLocalYMD(currentSelected)); 
       setCalendarDate(new Date(currentSelected));
       playSoundEffect('click', soundEnabled);
    } else if (distanceX < -50 && Math.abs(distanceX) > Math.abs(distanceY)) {
       currentSelected.setDate(currentSelected.getDate() - 1); 
       changeSelectedDateWithAnim(getLocalYMD(currentSelected)); 
       setCalendarDate(new Date(currentSelected));
       playSoundEffect('click', soundEnabled);
    }
  };

  // Auto-sync: in weekly mode, ensure calendarDate always shows the week containing selectedDate
  useEffect(() => {
    if (calendarMode === 'weekly' && selectedDate) {
      const sel = new Date(selectedDate);
      const selDay = (sel.getDay() - weekStartDay + 7) % 7;
      const selWeekStart = new Date(sel);
      selWeekStart.setDate(sel.getDate() - selDay);
      
      const cal = new Date(calendarDate);
      const calDay = (cal.getDay() - weekStartDay + 7) % 7;
      const calWeekStart = new Date(cal);
      calWeekStart.setDate(cal.getDate() - calDay);
      
      // If selectedDate is not in the currently displayed week, snap calendarDate
      if (getLocalYMD(selWeekStart) !== getLocalYMD(calWeekStart)) {
        setCalendarDate(new Date(sel));
      }
    }
  }, [selectedDate, calendarMode]);

  const DAY_MAP = {
    0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab'
  };

  const getDayWorkouts = (dateStr) => {
    const historical = history[dateStr]?.workouts || [];
    
    const validHistorical = historical.filter(w => {
      if (w.status === 'completed' || w.programId === 'adhoc') return true; 
      
      const p = programs.find(prog => prog.id === w.programId);
      if (!p) return false; // Hapus dari history jika program aslinya (planned) sudah dihapus
      
      const wPlanId = p.planId || 'custom';
      
      if (!activePlanIds.includes(wPlanId)) return false;
      return true;
    });

    let result = [...validHistorical];
    const todayStr = getLocalYMD(new Date());

    if (activePlanIds.length > 0) {
        const planRoutines = programs.filter(p => activePlanIds.includes(p.planId || 'custom'));
        if (planRoutines.length > 0) {
            const dateObj = new Date(dateStr);
            const dayName = DAY_MAP[dateObj.getDay()];
            const projectedRoutines = planRoutines.filter(r => r.assignedDays && r.assignedDays.includes(dayName));
            
            projectedRoutines.forEach(pr => {
                if (!validHistorical.some(w => w.programId === pr.id)) {
                    result.push({
                        id: `projected_${pr.id}_${dateStr}`,
                        programId: pr.id,
                        programName: pr.name,
                        status: 'planned',
                        isProjected: true,
                        log: {}
                    });
                }
            });
        }
    }
    
    return result;


  };

  const scheduleWorkoutNotification = async (workoutId, programName, dateStr, timeStr) => {
    if (!reminderEnabled || !timeStr || typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform()) return null;
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return null;

      const [year, month, day] = dateStr.split('-');
      const [hour, minute] = timeStr.split(':');
      const targetTime = new Date(year, parseInt(month)-1, day, hour, minute);
      const prepTime = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30 menit sebelumnya
      
      const notifs = [];
      const notifIds = [];

      if (prepTime.getTime() >= Date.now()) {
        const id1 = Math.floor(Math.random() * 1000000);
        notifIds.push(id1);
        notifs.push({
          title: "Persiapan Latihan! 🏋️",
          body: `Jadwal ${programName} dimulai 30 menit lagi. Yuk bersiap-siap!`,
          id: id1,
          schedule: { at: prepTime },
          actionTypeId: "",
          extra: null
        });
      }

      if (targetTime.getTime() >= Date.now()) {
        const id2 = Math.floor(Math.random() * 1000000);
        notifIds.push(id2);
        notifs.push({
          title: "Waktunya Latihan! 🏋️",
          body: `Hari ini jadwalmu: ${programName}. Yuk mulai sesimu sekarang!`,
          id: id2,
          schedule: { at: targetTime },
          actionTypeId: "",
          extra: null
        });
      }

      if (notifs.length > 0) {
        await LocalNotifications.schedule({ notifications: notifs });
        return notifIds;
      }
      return null;
    } catch (err) {
      console.log("Berjalan di Web Browser PWA, alarm native diabaikan.");
      return null;
    }
  };

  const cancelWorkoutNotification = async (notifId) => {
    if (!notifId || typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform()) return;
    try {
      const idsToCancel = Array.isArray(notifId) ? notifId.map(id => ({ id })) : [{ id: notifId }];
      await LocalNotifications.cancel({ notifications: idsToCancel });
    } catch (err) {}
  };

  const saveReminderFromModal = async (enabled, hours, minutes) => {
     playSoundEffect('click', soundEnabled);
     if (!notificationModalTarget) return;
     
     const { workoutId, programName, dateStr, existingNotifId } = notificationModalTarget;
     const newTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
     let notifId = null;
     
     if (existingNotifId) {
        cancelWorkoutNotification(existingNotifId);
     }
     
     if (enabled) {
        notifId = await scheduleWorkoutNotification(workoutId, programName, dateStr, newTimeStr);
     }
     
     setHistory(prev => {
        const h = { ...prev };
        const d = h[dateStr] || { workouts: [], bioData: {} };
        const workouts = d.workouts || [];
        
        let found = false;
        const updatedWorkouts = workouts.map(w => {
          if (w.id === workoutId) {
            found = true;
            return { ...w, reminderTime: newTimeStr, reminderEnabled: enabled, reminderNotifId: notifId };
          }
          return w;
        });

        if (!found && workoutId.startsWith('projected_')) {
          const { programId, programName } = notificationModalTarget;
          updatedWorkouts.push({
            id: workoutId,
            programId,
            programName,
            status: 'planned',
            isProjected: true,
            log: {},
            reminderTime: newTimeStr,
            reminderEnabled: enabled,
            reminderNotifId: notifId
          });
        }
        
        h[dateStr] = { ...d, workouts: updatedWorkouts };
        return h;
     });
     setNotificationModalTarget(null);
  };

  const handleAddToNativeCalendar = (workoutId, programName, dateStr, timeStr) => {
    playSoundEffect('click', soundEnabled);
    
    // Optimistic sync marker
    setHistory(prev => {
       const h = { ...prev };
       const d = h[dateStr];
       if (d && d.workouts) {
         h[dateStr] = { ...d, workouts: d.workouts.map(w => w.id === workoutId ? { ...w, gcalSynced: true } : w) };
       }
       return h;
    });

    let startD, endD;
    const effectiveTimeStr = timeStr || defaultReminderTime || "15:00";
    
    if (effectiveTimeStr) {
      const [year, month, day] = dateStr.split('-');
      const [hour, minute] = effectiveTimeStr.split(':');
      startD = new Date(year, parseInt(month)-1, day, hour, minute);
      endD = new Date(startD.getTime() + 60 * 60 * 1000); // +1 jam
    } else {
      const [year, month, day] = dateStr.split('-');
      startD = new Date(year, parseInt(month)-1, day, 0, 0);
      endD = new Date(year, parseInt(month)-1, day, 23, 59);
    }

    let exList = "";
    const d = history[dateStr];
    if (d && d.workouts) {
       const w = d.workouts.find(wk => wk.id === workoutId);
       if (w) {
          const prog = programs.find(p => p.id === w.programId);
          if (prog && (w.overriddenExercises || prog.exercises)) {
             const exrs = w.overriddenExercises || prog.exercises;
             exList = "\n\nDaftar Latihan:\n" + exrs.map((ex, i) => `${i+1}. ${ex.name}`).join("\n");
          } else if (w.programId === 'adhoc' && w.exercises) {
             exList = "\n\nDaftar Latihan:\n" + w.exercises.map((ex, i) => `${i+1}. ${ex.name}`).join("\n");
          }
       }
    }

    const title = `Workout: ${programName}`;
    const details = `Sesi latihan LOGYM: ${programName}${exList}`;
    
    const pad = n => String(n).padStart(2, '0');
    const startGcal = `${startD.getUTCFullYear()}${pad(startD.getUTCMonth()+1)}${pad(startD.getUTCDate())}T${pad(startD.getUTCHours())}${pad(startD.getUTCMinutes())}00Z`;
    const endGcal = `${endD.getUTCFullYear()}${pad(endD.getUTCMonth()+1)}${pad(endD.getUTCDate())}T${pad(endD.getUTCHours())}${pad(endD.getUTCMinutes())}00Z`;
    
    const webUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startGcal}/${endGcal}&details=${encodeURIComponent(details)}`;
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        const intentUrl = `intent://#Intent;action=android.intent.action.INSERT;mimetype=vnd.android.cursor.dir/event;S.title=${encodeURIComponent(title)};S.description=${encodeURIComponent(details)};l.beginTime=${startD.getTime()};l.endTime=${endD.getTime()};S.browser_fallback_url=${encodeURIComponent(webUrl)};scheme=content;end`;
        window.location.href = intentUrl;
    } else {
        window.open(webUrl, '_blank');
    }
  };

  const handleCopyOrMove = (actionType) => {
    if (!targetDateInput) return alert('Silakan pilih tanggal tujuan terlebih dahulu!');
    playSoundEffect('click', soundEnabled);
    
    const h = { ...history };
    const sourceWorkouts = getDayWorkouts(selectedDate);
    if (sourceWorkouts.length === 0) return;
    
    const targetD = h[targetDateInput] || { workouts: [] };
    const newWorkouts = sourceWorkouts.map(w => ({
        ...w,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'planned',
        log: {}
    }));
    h[targetDateInput] = { ...targetD, workouts: [...(targetD.workouts||[]), ...newWorkouts] };
    
    if (newWorkouts.length > 0 && actionType === 'copy') {
      // (Optional) We could schedule things here, but user wants them off by default
    }
    
    if (actionType === 'move') {
       const sourceD = h[selectedDate] || { workouts: [] };
       h[selectedDate] = { ...sourceD, workouts: [] };
    }
    
    setHistory(h);
    setShowActionMenu(null);
  };

  const handleRepeat = () => {
    playSoundEffect('click', soundEnabled);
    const h = { ...history };
    const sourceWorkouts = getDayWorkouts(selectedDate);
    if (sourceWorkouts.length === 0) return;

    let copied = 0;
    const baseDate = new Date(selectedDate);
    
    for (let i = 1; i <= repeatCount; i++) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + (repeatDays * i));
        const targetStr = getLocalYMD(targetDate);
        
        const targetD = h[targetStr] || { workouts: [] };
        const newWorkouts = sourceWorkouts.map(w => ({
            ...w,
            id: `repeat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'planned',
            log: {}
        }));
        h[targetStr] = { ...targetD, workouts: [...(targetD.workouts||[]), ...newWorkouts] };
        copied++;
    }
    setHistory(h);
    setShowActionMenu(null);
    alert(`Jadwal berhasil diulang ${copied} kali!`);
  };

  const handleDragStart = (e, dateStr) => {
    setDraggedDate(dateStr);
    e.dataTransfer.setData('text/plain', dateStr);
  };
  const handleDrop = (e, targetDateStr) => {
    e.preventDefault();
    if (!draggedDate || draggedDate === targetDateStr) return;
    playSoundEffect('click', soundEnabled);
    const h = { ...history };
    const srcWorkouts = getDayWorkouts(draggedDate);
    const targetD = h[targetDateStr] || { workouts: [] };
    
    h[targetDateStr] = { ...targetD, workouts: [...(targetD.workouts||[]), ...srcWorkouts] };
    
    const srcD = h[draggedDate] || { workouts: [] };
    h[draggedDate] = { ...srcD, workouts: [] };
    
    setHistory(h);
    setDraggedDate(null);
  };

  const addWorkoutToDate = async (p) => {
    playSoundEffect('click', soundEnabled); 
    const wId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setHistory(prev => {
      const h = { ...prev };
      const d = h[selectedDate] || { workouts: [] };
      const existingWorkouts = Array.isArray(d.workouts) ? d.workouts : Object.values(d.workouts || {});
      
      const samePrograms = existingWorkouts.filter(w => w.programId === p.id);
      let newName = p.name;
      if (samePrograms.length > 0) {
          newName = `${p.name} (${samePrograms.length + 1})`;
      }

      h[selectedDate] = {
        ...d,
        workouts: [
          ...existingWorkouts,
          { 
            id: wId,
            programId: p.id, 
            programName: newName, 
            status: 'planned', 
            log: {}
          }
        ]
      };
      return h;
    });
    setShowProgramSelect(false);
  };

  const removeWorkout = (workoutId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Jadwal?',
      message: 'Yakin ingin menghapus jadwal ini?',
      onConfirm: () => {
        playSoundEffect('click', soundEnabled);
        
        const dCheck = history[selectedDate];
        if (dCheck && dCheck.workouts) {
          const workoutToRemove = dCheck.workouts.find(w => w.id === workoutId);
          if (workoutToRemove && workoutToRemove.reminderNotifId) {
            cancelWorkoutNotification(workoutToRemove.reminderNotifId);
          }
        }

        setHistory(prev => {
          const h = { ...prev };
          const d = h[selectedDate];
          if (d) {
            if (workoutId === 'virtual_adhoc') {
              h[selectedDate] = { ...d, _activeSession: { ...(d._activeSession || {}), extraExercises: [] } };
            } else if (d.workouts) {
              const workoutToRemove = d.workouts.find(w => w.id === workoutId);
              let newActiveSession = { ...(d._activeSession || {}) };
              
              if (workoutToRemove) {
                 const progExercises = workoutToRemove.programId === 'adhoc' ? workoutToRemove.exercises : programs.find(p => p.id === workoutToRemove.programId)?.exercises;
                 if (progExercises) {
                   const newLogs = { ...(newActiveSession.exerciseLogs || {}) };
                   const newSkipped = { ...(newActiveSession.skippedExercises || {}) };
                   progExercises.forEach(ex => {
                      delete newLogs[ex.id];
                      delete newSkipped[ex.id];
                   });
                   newActiveSession.exerciseLogs = newLogs;
                   newActiveSession.skippedExercises = newSkipped;
                 }
              }

              h[selectedDate] = { ...d, workouts: d.workouts.filter(w => w.id !== workoutId), _activeSession: newActiveSession };
            }
          }
          return h;
        });
      }
    });
  };

  const todayStr = getLocalYMD(new Date());
  
  const getSelectedWorkoutsForDate = (dateStr) => {
    let wks = [...getDayWorkouts(dateStr)];
    const dData = history[dateStr] || {};
    if (dData._activeSession?.extraExercises?.length > 0 && !wks.some(w => w.programId === 'adhoc')) {
      wks.push({
        id: 'virtual_adhoc',
        programId: 'adhoc',
        programName: 'Ekstra',
        status: 'planned',
        log: dData._activeSession.exerciseLogs || {},
        exercises: dData._activeSession.extraExercises
      });
    }
    return wks;
  };
  const selectedWorkouts = getSelectedWorkoutsForDate(selectedDate);
  
  const getGridCellsForDate = (baseDate) => {
    const cells = [];
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    if (calendarMode === 'monthly') {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      let firstDayOfMonth = new Date(y, m, 1).getDay();
      firstDayOfMonth = (firstDayOfMonth - weekStartDay + 7) % 7;
      for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
      for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(y, m, i));
    } else {
      let currentDayOfWeek = baseDate.getDay();
      currentDayOfWeek = (currentDayOfWeek - weekStartDay + 7) % 7;
      const startOfWeek = new Date(baseDate);
      startOfWeek.setDate(baseDate.getDate() - currentDayOfWeek);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        cells.push(d);
      }
    }
    return cells;
  };

  const getCalendarLabel = (baseDate) => {
    return baseDate.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
  };

  const getAdjacentCalendarDate = (baseDate, direction) => {
    if (calendarMode === 'weekly') {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (direction * 7));
      return d;
    } else {
      return new Date(baseDate.getFullYear(), baseDate.getMonth() + direction, 1);
    }
  };

  let gridCells = getGridCellsForDate(calendarDate);
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = getCalendarLabel(calendarDate);

  const getExercisesForWorkout = (w) => {
    if (w.programId === 'adhoc') return w.exercises || [];
    const prog = programs.find(p => p.id === w.programId);
    return w.overriddenExercises || prog?.exercises || [];
  };

  const checkIsCompleted = (w, dateStr) => {
    if (dateStr === selectedDate) {
      const exercises = getExercisesForWorkout(w);
      if (exercises.length === 0) return false;
      
      const activeExercises = exercises.filter(ex => !skippedExercises?.[ex.id]);
      if (activeExercises.length === 0) return w.status === 'completed';
      
      const isDone = activeExercises.every(ex => {
        const logs = exerciseLogs?.[ex.id] || [];
        return logs.length > 0 && logs.every(s => s.done && !s.skipped);
      });

      if (!isDone && w.status === 'completed') return false;
      return isDone;
    }
    
    return w.status === 'completed';
  };

  const checkIsCompletedStrict = (w, dateStr) => {
    if (w.status === 'completed') return true;
    
    if (dateStr === selectedDate) {
      const exercises = getExercisesForWorkout(w);
      if (exercises.length === 0) return false;
      const dData = history[dateStr] || {};
      const sessionLogs = (dData._activeSession && dData._activeSession.exerciseLogs && Object.keys(dData._activeSession.exerciseLogs).length > 0) ? dData._activeSession.exerciseLogs : exerciseLogs;
      const sessionSkipped = (dData._activeSession && dData._activeSession.skippedExercises) ? dData._activeSession.skippedExercises : skippedExercises;

      const activeExercises = exercises.filter(ex => !sessionSkipped?.[`${ex.id}-${w.id}`] && !sessionSkipped?.[ex.id]);
      if (activeExercises.length === 0) return false;
      
      return activeExercises.every(ex => {
        const logs = sessionLogs?.[`${ex.id}-${w.id}`] || sessionLogs?.[ex.id] || [];
        return logs.length > 0 && logs.every(s => s.done && !s.skipped);
      });
    }
    return false;
  };

  const formatDurationDisplay = (dur) => {
    if (typeof dur === 'number') return dur === 0 ? 'Beberapa detik' : `${dur} Menit`;
    if (typeof dur === 'string' && dur.includes(':')) {
      const parts = dur.split(':').map(Number);
      if (parts.length === 2) {
        const [m, s] = parts;
        if (m === 0) return `${s} Detik`;
        if (s === 0) return `${m} Menit`;
        return `${m} Menit ${s} Detik`;
      }
      if (parts.length === 3) {
        const [h, m, s] = parts;
        let res = `${h} Jam`;
        if (m > 0) res += ` ${m} Menit`;
        if (s > 0) res += ` ${s} Detik`;
        return res;
      }
    }
    return dur;
  };

  const hasPlanned = selectedWorkouts.some(w => !checkIsCompletedStrict(w, selectedDate));
  const hasCompleted = selectedWorkouts.some(w => checkIsCompletedStrict(w, selectedDate));

  // Satu panel bulan dengan tinggi natural (mengikuti isi, bukan dipaksa penuh 1 layar) —
  // supaya di list scroll vertikal, beberapa bulan sekaligus kelihatan alih-alih 1 bulan = 1 layar.
  const renderMonthPanel = (panelDate) => {
    const cells = getGridCellsForDate(panelDate);
    const panelMonthName = panelDate.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long' });
    const panelYear = panelDate.getFullYear();

    return (
      <div className="flex flex-col px-2">
        <h2 className={`text-[1.5rem] font-black mb-2 px-1 shrink-0 ${t.textMain} tracking-tight`}>{panelMonthName} {panelYear}</h2>
        <div className="grid grid-cols-7 gap-1 mb-2 px-1 shrink-0">
          {(weekStartDay === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((day, i) => (
            <div key={i} className="text-center text-[9px] font-bold uppercase text-zinc-500 tracking-widest opacity-80">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0 px-1" style={{ gridAutoRows: '46px' }}>
          {cells.map((dateObj, idx) => {
            if (!dateObj) return <div key={`blank-${idx}`} />;
            const dateKey = getLocalYMD(dateObj);
            const day = dateObj.getDate();
            const workouts = getDayWorkouts(dateKey);
            const isToday = dateKey === todayStr;
            const isSelected = dateKey === selectedDate;

            let cellStyle = `w-full h-full max-w-[44px] max-h-[44px] mx-auto relative flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer border border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-300`;
            if (isSelected) {
              cellStyle = `w-full h-full max-w-[44px] max-h-[44px] mx-auto relative flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${t.bgAccent} text-white shadow-lg shadow-[#3b82f6]/30 scale-[1.1] z-10`;
            } else if (isToday) {
              cellStyle = `w-full h-full max-w-[44px] max-h-[44px] mx-auto relative flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer border-2 ${t.borderAccentSoft} ${t.textAccent} font-bold hover:bg-black/5 dark:hover:bg-white/5`;
            }

            return (
              <div
                key={dateKey}
                onClick={() => {
                  playSoundEffect('click', soundEnabled);
                  changeSelectedDateWithAnim(dateKey);
                  setShowProgramSelect(false);
                  setShowActionMenu(null);
                }}
                className="flex items-center justify-center p-0.5 min-h-0"
              >
                <div className={cellStyle}>
                  <span className="body-md font-bold mb-1">{day}</span>
                  {workouts.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5 items-center">
                      {workouts.slice(0, workouts.length > 3 ? 2 : 3).map(w => {
                        const isDone = checkIsCompletedStrict(w, dateKey);
                        return (
                          <div key={w.id} className={`w-1 h-1 rounded-full ${isSelected ? (isDone ? 'bg-white' : 'bg-white/30 border border-white/50') : (isDone ? t.bgAccent.replace('text-', 'bg-') : 'bg-transparent border border-zinc-400')}`}></div>
                        );
                      })}
                      {workouts.length > 3 && (
                        <span className={`text-[7px] font-bold leading-none ${isSelected ? 'text-white/80' : 'text-zinc-400'}`}>+{workouts.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
    {/* Foto latar dihapus — Mode Bulanan sekarang mengisi layar penuh dengan banyak baris
        tanggal per bulan; foto vivid di belakang membuat baris ke-3 dst nyaris tak terbaca
        (teks tanggal polos tanpa kotak solid, gampang tenggelam di foto). */}
    <div className={`flex flex-col sm:flex-row flex-1 min-h-0 w-full overflow-hidden ${t.textMain} sm:gap-2 relative z-10`}>
      {/* STICKY CALENDAR HEADER */}
      <div ref={headerColRef} className={`z-10 pt-2 relative sm:w-[55%] md:w-[60%] lg:w-[65%] sm:h-full sm:overflow-y-auto hide-scrollbar sm:pr-2 flex flex-col transition-all duration-300 ease-out min-h-0 ${calendarMode === 'monthly' ? 'flex-1' : 'shrink-0 pb-6'}`}>
        {/* --- FIXED HEADER: Mode toggle + Year label + Today btn --- */}
        <div ref={fixedHeaderRef} className="shrink-0 relative z-[50] px-2">
          <div className="flex justify-between items-center mb-4 px-1">
            <div className="w-[75px] flex justify-start">
              <button 
                onClick={() => {
                  playSoundEffect('click', soundEnabled);
                  if (calendarMode === 'monthly') {
                    setCalendarMode('weekly');
                    setShowBottomSheet(true);
                  } else {
                    setCalendarMode('monthly');
                    setShowBottomSheet(false);
                  }
                }}
                className={`p-2 text-zinc-400 dark:text-zinc-500 hover:${t.textAccent} transition-colors`}
                title="Ganti Mode Kalender"
              >
                {calendarMode === 'monthly' ? (
                  <CalendarDays size={22} strokeWidth={2.5} />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
                )}
              </button>
            </div>
            <button 
              onClick={() => {
                playSoundEffect('click', soundEnabled);
                if (calendarMode === 'monthPicker') setCalendarMode('yearPicker');
                else if (calendarMode !== 'monthly') setCalendarMode('monthPicker');
              }}
              className={`text-2xl font-black ${t.textMain} tracking-tight hover:${t.textAccent} transition-colors`}
            >
              {calendarMode === 'yearPicker' ? `${year - 5} – ${year + 6}` : (calendarMode === 'monthPicker' ? year : year)}
            </button>
            <div className="w-[75px] flex justify-end items-center">
              {(selectedDate !== todayStr || calendarDate.getMonth() !== new Date().getMonth() || calendarDate.getFullYear() !== new Date().getFullYear()) && (
                <button
                  onClick={() => {
                    playSoundEffect('click', soundEnabled);
                    changeSelectedDateWithAnim(todayStr);
                    setCalendarDate(new Date());
                    if (calendarMode === 'monthly') scrollToMonth(new Date());
                  }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${t.bgAccent} text-white hover:opacity-80 transition-opacity shadow-sm`}
                >
                  Hari Ini
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Penggaris tersembunyi: struktur identik grid mingguan (label hari + 1 baris tanggal),
            selalu ter-mount supaya weeklyBlockHeight bisa diukur kapan saja tanpa terjebak
            transisi CSS kolom header. */}
        <div ref={weeklyRulerRef} aria-hidden="true" className="absolute opacity-0 pointer-events-none -z-10 left-0 right-0">
          <div className="grid grid-cols-7 gap-1 mb-1 px-2 py-1">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="text-center text-[9px] font-medium uppercase tracking-wider">D</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0 px-2 py-1">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="py-1"><div className="h-10 w-8 mx-auto" /></div>
            ))}
          </div>
        </div>
        {/* --- SCROLLABLE / PICKER AREA --- */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {calendarMode === 'yearPicker' ? (
          <div className="grid grid-cols-3 gap-2 px-3 py-1 animate-in fade-in zoom-in-95 duration-300 ease-out">
            {Array.from({ length: 12 }, (_, i) => year - 5 + i).map(y => (
              <button
                key={y}
                onClick={() => { playSoundEffect('click', soundEnabled); setCalendarDate(new Date(y, month, 1)); setCalendarMode('monthPicker'); }}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${y === new Date().getFullYear() ? `${t.bgAccent} text-white` : `${t.btnBg} ${t.textMain} hover:${t.bgAccentSoft}`}`}
              >
                {y}
              </button>
            ))}
          </div>
        ) : calendarMode === 'monthPicker' ? (
          <div className="grid grid-cols-3 gap-2 px-1 py-1 animate-in fade-in zoom-in-95 duration-300 ease-out">
            {(lang === 'id' 
              ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
              : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            ).map((m, i) => (
              <button
                key={i}
                onClick={() => { playSoundEffect('click', soundEnabled); setCalendarDate(new Date(year, i, 1)); setCalendarMode('monthly'); }}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${i === new Date().getMonth() && year === new Date().getFullYear() ? `${t.bgAccent} text-white` : `${t.btnBg} ${t.textMain} hover:${t.bgAccentSoft}`}`}
              >
                {m}
              </button>
            ))}
          </div>
        ) : calendarMode === 'weekly' ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 ease-out">
            <div className="grid grid-cols-7 gap-1 mb-1 px-2 py-1">
              {(weekStartDay === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((day, i) => (
                <div key={i} className={`text-center text-[9px] font-medium uppercase text-zinc-500 tracking-wider`}>{day}</div>
              ))}
            </div>
            <PanoramicSlider
              ref={calendarSliderRef}
              onSwipeLeft={() => {
                playSoundEffect('click', soundEnabled);
                setSlideDirection('right');
                const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + 7);
                setCalendarDate(newDate);
                const newSelected = new Date(selectedDate);
                newSelected.setDate(newSelected.getDate() + 7);
                changeSelectedDateWithAnim(getLocalYMD(newSelected));
              }}
              onSwipeRight={() => {
                playSoundEffect('click', soundEnabled);
                setSlideDirection('left');
                const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() - 7);
                setCalendarDate(newDate);
                const newSelected = new Date(selectedDate);
                newSelected.setDate(newSelected.getDate() - 7);
                changeSelectedDateWithAnim(getLocalYMD(newSelected));
              }}
              onUpSwipe={() => {}}
              onDownSwipe={() => {}}
              renderPanel={(panelType) => {
                let panelDate = calendarDate;
                if (panelType === 'prev') panelDate = getAdjacentCalendarDate(calendarDate, -1);
                else if (panelType === 'next') panelDate = getAdjacentCalendarDate(calendarDate, 1);
                const panelCells = getGridCellsForDate(panelDate);

                return (
                  <div className="grid grid-cols-7 gap-0 px-2 py-1">
                    {panelCells.map((dateObj, idx) => {
                      if (!dateObj) return <div key={`blank-${idx}`} className="p-1"></div>;
                      const dateKey = getLocalYMD(dateObj);
                      const day = dateObj.getDate();
                      const workouts = getDayWorkouts(dateKey);
                      const isToday = dateKey === todayStr;
                      const isSelected = dateKey === selectedDate;
                      
                      // Ukuran & scale disamakan persis dengan sel mode bulanan (w/h-11 = 44px,
                      // scale-[1.1]) supaya "cursor" biru terasa konsisten saat mode berpindah.
                      let cellStyle = `w-11 h-11 mx-auto relative flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer border border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-300`;
                      if (isSelected) {
                        cellStyle = `w-11 h-11 mx-auto relative flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${t.bgAccent} text-white shadow-lg shadow-[#3b82f6]/30 scale-[1.1] z-10`;
                      } else if (isToday) {
                        cellStyle = `w-11 h-11 mx-auto relative flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer border-2 ${t.borderAccentSoft} ${t.textAccent} font-bold hover:bg-black/5 dark:hover:bg-white/5`;
                      }

                      return (
                        <div
                          key={dateKey}
                          onClick={() => { playSoundEffect('click', soundEnabled); changeSelectedDateWithAnim(dateKey); setShowProgramSelect(false); setShowActionMenu(null); }}
                          draggable={workouts.length > 0}
                          onDragStart={(e) => handleDragStart(e, dateKey)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, dateKey)}
                          className="py-1"
                        >
                          <div className={cellStyle}>
                            <span className="body-md font-medium mb-1.5">{day}</span>
                            {workouts.length > 0 && (
                              <div className="absolute bottom-1.5 flex gap-0.5">
                                {workouts.slice(0,3).map(w => {
                                  const isDone = checkIsCompletedStrict(w, dateKey);
                                  const isTargetSelected = isSelected;
                                  return (
                                    <div key={w.id} className={`w-1.5 h-1.5 rounded-full ${isTargetSelected ? (isDone ? 'bg-white' : 'bg-white/20 border border-white') : (isDone ? t.bgAccent.replace('text-', 'bg-') : 'border ' + t.borderAccent)}`}></div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
          </div>
        ) : (
          <div
            ref={monthListRef}
            className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-32 px-1 pt-2 animate-in fade-in duration-300 ease-out`}
            style={{ flex: '1 1 0%', minHeight: 0 }}
          >
            {monthRange.map(monthDate => (
              <div
                key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                data-month-key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                className="mb-6"
              >
                {renderMonthPanel(monthDate)}
              </div>
            ))}
          </div>
        )}
      </div>{/* end flex-1 min-h-0 scrollable/picker area */}
      </div>{/* end calendar header column */}

      {/* SCROLLABLE INLINE WORKOUT DETAILS — posisi dikontrol translateY, absolute saat monthly agar tidak mencuri space */}
      <div
        ref={sheetRef}
        className={`no-swipe absolute inset-x-0 bottom-0 flex flex-col z-20${sheetDragY === null ? ' transition-transform duration-300 ease-out' : ''}`}
        style={{
          height: '70vh',
          // Selalu pakai translateY dalam px murni untuk kedua mode (bukan campur '%'/calc() di
          // monthly dengan '0%' polos di weekly) — browser gagal meng-interpolasi transisi antar
          // dua representasi beda itu, jadi macet di posisi lama. Representasi konsisten (px vs px)
          // bikin transisinya jalan mulus.
          transform: sheetDragY !== null
            ? `translateY(${sheetDragY}px)`
            : `translateY(${calendarMode === 'monthly' ? ((sheetRef.current?.offsetHeight || 0) - peekHeight) : 0}px)`
        }}
      >
         {/* Fixed Glassmorphism Background Container */}
         <div className={`absolute inset-0 rounded-t-[2.5rem] border-t ${t.border} ${theme === 'dark' ? 'bg-black/40' : 'bg-white/60'} backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pointer-events-none`}></div>

         {/* DRAG HANDLE — area tarik naik/turun */}
         <div
           className="shrink-0 flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing z-10 relative"
           style={{ touchAction: 'none' }}
           onPointerDown={handleSheetPointerDown}
           onPointerMove={handleSheetPointerMove}
           onPointerUp={handleSheetPointerUp}
           onPointerCancel={handleSheetPointerUp}
         >
           <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
         </div>

         <div
            ref={scrollContainerRef}
             className="relative z-10 flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col"
         >
            {/* -mx wrapper is flex-1 so it always fills the scroll container —
                this ensures the empty area below content is still inside PanoramicSlider's
                touch zone (swipe down/left/right all work even in empty space). */}
            <div className="-mx-3 sm:-mx-6 flex-1 flex flex-col px-3 sm:px-6">
             <PanoramicSlider
               className="flex-1 flex flex-col"
               onSwipeLeft={() => {
                   const d = new Date(selectedDate);
                   d.setDate(d.getDate() + 1);
                   setSelectedDate(getLocalYMD(d));
                   setCalendarDate(new Date(d));
                   playSoundEffect('click', soundEnabled);
               }}
               onSwipeRight={() => {
                   const d = new Date(selectedDate);
                   d.setDate(d.getDate() - 1);
                   setSelectedDate(getLocalYMD(d));
                   setCalendarDate(new Date(d));
                   playSoundEffect('click', soundEnabled);
               }}
               onDownSwipe={() => {
                   if (scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 10 && !isTablet) {
                       playSoundEffect('click', soundEnabled);
                       setCalendarMode('monthly');
                       setShowBottomSheet(false);
                   }
               }}
               onUpSwipe={() => {
                   if (calendarMode !== 'weekly' && !isTablet) {
                       playSoundEffect('click', soundEnabled);
                       setCalendarMode('weekly');
                       setShowBottomSheet(true);
                   }
               }}
               renderPanel={(panelType) => {
                   const d = new Date(selectedDate);
                   if (panelType === 'prev') d.setDate(d.getDate() - 1);
                   else if (panelType === 'next') d.setDate(d.getDate() + 1);
                   const targetDateStr = getLocalYMD(d);
                   let panelWorkouts = getSelectedWorkoutsForDate(targetDateStr);
                   // Filter out 'planned' workouts if their parent plan is inactive
                   panelWorkouts = panelWorkouts.filter(w => {
                      if (w.status === 'completed' || w.programId === 'adhoc') return true;
                      const prog = programs.find(p => p.id === w.programId);
                      if (!prog) return false; // Hide planned workouts if program is deleted
                      const pPlanId = prog.planId || 'custom';
                      return activePlanIds.includes(pPlanId);
                   });


                   const isTargetPastOrToday = d <= new Date(); // roughly check if target date is in past/today for hasCompleted/hasPlanned
                   const hasTargetCompleted = panelWorkouts.some(w => checkIsCompletedStrict(w, targetDateStr));
                   const hasTargetPlanned = panelWorkouts.length > 0;

                   const isCurr = panelType === 'curr';
                   return (
                     <div 
                        key={isCurr ? selectedDate : panelType}
                        className={`flex flex-col min-h-full flex-1 ${isCurr && detailSlideAnim ? `anim-slide-${detailSlideAnim}` : ''}`}
                     >
                       <div ref={isCurr ? sheetContentRef : undefined} className="px-3 sm:px-6 pb-32 flex flex-col gap-3">

                         <div className="space-y-4">
                           {panelWorkouts.length === 0 ? (
                              <div className="p-4 text-center flex flex-col items-center">
                                {(!activePlanIds || activePlanIds.length === 0) ? (
                                    <>
                                        <p className="caption opacity-50 mb-4">Tidak ada program aktif. Silakan pilih program di tab Program.</p>
                                        <button 
                                            onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('program'); }} 
                                            className={`w-full py-3 rounded-xl body-lg font-bold ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80 transition-opacity`}
                                        >
                                            Buka Tab Program
                                        </button>
                                    </>
                                ) : (
                                    <p className="caption opacity-50">Tidak ada jadwal</p>
                                )}
                              </div>
                           ) : (
                              (() => {
                                const formatDurationHuman = (durStr) => {
                                  if (!durStr || durStr === "00:00" || durStr === "0:00") return "0 menit";
                                  let h = 0, m = 0, s = 0;
                                  const parts = String(durStr).split(':').map(Number);
                                  if (parts.length === 3) {
                                    h = parts[0] || 0; m = parts[1] || 0; s = parts[2] || 0;
                                  } else if (parts.length === 2) {
                                    m = parts[0] || 0; s = parts[1] || 0;
                                  } else {
                                    return durStr + " menit";
                                  }
                              
                                  if (h === 0 && m === 0 && s === 0) return "0 menit";
                                  
                                  let res = [];
                                  let totalHours = h;
                                  const weeks = Math.floor(totalHours / (24 * 7));
                                  totalHours %= (24 * 7);
                                  const days = Math.floor(totalHours / 24);
                                  const hours = totalHours % 24;
                              
                                  if (weeks > 0) res.push(`${weeks} minggu`);
                                  if (days > 0) res.push(`${days} hari`);
                                  if (hours > 0) res.push(`${hours} jam`);
                                  if (m > 0) res.push(`${m} menit`);
                                  if (res.length === 0 && s > 0) res.push(`${s} detik`);
                                  
                                  return res.join(' ') || "0 menit";
                                };
                                const groupedPanel = panelWorkouts.reduce((acc, w) => {
                                  const prog = w.programId === 'adhoc' 
                                    ? null
                                    : programs.find(p => p.id === w.programId);
                                  const parentPlanName = prog?.planName || (prog?.planId ? 'Latihan Kustom' : 'Ekstra');
                                  if (!acc[parentPlanName]) acc[parentPlanName] = [];
                                  acc[parentPlanName].push(w);
                                  return acc;
                                }, {});

                                return Object.entries(groupedPanel).map(([groupName, workouts], gIdx) => (
                                   <div key={groupName} className="mb-6 last:mb-0">
                                     <div className="flex items-center mb-4 px-1 w-full">
                                       <span className={`text-[10px] font-black uppercase tracking-widest text-zinc-400 shrink-0`}>{groupName}</span>
                                     </div>
                                     <div className="relative pl-7 sm:pl-9 space-y-4 before:absolute before:left-[11px] before:top-4 before:bottom-0 before:w-px before:border-l-2 before:border-dashed before:border-zinc-200 dark:before:border-zinc-800">
                                       {workouts.map((w, wIdx) => {
                                       const isCompleted = checkIsCompletedStrict(w, targetDateStr);
                                       const isExpanded = expandedWorkoutId === w.id;
                                       const prog = w.programId === 'adhoc' 
                                         ? { id: 'adhoc', name: w.programName || 'Ekstra', exercises: w.exercises || [] }
                                         : programs.find(p => p.id === w.programId);
                                                                     const dData = history[targetDateStr] || {};
                                       const sessionLogs = (dData._activeSession && dData._activeSession.exerciseLogs && Object.keys(dData._activeSession.exerciseLogs).length > 0) ? dData._activeSession.exerciseLogs : exerciseLogs;
                                       const sessionSkipped = (dData._activeSession && dData._activeSession.skippedExercises) ? dData._activeSession.skippedExercises : skippedExercises;
                                       const logsToUse = (w.log && Object.keys(w.log).length > 0) ? w.log : sessionLogs;
                                       const skippedToUse = w.skipped || sessionSkipped;
                                       const effectiveTime = w.reminderTime || defaultReminderTime || "15:00";
                                       const isNotifOn = w.hasOwnProperty('reminderEnabled') ? w.reminderEnabled : (w.reminderTime ? true : reminderEnabled);
                                       const estDuration = Math.round((w.overriddenExercises || prog?.exercises || []).reduce((acc, ex) => acc + (parseInt(ex.sets) || 3), 0) * (45 + (parseInt(w.restTime) || parseInt(prog?.restTime) || 90)) / 60) || 0;
                                       
                                       const actualMins = parseWorkoutDurationMinutes(w.duration);
                                       const calBurned = calculateWorkoutCalories(userProfile?.weight, isCompleted ? actualMins : estDuration);

                                       // Kartu "Selesai" pakai warna aksen biru penuh; "Terjadwal" (belum selesai)
                                       // dibikin lebih pudar supaya kelihatan beda statusnya sekilas.
                                       const c = isCompleted ? {
                                          bg: t.bgAccentSoft,
                                          dot: t.borderAccent,
                                          text: t.textAccent,
                                          badge: t.bgAccent + ' text-white'
                                       } : {
                                          bg: theme === 'dark' ? 'bg-[#3b82f6]/5' : 'bg-[#3b82f6]/[0.04]',
                                          dot: t.borderAccentSoft,
                                          text: theme === 'dark' ? 'text-sky-400/60' : 'text-[#3b82f6]/60',
                                          badge: ''
                                       };

                                       return (
                                          <div id={`workout-card-${w.id}`} key={w.id} className="relative group">
                                            {/* Timeline Node — posisi disamakan tengah dengan garis titik-titik (before:left-[11px] pada parent) */}
                                            <div className={`absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full border-[3.5px] z-10 ${isCompleted ? `${t.bgAccent} border-white dark:border-black` : 'bg-white dark:bg-black border-zinc-300 dark:border-zinc-600'}`}></div>

                                            {/* Card Content */}
                                            <div className={`p-4 rounded-3xl ${c.bg} flex flex-col relative transition-all ${isExpanded ? 'ring-2 ring-white/50 shadow-md' : 'hover:scale-[1.01] cursor-pointer'}`} onClick={() => {
                                              if(isExpanded) return;
                                              playSoundEffect('click', soundEnabled);
                                              setExpandedWorkoutId(w.id);
                                              setCalendarDate(new Date(targetDateStr));
                                              setCalendarMode('weekly');
                                              setTimeout(() => {
                                                const el = document.getElementById(`workout-card-${w.id}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              }, 150);
                                            }}>
                                              <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
                                                <button onClick={(e) => { e.stopPropagation(); removeWorkout(w.id); }} className={`p-1.5 ${c.text} opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors`} title="Hapus Jadwal">
                                                  <X size={16} />
                                                </button>
                                              </div>
                                              
                                              <div className={`text-xs font-semibold opacity-70 mb-1 flex items-center gap-2 ${c.text}`}>
                                                <span>{effectiveTime}</span>
                                                <button 
                                                    onClick={(e) => { 
                                                      e.stopPropagation();
                                                      playSoundEffect('click', soundEnabled);
                                                      setNotificationModalTarget({ workoutId: w.id, programId: w.programId, programName: w.programName, dateStr: targetDateStr, existingNotifId: w.reminderNotifId, currentTime: effectiveTime, currentEnabled: isNotifOn });
                                                    }} 
                                                    className={`hover:opacity-100 transition-opacity ${isNotifOn ? 'opacity-100' : 'opacity-40'}`} 
                                                    title="Atur Notifikasi"
                                                  >
                                                    {isNotifOn ? <Bell size={12} /> : <BellOff size={12} />}
                                                </button>
                                              </div>
                                              
                                              <span className={`font-black text-left leading-tight break-words text-[1.1rem] pr-8 mb-4 ${c.text}`}>
                                                {w.programName}
                                              </span>
                                              
                                              <div className="flex justify-between items-end mt-auto">
                                                <div className={`text-xs font-semibold opacity-70 flex items-center gap-1.5 ${c.text}`}>
                                                  <span>{isCompleted ? formatDurationHuman(w.duration || '00:00') : `${estDuration} Menit`}</span>
                                                  <span className="opacity-50">·</span>
                                                  <span>{`~${calBurned} kcal`}</span>
                                                </div>
                                                <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isCompleted ? c.badge : 'bg-black/10 dark:bg-white/10 ' + c.text}`}>
                                                  {isCompleted ? 'Selesai' : 'Terjadwal'}
                                                </div>
                                              </div>

                                            {isExpanded && (
                                              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 animate-in slide-in-from-top-2 fade-in duration-300 ease-out">
                                                <div className="space-y-1.5 mb-4">
                                                  {(w.overriddenExercises || prog?.exercises)?.map((ex, idx) => {
                                                     const exLogKey = `${ex.id}-${w.id}`;
                                                     const exLogs = logsToUse?.[exLogKey] || logsToUse?.[ex.id];
                                                     const doneSets = exLogs ? exLogs.filter(s => s.done && !s.skipped) : [];
                                                     const isSkipped = skippedToUse?.[exLogKey] || skippedToUse?.[ex.id];
                                                     const isNotDoneWhenCompleted = isCompleted && doneSets.length === 0;
                                                     const shouldShowNotDone = (isSkipped || isNotDoneWhenCompleted) && doneSets.length === 0;
                      
                                                     if (shouldShowNotDone) {
                                                        return (
                                                          <div key={ex.id} className={`p-2 px-3 rounded-lg bg-black/5 dark:bg-white/5 opacity-50 flex justify-between items-center`}>
                                                            <div className="body-md truncate mr-2 line-through opacity-70">{idx + 1}. {ex.name}</div>
                                                            <div className="text-[10px] font-bold text-rose-500">{isSkipped ? 'Di-skip' : 'Tidak Dikerjakan'}</div>
                                                          </div>
                                                        );
                                                     }
                      
                                                     let textStr = "";
                                                     if (doneSets.length > 0) {
                                                        const maxW = Math.max(...doneSets.map(s => Number(s.w) || 0)) || ex.defaultWeight || 0;
                                                        const maxR = Math.max(...doneSets.map(s => Number(s.r) || 0)) || ex.reps || 0;
                                                        const maxD = Math.max(...doneSets.map(s => Number(s.d) || 0)) || ex.duration || 0;
                                                        const langId = lang?.id || 'ID';
                                                        if (ex.type === 'time') textStr = `${doneSets.length} x ${formatNumber(maxD, langId)}s`;
                                                        else if (ex.type === 'reps') textStr = `${doneSets.length} x ${formatNumber(maxR, langId)}`;
                                                        else textStr = `${doneSets.length} x ${formatNumber(maxR, langId)} x ${isImp ? formatNumber(Math.round(maxW * 2.20462 * 10)/10, langId) + ' lbs' : formatNumber(maxW, langId) + ' kg'}`;
                                                     } else textStr = "Belum dimulai";
                      
                                                     return (
                                                       <div key={ex.id} className={`p-2 px-3 rounded-lg bg-black/5 dark:bg-white/5 flex justify-between items-center`}>
                                                         <div className={`body-md truncate mr-2 ${c.text}`}>{idx + 1}. {ex.name}</div>
                                                         <div className={`body-md font-mono whitespace-nowrap opacity-80 ${c.text}`}>{textStr}</div>
                                                       </div>
                                                     );
                                                  })}
                                                </div>
                                                <div className="flex gap-2">
                                                   <button onClick={(e) => { e.stopPropagation(); setExpandedWorkoutId(null); }} className={`flex-1 py-3 rounded-xl border border-dashed border-black/20 dark:border-white/20 body-lg font-bold ${c.text}`}>Tutup</button>
                                                   {(!isCompleted || getExercisesForWorkout(w).length > 0) && (
                                                     <button onClick={(e) => { e.stopPropagation(); const hasExercises = getExercisesForWorkout(w).length > 0; if (!isCompleted && !hasExercises) { playSoundEffect('click', soundEnabled); navigateToWorkoutDate(targetDateStr, w.programId); } else { handleEditPastWorkout(targetDateStr, w); } }} className={`flex-[2] py-3 rounded-xl bg-black/10 dark:bg-white/10 font-black body-lg flex items-center justify-center gap-2 transition-all ${c.text}`}>
                                                       <Edit2 size={16} /> {isCompleted ? 'Edit Riwayat' : (getExercisesForWorkout(w).length > 0 ? 'Mulai Latihan' : 'Edit Latihan')}
                                                     </button>
                                                   )}
                                                </div>
                                              </div>
                                            )}
                                            </div>
                                          </div>
                                       );
                                       })}
                                     </div>
                                   </div>
                                 ));
                              })()
                           )}
                         </div>

                         {activePlanIds.length > 0 && (
                             <button 
                                onClick={() => setShowProgramSelect(true)}
                                className={`w-full py-4 rounded-2xl border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} font-bold body-lg flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                             >
                                <Plus size={18} /> Tambah Sesi
                             </button>
                         )}

                         {panelWorkouts.some(w => !checkIsCompletedStrict(w, targetDateStr)) && targetDateStr === todayStr && (
                           <button 
                             onClick={() => { playSoundEffect('click', soundEnabled); navigateToWorkoutDate(targetDateStr); }} 
                             className={`w-full p-4 rounded-xl font-bold text-white transition-colors bg-gradient-to-r ${t.gradientBg} shadow-lg flex justify-center items-center`}
                           >
                             <PlayCircle size={18} className="mr-2"/> Mulai Latihan Sekarang
                           </button>
                         )}
                       </div>
                     </div>
                   );
               }}
            />
            </div>
         </div>
      </div>{/* end bottom sheet */}
    </div>

      {/* JADWALKAN SESI DIALOG */}
      {showProgramSelect && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" onClick={() => setShowProgramSelect(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300 ease-out" />
          <div 
            className={`relative w-full max-w-xs rounded-3xl p-5 shadow-2xl border ${t.border} animate-in zoom-in-95 fade-in duration-300 ease-out`}
            style={{ 
              background: (t.bgCard?.includes('0d1526') || t.bgCard?.includes('05070d')) 
                ? 'rgba(15, 40, 60, 0.65)' 
                : 'rgba(255, 255, 255, 0.65)', 
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${t.bgAccentSoft} flex items-center justify-center`}>
                  <CalendarPlus size={20} className={t.textAccent} />
                </div>
                <h3 className={`font-black body-lg ${t.textMain}`}>Jadwalkan Sesi</h3>
              </div>
              <button onClick={() => setShowProgramSelect(false)} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${t.textMuted}`}>
                <X size={18} />
              </button>
            </div>

            <div className={`h-px mb-4 ${(t.bgCard?.includes('0d1526') || t.bgCard?.includes('05070d')) ? 'bg-white/10' : 'bg-black/10'}`} />

            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {(() => {
                const filtered = programs.filter(p => activePlanIds.includes(p.planId || 'custom'));
                const grouped = filtered.reduce((acc, p) => {
                  const key = p.planName || 'Kustom';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(p);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([gName, progs]) => (
                  <div key={gName}>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted} mb-2 px-1`}>{gName}</p>
                    <div className="space-y-1.5">
                      {progs.map(p => (
                        <button 
                          key={p.id} 
                          onClick={() => addWorkoutToDate(p)}
                          className={`w-full p-3 rounded-xl text-left body-lg font-bold transition-all flex justify-between items-center ${t.textMain}`}
                          style={{ background: (t.bgCard?.includes('0d1526') || t.bgCard?.includes('05070d')) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                        >
                          {p.name}
                          <Plus size={16} className="opacity-40" />
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className={`h-px mt-4 mb-3 ${(t.bgCard?.includes('0d1526') || t.bgCard?.includes('05070d')) ? 'bg-white/10' : 'bg-black/10'}`} />

            <button 
              onClick={() => { playSoundEffect('click', soundEnabled); setShowProgramSelect(false); setActiveTab('program'); }}
              className={`w-full py-3 rounded-2xl text-center caption font-bold ${t.textMuted} hover:${t.textAccent} transition-colors`}
            >
              Kelola Program →
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      {notificationModalTarget && (
        <NotificationModal 
          t={t}
          target={notificationModalTarget}
          defaultReminderTime={defaultReminderTime}
          soundEnabled={soundEnabled}
          reminderEnabled={reminderEnabled}
          lang={lang}
          onSave={saveReminderFromModal}
          onNativeSync={() => { handleAddToNativeCalendar(notificationModalTarget.workoutId, notificationModalTarget.programName, notificationModalTarget.dateStr, notificationModalTarget.currentTime); setNotificationModalTarget(null); }}
          onClose={() => setNotificationModalTarget(null)}
        />
      )}
    </div>
  );
};

const NotificationModal = ({ t, target, defaultReminderTime, soundEnabled, reminderEnabled, lang, onSave, onNativeSync, onClose }) => {
  const [enabled, setEnabled] = React.useState(target.currentEnabled !== undefined ? target.currentEnabled : reminderEnabled);
  
  const parseInit = () => {
    const src = target.currentTime || defaultReminderTime || '15:00';
    const p = src.split(':');
    return { h: String(parseInt(p[0]) || 15).padStart(2, '0'), m: String(parseInt(p[1]) || 0).padStart(2, '0') };
  };
  const init = parseInit();
  const [hh, setHh] = React.useState(init.h);
  const [mm, setMm] = React.useState(init.m);

  const isDark = t.bgCard?.includes('0d1526') || t.bgCard?.includes('05070d');

  const clamp = (val, max) => {
    const n = parseInt(val) || 0;
    return String(Math.min(max, Math.max(0, n))).padStart(2, '0');
  };

  const handleSave = () => {
    onSave(enabled, parseInt(hh) || 0, parseInt(mm) || 0);
  };

  const inputCls = `w-16 h-14 text-center font-black text-2xl rounded-2xl outline-none border-2 ${t.border} focus:ring-2 ${t.ringAccent} ${t.textMain}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300 ease-out" />
      <div 
        className={`relative w-full max-w-xs rounded-3xl p-5 shadow-2xl border ${t.border} animate-in zoom-in-95 fade-in duration-300 ease-out`}
        style={{ 
          background: isDark 
            ? 'rgba(15, 40, 60, 0.65)' 
            : 'rgba(255, 255, 255, 0.65)', 
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-10 h-10 rounded-xl ${t.bgAccentSoft} flex items-center justify-center shrink-0`}>
            {enabled ? <Bell size={20} className={t.textAccent} /> : <BellOff size={20} className="opacity-40" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-black body-lg">Pengingat</h3>
            <p className="caption opacity-50 truncate">{target.programName}</p>
          </div>
        </div>

        {/* Divider */}
        <div className={`h-px my-3 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

        {/* Toggle */}
        <div className="flex flex-col py-1">
          <div className="flex items-center justify-between">
            <span className="font-bold body-lg">Notifikasi</span>
            <button 
              onClick={() => setEnabled(!enabled)}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${enabled ? t.bgAccent : isDark ? 'bg-white/15' : 'bg-black/15'} ${!reminderEnabled ? 'opacity-80' : ''}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          {!reminderEnabled && (
            <span className="text-xs text-rose-500 mt-1">Notifikasi global dimatikan, tapi jadwal ini tetap bisa menyala.</span>
          )}
        </div>
        
        {/* Time Picker */}
        <div className="py-3 mb-2">
          <p className="caption opacity-50 mb-2">Jam Rencana Latihan</p>
          <input
            type="time"
            value={`${hh}:${mm}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':');
              setHh(h || '00');
              setMm(m || '00');
            }}
            className={`w-full p-3 rounded-2xl font-black text-2xl text-center ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'} border-0 outline-none`}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>

        {/* Calendar Sync */}
        <div className="mt-4 mb-2">
          <button 
            onClick={onNativeSync}
            className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 ${target.gcalSynced ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : t.border + ' hover:bg-black/5 dark:hover:bg-white/5'} transition-colors`}
          >
            {target.gcalSynced ? <CalendarCheck size={18} /> : <CalendarPlus size={18} className={t.textAccent} />}
            {target.gcalSynced ? "Tersinkron di Notifikasi Kalender" : "Notifikasi Kalender"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className={`flex-1 py-3 rounded-2xl border ${t.border} font-bold body-lg active:scale-95 transition-all`}>
            Batal
          </button>
          <button onClick={handleSave} className={`flex-[2] py-3 rounded-2xl ${t.bgAccent} text-white font-black body-lg shadow-lg active:scale-95 transition-all`}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarTab;
