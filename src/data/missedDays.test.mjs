// Cek hitungan hari bolos untuk notifikasi Coach Logy.
// Jalankan: node src/data/missedDays.test.mjs
//
// Kalau ini salah, user dituduh bolos padahal jadwalnya diikuti sempurna — dan notifikasi yang
// salah tuduh adalah notifikasi yang di-mute selamanya.
import assert from 'node:assert/strict';
import { countMissedScheduledDays } from './constants.js';

// Program latihan Senin & Kamis saja.
const programs = [
  { id: 'p1', planId: 'custom', planName: 'X', name: 'Upper', assignedDays: ['Sen'], exercises: [{ id: 1, name: 'Bench' }] },
  { id: 'p2', planId: 'custom', planName: 'X', name: 'Lower', assignedDays: ['Kam'], exercises: [{ id: 2, name: 'Squat' }] },
];
const plans = ['custom'];

// 2026-08-13 adalah hari Kamis. Mundur: Rab 12, Sel 11, Sen 10, Min 9, Sab 8, Jum 7, Kam 6.
const KAMIS = '2026-08-13';
assert.equal(new Date(`${KAMIS}T00:00:00`).getDay(), 4, 'prasyarat tes: 2026-08-13 harus Kamis');

// 1. Belum ada riwayat sama sekali -> 0. User baru bukan pembolos. Tanpa aturan ini,
//    penelusuran berjalan sampai batas dan menuduh pemakai hari pertama bolos belasan hari
//    (tes ini menangkapnya saat helper-nya pertama ditulis).
assert.equal(countMissedScheduledDays({}, programs, plans, KAMIS), 0);

// 2. REGRESI UTAMA: jadwal diikuti sempurna. Senin lalu (10 Agu) selesai. Hari-hari sesudahnya
//    (Sel/Rab) memang hari istirahat, jadi TIDAK ADA yang terlewat — versi lama menghitung
//    "2 hari sejak latihan terakhir" dan menuduh user bolos setiap minggu.
const rajin = {
  '2026-08-10': { workouts: [{ id: 'p1', programId: 'p1', status: 'completed', exercises: [] }] },
};
assert.equal(countMissedScheduledDays(rajin, programs, plans, KAMIS), 0,
  'Selasa & Rabu hari istirahat — tidak boleh dihitung bolos');

// 3. Benar-benar bolos: Kamis 6 Agu selesai, lalu Senin 10 Agu terjadwal tapi dilewatkan.
//    Diperiksa dari Rabu 12: Selasa & Rabu istirahat, Senin terlewat, Minggu-Jumat istirahat,
//    Kamis 6 selesai -> berhenti. Hasil: 1.
const bolosSenin = {
  '2026-08-06': { workouts: [{ id: 'p2', programId: 'p2', status: 'completed', exercises: [] }] },
};
assert.equal(countMissedScheduledDays(bolosSenin, programs, plans, '2026-08-12'), 1,
  'Senin 10 Agu terlewat, Selasa/Rabu istirahat -> 1');

// 4. Hari ini TIDAK dihitung — harinya belum selesai, latihannya belum tentu dilewatkan.
//    Kamis 13 terjadwal; menghitung dari Kamis 13 harus mengabaikan Kamis 13 itu sendiri.
const kamisSelesai = {
  '2026-08-06': { workouts: [{ id: 'p2', programId: 'p2', status: 'completed', exercises: [] }] },
  '2026-08-10': { workouts: [{ id: 'p1', programId: 'p1', status: 'completed', exercises: [] }] },
};
assert.equal(countMissedScheduledDays(kamisSelesai, programs, plans, KAMIS), 0);

// 5. Penapakan hari harus mendarat di hari yang benar. Tanggal diurai sebagai waktu LOKAL —
//    `new Date('2026-08-11')` adalah tengah malam UTC, dan di zona waktu yang di belakang UTC
//    itu menggeser tanggalnya satu hari sehingga hari Senin terlewat dari penelusuran.
//    Selasa 11: kemarin = Senin 10 (terjadwal, dilewatkan) -> 1
assert.equal(countMissedScheduledDays(bolosSenin, programs, plans, '2026-08-11'), 1);
//    Senin 10: kemarin = Minggu 9 (istirahat), mundur terus sampai Kamis 6 yang selesai -> 0
assert.equal(countMissedScheduledDays(bolosSenin, programs, plans, '2026-08-10'), 0);

// 6. Tanpa program aktif -> tidak ada yang bisa dilewatkan.
assert.equal(countMissedScheduledDays({}, [], plans, KAMIS), 0);

// 7. Batas penelusuran dihormati (jangan menyapu riwayat bertahun-tahun tiap render).
assert.ok(countMissedScheduledDays({}, programs, plans, KAMIS, 7) <= 7);

console.log('missedDays OK', { rajin: countMissedScheduledDays(rajin, programs, plans, KAMIS) });
