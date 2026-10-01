import fs from 'fs';

let content = fs.readFileSync('src/pages/DashboardTab.jsx', 'utf8');

// 1. Typography replacements
// Note: handle text-[13px], text-[10px], text-[9px], text-[8px]
content = content.replace(/text-\[13px\]/g, 'text-xs');
content = content.replace(/text-\[10px\]/g, 'text-xs');
content = content.replace(/text-\[9px\]/g, 'text-xs');
content = content.replace(/text-\[8px\]/g, 'text-xs');

// 2. Color replacements
content = content.replace(/\bzinc-300\b/g, 'slate-300');
content = content.replace(/\bzinc-400\b/g, 'slate-400');
content = content.replace(/\bzinc-500\b/g, 'slate-500');
content = content.replace(/\bzinc-600\b/g, 'slate-600');
content = content.replace(/\bzinc-900\b/g, 'slate-900');
content = content.replace(/purple-400/g, 'violet-400');
content = content.replace(/purple-500/g, 'violet-500');

// 3. Inline style hardcoding 0.65rem
content = content.replace(/style=\{\{fontSize:\s*'0.65rem'\}\}/g, '');

fs.writeFileSync('src/pages/DashboardTab.jsx', content, 'utf8');
console.log('Transformation complete!');
