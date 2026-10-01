import fs from 'node:fs';

const constantsPath = './src/data/constants.js';
let content = fs.readFileSync(constantsPath, 'utf8');

// Match alias map
const aliasMapMatch = content.match(/export const exerciseAliasMap = \{([^}]+)\};/s);
if (!aliasMapMatch) {
  console.error('Cannot find exerciseAliasMap');
  process.exit(1);
}

const aliasMap = {};
aliasMapMatch[1].split('\n').forEach(line => {
  const m = line.match(/'(\d+)':\s*'([^']+)'/);
  if (m) aliasMap[m[1]] = m[2];
});

console.log('Found', Object.keys(aliasMap).length, 'aliases');

// Read current defaultMasterExercises
const startMarker = 'export const defaultMasterExercises = [';
const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Cannot find defaultMasterExercises');
  process.exit(1);
}

// Find matching closing bracket
let bracketDepth = 0;
let endIndex = -1;
for (let i = startIndex + startMarker.length - 1; i < content.length; i++) {
  if (content[i] === '[') bracketDepth++;
  else if (content[i] === ']') {
    bracketDepth--;
    if (bracketDepth === 0) {
      endIndex = i;
      break;
    }
  }
}

if (endIndex === -1) {
  console.error('Cannot find end of defaultMasterExercises array');
  process.exit(1);
}

const arrayStr = content.slice(startIndex + startMarker.length - 1, endIndex + 1);
const masterList = JSON.parse(arrayStr);

console.log('Parsed', masterList.length, 'master exercises');

const nonDbIds = new Set(['107', '128', '129', '130', '131', '133', '136', '137', '138']);

const updatedList = masterList.map(e => {
  const alias = aliasMap[String(e.id)];
  if (alias) {
    const edbId = alias.replace(/^edb-/, '');
    if (!nonDbIds.has(edbId)) {
      return {
        ...e,
        exerciseId: edbId,
        gifUrl: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${edbId}/0.jpg`,
      };
    }
  }
  return e;
});

const newArrayStr = JSON.stringify(updatedList, null, 2);
const newContent = content.slice(0, startIndex + startMarker.length - 1) + newArrayStr + content.slice(endIndex + 1);

fs.writeFileSync(constantsPath, newContent, 'utf8');
console.log('Successfully updated defaultMasterExercises in constants.js');
