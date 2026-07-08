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
      <div className={`pointer-events-auto flex justify-around items-center max-w-2xl mx-auto mb-3 px-1 py-2 rounded-[28px] border ${t.border} ${t.navBg} ${t.glow} transition-colors duration-300`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center justify-center w-full py-1.5 space-y-0.5 group"
            >
              {isActive && (
                <span className={`absolute inset-x-0 inset-y-0.5 rounded-2xl ${t.bgAccentSoft} border ${t.borderAccentSoft}`} />
              )}
              <span className={`relative flex flex-col items-center space-y-0.5 transition-all duration-300 ${isActive ? t.navIconActive + ' scale-105' : t.navIconInactive + ' group-hover:' + t.textMuted}`}>
                <tab.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[8px] font-bold uppercase tracking-wider">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;