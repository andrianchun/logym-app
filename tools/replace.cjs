const fs = require('fs');
const path = require('path');

function replaceNative(p) {
  let c = fs.readFileSync(p, 'utf-8');
  
  if (!c.includes('setConfirmModal') && !p.includes('DatabaseTab') && !p.includes('DashboardModals') && !p.includes('Header')) {
    c = c.replace(/({.*?\s)(t, lang)/, '$1setConfirmModal, $2');
  }

  // Replace confirm: if (window.confirm("Text")) { -> setConfirmModal({isOpen: true, title: 'Konfirmasi', message: 'Text', onConfirm: () => {
  c = c.replace(/if\s*\(\s*window\.confirm\(\s*(['`"])(.*?)\1\s*\)\s*\)\s*\{/g, 'setConfirmModal({ isOpen: true, title: \'Konfirmasi\', message: \`$2\`, onConfirm: () => {');

  // Replace alert: window.alert("Text") -> setConfirmModal({isOpen: true, isAlert: true, title: 'Peringatan', message: 'Text'})
  c = c.replace(/window\.alert\(\s*(['`"])(.*?)\1\s*\)/g, 'setConfirmModal({ isOpen: true, isAlert: true, title: \'Peringatan\', message: \`$2\` })');
  
  fs.writeFileSync(p, c);
  console.log('Replaced in ' + p);
}

[
  'src/pages/DashboardTab.jsx',
  'src/pages/CalendarTab.jsx',
  'src/pages/ProgramTab.jsx',
  'src/pages/DatabaseTab.jsx',
  'src/components/DashboardModals.jsx',
  'src/components/Header.jsx'
].forEach(replaceNative);
