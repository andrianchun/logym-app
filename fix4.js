import fs from 'fs';
const file = 'e:/CODING/lyfit.app/src/pages/DashboardTab.jsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// Remove the duplicate block from index 726 to 770
lines.splice(726, 45);

fs.writeFileSync(file, lines.join('\n'));
console.log('Duplicate block removed successfully!');
