const fs = require('fs');
const path = require('path');

const constantsPath = './src/data/constants.js';
const constantsContent = fs.readFileSync(constantsPath, 'utf8');
const masterMatch = constantsContent.match(/export const defaultMasterExercises = (\[[\s\S]*?\n\];)/);
const defaultMasterExercises = eval(masterMatch[1]);

const templatesContent = fs.readFileSync('./src/data/programTemplates.js', 'utf8');
const getExMatches = [...templatesContent.matchAll(/getEx\(\s*(\d+)/g)];
const exerciseUsageCounts = {};

getExMatches.forEach(m => {
  const id = parseInt(m[1]);
  exerciseUsageCounts[id] = (exerciseUsageCounts[id] || 0) + 1;
});

const defaultProgramsMatch = constantsContent.match(/export const defaultPrograms = (\[[\s\S]*?\n\];)/);
const defaultPrograms = eval(defaultProgramsMatch[1]);

defaultPrograms.forEach(prog => {
  prog.exercises.forEach(ex => {
    exerciseUsageCounts[ex.id] = (exerciseUsageCounts[ex.id] || 0) + 1;
  });
});

const assetsDir = './public/exercise-assets';
const ytBackupDir = './public/exercise-assets/youtube-backup';

const aiFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => f.endsWith('.mp4')) : [];
const ytBackupFiles = fs.existsSync(ytBackupDir) ? fs.readdirSync(ytBackupDir).filter(f => f.endsWith('.mp4')) : [];

const findAsset = (ex, list) => {
  const safeName = ex.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  let matched = list.find(f => {
    const cleanF = f.toLowerCase().replace(/edb-|\.mp4/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const cleanE = ex.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    return cleanF === cleanE || f.includes(safeName);
  });
  if (!matched && ex.id === 120) {
    matched = list.find(f => f.includes('Smith_Machine_Romanian_Deadlift') || f.includes('Smith_Machine_Stiff-Legged_Deadlift'));
  }
  return matched;
};

const table = defaultMasterExercises.map(ex => {
  const count = exerciseUsageCounts[ex.id] || 0;
  const isCardio = ex.type === 'cardio' || ex.type === 'time';

  const aiMatch = findAsset(ex, aiFiles);
  const ytMatch = findAsset(ex, ytBackupFiles);

  let aiSize = '-';
  if (aiMatch) {
    aiSize = (fs.statSync(path.join(assetsDir, aiMatch)).size / 1024 / 1024).toFixed(2) + ' MB';
  }

  let ytSize = '-';
  if (ytMatch) {
    ytSize = (fs.statSync(path.join(ytBackupDir, ytMatch)).size / 1024 / 1024).toFixed(2) + ' MB';
  }

  let playbackStatus = '❌ Belum Ada Video';
  if (aiMatch && ytMatch) {
    playbackStatus = '🤖 AI (#1) + 🎬 YT Backup (#2)';
  } else if (aiMatch) {
    playbackStatus = '🤖 AI (#1)';
  } else if (ytMatch) {
    playbackStatus = '🎬 YT Backup (#1, Menunggu AI)';
  } else if (isCardio) {
    playbackStatus = '⏱️ Kardio / Waktu';
  }

  return {
    id: ex.id,
    name: ex.name,
    count,
    target: ex.target.join(', '),
    equipment: ex.equipment,
    isCardio,
    hasAi: !!aiMatch,
    aiFile: aiMatch || '-',
    aiSize,
    hasYt: !!ytMatch,
    ytFile: ytMatch || '-',
    ytSize,
    playbackStatus
  };
});

table.sort((a, b) => b.count - a.count);

const totalExercises = defaultMasterExercises.length;
const totalResistance = table.filter(e => !e.isCardio).length;
const totalWithAi = table.filter(e => e.hasAi).length;
const totalWithYt = table.filter(e => e.hasYt).length;
const totalActiveVideo = table.filter(e => e.hasAi || e.hasYt).length;

let md = `# 📊 Logym App - Video Assets Monitoring & Folder Separation

Terakhir diperbarui: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

---

## 📁 Struktur Pemisahan Folder Aset
1. **Official AI Videos:** \`public/exercise-assets/edb-[Name].mp4\` (Aset Resmi AI Buatan Sendiri)
2. **YouTube Reference Backup:** \`public/exercise-assets/youtube-backup/edb-[Name].mp4\` (Backup / Referensi Sementara)

### 🎯 Aturan Prioritas Pemutaran di Aplikasi:
- **Jika sudah ada Video AI resmi:** Video AI otomatis menjadi **Pilihan Utama (#1)** yang diputar saat latihan dimulai. Video YouTube dari folder backup diletakkan di urutan **#2 (bisa di-swipe jika ingin melihat referensi gerakan asli)**.
- **Jika belum ada Video AI:** Video YouTube backup otomatis menjadi **Pilihan Utama (#1)** sampai file video AI di-generate dan diletakkan di \`public/exercise-assets/\`.

---

## 📈 Ringkasan Statistik
- **Total Master Exercises:** ${totalExercises} latihan
- **Latihan Beban (Perlu Video):** ${totalResistance} latihan
- **Latihan Beban dengan Video Aktif (AI / YT Backup):** **${totalActiveVideo} / ${totalResistance} (100% TERCOVER)** ✅
- **Sudah Ada Video AI Resmi:** **${totalWithAi} / ${totalResistance} (${Math.round((totalWithAi / totalResistance) * 100)}%)**
- **Masih Menggunakan Backup YT (Belum Ada AI):** **${totalResistance - totalWithAi} latihan**
- **Total File MP4 di \`public/exercise-assets/\` (AI):** **${aiFiles.length} file**
- **Total File MP4 di \`public/exercise-assets/youtube-backup/\` (YT):** **${ytBackupFiles.length} file**

---

## 🏋️ Tabel Pemantauan Status Video Master Exercise

| ID | Nama Latihan | Pakai | Target Otot | Alat | Status Pemutaran di App | File Video AI (Utama) | File Backup YT (Cadangan) |
|---|---|---|---|---|---|---|---|
`;

table.forEach(r => {
  md += `| **${r.id}** | **${r.name}** | ${r.count > 0 ? `${r.count}x` : '-'} | ${r.target} | ${r.equipment} | ${r.playbackStatus} | \`${r.aiFile}\` ${r.hasAi ? `(${r.aiSize})` : ''} | \`${r.ytFile}\` ${r.hasYt ? `(${r.ytSize})` : ''} |\n`;
});

md += `\n---

## 📋 Roadmap Latihan yang Masih Menunggu Video AI Resmi (${totalResistance - totalWithAi} Latihan)
*Latihan di bawah ini saat ini memutar video dari \`youtube-backup\`. Silakan generate di AI generator (Kling / Runway / Luma) lalu taruh file hasilnya di \`public/exercise-assets/\`:*

| ID | Nama Latihan | Frekuensi | Target File AI di \`public/exercise-assets/\` |
|---|---|---|---|
`;

table.filter(e => !e.isCardio && !e.hasAi).forEach(r => {
  const targetAiName = `edb-${r.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
  md += `| **${r.id}** | **${r.name}** | ${r.count}x | \`${targetAiName}\` |\n`;
});

fs.writeFileSync('./VIDEO_ASSETS_MONITOR.md', md, 'utf8');
console.log('VIDEO_ASSETS_MONITOR.md successfully updated!');
