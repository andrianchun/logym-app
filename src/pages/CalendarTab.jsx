import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Info, CheckCircle, CalendarDays, Edit2, PlayCircle, X, Copy, Repeat, Plus, Clock, Bell, CalendarPlus, CalendarCheck } from 'lucide-react';
import { getLocalYMD } from '../data/constants';
import PanoramicSlider from '../components/PanoramicSlider';
import { LocalNotifications } from '@capacitor/local-notifications';

const CalendarTab = ({ 
  t, lang, theme, history, setHistory, programs, 
  selectedDate, setSelectedDate,
  setActiveTab, soundEnabled, playSoundEffect, navigateToWorkoutDate,
  exerciseLogs, skippedExercises, handleEditPastWorkout,
  weekStartDay = 0, defaultReminderTime = "15:00", reminderEnabled = true,
  unitSystem, setConfirmModal
}) => {
  const isImp = unitSystem === 'imperial';
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const [calendarMode, setCalendarMode] = useState('monthly');
  const [showActionMenu, setShowActionMenu] = useState(null); 
  const [showProgramSelect, setShowProgramSelect] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');

  const scrollContainerRef = useRef(null);

  const [repeatDays, setRepeatDays] = useState(1);
  const [repeatCount, setRepeatCount] = useState(4);
  const [draggedDate, setDraggedDate] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [tempReminderTime, setTempReminderTime] = useState("");
  const [slideDirection, setSlideDirection] = useState('right');

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
       setSelectedDate(getLocalYMD(currentSelected)); 
       setCalendarDate(new Date(currentSelected));
       playSoundEffect('click', soundEnabled);
    } else if (distanceX < -50 && Math.abs(distanceX) > Math.abs(distanceY)) {
       currentSelected.setDate(currentSelected.getDate() - 1); 
       setSelectedDate(getLocalYMD(currentSelected)); 
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

  const getDayWorkouts = (dateStr) => {
    return history[dateStr]?.workouts || [];
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

  const saveReminderTime = async (workoutId, programName, dateStr) => {
     playSoundEffect('click', soundEnabled);
     let notifId = null;
     if (reminderEnabled && tempReminderTime) {
       const d = history[dateStr];
       if (d && d.workouts) {
         const existing = d.workouts.find(w => w.id === workoutId);
         if (existing && existing.reminderNotifId) cancelWorkoutNotification(existing.reminderNotifId);
       }
       notifId = await scheduleWorkoutNotification(workoutId, programName, dateStr, tempReminderTime);
     }
     
     setHistory(prev => {
        const h = { ...prev };
        const d = h[dateStr];
        if (d && d.workouts) {
          const updatedWorkouts = d.workouts.map(w => {
            if (w.id === workoutId) {
              return { ...w, reminderTime: tempReminderTime, reminderNotifId: notifId };
            }
            return w;
          });
          h[dateStr] = { ...d, workouts: updatedWorkouts };
        }
        return h;
     });
     setEditingReminderId(null);
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
    
    if (newWorkouts.length > 0) {
      // Background schedule, won't block UI
      newWorkouts.forEach(async w => {
        w.reminderTime = defaultReminderTime;
        w.reminderNotifId = await scheduleWorkoutNotification(w.id, w.programName, targetDateInput, defaultReminderTime);
        setHistory(currentH => {
          const updatedD = currentH[targetDateInput] || { workouts: [] };
          const updatedWorkouts = (updatedD.workouts || []).map(uw => uw.id === w.id ? {...uw, reminderTime: w.reminderTime, reminderNotifId: w.reminderNotifId} : uw);
          return {...currentH, [targetDateInput]: {...updatedD, workouts: updatedWorkouts}};
        });
      });
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
        if (newWorkouts.length > 0) {
           newWorkouts.forEach(async w => {
             w.reminderTime = defaultReminderTime;
             w.reminderNotifId = await scheduleWorkoutNotification(w.id, w.programName, targetStr, defaultReminderTime);
             setHistory(currentH => {
               const updatedD = currentH[targetStr] || { workouts: [] };
               const updatedWorkouts = (updatedD.workouts || []).map(uw => uw.id === w.id ? {...uw, reminderTime: w.reminderTime, reminderNotifId: w.reminderNotifId} : uw);
               return {...currentH, [targetStr]: {...updatedD, workouts: updatedWorkouts}};
             });
           });
        }
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
    const notifId = await scheduleWorkoutNotification(wId, p.name, selectedDate, defaultReminderTime);

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
            log: {},
            reminderTime: defaultReminderTime,
            reminderNotifId: notifId
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
        programName: 'Sesi Ekstra',
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
    <div className={`flex flex-col sm:flex-row h-[calc(100vh-120px)] overflow-hidden ${t.textMain} sm:gap-2`}>
      {/* STICKY CALENDAR HEADER */}
      <div className="shrink-0 z-10 pt-2 relative sm:w-[55%] md:w-[60%] lg:w-[65%] sm:h-full sm:overflow-y-auto hide-scrollbar sm:pr-2">
        <div className={`p-3 sm:p-4 rounded-2xl ${t.bgCard} shadow-sm border ${t.border} relative z-10`}>
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => {
              playSoundEffect('click', soundEnabled);
              setSlideDirection('left');
              if (calendarMode === 'monthPicker') setCalendarDate(new Date(year - 1, month, 1));
              else if (calendarMode === 'yearPicker') setCalendarDate(new Date(year - 12, month, 1));
              else setCalendarDate(new Date(year, month - 1, 1));
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
              setSlideDirection('right');
              if (calendarMode === 'monthPicker') setCalendarDate(new Date(year + 1, month, 1));
              else if (calendarMode === 'yearPicker') setCalendarDate(new Date(year + 12, month, 1));
              else setCalendarDate(new Date(year, month + 1, 1));
            }} className={`p-2 rounded-lg ${t.btnBg} hover:${t.bgAccentSoft} hover:${t.textAccent} transition-colors`}><ChevronRight size={20}/></button>
          </div>
        
        {calendarMode === 'yearPicker' ? (
          <div className="grid grid-cols-3 gap-2 px-1 py-1 animate-in fade-in zoom-in-95 duration-200">
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
          <div className="grid grid-cols-3 gap-2 px-1 py-1 animate-in fade-in zoom-in-95 duration-200">
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
              onSwipeLeft={() => {
                playSoundEffect('click', soundEnabled);
                setSlideDirection('right');
                if (calendarMode === 'weekly') {
                  const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate() + 7);
                  setCalendarDate(newDate);
                  const newSelected = new Date(selectedDate);
                  newSelected.setDate(newSelected.getDate() + 7);
                  setSelectedDate(getLocalYMD(newSelected));
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
                  setSelectedDate(getLocalYMD(newSelected));
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
                          onClick={() => { playSoundEffect('click', soundEnabled); setSelectedDate(dateKey); setShowProgramSelect(false); setShowActionMenu(null); }}
                          draggable={workouts.length > 0}
                          onDragStart={(e) => handleDragStart(e, dateKey)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, dateKey)}
                          className={cellStyle}
                        >
                          <span className={spanClass}>{day}</span>
                          {workouts.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-1">
                              {workouts.map(w => (
                                <div key={w.id} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${checkIsCompletedStrict(w, dateKey) ? (theme === 'dark' ? 'bg-[#41759b]' : 'bg-[#B79347]') : (theme === 'dark' ? 'bg-[#294c65]' : 'bg-[#CBB989]')}`} />
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
                onClick={() => { playSoundEffect('click', soundEnabled); setSelectedDate(todayStr); setCalendarDate(new Date()); }}
                className={`absolute right-4 text-[10px] font-bold px-3 py-1 rounded-full ${t.bgAccent} text-white hover:opacity-80 transition-opacity shadow-sm`}
              >
                Hari Ini
              </button>
            )}
            {(calendarMode === 'monthly' || calendarMode === 'weekly') && (
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

      {/* SCROLLABLE INLINE WORKOUT DETAILS */}
      <div 
         ref={scrollContainerRef}
         className={`flex-1 flex flex-col overflow-y-auto hide-scrollbar pb-6 pt-10 sm:pt-6 px-3 sm:px-6 animate-in fade-in rounded-b-3xl sm:rounded-2xl border border-t-0 sm:border-t ${t.border} ${theme === 'dark' ? 'bg-[#061626]' : 'bg-[#f0f2f5]'} shadow-inner -mt-6 sm:mt-2 sm:mb-2 relative z-0`}
         onScroll={(e) => {
            if (e.currentTarget.scrollTop > 20 && calendarMode === 'monthly') {
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
                   if (scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 10 && calendarMode === 'weekly') {
                       setCalendarMode('monthly');
                   }
               }}
               onUpSwipe={() => {
                   if (calendarMode === 'monthly') {
                       setCalendarMode('weekly');
                   }
               }}
               renderPanel={(panelType) => {
                   const d = new Date(selectedDate);
                   if (panelType === 'prev') d.setDate(d.getDate() - 1);
                   else if (panelType === 'next') d.setDate(d.getDate() + 1);
                   const targetDateStr = getLocalYMD(d);
                   const panelWorkouts = getSelectedWorkoutsForDate(targetDateStr);

                   const isTargetPastOrToday = d <= new Date(); // roughly check if target date is in past/today for hasCompleted/hasPlanned
                   const hasTargetCompleted = panelWorkouts.some(w => checkIsCompletedStrict(w, targetDateStr));
                   const hasTargetPlanned = panelWorkouts.length > 0;

                   return (
                     <div className="flex flex-col h-full">
                       <div className="px-3 sm:px-6">
                         {(hasTargetCompleted || hasTargetPlanned) && (
                             <div className="flex space-x-2 mb-6">
                                 <button onClick={() => { playSoundEffect('click', soundEnabled); setShowActionMenu(showActionMenu === 'copyMove' ? null : 'copyMove');}} className={`flex-1 py-3 rounded-xl caption font-bold ${t.btnBg} border ${showActionMenu === 'copyMove' ? t.borderAccent : t.border} flex items-center justify-center transition-colors`}><Copy size={16} className="mr-2"/> Salin / Pindah</button>
                                 <button onClick={() => { playSoundEffect('click', soundEnabled); setShowActionMenu(showActionMenu === 'repeat' ? null : 'repeat');}} className={`flex-1 py-3 rounded-xl caption font-bold ${t.btnBg} border ${showActionMenu === 'repeat' ? t.borderAccent : t.border} flex items-center justify-center transition-colors`}><Repeat size={16} className="mr-2"/> Rutinkan</button>
                             </div>
                         )}

                         {showActionMenu === 'copyMove' && targetDateStr === selectedDate && (
                            <div className={`p-4 rounded-xl mb-6 bg-black/10 dark:bg-white/5 border border-dashed ${t.border} animate-in zoom-in-95`}>
                                <label className="body-md mb-2 block">Pilih Tanggal Tujuan:</label>
                                <input type="date" value={targetDateInput} onChange={(e) => setTargetDateInput(e.target.value)} className={`w-full ${t.inputBg} ${t.textMain} px-3 py-2 rounded-lg body-lg mb-3 outline-none focus:ring-1 focus:${t.ringAccent}`} />
                                <div className="flex gap-2">
                                    <button onClick={() => handleCopyOrMove('copy')} className={`flex-1 py-2 rounded-lg font-bold caption ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80`}>Salin Hari Ini</button>
                                    <button onClick={() => handleCopyOrMove('move')} className={`flex-1 py-2 rounded-lg font-bold caption ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80`}>Pindah Hari Ini</button>
                                </div>
                            </div>
                         )}

                         {showActionMenu === 'repeat' && targetDateStr === selectedDate && (
                            <div className={`p-4 rounded-xl mb-6 bg-black/10 dark:bg-white/5 border border-dashed ${t.border} animate-in zoom-in-95`}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="caption">Ulangi setiap</span>
                                    <div className="flex items-center space-x-2">
                                       <input type="number" value={repeatDays} onChange={(e) => setRepeatDays(Number(e.target.value))} className={`w-16 ${t.inputBg} ${t.textMain} px-2 py-1 rounded-lg body-lg text-center outline-none`} min="1" />
                                       <span className="caption w-6">Hari</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-dashed border-slate-500/20 mb-4">
                                    <span className="caption">Sebanyak</span>
                                    <div className="flex items-center space-x-2">
                                       <input type="number" value={repeatCount} onChange={(e) => setRepeatCount(Number(e.target.value))} className={`w-16 ${t.inputBg} ${t.textMain} px-2 py-1 rounded-lg body-lg text-center outline-none`} min="1" />
                                       <span className="caption w-6">Kali</span>
                                    </div>
                                </div>
                                <button onClick={handleRepeat} className={`w-full py-3 rounded-lg body-lg font-black ${t.bgAccent} text-white hover:opacity-90`}>Terapkan Jadwal Berkala</button>
                            </div>
                         )}
                       </div>

                       <div className="space-y-4 mb-6 px-3 sm:px-6">
                         {panelWorkouts.length === 0 ? (
                            <div className="p-4 text-center caption opacity-50">Tidak ada jadwal</div>
                         ) : (
                           panelWorkouts.map(w => {
                           const isCompleted = checkIsCompletedStrict(w, targetDateStr);
                           const isExpanded = expandedWorkoutId === w.id;
                           const prog = w.programId === 'adhoc' 
                             ? { id: 'adhoc', name: w.programName || 'Sesi Ekstra', exercises: w.exercises || [] }
                             : programs.find(p => p.id === w.programId);
                            
                           const dData = history[targetDateStr] || {};
                           const sessionLogs = (dData._activeSession && dData._activeSession.exerciseLogs && Object.keys(dData._activeSession.exerciseLogs).length > 0) ? dData._activeSession.exerciseLogs : exerciseLogs;
                           const sessionSkipped = (dData._activeSession && dData._activeSession.skippedExercises) ? dData._activeSession.skippedExercises : skippedExercises;
                           const logsToUse = (w.log && Object.keys(w.log).length > 0) ? w.log : sessionLogs;
                           const skippedToUse = w.skipped || sessionSkipped;
                                  return (
                              <div key={w.id} className={`p-4 rounded-2xl ${isCompleted ? 'border ' + t.borderAccentSoft + ' ' + t.bgAccentSoft : 'border-2 border-dashed ' + t.borderAccentSoft + ' bg-black/5 dark:bg-white/5'} flex flex-col relative transition-all ${isExpanded ? 'ring-2 ' + t.ringAccent : 'hover:scale-[1.02] cursor-pointer'}`} onClick={() => { if(!isExpanded) { playSoundEffect('click', soundEnabled); setExpandedWorkoutId(w.id); setCalendarDate(new Date(targetDateStr)); setCalendarMode('weekly'); } }}>
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  {!isCompleted && (
                                    <button onClick={(e) => { e.stopPropagation(); handleAddToNativeCalendar(w.id, w.programName, targetDateStr, w.reminderTime); }} className={`p-1.5 rounded-lg transition-colors ${w.gcalSynced ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-blue-500/50 hover:text-blue-500 hover:bg-blue-500/10'}`} title={w.gcalSynced ? "Sudah disinkron (Klik lagi untuk kirim ulang)" : "Tambah ke Kalender"}>
                                      {w.gcalSynced ? <CalendarCheck size={16} /> : <CalendarPlus size={16} />}
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); removeWorkout(w.id); }} className="p-1.5 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Hapus Jadwal">
                                    <X size={16} />
                                  </button>
                                </div>
                                <div className="flex items-center mb-2 pr-16">
                                  {isCompleted ? <CheckCircle size={18} className={`${t.textAccent} mr-2`} /> : <PlayCircle size={18} className={`${t.textMuted} mr-2`} />}
                                  <span className="font-black text-left">{w.programName}</span>
                                </div>
                                <div className="flex flex-col gap-1 mt-1">
                                  {isCompleted ? (
                                    <div className="caption opacity-60 mt-2 flex flex-wrap items-center gap-2">
                                      <span>Selesai: {w.timestamp}</span>
                                      <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                                      <span>{w.duration || '00:00'} menit</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2 mt-1 relative z-10" onClick={(e) => e.stopPropagation()}>
                                      <div className="caption opacity-70 flex items-center gap-1.5 flex-wrap">
                                        <span>Direncanakan</span>
                                        {w.reminderTime && (
                                          <>
                                            <span>•</span>
                                            {editingReminderId === w.id ? (
                                              <div className="flex items-center gap-1">
                                                <input 
                                                  type="time" 
                                                  value={tempReminderTime} 
                                                  onChange={e => setTempReminderTime(e.target.value)}
                                                  className={`bg-transparent border-b ${t.borderAccent} outline-none w-16 text-center`}
                                                />
                                                <button onClick={() => saveReminderTime(w.id, w.programName, targetDateStr)} className={`text-xs ${t.textAccent} font-bold px-1`}>OK</button>
                                                <button onClick={() => setEditingReminderId(null)} className="text-xs opacity-50 px-1">Batal</button>
                                              </div>
                                            ) : (
                                              <button onClick={() => { setTempReminderTime(w.reminderTime); setEditingReminderId(w.id); }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}>
                                                <Bell size={12} className={t.textAccent} />
                                                <span className="font-bold">{w.reminderTime}</span>
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {isExpanded && (
                                  <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
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
                                            if (ex.type === 'time') textStr = `${doneSets.length} x ${maxD}s`;
                                            else if (ex.type === 'reps') textStr = `${doneSets.length} x ${maxR}`;
                                            else textStr = `${doneSets.length} x ${maxR} x ${isImp ? Math.round(maxW * 2.20462 * 10)/10 + ' lbs' : maxW + ' kg'}`;
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
                                       <button onClick={(e) => { e.stopPropagation(); const hasExercises = w.exercises && w.exercises.length > 0; if (!isCompleted && !hasExercises) { playSoundEffect('click', soundEnabled); navigateToWorkoutDate(targetDateStr); } else { handleEditPastWorkout(targetDateStr, w); } }} className={`flex-[2] py-3 rounded-xl ${t.bgAccent} text-white font-black body-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all`}>
                                         <Edit2 size={16} /> {isCompleted ? 'Edit Riwayat' : ((w.exercises && w.exercises.length > 0) ? 'Mulai Latihan' : 'Edit Latihan')}
                                       </button>
                                    </div>
                                  </div>
                                )}
                             </div>
                           );
                         })
                       )}
                      </div>

                         <div className="px-3 sm:px-6 pb-6">
                            {!showProgramSelect ? (
                              <button 
                                 onClick={() => { playSoundEffect('click', soundEnabled); setShowProgramSelect(true); }}
                                 className={`w-full py-4 rounded-xl border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} font-bold flex items-center justify-center hover:${t.bgAccentSoft} transition-colors`}
                              >
                                 <Plus size={18} className="mr-2" /> Tambah Program
                              </button>
                            ) : (
                              <div className={`p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed ${t.border} animate-in fade-in`}>
                                 <div className="flex justify-between items-center mb-3">
                                   <span className="body-lg font-bold">Pilih Program Latihan:</span>
                                   <button onClick={() => setShowProgramSelect(false)} className="p-1 hover:bg-white/10 rounded-lg"><X size={16}/></button>
                                 </div>
                                 <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                   {programs.map(p => (
                                     <button 
                                       key={p.id} 
                                       onClick={() => addWorkoutToDate(p)}
                                       className={`w-full p-3 rounded-xl border ${t.border} text-left body-lg font-bold hover:${t.bgAccentSoft} hover:${t.textAccent} transition-colors flex justify-between items-center`}
                                     >
                                       {p.name}
                                       <Plus size={16} className="opacity-50" />
                                     </button>
                                   ))}
                                 </div>
                              </div>
                            )}

                            {panelWorkouts.some(w => !checkIsCompletedStrict(w, targetDateStr)) && targetDateStr === todayStr && (
                              <button 
                                onClick={() => { playSoundEffect('click', soundEnabled); navigateToWorkoutDate(targetDateStr); }} 
                                className={`w-full p-4 mt-6 rounded-xl font-bold text-white transition-colors bg-gradient-to-r ${t.gradientBg} shadow-lg flex justify-center items-center`}
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
  );
};

export default CalendarTab;
