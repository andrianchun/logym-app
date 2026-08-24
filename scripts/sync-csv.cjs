const fs = require('fs');
const edb = JSON.parse(fs.readFileSync('public/exercisedb.json', 'utf8'));

const headers = ['id', 'name', 'target', 'equipment', 'level', 'type', 'defaultWeight', 'ytVideo', 'videoUrl', 'gifUrl'];
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join(';') : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const rows = [headers.join(',')];
edb.forEach(ex => {
  const row = headers.map(h => escapeCsv(ex[h]));
  rows.push(row.join(','));
});

fs.writeFileSync('src/data/exercise_catalog.csv', rows.join('\n'), 'utf8');
console.log('Successfully synced exercise_catalog.csv!');
