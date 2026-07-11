import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MoreHorizontal, Share2, ClipboardList, AlertTriangle, LogOut, Camera, Edit2, UserPlus, UserCheck, ShieldAlert, Trophy, Check, Heart, MessageSquare } from 'lucide-react';
import UnifiedBadge from './UnifiedBadge';
import { getUserPosts, getUserWeeklyScoreAndRank } from '../utils/communityApi';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount, blockUser, isBlocked, unblockUser } from '../utils/followApi';
import { reportUser, getLocalBlockedUsers, banUserGlobal } from '../utils/moderationApi';
import useDialog from '../hooks/useDialog';

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
  onPostClick
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
    const text = `Lihat profil ${profileUserName} di LOGYM! ${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: profileUserName, text, url: shareUrl });
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

  const achievements = posts.filter(p => p.type === 'achievement');
  const regularPosts = posts.filter(p => p.type !== 'achievement');

  return (
    <div className={`w-full h-full relative overflow-y-auto overflow-x-hidden hide-scrollbar bg-slate-100 dark:bg-slate-900`}>
      {/* HERO SECTION */}
      <div className="relative w-full h-[45vh] min-h-[350px] bg-slate-900">
        {profileUserPhoto ? (
          <img src={profileUserPhoto} alt={profileUserName} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <span className="text-6xl font-black text-white/10 uppercase">{profileUserName?.substring(0,2)}</span>
          </div>
        )}
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

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
      <div className="relative -mt-10 min-h-[60vh] rounded-tl-[3rem] bg-white dark:bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 pb-24">
        
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
          <div className="flex items-center justify-end">
            <div className="flex flex-col items-end gap-1">
              {scoreData.rank > 0 && scoreData.rank <= 10 && (
                <span className="text-xl font-black text-amber-500 flex items-center gap-1">
                  <Trophy size={18} /> #{scoreData.rank}
                </span>
              )}
              
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-slate-500'}`}>Skor Minggu Ini</span>
                <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{scoreData.score}</span>
              </div>
            </div>
          </div>
          
          <hr className={`my-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
          
          <div className="flex justify-between items-center text-center">
            <div className="flex flex-col items-center flex-1">
              <ClipboardList size={22} className={`mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
              <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{posts.length}</span>
              <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Postingan</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <UserCheck size={22} className={`mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
              <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{followerCount}</span>
              <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Pengikut</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <UserPlus size={22} className={`mb-2 ${isDark ? 'text-white/70' : 'text-slate-700'}`} />
              <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{followingCount}</span>
              <span className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Mengikuti</span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="pl-6 mb-8">
             <div className="flex overflow-x-auto hide-scrollbar gap-4 pr-6 pb-2 snap-x snap-mandatory scroll-smooth">
              {achievements.map((p, i) => (
                <div key={i} className={`shrink-0 p-4 rounded-3xl snap-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <UnifiedBadge achievementId={p.achievementId} achievementTitle={p.achievementTitle} isDark={isDark} t={t} />
                </div>
              ))}
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
                const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
                return (
                  <div key={post.id || i} onClick={() => onPostClick && onPostClick(post.id)} className={`p-4 rounded-3xl flex gap-4 cursor-pointer transition-transform active:scale-95 ${isDark ? 'bg-slate-800/50 hover:bg-slate-800/70' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    {/* Post Icon/Avatar */}
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                      {images.length > 0 ? (
                        <img src={images[0]} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <ClipboardList size={20} className={isDark ? 'text-white/50' : 'text-slate-400'} />
                      )}
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

        {/* Moderation actions (for other users) */}
        {!isOwnProfile && currentUser && (
          <div className="px-6 mt-12 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
            <button onClick={handleBlockUser} className="flex items-center gap-2 text-xs font-bold text-rose-500/70 hover:text-rose-500 transition-colors">
              <AlertTriangle size={14} /> Blokir Pengguna
            </button>
            {isAdmin && (
              <button onClick={() => {/* Ban user logic */}} className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors">
                <ShieldAlert size={14} /> Ban User (Admin)
              </button>
            )}
          </div>
        )}
      </div>
      
      {dialog}
    </div>
  );
}
