import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Info, CheckCircle, CalendarDays, Edit2, PlayCircle, X, Copy, Repeat, Plus, Clock, Bell, CalendarPlus, CalendarCheck, BellOff, BellRing, ToggleLeft, ToggleRight, Flame } from 'lucide-react';
import SwipeInput from '../components/SwipeInput';
import { getLocalYMD } from '../data/constants';
import { formatNumber } from '../utils/numberFormat';
import PanoramicSlider from '../components/PanoramicSlider';
import { LocalNotifications } from '@capacitor/local-notifications';

const CalendarTab = ({ 
  t, lang, theme, history, setHistory, programs, 
  selectedDate, setSelectedDate,
  setActiveTab, soundEnabled, playSoundEffect, navigateToWorkoutDate,
  exerciseLogs, skippedExercises, handleEditPastWorkout,
  weekStartDay = 0, defaultReminderTime = "15:00", reminderEnabled = true,
  unitSystem, setConfirmModal, activePlanIds = []
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
    
    // Filter history: Hanya tampilkan workout yang sesuai dengan activePlanIds (sejarah maupun rencana)
    const validHistorical = historical.filter(w => {
      const p = programs.find(prog => prog.id === w.programId);
      const wPlanId = (p ? p.planId : null) || 'custom';
      
      if (w.programId !== 'adhoc') {
        if (!activePlanIds.includes(wPlanId)) return false;
      }
      return true;
    });

    let result = [...validHistorical];
    const todayStr = getLocalYMD(new Date());

    if (dateStr >= todayStr && activePlanIds.length > 0) {
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
        const d = h[dateStr];
        if (d && d.workouts) {
          const updatedWorkouts = d.workouts.map(w => {
            if (w.id === workoutId) {
              return { ...w, reminderTime: newTimeStr, reminderEnabled: enabled, reminderNotifId: notifId };
            }
            return w;
          });
          h[dateStr] = { ...d, workouts: updatedWorkouts };
        }
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
    const details = `Sesi latihan LyFit: ${programName}${exList}`;
    
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

  return (
    <>
    <div className={`flex flex-col sm:flex-row h-[calc(100vh-120px)] overflow-hidden ${t.textMain} sm:gap-2`}>
      {/* STICKY CALENDAR HEADER */}
      <div className="shrink-0 z-10 pt-2 relative sm:w-[55%] md:w-[60%] lg:w-[65%] sm:h-full sm:overflow-y-auto hide-scrollbar sm:pr-2">
        <div className={`p-3 sm:p-4 rounded-2xl ${t.bgCard} shadow-sm border ${t.border} relative overflow-hidden z-10`}>
          {/* --- Background Image Layer --- */}
          <div 
            className="absolute inset-0 z-0 opacity-70 dark:opacity-40 pointer-events-none"
            style={{
              backgroundImage: "url('/bg-calendar.png')",
              backgroundSize: '160%',
              backgroundPosition: '50% 10px',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
            }}
          />
          {/* ------------------------------ */}
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
            <button onClick={() => {
              playSoundEffect('click', soundEnabled);
              if (calendarMode === 'monthly' || calendarMode === 'weekly') {
                if (calendarSliderRef.current) calendarSliderRef.current.slideRight();
              } else {
                setSlideDirection('left');
                if (calendarMode === 'monthPicker') setCalendarDate(new Date(year - 1, month, 1));
                else if (calendarMode === 'yearPicker') setCalendarDate(new Date(year - 12, month, 1));
              }
            }} className={`p-2 rounded-lg ${t.btnBg} hover:${t.bgAccentSoft} hover:${t.textAccent} transition-colors`}><ChevronLeft size={20}/></button>
            <button 
              onClick={() => {
                playSoundEffect('click', soundEnabled);
                if (calendarMode === 'weekly' || calendarMode === 'monthly') setCalendarMode('monthPicker');
                else if (calendarMode === 'monthPicker') setCalendarMode('yearPicker');
              }}
              className={`flex flex-col items-center hover:opacity-70 transition-opacity cursor-pointer`}
            >
               <h2 className={`h2 ${t.textMain} uppercase tracking-wider`}>
                 {calendarMode === 'yearPicker' ? `${year - 5} – ${year + 6}` : calendarMode === 'monthPicker' ? `${year}` : monthName}
               </h2>
            </button>
            <button onClick={() => {
              playSoundEffect('click', soundEnabled);
              if (calendarMode === 'monthly' || calendarMode === 'weekly') {
                if (calendarSliderRef.current) calendarSliderRef.current.slideLeft();
              } else {
                setSlideDirection('right');
                if (calendarMode === 'monthPicker') setCalendarDate(new Date(year + 1, month, 1));
                else if (calendarMode === 'yearPicker') setCalendarDate(new Date(year + 12, month, 1));
              }
            }} className={`p-2 rounded-lg ${t.btnBg} hover:${t.bgAccentSoft} hover:${t.textAccent} transition-colors`}><ChevronRight size={20}/></button>
          </div>
        
        {calendarMode === 'yearPicker' ? (
          <div className="grid grid-cols-3 gap-2 px-1 py-1 animate-in fade-in zoom-in-95 duration-300 ease-out">
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
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2 px-1 py-1">
              {(weekStartDay === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((day, i) => (<div key={i} className={`text-center caption uppercase ${t.textMuted}`}>{day}</div>))}
            </div>
            <PanoramicSlider
              ref={calendarSliderRef}
              onSwipeLeft={() => {
                playSoundEffect('click', soundEnabled);
                setSlideDirection('right');
                if (calendarMode === 'weekly') {
                  const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + 7);
                  setCalendarDate(newDate);
                  const newSelected = new Date(selectedDate);
                  newSelected.setDate(newSelected.getDate() + 7);
                  changeSelectedDateWithAnim(getLocalYMD(newSelected));
                } else {
                  setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                }
              }}
              onSwipeRight={() => {
                playSoundEffect('click', soundEnabled);
                setSlideDirection('left');
                if (calendarMode === 'weekly') {
                  const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() - 7);
                  setCalendarDate(newDate);
                  const newSelected = new Date(selectedDate);
                  newSelected.setDate(newSelected.getDate() - 7);
                  changeSelectedDateWithAnim(getLocalYMD(newSelected));
                } else {
                  setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                }
              }}
              onUpSwipe={() => {
                if (calendarMode === 'monthly') { setCalendarDate(new Date(selectedDate)); setCalendarMode('weekly'); playSoundEffect('click', soundEnabled); }
              }}
              onDownSwipe={() => {
                if (calendarMode === 'weekly') { setCalendarMode('monthly'); playSoundEffect('click', soundEnabled); }
              }}
              renderPanel={(panelType) => {
                let panelDate = calendarDate;
                if (panelType === 'prev') panelDate = getAdjacentCalendarDate(calendarDate, -1);
                else if (panelType === 'next') panelDate = getAdjacentCalendarDate(calendarDate, 1);
                const panelCells = getGridCellsForDate(panelDate);

                return (
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-1 px-1 py-1">
                    {panelCells.map((dateObj, idx) => {
                      if (!dateObj) return <div key={`blank-${idx}`} className="p-1 sm:p-2"></div>;
                      const dateKey = getLocalYMD(dateObj);
                      const day = dateObj.getDate();
                      const workouts = getDayWorkouts(dateKey);
                      const isToday = dateKey === todayStr;
                      const isSelected = dateKey === selectedDate;
                      const completedCount = workouts.filter(w => checkIsCompletedStrict(w, dateKey)).length;
                      let cellStyle = `aspect-square p-0.5 sm:p-1 relative flex flex-col items-center justify-start rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-500/30 ${t.textMain}`;
                      if (isSelected) cellStyle += ` ring-1 ${t.ringAccent}`;
                      const spanClass = isToday
                        ? `flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${t.bgAccent} text-white font-black text-xs sm:body-md`
                        : `text-xs sm:body-md font-medium ${workouts.length > 0 && completedCount === workouts.length ? t.textAccent : ''}`;
                      return (
                        <div
                          key={dateKey}
                          onClick={() => { playSoundEffect('click', soundEnabled); changeSelectedDateWithAnim(dateKey); setShowProgramSelect(false); setShowActionMenu(null); }}
                          draggable={workouts.length > 0}
                          onDragStart={(e) => handleDragStart(e, dateKey)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, dateKey)}
                          className={cellStyle}
                        >
                          <span className={spanClass}>{day}</span>
                          {workouts.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mt-1 w-full px-1">
                              {workouts.map(w => (
                                <div key={w.id} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${checkIsCompletedStrict(w, dateKey) ? t.bgAccent : 'bg-slate-400 dark:bg-slate-600'}`} title={w.programName}></div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
          </>
        )}

        <div className="flex items-center justify-center relative pt-3 pb-3 mb-2 mt-2">
            {(selectedDate !== todayStr || calendarDate.getMonth() !== new Date().getMonth() || calendarDate.getFullYear() !== new Date().getFullYear()) && (
              <button
                onClick={() => { playSoundEffect('click', soundEnabled); changeSelectedDateWithAnim(todayStr); setCalendarDate(new Date()); }}
                className={`absolute right-4 text-[10px] font-bold px-3 py-1 rounded-full ${t.bgAccent} text-white hover:opacity-80 transition-opacity shadow-sm`}
              >
                Hari Ini
              </button>
            )}
            {(calendarMode === 'monthly' || calendarMode === 'weekly') && !isTablet && (
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); if (calendarMode === 'monthly') setCalendarDate(new Date(selectedDate)); setCalendarMode(calendarMode === 'monthly' ? 'weekly' : 'monthly'); }}
                className="text-zinc-500 hover:text-emerald-500 transition-colors"
              >
                {calendarMode === 'monthly' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
            )}
        </div>
          </div>
      </div>
      </div>

      {/* SCROLLABLE INLINE WORKOUT DETAILS */}
      <div 
         ref={scrollContainerRef}
         className={`flex-1 flex flex-col overflow-y-auto hide-scrollbar pb-6 pt-10 sm:pt-6 px-3 sm:px-6 animate-in fade-in rounded-b-3xl sm:rounded-2xl border border-t-0 sm:border-t ${t.border} ${theme === 'dark' ? 'bg-[#061626]' : 'bg-[#f0f2f5]'} shadow-inner -mt-6 sm:mt-2 sm:mb-2 relative z-0`}
         onScroll={(e) => {
            if (e.currentTarget.scrollTop > 20 && calendarMode === 'monthly' && !isTablet) {
               setCalendarDate(new Date(selectedDate));
               setCalendarMode('weekly');
            }
         }}
      >
            <div className="-mx-3 sm:-mx-6 flex-1 flex flex-col">
            <PanoramicSlider className="flex-1"
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
                   if (scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 10 && calendarMode === 'weekly' && !isTablet) {
                       setCalendarMode('monthly');
                   }
               }}
               onUpSwipe={() => {
                   if (calendarMode === 'monthly' && !isTablet) {
                       setCalendarMode('weekly');
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
                        className={`flex flex-col h-full ${isCurr && detailSlideAnim ? `anim-slide-${detailSlideAnim}` : ''}`}
                     >
                       <div className="px-3 sm:px-6 pb-6 flex flex-col gap-3">
                         {(hasTargetCompleted || hasTargetPlanned) && (
                             <div className="flex gap-2">
                                 <button onClick={() => { playSoundEffect('click', soundEnabled); setShowActionMenu(showActionMenu === 'copyMove' ? null : 'copyMove');}} className={`flex-1 py-3 rounded-xl caption font-bold ${t.btnBg} border ${showActionMenu === 'copyMove' ? t.borderAccent : t.border} flex items-center justify-center transition-colors`}><Copy size={16} className="mr-2"/> Salin / Pindah</button>
                                 <button onClick={() => { playSoundEffect('click', soundEnabled); setShowActionMenu(showActionMenu === 'repeat' ? null : 'repeat');}} className={`flex-1 py-3 rounded-xl caption font-bold ${t.btnBg} border ${showActionMenu === 'repeat' ? t.borderAccent : t.border} flex items-center justify-center transition-colors`}><Repeat size={16} className="mr-2"/> Rutinkan</button>
                             </div>
                         )}

                         {showActionMenu === 'copyMove' && targetDateStr === selectedDate && (
                            <div className={`p-4 rounded-xl bg-black/10 dark:bg-white/5 border border-dashed ${t.border} animate-in zoom-in-95 duration-300 ease-out`}>
                                <label className="body-md mb-2 block">Pilih Tanggal Tujuan:</label>
                                <input type="date" value={targetDateInput} onChange={(e) => setTargetDateInput(e.target.value)} className={`w-full ${t.inputBg} ${t.textMain} px-3 py-2 rounded-lg body-lg mb-3 outline-none focus:ring-1 focus:${t.ringAccent}`} />
                                <div className="flex gap-2">
                                    <button onClick={() => handleCopyOrMove('copy')} className={`flex-1 py-2 rounded-lg font-bold caption ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80`}>Salin Hari Ini</button>
                                    <button onClick={() => handleCopyOrMove('move')} className={`flex-1 py-2 rounded-lg font-bold caption ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80`}>Pindah Hari Ini</button>
                                </div>
                            </div>
                         )}

                         {showActionMenu === 'repeat' && targetDateStr === selectedDate && (
                            <div className={`p-4 rounded-xl bg-black/10 dark:bg-white/5 border border-dashed ${t.border} animate-in zoom-in-95 duration-300 ease-out`}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="caption">Ulangi setiap</span>
                                    <div className="flex items-center space-x-2">
                                       <input type="number" value={repeatDays} onChange={(e) => setRepeatDays(Number(e.target.value))} className={`w-16 ${t.inputBg} ${t.textMain} px-2 py-1 rounded-lg body-lg text-center outline-none`} min="1" />
                                       <span className="caption w-6">Hari</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-[#41759b]/10 dark:bg-white/5 p-3 rounded-lg border border-dashed border-slate-400/50 dark:border-slate-500/20 mb-4">
                                    <span className="caption">Sebanyak</span>
                                    <div className="flex items-center space-x-2">
                                       <input type="number" value={repeatCount} onChange={(e) => setRepeatCount(Number(e.target.value))} className={`w-16 ${t.inputBg} ${t.textMain} px-2 py-1 rounded-lg body-lg text-center outline-none`} min="1" />
                                       <span className="caption w-6">Kali</span>
                                    </div>
                                </div>
                                <button onClick={handleRepeat} className={`w-full py-3 rounded-lg body-lg font-black ${t.bgAccent} text-white hover:opacity-90`}>Terapkan Jadwal Berkala</button>
                            </div>
                         )}
                         
                         <div className="space-y-4">
                           {panelWorkouts.length === 0 ? (
                              <div className="p-4 text-center caption opacity-50">
                                {(!activePlanIds || activePlanIds.length === 0) ? "Tidak ada program aktif. Silakan pilih program di tab Program." : "Tidak ada jadwal"}
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

                                return Object.entries(groupedPanel).map(([groupName, workouts]) => (
                                  <div key={groupName} className="mb-6 last:mb-0">
                                    <div className="flex items-center gap-3 mb-4 px-1 w-full">
                                      <div className={`h-px flex-1 bg-gray-200 dark:bg-gray-800`} />
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${t.textAccent} shrink-0`}>{groupName}</span>
                                      <div className={`h-px flex-1 bg-gray-200 dark:bg-gray-800`} />
                                    </div>
                                    <div className="space-y-4">
                                      {workouts.map(w => {
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
                                      
                                      const getMins = (durStr) => {
                                        if (!durStr) return 0;
                                        let m = 0;
                                        const parts = String(durStr).split(':').map(Number);
                                        if (parts.length === 3) m = (parts[0]*60) + parts[1] + (parts[2]>30?1:0);
                                        else if (parts.length === 2) m = parts[0] + (parts[1]>30?1:0);
                                        return m;
                                      };
                                      const actualMins = getMins(w.duration);
                                      const calBurned = (actualMins * 5) + 50;
                                      const estCal = (estDuration * 5) + 50;

                                             return (
                                         <div id={`workout-card-${w.programId}`} key={w.id} className={`p-4 rounded-2xl ${isCompleted ? 'border ' + t.borderAccentSoft + ' ' + t.bgAccentSoft : 'border-2 border-dashed ' + t.borderAccentSoft + ' bg-black/5 dark:bg-white/5'} flex flex-col relative transition-all ${isExpanded ? 'ring-2 ' + t.ringAccent : 'hover:scale-[1.02] cursor-pointer'}`} onClick={() => { if(!isExpanded) { playSoundEffect('click', soundEnabled); setExpandedWorkoutId(w.id); setCalendarDate(new Date(targetDateStr)); setCalendarMode('weekly'); } }}>
                                           <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                             <button onClick={(e) => { e.stopPropagation(); removeWorkout(w.id); }} className="p-1.5 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Hapus Jadwal">
                                               <X size={16} />
                                             </button>
                                           </div>
                                           <div className="flex items-center mb-0.5 pr-12">
                                             <div className="mr-3 shrink-0 flex items-center">
                                               {isCompleted ? <CheckCircle size={20} className={t.textAccent} /> : <PlayCircle size={20} className={t.textMuted} />}
                                             </div>
                                             <span className="font-black text-left leading-tight break-words text-[1.1rem]">{w.programName}</span>
                                           </div>
                                           <div className="flex flex-col ml-[32px]">
                                             {isCompleted ? (
                                               <div className="caption opacity-60 flex flex-wrap items-center gap-2 mt-1">
                                                 <span>Selesai: {w.timestamp}</span>
                                                 <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                                                 <span>{formatDurationHuman(w.duration || '00:00')}</span>
                                                 <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                                                 <span>{calBurned} kcal</span>
                                               </div>
                                             ) : (
                                               <div className="flex items-center gap-2 relative z-10 mt-1">
                                                 <div className="caption opacity-70 flex items-center gap-1.5 flex-wrap">
                                                   <span>Direncanakan</span>
                                                   {estDuration > 0 && (
                                                     <>
                                                       <span className="opacity-50 text-[10px]">•</span>
                                                       <span>~{estDuration} mnt</span>
                                                       <span className="opacity-50 text-[10px]">•</span>
                                                       <span>~{estCal} kcal</span>
                                                     </>
                                                   )}
                                                   <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                                                     <span className="opacity-50 text-[10px] ml-0.5">•</span>
                                                     <button onClick={() => { setNotificationModalTarget({ workoutId: w.id, programName: w.programName, dateStr: targetDateStr, existingNotifId: w.reminderNotifId, currentTime: effectiveTime, currentEnabled: isNotifOn }); }} className={`flex items-center gap-1 px-1.5 py-0.5 -ml-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${isNotifOn ? t.textAccent : 'opacity-60 hover:opacity-100'}`} title="Pengingat">
                                                       {isNotifOn ? <Bell size={13} /> : <BellOff size={13} />}
                                                       <span className="font-bold">{effectiveTime}</span>
                                                     </button>
                                                   </div>
                                                 </div>
                                               </div>
                                             )}
                                           </div>
                                           {isExpanded && (
                                             <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-300 ease-out">
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
                                                         <div key={ex.id} className={`p-2 px-3 rounded-lg border ${t.border} bg-black/5 dark:bg-white/5 opacity-50 flex justify-between items-center`}>
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
                                                      <div key={ex.id} className={`p-2 px-3 rounded-lg border ${t.border} bg-black/5 dark:bg-white/5 flex justify-between items-center`}>
                                                        <div className="body-md truncate mr-2">{idx + 1}. {ex.name}</div>
                                                        <div className="body-md font-mono whitespace-nowrap opacity-80">{textStr}</div>
                                                      </div>
                                                    );
                                                 })}
                                               </div>
                                               <div className="flex gap-2">
                                                  <button onClick={(e) => { e.stopPropagation(); setExpandedWorkoutId(null); setCalendarMode('monthly'); }} className={`flex-1 py-3 rounded-xl border border-dashed ${t.border} body-lg font-bold`}>Tutup</button>
                                                  {(!isCompleted || getExercisesForWorkout(w).length > 0) && (
                                                    <button onClick={(e) => { e.stopPropagation(); const hasExercises = getExercisesForWorkout(w).length > 0; if (!isCompleted && !hasExercises) { playSoundEffect('click', soundEnabled); navigateToWorkoutDate(targetDateStr, w.programId); } else { handleEditPastWorkout(targetDateStr, w); } }} className={`flex-[2] py-3 rounded-xl ${t.bgAccent} text-white font-black body-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all`}>
                                                      <Edit2 size={16} /> {isCompleted ? 'Edit Riwayat' : (getExercisesForWorkout(w).length > 0 ? 'Mulai Latihan' : 'Edit Latihan')}
                                                    </button>
                                                  )}
                                               </div>
                                             </div>
                                           )}
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
    </div>

      {/* JADWALKAN SESI DIALOG */}
      {showProgramSelect && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" onClick={() => setShowProgramSelect(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300 ease-out" />
          <div 
            className={`relative w-full max-w-xs rounded-3xl p-5 shadow-2xl border ${t.border} animate-in zoom-in-95 fade-in duration-300 ease-out`}
            style={{ 
              background: (t.bgCard?.includes('0a1f32') || t.bgCard?.includes('040f1a')) 
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

            <div className={`h-px mb-4 ${(t.bgCard?.includes('0a1f32') || t.bgCard?.includes('040f1a')) ? 'bg-white/10' : 'bg-black/10'}`} />

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
                          style={{ background: (t.bgCard?.includes('0a1f32') || t.bgCard?.includes('040f1a')) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
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

            <div className={`h-px mt-4 mb-3 ${(t.bgCard?.includes('0a1f32') || t.bgCard?.includes('040f1a')) ? 'bg-white/10' : 'bg-black/10'}`} />

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
    </>
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

  const isDark = t.bgCard?.includes('0a1f32') || t.bgCard?.includes('040f1a');

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
              onClick={() => { if(reminderEnabled) setEnabled(!enabled); }}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${enabled ? t.bgAccent : isDark ? 'bg-white/15' : 'bg-black/15'} ${!reminderEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          {!reminderEnabled && (
            <span className="text-xs text-rose-500 mt-1">Notifikasi global sedang dimatikan di Pengaturan</span>
          )}
        </div>
        
        {/* Time Picker - HH : MM */}
        <div className="flex flex-col items-center justify-center py-4 mb-2 animate-in zoom-in-95 duration-300 ease-out">
          <p className="caption opacity-50 mb-3 text-center">Jam Rencana Latihan (Jam : Menit)</p>
          <div className="flex items-center justify-center gap-3">
              <input 
                type="text" inputMode="numeric" maxLength={2}
                value={hh} 
                onChange={e => setHh(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => setHh(clamp(hh, 23))}
                className={inputCls}
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              />
              <span className="font-black text-2xl opacity-30">:</span>
              <input 
                type="text" inputMode="numeric" maxLength={2}
                value={mm} 
                onChange={e => setMm(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => setMm(clamp(mm, 59))}
                className={inputCls}
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              />
            </div>
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
