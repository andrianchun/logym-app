const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'CalendarTab.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
if (!content.includes('PanoramicSlider')) {
  content = content.replace("import { getLocalYMD } from '../data/constants';", "import { getLocalYMD } from '../data/constants';\nimport PanoramicSlider from '../components/PanoramicSlider';");
}

// 2. Replace grid logic
const oldGridLogic = `  let gridCells = [];
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });

  if (calendarMode === 'monthly') {
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     const firstDayOfMonth = new Date(year, month, 1).getDay();
     for (let i=0; i<firstDayOfMonth; i++) gridCells.push(null);
     for (let i=1; i<=daysInMonth; i++) gridCells.push(new Date(year, month, i));
  } else {
     const currentDayOfWeek = calendarDate.getDay();
     const startOfWeek = new Date(calendarDate);
     startOfWeek.setDate(calendarDate.getDate() - currentDayOfWeek);
     for (let i=0; i<7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        gridCells.push(d);
     }
  }`;

const newGridLogic = `  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });

  const generateGridCells = (date, mode) => {
    let cells = [];
    const y = date.getFullYear();
    const m = date.getMonth();
    if (mode === 'monthly') {
       const daysInMonth = new Date(y, m + 1, 0).getDate();
       const firstDayOfMonth = new Date(y, m, 1).getDay();
       for (let i=0; i<firstDayOfMonth; i++) cells.push(null);
       for (let i=1; i<=daysInMonth; i++) cells.push(new Date(y, m, i));
    } else {
       const currentDayOfWeek = date.getDay();
       const startOfWeek = new Date(date);
       startOfWeek.setDate(date.getDate() - currentDayOfWeek);
       for (let i=0; i<7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          cells.push(d);
       }
    }
    return cells;
  };

  const renderCalendarGrid = (panelType) => {
      const d = new Date(calendarDate);
      if (panelType === 'prev') {
          if (calendarMode === 'weekly') d.setDate(d.getDate() - 7);
          else d.setMonth(d.getMonth() - 1);
      } else if (panelType === 'next') {
          if (calendarMode === 'weekly') d.setDate(d.getDate() + 7);
          else d.setMonth(d.getMonth() + 1);
      }

      const gridCells = generateGridCells(d, calendarMode);
      
      return (
        <div className="px-0.5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (<div key={i} className={\`text-center caption uppercase \${t.textMuted}\`}>{day}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {gridCells.map((dateObj, idx) => {
            if (!dateObj) return <div key={\`blank-\${idx}\`} className="p-1 sm:p-2"></div>;
            
            const dateKey = getLocalYMD(dateObj);
            const day = dateObj.getDate();
            const workouts = getDayWorkouts(dateKey); 
            const isToday = dateKey === todayStr; 
            const isSelected = dateKey === selectedDate;
            const completedCount = workouts.filter(w => checkIsCompletedStrict(w, dateKey)).length;
            
            let cellStyle = \`aspect-square p-0.5 sm:p-1 relative flex flex-col items-center justify-start rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-500/30 \${t.textMain}\`;
            if (isSelected) cellStyle += \` ring-2 ring-offset-2 ring-offset-\${theme==='dark'?'black':'white'} \${t.ringAccent}\`;
            
            const spanClass = isToday 
               ? \`flex items-center justify-center w-6 h-6 rounded-full \${t.bgAccent} text-white font-black body-md\`
               : \`body-md font-medium \${workouts.length > 0 && completedCount === workouts.length ? t.textAccent : ''}\`;
            
            return (
              <div 
                key={dateKey} 
                onClick={() => { playSoundEffect('click', soundEnabled); setSelectedDate(dateKey); setShowProgramSelect(false); setShowActionMenu(null); }} 
                draggable={workouts.length > 0}
                onDragStart={(e) => handleDragStart(e, dateKey)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, dateKey)}
                className={cellStyle}
              >
                <span className={spanClass}>{day}</span>
                
                {workouts.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-1">
                    {workouts.map(w => (
                      <div key={w.id} className={\`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full \${checkIsCompletedStrict(w, dateKey) ? (theme === 'dark' ? 'bg-[#41759b]' : 'bg-[#B79347]') : (theme === 'dark' ? 'bg-[#294c65]' : 'bg-[#CBB989]')}\`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      );
  };`;
content = content.replace(oldGridLogic, newGridLogic);

// 3. Replace JSX for grid
const oldGridJSX = /<div\s+onTouchStart=\{onTouchStartEvent\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const newGridJSX = `<PanoramicSlider
          onSwipeLeft={() => { playSoundEffect('click', soundEnabled); setCalendarDate(new Date(year, month + (calendarMode==='weekly'?0:1), calendarMode==='weekly'?calendarDate.getDate()+7:1)); }}
          onSwipeRight={() => { playSoundEffect('click', soundEnabled); setCalendarDate(new Date(year, month - (calendarMode==='weekly'?0:1), calendarMode==='weekly'?calendarDate.getDate()-7:1)); }}
          onUpSwipe={() => { if (calendarMode === 'monthly') { setCalendarDate(new Date(selectedDate)); setCalendarMode('weekly'); playSoundEffect('click', soundEnabled); } }}
          onDownSwipe={() => { if (calendarMode === 'weekly') { setCalendarMode('monthly'); playSoundEffect('click', soundEnabled); } }}
          renderPanel={renderCalendarGrid}
        />`;
content = content.replace(oldGridJSX, newGridJSX);


// 4. Workout Details Logic
const oldSelectedWorkoutsLogicRegex = /let selectedWorkouts = \[\.\.\.getDayWorkouts\(selectedDate\)\];[\s\S]*?\}\n/;

const newSelectedWorkoutsLogic = `  const getSelectedWorkoutsForDate = (dateStr) => {
    let wks = [...getDayWorkouts(dateStr)];
    const dData = history[dateStr] || {};
    if (dData._activeSession?.extraExercises?.length > 0 && !wks.some(w => w.programId === 'adhoc')) {
      wks.push({
        id: 'virtual_adhoc',
        programId: 'adhoc',
        programName: 'Sesi Ekstra',
        status: 'planned',
        log: dData._activeSession.exerciseLogs || {},
        exercises: dData._activeSession.extraExercises
      });
    }
    return wks;
  };
  const selectedWorkouts = getSelectedWorkoutsForDate(selectedDate);
`;
content = content.replace(oldSelectedWorkoutsLogicRegex, newSelectedWorkoutsLogic);


// 5. Replace Workout Details Scroll Area
const startIndex = content.indexOf('{selectedWorkouts.length > 0 && (');
const endIndex = content.indexOf('          {!showProgramSelect ? (');
if (startIndex !== -1 && endIndex !== -1) {
  const blockToReplace = content.substring(startIndex, endIndex);

  const newWorkoutsSliderJSX = `{selectedWorkouts.length > 0 && (
            <div className="-mx-3 sm:-mx-6">
            <PanoramicSlider
               onSwipeLeft={() => { 
                   const d = new Date(selectedDate);
                   d.setDate(d.getDate() + 1);
                   setSelectedDate(getLocalYMD(d));
                   setCalendarDate(new Date(d));
                   playSoundEffect('click', soundEnabled);
               }}
               onSwipeRight={() => {
                   const d = new Date(selectedDate);
                   d.setDate(d.getDate() - 1);
                   setSelectedDate(getLocalYMD(d));
                   setCalendarDate(new Date(d));
                   playSoundEffect('click', soundEnabled);
               }}
               renderPanel={(panelType) => {
                   const d = new Date(selectedDate);
                   if (panelType === 'prev') d.setDate(d.getDate() - 1);
                   else if (panelType === 'next') d.setDate(d.getDate() + 1);
                   const targetDateStr = getLocalYMD(d);
                   const panelWorkouts = getSelectedWorkoutsForDate(targetDateStr);

                   if (panelWorkouts.length === 0) return <div className="p-4 text-center caption opacity-50 px-3 sm:px-6">Tidak ada jadwal</div>;

                   return (
                     <div className="space-y-4 mb-6 px-3 sm:px-6">
                        {panelWorkouts.map(w => {
                           const isCompleted = checkIsCompletedStrict(w, targetDateStr);
                           const isExpanded = expandedWorkoutId === w.id;
                           const prog = w.programId === 'adhoc' 
                             ? { id: 'adhoc', name: w.programName || 'Sesi Ekstra', exercises: w.exercises || [] }
                             : programs.find(p => p.id === w.programId);
                            
                           const dData = history[targetDateStr] || {};
                           const sessionLogs = (dData._activeSession && dData._activeSession.exerciseLogs && Object.keys(dData._activeSession.exerciseLogs).length > 0) ? dData._activeSession.exerciseLogs : exerciseLogs;
                           const sessionSkipped = (dData._activeSession && dData._activeSession.skippedExercises) ? dData._activeSession.skippedExercises : skippedExercises;
                           const logsToUse = (w.log && Object.keys(w.log).length > 0) ? w.log : sessionLogs;
                           const skippedToUse = w.skipped || sessionSkipped;
          
                            return (
                             <div key={w.id} className={\`p-4 rounded-2xl \${isCompleted ? 'border ' + t.borderAccentSoft + ' ' + t.bgAccentSoft : 'border-2 border-dashed ' + t.borderAccentSoft + ' bg-black/5 dark:bg-white/5'} flex flex-col relative transition-all \${isExpanded ? 'ring-2 ' + t.ringAccent : 'hover:scale-[1.02] cursor-pointer'}\`} onClick={() => { if(!isExpanded) { playSoundEffect('click', soundEnabled); setExpandedWorkoutId(w.id); setCalendarDate(new Date(targetDateStr)); setCalendarMode('weekly'); } }}>
                                <button onClick={(e) => { e.stopPropagation(); removeWorkout(w.id); }} className="absolute top-3 right-3 p-1.5 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors z-10"><Trash2 size={16} /></button>
                                <div className="flex items-center mb-2 pr-8">
                                  {isCompleted ? <CheckCircle size={18} className={\`\${t.textAccent} mr-2\`} /> : <PlayCircle size={18} className={\`\${t.textMuted} mr-2\`} />}
                                  <span className="font-black text-left">{w.programName}</span>
                                </div>
                                <div className="flex flex-col gap-1 mt-1">
                                  {isCompleted ? (
                                    <div className="caption opacity-60 mt-2 flex flex-wrap items-center gap-2">
                                      <span>Selesai: {w.timestamp}</span>
                                      <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                                      <span>{w.duration || '00:00'} menit</span>
                                    </div>
                                  ) : (
                                    <div className="caption opacity-60 mt-1">Status: Direncanakan</div>
                                  )}
                                </div>
                                {isExpanded && (
                                  <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="space-y-1.5 mb-4">
                                      {prog?.exercises?.map((ex, idx) => {
                                         const exLogKey = \`\${ex.id}-\${w.id}\`;
                                         const exLogs = logsToUse?.[exLogKey] || logsToUse?.[ex.id];
                                         const doneSets = exLogs ? exLogs.filter(s => s.done && !s.skipped) : [];
                                         const isSkipped = skippedToUse?.[exLogKey] || skippedToUse?.[ex.id];
                                         const isNotDoneWhenCompleted = isCompleted && doneSets.length === 0;
                                         const shouldShowNotDone = (isSkipped || isNotDoneWhenCompleted) && doneSets.length === 0;
          
                                         if (shouldShowNotDone) {
                                            return (
                                              <div key={ex.id} className={\`p-2 px-3 rounded-lg border \${t.border} bg-black/5 dark:bg-white/5 opacity-50 flex justify-between items-center\`}>
                                                <div className="body-md truncate mr-2 line-through opacity-70">{idx + 1}. {ex.name}</div>
                                                <div className="text-[10px] font-bold text-rose-500">{isSkipped ? 'Di-skip' : 'Tidak Dikerjakan'}</div>
                                              </div>
                                            );
                                         }
          
                                         let textStr = "";
                                         if (doneSets.length > 0) {
                                            const maxW = Math.max(...doneSets.map(s => Number(s.w) || 0)) || ex.defaultWeight || 0;
                                            const maxR = Math.max(...doneSets.map(s => Number(s.r) || 0)) || ex.reps || 0;
                                            const maxD = Math.max(...doneSets.map(s => Number(s.d) || 0)) || ex.duration || 0;
                                            if (ex.type === 'time') textStr = \`\${doneSets.length} x \${maxD}s\`;
                                            else if (ex.type === 'reps') textStr = \`\${doneSets.length} x \${maxR}\`;
                                            else textStr = \`\${doneSets.length} x \${maxR} x \${maxW} kg\`;
                                         } else textStr = "Belum dimulai";
          
                                         return (
                                           <div key={ex.id} className={\`p-2 px-3 rounded-lg border \${t.border} bg-black/5 dark:bg-white/5 flex justify-between items-center\`}>
                                             <div className="body-md truncate mr-2">{idx + 1}. {ex.name}</div>
                                             <div className="body-md font-mono whitespace-nowrap opacity-80">{textStr}</div>
                                           </div>
                                         );
                                      })}
                                    </div>
                                    <div className="flex gap-2">
                                       <button onClick={(e) => { e.stopPropagation(); setExpandedWorkoutId(null); setCalendarMode('monthly'); }} className={\`flex-1 py-3 rounded-xl border border-dashed \${t.border} body-lg font-bold\`}>Tutup</button>
                                       <button onClick={(e) => { e.stopPropagation(); const hasExercises = w.exercises && w.exercises.length > 0; if (!isCompleted && !hasExercises) { playSoundEffect('click', soundEnabled); navigateToWorkoutDate(targetDateStr); } else { handleEditPastWorkout(targetDateStr, w); } }} className={\`flex-[2] py-3 rounded-xl \${t.bgAccent} text-white font-black body-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all\`}>
                                         <Edit2 size={16} /> {isCompleted ? 'Edit Riwayat' : ((w.exercises && w.exercises.length > 0) ? 'Mulai Latihan' : 'Edit Latihan')}
                                       </button>
                                    </div>
                                  </div>
                                )}
                             </div>
                           );
                         })}
                      </div>
                   );
               }}
            />
            </div>
          )}
`;

  content = content.replace(blockToReplace, newWorkoutsSliderJSX);
}

// Cleanup old swipe events attributes
content = content.replace(/onTouchStart=\{onDetTouchStart\}/g, '');
content = content.replace(/onTouchMove=\{onDetTouchMove\}/g, '');
content = content.replace(/onTouchEnd=\{onDetTouchEnd\}/g, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring completed successfully!');
