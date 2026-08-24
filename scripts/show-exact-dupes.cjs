const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../src/data/exercise_catalog.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split('\n').filter(Boolean);
const rows = lines.slice(1).map(l => {
  const parts = l.split(';').map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));
  return { id: parts[0], name: parts[1], equip: parts[5], video: parts[8], instr: parts[10] };
});

const byName = new Map();
rows.forEach((r) => {
  const norm = (r.name || '').toLowerCase().trim();
  if (!norm) return;
  if (!byName.has(norm)) byName.set(norm, []);
  byName.get(norm).push(r);
});

console.log('--- EXACT DUPLICATES BY NAME IN CSV ---');
let dupeCount = 0;
for (const [norm, list] of byName.entries()) {
  if (list.length > 1) {
    dupeCount++;
    console.log(`[DUPE ${dupeCount}] "${list[0].name}" (${list.length} entries):`);
    list.forEach(x => {
      console.log(`   - ID: ${x.id} | Equip: ${x.equip} | Video: ${x.video ? 'YES' : 'NO'} | Instr: ${x.instr ? 'YES' : 'NO'}`);
    });
  }
}

if (dupeCount === 0) {
  console.log('Tidak ada nama yang persis sama di CSV.');
}
