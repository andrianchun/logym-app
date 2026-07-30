// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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