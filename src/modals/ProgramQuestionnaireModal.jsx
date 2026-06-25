import React, { useState, useEffect } from 'react';
import { Target, Activity, Calendar, Dumbbell, Clock, ChevronRight, ChevronLeft, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { PROGRAM_PLANS } from '../data/programTemplates';
import { playSoundEffect } from '../utils/audio';
import GymManagerModal from '../components/GymManagerModal';
import { generateDynamicWorkout } from '../utils/aiGenerator';

const ProgramQuestionnaireModal = ({ isOpen, onClose, onComplete, t, lang, soundEnabled, gymProfiles, setGymProfiles, activeGymId, setActiveGymId, exerciseLibrary }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    goal: null,
    experience: null,
    days: [], // Now an array of selected days
    equipment: null,
    duration: null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState(null);
  const [showGymManager, setShowGymManager] = useState(false);

  const isDark = t.bgCard !== 'bg-white';

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setAnswers({ goal: null, experience: null, days: [], equipment: null, duration: null });
      setIsGenerating(false);
      setRecommendedPlan(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = (key, value) => {
    playSoundEffect('click', soundEnabled);
    if (key === 'equipment' && value === 'ADD_NEW_GYM') {
      setShowGymManager(true);
      return;
    }

    setAnswers(prev => ({ ...prev, [key]: value }));
    
    if (step < 4) {
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
    setStep(5);
    playSoundEffect('success', soundEnabled);
    
    setTimeout(() => {
      // Find the active gym profile
      let targetGymProfileId = activeGymId;
      if (finalAnswers.equipment && finalAnswers.equipment !== 'ADD_NEW_GYM') {
        targetGymProfileId = finalAnswers.equipment;
      }
      const targetGym = gymProfiles.find(g => g.id === targetGymProfileId) || gymProfiles[0];
      
      // Generate the dynamic plan
      const generatedPlan = generateDynamicWorkout(finalAnswers, targetGym, exerciseLibrary);

      setRecommendedPlan({
        ...generatedPlan,
        name: getPlanName(finalAnswers.days.length),
        desc: `Disusun dinamis berdasarkan profil, target otot, level, dan ketersediaan alat kamu.`,
      });
      setIsGenerating(false);
      setStep(6);
    }, 2000);
  };

  const handleAccept = () => {
    playSoundEffect('success', soundEnabled);
    onComplete({ ...recommendedPlan, gymProfileId: answers.equipment });
    onClose();
  };

  // --- STEPS CONFIGURATION ---
  const steps = [
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
      // Step 2 is custom (Days Selection)
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
            backgroundImage: "url('/bg-program.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 40px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)'
          }}
        />
        {/* ------------------------------ */}

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 pb-2 shrink-0 relative z-10 max-w-lg mx-auto w-full">
          {step > 0 && step < 5 ? (
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

          <button onClick={onClose} className={`p-2 rounded-full ${t.inputBg} hover:text-rose-500 transition-colors`}>
            <X size={20}/>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 hide-scrollbar relative z-10">
          
          {/* QUESTION STEPS */}
          {step < 5 && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col h-full max-w-lg mx-auto w-full">
              {/* Spacer untuk menampilkan wajah coach */}
              <div className="h-40 sm:h-56 shrink-0"></div>

              <div className={`flex flex-col items-center text-center mb-6 shrink-0`}>
                {steps[step].icon}
                <h2 className={`text-2xl font-black ${!isDark ? 'text-black' : t.textMain} leading-tight`}>
                  {steps[step].title}
                </h2>
                {step === 2 && <p className={`text-sm font-medium mt-2 ${!isDark ? 'text-black/80' : 'text-slate-300'}`}>Pilih hari sesuai jadwal luang kamu.</p>}
              </div>

              {/* PROGRESS BAR */}
              <div className={`w-full ${step === 2 ? 'mb-4' : 'mb-8'}`}>
                <div className={`h-1.5 w-full ${t.inputBg} rounded-full overflow-hidden flex`}>
                  <div 
                    className={`h-full ${t.bgAccent} transition-all duration-500 ease-out`}
                    style={{ width: `${((step) / 5) * 100}%` }}
                  />
                </div>
                <p className={`text-center text-xs mt-2 font-bold ${!isDark ? 'text-black' : t.textMuted}`}>Langkah {step + 1} dari 5</p>
              </div>

              {step !== 2 ? (
                // STANDARD OPTIONS (Step 0, 1, 3, 4)
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
                // CUSTOM DAYS SELECTOR (Step 2)
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
          {step === 5 && (
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
          {step === 6 && recommendedPlan && (
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
    </div>
  );
};

export default ProgramQuestionnaireModal;
