const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../src/data/exercise_catalog.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split('\n').filter(Boolean);
const header = lines[0];

const rows = lines.slice(1).map(l => {
  const parts = l.split(';').map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));
  return {
    id: parts[0],
    name_id: parts[1],
    name_en: parts[2],
    primary: parts[3],
    secondary: parts[4],
    equip: parts[5],
    level: parts[6],
    type: parts[7],
    video: parts[8],
    hasVideo: parts[9],
    instructions: parts[10]
  };
});

console.log('Total rows in CSV:', rows.length);

const byName = new Map();
rows.forEach((r, idx) => {
  const norm = (r.name_id || '').toLowerCase().trim();
  if (!norm) return;
  if (!byName.has(norm)) byName.set(norm, []);
  byName.get(norm).push({ idx, row: r });
});

const exactDupes = [];
for (const [norm, list] of byName.entries()) {
  if (list.length > 1) {
    exactDupes.push({ name: norm, count: list.length, items: list.map(x => ({ id: x.row.id, name: x.row.name_id, equip: x.row.equip, video: x.row.video })) });
  }
}

console.log('\n=== EXACT DUPLICATE NAMES IN CSV (' + exactDupes.length + ') ===');
exactDupes.forEach(d => {
  console.log(`- "${d.name}": ${d.count} entries`);
  d.items.forEach(it => console.log(`   ID: ${it.id} | Equip: ${it.equip} | Video: ${it.video ? 'YES' : 'NO'}`));
});

// Check near-duplicate / alias names (e.g. "Flat Dumbbell Bench Press" vs "Dumbbell Bench Press")
const allUnique = Array.from(byName.values()).map(v => v[0].row);
const nearPairs = [];

for (let i = 0; i < allUnique.length; i++) {
  for (let j = i + 1; j < allUnique.length; j++) {
    const a = allUnique[i];
    const b = allUnique[j];
    const na = a.name_id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nb = b.name_id.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (na === nb) {
      nearPairs.push({ type: 'NORMALIZED_IDENTICAL', a, b });
    } else if (
      (na.includes(nb) || nb.includes(na)) &&
      (a.equip.toLowerCase() === b.equip.toLowerCase() || a.equip === 'Lainnya' || b.equip === 'Lainnya' || a.equip.includes('Smith') === b.equip.includes('Smith')) &&
      Math.abs(na.length - nb.length) <= 12
    ) {
      nearPairs.push({ type: 'SUBSTRING_VARIANT', a, b });
    }
  }
}

console.log('\n=== NEAR DUPLICATES / VARIANTS IN CSV (' + nearPairs.length + ') ===');
nearPairs.forEach(p => {
  console.log(`[${p.type}]`);
  console.log(`  A: [ID ${p.a.id}] "${p.a.name_id}" (${p.a.equip}) - Video: ${p.a.video ? 'YES' : 'NO'} - Instr: ${p.a.instructions ? 'YES' : 'NO'}`);
  console.log(`  B: [ID ${p.b.id}] "${p.b.name_id}" (${p.b.equip}) - Video: ${p.b.video ? 'YES' : 'NO'} - Instr: ${p.b.instructions ? 'YES' : 'NO'}`);
  console.log('');
});
