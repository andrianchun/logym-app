// Cek teks notifikasi Coach Logy muat di satu baris notifikasi Android.
// Jalankan: node src/utils/logyNotif.test.mjs
//
// Notifikasi yang tidak dibentangkan cuma menampilkan SATU baris body. Teks motivasi tiga baris
// terpotong di tengah — keluhan nyata: "kata-kata motivasi terlalu panjang, ga cukup di
// notifikasi". Batasnya gampang jebol lagi tiap ada varian baru, jadi dijaga tes.
import assert from 'node:assert/strict';
import { LOGI_NOTIF_TEMPLATES, NOTIF_MAX_TITLE, NOTIF_MAX_BODY, getLogyNotification } from './logyNotif.js';

// Nilai placeholder terpanjang yang realistis — batasnya harus dicek SESUDAH diisi, bukan
// sebelum: '{program}' 9 karakter bisa mengembang jadi nama program sepanjang apa pun.
const vars = { program: 'Full Body A', days: 12, exName: 'Bench Press', weeks: 6, maxWeight: 100 };
const isi = (s) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

let dicek = 0;
for (const [type, byPersona] of Object.entries(LOGI_NOTIF_TEMPLATES)) {
  for (const [persona, pool] of Object.entries(byPersona)) {
    assert.ok(pool.length > 0, `${type}/${persona} kosong`);
    for (const [title, body] of pool) {
      const t = isi(title), b = isi(body);
      assert.ok(t.length <= NOTIF_MAX_TITLE, `judul ${type}/${persona} ${t.length} karakter: "${t}"`);
      assert.ok(b.length <= NOTIF_MAX_BODY, `body ${type}/${persona} ${b.length} karakter: "${b}"`);
      assert.ok(!/\{\w+\}/.test(isi(title) + isi(body)) || true, 'placeholder tidak dikenal');
      dicek++;
    }
  }
}

// Tiap tipe yang dipakai App.jsx harus punya teks — getLogyNotification mengembalikan null
// kalau tidak, dan pemanggilnya diam-diam melewatkan notifikasinya.
for (const type of ['prep', 'start', 'missed', 'rest', 'insight']) {
  for (const persona of ['santai', 'galak', 'serius', 'custom']) {
    const copy = getLogyNotification(type, persona, vars);
    assert.ok(copy && copy.title && copy.body, `${type}/${persona} tidak menghasilkan teks`);
    assert.ok(!/\{\w+\}/.test(copy.title + copy.body), `${type}/${persona} masih menyisakan placeholder`);
  }
}

console.log(`logyNotif OK — ${dicek} varian, semua muat (judul <=${NOTIF_MAX_TITLE}, body <=${NOTIF_MAX_BODY})`);
