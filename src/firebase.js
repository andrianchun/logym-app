// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initAppCheck } from "./utils/appCheck";

// Logym dimigrasi dari project sendiri (logym-id) ke hexa-life — project Firebase yang sama
// kayak Darka/Domus/Lomeal, biar "seamless" dalam 1 database (1 identitas Auth bareng Lomeal,
// gak perlu jembatan bridgeLomealAuth lagi). Data lama Logym disalin ke collection prefix `logym_*`.
const firebaseConfig = {
  apiKey: 'AIzaSyBeeFfLIqvDEZFyY8fknqnV_IoQj6Z9M1s',
  authDomain: 'hexa-life.firebaseapp.com',
  projectId: 'hexa-life',
  storageBucket: 'hexa-life.firebasestorage.app',
  messagingSenderId: '545194651453',
  appId: '1:545194651453:web:03ba7d49e200467ffb1f54',
};

// Menyalakan Mesin
const app = initializeApp(firebaseConfig);

// Menyalakan Fitur Login/Register
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Menyalakan Fitur Database Master dengan Offline Persistence Aktif (PWA)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);

// Backend proxy AI (Cloud Functions region Jakarta)
export const functions = getFunctions(app, "asia-southeast2");

// App Check dinyalakan DI SINI, bukan di App.jsx, supaya jalannya sedini mungkin: token harus
// sudah siap sebelum Firestore/Functions mengirim permintaan pertamanya. Sengaja fire-and-forget
// dan gagal-dengan-lembut — selama enforcement di console masih mati, aplikasi harus tetap jalan
// persis seperti sekarang. Lihat src/utils/appCheck.js untuk alasan CustomProvider dan daftar
// prasyarat di console.
export const appCheckReady = initAppCheck();