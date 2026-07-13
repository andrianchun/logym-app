import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Camera, Image, Download, Share2, Loader2, ChevronRight, ChevronLeft, Footprints, Clock, Utensils, Flame, Moon, Zap, Activity, HeartPulse, Wind, Dumbbell, Trash2, Globe } from 'lucide-react';
// html-to-image: lebih ringan, pixel-perfect, support CSS modern (blur, gradient, dll)
const loadToPng = async () => (await import('html-to-image')).toPng;
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { uploadImageToFirebase } from '../utils/storage';
import { getLocalYMD } from '../data/constants';
import DashboardChart from './DashboardChart';
import ProgressTab from '../pages/ProgressTab';
import { MuscleProgress } from './MuscleProgress';
import { shareWorkoutToFeed } from '../utils/communityApi';
import CreatePostModal from './CreatePostModal';
import ActivityRings from './ActivityRings';
import { parseWorkoutDurationMinutes, calculateWorkoutCalories } from '../utils/workoutCalc';
let globalTemplateIndex = 0; // default to bodycomp

export default function ShareCardGenerator({ user, setUser, t, theme, history, activityTargets, programs, exerciseLibrary, lang, language, soundEnabled, playSoundEffect, selectedDate, units, activePlanIds, userProfile, onPostCreated }) {
    const cardRef = useRef(null);
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    
    const [bgImage, setBgImage] = useState(user?.customCardBg || null);
    const [isUploadingBg, setIsUploadingBg] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    
    // Staging post modal state
    const [pendingShareFiles, setPendingShareFiles] = useState(null);
    const [pendingWorkoutData, setPendingWorkoutData] = useState(null);
    
    // Toast state
    const [toastMsg, setToastMsg] = useState('');
    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    // Pan, Zoom & Rotate states
    const [bgZoom, setBgZoom] = useState(user?.customCardSettings?.zoom ?? 100);
    const [bgRotate, setBgRotate] = useState(user?.customCardSettings?.rotate ?? 0);
    const [bgOffset, setBgOffset] = useState(user?.customCardSettings?.offset ?? { x: 0, y: 0 });
    const [isDraggingBg, setIsDraggingBg] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, initialDistance: null, initialAngle: null, initialZoom: 100, initialRotate: 0 });

    const initialSettingsStr = useRef(JSON.stringify(user?.customCardSettings || { zoom: 100, rotate: 0, offset: { x: 0, y: 0 } }));

    // Persist settings to Firebase
    useEffect(() => {
        if (!bgImage || isDraggingBg) return;
        
        const currentSettings = { zoom: bgZoom, rotate: bgRotate, offset: bgOffset };
        if (JSON.stringify(currentSettings) === initialSettingsStr.current) return;
        
        const timer = setTimeout(() => {
            if (!user?.uid) return;
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, { customCardSettings: currentSettings }).catch(console.error);
            initialSettingsStr.current = JSON.stringify(currentSettings);
            if (setUser) setUser(prev => ({ ...prev, customCardSettings: currentSettings }));
        }, 500);

        return () => clearTimeout(timer);
    }, [bgZoom, bgRotate, bgOffset, isDraggingBg, bgImage, user?.uid]);

    const getPinchData = (touches) => {
        if (touches.length < 2) return null;
        const dx = touches[1].clientX - touches[0].clientX;
        const dy = touches[1].clientY - touches[0].clientY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return { distance, angle };
    };

    const handlePointerDown = (e) => {
        if (!bgImage) return;
        if (e.target.closest('button')) return; // ignore button clicks
        setIsDraggingBg(true);
        if (e.touches && e.touches.length === 2) {
            const pinch = getPinchData(e.touches);
            dragStartRef.current = {
                ...dragStartRef.current,
                initialDistance: pinch.distance,
                initialAngle: pinch.angle,
                initialZoom: bgZoom,
                initialRotate: bgRotate
            };
        } else {
            const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            dragStartRef.current = { ...dragStartRef.current, x: clientX, y: clientY, startX: bgOffset.x, startY: bgOffset.y, initialDistance: null };
        }
    };

    const handlePointerMove = (e) => {
        if (!isDraggingBg || !bgImage) return;
        if (e.touches && e.touches.length === 2 && dragStartRef.current.initialDistance) {
            const pinch = getPinchData(e.touches);
            const scale = pinch.distance / dragStartRef.current.initialDistance;
            const newZoom = Math.min(Math.max(50, dragStartRef.current.initialZoom * scale), 300);
            
            const angleDelta = pinch.angle - dragStartRef.current.initialAngle;
            let newRotate = dragStartRef.current.initialRotate + angleDelta;
            
            setBgZoom(newZoom);
            setBgRotate(newRotate);
        } else {
            if (dragStartRef.current.initialDistance !== null) return; // Prevent jumping when releasing one finger
            const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const dx = clientX - dragStartRef.current.x;
            const dy = clientY - dragStartRef.current.y;
            setBgOffset({
                x: dragStartRef.current.startX + dx,
                y: dragStartRef.current.startY + dy
            });
        }
    };

    const handlePointerUp = (e) => {
        if (e && e.touches && e.touches.length > 0) {
            const clientX = e.touches[0].clientX;
            const clientY = e.touches[0].clientY;
            dragStartRef.current = { ...dragStartRef.current, x: clientX, y: clientY, startX: bgOffset.x, startY: bgOffset.y, initialDistance: null };
        } else {
            setIsDraggingBg(false);
        }
    };
    
    const { workoutsList, workoutDate } = useMemo(() => {
        const getWorkoutsForDate = (dateStr) => {
            if (!history || !history[dateStr] || !history[dateStr].workouts) return null;
            
            // 1. Filter out inactive programs
            const validWorkouts = history[dateStr].workouts.filter(w => {
                if (w.programId === 'adhoc') return true;
                const p = programs.find(prog => prog.id === w.programId);
                const wPlanId = (p ? p.planId : null) || 'custom';
                return activePlanIds.includes(wPlanId);
            });

            // 2. Check completeness
            const completed = validWorkouts.filter(w => {
                if (w.status === 'planned') return false; // Strictly exclude planned workouts
                if (w.status === 'completed') return true;
                if (w.timestamp) return true;
                if (w.log && Object.keys(w.log).length > 0) {
                    for (const sets of Object.values(w.log)) {
                        if (sets.some(s => s.done)) return true;
                    }
                }
                return false;
            });
            if (completed.length === 0) return null;
            return { workoutsList: completed, workoutDate: dateStr };
        };

        if (selectedDate) {
            const res = getWorkoutsForDate(selectedDate);
            // If they clicked on a specific date, ONLY show that date. No fallback to past workouts.
            return res || { workoutsList: [], workoutDate: selectedDate };
        }

        if (history) {
            const sortedDates = Object.keys(history).sort().reverse();
            for (const dateStr of sortedDates) {
                const res = getWorkoutsForDate(dateStr);
                if (res) return res;
            }
        }
        return { workoutsList: [], workoutDate: null };
    }, [history, selectedDate]);

    const templates = useMemo(() => {
        const arr = ['bodycomp', 'activity', 'calendar', 'progress'];
        if (workoutsList.length > 0) {
            workoutsList.forEach((_, idx) => arr.push(`workout_daily_${idx}`));
        }
        return arr;
    }, [workoutsList]);

    const [templateIndex, setTemplateIndex] = useState(() => Math.min(globalTemplateIndex, templates.length - 1));
    const activeTemplate = templates[templateIndex] || templates[0];
    
    // Safety check in case templates shrink
    if (templateIndex >= templates.length) {
        setTemplateIndex(templates.length - 1);
    }

    const nextTemplate = () => {
        setTemplateIndex((prev) => {
            const next = (prev + 1) % templates.length;
            globalTemplateIndex = next;
            return next;
        });
    };
    const prevTemplate = () => {
        setTemplateIndex((prev) => {
            const next = (prev - 1 + templates.length) % templates.length;
            globalTemplateIndex = next;
            return next;
        });
    };

    // Helpers
    const isImp = units?.weight === 'lbs';
    const formatNumber = (num) => {
        if (num === undefined || num === null) return '-';
        return Number(num).toLocaleString('id-ID');
    };
    const parseSleepHours = (sleepStr) => {
        if (!sleepStr) return 0;
        const parts = sleepStr.match(/(\d+)\s*h\s*(\d+)?\s*m?/);
        if (!parts) return 0;
        const h = parseInt(parts[1] || 0, 10);
        const m = parseInt(parts[2] || 0, 10);
        return h + (m / 60);
    };

    // Calculate Latest BioData
    const getLatestBioData = () => {
        const emptyBio = {
            bodyScore: null, weight: null, height: null, bmi: null, bmiStatus: '-', bodyFat: null, bodyFatStatus: '-',
            muscleMass: null, musclePercent: null, boneMass: null, waterPercent: null, visceralFat: null, bmr: null, bodyAge: null, 
            waist: null, waistToHip: null, proteinPercent: null, bodyType: '-', weightSuggestion: '-',
            steps: 0, activeMinutes: 0, activityCalories: 0, nutritionCalories: 0, sleep: '', energyScore: null,
            heartRate: null, minHeartRate: null, maxHeartRate: null, bloodPressure: '', oxygenSaturation: null, waterIntake: 0,
            weeklyDuration: 0, weeklySessions: 0, weeklyCalories: 0
        };
        let latestBodyData = null;
        let bodyDataDate = null;
        const activeDate = selectedDate || getLocalYMD(new Date());
        const todayDailyData = history[activeDate]?.bioData || {};
        
        const sortedDates = Object.keys(history).filter(d => d <= activeDate).sort((a,b) => b.localeCompare(a));
        for (let date of sortedDates) {
            const dayBio = history[date]?.bioData;
            if (dayBio && (Number(dayBio.weight) > 0 || Number(dayBio.bodyFat) > 0 || Number(dayBio.musclePercent) > 0 || Number(dayBio.bmr) > 0 || Number(dayBio.bodyScore) > 0)) {
                latestBodyData = dayBio;
                bodyDataDate = date;
                break;
            }
        }

        const mergedData = {
            ...emptyBio,
            height: userProfile?.height || null, 
            weight: userProfile?.weight || null,
            ...(latestBodyData || {}),
            steps: todayDailyData.steps !== undefined ? todayDailyData.steps : 0,
            activeMinutes: todayDailyData.activeMinutes !== undefined ? todayDailyData.activeMinutes : 0,
            activityCalories: todayDailyData.activityCalories !== undefined ? todayDailyData.activityCalories : 0,
            nutritionCalories: todayDailyData.nutritionCalories !== undefined ? todayDailyData.nutritionCalories : 0,
            sleep: todayDailyData.sleep !== undefined ? todayDailyData.sleep : '',
            energyScore: todayDailyData.energyScore !== undefined ? todayDailyData.energyScore : null,
            heartRate: todayDailyData.heartRate !== undefined ? todayDailyData.heartRate : null,
            minHeartRate: todayDailyData.minHeartRate !== undefined ? todayDailyData.minHeartRate : null,
            maxHeartRate: todayDailyData.maxHeartRate !== undefined ? todayDailyData.maxHeartRate : null,
            bloodPressure: todayDailyData.bloodPressure !== undefined ? todayDailyData.bloodPressure : '',
            oxygenSaturation: todayDailyData.oxygenSaturation !== undefined ? todayDailyData.oxygenSaturation : null,
            waterIntake: todayDailyData.waterIntake !== undefined ? todayDailyData.waterIntake : 0,
            weeklyDuration: todayDailyData.weeklyDuration !== undefined ? todayDailyData.weeklyDuration : 0,
            weeklySessions: todayDailyData.weeklySessions !== undefined ? todayDailyData.weeklySessions : 0,
            weeklyCalories: todayDailyData.weeklyCalories !== undefined ? todayDailyData.weeklyCalories : 0,
        };
        
        // Auto-calculate BMI if weight and height exist
        if (mergedData.height > 0 && mergedData.weight > 0 && !mergedData.bmi) {
            const hMeter = mergedData.height / 100;
            mergedData.bmi = Number((mergedData.weight / (hMeter * hMeter)).toFixed(1));
            
            if (mergedData.bmi < 18.5) mergedData.bmiStatus = 'Underweight';
            else if (mergedData.bmi <= 22.9) mergedData.bmiStatus = 'Normal';
            else if (mergedData.bmi <= 24.9) mergedData.bmiStatus = 'Overweight';
            else mergedData.bmiStatus = 'Obese';
        }

        return { bioData: mergedData, bioDataDate: bodyDataDate };
    };
    const { bioData, bioDataDate } = getLatestBioData();

    // Aggregations for Activity
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayActivity = history[todayStr] || {};
    
    // Weekly Aggregations
    let weeklyDur = 0;
    let weeklySess = 0;
    const end = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        const dayData = history[dateStr] || {};
        let extDur = Number(dayData.bioData?.activeMinutes || 0);
        let intDur = 0;
        const wks = dayData.workouts || [];
        weeklySess += wks.length;
        wks.forEach(w => {
            intDur += parseWorkoutDurationMinutes(w.duration);
        });
        weeklyDur += Math.max(extDur, intDur);
    }
    const mergedWeeklyActiveMinutes = bioData.weeklyDuration || weeklyDur;
    const mergedWeeklySessions = bioData.weeklySessions || weeklySess;
    const mergedWeeklyWorkoutDuration = weeklyDur; // simplified
    // Calculate calories safely to avoid NaN
    let workoutCal = 0;
    let dailyIntDur = 0;
    if (todayActivity.workouts?.length) {
       todayActivity.workouts.forEach(w => {
           const wMins = parseWorkoutDurationMinutes(w.duration);
           workoutCal += calculateWorkoutCalories(bioData.weight, wMins);
           dailyIntDur += wMins;
       });
    }
    const mergedDailyCalories = (Number(bioData.activityCalories) || 0) + workoutCal;
    const mergedDailyActiveMinutes = Math.max(Number(bioData.activeMinutes || 0), dailyIntDur);

    const scoreStyle = bioData.bodyScore >= 80 ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : bioData.bodyScore >= 60 ? 'border-amber-400/50 text-amber-400 bg-amber-400/10' : 'border-rose-500/50 text-rose-500 bg-rose-500/10';

    const latestWorkoutDate = workoutDate;
    const isWorkoutTemplate = activeTemplate.startsWith('workout_daily');
    const safeSessionIndex = isWorkoutTemplate ? parseInt(activeTemplate.split('_')[2] || '0') : 0;
    const latestWorkout = workoutsList[safeSessionIndex] || workoutsList[0];

    const getWorkoutDurationMins = (w) => {
        if (!w) return 0;
        let mins = parseWorkoutDurationMinutes(w.duration);

        // Fallback for manually checked off workouts without timer
        if (mins === 0 && w.log) {
            let setsCount = 0;
            Object.values(w.log).forEach(sets => {
                sets.forEach(s => {
                    if (s.done && !s.skipped) setsCount++;
                });
            });
            mins = setsCount * 2; // Assume 2 mins per set on average
        }
        return mins;
    };

    // Create a simulated workout for Radar chart if volume is 0
    const simulatedWorkout = useMemo(() => {
        if (!latestWorkout) return null;
        const exList = latestWorkout.overriddenExercises || programs?.find(p => p.id === latestWorkout.programId)?.exercises || [];
        const simW = { ...latestWorkout, log: { ...(latestWorkout.log || {}) } };
        
        let hasRealVolume = false;
        if (latestWorkout.log) {
            Object.values(latestWorkout.log).forEach(sets => {
                sets.forEach(s => { if (s.done && !s.skipped) hasRealVolume = true; });
            });
        }
        
        if (!hasRealVolume) {
            // Fake volume to make radar chart visible based on planned exercises
            exList.forEach(ex => {
                simW.log[ex.id] = [{ done: true, w: 10, r: 10, d: 60 }];
            });
        }
        return simW;
    }, [latestWorkout, programs]);

    const getWorkoutVolume = (w) => {
        let vol = 0;
        if (w?.log) {
            Object.values(w.log).forEach(sets => {
                sets.forEach(set => {
                    if (set.done && !set.skipped) vol += (Number(set.w) || 0) * (Number(set.r) || 0);
                });
            });
        }
        return vol;
    };

    const formatDateWithDay = (dateStr, lang) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (lang === 'ID') {
            const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } else {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const date = d.getDate();
            let suffix = 'th';
            if (date % 10 === 1 && date !== 11) suffix = 'st';
            if (date % 10 === 2 && date !== 12) suffix = 'nd';
            if (date % 10 === 3 && date !== 13) suffix = 'rd';
            return `${days[d.getDay()]}, ${months[d.getMonth()]} ${date}${suffix}, ${d.getFullYear()}`;
        }
    };

    const getExerciseSummary = (ex, w) => {
        const logKey = `${ex.id}-${w.id}`;
        const exLog = w.log?.[logKey] || w.log?.[ex.id];
        if (!exLog) return "Belum dikerjakan";
        const doneSets = exLog.filter(s => s.done && !s.skipped);
        if (doneSets.length === 0) return "Di-skip";
        const maxW = Math.max(...doneSets.map(s => Number(s.w) || 0));
        const maxR = Math.max(...doneSets.map(s => Number(s.r) || 0));
        if (ex.type === 'time') {
            const maxD = Math.max(...doneSets.map(s => Number(s.d) || 0));
            return `${doneSets.length} x ${maxD}s`;
        }
        return `${doneSets.length} x ${maxR} x ${maxW}kg`;
    };

    const handleBackgroundChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast("Ukuran background maksimal 5MB!");
            if (e.target) e.target.value = '';
            return;
        }

        const fileSignature = file.name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + file.size;
        const isAlreadyUploaded = !!(user?.uploadedBackgrounds?.[fileSignature]);

        // Limit frequency to 5x per day for NEW uploads
        const todayStr = getLocalYMD(new Date());
        let currentUploads = user?.cardBgUploads || { date: '', count: 0 };
        if (currentUploads.date !== todayStr) {
            currentUploads = { date: todayStr, count: 0 };
        }

        if (!isAlreadyUploaded && currentUploads.count >= 5) {
            showToast("Kuota ganti foto hari ini habis (5/5)!");
            if (e.target) e.target.value = '';
            return;
        }

        setIsUploadingBg(true);
        try {
            // Check if this exact file was uploaded before
            let downloadUrl = user?.uploadedBackgrounds?.[fileSignature];
            let isNewUpload = false;

            if (!downloadUrl) {
                // Delete old background from Firebase if exists (cleaning up transition to Cloudinary)
                if (user?.customCardBg?.includes('firebasestorage')) {
                    try {
                        await deleteObject(ref(storage, user.customCardBg));
                    } catch (e) { console.log("Old bg not found or already deleted"); }
                }

                // Upload to Firebase Storage
                downloadUrl = await uploadImageToFirebase(file, `lyfit_users/${user.uid}/backgrounds/card_background_${Date.now()}`);
                isNewUpload = true;
            }

            setBgImage(downloadUrl);
            const userRef = doc(db, 'users', user.uid);
            const newUploads = { date: todayStr, count: currentUploads.count + (isNewUpload ? 1 : 0) };
            
            const newUploadedBackgrounds = { ...(user?.uploadedBackgrounds || {}) };
            newUploadedBackgrounds[fileSignature] = downloadUrl;

            await updateDoc(userRef, { 
                customCardBg: downloadUrl,
                cardBgUploads: newUploads,
                uploadedBackgrounds: newUploadedBackgrounds
            });
            if (setUser) setUser(prev => ({ ...prev, customCardBg: downloadUrl, cardBgUploads: newUploads, uploadedBackgrounds: newUploadedBackgrounds }));
        } catch (err) {
            console.error("Error uploading background:", err);
            showToast("Gagal mengupload background.");
        }
        setIsUploadingBg(false);
        if (e.target) e.target.value = '';
    };

    const handleDeleteBackground = async () => {
        if (!bgImage) return;
        setIsUploadingBg(true);
        try {
            if (bgImage.includes('firebasestorage')) {
                try {
                    await deleteObject(ref(storage, bgImage));
                } catch(e) { console.log("Failed to delete bg object", e); }
            }
            setBgImage(null);
            setBgZoom(100);
            setBgRotate(0);
            setBgOffset({x: 0, y: 0});
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { customCardBg: null, customCardSettings: null });
            if (setUser) setUser(prev => ({ ...prev, customCardBg: null, customCardSettings: null }));
            showToast("Foto background dihapus.");
        } catch (err) {
            console.error("Error deleting background:", err);
            showToast("Gagal menghapus background.");
        }
        setIsUploadingBg(false);
    };

    const handleShareToCommunity = async () => {
        if (!cardRef.current) return;
        
        setIsSharing(true);
        const files = [];
        const originalIndex = templateIndex;
        
        try {
            const toPng = await loadToPng();
            // Tunggu font selesai dimuat sebelum mulai capture
            if (document.fonts?.ready) await document.fonts.ready;
            for (let i = 0; i < templates.length; i++) {
                setTemplateIndex(i);
                setToastMsg(`Menyiapkan ${i + 1}/${templates.length}...`);

                // Wait for React to render the new template
                await new Promise(resolve => setTimeout(resolve, 150));

                // Render dua kali: pertama untuk 'warming up' font/image cache, kedua yang aktual
                await toPng(cardRef.current, { pixelRatio: 2, skipAutoScale: true, cacheBust: false, filter: el => !el.classList?.contains('ignore-download') });
                const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, skipAutoScale: true, cacheBust: false, filter: el => !el.classList?.contains('ignore-download') });

                const blob = await (await fetch(dataUrl)).blob();
                if (blob) {
                    files.push(new File([blob], `LOGYM-${templates[i]}-${Date.now()}.png`, { type: 'image/png' }));
                }
            }
            
            setTemplateIndex(originalIndex);
            
            const workoutData = {
                type: 'workout_log',
                programName: "Ringkasan Aktivitas",
                duration: workoutsList.length > 0 ? getWorkoutDurationMins(workoutsList[0]) + ' m' : '0 m',
                totalVolume: workoutsList.length > 0 ? (workoutsList[0]?.totalVolume || 0) : 0
            };
            
            setPendingShareFiles(files);
            setPendingWorkoutData(workoutData);
        } catch (err) {
            console.error("Share to community error:", err);
            showToast("Terjadi kesalahan.");
        } finally {
            setIsSharing(false);
            setToastMsg("");
        }
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            const toPng = await loadToPng();
            if (document.fonts?.ready) await document.fonts.ready;
            // Render dua kali: pertama untuk 'warming up' font/image cache, kedua yang aktual
            await toPng(cardRef.current, { pixelRatio: 3, skipAutoScale: true, cacheBust: false, filter: el => !el.classList?.contains('ignore-download') });
            const image = await toPng(cardRef.current, { pixelRatio: 3, skipAutoScale: true, cacheBust: false, filter: el => !el.classList?.contains('ignore-download') });
            const link = document.createElement('a');
            link.href = image;
            link.download = `LOGYM-${activeTemplate}-${Date.now()}.png`;
            link.click();
        } catch (err) {
            console.error("Error generating image:", err);
            showToast("Terjadi kesalahan saat memproses gambar.");
        }
        setIsGenerating(false);
    };

    const handleShare = async () => {
        if (!cardRef.current) return;
        
        if (!navigator.canShare) {
            showToast("Fitur Share tidak didukung di browser ini. Silakan gunakan Download.");
            return;
        }

        setIsSharing(true);
        try {
            const toPng = await loadToPng();
            if (document.fonts?.ready) await document.fonts.ready;
            // Render dua kali: pertama untuk 'warming up' font/image cache, kedua yang aktual
            await toPng(cardRef.current, { pixelRatio: 3, skipAutoScale: true, cacheBust: false, filter: el => !el.classList?.contains('ignore-download') });
            const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, skipAutoScale: true, cacheBust: false, filter: el => !el.classList?.contains('ignore-download') });
            const blob = await (await fetch(dataUrl)).blob();
            
            {
                if (!blob) {
                    showToast("Gagal memproses gambar.");
                    setIsSharing(false);
                    return;
                }
                const file = new File([blob], `LOGYM-${activeTemplate}-${Date.now()}.png`, { type: 'image/png' });
                
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: 'Status LOGYM Saya',
                            text: 'Cek progres latihanku di LOGYM!',
                            files: [file]
                        });
                    } catch (e) {
                        console.log("Share cancelled or failed", e);
                    }
                } else {
                    showToast("Browser tidak mendukung share gambar langsung.");
                }
                setIsSharing(false);
            }
        } catch (err) {
            console.error("Error generating image for share:", err);
            showToast("Terjadi kesalahan saat memproses gambar.");
            setIsSharing(false);
        }
    };

    const getPlanBgUrl = (planName) => {
        const defaultBg = '/bg-custom.webp';
        if (!planName) return defaultBg;
        const lowerName = planName.toLowerCase();
        if (lowerName.includes('full body')) return '/bg-full-body.webp';
        if (lowerName.includes('ppl basic')) return '/bg-ppl-basic.webp';
        if (lowerName.includes('up-low')) return '/bg-up-low.webp';
        if (lowerName.includes('bro split')) return '/bg-bro-split.webp';
        if (lowerName.includes('ppl advanced')) return '/bg-ppl-advanced.webp';
        if (lowerName.includes('beast mode')) return '/bg-beast-mode.webp';
        return defaultBg;
    };

    const getBgForTemplate = () => {
        if (bgImage) {
            let cleanUrl = bgImage;
            if (bgImage.includes('firebasestorage.googleapis.com')) {
                if (bgImage.includes('?v=')) {
                    cleanUrl = bgImage.split('?v=')[0];
                }
                return cleanUrl;
            }
            return cleanUrl;
        }
        if (activeTemplate === 'bodycomp') return '/bg-dashboard.webp';
        if (activeTemplate === 'activity') return '/bg-activity.webp';
        if (activeTemplate === 'progress') return '/bg-progress.webp';
        if (activeTemplate === 'calendar') return '/bg-calendar.webp';
        if (activeTemplate === 'radar') return '/bg-progress.webp'; // bg-radar tidak pernah ada — pakai bg progress
        if (activeTemplate.startsWith('workout_daily')) {
            const idx = parseInt(activeTemplate.replace('workout_daily_', ''), 10);
            const w = workoutsList[idx];
            if (w) {
                const prog = programs.find(p => p.id === w.programId);
                if (prog && prog.planName) return getPlanBgUrl(prog.planName);
            }
            return '/bg-custom.webp';
        }
        return '/bg-progress.webp';
    };

    const getCalendarCells = (dateStr) => {
        const d = dateStr ? new Date(dateStr) : new Date();
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay(); // Sunday = 0
        
        const cells = [];
        for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) {
            cells.push(new Date(year, month, i));
        }
        return cells;
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            
            <div className="relative mx-auto w-full max-w-[440px]">
                
                <div 
                    ref={cardRef}
                    className={`relative w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col p-5 bg-[#061626] aspect-[4/5] ${bgImage ? (isDraggingBg ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                    style={{ 
                        touchAction: bgImage ? 'none' : 'auto',
                        fontFamily: "'Inter', sans-serif"
                    }}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    onTouchCancel={handlePointerUp}
                >
                    {/* Background Layer */}
                    <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem] pointer-events-none">
                        {bgImage ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img 
                                    src={getBgForTemplate()}
                                    alt="Background"
                                    crossOrigin="anonymous"
                                    className="max-w-full max-h-full opacity-70 origin-center transition-transform"
                                    style={{
                                        transform: `translate(${bgOffset.x}px, ${bgOffset.y}px) scale(${bgZoom / 100}) rotate(${bgRotate}deg)`,
                                        transitionDuration: isDraggingBg ? '0ms' : '200ms'
                                    }}
                                />
                            </div>
                        ) : (
                            <div 
                                className="absolute inset-0 opacity-70 transition-all duration-500"
                                style={{
                                    backgroundImage: `url(${getBgForTemplate()})`,
                                    backgroundSize: activeTemplate === 'calendar' ? '115%' : activeTemplate === 'bodycomp' ? '200%' : activeTemplate === 'activity' ? '150%' : '160%',
                                    backgroundPosition: activeTemplate === 'calendar' ? '10% 80px' : activeTemplate === 'bodycomp' ? '38% 0%' : activeTemplate === 'activity' ? '65% 0%' : activeTemplate.startsWith('workout_daily') ? '25% 0%' : '60% 0%',
                                    backgroundRepeat: 'no-repeat',
                                    maskImage: (activeTemplate === 'activity' || activeTemplate === 'calendar') ? 'radial-gradient(ellipse at 50% 10%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 85%)' : 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                                    WebkitMaskImage: (activeTemplate === 'activity' || activeTemplate === 'calendar') ? 'radial-gradient(ellipse at 50% 10%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 85%)' : 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
                                }}
                            />
                        )}
                    </div>

                    {/* Logo Overlay */}
                    <div className="absolute top-4 right-4 z-20">
                        <img src="/logo-white.webp" alt="LOGYM" className="w-10 h-10 object-contain opacity-100 drop-shadow-lg" crossOrigin="anonymous"/>
                    </div>

                    <div className="relative z-10 flex-1 flex flex-col text-white">
                        
                        {/* ================= BODY COMP ================= */}
                        {activeTemplate === 'bodycomp' && (
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider mb-0.5">Komposisi Tubuh</h3>
                                    {bioDataDate && (
                                        <p className="text-[9px] text-white/70 font-bold tracking-wide uppercase">Data: {new Date(bioDataDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                    )}
                                </div>
                                
                                <div className="flex justify-between items-end w-full mb-1 flex-1 mt-1">
                                    <div className="w-[55%] flex flex-col space-y-1 justify-end h-full">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-white/70 mb-0 font-bold uppercase tracking-wider">Fisik</span>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-xl font-black text-white leading-tight">{bioData.weight || '-'} <span className="text-[8px] font-normal text-white/50">kg</span></span>
                                                <span className="text-white/30 text-[9px]">|</span>
                                                <span className="text-xl font-black text-white leading-tight">{bioData.height || '-'} <span className="text-[8px] font-normal text-white/50">cm</span></span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-white/70 mb-0 font-bold uppercase tracking-wider">BMI</span>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-xl font-black text-white leading-tight">{formatNumber(bioData.bmi) || '-'}</span>
                                                <span className={`text-[9px] font-bold ${bioData.bmiStatus === 'Normal' ? 'text-emerald-500' : bioData.bmiStatus === 'Overweight' ? 'text-amber-400' : bioData.bmiStatus === 'Obese' ? 'text-rose-500' : 'text-blue-400'}`}>{bioData.bmiStatus}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-white/70 mb-0 font-bold uppercase tracking-wider">Body Fat</span>
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-xl font-black text-white leading-tight">{formatNumber(bioData.bodyFat) || '-'} <span className="text-[8px] font-normal text-white/50">%</span></span>
                                                <span className={`text-[9px] font-bold ${bioData.bodyFatStatus === 'Normal' ? 'text-emerald-500' : bioData.bodyFatStatus === 'Overfat' ? 'text-amber-400' : bioData.bodyFatStatus === 'Obese' ? 'text-rose-500' : 'text-blue-400'}`}>{bioData.bodyFatStatus}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-white/70 mb-0 font-bold uppercase tracking-wider">BMR</span>
                                            <div>
                                                <span className="text-xl font-black text-white leading-tight">{formatNumber(bioData.bmr) || '-'} <span className="text-[8px] font-normal text-white/50">kcal</span></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-[40%] flex justify-end items-center mt-4">
                                        <div className="relative w-[75px] h-[75px] rounded-full border-[5px] border-[#3b82f6]/30 flex flex-col items-center justify-center bg-[#061626]/80 shadow-[0_0_15px_rgba(65,117,155,0.3)]">
                                            <span className={`text-2xl font-black leading-tight ${scoreStyle.replace('border-', 'text-')}`}>{formatNumber(bioData.bodyScore) || '-'}</span>
                                            <span className="text-[7px] font-black tracking-widest text-[#3b82f6] mt-[-2px]">SCORE</span>
                                            {/* decorative arc */}
                                            <div className={`absolute inset-[-5px] rounded-full border-[5px] border-transparent ${scoreStyle.replace('border-', 'border-t-').replace('border-', 'border-r-')} transform rotate-45`}></div>
                                        </div>
                                    </div>
                                </div>
                        
                                <div className="grid grid-cols-4 gap-1.5 mt-1">
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{bioData.muscleMass || '-'} <span className="text-[8px] font-normal text-white/50">kg</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Massa<br/>Otot</span></div>
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{formatNumber(bioData.musclePercent) || '-'} <span className="text-[8px] font-normal text-white/50">%</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Kadar<br/>Otot</span></div>
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{formatNumber(bioData.proteinPercent) || '-'} <span className="text-[8px] font-normal text-white/50">%</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Kadar<br/>Protein</span></div>
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{formatNumber(bioData.waterPercent) || '-'} <span className="text-[8px] font-normal text-white/50">%</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Kadar<br/>Air</span></div>
                                    
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{formatNumber(bioData.visceralFat) || '-'}</span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Lemak<br/>Visceral</span></div>
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{bioData.waist || '-'} <span className="text-[8px] font-normal text-white/50">cm</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Lingkar<br/>Perut</span></div>
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{formatNumber(bioData.boneMass) || '-'} <span className="text-[8px] font-normal text-white/50">%</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Mineral<br/>Tulang</span></div>
                                    <div className="p-1.5 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center"><span className="text-sm font-black text-white leading-tight">{formatNumber(bioData.bodyAge) || '-'} <span className="text-[8px] font-normal text-white/50">th</span></span><span className="text-[8px] font-bold text-white/60 mt-0.5 leading-tight uppercase">Usia<br/>Tubuh</span></div>
                                </div>
                            </div>
                        )}


                        {/* ================= ACTIVITY ================= */}
                        {activeTemplate === 'activity' && (
                            <div className="flex flex-col h-full justify-between">
                                <div className="mb-2">
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider mb-0.5">Aktivitas Harian</h3>
                                    <p className="text-[9px] text-white/70 font-bold tracking-wide uppercase">Hari ini: {new Date(todayStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                </div>

                                <div className="flex flex-col flex-1 justify-between pt-0">
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 h-full content-between">
                                        
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center space-x-1 mb-0 text-emerald-400"><Footprints size={12}/> <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Langkah</span></div>
                                            <div className="flex flex-col flex-1 justify-end">
                                                <div className="flex items-baseline space-x-1 mb-1">
                                                    <span className="text-2xl font-black text-white leading-tight">{formatNumber(bioData.steps) || '0'}</span>
                                                    <span className="text-[9px] text-white/50 font-bold">/ {formatNumber(activityTargets?.steps || 10000)}</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, (Number(bioData.steps || 0) / (activityTargets?.steps || 10000)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col h-full text-right items-end">
                                            <div className="flex items-center justify-end space-x-1 mb-0 text-blue-400"><span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Durasi</span> <Clock size={12}/></div>
                                            <div className="flex flex-col flex-1 justify-end w-full">
                                                <div className="flex items-baseline justify-end space-x-1 mb-1">
                                                    <span className="text-2xl font-black text-white leading-tight">{formatNumber(mergedDailyActiveMinutes) || '0'}</span>
                                                    <span className="text-[9px] text-white/50 font-bold">/ {formatNumber(activityTargets?.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 5) : 30)}</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex justify-end">
                                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (mergedDailyActiveMinutes / (activityTargets?.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 5) : 30)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center space-x-1 mb-0 text-orange-400"><Utensils size={12}/> <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">K. Makan</span></div>
                                            <div className="flex flex-col flex-1 justify-end">
                                                <div className="flex items-baseline space-x-1 mb-1">
                                                    <span className="text-2xl font-black text-white leading-tight">{formatNumber(bioData.nutritionCalories) || '0'}</span>
                                                    <span className="text-[9px] text-white/50 font-bold">/ {formatNumber(Math.max(0, (activityTargets?.activityCalories || 2000) + (activityTargets?.calorieDelta || 0)))}</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (Number(bioData.nutritionCalories || 0) / Math.max(1, (activityTargets?.activityCalories || 2000) + (activityTargets?.calorieDelta || 0))) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-full text-right items-end">
                                            <div className="flex items-center justify-end space-x-1 mb-0 text-rose-500"><Flame size={12}/> <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">K. Bakar</span></div>
                                            <div className="flex flex-col flex-1 justify-end w-full">
                                                <div className="flex items-baseline justify-end space-x-1 mb-1">
                                                    <span className="text-2xl font-black text-white leading-tight">{formatNumber(mergedDailyCalories) || '0'}</span>
                                                    <span className="text-[9px] text-white/50 font-bold">/ {formatNumber(activityTargets?.activityCalories || 2000)}</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex justify-end">
                                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (Number(mergedDailyCalories || 0) / (activityTargets?.activityCalories || 2000)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center space-x-1 mb-0 text-indigo-400"><Moon size={12}/> <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Tidur</span></div>
                                            <div className="flex flex-col flex-1 justify-end">
                                                <div className="flex items-baseline space-x-1 mb-1">
                                                    <span className="text-2xl font-black text-white leading-tight">{bioData.sleep || '0h 0m'}</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, (parseSleepHours(bioData.sleep) / (activityTargets?.sleep || 8)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-full text-right items-end">
                                            <div className="flex items-center justify-end space-x-1 mb-0 text-amber-400"><Zap size={12}/> <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Energi</span></div>
                                            <div className="flex flex-col flex-1 justify-end w-full">
                                                <div className="flex items-baseline justify-end space-x-1 mb-1">
                                                    <span className="text-2xl font-black text-white leading-tight">{formatNumber(bioData.energyScore) || '-'}</span>
                                                    <span className="text-[9px] text-white/50 font-bold">/ 100</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex justify-end">
                                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, Number(bioData.energyScore || 0))}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-2 grid grid-cols-3 gap-x-2 pt-2 border-t border-white/10">
                                            <div className="flex flex-col">
                                                <div className="flex items-center space-x-1 mb-0.5 text-sky-400"><Activity size={10}/> <span className="text-[8px] text-white/70 uppercase font-bold tracking-widest">Tensi</span></div>
                                                <span className="text-lg font-black text-white leading-tight">{bioData.bloodPressure || '-'}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center space-x-1 mb-0.5 text-sky-400"><HeartPulse size={10}/> <span className="text-[8px] text-white/70 uppercase font-bold tracking-widest">Detak</span></div>
                                                <span className="text-lg font-black text-white leading-tight">{formatNumber(bioData.heartRate) || '-'} <span className="text-[8px] font-normal text-white/50">bpm</span></span>
                                            </div>
                                            <div className="flex flex-col items-end text-right">
                                                <div className="flex items-center space-x-1 mb-0.5 text-sky-400"><Wind size={10}/> <span className="text-[8px] text-white/70 uppercase font-bold tracking-widest">SpO2</span></div>
                                                <span className="text-lg font-black text-white leading-tight">{formatNumber(bioData.oxygenSaturation) || '-'} <span className="text-[8px] font-normal text-white/50">%</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ================= CALENDAR ================= */}
                        {activeTemplate === 'calendar' && (() => {
                            const refDate = workoutDate ? new Date(workoutDate) : new Date();
                            const cells = getCalendarCells(refDate);
                            
                            let monthCalories = 0;
                            let monthDuration = 0;

                            cells.forEach(dateObj => {
                                if (!dateObj) return;
                                const dKey = getLocalYMD(dateObj);
                                const dayData = history?.[dKey] || {};
                                const workouts = dayData.workouts || [];
                                const completed = workouts.filter(w => w.status === 'completed' || w.timestamp || (w.log && Object.keys(w.log).length > 0));
                                
                                completed.forEach(w => {
                                     const dur = parseWorkoutDurationMinutes(w.duration) || 0;
                                     monthDuration += dur;
                                     monthCalories += calculateWorkoutCalories(userProfile?.weight, dur) || 0;
                                });
                            });

                            return (
                                <div className="flex flex-col h-full justify-between">
                                    <div className="mb-2">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-0.5">Aktivitas Bulanan</h3>
                                        <p className="text-[10px] text-white/70 font-bold tracking-wide uppercase">{refDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                                    </div>

                                    <div className="flex gap-6 mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-white/60 uppercase mb-0.5">Total Kalori</span>
                                            <span className="text-base font-black text-white">{formatNumber(monthCalories)} <span className="text-[10px] font-normal text-white/50">kcal</span></span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-white/60 uppercase mb-0.5">Durasi Total</span>
                                            <span className="text-base font-black text-white">{Math.floor(monthDuration / 60)}j {monthDuration % 60}m</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center bg-black/20 rounded-xl p-3 border border-white/5">
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                                <div key={i} className="text-center text-[9px] font-bold uppercase text-white/50">{day}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-y-1 gap-x-1" style={{ gridAutoRows: '48px' }}>
                                            {cells.map((dateObj, idx) => {
                                                if (!dateObj) return <div key={`blank-${idx}`} />;
                                                const dateKey = getLocalYMD(dateObj);
                                                const day = dateObj.getDate();
                                                const dayData = history?.[dateKey] || {};
                                                const workouts = dayData.workouts || [];
                                                const totalSteps = parseInt(dayData.bioData?.steps) || 0;
                                                const hasActivity = workouts.length > 0 || totalSteps > 0;
                                                
                                                let ringRender = null;
                                                if (hasActivity) {
                                                    const completed = workouts.filter(w => w.status === 'completed' || w.timestamp || (w.log && Object.keys(w.log).length > 0));
                                                    let totalDuration = 0;
                                                    let totalCalories = 0;
                                                    completed.forEach(w => {
                                                        const dur = parseWorkoutDurationMinutes(w.duration) || 0;
                                                        totalDuration += dur;
                                                        totalCalories += calculateWorkoutCalories(userProfile?.weight, dur) || 0;
                                                    });
                                                    
                                                    const targetDuration = activityTargets?.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 7) : 45;
                                                    const targetCalories = activityTargets?.calories || 400;
                                                    const targetSteps = activityTargets?.steps || 10000;

                                                    ringRender = (
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                            <ActivityRings 
                                                                calories={totalCalories} calorieTarget={targetCalories}
                                                                duration={totalDuration} durationTarget={targetDuration}
                                                                steps={totalSteps} stepTarget={targetSteps}
                                                                size={40} strokeWidth={3.5} gap={1} 
                                                            />
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={dateKey} className="relative flex flex-col items-center justify-center w-full h-full">
                                                        {ringRender}
                                                        <span className="text-[10px] font-bold text-white/90 z-10">{day}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between mt-4 px-2 mb-2">
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></div><span className="text-[9px] font-bold text-white/60">Kalori</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div><span className="text-[9px] font-bold text-white/60">Latihan</span></div>
                                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div><span className="text-[9px] font-bold text-white/60">Langkah</span></div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ================= PROGRESS ================= */}
                        {activeTemplate === 'progress' && (
                            <div className="flex flex-col h-full flex-1 justify-between">
                                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Progres Latihan</h3>
                                <div className="mt-auto -mx-5 -mb-5 bg-[#061626]/40 backdrop-blur-md rounded-t-[45px] pt-4 relative z-10 border-t border-white/10 overflow-visible">
                                    <div className="absolute inset-0 pointer-events-none rounded-t-[45px]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)' }} />
                                    <div className="relative z-10 p-3 pb-2">
                                        <div className="share-card-progress pointer-events-none mt-[-20px] mx-[-10px]">
                                            <ProgressTab 
                                                t={{...t, textMain: 'text-white', textMuted: 'text-white/60', border: 'border-white/10', bgBox: 'bg-white/5', bgAccent: 'bg-white/20', btnBg: 'bg-white/5'}} 
                                                lang={lang || {}}
                                                language={language}
                                                theme="dark" 
                                                history={history} 
                                                programs={programs}
                                                exerciseLibrary={exerciseLibrary}
                                                soundEnabled={soundEnabled}
                                                playSoundEffect={playSoundEffect}
                                                selectedDate={selectedDate}
                                                unitSystem={units}
                                                activePlanIds={activePlanIds}
                                                isSubCard={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ================= DAILY WORKOUT ================= */}
                        {activeTemplate.startsWith('workout_daily') && (
                            <div className="flex flex-col h-full flex-1 relative z-10">
                                {latestWorkout ? (
                                    <React.Fragment>
                                        <div className="flex flex-col w-full relative z-20">
                                            {/* HEADER & STATS */}
                                            <div className="w-[50%] mb-2 flex flex-col items-start">
                                                <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-1 flex flex-wrap items-center gap-1.5">
                                                    {formatDateWithDay(latestWorkoutDate, language)}
                                                    {workoutsList.length > 1 && (
                                                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] whitespace-nowrap">Sesi {safeSessionIndex + 1}/{workoutsList.length}</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-0.5">
                                                    {programs?.find(p => p.id === latestWorkout.programId)?.planName || programs?.find(p => p.id === latestWorkout.programId)?.name || 'Workout Selesai'}
                                                </div>
                                                <h3 className="text-xl font-black text-white leading-tight uppercase mb-2">
                                                    {latestWorkout.programName || programs?.find(p => p.id === latestWorkout.programId)?.name || 'Custom Routine'}
                                                </h3>
                                            </div>
                                            
                                            {/* MINI STATS */}
                                            <div className="w-[55%] flex flex-col gap-1.5 mb-2">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded border border-white/10">
                                                        <Clock size={12} className="text-sky-400" />
                                                        <span className="text-[9px] font-black text-white">{getWorkoutDurationMins(latestWorkout)} m</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded border border-white/10">
                                                        <Flame size={12} className="text-orange-400" />
                                                        <span className="text-[9px] font-black text-white">{calculateWorkoutCalories(bioData.weight, getWorkoutDurationMins(latestWorkout))} kcal</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded border border-white/10">
                                                        <Dumbbell size={12} className="text-amber-400" />
                                                        <span className="text-[9px] font-black text-white">{formatNumber(getWorkoutVolume(latestWorkout))} kg</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* EXERCISES LIST COMPACT */}
                                            <div className="w-[40%] mb-2">
                                                {(() => {
                                                    const exNames = (latestWorkout.overriddenExercises || programs?.find(p => p.id === latestWorkout.programId)?.exercises || []).map(ex => ex.name).join(' • ');
                                                    const len = exNames.length;
                                                    let fontSize = 'text-[10px]';
                                                    if (len < 50) fontSize = 'text-xs';
                                                    else if (len > 100) fontSize = 'text-[9px]';
                                                    return (
                                                        <p className={`${fontSize} text-white/80 font-medium leading-tight`}>
                                                            {exNames}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* RADAR CHART (LOCKED TO BOTTOM) */}
                                        <div className="absolute bottom-[-35px] left-[-20px] right-[-20px] bg-[#061626]/30 backdrop-blur-sm rounded-[45px] pt-2 z-10 border-t border-white/10 overflow-hidden flex flex-col h-[140px]">
                                            <div className="absolute inset-0 pointer-events-none rounded-[45px]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)' }} />
                                            <div className="relative z-10 h-full p-2 flex items-center justify-center">
                                                <div className="share-card-radar pointer-events-none w-full transform scale-[0.75] origin-center mt-[10px]">
                                                    <MuscleProgress 
                                                        history={{ [latestWorkoutDate]: { workouts: [simulatedWorkout] } }}
                                                        programs={programs}
                                                        exerciseLibrary={exerciseLibrary}
                                                        t={{...t, textMain: 'text-white', textMuted: 'text-white/60', border: 'border-white/10', bgBox: 'bg-white/5', bgAccent: 'bg-white/20', btnBg: 'bg-white/5'}} 
                                                        lang={lang || {}}
                                                        theme="dark"
                                                        soundEnabled={soundEnabled}
                                                        playSoundEffect={playSoundEffect}
                                                        isSubCard={true}
                                                        forceViewMode="radar"
                                                        disableChartAnimation={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        <Activity size={48} className="text-white/20 mb-4" />
                                        <h3 className="text-lg font-black text-white mb-2">Belum Ada Workout</h3>
                                        <p className="text-sm text-white/60">Selesaikan minimal 1 sesi latihan untuk bisa membagikan kartu ini.</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                {/* Overlays / Buttons */}
                {/* Removed top right camera overlay */}
            </div>

            {/* Navigation and Custom Background Text */}
            <div className="flex items-center justify-between mt-3 mb-2 w-full max-w-[440px] mx-auto px-1 relative">
                <button 
                    onClick={prevTemplate} 
                    className={`p-2 shrink-0 rounded-full bg-black/10 dark:bg-white/5 shadow-xl border border-black/10 dark:border-white/10 hover:opacity-80 transition-all text-zinc-600 dark:text-zinc-300`}
                >
                    <ChevronLeft size={20} />
                </button>

                {bgImage ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-2 overflow-hidden">
                        <span className="text-[10px] text-white/50 mb-1 w-full leading-snug">geser, zoom, dan rotate biar makin cakep! ✨</span>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-[9px] text-white/40">kuota ganti foto harian {user?.cardBgUploads?.date === getLocalYMD(new Date()) ? user.cardBgUploads.count : 0}/5</span>
                            {(bgZoom !== 100 || bgOffset.x !== 0 || bgOffset.y !== 0 || bgRotate !== 0) && (
                                <React.Fragment>
                                    <span className="text-white/20 text-[9px]">•</span>
                                    <button 
                                        onClick={() => { 
                                            setBgZoom(100); setBgOffset({x:0, y:0}); setBgRotate(0); playSoundEffect('click', soundEnabled); 
                                        }} 
                                        className="text-[9px] text-sky-400/80 hover:text-sky-400 underline transition-colors"
                                    >
                                        Reset Posisi
                                    </button>
                                </React.Fragment>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-2">
                        <span className="text-[10px] text-white/50">Geser untuk melihat template lain</span>
                    </div>
                )}

                <button 
                    onClick={nextTemplate} 
                    className={`p-2 shrink-0 rounded-full bg-black/10 dark:bg-white/5 shadow-xl border border-black/10 dark:border-white/10 hover:opacity-80 transition-all text-zinc-600 dark:text-zinc-300`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center w-full max-w-[440px] mx-auto space-x-2 pt-2">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex shrink-0 items-center justify-center p-3 rounded-2xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/20 dark:hover:bg-white/10 transition-all text-zinc-600 dark:text-zinc-300 shadow-sm"
                    title="Buka Kamera"
                >
                    {isUploadingBg ? <Loader2 className="animate-spin" size={20}/> : <Camera size={20}/>}
                </button>
                <button 
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex shrink-0 items-center justify-center p-3 rounded-2xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/20 dark:hover:bg-white/10 transition-all text-zinc-600 dark:text-zinc-300 shadow-sm"
                    title="Pilih dari Galeri"
                >
                    {isUploadingBg ? <Loader2 className="animate-spin" size={20}/> : <Image size={20}/>}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleBackgroundChange} accept="image/*" capture="environment" className="hidden" />
                <input type="file" ref={galleryInputRef} onChange={handleBackgroundChange} accept="image/*" className="hidden" />

                {bgImage && (
                    <button 
                        onClick={handleDeleteBackground}
                        disabled={isUploadingBg}
                        className="flex shrink-0 items-center justify-center p-3 rounded-2xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-rose-500/20 dark:hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/30 transition-all text-zinc-600 dark:text-zinc-300 shadow-sm"
                        title="Hapus Background"
                    >
                        {isUploadingBg ? <Loader2 className="animate-spin" size={20}/> : <Trash2 size={20}/>}
                    </button>
                )}

                <button 
                    onClick={handleDownload}
                    disabled={isGenerating || isSharing}
                    className="flex shrink-0 items-center justify-center p-3 rounded-2xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/20 dark:hover:bg-white/10 transition-all text-zinc-600 dark:text-zinc-300 shadow-sm disabled:opacity-50"
                    title="Download/Simpan Gambar"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Download size={20}/>}
                </button>
                <button 
                    onClick={handleShareToCommunity}
                    disabled={isGenerating || isSharing}
                    className="flex shrink-0 items-center justify-center p-3 rounded-2xl bg-[#3b82f6] text-white font-black shadow-xl hover:shadow-[#3b82f6]/30 transition-all active:scale-95 disabled:opacity-50"
                    title="Bagikan ke Komunitas LOGYM"
                >
                    {isSharing ? <Loader2 className="animate-spin" size={20}/> : <img src="/logo-white.webp" alt="LOGYM" className="w-6 h-6 object-contain" />}
                </button>
                <button 
                    onClick={handleShare}
                    disabled={isGenerating || isSharing}
                    className="flex-1 flex shrink-0 items-center justify-center p-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-black shadow-xl hover:shadow-sky-500/30 transition-all active:scale-95 disabled:opacity-50"
                    title="Bagikan"
                >
                    {isSharing ? <Loader2 className="animate-spin" size={20}/> : <Share2 size={20}/>}
                </button>
            </div>
            {/* Toast Notification */}
            {toastMsg && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-rose-500/90 text-white text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl border border-rose-400/50 animate-in zoom-in-95 fade-in duration-300 max-w-[80vw] text-center backdrop-blur-sm">
                    {toastMsg}
                </div>
            )}

            {/* Create Post Modal (Staging Area) */}
            {pendingShareFiles && (
                <CreatePostModal 
                    user={user} 
                    theme={theme} 
                    initialFiles={pendingShareFiles} 
                    postDataOverrides={pendingWorkoutData}
                    onClose={(success, newPostId) => {
                        setPendingShareFiles(null);
                        if (success) {
                            showToast("Berhasil dibagikan ke komunitas!");
                            if (onPostCreated) onPostCreated(newPostId);
                        }
                    }} 
                />
            )}
        </div>
    );
}
