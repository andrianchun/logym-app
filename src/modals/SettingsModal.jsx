import React from 'react';
import { X, Moon, Sun, Globe, Volume2, VolumeX, Timer, Download, Upload, CalendarDays, Bell, BellOff, Clock, Activity, Scale } from 'lucide-react';
import SwipeInput from '../components/SwipeInput';

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
  user, handleLogout,
  biometricStandard, setBiometricStandard,
  unitSystem, setUnitSystem
}) {
  if (!showSettings) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`}
      onClick={() => setShowSettings(false)}
    >
      <div 
        className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border}`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER MODAL */}
        <div className={`flex justify-between items-center px-6 py-4 border-b ${t.border}`}>
          <h2 className="h1">{lang.settings}</h2>
          <button onClick={() => setShowSettings(false)} className={`p-2 rounded-full ${t.btnBg} hover:opacity-80 transition-opacity`}>
            <X size={20} className={t.textMain} />
          </button>
        </div>

        {/* BODY MODAL (BISA DI-SCROLL) */}
        <div className="px-6 py-4 overflow-y-auto space-y-6">

          {/* 1. PREFERENSI APLIKASI */}
          <div className="space-y-6">
            
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
            <div className="flex justify-between items-center py-2">
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
            <div className="flex justify-between items-center py-2">
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

            {/* Timer Istirahat Default */}
            <div className="flex justify-between items-center py-2">
              <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                <Timer size={20} className={t.textAccent}/> 
                <span className="font-bold">Rest Default</span>
              </div>
              <div className="flex items-center justify-end gap-2 pr-1 shrink-0">
                <SwipeInput
                    value={defaultRestTime}
                    onChange={(val) => setDefaultRestTime(val)}
                    soundEnabled={soundEnabled}
                    className={`w-20 text-center font-bold px-1 py-2 rounded-xl outline-none border ${t.border} focus:ring-2 ${t.ringAccent} ${t.inputBg} ${t.textMain}`}
                />
                <span className={`body-sm font-bold ${t.textMuted}`}>detik</span>
              </div>
            </div>

            {/* Awal Minggu (Week Start) */}
            <div className="flex justify-between items-center py-2">
              <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                <CalendarDays size={20} className={t.textAccent}/> 
                <span className="font-bold">Awal Minggu</span>
              </div>
              <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                 <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: weekStartDay === 1 ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                 <button onClick={() => setWeekStartDay(0)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${weekStartDay === 0 ? 'text-white' : t.textMuted} text-xs font-bold`}>Minggu</button>
                 <button onClick={() => setWeekStartDay(1)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${weekStartDay === 1 ? 'text-white' : t.textMuted} text-xs font-bold`}>Senin</button>
              </div>
            </div>

            {/* Pengingat Latihan */}
            <div className="flex flex-col space-y-2 py-2">
              <div className="flex justify-between items-center">
                <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                  {reminderEnabled ? <Bell size={20} className={t.textAccent}/> : <BellOff size={20} className={t.textMuted}/>}
                  <span className="font-bold">Pengingat</span>
                </div>
                <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                  <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: reminderEnabled ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                  <button onClick={() => setReminderEnabled(false)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${!reminderEnabled ? 'text-white' : t.textMuted} text-xs font-bold`}>MATI</button>
                  <button onClick={() => setReminderEnabled(true)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${reminderEnabled ? 'text-white' : t.textMuted} text-xs font-bold`}>NYALA</button>
                </div>
              </div>
              {reminderEnabled && (
                <div className={`flex justify-between items-center pl-8 pt-1 animate-in slide-in-from-top-2 duration-300`}>
                  <span className={`body-sm ${t.textMuted}`}>Waktu</span>
                  <input
                    type="time"
                    lang="en-GB"
                    value={defaultReminderTime}
                    onChange={(e) => setDefaultReminderTime(e.target.value)}
                    className={`w-32 text-center font-bold px-2 py-1.5 rounded-xl outline-none border ${t.border} focus:ring-2 ${t.ringAccent} ${t.inputBg} ${t.textMain}`}
                  />
                </div>
              )}
            </div>

            {/* Standar Biometrik */}
            <div className="flex justify-between items-center py-2">
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

            {/* Sistem Satuan */}
            <div className="flex justify-between items-center py-2">
              <div className={`flex items-center space-x-3 ${t.textMain} shrink-0`}>
                <Scale size={20} className={t.textAccent}/> 
                <span className="font-bold">Sistem Satuan</span>
              </div>
              <div className={`relative flex w-32 p-1 rounded-full ${t.btnBg} shrink-0`}>
                 <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: unitSystem === 'imperial' ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                 <button onClick={() => setUnitSystem('metric')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${unitSystem === 'metric' ? 'text-white' : t.textMuted} text-xs font-bold`}>Kg/Cm</button>
                 <button onClick={() => setUnitSystem('imperial')} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${unitSystem === 'imperial' ? 'text-white' : t.textMuted} text-xs font-bold`}>Lbs/Ft</button>
              </div>
            </div>

          </div>

          <hr className={t.border} />

          {/* 2. FITUR EXPORT / IMPORT JSON */}
          <div className={`p-5 rounded-2xl border ${t.border} ${t.bgApp} space-y-3`}>
            <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2`}>Backup & Restore Data</p>
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
          
        </div>
      </div>
    </div>
  );
}