import fs from 'fs';

const content = fs.readFileSync('src/pages/DashboardTab.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  const arb = line.match(/text-\[\d+[^\]]*\]/g);
  const col = line.match(/\b(zinc|neutral|gray|orange|yellow|purple)-[a-z0-9/]+/g);
  if (arb || col) {
    console.log(`L${idx+1}: [${arb ? arb.join(',') : ''}] [${col ? col.join(',') : ''}] -> ${line.trim().slice(0, 110)}`);
  }
});
