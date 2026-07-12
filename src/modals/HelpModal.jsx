import React from 'react';
import { HelpCircle, X } from 'lucide-react';

const HelpModal = ({ showHelp, setShowHelp, t, lang }) => {
  if (!showHelp) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={() => setShowHelp(false)}>
        <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border} p-5 pb-5`} onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center mb-4 shrink-0">
               <h3 className="font-black text-lg flex items-center">
                  <HelpCircle className="mr-2 text-sky-500"/> {lang.help || 'Tutorial'}
               </h3>
               <button onClick={() => setShowHelp(false)} className={`p-2 rounded-full ${t.btnBg} hover:text-rose-500`}>
                  <X size={20}/>
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 text-sm leading-relaxed pr-2 font-medium text-zinc-400">
                <div className={`p-4 rounded-xl ${t.bgApp} border ${t.border}`}>
                   <strong className={t.textMain}>Sinkronisasi Lintas Perangkat:</strong> Cukup masuk (login) menggunakan email & sandi yang sama di HP dan Laptop Anda. Sistem cloud Firestore akan langsung menyamakan data Anda dalam hitungan detik.
                </div>
                <div className={`p-4 rounded-xl ${t.bgApp} border ${t.border}`}>
                   <strong className={t.textMain}>Swipe Input:</strong> Geser ke atas/bawah pada angka set, repetisi, atau beban untuk mengubah nilai. Angka akan menyala saat berubah. Kolom harus di-klik sekali agar swipe aktif.
                </div>
                <div className={`p-4 rounded-xl ${t.bgApp} border ${t.border}`}>
                   <strong className={t.textMain}>Mode Edit Master:</strong> Klik ikon pensil di sebelah nama program. Di sini Anda bisa menata ulang program dan latihan (tahan dan geser ikon titik).
                </div>
                <div className={`p-4 rounded-xl ${t.bgApp} border ${t.border}`}>
                   <strong className={t.textMain}>Database Latihan:</strong> Jika gerakan/latihan yang Anda inginkan belum ada, buat sendiri melalui menu "Kelola Database Latihan" di Pengaturan. Anda dapat menyertakan link YouTube.
                </div>
                <div className={`p-4 rounded-xl ${t.bgApp} border ${t.border}`}>
                   <strong className={t.textMain}>Salin Jadwal:</strong> Di tab Kalender, gunakan tombol "+ Ulangi 7 Hari Lalu" untuk mengisi jadwal minggu ini dengan program yang sama seperti minggu lalu secara otomatis.
                </div>
            </div>

        </div>
    </div>
  );
};

export default HelpModal;