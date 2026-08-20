/**
 * Penjadwalan sinkron Health Connect — dua keputusan kecil yang kalau salah tidak menghasilkan
 * error apa pun, cuma data yang telat atau hilang. Dipisah ke sini supaya bisa dites.
 *
 * Health Connect TIDAK BISA memberi tahu aplikasi saat ada data baru (dokumentasi resminya:
 * "As your app can't get notified of new data"), jadi menjemput sendiri adalah satu-satunya cara.
 */

/** Jeda minimal antar sinkron, dibedakan menurut lebar jendelanya. */
export const hcThrottleMs = (days) => (days <= 2 ? 60 * 1000 : 10 * 60 * 1000);

/**
 * Boleh jalan sekarang?
 *
 * Penyegaran hari ini + semalam sengaja dijaga 60 detik saja. Dengan satu jeda 10 menit untuk
 * semuanya, membuka aplikasi jam 06.03 dan 06.06 sesudah 06.00 sama-sama ditolak — jadi data
 * tidur yang SUDAH siap di Health Connect tetap tidak muncul sampai lewat 06.10.
 */
export const bolehSync = (days, terakhirCepat, terakhirLebar, sekarang = Date.now()) => {
  const cepat = days <= 2;
  const terakhir = cepat ? terakhirCepat : terakhirLebar;
  return sekarang - (Number(terakhir) || 0) >= hcThrottleMs(days);
};

/**
 * Gabungkan permintaan yang datang saat sinkron lain masih berjalan.
 *
 * Dulu permintaan seperti itu cuma di-`return` alias DIBUANG — dan pemanggil terpentingnya,
 * dorongan sesi latihan ke HC setelah disimpan, sudah terlanjur menghapus flagnya sebelum
 * memanggil. Menyimpan latihan saat sinkron 30 hari masih jalan berarti sesinya tidak pernah
 * terkirim sampai sinkron berikutnya.
 *
 * Jendela TERLEBAR yang menang (mencakup yang lebih sempit), dan sekali saja ada permintaan
 * non-silent, hasil gabungannya non-silent — kalau tidak, sinkron manual kehilangan laporannya.
 */
export const gabungAntrean = (antre, permintaan) => ({
  days: Math.max(Number(permintaan?.days) || 0, Number(antre?.days) || 0),
  silent: permintaan?.silent !== false && antre?.silent !== false,
});
