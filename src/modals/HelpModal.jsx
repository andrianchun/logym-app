import React, { useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

const HelpModal = ({ showHelp, setShowHelp, t, lang }) => {
  useEffect(() => {
    if (!showHelp) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none no-swipe" onClick={() => setShowHelp(false)}>
        <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border ${t.border}`} onClick={e => e.stopPropagation()}>
            
            <div className={`p-4 border-b ${t.border} flex justify-between items-center shrink-0`}>
               <h3 className={`font-black text-lg ${t.textMain} flex items-center gap-2`}>
                  <HelpCircle size={20} className={t.textAccent || 'text-sky-500'}/> {lang?.help || 'Tutorial'}
               </h3>
               <button onClick={() => setShowHelp(false)} className={`p-1.5 rounded-full ${t.btnBg} hover:opacity-80 transition-all`} data-close-modal="true">
                  <X size={18} className={t.textMain}/>
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed font-medium overscroll-contain touch-pan-y hide-scrollbar">
                <div className={`p-4 rounded-2xl ${t.bgApp} border ${t.border}`}>
                   <strong className={`block text-sm font-bold ${t.textMain} mb-1`}>Sinkronisasi Lintas Perangkat:</strong> Cukup masuk (login) menggunakan email & sandi yang sama di HP dan Laptop Anda. Sistem cloud Firestore akan langsung menyamakan data Anda dalam hitungan detik.
                </div>
                <div className={`p-4 rounded-2xl ${t.bgApp} border ${t.border}`}>
                   <strong className={`block text-sm font-bold ${t.textMain} mb-1`}>Swipe Input:</strong> Geser ke atas/bawah pada angka set, repetisi, atau beban untuk mengubah nilai. Angka akan menyala saat berubah. Kolom harus di-klik sekali agar swipe aktif.
                </div>
                <div className={`p-4 rounded-2xl ${t.bgApp} border ${t.border}`}>
                   <strong className={`block text-sm font-bold ${t.textMain} mb-1`}>Mode Edit Master:</strong> Klik ikon pensil di sebelah nama program. Di sini Anda bisa menata ulang program dan latihan (tahan dan geser ikon titik).
                </div>
                <div className={`p-4 rounded-2xl ${t.bgApp} border ${t.border}`}>
                   <strong className={`block text-sm font-bold ${t.textMain} mb-1`}>Database Latihan:</strong> Jika gerakan/latihan yang Anda inginkan belum ada, buat sendiri melalui menu "Kelola Database Latihan" di Pengaturan. Anda dapat menyertakan link YouTube.
                </div>
                <div className={`p-4 rounded-2xl ${t.bgApp} border ${t.border}`}>
                   <strong className={`block text-sm font-bold ${t.textMain} mb-1`}>Salin Jadwal:</strong> Di tab Kalender, gunakan tombol "+ Ulangi 7 Hari Lalu" untuk mengisi jadwal minggu ini dengan program yang sama seperti minggu lalu secara otomatis.
                </div>
            </div>

        </div>
    </div>
  );
};

export default HelpModal;