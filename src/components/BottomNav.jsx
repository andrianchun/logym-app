import React from 'react';
import { Dumbbell, Calendar, ClipboardList, Database, LayoutDashboard } from 'lucide-react';

// Pindah tab sengaja tanpa suara dan tanpa animasi geser agar responsif instan (0ms).
const BottomNav = ({ t, lang, activeTab, setActiveTab, setIsEditingMode }) => {
  const isEN = lang?.id === 'EN' || lang?.id === 'en';
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: isEN ? 'Home' : 'Dasbor' },
    { id: 'workout', icon: Dumbbell, label: lang?.workout || 'Latihan' },
    { id: 'calendar', icon: Calendar, label: lang?.calendar || 'Kalender' },
    { id: 'program', icon: ClipboardList, label: 'Program' },
    { id: 'database', icon: Database, label: 'Database' },
  ];

  const handleTabClick = (id) => {
    if (activeTab === id && id === 'calendar') {
      setIsEditingMode(prev => !prev);
    } else if (activeTab !== id) {
      setActiveTab(id);
      setIsEditingMode(false);
    } else {
      setIsEditingMode(false);
    }
  };

  return (
    <div data-bottom-nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe px-2 pointer-events-none select-none">
      <div className={`pointer-events-auto grid grid-cols-5 items-center max-w-2xl mx-auto mb-3 px-1 py-1.5 rounded-[28px] border ${t.border} ${t.bottomNavBg || t.navBg} ${t.glow} gap-0.5 touch-manipulation`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center h-[54px] rounded-[22px] border touch-manipulation px-0.5 overflow-hidden active:opacity-80 ${isActive ? `${t.bgAccentSoft} ${t.navBorderActive} ${t.navIconActive}` : `bg-transparent border-transparent ${t.navIconInactive}`}`}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.4 : 1.9} className="shrink-0" />
              <span className={`text-xs leading-none mt-1 whitespace-nowrap truncate max-w-full ${isActive ? 'font-bold' : 'font-medium opacity-75'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(BottomNav);