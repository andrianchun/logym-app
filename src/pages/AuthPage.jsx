import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, Activity } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';

// --- IMPORT MESIN FIREBASE & CAPACITOR NATIVE ---
import { auth, googleProvider } from '../firebase';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

const AuthPage = ({ t, theme, soundEnabled, onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const bannedMsg = localStorage.getItem('lyfit_banned_msg');
    if (bannedMsg) {
      setErrorMsg(bannedMsg);
      localStorage.removeItem('lyfit_banned_msg');
    }
  }, []);

  // 1. FUNGSI LOGIN & REGISTER MANUAL
  const handleSubmit = async (e) => {
    e.preventDefault();
    playSoundEffect('click', soundEnabled);
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        onLogin({ 
            uid: userCredential.user.uid, 
            email: userCredential.user.email, 
            name: userCredential.user.displayName || 'Sobat LyFit',
            photoURL: userCredential.user.photoURL
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCredential.user, { displayName: formData.name });
        onLogin({ 
            uid: userCredential.user.uid, 
            email: userCredential.user.email, 
            name: formData.name || 'Sobat LyFit',
            photoURL: userCredential.user.photoURL
        });
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMsg('Email atau password salah.');
      } else if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('Email sudah terdaftar. Silakan login.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('Password terlalu lemah (minimal 6 karakter).');
      } else {
        setErrorMsg('Terjadi kesalahan jaringan. Coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. FUNGSI LOGIN GOOGLE (SUDAH MENDUKUNG DIALOG NATIVE HP)
  const handleGoogleLogin = async () => {
    playSoundEffect('click', soundEnabled);
    setErrorMsg('');
    setIsLoading(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // JALUR APK ANDROID: Ini yang akan memicu pop-up daftar akun Google + foto profil asli bawaan HP
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        
        onLogin({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || 'Sobat LyFit',
          photoURL: userCredential.user.photoURL
        });
      } else {
        // JALUR WEB BROWSER LAPTOP
        const result = await signInWithPopup(auth, googleProvider);
        onLogin({ 
          uid: result.user.uid, 
          email: result.user.email, 
          name: result.user.displayName || 'Sobat LyFit',
          photoURL: result.user.photoURL
        });
      }
    } catch (error) {
      console.error(error);
      // Tampilkan pesan error aslinya langsung ke layar
      setErrorMsg('Gagal: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. FUNGSI LUPA PASSWORD
  const handleForgotPassword = async () => {
    playSoundEffect('click', soundEnabled);
    if (!formData.email) {
        setErrorMsg('Silakan isi kolom email terlebih dahulu, lalu klik tombol ini lagi.');
        return;
    }
    setIsLoading(true);
    try {
        await sendPasswordResetEmail(auth, formData.email);
        alert('Tautan reset password telah dikirim ke email Anda. Cek folder Inbox/Spam.');
        setErrorMsg('');
    } catch (error) {
        console.error(error);
        setErrorMsg('Gagal mengirim email reset. Pastikan email terdaftar.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${t.bgApp} transition-colors duration-300`}>
      <div className={`w-full max-w-md p-8 sm:p-10 rounded-[2rem] border ${t.border} ${t.bgCard} shadow-2xl animate-in zoom-in-95 fade-in duration-500 relative overflow-hidden`}>
        
        {/* Dekorasi Cahaya Latar */}
        <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${t.gradientBg} pointer-events-none`}></div>
        <div className={`absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-20 bg-gradient-to-tr ${t.gradientBg} pointer-events-none`}></div>

        <div className="relative z-10">
            <div className="text-center mb-8 flex flex-col items-center">
               {/* SUNTIKAN LOGO PREMIUM: Menggunakan logo vertikal (620x600) */}
               <img src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'} alt="LyFit Logo" className="w-32 h-32 mb-4 object-contain drop-shadow-2xl" />

               <p className={`body-lg font-bold ${t.textMuted}`}>
                  {isLoginMode ? 'Your Fitness Tracker Buddy (by Andrian Chun)' : 'Mulai perjalanan fitness-mu hari ini.'}
               </p>
            </div>

            {/* Kotak Pesan Error */}
            {errorMsg && (
               <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 body-md rounded-xl text-center animate-in fade-in">
                  {errorMsg}
               </div>
            )}

            <button onClick={handleGoogleLogin} disabled={isLoading} className={`w-full py-3.5 px-4 mb-6 rounded-2xl font-bold flex items-center justify-center transition-all border ${t.border} hover:${t.borderAccentSoft} ${t.btnBg} shadow-sm group disabled:opacity-50`}>
               <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
               </svg>
               {isLoginMode ? 'Masuk dengan Google' : 'Daftar dengan Google'}
            </button>

            <div className="flex items-center mb-6">
                <div className={`flex-grow border-t border-dashed ${t.border}`}></div>
                <span className={`px-4 text-[10px] font-black uppercase ${t.textMuted}`}>ATAU EMAIL</span>
                <div className={`flex-grow border-t border-dashed ${t.border}`}></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               {!isLoginMode && (
                 <div className={`flex items-center ${t.inputBg} rounded-2xl px-4 py-3 border border-transparent focus-within:${t.borderAccentSoft} transition-colors`}>
                    <User size={20} className={t.textMuted} />
                    <input type="text" placeholder="Nama Panggilan" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`ml-3 bg-transparent w-full outline-none ${t.textMain} font-medium`} disabled={isLoading}/>
                 </div>
               )}
               
               <div className={`flex items-center ${t.inputBg} rounded-2xl px-4 py-3 border border-transparent focus-within:${t.borderAccentSoft} transition-colors`}>
                  <Mail size={20} className={t.textMuted} />
                  <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className={`ml-3 bg-transparent w-full outline-none ${t.textMain} font-medium`} disabled={isLoading}/>
               </div>
               
               <div className={`flex items-center ${t.inputBg} rounded-2xl px-4 py-3 border border-transparent focus-within:${t.borderAccentSoft} transition-colors`}>
                  <Lock size={20} className={t.textMuted} />
                  <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required className={`ml-3 bg-transparent w-full outline-none ${t.textMain} font-medium`} disabled={isLoading}/>
               </div>

               {isLoginMode && (
                   <div className="flex justify-end">
                       <button type="button" onClick={handleForgotPassword} disabled={isLoading} className={`body-md ${t.textMuted} hover:${t.textAccent} transition-colors`}>
                           Lupa Password?
                       </button>
                   </div>
               )}

               <button type="submit" disabled={isLoading} className={`w-full py-4 mt-2 rounded-2xl bg-gradient-to-r ${t.gradientBg} text-white font-black body-lg flex items-center justify-center shadow-lg ${t.shadowAccent} active:scale-[0.98] transition-all disabled:opacity-70`}>
                  {isLoading ? <Loader2 size={24} className="animate-spin" /> : (isLoginMode ? 'Masuk Sekarang' : 'Buat Akun')} 
                  {!isLoading && <ArrowRight size={20} className="ml-2"/>}
               </button>
            </form>

            <div className="mt-8 text-center">
                <button type="button" onClick={() => { playSoundEffect('click', soundEnabled); setIsLoginMode(!isLoginMode); setErrorMsg(''); }} disabled={isLoading} className={`body-lg font-bold ${t.textMuted} hover:${t.textMain} transition-colors`}>
                    {isLoginMode ? "Belum punya akun? " : "Sudah punya akun? "}
                    <span className={t.textAccent}>{isLoginMode ? "Daftar Gratis" : "Masuk"}</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;