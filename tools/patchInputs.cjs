const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardModals.jsx', 'utf8');

code = code.replace(/import \{ playSoundEffect \} from '\.\.\/utils\/audio';/, `import { playSoundEffect } from '../utils/audio';\nimport SwipeInput from './SwipeInput';`);

const regex = /<input type="number"( step="[^"]+")? value=\{([^}]+)\} onChange=\{\(e\)=>setFormBio\(\{\.\.\.formBio, ([a-zA-Z]+): Number\(e\.target\.value\)\}\)\} className=\{`w-(full|1\/2) \$\{t\.inputBg\} \$\{t\.textMain\} p-3 rounded-xl outline-none font-black text-center`\} placeholder="([^"]+)" \/>/g;

code = code.replace(regex, (match, stepMatch, valueExpr, fieldName, wClass, placeholder) => {
    let step = 1;
    if (stepMatch) {
        step = parseFloat(stepMatch.replace(' step="', '').replace('"', ''));
    }
    return `<SwipeInput value={${valueExpr}} onChange={(val) => setFormBio({...formBio, ${fieldName}: val})} step={${step}} min={0} soundEnabled={soundEnabled} className={\`w-${wClass} \${t.inputBg} \${t.textMain} p-3 rounded-xl outline-none font-black text-center\`} placeholder="${placeholder}" />`;
});

fs.writeFileSync('src/components/DashboardModals.jsx', code);
console.log('Done replacing inputs with SwipeInput.');
