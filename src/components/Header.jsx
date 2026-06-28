import React from 'react';
import { User, Settings, Users, WifiOff } from 'lucide-react';

const Header = ({ t, theme, user, showSettings, setShowSettings, setShowProfileModal, soundEnabled, playSoundEffect, activeTab, setActiveTab, setConfirmModal, isOffline }) => {
  return (
    <header 
      className={`sticky top-0 z-40 ${t?.navBg || 'bg-white'} border-b ${t?.border || 'border-gray-200'} px-4 flex justify-between items-center transition-colors duration-300`}
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
    >
      
      {/* BAGIAN KIRI: LOGO */}
      <div className="flex items-center">
        <img 
          src={theme === 'dark' ? "/banner-dark.png" : "/banner-light.png"} 
          alt="Logo LyFit" 
          className="h-8 w-auto object-contain drop-shadow-sm" 
        />
      </div>
      
      {/* BAGIAN KANAN: SETTINGS & PROFIL (SOSIAL) */}
      <div className="flex items-center space-x-3">
        
        {/* Indikator Offline */}
        {isOffline && (
          <button
            onClick={() => {
              if(playSoundEffect) playSoundEffect('click', soundEnabled);
              alert("Mode Luring Aktif: Kamu masih dapat mengedit data. Data akan otomatis disinkronisasi begitu internet kembali terhubung.");
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 bg-red-100 text-red-500 hover:bg-red-200 animate-pulse`}
            title="Anda sedang Offline"
          >
            <WifiOff size={20} strokeWidth={2} />
          </button>
        )}
        {/* Tombol Settings */}
        <button
          onClick={() => { if(playSoundEffect) playSoundEffect('click', soundEnabled); setShowSettings(true); }}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${t?.btnBg || 'bg-gray-100'} ${t?.textMuted || 'text-gray-500'} hover:${t?.textAccent || 'text-sky-400'}`}
          title="Pengaturan Aplikasi"
        >
          <Settings size={22} strokeWidth={2} />
        </button>

        {/* Tombol Profil & Sosial */}
        <button 
          onClick={() => { if(playSoundEffect) playSoundEffect('click', soundEnabled); setShowProfileModal(true); }}
          className="relative rounded-full transition-transform active:scale-95 shadow-sm"
        >
          {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profil" 
                referrerPolicy="no-referrer"
                className={`w-10 h-10 rounded-full object-cover border-2 ${t?.border || 'border-gray-200'}`} 
              />
          ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t?.btnBg || 'bg-gray-100'} border-2 ${t?.border || 'border-gray-200'}`}>
                  <User size={20} className={t?.textMain || 'text-gray-700'} />
              </div>
          )}
        </button>
      </div>

    </header>
  );
};

export default Header;