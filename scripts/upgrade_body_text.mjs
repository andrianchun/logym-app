import fs from 'fs';

// Items that should be text-sm (16px body text) not text-xs (13px caption):
// 1. Section headers/labels that need prominence
// 2. Descriptive messages/paragraphs  
// 3. Empty state text
// 4. Status badges with readable text
// 5. Important standalone labels

const upgrades = [
  // DashboardTab.jsx
  {
    file: 'src/pages/DashboardTab.jsx',
    patterns: [
      // Sleep readiness message (paragraph)
      { from: '<p className={`text-xs leading-snug mt-1.5 ${t.textMuted}`}>{sleepReadiness.message}', to: '<p className={`text-sm leading-snug mt-1.5 ${t.textMuted}`}>{sleepReadiness.message}' },
      // Empty state messages
      { from: 'text-xs font-bold ${t.textMuted}`}>Detail tahap tidur tidak tersedia', to: 'text-sm font-bold ${t.textMuted}`}>Detail tahap tidur tidak tersedia' },
      { from: 'text-xs mt-1 opacity-70 ${t.textMuted}`}>Hubungkan dengan smartwatch', to: 'text-sm mt-1 opacity-70 ${t.textMuted}`}>Hubungkan dengan smartwatch' },
      { from: 'text-xs font-bold ${t.textMuted}`}>Tidak Cukup Data Tahap Tidur', to: 'text-sm font-bold ${t.textMuted}`}>Tidak Cukup Data Tahap Tidur' },
      { from: 'text-xs mt-1 opacity-70 ${t.textMuted}`}>Sinkronkan dengan Health Connect', to: 'text-sm mt-1 opacity-70 ${t.textMuted}`}>Sinkronkan dengan Health Connect' },
      { from: 'text-xs font-bold ${t.textMuted}`}>Grafik Hipnogram tidak tersedia', to: 'text-sm font-bold ${t.textMuted}`}>Grafik Hipnogram tidak tersedia' },
      { from: 'text-xs mt-1 opacity-70 ${t.textMuted}`}>Hubungkan aplikasi dengan Health Connect', to: 'text-sm mt-1 opacity-70 ${t.textMuted}`}>Hubungkan aplikasi dengan Health Connect' },
      // Status badges (Optimal, Cukup, etc) - keep text-xs for compact badge
      // Section headers
      { from: 'text-xs font-bold uppercase tracking-widest ${t.textMuted} group-hover:text-indigo-400', to: 'text-sm font-bold uppercase tracking-widest ${t.textMuted} group-hover:text-indigo-400' },
      { from: 'text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>Skor Kesiapan', to: 'text-sm font-bold uppercase tracking-widest ${t.textMuted}`}>Skor Kesiapan' },
      // Sleep bar labels (HRV, SpO2, RHR names)
      { from: 'text-xs font-bold ${t.textMuted}`}>HRV (Heart Rate Variability)', to: 'text-sm font-bold ${t.textMuted}`}>HRV (Heart Rate Variability)' },
      { from: 'text-xs font-bold ${t.textMuted}`}>SpO2 (Oksigen Darah)', to: 'text-sm font-bold ${t.textMuted}`}>SpO2 (Oksigen Darah)' },
      { from: 'text-xs font-bold ${t.textMuted}`}>RHR (Nadi Istirahat)', to: 'text-sm font-bold ${t.textMuted}`}>RHR (Nadi Istirahat)' },
      // Descriptive paragraph at bottom
      { from: '<p className={`text-xs leading-relaxed ${t.textMuted} opacity-75 mb-6`}>', to: '<p className={`text-sm leading-relaxed ${t.textMuted} opacity-75 mb-6`}>' },
      { from: '<p className="text-xs text-slate-500 mt-2 leading-snug">', to: '<p className="text-sm text-slate-500 mt-2 leading-snug">' },
      // Bio section labels (Fisik, BMI, BMR, Kadar Lemak)
      { from: 'text-xs ${t.textMuted} mb-0.5 font-bold`}>Fisik', to: 'text-sm ${t.textMuted} mb-0.5 font-bold`}>Fisik' },
      { from: "text-xs ${t.textMuted} mb-0.5 font-bold`}>BMI", to: "text-sm ${t.textMuted} mb-0.5 font-bold`}>BMI" },
      { from: 'text-xs ${t.textMuted} mb-0.5 font-bold`}>BMR', to: 'text-sm ${t.textMuted} mb-0.5 font-bold`}>BMR' },
      { from: "text-xs ${t.textMuted} mb-0.5 font-bold`}>{isID ? 'Kadar Lemak'", to: "text-sm ${t.textMuted} mb-0.5 font-bold`}>{isID ? 'Kadar Lemak'" },
      // Tensi, Nadi, SpO2 row labels  
      { from: 'text-xs ${t.textMuted}`}>Tensi', to: 'text-sm ${t.textMuted}`}>Tensi' },
      { from: 'text-xs ${t.textMuted}`}>Nadi', to: 'text-sm ${t.textMuted}`}>Nadi' },
      { from: 'text-xs ${t.textMuted}`}>SpO2', to: 'text-sm ${t.textMuted}`}>SpO2' },
      // Weekly progress label
      { from: '<span className="text-xs text-slate-400">Progres minggu ini', to: '<span className="text-sm text-slate-400">Progres minggu ini' },
    ]
  },
];

let totalChanges = 0;

for (const { file, patterns } of upgrades) {
  let content = fs.readFileSync(file, 'utf8');
  let changes = 0;
  for (const { from, to } of patterns) {
    const count = content.split(from).length - 1;
    if (count > 0) {
      content = content.replaceAll(from, to);
      changes += count;
    }
  }
  if (changes > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`${file}: ${changes} upgrades`);
    totalChanges += changes;
  }
}

console.log(`\nTotal: ${totalChanges} text-xs → text-sm upgrades`);
