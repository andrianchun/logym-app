import React from 'react';
import { Dumbbell, Calendar, LineChart, ClipboardList, Database, LayoutDashboard } from 'lucide-react';

// Pindah tab sengaja tanpa suara — lihat handleGlobalTouchEnd di App.jsx.
const BottomNav = ({ t, lang, activeTab, setActiveTab, setIsEditingMode }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: lang.id === 'EN' ? 'Dashboard' : 'Dasbor' },
    { id: 'workout', icon: Dumbbell, label: lang.workout || 'Latihan' },
    { id: 'calendar', icon: Calendar, label: lang.calendar || 'Kalender' },
    { id: 'program', icon: ClipboardList, label: 'Program' },
    { id: 'database', icon: Database, label: 'Database' },
  ];

  const handleTabClick = (id) => {
    if (activeTab === id && id === 'calendar') {
        setIsEditingMode(prev => !prev);
    } else {
        setActiveTab(id);
        setIsEditingMode(false);
    }
  };

  return (
    <div data-bottom-nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe px-3 pointer-events-none">
      <div className={`pointer-events-auto flex justify-between items-center max-w-2xl mx-auto mb-3 px-1.5 py-1.5 rounded-[28px] border ${t.border} ${t.navBg} ${t.glow} transition-colors duration-150 gap-1`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex items-center justify-center h-[52px] rounded-[22px] active:scale-95 transition-colors duration-150 border ${isActive ? `flex-[1.8] min-w-0 ${t.bgAccentSoft} ${t.navBorderActive} px-2` : 'flex-1 min-w-0 bg-transparent border-transparent px-1'} group overflow-hidden`}
            >
              <span className={`flex items-center justify-center min-w-0 ${isActive ? t.navIconActive : t.navIconInactive + ' group-hover:' + t.textMuted}`}>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                {isActive && (
                  <span className="font-black text-xs sm:text-xs uppercase tracking-wider whitespace-nowrap ml-1.5 animate-in fade-in duration-100">
                    {tab.label}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(BottomNav);