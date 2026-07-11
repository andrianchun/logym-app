import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Edit2, Award, Trophy, Users, LogOut, Check, Loader2, Activity, AlertTriangle, Share2, ShieldAlert } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, storage, db } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { uploadImageToFirebase } from '../utils/storage';
import ShareCardGenerator from '../components/ShareCardGenerator';
import CommunityTab from '../pages/CommunityTab';
import { ACHIEVEMENTS } from '../data/achievements';
import { getFollowerCount, getFollowingCount } from '../utils/followApi';
import { updateUserProfileInFeed, shareAchievementToFeed } from '../utils/communityApi';
import FollowListModal from '../components/FollowListModal';
import ModerationPanel from '../components/ModerationPanel';
import UserProfileModal from '../components/UserProfileModal';
import UnifiedBadge from '../components/UnifiedBadge';
import useDialog from '../hooks/useDialog';

let globalProfileScrolls = {};
let globalProfileLastTab = 'beranda';

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
    setPrograms,
    exerciseLibrary,
    lang, 
    language, 
    soundEnabled, 
    playSoundEffect, 
    selectedDate, 
    units, 
    activePlanIds,
    userAchievements,
    highlightPostId = null,
    onClearHighlight = null,
    forceTab = null,
    onAchievementShareComplete = null,
    userProfile,
    setUserProfile
}) {
    // NOTE: early return moved AFTER all hooks to comply with Rules of Hooks

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [isUploading, setIsUploading] = useState(false);
    const [showModPanel, setShowModPanel] = useState(false);
    const [localHighlight, setLocalHighlight] = useState(null);
    const [viewingUserId, setViewingUserId] = useState(null);
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState(globalProfileLastTab);
    const scrollPositions = useRef(globalProfileScrolls);
    const prevTab = useRef(activeTab);
    const scrollContainerRef = useRef(null);
    const { dialog, showAlert } = useDialog(theme === 'dark');

    // Edit Gender & DOB State
    const [showEditPersonal, setShowEditPersonal] = useState(false);
    const [editGender, setEditGender] = useState(userProfile?.gender || '');
    const [editDob, setEditDob] = useState(userProfile?.dob || '');

    const isValidAge = (dob) => {
        if (!dob) return false;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 13;
    };

    // If a forceTab is specified (e.g., navigate to beranda after share), switch to it
    useEffect(() => {
        if (forceTab && showProfileModal) {
            setActiveTab(forceTab);
        }
    }, [forceTab, showProfileModal]);

    const isAdmin = user?.email === 'untheryan@gmail.com';

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

    // If a highlightPostId is passed in, switch to community tab
    useEffect(() => {
        if (highlightPostId && showProfileModal) {
            setActiveTab('beranda');
        }
    }, [highlightPostId, showProfileModal]);

    const [activeFilter, setActiveFilter] = useState('Semua');
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followListType, setFollowListType] = useState(null); // 'followers' | 'following'
    const [selectedAchievement, setSelectedAchievement] = useState(null);
    const isDark = theme === 'dark';

    const refreshCounts = async () => {
        if (!user?.uid) return;
        const [followers, following] = await Promise.all([
            getFollowerCount(user.uid),
            getFollowingCount(user.uid),
        ]);
        setFollowerCount(followers);
        setFollowingCount(following);
    };

    useEffect(() => {
        if (user?.uid) refreshCounts();
    }, [user?.uid]);

    const isImpHeight = units?.height === 'ft';

    const formatHeight = (cm) => {
        if (!cm) return '-';
        if (isImpHeight) {
            const totalInches = Math.round(cm / 2.54);
            const ft = Math.floor(totalInches / 12);
            const inches = totalInches % 12;
            return `${ft}' ${inches}"`;
        }
        return `${cm} cm`;
    };

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
        if (!newName.trim()) {
            setIsEditingName(false);
            return;
        }
        try {
            await updateProfile(auth.currentUser, { displayName: newName });
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { name: newName }, { merge: true });
            await updateUserProfileInFeed(user.uid, newName, undefined);
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

                // Upload to Firebase Storage
                photoURL = await uploadImageToFirebase(pendingPhotoFile, `lyfit_users/${user.uid}/profile/profile_pic_${Date.now()}`);
                // Anti-cache is technically no longer needed since URL is unique, but kept for safety
                photoURL = photoURL.includes('?') ? `${photoURL}&v=${Date.now()}` : `${photoURL}?v=${Date.now()}`;
            }

            await updateProfile(auth.currentUser, { photoURL });
            const userRef = doc(db, 'users', user.uid);
            const now = Date.now();
            
            const newUploadedPhotos = { ...(user?.uploadedPhotos || {}) };
            newUploadedPhotos[fileSignature] = photoURL;

            await setDoc(userRef, { photoURL, lastPhotoUpdate: now, uploadedPhotos: newUploadedPhotos }, { merge: true });
            await updateUserProfileInFeed(user.uid, undefined, photoURL);
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


    // Guard placed here, after all hooks, to respect Rules of Hooks
    if (!showProfileModal) return null;

    return (<>
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
                                <h3 className={`text-lg font-black ${t.textMain}`}>Keluar dari LOGYM?</h3>
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
                                Yakin akan mengganti foto profil ini?
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
                <div className={`relative px-4 pt-3 pb-3 border-b ${t.border} shrink-0 min-h-[60px]`}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url('/banner-${theme}.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div className="absolute top-3 right-3 z-20 flex items-center space-x-2 bg-gradient-to-l from-[#0f172a] via-[#0f172a] to-transparent pl-4 pr-1 py-1 rounded-l-full">
                        <button onClick={() => setShowLogoutConfirm(true)} className="p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Keluar">
                            <LogOut size={16} />
                        </button>
                        <button onClick={() => setShowProfileModal(false)} className={`p-1.5 rounded-full ${t.btnBg} transition-colors`}>
                            <X size={16} className={t.textMain} />
                        </button>
                    </div>

                    <div className="relative z-10 flex items-center pr-2" style={{maxWidth: 'calc(100% - 80px)'}}>
                        {activeTab === 'beranda' ? (
                            <div className={`flex gap-1 p-1 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} w-full`}>
                                {['Semua', 'Diikuti', 'Saya'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all text-center ${
                                            activeFilter === f
                                                ? `${t.bgAccent} shadow-sm`
                                                : `${t.textMuted} hover:${t.textMain}`
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <h1 className={`text-xl font-black ${t.textMain} truncate`}>
                                {activeTab === 'bagikan' ? 'Share' : 'Profil'}
                            </h1>
                        )}
                    </div>
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
                            units={units}
                            activePlanIds={activePlanIds}
                            userProfile={userProfile}
                        />
                    )}

                    {/* TAB: PROFIL (formerly BADGES) */}
                    {activeTab === 'pencapaian' && (
                        <div className="flex flex-col space-y-5">
                            {/* Profile Info Row */}
                            <div className="flex items-center gap-4 sm:gap-6">
                                {/* Photo */}
                                <div className="relative shrink-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#3b82f6]/50 shadow-md bg-gray-200">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white"><Users size={32} /></div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        {isUploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                </div>

                                {/* Name & Stats */}
                                <div className="flex-1 flex flex-col justify-center overflow-hidden">
                                    {isEditingName ? (
                                        <form 
                                            onSubmit={(e) => { e.preventDefault(); handleUpdateName(); }} 
                                            className="flex items-center space-x-2 mb-3 w-full max-w-[260px]"
                                        >
                                            <input 
                                                type="text" 
                                                value={newName} 
                                                onChange={(e) => setNewName(e.target.value)} 
                                                onBlur={() => setTimeout(() => setIsEditingName(false), 200)}
                                                maxLength={15}
                                                className={`flex-1 px-1 py-0.5 bg-transparent ${t.textMain} text-2xl font-black tracking-tight focus:outline-none border-b-2 border-[#3b82f6] w-full min-w-0`}
                                                autoFocus
                                            />
                                            <button 
                                                type="submit" 
                                                className={`p-1.5 ${t.textMuted} hover:${t.textMain} transition-colors shrink-0`}
                                            >
                                                <Check size={20} />
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="flex items-center space-x-2 cursor-pointer group w-fit mb-3" onClick={() => setIsEditingName(true)}>
                                            <h1 className={`text-2xl font-black ${t.textMain} tracking-tight truncate`}>{user?.name || 'User'}</h1>
                                            <Edit2 size={16} className={`${t.textMuted} opacity-50 group-hover:opacity-100 shrink-0`} />
                                        </div>
                                    )}

                                    {/* Stats Row */}
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => setFollowListType('followers')} className="flex flex-col items-center hover:opacity-70 transition-opacity">
                                                <span className={`text-xl font-black ${t.textMain} leading-none`}>{followerCount}</span>
                                                <span className={`text-[10px] ${t.textMuted} font-bold mt-1.5 uppercase tracking-wider`}>Followers</span>
                                            </button>
                                            <button onClick={() => setFollowListType('following')} className="flex flex-col items-center hover:opacity-70 transition-opacity">
                                                <span className={`text-xl font-black ${t.textMain} leading-none`}>{followingCount}</span>
                                                <span className={`text-[10px] ${t.textMuted} font-bold mt-1.5 uppercase tracking-wider`}>Following</span>
                                            </button>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: `Profil LOGYM - ${user?.name}`,
                                                        text: `Ayo berteman dengan ${user?.name} di LOGYM!`,
                                                        url: window.location.href,
                                                    }).catch(console.error);
                                                } else {
                                                    navigator.clipboard.writeText(`Profil LOGYM - ${user?.name}`);
                                                    await showAlert('Tautan profil berhasil disalin!', { type: 'success', title: 'Tersalin!' });
                                                }
                                            }}
                                            className={`p-2.5 rounded-full ${t.bgAccent} shadow-sm active:scale-95 transition-transform flex items-center justify-center shrink-0 ml-auto`}
                                            title="Bagikan Profil"
                                        >
                                            <Share2 size={16} className={t.textAccent === 'text-white' ? 'text-white' : 'text-current'} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Personal Details Row */}
                            <div className={`p-4 rounded-2xl ${t.bgBox} border ${t.border} flex items-center justify-between`}>
                                <div className="flex flex-col">
                                    <div className="flex space-x-4">
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${t.textMuted} tracking-wider`}>Jenis Kelamin</p>
                                            <p className={`text-sm font-black ${t.textMain}`}>{userProfile?.gender === 'male' ? 'Laki-laki' : userProfile?.gender === 'female' ? 'Perempuan' : '-'}</p>
                                        </div>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${t.textMuted} tracking-wider`}>Usia</p>
                                            <p className={`text-sm font-black ${t.textMain}`}>
                                                {userProfile?.dob ? `${new Date().getFullYear() - new Date(userProfile.dob).getFullYear()} th` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setEditGender(userProfile?.gender || '');
                                        setEditDob(userProfile?.dob || '');
                                        setShowEditPersonal(true);
                                    }}
                                    className={`p-2 rounded-xl ${t.inputBg} hover:${t.bgAccentSoft} transition-colors`}
                                >
                                    <Edit2 size={16} className={t.textMuted} />
                                </button>
                            </div>
                            
                            <hr className={`border-t ${t.borderDashed} border-dashed my-2`} />

                            <div>
                                <h3 className={`text-sm font-black ${t.textMain} mb-4`}>Pencapaian</h3>
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                    {ACHIEVEMENTS.map((ach) => {
                                        const isUnlocked = userAchievements?.includes(ach.id);
                                        return (
                                        <button 
                                            key={ach.id} 
                                            onClick={() => setSelectedAchievement(ach)}
                                            className="hover:opacity-80 active:scale-95 transition-all text-left"
                                        >
                                            <UnifiedBadge achievementId={ach.id} isUnlocked={isUnlocked} isDark={isDark} t={t} />
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* ADMIN BUTTON (If Admin) */}
                            {isAdmin && (
                                <div className={`mt-6 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3`}>
                                    <p className={`text-sm font-black text-rose-500 uppercase tracking-wider flex items-center gap-2`}>
                                        <ShieldAlert size={16} /> Mode Admin Aktif
                                    </p>
                                    <button onClick={() => setShowModPanel(true)} className={`w-full py-3 rounded-xl font-bold bg-rose-500 text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-all`}>
                                        Buka Panel Moderasi
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: COMMUNITY */}
                    {activeTab === 'beranda' && (
                        <div className="-mx-4 -mt-4">
                            <CommunityTab 
                                t={t} 
                                theme={theme} 
                                user={user}
                                programs={programs}
                                setPrograms={setPrograms}
                                soundEnabled={soundEnabled} 
                                playSoundEffect={playSoundEffect}
                                activeFilter={activeFilter}
                                highlightPostId={localHighlight || highlightPostId}
                                onClearHighlight={() => {
                                    setLocalHighlight(null);
                                    if (onClearHighlight) onClearHighlight();
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Tabs at the bottom */}
                <div className={`flex border-t ${t.border} px-2 pb-safe shrink-0`}>
                    <button onClick={() => setActiveTab('beranda')} className={`flex-1 py-3 text-sm font-bold border-t-2 transition-colors ${activeTab === 'beranda' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Komunitas</button>
                    <button onClick={() => setActiveTab('bagikan')} className={`flex-1 py-3 text-sm font-bold border-t-2 transition-colors ${activeTab === 'bagikan' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Share</button>
                    <button onClick={() => setActiveTab('pencapaian')} className={`flex-1 py-3 text-sm font-bold border-t-2 transition-colors ${activeTab === 'pencapaian' ? `border-[#3b82f6] ${t.textMain}` : `border-transparent ${t.textMuted}`}`}>Profil</button>
                </div>
            </div>
        </div>

        {/* Follow List Modal */}
        {followListType && (
            <FollowListModal
                currentUser={user}
                type={followListType}
                isDark={theme === 'dark'}
                t={t}
                onClose={() => {
                    setFollowListType(null);
                    refreshCounts(); // refresh after any follow/unfollow/block action
                }}
            />
        )}

        {/* Edit Personal Details Modal */}
        {showEditPersonal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                <div className={`w-full max-w-xs p-6 rounded-3xl ${t.bgCard} border ${t.border} shadow-2xl animate-in zoom-in-95`}>
                    <h3 className={`text-xl font-black ${t.textMain} mb-4`}>Data Personal</h3>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className={`text-xs font-bold ${t.textMuted} mb-2 block`}>Jenis Kelamin</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setEditGender('male')} className={`py-2.5 rounded-xl font-bold border-2 transition-all text-sm ${editGender === 'male' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>Laki-laki</button>
                                <button onClick={() => setEditGender('female')} className={`py-2.5 rounded-xl font-bold border-2 transition-all text-sm ${editGender === 'female' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>Perempuan</button>
                            </div>
                        </div>
                        <div>
                            <label className={`text-xs font-bold ${t.textMuted} mb-2 block`}>Tanggal Lahir</label>
                            <input 
                                type="date" 
                                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                                value={editDob} 
                                onChange={(e) => setEditDob(e.target.value)} 
                                className={`w-full px-3 py-2.5 rounded-xl border-2 font-bold text-sm ${editDob ? (isValidAge(editDob) ? t.borderAccent : 'border-rose-500 text-rose-500') : 'border-transparent'} ${t.inputBg} ${editDob && !isValidAge(editDob) ? '' : t.textMain} focus:outline-none`}
                            />
                            {editDob && !isValidAge(editDob) ? (
                                <p className={`text-[10px] mt-1.5 font-bold text-rose-500 animate-in fade-in`}>Usia harus di atas 13 tahun.</p>
                            ) : null}
                        </div>
                    </div>
                    
                    <div className="flex space-x-2">
                        <button onClick={() => setShowEditPersonal(false)} className={`flex-1 py-3 rounded-xl font-bold ${t.bgBox} ${t.textMain} text-sm`}>Batal</button>
                        <button 
                            disabled={!editGender || !isValidAge(editDob)}
                            onClick={() => {
                                if (setUserProfile && editGender && isValidAge(editDob)) {
                                    setUserProfile(prev => ({ ...prev, gender: editGender, dob: editDob }));
                                }
                                setShowEditPersonal(false);
                            }}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${editGender && isValidAge(editDob) ? `${t.bgAccent} text-white hover:opacity-90` : `${t.inputBg} ${t.textMuted} opacity-50 cursor-not-allowed`}`}
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Achievement Details Modal */}
        {selectedAchievement && (
            <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center sm:p-4 pb-16 animate-in fade-in duration-200">
                <div className={`w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white'} shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95`}>
                    <div className="flex justify-end mb-2">
                        <button onClick={() => setSelectedAchievement(null)} className={`p-1.5 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'} transition-colors`}>
                            <X size={18}/>
                        </button>
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-24 h-24 rounded-full ${selectedAchievement.bg} ${selectedAchievement.color} flex items-center justify-center mb-4 shadow-lg ${selectedAchievement.borderColor ? `border-4 ${selectedAchievement.borderColor}` : ''} ${!userAchievements?.includes(selectedAchievement.id) ? 'grayscale opacity-50' : ''}`}>
                            {selectedAchievement.icon({ size: 48, strokeWidth: 1.5 })}
                        </div>
                        
                        <h3 className={`text-xl font-black mb-1 ${isDark ? 'text-white' : 'text-black'}`}>{selectedAchievement.title}</h3>
                        
                        <div className={`text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full mb-4 ${userAchievements?.includes(selectedAchievement.id) ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-500'}`}>
                            {userAchievements?.includes(selectedAchievement.id) ? '🏆 Tercapai' : '🔒 Terkunci'}
                        </div>

                        <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-white/70' : 'text-black/60'}`}>
                            {selectedAchievement.description}
                        </p>

                        {userAchievements?.includes(selectedAchievement.id) && (
                            <button 
                                onClick={async () => {
                                    const postId = await shareAchievementToFeed(user.uid, user.name || user.email?.split('@')[0], user.photoURL, selectedAchievement);
                                    setSelectedAchievement(null);
                                    // Switch to community feed and highlight the post
                                    setActiveTab('beranda');
                                    if (onAchievementShareComplete) {
                                        onAchievementShareComplete(postId);
                                    }
                                }}
                                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${t.bgAccent} shadow-md ${t.textAccent === 'text-white' ? 'text-white' : 'text-slate-900'}`}
                            >
                                <Share2 size={18} /> Bagikan ke Feed Komunitas
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {showModPanel && (
            <ModerationPanel 
                isDark={theme === 'dark'} 
                t={t} 
                onClose={() => setShowModPanel(false)}
                onNavigateToPost={(postId) => {
                    setShowModPanel(false);
                    setActiveTab('beranda');
                    setLocalHighlight(postId);
                }}
                onNavigateToUser={(userId) => {
                    setShowModPanel(false);
                    setViewingUserId(userId);
                }}
            />
        )}

        {viewingUserId && (
            <UserProfileModal 
                profileUserId={viewingUserId}
                currentUser={user}
                isDark={theme === 'dark'}
                t={t}
                onClose={() => setViewingUserId(null)}
            />
        )}
        {dialog}
    </>);
}
