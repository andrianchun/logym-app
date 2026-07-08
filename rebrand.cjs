const fs = require('fs');
const path = require('path');

const replacements = [
    { from: /Sobat LyFit/g, to: 'Sobat LOGYM' },
    { from: /Sobat Lyfit/g, to: 'Sobat LOGYM' },
    { from: /Lyfit Coach/g, to: 'LOGYM Coach' },
    { from: /Aplikasi LyFit/g, to: 'Aplikasi LOGYM' },
    { from: /Logo LyFit/g, to: 'Logo LOGYM' },
    { from: /LyFit Logo/g, to: 'LOGYM Logo' },
    { from: /Lyfit Logo/g, to: 'LOGYM Logo' },
    { from: /LyFit-/g, to: 'LOGYM-' },
    { from: /latihanku di LyFit!/g, to: 'latihanku di LOGYM!' },
    { from: /Komunitas Lyfit/g, to: 'Komunitas LOGYM' },
    { from: /di LyFit!/g, to: 'di LOGYM!' },
    { from: /Keluar dari LyFit/g, to: 'Keluar dari LOGYM' },
    { from: /alt="Lyfit"/g, to: 'alt="LOGYM"' },
    { from: /alt="LyFit"/g, to: 'alt="LOGYM"' },
    { from: /'LyFit'/g, to: "'LOGYM'" },
    { from: /"LyFit"/g, to: '"LOGYM"' },
    { from: /LyFit Gym/g, to: 'LOGYM' },
    { from: /Lyfit Gym/g, to: 'LOGYM' },
    { from: /"Lyfit"/g, to: '"LOGYM"' }
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            for (const { from, to } of replacements) {
                if (from.test(content)) {
                    content = content.replace(from, to);
                    modified = true;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
