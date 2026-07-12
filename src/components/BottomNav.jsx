import React from 'react';
import { Dumbbell, Calendar, LineChart, ClipboardList, Database, LayoutDashboard } from 'lucide-react';

const BottomNav = ({ t, lang, activeTab, setActiveTab, setIsEditingMode, soundEnabled, playSoundEffect }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: lang.id === 'EN' ? 'Dashboard' : 'Dasbor' },
    { id: 'workout', icon: Dumbbell, label: lang.workout || 'Latihan' },
    { id: 'calendar', icon: Calendar, label: lang.calendar || 'Kalender' },
    { id: 'program', icon: ClipboardList, label: 'Program' },
    { id: 'database', icon: Database, label: 'Database' },
  ];

  const handleTabClick = (id) => {
    playSoundEffect('click', soundEnabled);
    setActiveTab(id);
    setIsEditingMode(false);
  };

  return (
    <div data-bottom-nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe px-3 pointer-events-none">
      <div className={`pointer-events-auto flex justify-between items-center max-w-2xl mx-auto mb-3 px-1.5 py-1.5 rounded-[28px] border ${t.border} ${t.navBg} ${t.glow} transition-colors duration-300 gap-1`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex items-center justify-center h-[52px] rounded-[22px] transition-all duration-300 border ${isActive ? `flex-1 ${t.bgAccentSoft} ${t.navBorderActive} px-3` : 'w-[52px] bg-transparent border-transparent'} group`}
            >
              <span className={`flex items-center justify-center transition-all duration-300 ${isActive ? t.navIconActive : t.navIconInactive + ' group-hover:' + t.textMuted}`}>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className={`font-black text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${isActive ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0 overflow-hidden ml-0'}`}>
                  {tab.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;