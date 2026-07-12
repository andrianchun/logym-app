import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Edit2, Award, Trophy, Users, LogOut, Check, Loader2, Activity, AlertTriangle, Share2, ShieldAlert, ZoomIn } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
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
import SharedProfileView from '../components/SharedProfileView';
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
    setUserProfile,
    initialViewingUserId = null
}) {
    // NOTE: early return moved AFTER all hooks to comply with Rules of Hooks

    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [isUploading, setIsUploading] = useState(false);
    const [showModPanel, setShowModPanel] = useState(false);
    const [localHighlight, setLocalHighlight] = useState(null);
    const [viewingUserId, setViewingUserId] = useState(initialViewingUserId?.userId || null);
    // initialViewingUserId sekarang { userId, nonce } — nonce-nya (bukan userId doang)
    // yang dipakai sebagai dependency, biar klik ke user yang SAMA berturut-turut
    // (misal notif follow yang sama) tetap dianggap request baru dan modalnya kebuka lagi.
    useEffect(() => {
        if (initialViewingUserId?.userId) {
            setViewingUserId(initialViewingUserId.userId);
        }
    }, [initialViewingUserId]);
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
    const [editName, setEditName] = useState(user?.name || '');
    const [editUsername, setEditUsername] = useState(userProfile?.username || '');
    const isUsernameLocked = !!userProfile?.username;

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    const isValidAge = (dob) => {
        if (!dob) return false;
        const age = calculateAge(dob);
        return age >= 13;
    };

    // Dipakai dari mana pun (tab profil sendiri, atau dari lihat "diri sendiri" lewat
    // search/leaderboard/follower list) untuk buka form edit profil yang sama.
    const openEditPersonal = () => {
        setEditName(user?.name || '');
        setEditUsername(userProfile?.username || '');
        setEditGender(userProfile?.gender || '');
        setEditDob(userProfile?.dob || '');
        setShowEditPersonal(true);
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

    // Foto sumber yang baru dipilih (object URL) — dorong langsung ke cropper, tanpa dialog konfirmasi.
    const [cropSourceUrl, setCropSourceUrl] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Hasil crop selalu di-downscale & dikompres ke WebP (lihat getCroppedBlob), jadi ukuran
    // file akhir yang disimpan ke Firebase Storage gak tergantung ukuran/format foto sumber —
    // limit di sini cuma jaga-jaga biar browser gak nge-freeze decode foto yang gede banget.
    const MAX_SOURCE_FILE_MB = 20;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (e.target) e.target.value = '';
        if (!file) return;

        if (file.size > MAX_SOURCE_FILE_MB * 1024 * 1024) {
            setUploadStatus({ show: true, success: false, message: `Gagal! Ukuran foto maksimal ${MAX_SOURCE_FILE_MB}MB. Silakan pilih foto dengan ukuran lebih kecil.` });
            return;
        }

        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropSourceUrl(URL.createObjectURL(file));
    };

    const closeCropper = () => {
        if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
        setCropSourceUrl(null);
    };

    // Render area crop terpilih (dari react-easy-crop) jadi Blob WebP persegi, di-downscale
    // maksimal 512x512 — cukup buat avatar, terlepas dari resolusi foto aslinya — biar hemat
    // storage & bandwidth Firebase (WebP jauh lebih kecil dari JPEG/PNG di kualitas yang sama).
    const AVATAR_OUTPUT_SIZE = 512;
    const getCroppedBlob = (imageSrc, pixelCrop) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const outSize = Math.min(AVATAR_OUTPUT_SIZE, pixelCrop.width, pixelCrop.height);
            const canvas = document.createElement('canvas');
            canvas.width = outSize;
            canvas.height = outSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outSize, outSize);
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Gagal memproses gambar')), 'image/webp', 0.85);
        };
        image.onerror = reject;
        image.src = imageSrc;
    });

    const confirmPhotoUpload = async () => {
        if (!cropSourceUrl || !croppedAreaPixels) return;
        setIsUploading(true);
        try {
            const blob = await getCroppedBlob(cropSourceUrl, croppedAreaPixels);

            // Delete old photo from Firebase if exists (cleaning up transition to Cloudinary)
            if (user?.photoURL?.includes('firebasestorage')) {
                try {
                    await deleteObject(ref(storage, user.photoURL));
                } catch (e) { console.log("Old photo not found or already deleted"); }
            }

            let photoURL = await uploadImageToFirebase(blob, `lyfit_users/${user.uid}/profile/profile_pic_${Date.now()}.webp`);
            photoURL = photoURL.includes('?') ? `${photoURL}&v=${Date.now()}` : `${photoURL}?v=${Date.now()}`;

            await updateProfile(auth.currentUser, { photoURL });
            const userRef = doc(db, 'users', user.uid);
            const now = Date.now();

            await setDoc(userRef, { photoURL, lastPhotoUpdate: now }, { merge: true });
            await updateUserProfileInFeed(user.uid, undefined, photoURL);
            if (setUser) setUser(prev => ({ ...prev, photoURL, lastPhotoUpdate: now }));
            setUploadStatus({ show: true, success: true, message: 'Foto profil berhasil diperbarui!' });
            setTimeout(() => {
                setUploadStatus(prev => prev.success ? { show: false, success: false, message: '' } : prev);
            }, 2500);
        } catch (err) {
            console.error("Error uploading photo:", err);
            setUploadStatus({ show: true, success: false, message: err.message || 'Gagal mengupload foto profil. Periksa koneksi internet atau coba lagi nanti.' });
        }
        setIsUploading(false);
        closeCropper();
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
                    <div className={`absolute top-3 right-3 z-20 flex items-center space-x-2 pl-4 pr-1 py-1 rounded-l-full ${theme === 'dark' ? 'bg-gradient-to-l from-[#0f172a] via-[#0f172a] to-transparent' : 'bg-gradient-to-l from-white via-white to-transparent'}`}>
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
                                {['Semua', 'Diikuti', 'Teman'].map(f => (
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
                    className={`flex-1 overflow-y-auto hide-scrollbar ${activeTab !== 'pencapaian' ? 'p-4' : 'p-0'}`}
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

                    {/* TAB: PROFIL (Premium UI) */}
                    {activeTab === 'pencapaian' && (
                        <SharedProfileView
                            profileUserId={user?.uid}
                            profileUserName={user?.name}
                            profileUserPhoto={user?.photoURL}
                            currentUser={user}
                            isOwnProfile={true}
                            isDark={theme === 'dark'}
                            t={t}
                            onClose={() => setShowProfileModal(false)}
                            onLogout={() => setShowLogoutConfirm(true)}
                            fileInputRef={fileInputRef}
                            onFileChange={handleFileChange}
                            isUploading={isUploading}
                            onEditNameClick={() => setIsEditingName(true)}
                            onEditPersonalClick={openEditPersonal}
                            userProfileData={userProfile}
                            onPostClick={(postId) => {
                                setActiveTab('beranda');
                                setLocalHighlight(postId);
                            }}
                        />
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
                                onEditOwnProfile={openEditPersonal}
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
                onEditOwnProfile={() => {
                    setFollowListType(null);
                    openEditPersonal();
                }}
            />
        )}

        {/* Photo Cropper — sibling di root, z-[200] biar beneran di atas modal Data Personal (z-[110]).
            Ditaruh di luar wrapper utama (z-[100]) karena tiap fixed+z-index bikin stacking context
            sendiri — z-[200] di dalam wrapper z-[100] tetap kalah dari sibling lain yang z-[110]. */}
        {cropSourceUrl && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-black animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
                    <button onClick={closeCropper} disabled={isUploading} className="p-2 -ml-2 disabled:opacity-40">
                        <X size={22} />
                    </button>
                    <h3 className="font-black text-sm">Atur Foto Profil</h3>
                    <button onClick={confirmPhotoUpload} disabled={isUploading || !croppedAreaPixels} className="p-2 -mr-2 disabled:opacity-40">
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Check size={22} className="text-sky-400" />}
                    </button>
                </div>
                <div className="relative flex-1 min-h-0">
                    <Cropper
                        image={cropSourceUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                    />
                </div>
                <div className="flex items-center gap-3 px-6 py-5 shrink-0">
                    <ZoomIn size={18} className="text-white/70 shrink-0" />
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-sky-500"
                    />
                </div>
            </div>
        )}

        {/* Edit Personal Details Modal */}
        {showEditPersonal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto">
                <div className={`w-full max-w-sm p-6 rounded-3xl ${t.bgCard} border ${t.border} shadow-2xl animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto hide-scrollbar`}>
                    <h3 className={`text-xl font-black ${t.textMain} mb-4`}>Data Personal</h3>
                    
                    <div className="space-y-5 mb-6">
                        {/* Foto Profil */}
                        <div className="flex flex-col items-center mb-6">
                            <div 
                                onClick={() => fileInputRef?.current?.click()}
                                className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border-4 border-slate-300 dark:border-slate-700 relative cursor-pointer group"
                            >
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 group-hover:opacity-75 transition-opacity">
                                        <span className="text-3xl font-black text-white/50">{user?.name?.substring(0,2)?.toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Camera size={28} className="text-white" />
                                </div>
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="animate-pulse text-white font-bold text-sm">...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Nama */}
                        <div>
                            <label className={`text-xs font-bold ${t.textMuted} mb-2 block`}>Nama</label>
                            <input 
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={15}
                                placeholder="Tulis namamu..."
                                className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-sm border-transparent ${t.inputBg} ${t.textMain} focus:outline-none focus:border-blue-500`}
                            />
                        </div>

                        {/* Username — permanen setelah pertama kali diset, biar link share & pencarian gak berubah-ubah */}
                        <div>
                            <label className={`text-xs font-bold ${t.textMuted} mb-2 block`}>Username</label>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm ${t.textMuted}`}>@</span>
                                <input
                                    type="text"
                                    value={editUsername}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                        setEditUsername(val);
                                    }}
                                    maxLength={20}
                                    placeholder="username_kamu"
                                    disabled={isUsernameLocked}
                                    className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 font-bold text-sm border-transparent ${t.inputBg} ${t.textMain} focus:outline-none focus:border-blue-500 ${isUsernameLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <p className={`text-[10px] mt-1 font-medium ${t.textMuted}`}>
                                {isUsernameLocked ? 'Username cuma bisa disetel sekali dan tidak bisa diubah lagi.' : 'Hanya huruf kecil, angka, dan garis bawah (_). Tidak bisa diubah lagi setelah disimpan.'}
                            </p>
                        </div>

                        {/* Jenis Kelamin */}
                        <div>
                            <label className={`text-xs font-bold ${t.textMuted} mb-2 block`}>Jenis Kelamin</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setEditGender('male')} className={`py-3 rounded-xl font-bold border-2 transition-all text-sm ${editGender === 'male' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>Laki-laki</button>
                                <button onClick={() => setEditGender('female')} className={`py-3 rounded-xl font-bold border-2 transition-all text-sm ${editGender === 'female' ? `${t.borderAccent} ${t.bgAccent} text-white` : `border-transparent ${t.inputBg} ${t.textMuted}`}`}>Perempuan</button>
                            </div>
                        </div>

                        {/* Tanggal Lahir */}
                        <div>
                            <label className={`text-xs font-bold ${t.textMuted} mb-2 block`}>Tanggal Lahir</label>
                            <input 
                                type="date" 
                                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                                value={editDob} 
                                onChange={(e) => setEditDob(e.target.value)} 
                                className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-sm ${editDob ? (isValidAge(editDob) ? 'border-transparent focus:border-blue-500' : 'border-rose-500 text-rose-500') : 'border-transparent focus:border-blue-500'} ${t.inputBg} ${editDob && !isValidAge(editDob) ? '' : t.textMain} focus:outline-none`}
                            />
                            {editDob && !isValidAge(editDob) ? (
                                <p className={`text-[10px] mt-1.5 font-bold text-rose-500 animate-in fade-in`}>Usia harus di atas 13 tahun.</p>
                            ) : null}
                        </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                        <button onClick={() => setShowEditPersonal(false)} className={`flex-1 py-3 rounded-xl font-bold ${t.bgBox} ${t.textMain} text-sm`}>Batal</button>
                        <button 
                            disabled={!editName.trim() || !editUsername?.trim() || !editGender || !isValidAge(editDob)}
                            onClick={async () => {
                                if (setUserProfile && editGender && isValidAge(editDob) && editName.trim() && editUsername?.trim()) {
                                    const safeName = editName.trim();
                                    const newUsername = editUsername.trim();
                                    
                                    if (user?.uid) {
                                        try {
                                            // Handle Username logic — permanen begitu sudah pernah diset,
                                            // supaya link share (?u=username) dan hasil search gak jadi basi.
                                            const oldUsername = userProfile?.username || null;
                                            let isUsernameUpdated = false;

                                            if (!isUsernameLocked && newUsername !== oldUsername) {
                                                const usernameRef = doc(db, 'usernames', newUsername);
                                                await runTransaction(db, async (transaction) => {
                                                    const snap = await transaction.get(usernameRef);
                                                    if (snap.exists() && snap.data().uid !== user.uid) {
                                                        throw new Error("USERNAME_TAKEN");
                                                    }
                                                    transaction.set(usernameRef, { uid: user.uid });
                                                });
                                                isUsernameUpdated = true;
                                            }

                                            setUserProfile(prev => ({ ...prev, gender: editGender, dob: editDob, name: safeName, username: newUsername }));

                                            const isNameUpdated = safeName !== user.name;
                                            if (isNameUpdated) {
                                                await updateProfile(auth.currentUser, { displayName: safeName });
                                                if (setUser) setUser(prev => ({ ...prev, name: safeName }));
                                            }
                                            // Gender/usia selalu dikirim ulang (bukan cuma saat berubah) supaya profil
                                            // yang gender/dob-nya sudah terisi dari sebelumnya (sebelum fitur publish
                                            // ini ada) ikut ter-backfill ke community_users saat user menyimpan lagi.
                                            await updateUserProfileInFeed(
                                                user.uid,
                                                isNameUpdated ? safeName : undefined,
                                                undefined,
                                                isUsernameUpdated ? newUsername : undefined,
                                                editGender || undefined,
                                                calculateAge(editDob) ?? undefined
                                            );
                                            
                                            const userRef = doc(db, 'users', user.uid);
                                            const updatedProfile = { ...(userProfile || {}), gender: editGender, dob: editDob, name: safeName, username: newUsername };
                                            
                                            const updatePayload = {
                                                gender: editGender, 
                                                dob: editDob, 
                                                name: safeName,
                                                username: newUsername,
                                                "settings.userProfile": updatedProfile
                                            };
                                            
                                            // setDoc({merge:true}) memperlakukan key "settings.userProfile" sebagai NAMA FIELD
                                            // literal (mengandung titik), bukan path nested — beda dari updateDoc() yang
                                            // memang mem-parsing dot-notation sebagai path. Field nested settings.userProfile
                                            // yang asli jadi tidak pernah ke-update, dan echo onSnapshot balikin state lokal
                                            // ke data lama (bug: username/nama/gender di profil sendiri "bandel" tidak berubah).
                                            await updateDoc(userRef, updatePayload);
                                        } catch(e) { 
                                            if (e.message === "USERNAME_TAKEN") {
                                                if (typeof showAlert === 'function') showAlert('Username sudah dipakai orang lain.', { type: 'error' });
                                            } else {
                                                console.error("Save profile error:", e);
                                                if (typeof showAlert === 'function') showAlert('Gagal menyimpan profil. Coba lagi.', { type: 'error' });
                                            }
                                            return; // Do not close modal
                                        }
                                    } else {
                                        setUserProfile(prev => ({ ...prev, gender: editGender, dob: editDob, name: safeName, username: newUsername }));
                                    }
                                }
                                setShowEditPersonal(false);
                            }}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${(editName.trim() && editUsername?.trim() && editGender && isValidAge(editDob)) ? `${t.bgAccent} text-white hover:opacity-90` : `${t.inputBg} ${t.textMuted} opacity-50 cursor-not-allowed`}`}
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
                onNavigateToPost={(postId) => {
                    setViewingUserId(null);
                    setActiveTab('beranda');
                    setLocalHighlight(postId);
                }}
                onEditPersonalClick={() => {
                    setViewingUserId(null);
                    setActiveTab('pencapaian');
                    openEditPersonal();
                }}
            />
        )}
        {dialog}
    </>);
}
