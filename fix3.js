import fs from 'fs';
const file = 'e:/CODING/lyfit.app/src/pages/DashboardTab.jsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const missingCode = `                         )}
                     </div>
                 </div>

                 {/* Tidur */}
                 <div className="flex flex-col h-full">
                     <div className="flex items-center space-x-1.5 mb-1"><span className="w-5 h-5 rounded-full bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0"><Moon size={11}/></span> <span className={\`caption \${t.textMuted} capitalize\`}>Tidur</span></div>
                     <div className="flex flex-col flex-1 justify-end">
                         <div className="flex items-baseline space-x-1 mb-2">
                             <span className={\`text-3xl font-black \${t.textMain} leading-none tracking-tight\`}>{bioData.sleep || '-'}</span>
                         </div>
                         <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
                             <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: \`\${Math.min(100, (parseSleepHours(bioData.sleep) / (activityTargets?.sleep || 8)) * 100)}%\` }}></div>
                         </div>
                     </div>
                 </div>

                 {/* Skor Energi */}
                 <div className="flex flex-col h-full text-right items-end">
                     <div className="flex items-center justify-end space-x-1.5 mb-1"><span className={\`caption \${t.textMuted} capitalize\`}>Skor Energi</span> <span className="w-5 h-5 rounded-full bg-slate-400/15 text-slate-400 flex items-center justify-center shrink-0"><Zap size={11}/></span></div>
                     <div className="flex flex-col flex-1 justify-end w-full">
                         <div className="flex items-baseline justify-end space-x-1 mb-2">
                              <span className={\`text-3xl font-black \${t.textMain} leading-none tracking-tight\`}>{bioData.energyScore > 0 ? formatNumber(bioData.energyScore, language) : '-'}</span>
                             <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">/ 100</span>
                         </div>`.split('\n');

// 0-indexed line 812 is after line 812 "spacer</p>"
// We insert exactly after index 811
lines.splice(812, 0, ...missingCode);
fs.writeFileSync(file, lines.join('\n'));
console.log('Inserted successfully!');
