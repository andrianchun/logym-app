// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Nanti kamu harus mengganti teks "KODE_RAHASIA_..." ini 
// dengan kode asli dari akun Firebase Console milikmu.
const firebaseConfig = {
  apiKey: "AIzaSyCHyEzi6EH9gxJnnUgCSagCWwQKtIQfMKU",
  authDomain: "lyfit-andrian.firebaseapp.com",
  projectId: "lyfit-andrian",
  storageBucket: "lyfit-andrian.firebasestorage.app",
  messagingSenderId: "594058185444",
  appId: "1:594058185444:web:fd2aa6eabcf878dd9cbaf1"
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