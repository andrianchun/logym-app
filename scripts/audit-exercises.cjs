const fs = require('fs');
const path = require('path');

// Read constants.js
const constantsPath = path.join(__dirname, '../src/data/constants.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Parse defaultMasterExercises
const match = constantsContent.match(/export const defaultMasterExercises = (\[[\s\S]*?\n\];)/);
let defaultExercises = [];
if (match) {
  try {
    const rawJs = match[1].replace(/;$/, '');
    defaultExercises = (new Function('return ' + rawJs))();
  } catch (e) {
    console.error('Failed to parse defaultMasterExercises:', e);
  }
}

console.log('Total master exercises:', defaultExercises.length);

// Read exercisedb.json
const dbPath = path.join(__dirname, '../public/exercisedb.json');
let onlineExercises = [];
if (fs.existsSync(dbPath)) {
  try {
    onlineExercises = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log('Total online exercises in exercisedb.json:', onlineExercises.length);
  } catch (e) {
    console.warn('exercisedb.json parse warning:', e);
  }
}

// Cross-check names between defaultMasterExercises and onlineExercises
const localNames = new Set(defaultExercises.map(e => e.name.toLowerCase().trim()));
const crossDuplicates = [];
onlineExercises.forEach(online => {
  const norm = online.name.toLowerCase().trim();
  if (localNames.has(norm)) {
    crossDuplicates.push({ name: online.name, local: true, onlineId: online.id });
  }
});
console.log('Exercises present in both local & ExerciseDB:', crossDuplicates.length);

// Generate comprehensive src/data/exercise_catalog.csv including all master + online exercises
const csvHeaders = ['ID', 'Name_ID', 'Name_EN', 'Muscle_Primary', 'Muscle_Secondary', 'Equipment', 'Level', 'Type', 'Video_URL', 'Has_Video', 'Instructions_ID', 'Instructions_EN'];
const csvRows = [csvHeaders.join(';')];

// Add master exercises first
defaultExercises.forEach(ex => {
  const primary = Array.isArray(ex.target) ? ex.target[0] || '' : ex.target || '';
  const secondary = Array.isArray(ex.target) && ex.target.length > 1 ? ex.target.slice(1).join(', ') : '';
  const hasVid = !!(ex.ytVideo && ex.ytVideo.trim());
  const row = [
    ex.id,
    ex.name,
    ex.name,
    primary,
    secondary,
    ex.equipment || 'Lainnya',
    ex.level || 'beginner',
    ex.type || 'weight',
    ex.ytVideo || '',
    hasVid ? 'YES' : 'NO',
    (ex.instructions || []).join(' | '),
    (ex.instructions || []).join(' | ')
  ].map(val => '"' + String(val).replace(/"/g, '""') + '"');
  csvRows.push(row.join(';'));
});

// Add online exercises that are not in local
onlineExercises.forEach(ex => {
  if (localNames.has(ex.name.toLowerCase().trim())) return;
  const primary = Array.isArray(ex.target) ? ex.target[0] || '' : ex.target || '';
  const secondary = Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.join(', ') : (Array.isArray(ex.target) ? ex.target.slice(1).join(', ') : '');
  const hasVid = !!(ex.ytVideo && ex.ytVideo.trim());
  const row = [
    ex.id,
    ex.name,
    ex.name,
    primary,
    secondary,
    ex.equipment || 'Lainnya',
    ex.level || 'beginner',
    ex.type || 'weight',
    ex.ytVideo || '',
    hasVid ? 'YES' : 'NO',
    Array.isArray(ex.instructions) ? ex.instructions.join(' | ') : (ex.instructions || ''),
    Array.isArray(ex.instructions) ? ex.instructions.join(' | ') : (ex.instructions || '')
  ].map(val => '"' + String(val).replace(/"/g, '""') + '"');
  csvRows.push(row.join(';'));
});

const outCsvPath = path.join(__dirname, '../src/data/exercise_catalog.csv');
fs.writeFileSync(outCsvPath, csvRows.join('\n'), 'utf8');
console.log('✅ Generated comprehensive src/data/exercise_catalog.csv with', csvRows.length - 1, 'exercises.');
