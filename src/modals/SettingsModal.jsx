import React, { useState } from 'react';
import { X, Moon, Sun, Globe, Volume2, VolumeX, Timer, Download, Upload, CalendarDays, Bell, BellOff, Clock, Activity, Scale, Ruler, Thermometer, Database } from 'lucide-react';
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
  user, handleLogout, handleDeleteAccount,
  setConfirmModal,
  biometricStandard, setBiometricStandard,
  units, setUnits,
  userGeminiApiKey, setUserGeminiApiKey,
  connectedApps, setConnectedApps
}) {
  const [activeTab, setActiveTab] = useState('preferensi');

  if (!showSettings) return null;

  const handleToggleApp = (appKey) => {
     setConnectedApps(prev => {
         const next = { ...prev, [appKey]: !prev[appKey] };
         localStorage.setItem('lyfit_connectedApps', JSON.stringify(next));
         return next;
     });
  };

  return (
    <div className={`fixed inset-0 z-[100] ${t.bgApp} flex flex-col animate-in slide-in-from-bottom-full duration-300`}>
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
          <button onClick={() => setActiveTab('satuan')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap px-4 transition-colors ${activeTab === 'satuan' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Satuan Unit</button>
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
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: weekStartDay === 1 ? 'translateX(100%)' : 'translateX(0)', left: '4px' }}></div>
                    <button onClick={() => setWeekStartDay(0)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${weekStartDay === 0 ? 'text-white' : t.textMuted} text-xs font-bold`}>Minggu</button>
                    <button onClick={() => setWeekStartDay(1)} className={`flex flex-1 justify-center items-center py-1.5 rounded-full relative z-10 transition-colors duration-300 ${weekStartDay === 1 ? 'text-white' : t.textMuted} text-xs font-bold`}>Senin</button>
                </div>
                </div>
            </div>

          </div>
        )}

        {/* TAB 2: SATUAN UNIT */}
        {activeTab === 'satuan' && (
          <div className="space-y-4 animate-in fade-in duration-300">
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

        {/* TAB 3: LANJUTAN */}
        {activeTab === 'lanjutan' && (
          <div className="space-y-4 animate-in fade-in duration-300">
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

            {/* AI SCANNER SETTINGS */}
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3`}>
                <p className={`body-md ${t.textMuted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                <Activity size={16} /> Personal Gemini API Key
                </p>
                <div className="space-y-2">
                <input 
                    type="password"
                    value={userGeminiApiKey || ''}
                    onChange={(e) => setUserGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className={`w-full font-mono text-sm px-4 py-2.5 rounded-xl outline-none border ${t.border} focus:ring-2 ${t.ringAccent} ${t.inputBg} ${t.textMain}`}
                />
                <p className={`text-[10px] ${t.textMuted} leading-tight`}>
                    Biarkan kosong untuk memakai server bawaan. Jika server sedang sibuk, dan kamu tidak mau menunggu, masukkan API Key dari <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">Google AI Studio</a> untuk tetap bisa menikmati layanan AI.
                </p>
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
            <p className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-widest`}>LyFit App v1.2.0</p>
            <p className={`text-[9px] opacity-40 mt-1 ${t.textMuted}`}>Dibangun dengan ♥️ oleh Andrian Chun &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
