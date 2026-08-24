const fs = require('fs');
const path = require('path');

const constantsContent = fs.readFileSync(path.join(__dirname, '../src/data/constants.js'), 'utf8');
const match = constantsContent.match(/export const defaultMasterExercises = (\[[\s\S]*?\n\];)/);
const defaultExercises = (new Function('return ' + match[1].replace(/;$/, '')))();
const exercisedb = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/exercisedb.json'), 'utf8'));

console.log('=== PEMETAAN LENGKAP: 39 MASTER EXERCISES VS 873 EXERCISEDB ===\n');

const results = defaultExercises.map(m => {
  const mName = m.name.trim();
  const mLower = mName.toLowerCase();
  
  // Exact match
  const exact = exercisedb.find(e => e.name.trim().toLowerCase() === mLower);
  if (exact) {
    return {
      type: 'EXACT_MATCH',
      master: m,
      edb: exact,
      note: 'Nama persis sama. Sudah otomatis dimerge oleh DatabaseTab.'
    };
  }

  // Known manual mapping or closest match
  const candidates = exercisedb.filter(e => {
    const eLower = e.name.trim().toLowerCase();
    const mClean = mLower.replace(/[^a-z0-9]/g, '');
    const eClean = eLower.replace(/[^a-z0-9]/g, '');
    if (mClean === eClean) return true;
    if (mLower.includes(eLower) || eLower.includes(mLower)) return true;
    
    // Specific fitness keyword checks
    const mWords = mLower.split(/\s+/).filter(w => w.length > 2);
    const eWords = eLower.split(/\s+/).filter(w => w.length > 2);
    const shared = mWords.filter(w => eWords.includes(w));
    return shared.length >= 2;
  });

  return {
    type: candidates.length > 0 ? 'NEAR_DUPLICATE' : 'UNIQUE_MASTER',
    master: m,
    candidates,
    note: candidates.length > 0 ? `Ditemukan ${candidates.length} kandidat mirip di ExerciseDB (Menyebabkan duplikasi di UI jika tidak dimerge).` : 'Latihan khusus Logym (tidak ada di ExerciseDB).'
  };
});

fs.writeFileSync(path.join(__dirname, '../audit_pairs_full.json'), JSON.stringify(results, null, 2));

results.forEach((r, i) => {
  const m = r.master;
  console.log(`[${i+1}] [ID ${m.id}] "${m.name}" (${m.equipment})`);
  console.log(`    Status: ${r.type}`);
  if (r.type === 'EXACT_MATCH') {
    console.log(`    -> ExerciseDB: "${r.edb.name}"`);
  } else if (r.type === 'NEAR_DUPLICATE') {
    console.log(`    -> Kandidat ExerciseDB:`);
    r.candidates.slice(0, 4).forEach(c => {
      console.log(`       * "${c.name}" [Target: ${(c.targetMuscles||[]).join('/')}, Equip: ${(c.equipments||[]).join('/')}]`);
    });
  } else {
    console.log(`    -> Unik di Logym Master (tetap dipertahankan sebagai custom exercise).`);
  }
  console.log('');
});
