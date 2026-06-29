import React, { useState, useEffect } from 'react';
import { X, Trash2, CheckCircle, ShieldAlert, FileText, User, Bug, ListX, Ban } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, doc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getBannedUsers, unbanUserGlobal, banUserGlobal } from '../utils/moderationApi';
import { getCurrentWeekId } from '../utils/communityApi';

export default function ModerationPanel({ isDark, t, onClose, onNavigateToPost, onNavigateToUser }) {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    else fetchBannedUsers();
  }, [activeTab]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'community_reports'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const fetchBannedUsers = async () => {
    setIsLoading(true);
    const users = await getBannedUsers();
    setBannedUsers(users);
    setIsLoading(false);
  };

  const handleDismissReport = async (reportId) => {
    if (!window.confirm("Abaikan laporan ini?")) return;
    try {
      await deleteDoc(doc(db, 'community_reports', reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (e) {
      alert("Gagal menghapus laporan.");
    }
  };

  const handleDeletePost = async (reportId, postId) => {
    if (!window.confirm("Hapus postingan ini secara permanen dari server?")) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
      
      const relatedReports = reports.filter(r => r.targetId === postId);
      for (const r of relatedReports) {
        await deleteDoc(doc(db, 'community_reports', r.id));
      }
      
      setReports(prev => prev.map(r => r.targetId === postId ? { ...r, isDeleted: true } : r));
      alert("Postingan dihapus!");
    } catch (e) {
      alert("Gagal mengeksekusi.");
    }
  };

  const handleUnban = async (userId) => {
    if (!window.confirm("Buka Banned untuk akun ini? Mereka akan bisa login kembali.")) return;
    try {
      const success = await unbanUserGlobal(userId);
      if (success) {
        setBannedUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false } : u));
        alert("Banned berhasil dibuka.");
      } else {
        alert("Gagal membuka banned.");
      }
    } catch (e) {
      alert("Terjadi kesalahan.");
    }
  };

  const handleReban = async (userId) => {
    if (!window.confirm("Banned kembali akun ini?")) return;
    try {
      const success = await banUserGlobal(userId);
      if (success) {
        setBannedUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: true } : u));
        alert("Akun berhasil di-banned kembali.");
      } else {
        alert("Gagal melakukan Banned.");
      }
    } catch (e) {
      alert("Terjadi kesalahan.");
    }
  };

  const seedLeaderboard = async () => {
    try {
      const weekId = getCurrentWeekId();
      const lbRef = doc(db, 'leaderboards', weekId);
      
      const dummies = [
        { id: 'dummy_1', name: 'Budi Santoso', photo: '', score: 120 },
        { id: 'dummy_2', name: 'Siti Aminah', photo: '', score: 95 },
        { id: 'dummy_3', name: 'Andi Perkasa', photo: '', score: 88 },
        { id: 'dummy_4', name: 'Dewi Lestari', photo: '', score: 82 },
        { id: 'dummy_5', name: 'Joko Anwar', photo: '', score: 75 },
        { id: 'dummy_6', name: 'Rina Nose', photo: '', score: 60 },
        { id: 'dummy_7', name: 'Ahmad Dhani', photo: '', score: 55 },
        { id: 'dummy_8', name: 'Luna Maya', photo: '', score: 40 },
        { id: 'dummy_9', name: 'Reza Rahadian', photo: '', score: 35 },
        { id: 'dummy_10', name: 'Agnes Monica', photo: '', score: 20 },
      ];

      const scores = {};
      dummies.forEach(d => {
        scores[d.id] = { name: d.name, photoUrl: d.photo, score: d.score };
      });

      await setDoc(lbRef, { scores }, { merge: true });
      alert("Berhasil mengisi 10 dummy akun di Leaderboard!");
    } catch(e) {
      console.error(e);
      alert("Gagal mengisi data dummy.");
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className={`w-full sm:max-w-md h-[85vh] ${isDark ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl`}>
        {/* Header */}
        <div className={`px-4 pt-4 pb-3 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/8'}`}>
          <h3 className={`font-black text-lg flex items-center gap-2 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
            <ShieldAlert size={20} /> Panel Moderasi
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={seedLeaderboard} title="Isi Dummy Leaderboard" className="p-2 rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/40 transition-colors">
              <Bug size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/10 mb-4 px-4 pt-4">
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'reports' ? 'border-[#41759b] text-[#41759b]' : 'border-transparent text-white/50 hover:text-white/80'}`}
          >
            Laporan Masuk
          </button>
          <button 
            onClick={() => setActiveTab('banned')} 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'banned' ? 'border-[#41759b] text-[#41759b]' : 'border-transparent text-white/50 hover:text-white/80'}`}
          >
            Daftar Blacklist
          </button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {isLoading ? (
            <div className="text-center py-10 opacity-50 font-bold">Memuat            </div>
          ) : activeTab === 'reports' ? (
            reports.length === 0 ? (
              <div className="text-center text-white/50 py-10">
                <CheckCircle size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">Hore! Tidak ada laporan baru.</p>
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="mb-4 bg-white/5 border border-white/10 p-4 rounded-2xl relative">
                  <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    {report.type === 'post' ? <FileText size={14}/> : <User size={14}/>}
                    Pelanggaran {report.type === 'post' ? 'Postingan' : 'Pengguna'}
                  </div>
                  
                  <p className="text-sm mb-1"><span className="opacity-50">Pelapor UID:</span> <code className="text-[10px]">{report.reporterId}</code></p>
                  <p className="text-sm mb-1"><span className="opacity-50">Target ID:</span> <code className="text-[10px]">{report.targetId}</code></p>
                  <div className="mt-3 mb-4 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-medium border-l-2 border-rose-500">
                    "{report.reason}"
                  </div>

                  <div className="flex gap-2">
                    {report.isDeleted ? (
                      <div className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs text-center border border-emerald-500/20">
                        <CheckCircle size={14} className="inline mr-1 -mt-0.5" /> Sudah Dihapus
                      </div>
                    ) : (
                      <>
                        <button onClick={() => handleDismissReport(report.id)} className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/5 font-bold text-xs hover:opacity-80">
                          Abaikan
                        </button>
                        {report.type === 'post' && (
                          <>
                            <button onClick={() => onNavigateToPost?.(report.targetId)} className="flex-1 py-2 rounded-xl bg-[#41759b] text-white font-bold text-xs shadow-lg shadow-[#41759b]/30 hover:opacity-90">
                              Lihat Post
                            </button>
                            <button onClick={() => handleDeletePost(report.id, report.targetId)} className="flex-1 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/30 hover:opacity-90">
                              Hapus Post
                            </button>
                          </>
                        )}
                        {report.type === 'user' && (
                          <button onClick={() => onNavigateToUser?.(report.targetId)} className="flex-1 py-2 rounded-xl bg-[#41759b] text-white font-bold text-xs shadow-lg shadow-[#41759b]/30 hover:opacity-90">
                            Lihat Profil
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            bannedUsers.length === 0 ? (
              <div className="text-center text-white/50 py-10">
                <ShieldAlert size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">Belum ada akun di daftar blacklist.</p>
              </div>
            ) : (
              bannedUsers.map(user => (
                <div key={user.id} className="mb-4 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0">
                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{user.name || 'Pengguna'}</p>
                        {user.isBanned ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">DIBANNED</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">AKTIF</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/50 truncate">{user.email}</p>
                      <p className="text-[10px] text-rose-400 mt-0.5">UID: {user.id}</p>
                    </div>
                  </div>
                  {user.isBanned ? (
                    <button onClick={() => handleUnban(user.id)} className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors">
                      Unban
                    </button>
                  ) : (
                    <button onClick={() => handleReban(user.id)} className="shrink-0 px-3 py-2 rounded-xl bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-colors">
                      Ban Lagi
                    </button>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
