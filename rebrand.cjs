const fs = require('fs');
const path = require('path');

const replacements = [
    { from: /Sobat LyFit/g, to: 'Sobat Logym' },
    { from: /Sobat Lyfit/g, to: 'Sobat Logym' },
    { from: /Lyfit Coach/g, to: 'Logym Coach' },
    { from: /Aplikasi LyFit/g, to: 'Aplikasi Logym' },
    { from: /Logo LyFit/g, to: 'Logo Logym' },
    { from: /LyFit Logo/g, to: 'Logym Logo' },
    { from: /Lyfit Logo/g, to: 'Logym Logo' },
    { from: /LyFit-/g, to: 'Logym-' },
    { from: /latihanku di LyFit!/g, to: 'latihanku di Logym!' },
    { from: /Komunitas Lyfit/g, to: 'Komunitas Logym' },
    { from: /di LyFit!/g, to: 'di Logym!' },
    { from: /Keluar dari LyFit/g, to: 'Keluar dari Logym' },
    { from: /alt="Lyfit"/g, to: 'alt="Logym"' },
    { from: /alt="LyFit"/g, to: 'alt="Logym"' },
    { from: /'LyFit'/g, to: "'Logym'" },
    { from: /"LyFit"/g, to: '"Logym"' },
    { from: /LyFit Gym/g, to: 'Logym' },
    { from: /Lyfit Gym/g, to: 'Logym' },
    { from: /"Lyfit"/g, to: '"Logym"' }
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
