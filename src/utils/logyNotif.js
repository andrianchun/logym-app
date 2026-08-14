// Canned, persona-flavored notification copy — deliberately NOT AI-generated per notification.
// Local notifications are scheduled ahead of time (sometimes days out) with no guarantee the
// device is online or the app is running when they fire, so the text has to be baked in up
// front. Multiple variants per persona/type avoid the same line repeating every single day.
// {placeholders} are filled in by getLogyNotification().
//
// PANJANG: judul <= ~30 karakter, body <= ~70. Notifikasi Android yang tidak dibentangkan hanya
// menampilkan SATU baris body — kalimat motivasi dua-tiga baris terpotong di tengah dan yang
// terbaca cuma separuh pesannya. Kalau menambah varian, ikuti batas itu; getLogyNotification
// punya self-check di bawah yang menolak teks kepanjangan.
export const LOGI_NOTIF_TEMPLATES = {
    prep: {
        santai: [
            ['Siap-siap ya', '{program} 30 menit lagi. Ambil botol minum, pemanasan dikit.'],
            ['{program} bentar lagi', '30 menit lagi mulai. Pemanasan ringan dulu yuk.'],
        ],
        galak: [
            ['30 menit lagi', '{program} sebentar lagi. Siap-siap sekarang, jangan mepet.'],
            ['Jangan mager', '30 menit sebelum {program}. Ganti baju sekarang.'],
        ],
        serius: [
            ['Pengingat sesi', '{program} dimulai 30 menit lagi. Siapkan alat dan pemanasan.'],
        ],
    },
    start: {
        santai: [
            ['Waktunya gas!', '{program} mulai sekarang. Buka Logym, gas set pertama.'],
            ['Cus mulai', 'Jadwal hari ini: {program}. Jangan ditunda ya.'],
        ],
        galak: [
            ['Sekarang. Gerak.', '{program} mulai detik ini. Buka app, gak usah drama.'],
        ],
        serius: [
            ['Sesi latihan dimulai', '{program} dijadwalkan mulai sekarang.'],
        ],
    },
    missed: {
        santai: [
            ['Balik yuk', '{days} hari absen. Gapapa capek, tapi jangan ilang momentum.'],
        ],
        galak: [
            ['{days} hari. Cukup.', 'Bolos {days} hari. Progress gak nunggu. Balik sekarang.'],
        ],
        serius: [
            ['Konsistensi menurun', '{days} hari terjadwal terlewat. Kembali ke jadwal disarankan.'],
        ],
    },
    // Hari tanpa latihan terjadwal. Dulu pengingat harian tetap menyuruh latihan tiap hari,
    // termasuk hari istirahat — bikin notifikasinya kehilangan wibawa dan gampang di-mute.
    rest: {
        santai: [
            ['Rest day', 'Gak ada jadwal hari ini. Otot tumbuhnya pas istirahat.'],
            ['Santai dulu', 'Jadwal kosong. Tidur cukup, makan bener, besok gas.'],
        ],
        galak: [
            ['Istirahat beneran', 'Gak ada jadwal. Recovery itu bagian kerjaan, bukan bolos.'],
        ],
        serius: [
            ['Hari pemulihan', 'Tidak ada sesi terjadwal. Pemulihan menjaga sesi berikutnya.'],
        ],
    },
    insight: {
        santai: [
            ['{exName} lu stuck', 'Flat {weeks} minggu di {maxWeight}kg. Ada ide, cek chat.'],
        ],
        galak: [
            ['{exName} mandek', '{weeks} minggu gak naik dari {maxWeight}kg. Buka chat.'],
        ],
        serius: [
            ['Plateau: {exName}', 'Stagnan {weeks} minggu di {maxWeight}kg. Saran ada di chat.'],
        ],
    },
};

// Batas panjang yang dipakai self-check di bawah dan saat menambah varian baru.
export const NOTIF_MAX_TITLE = 30;
export const NOTIF_MAX_BODY = 70;

// 'custom' has no fixed voice (it's a freeform LLM instruction, not something we can render
// without calling the API) — notifications fall back to 'santai' for that persona.
export const getLogyNotification = (type, persona, vars = {}) => {
    const pool = LOGI_NOTIF_TEMPLATES[type]?.[persona] || LOGI_NOTIF_TEMPLATES[type]?.santai || [];
    if (pool.length === 0) return null;
    const [titleTpl, bodyTpl] = pool[Math.floor(Math.random() * pool.length)];
    const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
    return { title: fill(titleTpl), body: fill(bodyTpl) };
};
