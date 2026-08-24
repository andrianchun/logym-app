const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../audit_full_mapping.json'), 'utf8'));

console.log('=== AUDIT PEMETAAN MASTER EXERCISE VS EXERCISEDB ===\n');

mapping.forEach(m => {
  const master = m.master;
  const exact = m.exactMatch;
  const fuzzy = m.fuzzyMatches;
  
  let status = '';
  if (exact) {
    status = 'EXACT MATCH -> ' + exact.name + ' (ID: ' + exact.id + ')';
  } else if (fuzzy.length > 0) {
    status = 'FUZZY MATCH (' + fuzzy.length + ') -> ' + fuzzy.map(f => '"' + f.name + '"').join(', ');
  } else {
    status = 'UNIK DI MASTER (Tidak ada di ExerciseDB)';
  }

  console.log(`[ID ${master.id}] "${master.name}" [${master.equipment} | Target: ${(master.target||[]).join('/')}]`);
  console.log(`   Status: ${status}`);
  console.log(`   Video: ${master.ytVideo ? 'ADA' : 'TIDAK'} | Default Weight: ${master.defaultWeight}`);
  console.log('');
});
