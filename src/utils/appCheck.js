import { Capacitor } from '@capacitor/core';
import { getApp } from 'firebase/app';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';

/**
 * App Check: membuktikan bahwa panggilan ke Firestore & Cloud Functions datang dari LOGYM ASLI,
 * bukan dari APK bongkaran atau skrip yang memakai config Firebase kita (config itu terbaca
 * bebas di bundle publik logym.web.app).
 *
 * KENAPA LEWAT CustomProvider, BUKAN provider bawaan.
 * Logym bicara ke Firebase memakai SDK WEB dari dalam WebView (lihat src/firebase.js). Play
 * Integrity — satu-satunya mekanisme yang bisa membuktikan keaslian binary — cuma tersedia di
 * SDK NATIVE. Kalau App Check diinisialisasi langsung dari JS, ia jatuh ke reCAPTCHA, yang cuma
 * membuktikan "ini browser sungguhan, bukan skrip": APK bongkaran memuat JS yang sama di WebView
 * yang sama, jadi tetap lolos. Jadi tokennya diambil di lapisan native lalu disuapkan ke SDK web.
 * Ini pola resmi @capacitor-firebase/app-check.
 *
 * KENAPA INI TETAP BEKERJA WALAU LOGYM DISEBAR SIDELOAD.
 * Untuk app di luar Play Store, `appRecognitionVerdict` memang selalu `UNRECOGNIZED_VERSION` dan
 * `appLicensingVerdict` selalu `UNLICENSED` — dua-duanya BUKAN kegagalan, dan jangan dijadikan
 * syarat. Yang menentukan adalah `certificateSha256Digest`, yang tetap dikirim Play Integrity dan
 * dicocokkan Firebase dengan sidik jari yang didaftarkan di console. Pembongkar wajib menandatangani
 * ulang dengan kunci mereka sendiri, jadi digestnya berbeda dan attestation-nya gagal.
 *
 * GAGAL DENGAN LEMBUT — DISENGAJA.
 * Selama App Check masih "monitoring" di console (dan itu harus lama, sampai hampir semua user
 * memakai build yang mengirim token), kegagalan di sini TIDAK BOLEH menjatuhkan aplikasi. Firestore
 * dan Functions tetap melayani permintaan tanpa token sampai enforcement dinyalakan.
 *
 * PRASYARAT DI CONSOLE (tidak ada satu pun yang bisa dikerjakan dari repo ini):
 *  1. Play Console: tambahkan entri app `com.andrianchun.logym` (boleh draft, tidak perlu terbit),
 *     lalu App Integrity -> Link Cloud project ke project yang sama dengan Firebase (hexa-life).
 *  2. Firebase Console -> App Check: daftarkan app Android dengan provider Play Integrity dan isi
 *     SHA-256 sidik jari sertifikat PENANDATANGAN APK-nya.
 *  3. Biarkan enforcement MATI dulu. Menyalakannya sekarang mengunci semua user di build lama.
 *
 * CATATAN KUNCI PENANDATANGAN: android/app/build.gradle masih memakai `signingConfigs.debug`.
 * Sidik jari yang didaftarkan harus sidik jari kunci itu. Kalau nanti pindah ke keystore rilis
 * sendiri, sidik jarinya harus diperbarui di console DAN semua user harus memasang ulang dari nol
 * (Android menolak update yang ditandatangani kunci berbeda).
 */
export const initAppCheck = async () => {
  // Web/PWA sengaja dilewati. Providernya di sana harus reCAPTCHA Enterprise, dan itu butuh site
  // key yang belum ada. Menyalakan App Check cuma di native adalah keadaan yang sah: selama
  // enforcement mati, tidak ada yang tertolak; saat dinyalakan nanti, jalur web harus sudah punya
  // providernya sendiri lebih dulu.
  if (!Capacitor.isNativePlatform()) return { enabled: false, reason: 'web' };

  try {
    const { FirebaseAppCheck } = await import('@capacitor-firebase/app-check');
    // Urutannya mengikat: native dulu, baru lapisan web. Dibalik, CustomProvider meminta token ke
    // lapisan yang belum siap dan panggilan pertamanya gagal.
    await FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true });
    const provider = new CustomProvider({
      // SDK App Check yang mengurus cache token, jadi di sini SELALU minta yang baru.
      getToken: () => FirebaseAppCheck.getToken(),
    });
    await initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
    return { enabled: true };
  } catch (err) {
    // Paling sering: prasyarat console di atas belum selesai. Bukan alasan menjatuhkan aplikasi.
    console.warn('[AppCheck] tidak aktif:', err?.message || err);
    return { enabled: false, reason: err?.message || String(err) };
  }
};
