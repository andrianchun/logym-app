import React, { useState, useEffect } from 'react';
import { Target, Activity, Calendar, Dumbbell, Clock, ChevronRight, ChevronLeft, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { PROGRAM_PLANS } from '../data/programTemplates';
import { playSoundEffect } from '../utils/audio';

const ProgramQuestionnaireModal = ({ isOpen, onClose, onComplete, t, lang, soundEnabled }) => {
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
      // finalAnswers.days is now an array like ['Sen', 'Sel', 'Kam']
      const daysCount = finalAnswers.days.length;
      
      let bestMatch = PROGRAM_PLANS.find(p => p.daysPerWeek === daysCount);
      
      // Fallback logic
      if (!bestMatch) {
        // Find closest match
        const closestDays = Object.values(PROGRAM_PLANS)
          .map(p => p.daysPerWeek)
          .reduce((prev, curr) => Math.abs(curr - daysCount) < Math.abs(prev - daysCount) ? curr : prev);
        bestMatch = PROGRAM_PLANS.find(p => p.daysPerWeek === closestDays);
      }

      setRecommendedPlan(bestMatch);
      setIsGenerating(false);
      setStep(6);
    }, 2000);
  };

  const handleAccept = () => {
    playSoundEffect('success', soundEnabled);
    // Attach the chosen days to the recommended plan so we know their schedule
    onComplete({ ...recommendedPlan, assignedDays: answers.days, userExperience: answers.experience, duration: answers.duration });
    onClose();
  };

  // --- STEPS CONFIGURATION ---
  const steps = [
    {
      title: "Apa tujuan utama Anda?",
      key: 'goal',
      icon: <Target className="text-emerald-500 mb-4" size={40} />,
      options: [
        { id: 'muscle_gain', label: 'Membangun Otot (Hypertrophy)', desc: 'Fokus membesarkan ukuran otot.' },
        { id: 'fat_loss', label: 'Menurunkan Lemak (Cutting)', desc: 'Bakar kalori dan pertahankan otot.' },
        { id: 'strength', label: 'Menambah Kekuatan', desc: 'Fokus angkat beban lebih berat.' },
        { id: 'general', label: 'Kesehatan Umum', desc: 'Hanya ingin lebih bugar dan aktif.' }
      ]
    },
    {
      title: "Seberapa sering Anda latihan beban sebelumnya?",
      key: 'experience',
      icon: <Activity className="text-blue-500 mb-4" size={40} />,
      options: [
        { id: 'beginner', label: 'Pemula', desc: 'Baru mulai atau kurang dari 6 bulan.' },
        { id: 'intermediate', label: 'Menengah', desc: 'Sudah rutin latihan 6 bulan - 2 tahun.' },
        { id: 'advanced', label: 'Mahir', desc: 'Konsisten latihan lebih dari 2 tahun.' }
      ]
    },
    {
      // Step 2 is custom (Days Selection)
      title: "Di hari apa saja Anda bisa latihan?",
      key: 'days',
      icon: <Calendar className="text-purple-500 mb-4" size={40} />
    },
    {
      title: "Peralatan apa yang Anda miliki?",
      key: 'equipment',
      icon: <Dumbbell className="text-orange-500 mb-4" size={40} />,
      options: [
        { id: 'gym', label: 'Full Gym', desc: 'Akses ke semua alat (Barbell, Mesin, Cable).' },
        { id: 'dumbbell', label: 'Dumbbell Only', desc: 'Hanya punya Dumbbell / Home Gym.' },
        { id: 'bodyweight', label: 'Bodyweight', desc: 'Tanpa alat sama sekali.' }
      ]
    },
    {
      title: "Berapa lama waktu latihan Anda per sesi?",
      key: 'duration',
      icon: <Clock className="text-pink-500 mb-4" size={40} />,
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

  const getDynamicRecommendation = (count) => {
    if (count === 0) return "Pilih minimal 1 hari.";
    if (count <= 2) return `Anda memilih ${count} hari. Rekomendasi: Full Body Workout agar setiap otot tetap terlatih.`;
    if (count === 3) return `Ideal! Rekomendasi: 3-Day Full Body atau Push/Pull/Legs Dasar.`;
    if (count === 4) return `Bagus sekali! Rekomendasi: 4-Day Upper/Lower Split.`;
    if (count === 5) return `Sangat aktif! Rekomendasi: 5-Day Bro Split.`;
    if (count === 6) return `Hardcore! Rekomendasi: 6-Day Push/Pull/Legs (PPL) Advanced.`;
    if (count === 7) return `Beast Mode! Rekomendasi: Latihan 6 Hari + 1 Hari Pemulihan Aktif (Anti Overtraining).`;
    return "";
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in`} onClick={onClose}>
      <div className={`w-full max-w-lg mx-auto ${t.bgCard} rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/10`} onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 pb-2 shrink-0 relative z-10">
          {step > 0 && step < 5 ? (
            <button onClick={handleBack} className={`p-2 rounded-full ${t.inputBg} hover:${t.bgAccentSoft} transition-colors`}>
              <ChevronLeft size={20} className={t.textMain} />
            </button>
          ) : <div className="w-10"></div>}
          
          <div className="flex-1 text-center">
            <h3 className={`font-black text-lg ${t.textMain} flex items-center justify-center gap-2`}>
              Lyfit Coach
            </h3>
          </div>

          <button onClick={onClose} className={`p-2 rounded-full ${t.inputBg} hover:text-rose-500 transition-colors`}>
            <X size={20}/>
          </button>
        </div>

        {/* PROGRESS BAR */}
        {step < 5 && (
          <div className="px-6 pt-2 pb-4">
            <div className={`h-1.5 w-full ${t.inputBg} rounded-full overflow-hidden flex`}>
              <div 
                className={`h-full ${t.bgAccent} transition-all duration-500 ease-out`}
                style={{ width: `${((step) / 5) * 100}%` }}
              />
            </div>
            <p className={`text-center text-xs mt-2 font-bold ${t.textMuted}`}>Langkah {step + 1} dari 5</p>
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 hide-scrollbar">
          
          {/* QUESTION STEPS */}
          {step < 5 && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col h-full">
              <div className="flex flex-col items-center text-center mb-8 shrink-0">
                {steps[step].icon}
                <h2 className={`text-2xl font-black ${t.textMain} leading-tight`}>
                  {steps[step].title}
                </h2>
                {step === 2 && <p className={`text-sm ${t.textMuted} mt-2`}>Pilih hari sesuai jadwal luang Anda.</p>}
              </div>

              {step !== 2 ? (
                // STANDARD OPTIONS (Step 0, 1, 3)
                <div className="space-y-3 pb-4">
                  {steps[step].options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleNext(steps[step].key, opt.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 border-transparent ${t.inputBg} hover:${t.bgAccentSoft} hover:${t.borderAccentSoft} transition-all duration-200 active:scale-[0.98] group flex items-center justify-between`}
                    >
                      <div>
                        <h4 className={`font-bold text-base ${t.textMain} mb-1`}>{opt.label}</h4>
                        <p className={`text-xs ${t.textMuted}`}>{opt.desc}</p>
                      </div>
                      <ChevronRight size={18} className={`${t.textMuted} group-hover:${t.textAccent} transition-colors`} />
                    </button>
                  ))}
                </div>
              ) : (
                // CUSTOM DAYS SELECTOR (Step 2)
                <div className="flex flex-col flex-1 pb-4">
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = answers.days.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(day.id)}
                          className={`px-5 py-3 rounded-2xl font-bold transition-all active:scale-95 border-2 ${
                            isSelected 
                              ? `${t.bgAccent} ${t.borderAccent} text-white shadow-lg scale-105` 
                              : `${t.inputBg} border-transparent ${t.textMuted} hover:${t.textMain}`
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic Recommendation Block */}
                  <div className={`mt-auto p-4 rounded-2xl ${answers.days.length > 0 ? t.bgAccentSoft : t.inputBg} border ${answers.days.length > 0 ? t.borderAccentSoft : 'border-transparent'} transition-colors duration-300 text-center`}>
                    <p className={`font-bold text-sm ${answers.days.length > 0 ? t.textMain : t.textMuted}`}>
                      {getDynamicRecommendation(answers.days.length)}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (answers.days.length > 0) setStep(step + 1);
                    }}
                    disabled={answers.days.length === 0}
                    className={`w-full mt-4 py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
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

          {/* GENERATING STEP */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className={`absolute inset-0 ${t.bgAccent} blur-xl opacity-30 animate-pulse rounded-full`}></div>
                <div className={`w-20 h-20 bg-black/5 rounded-full flex items-center justify-center border-4 ${t.borderAccent} border-t-transparent animate-spin`}>
                  <div className={`w-10 h-10 ${t.bgAccent} rounded-full animate-pulse`}></div>
                </div>
              </div>
              <h2 className={`text-2xl font-black ${t.textMain} mt-8 mb-2`}>Menganalisa Jadwal...</h2>
              <p className={`text-sm ${t.textMuted} text-center max-w-xs`}>
                AI sedang menyusun rutinitas {answers.days.length} hari terbaik untuk profil Anda.
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
                  Program Anda Siap!
                </h2>
                <p className={`text-sm ${t.textMuted}`}>
                  Berdasarkan profil dan jadwal luang Anda, kami merekomendasikan:
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

                <div className="grid grid-cols-2 gap-3 relative z-10">
                  <div className={`p-3 rounded-2xl ${t.bgCard} shadow-sm border border-black/5`}>
                    <p className={`text-[10px] font-bold ${t.textMuted} uppercase mb-1`}>Jadwal Anda</p>
                    <p className={`text-sm font-black ${t.textMain}`}>{answers.days.length} Hari / Minggu</p>
                    <p className={`text-[10px] font-bold ${t.textAccent} mt-1 truncate`}>{answers.days.join(', ')}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${t.bgCard} shadow-sm border border-black/5`}>
                    <p className={`text-[10px] font-bold ${t.textMuted} uppercase mb-1`}>Sesi Latihan</p>
                    <p className={`text-sm font-black ${t.textMain}`}>{recommendedPlan.routines.length} Rutinitas</p>
                  </div>
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
    </div>
  );
};

export default ProgramQuestionnaireModal;
