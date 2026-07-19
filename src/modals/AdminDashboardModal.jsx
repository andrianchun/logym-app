import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, MessageSquare, Bug, Check, Trash2, Loader2, Search, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getBannedUsers, unbanUserGlobal } from '../utils/moderationApi';
import useDialog from '../hooks/useDialog';

export default function AdminDashboardModal({ showModal, setShowModal, user }) {
    const [activeTab, setActiveTab] = useState('ai_inbox');
    
    const [inboxItems, setInboxItems] = useState([]);
    const [bannedUsers, setBannedUsers] = useState([]);
    const [bugReports, setBugReports] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert, showConfirm, dialog } = useDialog();

    // Pastikan hanya admin yang bisa akses (pengaman ganda)
    const isAdmin = user?.email === 'untheryan@gmail.com';

    useEffect(() => {
        if (showModal && isAdmin) {
            fetchData(activeTab);
        }
    }, [showModal, activeTab, isAdmin]);

    const fetchData = async (tab) => {
        setIsLoading(true);
        try {
            if (tab === 'ai_inbox') {
                const q = query(collection(db, 'ai_inbox'), orderBy('timestamp', 'desc'));
                const snap = await getDocs(q);
                setInboxItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else if (tab === 'banned') {
                const users = await getBannedUsers();
                setBannedUsers(users);
            } else if (tab === 'bugs') {
                const q = query(collection(db, 'bug_reports'), orderBy('timestamp', 'desc'));
                const snap = await getDocs(q);
                setBugReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (error) {
            console.error("Gagal mengambil data admin:", error);
            showAlert("Gagal mengambil data dari database.", { type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnban = async (userId) => {
        const confirm = await showConfirm(
            "Lepaskan ban untuk pengguna ini?",
            { title: "Unban User", confirmText: "Unban", cancelText: "Batal" }
        );
        if (!confirm) return;

        const success = await unbanUserGlobal(userId);
        if (success) {
            showAlert("Ban berhasil dilepaskan.", { type: 'success' });
            fetchData('banned');
        } else {
            showAlert("Gagal melepaskan ban.", { type: 'error' });
        }
    };

    const handleDeleteInbox = async (id) => {
        if (!window.confirm("Hapus pertanyaan ini dari inbox?")) return;
        try {
            await deleteDoc(doc(db, 'ai_inbox', id));
            setInboxItems(prev => prev.filter(i => i.id !== id));
        } catch (e) {
            showAlert("Gagal menghapus.", { type: 'error' });
        }
    };

    const handleMarkBugResolved = async (id, currentStatus) => {
        const newStatus = currentStatus === 'resolved' ? 'open' : 'resolved';
        try {
            await updateDoc(doc(db, 'bug_reports', id), { status: newStatus });
            setBugReports(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
        } catch (e) {
            showAlert("Gagal mengupdate status.", { type: 'error' });
        }
    };

    const handleDeleteBug = async (id) => {
        if (!window.confirm("Hapus laporan bug ini?")) return;
        try {
            await deleteDoc(doc(db, 'bug_reports', id));
            setBugReports(prev => prev.filter(b => b.id !== id));
        } catch (e) {
            showAlert("Gagal menghapus.", { type: 'error' });
        }
    };

    if (!showModal || !isAdmin) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Header */}
            <div className="px-4 pt-4 pb-4 border-b border-white/10 shrink-0 bg-neutral-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl text-red-500">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Superadmin Dasbor</h1>
                        <p className="text-xs text-red-400 font-mono">Top Secret Area • Authorized Only</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-neutral-300 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-4 bg-neutral-900 border-b border-white/10 shrink-0 overflow-x-auto hide-scrollbar gap-4">
                <button 
                    onClick={() => setActiveTab('ai_inbox')}
                    className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'ai_inbox' ? 'border-red-500 text-red-500' : 'border-transparent text-neutral-500 hover:text-white'}`}
                >
                    <MessageSquare size={16} /> Kotak Masuk AI
                </button>
                <button 
                    onClick={() => setActiveTab('banned')}
                    className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'banned' ? 'border-red-500 text-red-500' : 'border-transparent text-neutral-500 hover:text-white'}`}
                >
                    <ShieldAlert size={16} /> Daftar Banned
                </button>
                <button 
                    onClick={() => setActiveTab('bugs')}
                    className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'bugs' ? 'border-red-500 text-red-500' : 'border-transparent text-neutral-500 hover:text-white'}`}
                >
                    <Bug size={16} /> Laporan Bug
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-neutral-950">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
                        <Loader2 size={32} className="animate-spin mb-4" />
                        <p className="text-sm font-medium">Mengambil data intelijen...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'ai_inbox' && (
                            <div className="space-y-3">
                                {inboxItems.length === 0 ? (
                                    <div className="text-center p-8 text-neutral-500 text-sm">Tidak ada pertanyaan terekam.</div>
                                ) : (
                                    inboxItems.map(item => (
                                        <div key={item.id} className="bg-neutral-900 border border-white/5 p-4 rounded-2xl relative group">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <p className="text-white text-sm font-medium mb-1">"{item.question}"</p>
                                                    <div className="flex gap-3 text-[10px] text-neutral-500">
                                                        <span>By: {item.email}</span>
                                                        <span>{item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString() : 'Baru saja'}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteInbox(item.id)} className="text-neutral-600 hover:text-rose-500 p-2">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'banned' && (
                            <div className="space-y-3">
                                {bannedUsers.length === 0 ? (
                                    <div className="text-center p-8 text-neutral-500 text-sm">Belum ada akun yang di-ban. Dunia aman!</div>
                                ) : (
                                    bannedUsers.map(u => (
                                        <div key={u.id} className="bg-neutral-900 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-bold">{u.username || 'Tanpa Nama'}</p>
                                                <p className="text-xs text-neutral-500">{u.email}</p>
                                                <p className="text-[10px] text-rose-500/70 mt-1">
                                                    Banned: {u.bannedAt ? new Date(u.bannedAt.toDate()).toLocaleDateString() : 'Unknown'}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => handleUnban(u.id)}
                                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-colors"
                                            >
                                                Unban
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'bugs' && (
                            <div className="space-y-4">
                                {bugReports.length === 0 ? (
                                    <div className="text-center p-8 text-neutral-500 text-sm">Tidak ada laporan bug. Aplikasi sempurna!</div>
                                ) : (
                                    bugReports.map(bug => (
                                        <div key={bug.id} className={`bg-neutral-900 border ${bug.status === 'resolved' ? 'border-emerald-500/20 opacity-60' : 'border-rose-500/20'} p-4 rounded-2xl flex flex-col sm:flex-row gap-4`}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {bug.status === 'resolved' ? (
                                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">RESOLVED</span>
                                                    ) : (
                                                        <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md">OPEN</span>
                                                    )}
                                                    <span className="text-[10px] text-neutral-500">{bug.timestamp ? new Date(bug.timestamp.toDate()).toLocaleString() : 'Baru'}</span>
                                                </div>
                                                <p className="text-white text-sm mb-2">{bug.description}</p>
                                                <p className="text-[10px] text-neutral-500 font-mono mb-3 line-clamp-1 truncate" title={bug.deviceInfo}>{bug.deviceInfo}</p>
                                                
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleMarkBugResolved(bug.id, bug.status)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${bug.status === 'resolved' ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'}`}
                                                    >
                                                        {bug.status === 'resolved' ? 'Tandai Open' : 'Tandai Selesai'}
                                                    </button>
                                                    <button onClick={() => handleDeleteBug(bug.id)} className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-500 hover:text-rose-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            {bug.imageUrl && (
                                                <div className="w-full sm:w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-black border border-white/10 group relative">
                                                    <img src={bug.imageUrl} alt="Bug Screenshot" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                                    <a href={bug.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink size={24} className="text-white" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
            {dialog}
        </div>
    );
}
