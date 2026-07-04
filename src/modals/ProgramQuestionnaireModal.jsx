import React, { useState, useEffect } from 'react';
import { Target, Activity, Calendar, Dumbbell, Clock, ChevronRight, ChevronLeft, Sparkles, X, CheckCircle2, User, Ruler, Smartphone, Heart } from 'lucide-react';
import { PROGRAM_PLANS } from '../data/programTemplates';
import { playSoundEffect } from '../utils/audio';
import { generateDynamicWorkout } from '../utils/aiGenerator';
import ScrollPicker from '../components/ScrollPicker';
import useDialog from '../hooks/useDialog';
import GymManagerModal from '../components/GymManagerModal';

const ProgramQuestionnaireModal = ({ isOpen, onClose, onComplete, t, lang, soundEnabled, gymProfiles, setGymProfiles, activeGymId, setActiveGymId, exerciseLibrary, units }) => {
  const [step, setStep] = useState(0);
  
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
    gender: null,
    dob: '',
    height: 170,
    heightFt: 5,
    heightIn: 7,
    weight: 70,
    targetWeight: 65,
    goal: null,
    experience: null,
    activityLevel: null,
    days: [], // Now an array of selected days
    equipment: null,
    duration: null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState(null);
  const [showGymManager, setShowGymManager] = useState(false);

  const isDark = t.bgCard !== 'bg-white';
  const { dialog, showConfirm } = useDialog(isDark, t.bgCard);
  const isImp = units?.weight === 'lbs';
  const isImpHeight = units?.height === 'ft';

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setAnswers({ gender: null, dob: '', height: 170, heightFt: 5, heightIn: 7, weight: isImp ? 150 : 70, targetWeight: isImp ? 140 : 65, goal: null, experience: null, activityLevel: null, days: [], equipment: null, duration: null });
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

  const generateProgram = (finalAnswers) => {
    setIsGenerating(true);
    setStep(9);
    playSoundEffect('success', soundEnabled);
    
    setTimeout(() => {
      // Find the active gym profile
      let targetGymProfileId = activeGymId;
      if (finalAnswers.equipment && finalAnswers.equipment !== 'ADD_NEW_GYM') {
        targetGymProfileId = finalAnswers.equipment;
      }
      const targetGym = gymProfiles.find(g => g.id === targetGymProfileId) || gymProfiles[0] || { id: 'default', name: 'Lyfit Gym', equipment: 'all', config: {} };
      
      // Use the passed-in library or fall back gracefully
      const library = exerciseLibrary && exerciseLibrary.length > 0 ? exerciseLibrary : [];
      
      // Generate the dynamic plan
      const generatedPlan = generateDynamicWorkout(finalAnswers, targetGym, library);

      if (!generatedPlan || !generatedPlan.routines || generatedPlan.routines.length === 0) {
        console.error('generateDynamicWorkout returned empty routines:', generatedPlan, 'library size:', library.length);
        // Still set a plan but with empty routines so user can proceed
      }

      setRecommendedPlan({
        ...generatedPlan,
        name: getPlanName(finalAnswers.days.length),
        desc: `Disusun dinamis berdasarkan profil, target otot, level, dan ketersediaan alat kamu.`,
      });
      setIsGenerating(false);
      setStep(10);
    }, 2000);
  };

  const handleAccept = () => {
    playSoundEffect('success', soundEnabled);
    const finalWeight = isImp ? Number((answers.weight / 2.20462).toFixed(1)) : Number(answers.weight);
    const finalTargetWeight = isImp ? Number((answers.targetWeight / 2.20462).toFixed(1)) : Number(answers.targetWeight);
    const finalHeight = isImpHeight ? Math.round((Number(answers.heightFt) * 12 + Number(answers.heightIn)) * 2.54) : Number(answers.height);
    
    // Hitung BMR & TDEE
    const age = answers.dob ? (new Date().getFullYear() - new Date(answers.dob).getFullYear()) : 25;
    let bmr = 10 * finalWeight + 6.25 * finalHeight - 5 * age;
    bmr = Math.round(answers.gender === 'female' ? bmr - 161 : bmr + 5);
    
    // Hitung BMI
    const hMeter = finalHeight / 100;
    const bmi = Number((finalWeight / (hMeter * hMeter)).toFixed(1));

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };
    const tdee = Math.round(bmr * (activityMultipliers[answers.activityLevel] || 1.2));
    
    let calorieDelta = 0;
    if (answers.goal === 'fat_loss') calorieDelta = -500;
    else if (answers.goal === 'muscle_gain') calorieDelta = 300;

    onComplete({ 
        ...recommendedPlan, 
        gymProfileId: answers.equipment,
        biometrics: {
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
      // Step 5 is custom (Days Selection)
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in`} onClick={onClose}>
      <div className={`w-full h-full ${t.bgCard} overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 relative`} onClick={e => e.stopPropagation()}>
        
        {/* --- Background Image Layer --- */}
        <div 
          className={`absolute inset-0 z-0 pointer-events-none transition-all duration-300 ${isDark ? 'opacity-40' : 'opacity-70'} mix-blend-normal`}
          style={{
            backgroundImage: "url('/bg-program.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 40px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)'
          }}
        />
        {/* ------------------------------ */}

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 pb-2 shrink-0 relative z-10 max-w-lg mx-auto w-full">
          {step > 0 && step < 9 ? (
            <button onClick={handleBack} className={`p-2 rounded-full ${t.inputBg} hover:${t.bgAccentSoft} transition-colors`}>
              <ChevronLeft size={20} className={t.textMain} />
            </button>
          ) : <div className="w-10"></div>}
          
          <div className="flex-1 text-center">
            <h3 className={`font-black text-lg ${!isDark ? 'text-black' : t.textMain} flex items-center justify-center gap-2`}>
              Lyfit Coach
            </h3>
            <p className={`text-[13px] ${!isDark ? 'text-black font-semibold' : `${t.textMuted} font-medium`} mt-1 leading-snug max-w-[280px] mx-auto`}>
              Halo, Coach Raiga di sini. Aku siap bantu kamu menuju badan impian yang sehat dan kuat!
            </p>
          </div>

          <button onClick={handleCloseClick} className={`p-2 rounded-full ${t.inputBg} hover:text-rose-500 transition-colors`}>
            <X size={20}/>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 hide-scrollbar relative z-10">
          
          {/* QUESTION STEPS */}
          {step < 9 && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col h-full max-w-lg mx-auto w-full">
              {/* Spacer untuk menampilkan wajah coach */}
              <div className="h-40 sm:h-56 shrink-0"></div>

              <div className={`flex flex-col items-center text-center mb-6 shrink-0`}>
                {steps[step].icon}
                <h2 className={`text-2xl font-black ${!isDark ? 'text-black' : t.textMain} leading-tight`}>
                  {steps[step].title}
                </h2>
                {step === 6 && <p className={`text-sm font-medium mt-2 ${!isDark ? 'text-black/80' : 'text-slate-300'}`}>Pilih hari sesuai jadwal luang kamu.</p>}
                {step === 0 && <p className={`text-sm font-medium mt-2 ${!isDark ? 'text-black/80' : 'text-slate-300'}`}>Koneksikan data kesehatan dengan akunmu.</p>}
              </div>

              {/* PROGRESS BAR */}
              <div className={`w-full ${step === 6 ? 'mb-4' : 'mb-8'}`}>
                <div className={`h-1.5 w-full ${t.inputBg} rounded-full overflow-hidden flex`}>
                  <div 
                    className={`h-full ${t.bgAccent} transition-all duration-500 ease-out`}
                    style={{ width: `${((step) / 9) * 100}%` }}
                  />
                </div>
                <p className={`text-center text-xs mt-2 font-bold ${!isDark ? 'text-black' : t.textMuted}`}>Langkah {step + 1} dari 9</p>
              </div>

              {step === 0 ? (
                // CUSTOM SYNC SELECTOR
                <div className="flex flex-col pb-2 space-y-3">
                  <button
                    onClick={() => {
                        playSoundEffect('click', soundEnabled);
                        setStep(step + 1);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] group flex flex-col items-center justify-center ${t.borderAccent} ${t.bgAccentSoft} hover:opacity-80`}
                  >
                    <h4 className={`font-bold text-base ${t.textAccent} mb-1`}>Health Connect</h4>
                    <p className={`text-[11px] font-medium ${t.textMuted} opacity-50 text-center`}>Sync otomatis tinggi & berat badan (Segera Hadir).</p>
                  </button>

                  <button
                    onClick={() => {
                        playSoundEffect('click', soundEnabled);
                        setStep(step + 1);
                    }}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] group flex flex-col items-center justify-center ${t.borderAccent} ${t.bgAccentSoft} hover:opacity-80`}
                  >
                    <h4 className={`font-bold text-base ${t.textAccent} mb-1`}>Apple Health</h4>
                    <p className={`text-[11px] font-medium ${t.textMuted} opacity-50 text-center`}>Sync otomatis tinggi & berat badan (Segera Hadir).</p>
                  </button>
                  
                  <button
                    onClick={() => {
                        playSoundEffect('click', soundEnabled);
                        setStep(step + 1);
                    }}
                    className={`w-full text-center p-3 mt-1 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] border-transparent ${t.inputBg} hover:opacity-80`}
                  >
                    <h4 className={`font-bold text-sm ${!isDark ? 'text-black' : t.textMain}`}>Lewati</h4>
                  </button>
                </div>
              ) : step === 1 ? (
                // CUSTOM GENDER & DOB
                <div className="flex flex-col pb-2 space-y-4">
                  <div>
                      <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setAnswers(prev => ({...prev, gender: 'male'}))} className={`p-4 rounded-xl border-2 font-bold transition-all ${answers.gender === 'male' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>Laki-laki</button>
                          <button onClick={() => setAnswers(prev => ({...prev, gender: 'female'}))} className={`p-4 rounded-xl border-2 font-bold transition-all ${answers.gender === 'female' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>Perempuan</button>
                      </div>
                  </div>
                  <div className="mt-4">
                      <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Tanggal Lahir</label>
                      <input 
                          type="date" 
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                          value={answers.dob} 
                          onChange={(e) => setAnswers(prev => ({...prev, dob: e.target.value}))} 
                          className={`w-full p-4 rounded-xl border-2 font-bold ${answers.dob ? (isValidAge(answers.dob) ? t.borderAccent : 'border-rose-500 text-rose-500') : 'border-transparent'} ${t.inputBg} ${answers.dob && !isValidAge(answers.dob) ? '' : t.textMain}`}
                      />
                      {answers.dob && !isValidAge(answers.dob) ? (
                          <p className={`text-[11px] mt-2 text-center font-bold text-rose-500 animate-in fade-in slide-in-from-top-1`}>Usia kamu harus di atas 13 tahun untuk menggunakan LyFit.</p>
                      ) : (
                          <p className={`text-[10px] mt-1 text-center font-bold ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>Minimal usia 13 tahun.</p>
                      )}
                  </div>
                  <button onClick={() => { if(answers.gender && isValidAge(answers.dob)) setStep(step + 1); }} disabled={!answers.gender || !isValidAge(answers.dob)} className={`w-full mt-4 py-3 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${answers.gender && isValidAge(answers.dob) ? `${t.bgAccent} text-white hover:opacity-90` : `${t.inputBg} ${t.textMuted} opacity-50 cursor-not-allowed`}`}>
                    Lanjut <ChevronRight size={20} />
                  </button>
                </div>
              ) : step === 2 ? (
                // CUSTOM BIOMETRICS
                <div className="flex flex-col pb-2 space-y-4">
                  <div>
                      <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Tinggi Badan ({units?.height || 'cm'})</label>
                      {isImpHeight ? (
                          <div className="flex items-center justify-center gap-4">
                              <div className="flex flex-col items-center gap-1">
                                  <ScrollPicker 
                                      value={answers.heightFt} 
                                      onChange={(val) => setAnswers(prev => ({...prev, heightFt: val}))} 
                                      min={3} max={8} step={1} theme={isDark ? 'dark' : 'light'} width="w-20"
                                  />
                                  <span className={`font-bold text-[10px] ${t.textMuted}`}>ft</span>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                  <ScrollPicker 
                                      value={answers.heightIn} 
                                      onChange={(val) => setAnswers(prev => ({...prev, heightIn: val}))} 
                                      min={0} max={11} step={1} theme={isDark ? 'dark' : 'light'} width="w-20"
                                  />
                                  <span className={`font-bold text-[10px] ${t.textMuted}`}>in</span>
                              </div>
                          </div>
                      ) : (
                          <div className="flex justify-center">
                              <ScrollPicker 
                                  value={answers.height} 
                                  onChange={(val) => setAnswers(prev => ({...prev, height: val}))} 
                                  min={100} max={250} step={1} theme={isDark ? 'dark' : 'light'} width="w-full max-w-[120px]"
                              />
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                      <div>
                          <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Berat ({units?.weight || 'kg'})</label>
                          <div className="flex justify-center">
                              <ScrollPicker 
                                  value={answers.weight} 
                                  onChange={(val) => setAnswers(prev => ({...prev, weight: val}))} 
                                  min={isImp ? 60 : 30} max={isImp ? 400 : 200} step={1} theme={isDark ? 'dark' : 'light'} width="w-full max-w-[100px]"
                              />
                          </div>
                      </div>
                      <div>
                          <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Target ({units?.weight || 'kg'})</label>
                          <div className="flex justify-center">
                              <ScrollPicker 
                                  value={answers.targetWeight} 
                                  onChange={(val) => setAnswers(prev => ({...prev, targetWeight: val}))} 
                                  min={isImp ? 60 : 30} max={isImp ? 400 : 200} step={1} theme={isDark ? 'dark' : 'light'} width="w-full max-w-[100px]"
                              />
                          </div>
                      </div>
                  </div>
                  <button onClick={() => { 
                      const isHeightValid = isImpHeight ? (answers.heightFt && answers.heightIn) : answers.height;
                      if(isHeightValid && answers.weight && answers.targetWeight) setStep(step + 1); 
                    }} disabled={(isImpHeight ? (!answers.heightFt || !answers.heightIn) : !answers.height) || !answers.weight || !answers.targetWeight} className={`w-full mt-4 py-3 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${((isImpHeight ? (answers.heightFt && answers.heightIn) : answers.height) && answers.weight && answers.targetWeight) ? `${t.bgAccent} text-white hover:opacity-90` : `${t.inputBg} ${t.textMuted} opacity-50 cursor-not-allowed`}`}>
                    Lanjut <ChevronRight size={20} />
                  </button>
                </div>
              ) : step !== 6 ? (
                // STANDARD OPTIONS
                <div className="space-y-3 pb-4">
                    {steps[step].options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleNext(steps[step].key, opt.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 backdrop-blur-md transition-all duration-200 active:scale-[0.98] group flex items-center justify-between ${
                          isDark ? 'border-transparent bg-white/5 shadow-none' : 'border-white/50 bg-white/60 shadow-sm'
                        } hover:${t.bgAccentSoft} hover:${t.borderAccentSoft}`}
                      >
                        <div>
                          <h4 className={`font-bold text-base ${!isDark ? 'text-black' : t.textMain} mb-1`}>{opt.label}</h4>
                          <p className={`text-xs font-medium ${!isDark ? 'text-black/70' : 'text-slate-300'}`}>{opt.desc}</p>
                        </div>
                        <ChevronRight size={18} className={`${t.textMuted} group-hover:${t.textAccent} transition-colors`} />
                      </button>
                    ))}
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
                    <p className={`font-bold text-sm ${answers.days.length > 0 ? t.textMain : t.textMuted}`}>
                      {getDynamicRecommendation(answers.days.length)}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (answers.days.length > 0) setStep(step + 1);
                    }}
                    disabled={answers.days.length === 0}
                    className={`w-full mt-3 py-3 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      answers.days.length > 0
                        ? `${t.bgAccent} text-white shadow-lg hover:opacity-90`
                        : `${t.inputBg} ${t.textMuted} opacity-50 cursor-not-allowed`
                    }`}
                  >
                    Lanjut <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

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
                AI sedang menyusun rutinitas {answers.days.length} hari terbaik untuk profil kamu.
              </p>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 10 && recommendedPlan && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 pb-4">
              <div className="flex flex-col items-center text-center mb-6">
                <div className={`w-16 h-16 ${t.bgAccentSoft} ${t.textAccent} rounded-full flex items-center justify-center mb-4`}>
                  <CheckCircle2 size={32} />
                </div>
                <h2 className={`text-2xl font-black ${t.textMain} leading-tight mb-2`}>
                  Program kamu Siap!
                </h2>
                <p className={`text-sm ${t.textMuted}`}>
                  Berdasarkan profil dan jadwal luang kamu, kami merekomendasikan:
                </p>
              </div>

              {/* Plan Card */}
              <div className={`p-5 rounded-3xl ${t.bgAccentSoft} border ${t.borderAccentSoft} mb-6 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Dumbbell size={100} />
                </div>
                
                <h3 className={`text-xl font-black ${t.textAccent} mb-2 relative z-10`}>
                  {recommendedPlan.name}
                </h3>
                <p className={`text-sm font-medium ${t.textMain} mb-4 relative z-10`}>
                  {recommendedPlan.description}
                </p>

                  <div className="space-y-1.5 relative z-10">
                  {recommendedPlan.routines.map((routine, idx) => (
                    <div key={idx} className={`p-2.5 rounded-2xl ${t.bgCard} shadow-sm border border-black/5`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-left">
                          <p className={`text-[10px] font-bold ${t.textAccent} uppercase`}>{answers.days[idx] || `Hari ${idx + 1}`}</p>
                          <p className={`text-sm font-black ${t.textMain} truncate max-w-[150px] sm:max-w-[200px]`}>{routine.name.replace(/\s*\([^)]*\)/g, '')}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className={`text-[10px] font-bold ${t.textMuted} uppercase bg-black/5 px-2 py-0.5 rounded-md`}>{routine.exercises?.length || 0} Gerakan</p>
                        </div>
                      </div>
                      <p className={`text-[10px] ${t.textMuted} leading-tight font-medium`}>
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
