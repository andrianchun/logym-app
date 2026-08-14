// Perapihan nama program & sesi yang datang dari AI (atau template lama).
//
// Kenapa dirapikan di sisi app, bukan cukup lewat prompt: model tetap sesekali mengarang
// "Program Full Body 3 Hari Logym" walau aturannya sudah ditulis di prompt, dan nama sepanjang
// itu terpotong di kartu program, di kalender, dan di notifikasi. Prompt tetap diperketat —
// ini jaring pengaman yang deterministik, tidak ikut mood model.
//
// Yang dibuang: kata pembungkus ("Program", "Plan", "Latihan", "Workout", "Routine"), embel-embel
// merek ("Logym", "by AI"), dan keterangan frekuensi ("3 Hari", "3x Seminggu", "5 Days/Week") —
// frekuensi sudah tampil sendiri di kartu sebagai jumlah sesi.

const BUANG_AWALAN = /^(program|plan|rencana|jadwal|latihan|workout|routine|rutin)\s+(latihan\s+)?/i;
const BUANG_AKHIRAN = /\s+(program|plan|workout|routine|rutin|logym|by ai|ai)$/i;
const FREKUENSI = /\s*[-–(]?\s*\b\d+\s*(hari|hr|day|days|x|kali)\b\s*(\/|per\s*)?\s*((se)?minggu(an)?|week(ly)?)?\s*[-–)]?\s*/gi;

// "Senin:", "Rabu -", "Hari 1:", "Day 2 —", "(Rab)", "[Sen]" di depan/belakang nama sesi.
const HARI = '(senin|selasa|rabu|kamis|jumat|jum.at|sabtu|minggu|sen|sel|rab|kam|jum|sab|min|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)';
const AWALAN_HARI = new RegExp(`^\\s*(hari|day)?\\s*\\d*\\s*[-–:.]?\\s*${HARI}\\s*[-–:.]\\s*`, 'i');
const AWALAN_NOMOR = /^\s*(hari|day)\s*\d+\s*[-–:.]\s*/i;
const AKHIRAN_HARI = new RegExp(`\\s*[-–:(\\[]\\s*${HARI}\\s*[)\\]]?\\s*$`, 'i');

const bersihkan = (s) => String(s || '')
  .replace(/\s+/g, ' ')
  .replace(/^[\s\-–:.,([]+|[\s\-–:.,()[\]]+$/g, '')
  .trim();

/** Nama program: ringkas, tanpa kata pembungkus dan tanpa keterangan frekuensi. */
export const rapikanNamaProgram = (nama, fallback = 'Program') => {
  let s = bersihkan(nama).replace(FREKUENSI, ' ');
  s = bersihkan(s);
  // Awalan/akhiran dibuang berulang: "Program Latihan Full Body Program" butuh dua putaran.
  for (let i = 0; i < 3; i++) {
    const sebelum = s;
    s = bersihkan(s.replace(BUANG_AWALAN, '').replace(BUANG_AKHIRAN, ''));
    if (s === sebelum) break;
  }
  // Kalau yang tersisa cuma kata pembungkus, jangan dipaksa kosong — pakai nama aslinya.
  if (!s) return bersihkan(nama) || fallback;
  // Batas 4 kata / 28 karakter: lebih dari itu pasti terpotong di kartu program.
  const kata = s.split(' ');
  if (kata.length > 4) s = kata.slice(0, 4).join(' ');
  if (s.length > 28) s = bersihkan(s.slice(0, 28));
  return s || fallback;
};

/** Nama sesi: tanpa nama hari sama sekali — harinya ditampilkan sebagai badge terpisah. */
export const rapikanNamaSesi = (nama, fallback = 'Sesi') => {
  let s = bersihkan(nama);
  for (let i = 0; i < 3; i++) {
    const sebelum = s;
    s = bersihkan(s.replace(AWALAN_HARI, '').replace(AWALAN_NOMOR, '').replace(AKHIRAN_HARI, ''));
    if (s === sebelum) break;
  }
  s = bersihkan(s.replace(BUANG_AWALAN, ''));
  if (!s) return bersihkan(nama) || fallback;
  const kata = s.split(' ');
  if (kata.length > 4) s = kata.slice(0, 4).join(' ');
  if (s.length > 24) s = bersihkan(s.slice(0, 24));
  return s || fallback;
};

/**
 * Nama sesi yang sudah ADA dipertahankan saat program diperbarui Coach Logy.
 *
 * Keluhan aslinya: user rename sesi, minta Logy mengedit programnya, dan namanya balik ke nama
 * karangan AI. Padanannya dicari dari assignedDays (paling andal — hari itu yang dipilih user),
 * lalu urutan sebagai cadangan. Rutin yang benar-benar baru tetap memakai nama dari AI.
 */
export const pertahankanNamaSesi = (rutinBaru, rutinLama = []) => {
  const sisa = [...rutinLama];
  const ambilCocok = (r) => {
    const hariBaru = (r.assignedDays || []).join(',');
    if (hariBaru) {
      const i = sisa.findIndex(o => (o.assignedDays || []).join(',') === hariBaru);
      if (i >= 0) return sisa.splice(i, 1)[0];
    }
    return null;
  };
  // Dua lintasan: yang harinya sama persis dipasangkan DULUAN, sisanya baru dicocokkan urutan.
  const cocok = rutinBaru.map(ambilCocok);
  return rutinBaru.map((r, i) => {
    const lama = cocok[i] || sisa.shift();
    return lama?.name ? { ...r, name: lama.name } : r;
  });
};
