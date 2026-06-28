import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Edit2, Award, Trophy, Users, LogOut, Check, Loader2, Activity, AlertTriangle } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, storage, db } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { uploadToCloudinary } from '../utils/cloudinary';
import ShareCardGenerator from '../components/ShareCardGenerator';

let globalProfileScrolls = {};
let globalProfileLastTab = 'beranda';

const dummyBadges = [
    { name: 'First Blood', Icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: '7-Day Streak', Icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { name: 'Night Owl', Icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: '1000kg Club', Icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10', locked: true },
    { name: 'Early Bird', Icon: Award, color: 'text-sky-500', bg: 'bg-sky-500/10', locked: true },
    { name: 'Beast Mode', Icon: Trophy, color: 'text-red-500', bg: 'bg-red-500/10', locked: true },
];

const dummyFeeds = [
    { name: 'Sarah J.', action: 'smashed Leg Day', vol: '4,500 kg', time: '2h ago' },
    { name: 'Mike T.', action: 'hit a new PB on Bench Press', vol: '100 kg', time: '5h ago' },
    { name: 'Alex W.', action: 'completed 30 days streak!', vol: '', time: '1d ago' },
];

export default function ProfileModal({ 
    showProfileModal, 
    setShowProfileModal, 
    user, 
    setUser,
    t, 
    theme, 
    handleLogout,
    history,
    activityTargets,
    programs,
    exerciseLibrary,
    lang, 
    language, 
    soundEnabled, 
    playSoundEffect, 
    selectedDate, 
    unitSystem, 
    activePlanIds
}) {
    if (!showProfileModal) return null;

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState(globalProfileLastTab);
    const scrollPositions = useRef(globalProfileScrolls);
    const prevTab = useRef(activeTab);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        globalProfileLastTab = activeTab;
        
        // Restore scroll on tab change AND on initial mount
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
            }
        }, 10);
        
        prevTab.current = activeTab;
    }, [activeTab]);

    const handleScroll = (e) => {
        scrollPositions.current[activeTab] = e.target.scrollTop;
        globalProfileScrolls = scrollPositions.current;
    };

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ show: false, success: false, message: '' });
    
    useEffect(() => {
        if (uploadStatus.show) {
            const timer = setTimeout(() => setUploadStatus({ show: false, success: false, message: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [uploadStatus.show]);

    const [pendingPhotoFile, setPendingPhotoFile] = useState(null);

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === user?.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await updateProfile(auth.currentUser, { displayName: newName });
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { name: newName });
            if (setUser) setUser(prev => ({ ...prev, name: newName }));
            setIsEditingName(false);
        } catch (err) {
            console.error("Error updating name:", err);
            setUploadStatus({ show: true, success: false, message: 'Gagal mengupdate nama.' });
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size to 2MB
        if (file.size > 2 * 1024 * 1024) {
            setUploadStatus({ show: true, success: false, message: 'Gagal! Ukuran foto maksimal 2MB. Silakan pilih foto dengan ukuran lebih kecil.' });
            if (e.target) e.target.value = '';
            return;
        }

        const fileSignature = file.name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + file.size;
        const isAlreadyUploaded = !!(user?.uploadedPhotos?.[fileSignature]);

        // Limit frequency to once a week for NEW photos
        if (!isAlreadyUploaded && user?.lastPhotoUpdate) {
            const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            if (now - user.lastPhotoUpdate < ONE_WEEK) {
                setUploadStatus({ show: true, success: false, message: 'Maaf kamu hanya bisa mengganti user profile setiap 1 minggu sekali.' });
                if (e.target) e.target.value = '';
                return;
            }
        }

        setPendingPhotoFile(file);
        if (e.target) e.target.value = '';
    };

    const confirmPhotoUpload = async () => {
        if (!pendingPhotoFile) return;
        setIsUploading(true);
        try {
            const fileSignature = pendingPhotoFile.name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + pendingPhotoFile.size;
            let photoURL = user?.uploadedPhotos?.[fileSignature];

            if (!photoURL) {
                // Delete old photo from Firebase if exists (cleaning up transition to Cloudinary)
                if (user?.photoURL?.includes('firebasestorage')) {
                    try {
                        await deleteObject(ref(storage, user.photoURL));
                    } catch (e) { console.log("Old photo not found or already deleted"); }
                }

                // Cloudinary STRICTLY forbids overwriting on unsigned uploads.
                // We MUST generate a unique public_id every time.
                photoURL = await uploadToCloudinary(pendingPhotoFile, `profile_pic_${Date.now()}`, `lyfit_users/${user.uid}/profile`);
                // Anti-cache is technically no longer needed since URL is unique, but kept for safety
                photoURL = `${photoURL}?v=${Date.now()}`;
            }

            await updateProfile(auth.currentUser, { photoURL });
            const userRef = doc(db, 'users', user.uid);
            const now = Date.now();
            
            const newUploadedPhotos = { ...(user?.uploadedPhotos || {}) };
            newUploadedPhotos[fileSignature] = photoURL;

            await updateDoc(userRef, { photoURL, lastPhotoUpdate: now, uploadedPhotos: newUploadedPhotos });
            if (setUser) setUser(prev => ({ ...prev, photoURL, lastPhotoUpdate: now, uploadedPhotos: newUploadedPhotos }));
            setUploadStatus({ show: true, success: true, message: 'Foto profil berhasil diperbarui!' });
            setTimeout(() => {
                setUploadStatus(prev => prev.success ? { show: false, success: false, message: '' } : prev);
            }, 2500);
        } catch (err) {
            console.error("Error uploading photo:", err);
            setUploadStatus({ show: true, success: false, message: err.message || 'Gagal mengupload foto profil. Periksa koneksi internet atau coba lagi nanti.' });
        }
        setIsUploading(false);
        setPendingPhotoFile(null);
    };



    return (
        <div className={`fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in`}>
            <div className={`w-full max-w-lg mx-auto ${t.bgApp} h-full flex flex-col shadow-2xl relative overflow-hidden`}>
                
                {/* Logout Confirmation Dialog */}
                {showLogoutConfirm && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className={`mx-6 p-6 rounded-2xl ${t.bgCard} border ${t.border} shadow-2xl max-w-sm w-full`}>
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle size={28} className="text-red-500" />
                                </div>
                                <h3 className={`text-lg font-black ${t.textMain}`}>Keluar dari LyFit?</h3>
                                <p className={`text-sm ${t.textMuted}`}>Data latihanmu tetap tersimpan di cloud. Kamu bisa login kembali kapan saja.</p>
                                <div className="flex w-full space-x-3 pt-2">
                                    <button 
                                        onClick={() => setShowLogoutConfirm(false)}
                                        className={`flex-1 py-3 rounded-xl ${t.bgBox} ${t.textMain} font-bold text-sm transition-colors hover:opacity-80`}
                                    >Batal</button>
                                    <button 
                                        onClick={handleLogout}
                                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                                    >Keluar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Photo Confirm Dialog */}
                {pendingPhotoFile && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                        <div className={`mx-6 p-6 rounded-2xl ${t.bgCard} border ${t.border} shadow-2xl max-w-sm w-full animate-in zoom-in-95`}>
                            <div className={`flex items-center space-x-3 mb-4 text-sky-500`}>
                                <Camera size={24} />
                                <h3 className="text-xl font-black">Yakin Ganti Foto?</h3>
                            </div>
                            <p className={`${t.textMuted} mb-6 leading-relaxed text-sm`}>
                                Yakin akan mengganti foto profil ini? Foto profil hanya bisa diganti setiap 1 minggu sekali lho.
                            </p>
                            <div className="flex w-full space-x-3">
                                <button onClick={() => setPendingPhotoFile(null)} className={`flex-1 py-3 rounded-xl font-bold ${t.bgBox} ${t.textMain} transition-all text-sm hover:opacity-80`}>Batal</button>
                                <button onClick={confirmPhotoUpload} className={`flex-1 py-3 rounded-xl font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all text-sm`}>Ya, Yakin</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Status Toast (Success) */}
                {uploadStatus.show && uploadStatus.success && (
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-emerald-500/90 text-white text-[12px] font-bold px-5 py-3 rounded-2xl md:rounded-full shadow-2xl border border-emerald-400/50 animate-in zoom-in-95 fade-in duration-300 text-center max-w-[80vw] backdrop-blur-sm">
                        Foto diperbarui
                    </div>
                )}

                {/* Upload Status Toast (Error) */}
                {uploadStatus.show && !uploadStatus.success && (
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-rose-500/90 text-white text-[12px] font-bold px-5 py-3 rounded-2xl md:rounded-full shadow-2xl border border-rose-400/50 animate-in zoom-in-95 fade-in duration-300 text-center max-w-[80vw] backdrop-blur-sm">
                        {uploadStatus.message}
                    </div>
                )}

                {/* Header */}
                <div className={`relative px-4 pt-4 pb-4 border-b ${t.border} shrink-0`}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url('/banner-${theme}.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
                        <button onClick={() => setShowLogoutConfirm(true)} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Keluar">
                            <LogOut size={20} />
                        </button>
                        <button onClick={() => setShowProfileModal(false)} className={`p-2 rounded-full ${t.btnBg} transition-colors`}>
                            <X size={20} className={t.textMain} />
                        </button>
                    </div>

                    <div className="relative z-10 flex items-center pr-24">
                        <div className="relative shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#41759b]/50 shadow-md bg-gray-200">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white"><Users size={32} /></div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                {isUploading ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>

                        <div className="ml-4 flex-1">
                            {isEditingName ? (
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="text" 
                                        value={newName} 
                                        onChange={(e) => setNewName(e.target.value)} 
                                        maxLength={10}
                                        className={`w-full max-w-[200px] px-3 py-1.5 rounded-lg ${t.inputBg} ${t.textMain} text-lg font-black focus:outline-none ring-2 ring-[#41759b]`}
                                        autoFocus
                                    />
                                    <button onClick={handleUpdateName} className="p-1.5 bg-[#41759b] text-white rounded-lg hover:bg-sky-600"><Check size={18} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 cursor-pointer group w-fit" onClick={() => setIsEditingName(true)}>
                                    <h1 className={`text-xl md:text-2xl font-black ${t.textMain} tracking-tight line-clamp-1`}>{user?.name || 'User'}</h1>
                                    <Edit2 size={14} className={`${t.textMuted} opacity-50 group-hover:opacity-100 shrink-0`} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex border-b ${t.border} px-2`}>
                    <button onClick={() => setActiveTab('beranda')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'beranda' ? `border-[#41759b] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Feed</button>
                    <button onClick={() => setActiveTab('bagikan')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bagikan' ? `border-[#41759b] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Share</button>
                    <button onClick={() => setActiveTab('pencapaian')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pencapaian' ? `border-[#41759b] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Badges</button>
                </div>

                {/* Content Area */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 hide-scrollbar"
                >
                    
                    {/* TAB: RECAP / SHARE */}
                    {activeTab === 'bagikan' && (
                        <ShareCardGenerator 
                            user={user} 
                            setUser={setUser}
                            t={t} 
                            theme={theme} 
                            history={history} 
                            activityTargets={activityTargets}
                            programs={programs}
                            exerciseLibrary={exerciseLibrary}
                            lang={lang}
                            language={language}
                            soundEnabled={soundEnabled}
                            playSoundEffect={playSoundEffect}
                            selectedDate={selectedDate}
                            unitSystem={unitSystem}
                            activePlanIds={activePlanIds}
                        />
                    )}

                    {/* TAB: BADGES */}
                    {activeTab === 'pencapaian' && (
                        <div className="grid grid-cols-3 gap-4">
                            {dummyBadges.map((badge, i) => (
                                <div key={i} className={`flex flex-col items-center p-3 rounded-2xl ${t.bgBox} ${badge.locked ? 'opacity-40 grayscale' : ''}`}>
                                    <div className={`w-12 h-12 rounded-full ${badge.bg} ${badge.color} flex items-center justify-center mb-2 shadow-sm`}>
                                        <badge.Icon size={24} />
                                    </div>
                                    <span className={`text-[10px] font-bold ${t.textMain} text-center leading-tight`}>{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB: COMMUNITY */}
                    {activeTab === 'beranda' && (
                        <div className="space-y-4">
                            {dummyFeeds.map((feed, i) => (
                                <div key={i} className={`p-4 rounded-2xl ${t.bgCard} border ${t.border} shadow-sm flex items-start space-x-3`}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0" />
                                    <div>
                                        <div className={`text-sm ${t.textMain}`}><span className="font-bold">{feed.name}</span> {feed.action} 🔥</div>
                                        {feed.vol && <div className={`text-xs font-bold text-[#41759b] mt-1`}>{feed.vol}</div>}
                                        <div className={`text-[10px] ${t.textMuted} mt-1`}>{feed.time}</div>
                                    </div>
                                </div>
                            ))}
                            <button className={`w-full py-3 rounded-xl border-2 border-dashed ${t.borderDashed} ${t.textMuted} text-xs font-bold flex items-center justify-center space-x-2`}>
                                <Users size={16} /> <span>Connect Contact to Find Friends</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
