// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Nanti kamu harus mengganti teks "KODE_RAHASIA_..." ini 
// dengan kode asli dari akun Firebase Console milikmu.
const firebaseConfig = {
  apiKey: "AIzaSyAYCQIrZXFB_J7zp4CkiUQ4OYljw5qaGWo",
  authDomain: "logym-id.firebaseapp.com",
  projectId: "logym-id",
  storageBucket: "logym-id.firebasestorage.app",
  messagingSenderId: "883134437221",
  appId: "1:883134437221:web:8a6579be8747a78b62b38c"
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