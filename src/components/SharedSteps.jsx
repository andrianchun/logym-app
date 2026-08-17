import { useState } from 'react';
import { Ruler, User, ShieldCheck, Link2 } from 'lucide-react';
import ScrollPicker from './ScrollPicker';
import LegalModal from './LegalModal';
export const computeAge = (dob) => {
  if (!dob) return 0;
  const diffMs = Date.now() - new Date(dob).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
};
// Removed static KULKAS_ITEMS as we will rely on Domus sync and searchFoods.

export const getSharedSteps = (t) => [
  { title: "Persetujuan Pengguna", key: 'consent', icon: <ShieldCheck className={`${t.textAccent} mb-4`} size={40} /> },
  { title: "Koneksi Aplikasi", key: 'connect', icon: <Link2 className={`${t.textAccent} mb-4`} size={40} /> },
  { title: "Identitas Diri", key: 'identity', icon: <User className={`${t.textAccent} mb-4`} size={40} /> },
  { title: "Data Fisik", key: 'biometrics', icon: <Ruler className={`${t.textAccent} mb-4`} size={40} /> }
];

export const isValidAge = (dob) => {
  if (!dob) return false;
  return computeAge(dob) > 9;
};

// useAI/setUseAI/handleNext/onSyncDomus (dipakai versi Lomeal buat step 'diet'/'kulkas')
// sengaja gak ada di sini — Logym cuma 4 step (consent/connect/identity/biometrics),
// gak ada yang butuh itu.
export const SharedStepRenderer = ({
  stepKey,
  answers,
  setAnswers,
  t,
  isDark,
  onHealthConnect,
  onAppleHealth,
  fromLogym
}) => {
  // Dipanggil TANPA SYARAT (bukan di dalam if (stepKey === 'consent')) — hook gak boleh
  // bersyarat. Tiap instance SharedStepRenderer punya stepKey TETAP seumur hidupnya
  // (satu per step di carousel), jadi aman, tapi tetap dipindah ke sini biar gak
  // melanggar Rules of Hooks yang dicek statis eslint-plugin-react-hooks.
  const [showLegalModal, setShowLegalModal] = useState(null);

  if (stepKey === 'consent') {
    const consents = answers.consents || { tos: false, data: false, ai: false, research: false };
    const setConsents = (newConsents) => setAnswers(prev => ({ ...prev, consents: typeof newConsents === 'function' ? newConsents(prev.consents || { tos: false, data: false, ai: false, research: false }) : newConsents }));

    return (
      <div className="flex-1 flex flex-col justify-between overflow-y-auto hide-scrollbar">
        <div className="flex flex-col gap-4">
          <p className={`caption font-medium ${t.textMuted}`}>Baca dan centang 3 poin wajib di bawah untuk melanjutkan.</p>
          <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${consents.tos ? `border-[var(--color-accent)] ${t.bgAccentSoft}` : (isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5')}`}>
            <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--color-accent)] shrink-0" checked={consents.tos} onChange={(e) => setConsents({ ...consents, tos: e.target.checked })} />
            <div className="flex-1">
              <p className={`text-sm font-bold leading-tight mb-1 ${t.textMain}`}>Medical & Injury Disclaimer</p>
              <p className={`text-xs leading-relaxed ${t.textMuted}`}>Logym adalah alat pencatat aktivitas & program latihan mandiri, BUKAN alat diagnosis, rujukan, atau pengganti nasihat medis/pelatih profesional. Program & rekomendasi latihan bisa tidak cocok untuk kondisi fisik tertentu — saya membebaskan pengembang dari tuntutan hukum terkait cedera, komplikasi kesehatan, atau efek latihan yang saya jalankan sendiri. <a href="#" onClick={(e) => { e.preventDefault(); setShowLegalModal('tos'); }} className="text-[var(--color-accent)] underline">Baca S&K lengkap</a></p>
            </div>
          </label>
          <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${consents.data ? `border-[var(--color-accent)] ${t.bgAccentSoft}` : (isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5')}`}>
            <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--color-accent)] shrink-0" checked={consents.data} onChange={(e) => setConsents({ ...consents, data: e.target.checked })} />
            <div className="flex-1">
              <p className={`text-sm font-bold leading-tight mb-1 ${t.textMain}`}>Privasi Data Sensitif</p>
              <p className={`text-xs leading-relaxed ${t.textMuted}`}>Data fisik & aktivitas latihan saya (tinggi, berat, riwayat latihan) tersimpan aman di server (dilindungi standar enkripsi Google Cloud saat tersimpan), digunakan hanya untuk fungsi aplikasi ini, dan tidak dibagikan ke pihak ketiga untuk kepentingan komersial. <a href="#" onClick={(e) => { e.preventDefault(); setShowLegalModal('privacy'); }} className="text-[var(--color-accent)] underline">Baca Kebijakan Privasi</a></p>
            </div>
          </label>
          <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${consents.ai ? `border-[var(--color-accent)] ${t.bgAccentSoft}` : (isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5')}`}>
            <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--color-accent)] shrink-0" checked={consents.ai} onChange={(e) => setConsents({ ...consents, ai: e.target.checked })} />
            <div className="flex-1">
              <p className={`text-sm font-bold leading-tight mb-1 ${t.textMain}`}>Persetujuan Fitur AI (Cloud)</p>
              <p className={`text-xs leading-relaxed ${t.textMuted}`}>Saya setuju data aktivitas dan rutinitas latihan dikirimkan ke layanan AI cloud (Google Gemini) kalau saya mengaktifkan fitur asisten AI. Saya tidak akan memasukkan data identitas spesifik di luar profil.</p>
            </div>
          </label>

          <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${consents.research ? `border-[var(--color-accent)] ${t.bgAccentSoft}` : (isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5')}`}>
              <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--color-accent)] shrink-0" checked={!!consents.research} onChange={(e) => setConsents({ ...consents, research: e.target.checked })} />
              <div className="flex-1">
                <p className={`text-sm font-bold leading-tight mb-1 ${t.textMain} flex items-center gap-2 flex-wrap`}>
                  Riset Anonim
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/10' : 'bg-black/10'} ${t.textMuted}`}>Opsional</span>
                </p>
                <p className={`text-xs leading-relaxed ${t.textMuted}`}>Data saya yang SUDAH DIANONIMKAN (tanpa nama, tanpa identitas) boleh dipakai pengembang untuk riset internal demi meningkatkan kualitas aplikasi.</p>
              </div>
            </label>
          </div>
        </div>
        <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} t={t} isDark={isDark} />
      </div>
    );
  }

  if (stepKey === 'connect') {
    return (
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar pb-6">
        {fromLogym ? (
          <div className={`p-4 rounded-2xl border-2 ${t.borderAccent} ${t.bgAccentSoft} text-center`}>
            <div className="w-12 h-12 mx-auto mb-3 bg-black rounded-xl flex items-center justify-center shadow-lg p-1.5">
              <img src="/lomeal-icon.webp" alt="Lomeal" className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
            </div>
            <p className={`body-md font-bold ${t.textMain}`}>Data Profil Terhubung!</p>
            <p className={`caption font-medium mt-1 ${t.textMuted}`}>Semua data yang tersedia di ekosistem Hexa-Life sudah ditarik otomatis — cek di langkah berikutnya.</p>
            <div className={`w-full h-px ${isDark ? 'bg-white/10' : 'bg-black/10'} my-3`} />
            <p className={`caption mt-1 ${t.textMuted}`}>Pantau dan lengkapi target asupan nutrisi harianmu dengan Lomeal.</p>
            <a href="https://lomeal.web.app" target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block px-4 py-1.5 rounded-lg text-xs font-bold bg-black text-white active:scale-95 transition-transform`}>Install Lomeal</a>
          </div>
        ) : (
          <div className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'} text-center`}>
            <div className="w-12 h-12 mx-auto mb-3 bg-black rounded-xl flex items-center justify-center shadow-lg p-1.5">
              <img src="/lomeal-icon.webp" alt="Lomeal" className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
            </div>
            <p className={`body-md font-bold ${t.textMain}`}>Belum punya Lomeal?</p>
            <p className={`caption mt-1 ${t.textMuted}`}>Lomeal adalah aplikasi tracker nutrisi yang terhubung langsung dengan Logym. Install sekarang untuk mempermudah tracking asupan nutrisi kamu!</p>
            <a href="https://lomeal.web.app" target="_blank" rel="noopener noreferrer" className={`mt-3 inline-block px-4 py-2 rounded-xl text-sm font-bold bg-black text-white active:scale-95 transition-transform`}>Install Lomeal</a>
          </div>
        )}
        
        <div className="w-full h-px bg-black/5 my-1" />
        
        <p className={`caption font-bold text-center ${t.textMuted}`}>Atau hubungkan dengan sumber lain:</p>
        
        <div className="flex flex-col gap-2">
          <button onClick={onHealthConnect} className={`flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-white hover:bg-black/5'} transition-colors text-left active:scale-[0.98]`}>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-black/5 shadow-sm">
              <img src="/health-connect.webp" alt="Health Connect" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <p className={`body-md font-bold ${t.textMain}`}>Health Connect</p>
              <p className={`caption ${t.textMuted}`}>Android (Google Fit, Samsung Health)</p>
            </div>
          </button>
          
          <button onClick={onAppleHealth} className={`flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-white hover:bg-black/5'} transition-colors text-left active:scale-[0.98]`}>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-black/5 shadow-sm">
              <img src="/apple-health.webp" alt="Apple Health" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <p className={`body-md font-bold ${t.textMain}`}>Apple Health</p>
              <p className={`caption ${t.textMuted}`}>iOS (iPhone, Apple Watch)</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (stepKey === 'identity') {
    return (
      <div className="flex flex-col pb-2 space-y-4 w-full">
        <div>
          <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Nama Panggilan</label>
          <input 
            type="text" 
            placeholder="Siapa namamu?"
            value={answers.name || ''} 
            onChange={(e) => setAnswers(prev => ({...prev, name: e.target.value}))} 
            className={`w-full p-4 rounded-xl border-2 font-bold ${answers.name?.trim().length > 0 ? t.borderAccent : 'border-transparent'} ${t.inputBg} ${t.textMain} outline-none transition-all`}
          />
        </div>
        <div>
          <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Jenis Kelamin</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAnswers(prev => ({...prev, gender: 'male'}))} className={`p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${answers.gender === 'male' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="5"></circle><line x1="13.5" y1="10.5" x2="21" y2="3"></line><polyline points="16 3 21 3 21 8"></polyline></svg>
            </button>
            <button onClick={() => setAnswers(prev => ({...prev, gender: 'female'}))} className={`p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-3 ${answers.gender === 'female' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="5"></circle><line x1="12" y1="15" x2="12" y2="22"></line><line x1="9" y1="19" x2="15" y2="19"></line></svg>
            </button>
          </div>
        </div>
        <div className="mt-4">
          <label className={`text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block`}>Tanggal Lahir</label>
          <input 
            type="date" 
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
            value={answers.dob || ''} 
            onChange={(e) => setAnswers(prev => ({...prev, dob: e.target.value}))} 
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            className={`w-full p-4 rounded-xl border-2 font-bold ${answers.dob ? (isValidAge(answers.dob) ? t.borderAccent : 'border-rose-500 text-rose-500') : 'border-transparent'} ${t.inputBg} ${answers.dob && !isValidAge(answers.dob) ? '' : t.textMain} outline-none transition-all`}
          />
          {answers.dob && !isValidAge(answers.dob) ? (
            <p className={`text-[11px] mt-2 text-center font-bold text-rose-500 animate-in fade-in slide-in-from-top-1`}>Usia kamu harus di atas 13 tahun untuk menggunakan Logym.</p>
          ) : (
            <p className={`text-[11px] mt-2 text-center font-bold ${t.textMuted}`}>Minimal usia 13 tahun.</p>
          )}
        </div>
      </div>
    );
  }

  if (stepKey === 'biometrics') {
    return (
      <div className="flex flex-col pb-2 space-y-2 w-full max-w-md mx-auto">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
          <div>
            <label className={`text-xs sm:text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Tinggi (cm)</label>
            <div className="flex justify-center w-full">
              <ScrollPicker 
                value={answers.height || 165} 
                onChange={(val) => setAnswers(prev => ({...prev, height: val}))} 
                min={100} max={250} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
              />
            </div>
          </div>
          <div className="w-full">
            <label className={`text-xs sm:text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Berat (kg)</label>
            <div className="flex justify-center w-full">
              <ScrollPicker 
                value={answers.weight || 60} 
                onChange={(val) => setAnswers(prev => ({...prev, weight: val}))} 
                min={30} max={200} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
              />
            </div>
          </div>
          <div className="w-full">
            <label className={`text-xs sm:text-sm font-bold ${!isDark ? 'text-black' : t.textMain} mb-2 block text-center`}>Target (kg)</label>
            <div className="flex justify-center w-full">
              <ScrollPicker 
                value={answers.targetWeight || 55} 
                onChange={(val) => setAnswers(prev => ({...prev, targetWeight: val}))} 
                min={30} max={200} step={1} theme={isDark ? 'dark' : 'light'} width="w-full" height={200} t={t}
              />
            </div>
          </div>
        </div>
        
        {/* Smart BMI Display */}
        {(() => {
          const hMeter = (answers.height || 165) / 100;
          const currentBmi = hMeter > 0 ? ((answers.weight || 60) / (hMeter * hMeter)).toFixed(1) : 0;
          const targetBmi = hMeter > 0 ? ((answers.targetWeight || 55) / (hMeter * hMeter)).toFixed(1) : 0;
          
          const diffKg = (answers.targetWeight || 55) - (answers.weight || 60);
          const absDiff = Math.abs(diffKg).toFixed(1);
          const weeks = Math.round(Math.abs(diffKg) / 0.5);
          let timeString = weeks < 4 ? `${weeks} minggu` : `${Math.round(weeks/4)} bulan`;
          
          let insightText = '';
          if (diffKg < -0.5) insightText = `Turun ${absDiff} kg dlm ~${timeString}`;
          else if (diffKg > 0.5) insightText = `Naik ${absDiff} kg dlm ~${timeString}`;
          else insightText = 'Mempertahankan berat';

          return (
            <div className={`mt-4 p-3 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border flex justify-between items-center text-sm`}>
              <div className="flex flex-col">
                <span className={`text-[10px] ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>BMI Kamu</span>
                <span className={`font-bold ${!isDark ? 'text-black' : t.textMain}`}>{currentBmi}</span>
              </div>
              <div className="flex flex-col items-center px-2">
                <span className={`font-bold ${t.textAccent} text-[11px] bg-black/5 dark:bg-white/10 px-2 py-1 rounded-full whitespace-nowrap`}>{insightText}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className={`text-[10px] ${!isDark ? 'text-black/60' : 'text-slate-400'}`}>Target BMI</span>
                <span className={`font-bold ${!isDark ? 'text-black' : t.textMain}`}>{targetBmi}</span>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ponytail: step 'activityLevel'/'medical' yang dulu di sini dihapus, bukan diperbaiki —
  // referensinya (MEDICAL_CONDITIONS, OptionCard, handleNext) nunjuk ke sesuatu yang gak
  // pernah ada di codebase Logym (kelihatannya tersalin mentah dari SharedDietSteps.jsx
  // punya Lomeal, termasuk teks "Alergi Makanan" yang gak relevan buat app fitness).
  // Steps itu juga TIDAK ada di getSharedSteps() (cuma 4 step: consent/connect/identity/
  // biometrics), jadi selama ini gak ke-render — tapi begitu ada yang nambahin ke
  // getSharedSteps() nanti, bakal langsung ReferenceError. Kalau activityLevel/riwayat
  // medis mau beneran dikumpulkan di onboarding Logym, itu perlu MEDICAL_CONDITIONS +
  // OptionCard beneran dulu (belum ada), bukan sekadar nyalain step yang isinya rusak.

  return null;
};
