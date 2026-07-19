import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Globe, Volume2, VolumeX, Timer, Download, Upload, CalendarDays, Bell, BellOff, Clock, Activity, Scale, Ruler, Thermometer, Database, Trash2, Plus, MessageCircle, Brain, HelpCircle, ChevronDown } from 'lucide-react';
import SwipeInput from '../components/SwipeInput';
import { AI_MODELS, PERSONA_PRESETS } from '../utils/aiAgent';
import { FAQ_ITEMS } from '../utils/faqData';
import BugReportModal from './BugReportModal';
import AdminDashboardModal from './AdminDashboardModal';

export default function SettingsModal({
  showSettings, setShowSettings, t, lang,
  theme, setTheme, language, setLanguage,
  soundEnabled, setSoundEnabled,
  defaultRestTime, setDefaultRestTime,
  weekStartDay, setWeekStartDay,
  defaultReminderTime, setDefaultReminderTime,
  reminderEnabled, setReminderEnabled,
  undoStack, redoStack, handleUndo, handleRedo,
  setShowLibManager, setShowHelp,
  exportData, handleImportFile,
  user, handleLogout, handleDeleteAccount,
  setConfirmModal,
  biometricStandard, setBiometricStandard,
  units, setUnits,
  userApiKeys, setUserApiKeys,
  raigaPersona, setRaigaPersona, raigaCustomInstruction, setRaigaCustomInstruction,
  raigaMemory, setRaigaMemory,
  connectedApps, setConnectedApps
}) {
  const [activeTab, setActiveTab] = useState('preferensi');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [prevShowSettings, setPrevShowSettings] = useState(showSettings);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  if (showSettings !== prevShowSettings) {
      setPrevShowSettings(showSettings);
      if (showSettings === 'lanjutan') {
          setActiveTab('lanjutan');
          setTimeout(() => {
              const el = document.getElementById('ai-agent-settings');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 300);
      } else if (showSettings === 'satuan') {
          // Satuan Unit sekarang jadi bagian bawah tab Preferensi (digabung), bukan tab sendiri.
          setActiveTab('preferensi');
          setTimeout(() => {
              const el = document.getElementById('satuan-unit-settings');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 300);
      } else if (showSettings === true) {
          setActiveTab('preferensi');
      }
  }

  if (!showSettings) return null;

  const handleToggleApp = (appKey) => {
     setConnectedApps(prev => {
         const next = { ...prev, [appKey]: !prev[appKey] };
         localStorage.setItem('lyfit_connectedApps', JSON.stringify(next));
         return next;
     });
  };

  return (
    <div className={`fixed inset-0 z-[999] ${t.bgApp} flex flex-col animate-in slide-in-from-bottom-full duration-300`}>
      {/* HEADER MODAL */}
      <div className={`relative px-4 pt-4 pb-4 border-b ${t.border} shrink-0`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url('/banner-${theme}.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
            <button onClick={() => setShowSettings(false)} className={`p-2 rounded-full ${t.btnBg} transition-colors`}>
                <X size={20} className={t.textMain} />
            </button>
        </div>
        <div className="relative z-10">
            <h1 className={`text-2xl font-black ${t.textMain} tracking-tight`}>{lang.settings || 'Pengaturan'}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${t.border} px-2 shrink-0 overflow-x-auto no-scrollbar`}>
          <button onClick={() => setActiveTab('preferensi')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 transition-colors ${activeTab === 'preferensi' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Preferensi</button>
          <button onClick={() => setActiveTab('faq')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 transition-colors ${activeTab === 'faq' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>FAQ</button>
          <button onClick={() => setActiveTab('lanjutan')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 transition-colors ${activeTab === 'lanjutan' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Lanjutan</button>
      </div>

      {/* BODY MODAL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* TAB 1: PREFERENSI */}
        {activeTab === 'preferensi' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-2`}>
                {/* Tema Gelap/Terang */}
                <div className="flex justify-between items-center py-2">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Moon size={20} className={t.textAccent}/> 
                    <span className="font-bold">{lang.theme}</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: theme === 'dark' ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}></div>
                    <button onClick={() => setTheme('dark')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${theme === 'dark' ? 'text-white' : t.textMuted}`}><Moon size={16} /></button>
                    <button onClick={() => setTheme('light')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${theme === 'light' ? 'text-white' : t.textMuted}`}><Sun size={16} /></button>
                </div>
                </div>

                {/* Bahasa */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Globe size={20} className={t.textAccent}/> 
                    <span className="font-bold">{lang.lang}</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: language === 'ID' ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}></div>
                    <button onClick={() => setLanguage('ID')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-all duration-300 ${language === 'ID' ? 'opacity-100 scale-110 grayscale-0' : 'opacity-40 grayscale scale-100'}`}>
                        <img src="https://flagcdn.com/w40/id.png" alt="ID" className="w-5 h-5 rounded-full object-cover shadow-sm" />
                    </button>
                    <button onClick={() => setLanguage('EN')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-all duration-300 ${language === 'EN' ? 'opacity-100 scale-110 grayscale-0' : 'opacity-40 grayscale scale-100'}`}>
                        <img src="https://flagcdn.com/w40/gb.png" alt="EN" className="w-5 h-5 rounded-full object-cover shadow-sm" />
                    </button>
                </div>
                </div>

                {/* Suara Efek */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    {soundEnabled ? <Volume2 size={20} className={t.textAccent}/> : <VolumeX size={20} className={t.textMuted}/>}
                    <span className="font-bold">{lang.sound}</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: soundEnabled ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}></div>
                    <button onClick={() => setSoundEnabled(true)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${soundEnabled ? 'text-white' : t.textMuted}`}><Volume2 size={16} /></button>
                    <button onClick={() => setSoundEnabled(false)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${!soundEnabled ? 'text-white' : t.textMuted}`}><VolumeX size={16} /></button>
                </div>
                </div>

                {/* Awal Minggu (Week Start) */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <CalendarDays size={20} className={t.textAccent}/> 
                    <span className="font-bold">Awal Minggu</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: weekStartDay === 0 ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setWeekStartDay(1)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${weekStartDay === 1 ? 'text-white' : t.textMuted} text-xs font-bold`}>Senin</button>
                    <button onClick={() => setWeekStartDay(0)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${weekStartDay === 0 ? 'text-white' : t.textMuted} text-xs font-bold`}>Minggu</button>
                </div>
                </div>
            </div>

            {/* Separator — Satuan & Unit digabung ke tab yang sama, dipisah judul & spacing */}
            <p id="satuan-unit-settings" className={`body-md ${t.textMuted} uppercase tracking-wider pt-2`}>
                Satuan & Unit
            </p>

            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-2`}>
                {/* Berat Badan */}
                <div className="flex justify-between items-center py-2">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Scale size={20} className={t.textAccent}/> 
                    <span className="font-bold">Berat</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: units?.weight === 'lbs' ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setUnits({...units, weight: 'kg'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.weight !== 'lbs' ? 'text-white' : t.textMuted} text-xs font-bold`}>Kg</button>
                    <button onClick={() => setUnits({...units, weight: 'lbs'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.weight === 'lbs' ? 'text-white' : t.textMuted} text-xs font-bold`}>Lbs</button>
                </div>
                </div>

                {/* Tinggi Badan */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Ruler size={20} className={t.textAccent}/> 
                    <span className="font-bold">Tinggi</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: units?.height === 'ft' ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setUnits({...units, height: 'cm'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.height !== 'ft' ? 'text-white' : t.textMuted} text-xs font-bold`}>Cm</button>
                    <button onClick={() => setUnits({...units, height: 'ft'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.height === 'ft' ? 'text-white' : t.textMuted} text-xs font-bold`}>Ft / In</button>
                </div>
                </div>

                {/* Jarak */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Activity size={20} className={t.textAccent}/> 
                    <span className="font-bold">Jarak (Lari)</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: units?.distance === 'mi' ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setUnits({...units, distance: 'km'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.distance !== 'mi' ? 'text-white' : t.textMuted} text-xs font-bold`}>Km</button>
                    <button onClick={() => setUnits({...units, distance: 'mi'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.distance === 'mi' ? 'text-white' : t.textMuted} text-xs font-bold`}>Miles</button>
                </div>
                </div>
                
                {/* Suhu */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Thermometer size={20} className={t.textAccent}/> 
                    <span className="font-bold">Suhu</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: units?.temp === 'f' ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setUnits({...units, temp: 'c'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.temp !== 'f' ? 'text-white' : t.textMuted} text-xs font-bold`}>°C</button>
                    <button onClick={() => setUnits({...units, temp: 'f'})} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${units?.temp === 'f' ? 'text-white' : t.textMuted} text-xs font-bold`}>°F</button>
                </div>
                </div>
                
                {/* Standar Biometrik */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Activity size={20} className={t.textAccent}/> 
                    <span className="font-bold">Standar BMI</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: biometricStandard === 'western' ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setBiometricStandard('asia')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${biometricStandard === 'asia' ? 'text-white' : t.textMuted} text-xs font-bold`}>Asia</button>
                    <button onClick={() => setBiometricStandard('western')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${biometricStandard === 'western' ? 'text-white' : t.textMuted} text-xs font-bold`}>Western</button>
                </div>
                </div>

            </div>
          </div>
        )}

        {/* TAB: FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard}`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-3 flex items-center gap-2`}>
                    <HelpCircle size={16} /> Pertanyaan Umum
                </p>
                <div className="space-y-1">
                    {FAQ_ITEMS.map((item, i) => (
                        <div key={i} className={`border-t ${i === 0 ? 'border-transparent' : 'border-black/5 dark:border-white/5'}`}>
                            <button
                                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                className="w-full flex items-center justify-between gap-3 py-3 text-left"
                            >
                                <span className={`font-bold text-sm ${t.textMain}`}>{item.q}</span>
                                <ChevronDown size={16} className={`shrink-0 ${t.textMuted} transition-transform duration-200 ${openFaqIndex === i ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaqIndex === i && (
                                <p className={`text-xs ${t.textMuted} leading-relaxed pb-3 pr-6 animate-in fade-in duration-200`}>
                                    {item.a}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className={`mt-6 pt-4 border-t ${t.border}`}>
                    <button 
                        onClick={() => setShowBugReport(true)}
                        className={`w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-bold text-sm transition-colors`}
                    >
                        <AlertTriangle size={16} /> Laporkan Bug / Masalah
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* TAB 3: LANJUTAN */}
        {activeTab === 'lanjutan' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* API UNTUK AI */}
            <div id="ai-agent-settings" className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                <Activity size={16} /> API untuk AI
                </p>

                <div className="space-y-3">
                    <div className="space-y-2">
                        {(userApiKeys || []).map((key, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="password"
                                    value={key}
                                    onChange={(e) => {
                                        const newKeys = [...(userApiKeys || [])];
                                        newKeys[index] = e.target.value;
                                        setUserApiKeys(newKeys);
                                    }}
                                    placeholder="Paste your API Key here..."
                                    autoComplete="new-password"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    className={`flex-1 font-mono text-sm px-4 py-2.5 rounded-xl outline-none border ${t.border} focus:ring-2 ${t.ringAccent} ${t.inputBg} ${t.textMain}`}
                                />
                                <button
                                    onClick={() => {
                                        const newKeys = [...(userApiKeys || [])];
                                        newKeys.splice(index, 1);
                                        setUserApiKeys(newKeys);
                                    }}
                                    className={`p-2.5 rounded-xl ${t.btnBg} text-rose-500 hover:text-rose-600 transition-colors shrink-0`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setUserApiKeys([...(userApiKeys || []), ''])}
                            className={`w-full py-2.5 rounded-xl border border-dashed ${t.borderDashed} ${t.btnBg} ${t.textMain} font-bold text-sm flex items-center justify-center gap-2 transition-colors`}
                        >
                            <Plus size={16} /> Tambah API Key
                        </button>
                    </div>
                    <p className={`text-[10px] ${t.textMuted} leading-tight mt-2`}>
                        Silakan diisi untuk berjaga-jaga jika layanan AI dari aplikasi sedang bermasalah.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className={`flex flex-col items-center gap-1.5 py-3 rounded-xl ${t.btnBg} hover:opacity-80 transition-opacity`}>
                            <svg width="22" height="22" viewBox="0 0 24 24"><defs><linearGradient id="gemini-grad" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#4C8DF6"/><stop offset="100%" stopColor="#B06AF5"/></linearGradient></defs><path d="M12 2C12 2 12.6 8.8 15.3 11.5C18 14.2 22 14.8 22 14.8C22 14.8 18 15.4 15.3 18.1C12.6 20.8 12 22 12 22C12 22 11.4 20.8 8.7 18.1C6 15.4 2 14.8 2 14.8C2 14.8 6 14.2 8.7 11.5C11.4 8.8 12 2 12 2Z" fill="url(#gemini-grad)"/></svg>
                            <span className={`text-[10px] font-bold ${t.textMain}`}>Gemini</span>
                        </a>
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className={`flex flex-col items-center gap-1.5 py-3 rounded-xl ${t.btnBg} hover:opacity-80 transition-opacity`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={t.textMain}><path d="M9.5 3.5C7 2 4.5 3.5 4 6C2.5 6.8 1.8 9 2.5 11C1.5 13 2.3 15.5 4.3 16.7C4.3 19.2 6.4 21 8.8 20.7C10.3 22 12.7 22 14.2 20.7C16.7 21 18.8 19.2 18.8 16.7C20.8 15.5 21.5 13 20.5 11C21.2 9 20.5 6.8 19 6C18.5 3.5 16 2 13.5 3.5C11.9 2.5 10.1 2.5 9.5 3.5Z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/></svg>
                            <span className={`text-[10px] font-bold ${t.textMain}`}>ChatGPT</span>
                        </a>
                        <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className={`flex flex-col items-center gap-1.5 py-3 rounded-xl ${t.btnBg} hover:opacity-80 transition-opacity`}>
                            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M6.5 4L2 20H5.5L6.6 16H11.9L13 20H16.5L12 4H6.5ZM7.5 13L9.25 7L11 13H7.5Z" fill="#D97757"/><path d="M15.5 4L20 20H16.5L15.4 16H14.5L15.7 12H16.4L15.1 7.4L15.5 4Z" fill="#D97757" opacity="0.55"/></svg>
                            <span className={`text-[10px] font-bold ${t.textMain}`}>Claude</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* KEPRIBADIAN COACH RAIGA */}
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                  <MessageCircle size={16} /> Kepribadian Coach Raiga
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { key: 'santai', emoji: '😄' },
                        { key: 'galak', emoji: '😠' },
                        { key: 'serius', emoji: '😐' },
                    ].map(p => (
                        <button
                            key={p.key}
                            onClick={() => setRaigaPersona(p.key)}
                            title={PERSONA_PRESETS[p.key]?.label}
                            className={`py-3 rounded-xl text-2xl transition-all flex items-center justify-center ${raigaPersona === p.key ? `${t.bgAccent} shadow-sm` : t.btnBg}`}
                        >
                            {p.emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* MEMORI COACH RAIGA */}
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-2`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                  <Brain size={16} /> Memori Coach Raiga
                </p>
                {(!raigaMemory || raigaMemory.length === 0) ? (
                    <p className={`text-xs ${t.textMuted} leading-relaxed`}>
                        Belum ada memori tersimpan. Tandai pesan di chat (ikon bookmark) untuk menyimpannya ke sini. Coach Raiga akan mengingatnya.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {raigaMemory.map((m, i) => (
                            <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl ${t.inputBg} border ${t.border}`}>
                                <p className={`flex-1 text-xs ${t.textMain} leading-relaxed`}>{m}</p>
                                <button
                                    onClick={() => setRaigaMemory(raigaMemory.filter((_, idx) => idx !== i))}
                                    className="p-1 rounded-full text-neutral-500 hover:text-rose-500 transition-colors shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-2`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}>Rutinitas Latihan</p>
                {/* Waktu Latihan */}
                <div className="flex justify-between items-center py-2">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    <Clock size={20} className={t.textAccent}/> 
                    <span className="font-bold">Jam Default</span>
                </div>
                <input
                    type="time"
                    lang="en-GB"
                    value={defaultReminderTime}
                    onChange={(e) => setDefaultReminderTime(e.target.value)}
                    className={`w-32 text-center font-bold px-2 py-1.5 rounded-xl outline-none border ${t.border} focus:ring-2 ${t.ringAccent} ${t.inputBg} ${t.textMain}`}
                />
                </div>

                {/* Notifikasi Toggle */}
                <div className="flex justify-between items-center py-2 border-t border-black/5 dark:border-white/5">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                    {reminderEnabled ? <Bell size={20} className={t.textAccent}/> : <BellOff size={20} className={t.textMuted}/>}
                    <span className="font-bold">Pengingat</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: reminderEnabled ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setReminderEnabled(false)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${!reminderEnabled ? 'text-white' : t.textMuted}`}><BellOff size={16} /></button>
                    <button onClick={() => setReminderEnabled(true)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${reminderEnabled ? 'text-white' : t.textMuted}`}><Bell size={16} /></button>
                </div>
                </div>
            </div>

            {/* INTEGRASI KESEHATAN */}
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}><Activity size={16}/> Koneksi Data Kesehatan</p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className={`font-bold ${t.textMain}`}>Health Connect</span>
                        <button 
                            onClick={() => handleToggleApp('healthconnect')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${connectedApps?.healthconnect ? t.bgAccent + ' text-white shadow-sm' : t.btnBg + ' ' + t.textMuted}`}
                        >
                            {connectedApps?.healthconnect ? 'Terhubung' : 'Hubungkan'}
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3">
                        <span className={`font-bold ${t.textMain}`}>Apple Health</span>
                        <button 
                            onClick={() => handleToggleApp('applehealth')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${connectedApps?.applehealth ? t.bgAccent + ' text-white shadow-sm' : t.btnBg + ' ' + t.textMuted}`}
                        >
                            {connectedApps?.applehealth ? 'Terhubung' : 'Hubungkan'}
                        </button>
                    </div>
                </div>
            </div>


            {/* FITUR EXPORT / IMPORT JSON */}
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}><Download size={16}/> Backup & Restore Data</p>
                <div className="flex space-x-3">
                <button onClick={exportData} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold ${t.btnBg} ${t.textMain} body-lg border ${t.border} active:scale-95 transition-all`}>
                    <Download size={16} /> <span>Export</span>
                </button>
                <label className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold ${t.btnBg} ${t.textMain} body-lg cursor-pointer border ${t.border} active:scale-95 transition-all`}>
                    <Upload size={16} /> <span>Import</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
                </div>
            </div>

            {/* ZONA ADMIN (Hanya terlihat jika email cocok) */}
            {user?.email === 'untheryan@gmail.com' && (
                <div className={`p-4 rounded-2xl border border-red-500/30 bg-red-500/10 space-y-3 mt-4 mb-8`}>
                    <p className={`body-md text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2 font-bold`}><ShieldAlert size={16}/> Superadmin Mode</p>
                    <button 
                        onClick={() => setShowAdminDashboard(true)} 
                        className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-colors`}
                    >
                        <ShieldAlert size={16} /> <span>Buka Dasbor Admin</span>
                    </button>
                </div>
            )}

            {/* ZONA BERBAHAYA */}
            <div className={`p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 mt-8`}>
                <p className={`body-md text-rose-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2`}>
                   Zona Berbahaya
                </p>
                <div className="space-y-2">
                   <p className={`text-[10px] ${t.textMuted} leading-tight`}>
                     Tindakan ini tidak bisa dibatalkan. Semua data riwayat latihan, program, dan pengaturan Anda akan dihapus secara permanen dari server.
                   </p>
                   <button 
                     onClick={() => {
                         setConfirmModal({
                             isOpen: true,
                             title: '⚠️ Hapus Akun Permanen',
                             message: 'Semua data latihan, program, dan riwayatmu akan dihapus selamanya. Tindakan ini tidak bisa dibatalkan.',
                             onConfirm: () => {
                                 setConfirmModal({
                                     isOpen: true,
                                     title: 'Konfirmasi Terakhir',
                                     message: 'Ini adalah langkah terakhir. Akun dan semua datamu akan dihapus permanen sekarang?',
                                     onConfirm: () => handleDeleteAccount(),
                                 });
                             },
                         });
                      }}
                     className="w-full py-3 rounded-xl font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 text-sm shadow-md active:scale-95 transition-all mt-4"
                   >
                     Hapus Akun Permanen
                   </button>
                </div>
            </div>
          </div>
        )}
        
        {/* APP VERSION */}
        <div className="py-6 text-center">
            <p className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-widest`}>LOGYM App v1.2.0</p>
            <p className={`text-[9px] opacity-40 mt-1 ${t.textMuted}`}>Dibangun dengan ♥️ oleh Andrian Chun &copy; 2026</p>
        </div>
      </div>
      
      <BugReportModal showModal={showBugReport} setShowModal={setShowBugReport} user={user} />
      <AdminDashboardModal showModal={showAdminDashboard} setShowModal={setShowAdminDashboard} user={user} />
    </div>
  );
}
