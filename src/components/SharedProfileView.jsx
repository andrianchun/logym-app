import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, MoreHorizontal, Share2, ClipboardList, AlertTriangle, LogOut, Camera, Edit2, UserPlus, UserCheck, ShieldAlert, Trophy, Check, Heart, MessageSquare, X } from 'lucide-react';
import UnifiedBadge from './UnifiedBadge';
import { ACHIEVEMENTS, getAchievementContext } from '../data/achievements';
import { getUserPosts, getUserWeeklyScoreAndRank, shareAchievementToFeed } from '../utils/communityApi';
import { toJpeg } from 'html-to-image';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount, blockUser, isBlocked, unblockUser } from '../utils/followApi';
import { reportUser, getLocalBlockedUsers, banUserGlobal } from '../utils/moderationApi';
import useDialog from '../hooks/useDialog';
import DeveloperTools from './DeveloperTools';
import { calculatePersonalRecords } from '../utils/workoutCalc';

export default function SharedProfileView({
  profileUserId,
  profileUserName,
  profileUserPhoto,
  currentUser,
  isOwnProfile,
  isDark,
  t,
  onClose,
  onLogout,
  fileInputRef,
  onFileChange,
  isUploading,
  onEditNameClick,
  onEditPersonalClick,
  userProfileData,
  isEditingName,
  newName,
  setNewName,
  handleUpdateName,
  onPostClick,
  history,
  setHistory,
  exerciseLibrary = [],
  programs = [],
  userAchievements = [],
  onAchievementShareComplete,
  onBadgeActionClick
}) {
  const { dialog, showAlert, showConfirm } = useDialog(isDark);
  
  const [posts, setPosts] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [scoreData, setScoreData] = useState({ score: 0, rank: 0 });
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [selectedBadgeInfo, setSelectedBadgeInfo] = useState(null);
  const [activePrModal, setActivePrModal] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (activePrModal) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [activePrModal]);
  
  const profileContainerRef = useRef(null);

  const isAdmin = currentUser?.email === 'untheryan@gmail.com';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [userPosts, followers, following, weeklyData, followStatus, blockStatus] = await Promise.all([
        getUserPosts(profileUserId, 20),
        getFollowerCount(profileUserId),
        getFollowingCount(profileUserId),
        getUserWeeklyScoreAndRank(profileUserId),
        currentUser && !isOwnProfile ? isFollowing(currentUser.uid, profileUserId) : Promise.resolve(false),
        currentUser && !isOwnProfile ? isBlocked(currentUser.uid, profileUserId) : Promise.resolve(false)
      ]);
      setPosts(userPosts);
      setFollowerCount(followers);
      setFollowingCount(following);
      setScoreData(weeklyData);
      setIsFollowingUser(followStatus);
      setIsUserBlocked(blockStatus);
      setIsLoading(false);
    };
    if(profileUserId) {
      load();
    }
  }, [profileUserId, currentUser?.uid]);

  const handleFollow = async () => {
    if (!currentUser) return;
    setIsLoadingFollow(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(currentUser.uid, profileUserId);
        setFollowerCount(c => Math.max(0, c - 1));
        setIsFollowingUser(false);
      } else {
        await followUser(
          currentUser.uid, 
          profileUserId, 
          currentUser.name || currentUser.email?.split('@')[0], 
          currentUser.photoURL
        );
        setFollowerCount(c => c + 1);
        setIsFollowingUser(true);
      }
    } catch (e) { console.error(e); }
    setIsLoadingFollow(false);
  };

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/?u=${userProfileData?.username || profileUserId}`;
    const text = `Lihat profil ${profileUserName} di Logym! ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: profileUserName, text, url: shareUrl });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard?.writeText(text);
      await showAlert('Link profil disalin ke clipboard!', { type: 'success' });
    }
  };

  const handleBlockUser = async () => {
    const confirm = await showConfirm(
      `Anda tidak akan melihat postingan dari ${profileUserName} lagi.`,
      { title: "Blokir Pengguna?", confirmText: "Blokir", cancelText: "Batal", danger: true }
    );
    if (!confirm) return;
    try {
      await blockUser(currentUser?.uid, profileUserId);
      const localBlocked = getLocalBlockedUsers();
      if (!localBlocked.includes(profileUserId)) {
        localBlocked.push(profileUserId);
        localStorage.setItem('lyfit_blocked_users_local', JSON.stringify(localBlocked));
      }
      await showAlert("Pengguna berhasil diblokir.", { type: 'success' });
      if(onClose) onClose();
    } catch {
      await showAlert("Gagal memblokir pengguna.", { type: 'error' });
    }
  };

  const handleBanUserAdmin = async () => {
    if (!isAdmin) return;
    const confirm = await showConfirm(
      `Akun ini akan diblokir permanen dan semua postingannya akan disembunyikan secara global. Lanjutkan?`,
      { title: "BAN PENGGUNA?", confirmText: "Ban Permanen", cancelText: "Batal", danger: true }
    );
    if (!confirm) return;
    try {
      const success = await banUserGlobal(profileUserId);
      if (success) {
        await showAlert("Pengguna berhasil dibanned secara global.", { type: 'success' });
        if(onClose) onClose();
      } else {
        await showAlert("Gagal mem-ban pengguna.", { type: 'error' });
      }
    } catch {
      await showAlert("Terjadi kesalahan sistem.", { type: 'error' });
    }
  };

  const uniqueAchievementIds = new Set();
  const achievements = [];
  posts.forEach(p => {
    if (p.type === 'achievement' && !uniqueAchievementIds.has(p.achievementId)) {
      uniqueAchievementIds.add(p.achievementId);
      achievements.push(p);
    }
  });
  const regularPosts = posts.filter(p => p.type !== 'achievement');

  const prData = useMemo(() => {
    if (!history) return null;
    const lookup = {};
    (exerciseLibrary || []).forEach(e => { if (e?.id) lookup[e.id] = e; });
    (programs || []).forEach(p => (p.exercises || []).forEach(e => { if (e?.id) lookup[e.id] = e; }));
    return calculatePersonalRecords(history, lookup);
  }, [history, exerciseLibrary, programs]);

  return (
    <div ref={profileContainerRef} className={`w-full h-full relative overflow-y-auto overflow-x-hidden hide-scrollbar bg-slate-100 dark:bg-slate-900`}>
      {/* HERO SECTION */}
      <div className="relative w-full h-[45vh] min-h-[350px] bg-slate-900">
        {profileUserPhoto ? (
          <img
            src={profileUserPhoto}
            alt={profileUserName || ''}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            decoding="async"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.classList.remove('hidden');
              }
            }}
          />
        ) : null}
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ${profileUserPhoto ? 'hidden' : ''}`}>
          <span className="text-6xl font-black text-white/10 uppercase">{profileUserName?.substring(0,2)}</span>
        </div>
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

        {/* Skor Sosial — pojok kiri atas, biar Postingan/Pengikut/Mengikuti di bawah bisa naik */}
        <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pl-2.5 pr-3.5 py-1.5 shadow-lg">
          {scoreData.rank > 0 && scoreData.rank <= 10 && (
            <span className="flex items-center gap-1 text-amber-400 font-black text-xs">
              <Trophy size={13} /> #{scoreData.rank}
            </span>
          )}
          <span className="text-white/80 text-xs font-bold">
            Skor Sosial <span className="text-white font-black">{isLoading ? '...' : scoreData.score}</span>
          </span>
        </div>

        {/* Name at bottom of Hero */}
        <div className="absolute bottom-16 left-6 right-24 z-10">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md truncate">
                  {profileUserName || 'Pengguna'}
                </h1>
              </div>
              {userProfileData?.username && (
                <div className="text-white/70 text-sm font-medium drop-shadow-md mt-0.5">
                  @{userProfileData.username}
                </div>
              )}
              {(userProfileData && (userProfileData.gender || userProfileData.dob || userProfileData.age)) ? (
                <div className="flex items-center gap-2 mt-1 text-white/80 text-sm font-medium drop-shadow-md">
                  {userProfileData.gender && (
                    <span>{userProfileData.gender === 'male' ? 'Laki-laki' : userProfileData.gender === 'female' ? 'Perempuan' : userProfileData.gender}</span>
                  )}
                  {userProfileData.gender && (userProfileData.dob || userProfileData.age) && <span className="opacity-50">•</span>}
                  {userProfileData.dob ? (
                    <span>{new Date().getFullYear() - new Date(userProfileData.dob).getFullYear()} Tahun</span>
                  ) : userProfileData.age ? (
                    <span>{userProfileData.age} Tahun</span>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center mt-1 text-white/50 text-xs font-medium drop-shadow-md">
                  Belum melengkapi data diri
                </div>
              )}
            </div>
        </div>
      </div>

      {/* BOTTOM SHEET SECTION (Curved) */}
      <div className="relative -mt-10 min-h-[60vh] rounded-tl-[3rem] bg-white/70 dark:bg-slate-900/70 glass-card shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 pb-24">
        
        {/* Floating Action Button (Overlapping the curve) */}
        <div className="absolute -top-7 right-8 flex items-center gap-3">
          {/* Share Button */}
          <button 
            onClick={handleShareProfile} 
            className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:bg-blue-600 transition-all active:scale-95"
          >
            <Share2 size={24} />
          </button>

          {/* Main Action Button */}
          {isOwnProfile ? (
            <div className="relative group">
              <button 
                onClick={() => onEditPersonalClick && onEditPersonalClick()}
                className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:bg-blue-600 transition-all active:scale-95"
              >
                <Edit2 size={24} />
              </button>
              {onFileChange && (
                <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
              )}
            </div>
          ) : (
            <button 
              onClick={handleFollow}
              disabled={isLoadingFollow}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                isFollowingUser 
                  ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-slate-800/40 dark:shadow-white/40' 
                  : 'bg-blue-500 text-white shadow-blue-500/40 hover:bg-blue-600'
              }`}
            >
              {isFollowingUser ? <UserCheck size={24} /> : <UserPlus size={24} />}
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="pt-10 px-6 pb-6">
          <div className="flex justify-between items-center text-center">
            <div className="flex flex-col items-center flex-1">
              <ClipboardList size={22} className={`mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
              <span className={`text-lg font-black min-h-[28px] flex items-center justify-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isLoading ? (
                  <span className="inline-block w-6 h-5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                ) : (
                  posts.length
                )}
              </span>
              <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Postingan</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <UserCheck size={22} className={`mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
              <span className={`text-lg font-black min-h-[28px] flex items-center justify-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isLoading ? (
                  <span className="inline-block w-6 h-5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                ) : (
                  followerCount
                )}
              </span>
              <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Pengikut</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <UserPlus size={22} className={`mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
              <span className={`text-lg font-black min-h-[28px] flex items-center justify-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isLoading ? (
                  <span className="inline-block w-6 h-5 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                ) : (
                  followingCount
                )}
              </span>
              <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Mengikuti</span>
            </div>
          </div>
        </div>

        {/* REKOR PRIBADI / PERSONAL RECORDS (MINIMALIST) */}
        {prData && (
          <div className="px-6 mb-8 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-xs font-black tracking-widest uppercase ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                Rekor Latihan
              </h3>
              {prData.totalWorkouts > 0 && (
                <span className={`text-[11px] font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                  {prData.totalWorkouts} Sesi Selesai
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* BIG 3 TOTAL */}
              <button
                onClick={() => setActivePrModal('big3')}
                className={`p-4 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 ${isDark ? 'bg-white/5 border border-white/10 hover:border-blue-500/40' : 'bg-slate-50 border border-slate-200/80 hover:border-blue-500/40'}`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                      Big 3 Total
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {prData.big3.total > 0 ? prData.big3.total : '-'}
                    </span>
                    {prData.big3.total > 0 && <span className={`text-[10px] font-bold ${isDark ? 'text-white/50' : 'text-slate-400'}`}>kg</span>}
                  </div>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold leading-tight w-full truncate ${isDark ? 'border-white/5 text-white/50' : 'border-slate-200 text-slate-500'}`}>
                  Bench {prData.big3.bench.weight1RM || '-'} • Squat {prData.big3.squat.weight1RM || '-'} • Deadlift {prData.big3.deadlift.weight1RM || '-'}
                </div>
              </button>

              {/* MAX SESI TONASE */}
              <button
                onClick={() => setActivePrModal('volume')}
                className={`p-4 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 ${isDark ? 'bg-white/5 border border-white/10 hover:border-amber-500/40' : 'bg-slate-50 border border-slate-200/80 hover:border-amber-500/40'}`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                      Max Tonase Sesi
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {prData.maxSessionVolume.volumeKg >= 1000 
                        ? (prData.maxSessionVolume.volumeKg / 1000).toFixed(1) 
                        : (prData.maxSessionVolume.volumeKg > 0 ? prData.maxSessionVolume.volumeKg : '-')}
                    </span>
                    {prData.maxSessionVolume.volumeKg > 0 && (
                      <span className={`text-[10px] font-bold ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                        {prData.maxSessionVolume.volumeKg >= 1000 ? 'Ton' : 'kg'}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold truncate w-full ${isDark ? 'border-white/5 text-amber-300/80' : 'border-slate-200 text-amber-600'}`}>
                  {prData.maxSessionVolume.volumeKg > 0 ? `~${prData.maxSessionVolume.analogy}` : 'Belum ada sesi'}
                </div>
              </button>

              {/* KONSISTENSI TERBAIK */}
              <button
                onClick={() => setActivePrModal('streak')}
                className={`p-4 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 ${isDark ? 'bg-white/5 border border-white/10 hover:border-emerald-500/40' : 'bg-slate-50 border border-slate-200/80 hover:border-emerald-500/40'}`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                      Konsistensi Terbaik
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {prData.longestWeeklyStreak > 0 ? prData.longestWeeklyStreak : '-'}
                    </span>
                    {prData.longestWeeklyStreak > 0 && <span className={`text-[10px] font-bold ${isDark ? 'text-white/50' : 'text-slate-400'}`}>Minggu</span>}
                  </div>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold w-full truncate ${isDark ? 'border-white/5 text-emerald-300/80' : 'border-slate-200 text-emerald-600'}`}>
                  {prData.longestWeeklyStreak > 0 ? 'Disiplin mingguan' : 'Target program'}
                </div>
              </button>

              {/* TOTAL TONASE */}
              <button
                onClick={() => setActivePrModal('lifetime')}
                className={`p-4 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 ${isDark ? 'bg-white/5 border border-white/10 hover:border-purple-500/40' : 'bg-slate-50 border border-slate-200/80 hover:border-purple-500/40'}`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                      Total Tonase
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {prData.lifetimeVolumeKg >= 1000 
                        ? (prData.lifetimeVolumeKg / 1000).toFixed(1) 
                        : (prData.lifetimeVolumeKg > 0 ? prData.lifetimeVolumeKg : '-')}
                    </span>
                    {prData.lifetimeVolumeKg > 0 && (
                      <span className={`text-[10px] font-bold ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                        {prData.lifetimeVolumeKg >= 1000 ? 'Ton' : 'kg'}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold w-full truncate ${isDark ? 'border-white/5 text-purple-300/80' : 'border-slate-200 text-purple-600'}`}>
                  {prData.lifetimeVolumeKg > 0 ? `~${prData.lifetimeAnalogy}` : 'Akumulasi beban'}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PR Detail Modal for Profile */}
        {activePrModal && createPortal(
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-in fade-in overscroll-contain touch-none"
            onClick={() => setActivePrModal(null)}
          >
            <div 
              className="w-full max-w-md bg-slate-900/60 dark:bg-black/60 backdrop-blur-2xl border border-white/20 text-white rounded-3xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="pb-3 border-b border-white/10 mb-4">
                <h4 className="text-base font-black text-white">
                  {activePrModal === 'big3' && 'Rincian Big 3 (Estimasi 1RM)'}
                  {activePrModal === 'volume' && 'Rekor Tonase 1 Sesi'}
                  {activePrModal === 'streak' && 'Konsistensi Mingguan'}
                  {activePrModal === 'lifetime' && 'Total Tonase Seumur Hidup'}
                </h4>
              </div>

              {/* Content for Big 3 */}
              {activePrModal === 'big3' && prData && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Big 3</span>
                    <span className="text-3xl font-black text-blue-400">{prData.big3.total} kg</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3.5 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white">Bench Press (Dada)</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prData.big3.bench.name || 'Flat Bench Press'}
                          {prData.big3.bench.date && ` • ${new Date(prData.big3.bench.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-blue-400 shrink-0 whitespace-nowrap">
                        {prData.big3.bench.weight1RM > 0 ? `${prData.big3.bench.weight1RM} kg` : '-'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white">Squat (Paha & Kaki)</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prData.big3.squat.name || 'Barbell Squat'}
                          {prData.big3.squat.date && ` • ${new Date(prData.big3.squat.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-blue-400 shrink-0 whitespace-nowrap">
                        {prData.big3.squat.weight1RM > 0 ? `${prData.big3.squat.weight1RM} kg` : '-'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white">Deadlift (Punggung Bawah & Posterior)</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prData.big3.deadlift.name || 'Deadlift'}
                          {prData.big3.deadlift.date && ` • ${new Date(prData.big3.deadlift.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-blue-400 shrink-0 whitespace-nowrap">
                        {prData.big3.deadlift.weight1RM > 0 ? `${prData.big3.deadlift.weight1RM} kg` : '-'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-400 mt-3 pt-2 border-t border-white/10">
                    * 1RM (One-Rep Max): Estimasi beban maksimal 1 repetisi berdasarkan set terberat Anda (rumus Epley).
                  </p>
                </div>
              )}

              {/* Content for Volume / Tonase */}
              {activePrModal === 'volume' && prData && (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 text-center">
                    <div className="text-3xl font-black text-blue-400">
                      {prData.maxSessionVolume.volumeKg >= 1000 
                        ? `${(prData.maxSessionVolume.volumeKg / 1000).toFixed(1)} Ton` 
                        : `${prData.maxSessionVolume.volumeKg} kg`}
                    </div>
                    {prData.maxSessionVolume.volumeKg > 0 && (
                      <div className="inline-flex items-center justify-center gap-1 px-3 py-1 mt-2 rounded-full bg-blue-500/20 backdrop-blur-sm text-blue-300 text-xs font-bold whitespace-nowrap">
                        Setara ~{prData.maxSessionVolume.analogy}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sesi Latihan:</span>
                      <span className="font-bold text-white">{prData.maxSessionVolume.workoutName || 'Sesi Latihan'}</span>
                    </div>
                    {prData.maxSessionVolume.date && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tanggal:</span>
                        <span className="font-bold text-white">
                          {new Date(prData.maxSessionVolume.date + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 text-[11px] leading-relaxed text-slate-400">
                    <p>
                      <b className="text-slate-200">Tonase</b> adalah akumulasi total (beban × repetisi) dari seluruh set dalam 1 sesi untuk mengukur kapasitas kerja (<i className="text-slate-300">work capacity</i>) otot Anda.
                    </p>
                  </div>
                </div>
              )}

              {/* Content for Streak */}
              {activePrModal === 'streak' && prData && (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 text-center">
                    <div className="text-3xl font-black text-blue-400">
                      {prData.longestWeeklyStreak} Minggu Beruntun
                    </div>
                    <p className="text-xs font-bold text-blue-300 mt-1">
                      Disiplin target mingguan
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 text-[11px] leading-relaxed text-slate-400">
                    <p>
                      <b className="text-slate-200">Konsistensi Mingguan</b> mengukur kepatuhan jadwal tanpa risiko <i>overtraining</i>. Hari istirahat (<i>Rest Day</i>) tetap menjaga rangkaian streak aktif.
                    </p>
                  </div>
                </div>
              )}

              {/* Content for Lifetime */}
              {activePrModal === 'lifetime' && prData && (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 text-center">
                    <div className="text-3xl font-black text-blue-400">
                      {prData.lifetimeVolumeKg >= 1000 
                        ? `${(prData.lifetimeVolumeKg / 1000).toFixed(1)} Ton` 
                        : `${prData.lifetimeVolumeKg} kg`}
                    </div>
                    {prData.lifetimeVolumeKg > 0 && (
                      <div className="inline-flex items-center justify-center gap-1 px-3 py-1 mt-2 rounded-full bg-blue-500/20 backdrop-blur-sm text-blue-300 text-xs font-bold whitespace-nowrap">
                        Setara ~{prData.lifetimeAnalogy}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 text-[11px] leading-relaxed text-slate-400">
                    <p>
                      <b className="text-slate-200">Total Tonase</b> adalah akumulasi seluruh beban yang pernah Anda angkat sejak hari pertama latihan di Logym.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Koleksi Pencapaian (Only for Own Profile) */}
        {isOwnProfile && (
          <div className="px-6 mb-8 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Koleksi Badge</h3>
              {ACHIEVEMENTS.length > 6 && (
                <button 
                  onClick={() => setShowAllBadges(!showAllBadges)} 
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'} transition-all`}
                >
                  {showAllBadges ? 'Sembunyikan' : 'Lihat Semua'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(showAllBadges ? ACHIEVEMENTS : ACHIEVEMENTS.slice(0, 6)).map((ach) => {
                const isUnlocked = userAchievements.includes(ach.id);
                let achievementCtx = null;
                if (isOwnProfile) {
                   achievementCtx = getAchievementContext(history, userProfileData, {
                      postCount: posts.length,
                      followingCount: followingCount,
                      followersCount: followerCount
                   });
                }
                const progress = isUnlocked ? ach.target : ach.calculateProgress(achievementCtx);
                return (
                  <UnifiedBadge 
                    key={ach.id} 
                    achievementId={ach.id} 
                    achievementTitle={ach.title} 
                    isUnlocked={isUnlocked} 
                    currentProgress={progress}
                    target={ach.target}
                    metric={ach.metric}
                    isDark={isDark} 
                    t={t} 
                    onClick={() => {
                        setSelectedBadgeInfo({
                            ach,
                            isUnlocked,
                            progress,
                            target: ach.target,
                            metric: ach.metric,
                        });
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Pinned Shared Achievements (for public profile) */}
        {!isOwnProfile && achievements.length > 0 && (
          <div className="pl-6 mb-8 mt-2">
             <div className="flex overflow-x-auto hide-scrollbar gap-2 pr-6 pb-2 snap-x snap-mandatory scroll-smooth">
              {achievements.map((p, i) => {
                const achDef = ACHIEVEMENTS.find(a => a.id === p.achievementId);
                return (
                  <div key={i} className="shrink-0 snap-center">
                    <UnifiedBadge 
                       achievementId={p.achievementId} 
                       achievementTitle={p.achievementTitle} 
                       isUnlocked={true} 
                       isDark={isDark} 
                       t={t} 
                       onClick={achDef ? () => {
                           setSelectedBadgeInfo({
                               ach: achDef,
                               isUnlocked: true,
                               progress: achDef.target,
                               target: achDef.target,
                               metric: achDef.metric,
                           });
                       } : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content List (Posts) */}
        <div className="px-6">
          <div className={`flex items-center justify-between mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <h3 className="font-black text-lg">Aktivitas Terbaru</h3>
            {isOwnProfile && onEditPersonalClick && (
              <button onClick={onEditPersonalClick} className={`text-xs font-bold px-3 py-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'} hover:opacity-80 transition-opacity`}>
                Data Diri
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="py-8 text-center text-sm font-bold opacity-50">Memuat aktivitas...</div>
          ) : regularPosts.length > 0 ? (
            <div className="space-y-4">
              {regularPosts.map((post, i) => {
                const images = Array.isArray(post.imageUrls) && post.imageUrls.length > 0
                  ? post.imageUrls.filter(Boolean)
                  : (post.imageUrl ? [post.imageUrl] : (post.mealPhoto ? [post.mealPhoto] : (post.photoUrl ? [post.photoUrl] : (post.dishPhoto ? [post.dishPhoto] : (post.photo ? [post.photo] : [])))));
                return (
                  <div key={post.id || i} onClick={() => onPostClick && onPostClick(post.id)} className={`p-4 rounded-3xl flex gap-4 cursor-pointer transition-transform active:scale-95 ${isDark ? 'bg-slate-800/50 hover:bg-slate-800/70' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    {/* Post Icon/Avatar */}
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                      {images.length > 0 ? (
                        <img
                          src={images[0]}
                          alt=""
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          decoding="async"
                          loading="lazy"
                          className="w-full h-full object-cover rounded-2xl"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'block';
                            }
                          }}
                        />
                      ) : null}
                      <ClipboardList size={20} className={`${isDark ? 'text-white/50' : 'text-slate-400'} ${images.length > 0 ? 'hidden' : ''}`} />
                    </div>
                    
                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'} truncate pr-2`}>
                          {post.type === 'workout_log' ? post.workoutName || 'Sesi Latihan' : 'Update Status'}
                        </h4>
                        {post.timestamp && (
                          <span className={`text-[10px] font-bold shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                            {post.timestamp?.toDate ? post.timestamp.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : ''}
                          </span>
                        )}
                      </div>
                      
                      {post.text && <p className={`text-xs mt-1 font-medium ${isDark ? 'text-white/70' : 'text-slate-600'} line-clamp-2`}>{post.text}</p>}
                      
                      {post.type === 'workout_log' && post.totalVolume > 0 && (
                        <div className={`text-[10px] font-bold mt-2 flex items-center gap-1 w-fit px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-slate-500'}`}>
                          🔥 {post.totalVolume} kg volume
                        </div>
                      )}

                      <div className={`flex items-center gap-4 mt-3 pt-3 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                         <div className="flex items-center gap-1.5">
                            <Heart size={14} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{post.likes?.length || 0}</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <MessageSquare size={14} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>{post.comments?.length || 0}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center opacity-50">
              <ClipboardList size={40} className="mb-3" />
              <p className="text-sm font-bold">Belum ada aktivitas</p>
            </div>
          )}
        </div>

        <div className="px-6 mt-4">
           <DeveloperTools user={currentUser} setHistory={setHistory} t={t} theme={isDark ? 'dark' : 'light'} />
        </div>

        {/* Moderation actions (for other users) */}
        {!isOwnProfile && currentUser && (
          <div className="px-6 mt-12 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
            <button onClick={handleBlockUser} className="flex items-center gap-2 text-xs font-bold text-rose-500/70 hover:text-rose-500 transition-colors">
              <AlertTriangle size={14} /> Blokir Pengguna
            </button>
            {isAdmin && (
              <button onClick={handleBanUserAdmin} className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors">
                <ShieldAlert size={14} /> Ban User (Admin)
              </button>
            )}
          </div>
        )}
      </div>
      
      {dialog}

      {/* Badge Detail Modal */}
      {selectedBadgeInfo && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setSelectedBadgeInfo(null)}>
           <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 duration-200 flex flex-col items-center text-center ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
              <div className={`w-28 h-28 rounded-full ${selectedBadgeInfo.ach.bg} ${selectedBadgeInfo.ach.color} flex items-center justify-center mb-5 shadow-sm relative ${selectedBadgeInfo.ach.borderColor ? `border-2 ${selectedBadgeInfo.ach.borderColor}` : ''} overflow-hidden ${!selectedBadgeInfo.isUnlocked ? 'opacity-50 grayscale' : ''}`}>
                 {selectedBadgeInfo.ach.imageUrl ? (
                   <img src={selectedBadgeInfo.ach.imageUrl} alt={selectedBadgeInfo.ach.title} className="w-full h-full object-cover mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                 ) : null}
                 <div style={{ display: selectedBadgeInfo.ach.imageUrl ? 'none' : 'block' }}>
                   {selectedBadgeInfo.ach.fallbackIcon({ size: 48, strokeWidth: selectedBadgeInfo.isUnlocked ? 2 : 1.5 })}
                 </div>
              </div>
              
              <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedBadgeInfo.ach.title}</h2>
              <p className={`text-sm font-medium mb-6 ${isDark ? 'text-white/70' : 'text-slate-600'} leading-relaxed`}>{selectedBadgeInfo.ach.description}</p>
              
              {!selectedBadgeInfo.isUnlocked && selectedBadgeInfo.target > 0 && (
                <div className="w-full mb-8">
                  <div className={`w-full h-2.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} overflow-hidden`}>
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((selectedBadgeInfo.progress || 0) / selectedBadgeInfo.target) * 100))}%` }} />
                  </div>
                  <div className={`text-[10px] font-black text-center mt-3 uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    Progress: {selectedBadgeInfo.progress || 0} / {selectedBadgeInfo.target} {selectedBadgeInfo.metric}
                  </div>
                </div>
              )}

              <div className="flex gap-3 w-full">
                 <button onClick={() => setSelectedBadgeInfo(null)} className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                   Tutup
                 </button>
                 
                 {selectedBadgeInfo.isUnlocked ? (
                   <button onClick={async () => {
                      try {
                        const postId = await shareAchievementToFeed(currentUser.uid, currentUser.name || currentUser.email?.split('@')[0], currentUser.photoURL, selectedBadgeInfo.ach);
                        setSelectedBadgeInfo(null);
                        await showAlert('Pencapaian berhasil dibagikan ke Feed Komunitas!', { type: 'success' });
                        if (onAchievementShareComplete) onAchievementShareComplete(postId);
                      } catch (err) {
                        await showAlert('Gagal membagikan ke Feed.', { type: 'error' });
                      }
                   }} className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <Share2 size={18} /> Bagikan
                   </button>
                 ) : selectedBadgeInfo.ach.action && (
                   <button onClick={() => {
                      if (onBadgeActionClick) onBadgeActionClick(selectedBadgeInfo.ach.action.tab);
                      setSelectedBadgeInfo(null);
                   }} className="flex-[1.5] py-3.5 rounded-2xl font-black text-sm bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                      {selectedBadgeInfo.ach.action.label}
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
