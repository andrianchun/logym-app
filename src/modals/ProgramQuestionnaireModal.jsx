import React, { useState, useEffect } from 'react';
import { Target, Activity, Calendar, Dumbbell, Clock, ChevronRight, ChevronLeft, Sparkles, X, CheckCircle2, User, Ruler, Smartphone, Heart, Check } from 'lucide-react';
import { PROGRAM_PLANS } from '../data/programTemplates';
import { playSoundEffect } from '../utils/audio';
import { checkOverallAIStatus, buildSystemPrompt, chatWithAI, generateDeterministicProgram } from '../utils/aiAgent';
import ScrollPicker from '../components/ScrollPicker';
import useDialog from '../hooks/useDialog';
import GymManagerModal from '../components/GymManagerModal';
import { getPlanBgConfig } from '../utils/planBg';
import { calcBMR, ACTIVITY_MULTIPLIERS } from '../utils/bmr';

const ProgramQuestionnaireModal = ({ isOpen, onClose, onComplete, t, lang, soundEnabled, gymProfiles, setGymProfiles, activeGymId, setActiveGymId, exerciseLibrary, units, user, userProfile, userApiKeys, keyStatuses, setKeyStatuses, setShowSettings }) => {
  const [step, setStep] = useState(0);
  const [connectedHealthApps, setConnectedHealthApps] = useState([]);
  const aiStatus = checkOverallAIStatus(userApiKeys, keyStatuses);
  const isAiReady = aiStatus === 'ready';
  
  const isValidAge = (dob) => {
      if (!dob) return false;
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age >= 13;
  };

  const [answers, setAnswers] = useState({
    name: userProfile?.name || user?.name?.split(' ')[0] || '',
    gender: userProfile?.gender || null,
    dob: userProfile?.dob || '',
    height: userProfile?.height || 170,
    heightFt: 5,
    heightIn: 7,
    weight: userProfile?.weight || 70,
    targetWeight: userProfile?.targetWeight || 65,
    injuries: userProfile?.injuries || [],
    goal: userProfile?.goal || null,
    experience: userProfile?.experience || null,
    activityLevel: userProfile?.activityLevel || null,
    days: [],
    equipment: null,
    duration: null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState(null);
  const [showGymManager, setShowGymManager] = useState(false);

  useEffect(() => {
    // Broadcast for Lomeal mock sync via localhost cookies
    document.cookie = `shared_profile=${encodeURIComponent(JSON.stringify(answers))}; path=/; max-age=3600`;
  }, [answers]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return answers.gender && isValidAge(answers.dob) && answers.name?.trim().length > 0;
    if (step === 2) {
      const isHeightValid = isImpHeight ? (answers.heightFt && answers.heightIn) : answers.height;
      return isHeightValid && answers.weight && answers.targetWeight;
    }
    // step 8 is injuries (optional)
    if (step === 8) return true;
    if (step === 6) return answers.days.length > 0;
    
    if (step >= 3 && step <= 9 && step !== 6 && step !== 8) {
      const currentStep = steps[step];
      const key = currentStep.key;
      return !!answers[key];
    }
    return false;
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isRightSwipe && step > 0) {
      handleBack();
    } else if (isLeftSwipe && step < 8 && canProceed()) {
      playSoundEffect('click', soundEnabled);
      setStep(step + 1);
    } else if (isLeftSwipe && step === 8 && canProceed()) {
      // Final step -> generate
      generateProgram(answers);
    }
  };

  const isDark = t.bgCard !== 'bg-white';
  const { dialog, showConfirm, showAlert } = useDialog(isDark, t.bgCard);
  const isImp = units?.weight === 'lbs';
  const isImpHeight = units?.height === 'ft';

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setConnectedHealthApps([]);
      setAnswers({ 
          name: userProfile?.name || user?.name?.split(' ')[0] || '', 
          gender: userProfile?.gender || null, 
          dob: userProfile?.dob || '', 
          height: userProfile?.height || 170, 
          heightFt: 5, 
          heightIn: 7, 
          weight: userProfile?.weight || (isImp ? 150 : 70), 
          targetWeight: userProfile?.targetWeight || (isImp ? 140 : 65), 
          goal: userProfile?.goal || null, 
          experience: userProfile?.experience || null, 
          activityLevel: userProfile?.activityLevel || null, 
          days: [], 
          equipment: null, 
          duration: null 
      });
      setIsGenerating(false);
      setRecommendedPlan(null);
    }
  }, [isOpen]);

  const handleCloseClick = async () => {
    playSoundEffect('click', soundEnabled);
    if (step < 8) {
      const confirm = await showConfirm('Apakah kamu yakin ingin melewati analisis sekarang?', {
        title: 'Keluar Kuesioner',
        confirmText: 'Lewati',
        cancelText: 'Lanjutkan',
        danger: true
      });
      if (confirm) {
        onClose();
      }
    } else {
      onClose(); // Allow closing without confirm if we are at the end
    }
  };

  if (!isOpen) return null;

  const handleHealthSync = async (provider) => {
      playSoundEffect('click', soundEnabled);
      // Mock Native Sync for PWA
      await showAlert(`Berhasil sinkronisasi dengan ${provider}! (Data simulasi). Pada versi Native/App Store, ini akan menarik data kalori harian, langkah, rekam medis, dll secara otomatis.`, { title: 'Tersinkronisasi', type: 'success' });
      
      setConnectedHealthApps(prev => prev.includes(provider) ? prev : [...prev, provider]);
      
      setAnswers(prev => ({
          ...prev,
          height: 175,
          weight: 72,
          dob: '1995-03-24',
          gender: 'male',
          name: prev.name || 'Logi'
      }));
  };

  const handleNext = (key, value) => {
    playSoundEffect('click', soundEnabled);
    if (key === 'equipment' && value === 'ADD_NEW_GYM') {
      setShowGymManager(true);
      return;
    }

    setAnswers(prev => ({ ...prev, [key]: value }));
    
    if (step < 8) {
      setStep(step + 1);
    } else {
      generateProgram({ ...answers, [key]: value });
    }
  };

  const handleBack = () => {
    playSoundEffect('click', soundEnabled);
    if (step > 0) setStep(step - 1);
  };

  const generateProgram = async (finalAnswers) => {
    if (isGenerating) return;

    setIsGenerating(true);
    setStep(9); 
    playSoundEffect('success', soundEnabled);

    const targetGymProfileId = (finalAnswers.equipment && finalAnswers.equipment !== 'ADD_NEW_GYM') ? finalAnswers.equipment : activeGymId;
    const targetGym = gymProfiles.find(g => g.id === targetGymProfileId) || gymProfiles[0];

    // Kita tidak langsung pakai algoritma standar di awal agar selalu memberi AI kesempatan
    // (karena ada fallback ke backend proxy). Jika backend juga gagal, kita tangkap di catch block.
    
    try {
      const exLibStr = exerciseLibrary.map(ex => ex.name).join(', ');

      const systemPrompt = buildSystemPrompt(finalAnswers, exLibStr);
      
      const userPrompt = `Buatkan saya program latihan yang optimal. 
Tujuan saya: ${finalAnswers.goal}. 
Pengalaman saya: ${finalAnswers.experience}.
Level aktivitas harian: ${finalAnswers.activityLevel}.
Hari yang saya bisa latihan: ${finalAnswers.days.length} hari per minggu (${finalAnswers.days.join(', ')}).
Durasi per sesi yang saya inginkan: ${finalAnswers.duration}.
Peralatan yang tersedia (dari Gym Profile): ${targetGym.equipment === 'all' ? 'Lengkap (Semua alat ada)' : targetGym.equipment === 'bodyweight' ? 'Hanya beban tubuh' : targetGym.equipment === 'dumbbells' ? 'Dumbbells saja' : 'Campuran'}.
Berat badan: ${finalAnswers.weight}kg, Tinggi: ${finalAnswers.height}cm.
Riwayat Cedera / Medis: ${finalAnswers.injuries?.length > 0 ? finalAnswers.injuries.join(', ') : 'Tidak ada'}. SANGAT PENTING: JANGAN BERIKAN latihan yang membahayakan kondisi cedera ini!
Tolong buatkan program dengan format JSON sesuai aturan <program_proposal>.`;

      const apiMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
      ];

      // Add 45-second timeout
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Waktu tunggu habis (Timeout). AI terlalu lama merespons.')), 45000)
      );

      const reply = await Promise.race([
          chatWithAI(apiMessages, currentProvider, aiModel, userApiKeys),
          timeoutPromise
      ]);

      // Extract JSON
      const tagStart = '<program_proposal>';
      const tagEnd = '</program_proposal>';
      let jsonPart = null;

      if (reply.includes(tagStart) && reply.includes(tagEnd)) {
          const startIndex = reply.indexOf(tagStart) + tagStart.length;
          const endIndex = reply.indexOf(tagEnd);
          const jsonStr = reply.substring(startIndex, endIndex).trim();
          jsonPart = JSON.parse(jsonStr);
      } else {
          throw new Error('AI tidak memberikan format JSON yang valid.');
      }

      // Format exercises properly matching local DB
      const routines = (jsonPart.routines || []).map((r, i) => {
          const exercises = (r.exercises || []).map(ex => {
              const matchedEx = exerciseLibrary.find(e => e.name.toLowerCase() === ex.name.toLowerCase()) || exerciseLibrary[0];
              return {
                  id: matchedEx.id,
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
              name: r.name || `Day ${i+1}`,
              exercises: exercises,
              restTime: 90
          };
      });

      setRecommendedPlan({
        planId: `plan_ai_quest_${Date.now()}`,
        name: jsonPart.planName || 'AI Custom Program',
        description: jsonPart.description || `Disusun dinamis berdasarkan profil, target otot, level, dan ketersediaan alat kamu.`,
        goal: [finalAnswers.goal],
        experience: [finalAnswers.experience],
        daysPerWeek: jsonPart.daysPerWeek || finalAnswers.days.length,
        routines: routines
      });

      setIsGenerating(false);
      setStep(10);
    } catch (e) {
      console.error(e);
      if (e.message.includes('quota') || e.message.includes('RATE_LIMIT') || e.message.includes('Semua jalur AI gagal') || e.message.includes('terlalu banyak permintaan')) {
          const deterministicPlan = generateDeterministicProgram(finalAnswers, userProfile, exerciseLibrary, PROGRAM_PLANS, targetGym);
          if (deterministicPlan) {
              await showConfirm('Server AI penuh/limit. Kami telah membuatkan program menggunakan algoritma standar sebagai gantinya.', { title: 'AI Sibuk', hideCancel: true });
              setRecommendedPlan({
                 ...deterministicPlan,
                 name: deterministicPlan.name,
                 description: deterministicPlan.description
              });
              setStep(10);
              setIsGenerating(false);
              return;
          }
      }
      await showConfirm(e.message || 'Terjadi kesalahan saat membuat program. Coba lagi?', { title: 'Gagal' });
      setStep(8);
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    playSoundEffect('success', soundEnabled);
    const finalWeight = isImp ? Number((answers.weight / 2.20462).toFixed(1)) : Number(answers.weight);
    const finalTargetWeight = isImp ? Number((answers.targetWeight / 2.20462).toFixed(1)) : Number(answers.targetWeight);
    const finalHeight = isImpHeight ? Math.round((Number(answers.heightFt) * 12 + Number(answers.heightIn)) * 2.54) : Number(answers.height);
    
    // Hitung BMR & TDEE
    const age = answers.dob ? (new Date().getFullYear() - new Date(answers.dob).getFullYear()) : 25;
    const bmr = calcBMR({ weight: finalWeight, height: finalHeight, age, gender: answers.gender });

    // Hitung BMI
    const hMeter = finalHeight / 100;
    const bmi = Number((finalWeight / (hMeter * hMeter)).toFixed(1));

    const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[answers.activityLevel] || 1.2));
    
    let calorieDelta = 0;
    if (answers.goal === 'fat_loss') calorieDelta = -500;
    else if (answers.goal === 'muscle_gain') calorieDelta = 300;

    onComplete({ 
        ...recommendedPlan, 
        gymProfileId: answers.equipment,
        biometrics: {
            name: answers.name,
            gender: answers.gender,
            dob: answers.dob,
            height: finalHeight,
            weight: finalWeight,
            targetWeight: finalTargetWeight,
            activityLevel: answers.activityLevel,
            bmi: bmi,
            bmr: bmr
        },
        calculatedTargets: {
            activityCalories: tdee,
            tdee: tdee,
            calorieDelta: calorieDelta,
            nutritionGoal: answers.goal === 'fat_loss' ? 'cutting' : (answers.goal === 'muscle_gain' ? 'clean_bulk' : 'maintenance')
        }
    });
    onClose();
  };

  // --- STEPS CONFIGURATION ---
  const steps = [
    {
      // Step 0: Sync Option
      title: "Sinkronisasi Data Kesehatan",
      key: 'sync',
      icon: <Smartphone className={`${t.textAccent} mb-4`} size={40} />
    },
    {
      // Step 1: Gender & DOB
      title: "Identitas Diri",
      key: 'identity',
      icon: <User className={`${t.textAccent} mb-4`} size={40} />
    },
    {
      // Step 2: Biometrics
      title: "Data Fisik",
      key: 'biometrics',
      icon: <Ruler className={`${t.textAccent} mb-4`} size={40} />
    },
    {
      title: "Bagaimana tingkat aktivitas harianmu di luar olahraga?",
      key: 'activityLevel',
      icon: <Activity className={`${t.textAccent} mb-4`} size={40} />,
      options: [
        { id: 'sedentary', label: 'Sangat Jarang Bergerak', desc: 'Pekerja kantoran, rebahan, banyak duduk.' },
        { id: 'light', label: 'Jarang Bergerak', desc: 'Kasir, guru, banyak jalan/berdiri ringan.' },
        { id: 'moderate', label: 'Cukup Aktif', desc: 'Sering angkat barang, kurir, olahraga ringan.' },
        { id: 'active', label: 'Sangat Aktif', desc: 'Pekerja lapangan fisik, kuli bangunan, atlet.' }
      ]
    },
    {
      title: "Apa tujuan utama kamu?",
      key: 'goal',
      icon: <Target className={`${t.textAccent} mb-4`} size={40} />,
      options: [
        { id: 'muscle_gain', label: 'Membangun Otot (Hypertrophy)', desc: 'Fokus membesarkan ukuran otot.' },
        { id: 'fat_loss', label: 'Menurunkan Lemak (Cutting)', desc: 'Bakar kalori dan pertahankan otot.' },
        { id: 'strength', label: 'Menambah Kekuatan', desc: 'Fokus angkat beban lebih berat.' },
        { id: 'general', label: 'Kesehatan Umum', desc: 'Hanya ingin lebih bugar dan aktif.' }
      ]
    },
    {
      title: "Seberapa sering kamu latihan beban sebelumnya?",
      key: 'experience',
      icon: <Activity className={`${t.textAccent} mb-4`} size={40} />,
      options: [
        { id: 'beginner', label: 'Pemula', desc: 'Baru mulai atau kurang dari 6 bulan.' },
        { id: 'intermediate', label: 'Menengah', desc: 'Sudah rutin latihan 6 bulan - 2 tahun.' },
        { id: 'advanced', label: 'Mahir', desc: 'Konsisten latihan lebih dari 2 tahun.' }
      ]
    },
    {
      // Step 6 is custom (Days Selection)
      title: "Di hari apa saja kamu bisa latihan?",
      key: 'days',
      icon: <Calendar className={`${t.textAccent} mb-4`} size={40} />
    },
    {
      title: "Pilih Tempat / Peralatan Gym kamu",
      key: 'equipment',
      icon: <Dumbbell className={`${t.textAccent} mb-4`} size={40} />,
      options: [
        ...(gymProfiles || []).map(g => ({
           id: g.id,
           label: g.name,
           desc: g.equipment === 'all' ? 'Alat Lengkap' : Array.isArray(g.equipment) ? `${g.equipment.length} Jenis Alat` : 'Body Weight'
        })),
        { id: 'ADD_NEW_GYM', label: '+ Tambah Gym Baru', desc: 'Buat profil gym dengan alat kustom.' }
      ]
    },
    {
      title: "Riwayat Cedera & Medis",
      key: 'injuries',
      icon: <Heart className={`${t.textAccent} mb-4`} size={40} />
    },
    {
      title: "Berapa lama waktu latihan kamu per sesi?",
      key: 'duration',
      icon: <Clock className={`${t.textAccent} mb-4`} size={40} />,
      options: [
        { id: 'short', label: 'Singkat (< 45 Menit)', desc: 'Cocok untuk jadwal yang padat.' },
        { id: 'medium', label: 'Sedang (45 - 60 Menit)', desc: 'Durasi standar yang optimal.' },
        { id: 'long', label: 'Lama (> 60 Menit)', desc: 'Bisa melakukan banyak variasi latihan.' }
      ]
    }
  ];

  const DAYS_OF_WEEK = [
    { id: 'Sen', label: 'Senin' },
    { id: 'Sel', label: 'Selasa' },
    { id: 'Rab', label: 'Rabu' },
    { id: 'Kam', label: 'Kamis' },
    { id: 'Jum', label: 'Jumat' },
    { id: 'Sab', label: 'Sabtu' },
    { id: 'Min', label: 'Minggu' }
  ];

  const toggleDay = (dayId) => {
    playSoundEffect('swipe', soundEnabled);
    if (answers.days.includes(dayId)) {
      setAnswers(prev => ({ ...prev, days: prev.days.filter(d => d !== dayId) }));
    } else {
      setAnswers(prev => ({ ...prev, days: [...prev.days, dayId] }));
    }
  };

  const getPlanName = (count) => {
    if (count <= 2) return `Full Body`;
    if (count === 3) return `PPL Basic`;
    if (count === 4) return `Up-Low Split`;
    if (count === 5) return `Bro Split`;
    if (count === 6) return `PPL Advanced`;
    if (count === 7) return `Beast Mode`;
    return "Program Cerdas AI";
  };

  const getDynamicRecommendation = (count) => {
    if (count === 0) return "Pilih minimal 1 hari.";
    if (count <= 2) return `Kamu memilih ${count} hari. Rekomendasi: Full Body agar setiap otot tetap terlatih.`;
    if (count === 3) return `Ideal! Rekomendasi: 3-Day Full Body atau PPL Basic.`;
    if (count === 4) return `Bagus sekali! Rekomendasi: 4-Day Up-Low Split.`;
    if (count === 5) return `Sangat aktif! Rekomendasi: 5-Day Bro Split.`;
    if (count === 6) return `Hardcore! Rekomendasi: 6-Day PPL Advanced.`;
    if (count === 7) return `Beast Mode! Rekomendasi: Latihan 6 Hari + 1 Hari Pemulihan Aktif (Anti Overtraining).`;
    return "";
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in no-swipe`} role="dialog" onClick={onClose}>
      <div 
        className={`w-full h-full ${t.bgCard} overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 relative`} 
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* --- Background Image Layer --- */}
        <div 
          className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 ${step === 10 ? 'opacity-0' : 'opacity-100'}`}
          style={{
            backgroundImage: "url('/bg-program.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 40px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%)'
          }}
        />
        {/* ------------------------------ */}

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 pb-2 shrink-0 relative z-10 max-w-lg mx-auto w-full">
          <div className="w-10"></div>
          
          <div className="flex-1 text-center">
            <p className={`text-[14px] ${!isDark ? 'text-black font-medium' : `${t.textMain} font-medium`} mt-2 leading-snug max-w-[280px] mx-auto`}>
              Halo, <span className="font-black">Coach Logi</span> di sini. Aku siap bantu kamu menuju badan impian yang sehat dan kuat!
            </p>
          </div>

          <button onClick={handleCloseClick} className={`p-2 rounded-full ${t.inputBg} hover:text-rose-500 transition-colors`}>
            <X size={20}/>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col justify-end pb-8 sm:pb-12 overflow-y-auto p-6 pt-0 hide-scrollbar relative z-10">
          
          


          {/* QUESTION STEPS */}
          <div className="relative w-full max-w-lg mx-auto perspective-1000 h-[480px] sm:h-[500px]">
          {/* FLOATING NAVIGATION (< and >) */}
          {step > 0 && step < 9 && (
            <button 
              onClick={handleBack} 
              className={`absolute left-4 sm:left-6 bottom-4 sm:bottom-6 z-[150] p-3 rounded-full ${t.bgCard} shadow-lg border ${isDark ? 'border-white/10' : 'border-black/10'} hover:opacity-80 transition-all active:scale-95`}
            >
              <ChevronLeft size={24} className={t.textMain} />
            </button>
          )}

          {step < 9 && canProceed() && (
            <button 
              onClick={() => {
                if (step === 8) generateProgram(answers);
                else {
                  if (step === 0) playSoundEffect('click', soundEnabled);
                  setStep(step + 1);
                }
              }} 
              className={`absolute right-4 sm:right-6 bottom-4 sm:bottom-6 z-[150] p-3 rounded-full shadow-lg border transition-all active:scale-95 ${t.bgCard} ${isDark ? 'border-white/10' : 'border-black/10'} hover:opacity-80`}
            >
              {step === 8 ? <Check size={24} className={t.textMain} /> : <ChevronRight size={24} className={t.textMain} />}
            </button>
          )}
            {step < 9 && [0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
              const isPast = idx < step;
              const isActive = idx === step;
              const isFuture = idx > step;
              const offset = idx - step;

              if (offset > 2 || offset < -1) return null;

              return (
                <div 
                  key={idx}
                  className={`absolute inset-x-0 top-0 flex flex-col justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] p-6 sm:p-8 min-h-full rounded-[2.5rem] border ${isDark ? 'border-white/10 bg-[#12141c]/80' : 'border-black/5 bg-white/80'} backdrop-blur-2xl shadow-2xl overflow-y-auto hide-scrollbar`}
                  style={{
                    zIndex: 50 - idx,
                    transform: isPast 
                        ? 'translateX(-100%) scale(0.9) rotate(-5deg)' 
                        : `translateX(${offset * 24}px) translateY(${offset * 4}px) scale(${1 - offset * 0.05})`,
                    opacity: isPast ? 0 : 1 - (offset * 0.3),
                    pointerEvents: isActive ? 'auto' : 'none',
                    visibility: (isPast && offset < -1) ? 'hidden' : 'visible',
                    maxHeight: '100%'
                  }}
                >
                  <div className={`flex flex-col items-center text-center mb-6 shrink-0`}>
                    <h2 className={`text-xl sm:text-2xl font-black ${!isDark ? 'text-black' : t.textMain} leading-tight`}>
                      {steps[idx].title}
                    </h2>
                    {idx === 6 && <p className={`text-xs sm:text-sm font-medium mt-1 ${!isDark ? 'text-black/80' : 'text-slate-300'}`}>Pilih hari sesuai jadwal luang kamu.</p>}
                  </div>

                  

              {idx === 0 ? (
                // CUSTOM SYNC SELECTOR
                <div className="flex-1 flex flex-col pb-2 space-y-4 mt-4 overflow-y-auto hide-scrollbar">
                  <div>
                     <div className={`flex flex-col p-4 rounded-2xl border-2 transition-all ${isAiReady ? (isDark ? 'border-sky-500/50 bg-sky-500/10' : 'border-sky-500 bg-sky-50') : (isDark ? 'border-rose-500/50 bg-rose-500/10' : 'border-rose-500 bg-rose-50')}`}>
                        <div className={`font-black text-base ${!isDark ? 'text-black' : t.textMain} mb-1`}>
                            {isAiReady ? 'AI Siap Digunakan!' : 'Server AI Sedang Penuh'}
                        </div>
                        <p className={`text-xs ${!isDark ? 'text-black/60' : 'text-white/60'} leading-relaxed`}>
                            {isAiReady 
                                ? 'Program latihan Anda akan dirancang secara cerdas dan spesifik oleh AI.' 
                                : 'Aplikasi akan menggunakan algoritma standar. Jika Anda tetap ingin menggunakan AI, silakan gunakan API pribadi.'}
                        </p>
                        {!isAiReady && (
                            <button 
                                onClick={() => { if (setShowSettings) setShowSettings('lanjutan'); }} 
                                className={`mt-3 py-2 px-4 text-xs font-bold rounded-lg text-white ${t.bgAccent} active:scale-95 transition-all w-max`}
                            >
                                Buka Pengaturan API
                            </button>
                        )}
                     </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-500/20">
                     <p className={`text-xs font-bold mb-3 ${t.textMuted} text-center`}>Sinkronisasi data kesehatan (Opsional):</p>
                     <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleHealthSync('Health Connect')}
                          className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                              connectedHealthApps.includes('Health Connect')
                                  ? 'border-sky-500 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                                  : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-white hover:bg-black/5 shadow-sm'
                          }`}
                        >
                          <img src="/health-connect.webp" alt="Health Connect" className="w-8 h-8 shrink-0 rounded-[22%] object-cover" />
                          <span className={`font-black text-xs ${connectedHealthApps.includes('Health Connect') ? 'text-sky-500' : (!isDark ? 'text-black' : t.textMain)}`}>Health Connect</span>
                        </button>

                        <button
                          onClick={() => handleHealthSync('Apple Health')}
                          className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${
                              connectedHealthApps.includes('Apple Health')
                                  ? 'border-sky-500 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                                  : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-white hover:bg-black/5 shadow-sm'
                          }`}
                        >
                          <img src="/apple-health.webp" alt="Apple Health" className="w-8 h-8 shrink-0" />
                          <span className={`font-black text-xs ${connectedHealthApps.includes('Apple Health') ? 'text-sky-500' : (!isDark ? 'text-black' : t.textMain)}`}>Apple Health</span>
                        </button>
                     </div>
                  </div>
                </div>
              ) : idx === 1 ? (
                // CUSTOM GENDER & DOB & NAME
                <div className="flex flex-col pb-2 space-y-4">
                  <div>
                      <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Nama Panggilan</label>
                      <input 
                          type="text" 
                          placeholder="Siapa namamu?"
                          value={answers.name} 
                          onChange={(e) => setAnswers(prev => ({...prev, name: e.target.value}))} 
                          className={`w-full p-4 rounded-xl border-2 font-bold ${answers.name?.trim().length > 0 ? t.borderAccent : 'border-transparent'} ${t.inputBg} ${t.textMain}`}
                      />
                  </div>
                  <div>
                      <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setAnswers(prev => ({...prev, gender: 'male'}))} className={`p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${answers.gender === 'male' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="5"></circle><line x1="13.5" y1="10.5" x2="21" y2="3"></line><polyline points="16 3 21 3 21 8"></polyline></svg>
                          </button>
                          <button onClick={() => setAnswers(prev => ({...prev, gender: 'female'}))} className={`p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${answers.gender === 'female' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="5"></circle><line x1="12" y1="15" x2="12" y2="22"></line><line x1="9" y1="19" x2="15" y2="19"></line></svg>
                          </button>
                      </div>
                  </div>
                  <div className="mt-4">
                      <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Tanggal Lahir</label>
                      <input 
                          type="date" 
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                          value={answers.dob} 
                          onChange={(e) => setAnswers(prev => ({...prev, dob: e.target.value}))} 
                          style={{ colorScheme: isDark ? 'dark' : 'light' }}
                          className={`w-full p-4 rounded-xl border-2 font-bold ${answers.dob ? (isValidAge(answers.dob) ? t.borderAccent : 'border-rose-500 text-rose-500') : 'border-transparent'} ${t.inputBg} ${answers.dob && !isValidAge(answers.dob) ? '' : t.textMain}`}
                      />
                      {answers.dob && !isValidAge(answers.dob) ? (
                          <p className={`text-[11px] mt-2 text-center font-bold text-rose-500 animate-in fade-in slide-in-from-top-1`}>Usia kamu harus di atas 13 tahun untuk menggunakan LOGYM.</p>
                      ) : (
                          <p className={`text-[10px] mt-1 text-center font-bold ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>Minimal usia 13 tahun.</p>
                      )}
                  </div>
                </div>
              ) : idx === 2 ? (
                // CUSTOM BIOMETRICS
                <div className="flex flex-col pb-2 space-y-2 w-full max-w-md mx-auto">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
                      <div>
                          <label className={`text-xs sm:text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Tinggi ({units?.height || 'cm'})</label>
                          {isImpHeight ? (
                              <div className="grid grid-cols-2 gap-1 sm:gap-2 w-full">
                                  <div className="flex flex-col items-center w-full">
                                      <ScrollPicker 
                                          value={answers.heightFt} 
                                          onChange={(val) => setAnswers(prev => ({...prev, heightFt: val}))} 
                                          min={3} max={8} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
                                      />
                                      <span className={`font-bold text-[9px] sm:text-[10px] ${t.textMuted} mt-1`}>ft</span>
                                  </div>
                                  <div className="flex flex-col items-center w-full">
                                      <ScrollPicker 
                                          value={answers.heightIn} 
                                          onChange={(val) => setAnswers(prev => ({...prev, heightIn: val}))} 
                                          min={0} max={11} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
                                      />
                                      <span className={`font-bold text-[9px] sm:text-[10px] ${t.textMuted} mt-1`}>in</span>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex justify-center w-full">
                                  <ScrollPicker 
                                      value={answers.height} 
                                      onChange={(val) => setAnswers(prev => ({...prev, height: val}))} 
                                      min={100} max={250} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
                                  />
                              </div>
                          )}
                      </div>
                      <div className="w-full">
                          <label className={`text-xs sm:text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Berat ({units?.weight || 'kg'})</label>
                          <div className="flex justify-center w-full">
                              <ScrollPicker 
                                  value={answers.weight} 
                                  onChange={(val) => setAnswers(prev => ({...prev, weight: val}))} 
                                  min={isImp ? 60 : 30} max={isImp ? 400 : 200} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
                              />
                          </div>
                      </div>
                      <div className="w-full">
                          <label className={`text-xs sm:text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Target ({units?.weight || 'kg'})</label>
                          <div className="flex justify-center w-full">
                              <ScrollPicker 
                                  value={answers.targetWeight} 
                                  onChange={(val) => setAnswers(prev => ({...prev, targetWeight: val}))} 
                                  min={isImp ? 60 : 30} max={isImp ? 400 : 200} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
                              />
                          </div>
                      </div>
                  </div>
                  
                  {/* Smart BMI Display */}
                  {(() => {
                      const finalWeight = isImp ? (answers.weight / 2.20462) : answers.weight;
                      const finalTargetWeight = isImp ? (answers.targetWeight / 2.20462) : answers.targetWeight;
                      const finalHeight = isImpHeight ? ((answers.heightFt * 12 + answers.heightIn) * 2.54) : answers.height;
                      
                      const hMeter = finalHeight / 100;
                      const currentBmi = hMeter > 0 ? (finalWeight / (hMeter * hMeter)).toFixed(1) : 0;
                      const targetBmi = hMeter > 0 ? (finalTargetWeight / (hMeter * hMeter)).toFixed(1) : 0;
                      
                      const diffKg = finalTargetWeight - finalWeight;
                      const absDiff = Math.abs(diffKg).toFixed(1);
                      const weeks = Math.round(Math.abs(diffKg) / 0.5);
                      let timeString = weeks < 4 ? `${weeks} minggu` : `${Math.round(weeks/4)} bulan`;
                      
                      let insightText = '';
                      if (diffKg < -0.5) insightText = `Turun ${absDiff} kg dlm ~${timeString}`;
                      else if (diffKg > 0.5) insightText = `Naik ${absDiff} kg dlm ~${timeString}`;
                      else insightText = 'Mempertahankan berat';

                      return (
                          <div className={`mt-4 p-3 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border flex justify-between items-center text-sm`}>
                              <div className="flex flex-col">
                                <span className={`text-[10px] ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>BMI Kamu</span>
                                <span className={`font-bold ${!isDark ? 'text-black' : t.textMain}`}>{currentBmi}</span>
                              </div>
                              <div className="flex flex-col items-center px-2">
                                <span className={`font-bold ${t.textAccent} text-[11px] bg-black/5 dark:bg-white/10 px-2 py-1 rounded-full whitespace-nowrap`}>{insightText}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className={`text-[10px] ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>Target BMI</span>
                                <span className={`font-bold ${!isDark ? 'text-black' : t.textMain}`}>{targetBmi}</span>
                              </div>
                          </div>
                      );
                  })()}
                </div>
              ) : idx === 8 ? (
                // CUSTOM INJURIES SELECTOR
                <div className="w-full flex flex-col gap-4 pb-2 h-[45vh] overflow-y-auto hide-scrollbar">
                    <div>
                        <p className={`text-xs font-medium mb-3 ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>Cedera / Cacat Fisik (opsional):</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Kepala', 
                                'Leher', 
                                'Bahu', 
                                'Dada', 
                                'Lengan (Biseps/Triseps)', 
                                'Siku', 
                                'Pergelangan Tangan', 
                                'Punggung Atas',
                                'Punggung Bawah (LBP)', 
                                'Perut / Hernia',
                                'Panggul / Bokong',
                                'Paha',
                                'Lutut', 
                                'Betis',
                                'Engkel'
                            ].map(cond => {
                                const fullCond = `Cedera ${cond}`;
                                const isSelected = (answers.injuries || []).includes(fullCond);
                                return (
                                    <button key={cond}
                                        onClick={() => {
                                            setAnswers(prev => {
                                                const arr = prev.injuries || [];
                                                if (arr.includes(fullCond)) return { ...prev, injuries: arr.filter(c => c !== fullCond) };
                                                return { ...prev, injuries: [...arr, fullCond] };
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-full border text-sm transition-all ${isSelected ? `${t.bgAccent} ${t.borderAccent} text-white` : `${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} ${!isDark ? 'text-black/70' : 'text-slate-400'}`}`}>
                                        {cond}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="mt-2">
                        <p className={`text-xs font-medium mb-3 ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>Diagnosis Medis (opsional):</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Asma',
                                'Hipertensi',
                                'Diabetes',
                                'Penyakit Jantung'
                            ].map(cond => {
                                const isSelected = (answers.injuries || []).includes(cond);
                                return (
                                    <button key={cond}
                                        onClick={() => {
                                            setAnswers(prev => {
                                                const arr = prev.injuries || [];
                                                if (arr.includes(cond)) return { ...prev, injuries: arr.filter(c => c !== cond) };
                                                return { ...prev, injuries: [...arr, cond] };
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-full border text-sm transition-all ${isSelected ? `${t.bgAccent} ${t.borderAccent} text-white` : `${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} ${!isDark ? 'text-black/70' : 'text-slate-400'}`}`}>
                                        {cond}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
              ) : idx !== 6 ? (
                // STANDARD OPTIONS
                <div className="space-y-2 pb-2">
                    {steps[idx].options.map((opt) => {
                      const isSelected = answers[steps[idx].key] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleNext(steps[idx].key, opt.id)}
                          className={`w-full text-left p-3 rounded-2xl border-2 backdrop-blur-md transition-all duration-200 active:scale-[0.98] group flex items-center justify-between ${
                            isSelected 
                              ? `${t.borderAccent} ${t.bgAccent} text-white shadow-lg` 
                              : isDark ? 'border-transparent bg-white/5 shadow-none' : 'border-white/50 bg-white/60 shadow-sm'
                          } hover:${t.bgAccentSoft} hover:${t.borderAccentSoft}`}
                        >
                          <div>
                            <h4 className={`font-bold text-base ${isSelected ? 'text-white' : (!isDark ? 'text-black' : t.textMain)} mb-1`}>{opt.label}</h4>
                            <p className={`text-xs font-medium ${isSelected ? 'text-white/90' : (!isDark ? 'text-black/70' : 'text-slate-300')}`}>{opt.desc}</p>
                          </div>
                          <ChevronRight size={18} className={`${isSelected ? 'text-white' : t.textMuted} group-hover:${isSelected ? 'text-white' : t.textAccent} transition-colors`} />
                        </button>
                      );
                    })}
                </div>
              ) : (
                // CUSTOM DAYS SELECTOR (Step 5)
                <div className="flex flex-col pb-2">
                  <div className="flex flex-wrap gap-2 justify-center mb-3">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = answers.days.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            onClick={() => toggleDay(day.id)}
                            className={`px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 border-2 ${
                              isSelected 
                                ? `${t.bgAccent} ${t.borderAccent} text-white shadow-lg scale-105` 
                                : `backdrop-blur-md ${isDark ? 'bg-white/5 border-transparent shadow-none' : 'bg-white/60 border-white/50 shadow-sm'} ${t.textMuted} hover:${t.textMain}`
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                    })}
                  </div>

                  {/* Dynamic Recommendation Block */}
                  <div className={`mt-3 p-4 rounded-2xl ${answers.days.length > 0 ? t.bgAccentSoft : t.inputBg} border ${answers.days.length > 0 ? t.borderAccentSoft : 'border-transparent'} transition-colors duration-300 text-center`}>
                    <div className="flex items-center gap-4">
                      <h2 className={`font-bold text-lg ${t.textMain}`}>Rekomendasi Program</h2>
                    </div>
                    <p className={`font-bold text-sm mt-2 ${answers.days.length > 0 ? t.textMain : t.textMuted}`}>
                      {getDynamicRecommendation(answers.days.length)}
                    </p>
                  </div>
                </div>
              )}




                  {/* STEP INDICATOR AT BOTTOM */}
                  <div className="mt-auto pt-4 flex justify-center">
                     <p className={`text-xs font-bold ${!isDark ? 'text-black/50' : t.textMuted}`}>Langkah {idx + 1} dari 9</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FINAL STEP (LOADING / RESULTS) */}
          {step === 9 && (
            <div className="flex flex-col h-full justify-center items-center text-center animate-in slide-in-from-bottom-8 duration-500 max-w-lg mx-auto w-full">
              <div className="relative">
                <div className={`absolute inset-0 ${t.bgAccent} blur-xl opacity-30 animate-pulse rounded-full`}></div>
                <div className={`w-20 h-20 bg-black/5 rounded-full flex items-center justify-center border-4 ${t.borderAccent} border-t-transparent animate-spin`}>
                  <div className={`w-10 h-10 ${t.bgAccent} rounded-full animate-pulse`}></div>
                </div>
              </div>
              <h2 className={`text-2xl font-black ${t.textMain} mt-8 mb-2`}>Menganalisa Jadwal...</h2>
              <p className={`text-sm ${t.textMuted} text-center max-w-xs`}>
                {isAiReady ? `AI sedang menyusun rutinitas ${answers.days.length} hari terbaik untuk profil kamu.` : `Sistem sedang memuat program ${answers.days.length} hari terbaik untuk profil kamu.`}
              </p>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 10 && recommendedPlan && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 pb-4">
              <div className="flex flex-col items-center text-center mb-6">
                <h2 className={`text-2xl font-black ${t.textMain} leading-tight mb-2`}>
                  Program Kamu Siap!
                </h2>
                <p className={`text-xs ${t.textMuted} px-4`}>
                  Program ini tetap bisa kamu sesuaikan lagi nanti di tab Program kapan saja.
                </p>
              </div>

              {/* Plan Card */}
              <div 
                className={`p-5 rounded-3xl border mb-6 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${isDark ? 'border-white/10' : 'border-black/10'}`}
                style={{
                  backgroundImage: `url('${getPlanBgConfig(recommendedPlan.name).url}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 20%',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Overlay gradient to ensure text readability */}
                <div className={`absolute inset-0 bg-gradient-to-b ${isDark ? 'from-[#05070d]/80 via-[#05070d]/10 to-[#05070d]/90' : 'from-slate-900/70 via-slate-900/20 to-slate-900/80'} z-0 pointer-events-none`} />
                
                <h3 className={`text-2xl font-black text-sky-400 mb-2 relative z-10 drop-shadow-md`}>
                  {recommendedPlan.name}
                </h3>
                <p className={`text-sm font-medium text-white/80 mb-4 relative z-10`}>
                  {recommendedPlan.description}
                </p>

                <div className="space-y-2 relative z-10 max-h-[35vh] sm:max-h-[40vh] overflow-y-auto pr-1 pb-2 scrollbar-thin scrollbar-thumb-white/20">
                  {recommendedPlan.routines.map((routine, idx) => (
                    <div key={idx} className={`p-3 rounded-2xl bg-black/40 backdrop-blur-md shadow-sm border border-white/10`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-left">
                          <p className={`text-[10px] font-black text-sky-400 uppercase`}>{answers.days[idx] || `Hari ${idx + 1}`}</p>
                          <p className={`text-sm font-black text-white truncate max-w-[150px] sm:max-w-[200px]`}>{routine.name.replace(/\s*\([^)]*\)/g, '')}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className={`text-[9px] font-bold text-white/70 uppercase bg-white/10 px-2 py-0.5 rounded-md`}>{routine.exercises?.length || 0} Gerakan</p>
                        </div>
                      </div>
                      <p className={`text-[10px] text-white/70 leading-tight font-medium`}>
                        {routine.exercises?.map(ex => ex.name).join(' • ')}
                      </p>
                    </div>
                  ))}
                </div>

              </div>

              <button
                onClick={handleAccept}
                className={`w-full py-4 rounded-2xl ${t.bgAccent} text-white font-black text-lg shadow-lg hover:opacity-90 transition-all active:scale-95`}
              >
                Gunakan Program Ini
              </button>
              
              <button
                onClick={() => setStep(0)}
                className={`w-full mt-3 py-3 rounded-2xl ${t.inputBg} ${t.textMuted} hover:${t.textMain} font-bold text-sm transition-all`}
              >
                Ulangi Kuesioner
              </button>
            </div>
          )}

        </div>
      </div>

      {showGymManager && (
        <GymManagerModal 
          language={lang?.id || 'ID'} 
          gymProfiles={gymProfiles} 
          setGymProfiles={setGymProfiles} 
          activeGymId={activeGymId} 
          setActiveGymId={setActiveGymId} 
          onClose={() => setShowGymManager(false)} 
          t={t} 
          soundEnabled={soundEnabled} 
        />
      )}
      
      {dialog}
    </div>
  );
};

export default ProgramQuestionnaireModal;
