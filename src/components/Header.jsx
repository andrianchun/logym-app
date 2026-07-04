import React, { useState, useEffect } from 'react';
import { User, Settings, WifiOff, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import NotificationPanel from './NotificationPanel';

const Header = ({ t, theme, user, showSettings, setShowSettings, setShowProfileModal, soundEnabled, playSoundEffect, activeTab, setActiveTab, setConfirmModal, isOffline, onNotifClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
      // Optional: if we want to show a browser push notification, we could do it here
      // But we will stick to in-app bell badge for now as requested
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-40 ${t?.navBg || 'bg-white'} border-b ${t?.border || 'border-gray-200'} px-4 flex justify-between items-center transition-colors duration-300 relative`}
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
      
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
        
        {/* Tombol Notifikasi */}
        {user && (
          <button
            onClick={() => { if(playSoundEffect) playSoundEffect('click', soundEnabled); setShowNotifications(true); }}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${t?.btnBg || 'bg-gray-100'} ${t?.textMuted || 'text-gray-500'} hover:${t?.textAccent || 'text-sky-400'}`}
            title="Notifikasi"
          >
            <Bell size={22} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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

      {showNotifications && (
        <NotificationPanel
          user={user}
          isDark={isDark}
          t={t}
          onClose={() => setShowNotifications(false)}
          onNotifClick={onNotifClick}
        />
      )}
    </header>
  );
};

export default Header;