import React, { useState, useEffect } from 'react';
import { X, UserCheck, UserPlus, Share2, Grid3X3, Award, ClipboardList, AlertTriangle, Trophy } from 'lucide-react';
import UnifiedBadge from './UnifiedBadge';
import { getUserPosts } from '../utils/communityApi';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount, blockUser, isBlocked, unblockUser } from '../utils/followApi';
import { reportUser, getLocalBlockedUsers, banUserGlobal } from '../utils/moderationApi';
import useDialog from '../hooks/useDialog';

export default function UserProfileModal({ profileUserId, profileUserName, profileUserPhoto, currentUser, isDark, t, leaderboardRank, onClose }) {
  const { dialog, showAlert, showConfirm } = useDialog(isDark);
  const isTopTen = leaderboardRank > 0;
  const [posts, setPosts] = useState([]);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = currentUser?.uid === profileUserId;
  const isAdmin = currentUser?.email === 'untheryan@gmail.com';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [userPosts, followers, following, followStatus, blockStatus] = await Promise.all([
        getUserPosts(profileUserId, 20),
        getFollowerCount(profileUserId),
        getFollowingCount(profileUserId),
        currentUser && !isOwnProfile ? isFollowing(currentUser.uid, profileUserId) : Promise.resolve(false),
        currentUser && !isOwnProfile ? isBlocked(currentUser.uid, profileUserId) : Promise.resolve(false)
      ]);
      setPosts(userPosts);
      setFollowerCount(followers);
      setFollowingCount(following);
      setIsFollowingUser(followStatus);
      setIsUserBlocked(blockStatus);
      setIsLoading(false);
    };
    load();
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

  const handleUnblock = async () => {
    if (!currentUser) return;
    setIsLoadingFollow(true);
    try {
      await unblockUser(currentUser.uid, profileUserId);
      setIsUserBlocked(false);
      showAlert("Blokir telah dibuka. Anda akan kembali melihat postingan pengguna ini.", { type: 'success' });
    } catch (e) {
      console.error(e);
      showAlert("Gagal membuka blokir.", { type: 'error' });
    }
    setIsLoadingFollow(false);
  };

  const handleBanUser = async () => {
    const confirm = await showConfirm(
      `Anda akan melakukan GLOBAL BAN terhadap ${profileUserName}. Pengguna ini akan dikeluarkan secara paksa dan tidak bisa lagi mengakses aplikasi. Lanjutkan?`,
      {
        title: "Peringatan Keras!",
        confirmText: "Ya, Banned Akun",
        cancelText: "Batal",
        danger: true
      }
    );

    if (confirm) {
      const success = await banUserGlobal(profileUserId);
      if (success) {
        showAlert("Akun berhasil di-banned secara permanen.", { type: 'success' });
        onClose();
      } else {
        showAlert("Gagal melakukan Banned.", { type: 'error' });
      }
    }
  };

  const handleShareProfile = async () => {
    const text = `Lihat profil ${profileUserName} di LyFit!`;
    if (navigator.share) {
      navigator.share({ title: profileUserName, text });
    } else {
      navigator.clipboard?.writeText(text);
      await showAlert('Link profil disalin ke clipboard!', { type: 'success' });
    }
  };

  const handleReportUser = async () => {
    const reason = prompt(`Mengapa Anda melaporkan ${profileUserName}?`);
    if (!reason) return;
    const ok = await reportUser(profileUserId, currentUser?.uid, reason);
    if (ok) {
      await showAlert("Laporan berhasil dikirim. Pengguna telah diblokir.", { type: 'success' });
      onClose();
    }
  };

  const handleBlockUser = async () => {
    const confirm = await dialog({
      title: "Blokir Pengguna?",
      message: `Anda tidak akan melihat postingan dari ${profileUserName} lagi.`,
      confirmText: "Blokir",
      cancelText: "Batal",
      danger: true
    });
    if (!confirm) return;
    try {
      await blockUser(currentUser?.uid, profileUserId);
      const localBlocked = getLocalBlockedUsers();
      if (!localBlocked.includes(profileUserId)) {
        localBlocked.push(profileUserId);
        localStorage.setItem('lyfit_blocked_users_local', JSON.stringify(localBlocked));
      }
      await showAlert("Pengguna berhasil diblokir.", { type: 'success' });
      onClose();
    } catch {
      await showAlert("Gagal memblokir pengguna.", { type: 'error' });
    }
  };

  const achievements = posts.filter(p => p.type === 'achievement');
  const regularPosts = posts.filter(p => p.type !== 'achievement');
  const imageUrls = regularPosts.flatMap(p => p.imageUrls || (p.imageUrl ? [p.imageUrl] : []));

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className={`w-full sm:max-w-md ${isDark ? 'bg-slate-900/80 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-black/5'} rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-8`}>

        {/* Header */}
        <div className={`px-4 pt-4 pb-3 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/8'}`}>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}>
            <X size={18} />
          </button>
          <h3 className={`font-black text-base ${isDark ? 'text-white' : 'text-black'}`}>Profil</h3>
          <button onClick={handleShareProfile} className={`p-2 rounded-full ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-black/5 hover:bg-black/10 text-black/60'}`}>
            <Share2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile info */}
          <div className="px-6 pt-5 pb-4 flex flex-col items-center text-center">
            <div className="relative group mb-3">
              {isTopTen && (
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-cyan-300 via-blue-500 to-indigo-600 animate-pulse-slow opacity-80 blur-[3px]" />
              )}
              <div className={`relative ${isTopTen ? 'p-1 bg-' + (isDark ? 'slate-900' : 'white') : ''} rounded-full z-10`}>
                {profileUserPhoto ? (
                  <img src={profileUserPhoto} alt={profileUserName} className={`w-20 h-20 rounded-full object-cover ${isTopTen ? 'ring-2 ring-blue-400' : `ring-4 ${t?.ringAccent || 'ring-[#3b82f6]'} ring-opacity-30`}`} />
                ) : (
                  <div className={`w-20 h-20 rounded-full ${isTopTen ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400' : `${t?.bgAccentSoft || 'bg-[#3b82f6]/20'} ${t?.textAccent || 'text-[#3b82f6]'}`} flex items-center justify-center font-black text-2xl`}>
                    {(profileUserName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <h2 className={`font-black text-xl mb-1 flex items-center justify-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
              {profileUserName || 'Pengguna'}
              {isTopTen && (
                <span className="flex items-center gap-1 text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-lg border border-blue-400">
                  <Trophy size={10} />
                  {leaderboardRank}
                </span>
              )}
            </h2>

            {/* Stats */}
            <div className="flex gap-8 mt-3 mb-4">
              <div className="flex flex-col items-center">
                <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-black'}`}>{posts.length}</span>
                <span className={`text-[11px] font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>Post</span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-black'}`}>{followerCount}</span>
                <span className={`text-[11px] font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>Pengikut</span>
              </div>
              <div className="flex flex-col items-center">
                <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-black'}`}>{followingCount}</span>
                <span className={`text-[11px] font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>Mengikuti</span>
              </div>
            </div>

            {/* Follow Button */}
            {!isOwnProfile && (
              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={handleShareProfile}
                  className={`flex-1 py-3 rounded-2xl ${t.bgBox} font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95`}
                >
                  <Share2 size={16} /> Share
                </button>
                {isUserBlocked ? (
                  <button 
                    onClick={handleUnblock}
                    disabled={isLoadingFollow}
                    className="flex-[2] py-3 rounded-2xl bg-slate-500 text-white font-black shadow-lg shadow-slate-500/30 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingFollow ? 'Memproses...' : 'Buka Blokir (Unblock)'}
                  </button>
                ) : (
                  <button 
                    onClick={handleFollow}
                    disabled={isLoadingFollow}
                    className={`flex-[2] py-3 rounded-2xl ${isFollowingUser ? t.bgBox : t.bgAccent} ${isFollowingUser ? t.textMain : (t.textAccent === 'text-white' ? 'text-white' : 'text-slate-900')} font-black shadow-lg ${!isFollowingUser ? 'shadow-[#3b82f6]/30' : ''} transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50`}
                  >
                    {isLoadingFollow ? 'Memproses...' : (
                      isFollowingUser ? <><UserCheck size={16}/> Mengikuti</> : <><UserPlus size={16}/> Ikuti</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Admin Controls */}
            {isAdmin && !isOwnProfile && (
              <div className="mt-4 pt-4 border-t border-rose-500/10">
                <button
                  onClick={handleBanUser}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/30"
                >
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>Hapus Akses Pengguna ke Komunitas</span>
                </button>
              </div>
            )}
          </div>

          {/* Achievements strip */}
          {achievements.length > 0 && (
            <div className={`mx-4 mb-4 p-4 rounded-3xl flex flex-wrap gap-4 ${isDark ? 'bg-[#1e1c17] border border-amber-500/10' : 'bg-amber-50 border border-amber-200'} shadow-inner`}>
              {achievements.map((p, i) => (
                <UnifiedBadge key={i} achievementId={p.achievementId} achievementTitle={p.achievementTitle} isDark={isDark} />
              ))}
            </div>
          )}

          {/* Inline posts */}
          {isLoading ? (
            <div className={`text-center py-8 text-sm font-bold ${isDark ? 'text-white/40' : 'text-black/40'}`}>Memuat postingan...</div>
          ) : regularPosts.length > 0 ? (
            <div className="px-4 pb-6 space-y-4">
              <div className={`flex items-center gap-1.5 mb-3 ${isDark ? 'text-white/50' : 'text-black/40'}`}>
                <ClipboardList size={13} />
                <span className="text-[11px] font-bold uppercase tracking-wider">Postingan ({regularPosts.length})</span>
              </div>
              {regularPosts.map((post, i) => {
                const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : []);
                return (
                  <div key={post.id || i} className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                    {post.text && <p className="text-sm font-medium mb-3 whitespace-pre-wrap">{post.text}</p>}
                    
                    {images.length > 0 && (
                      <div className={`grid gap-1 rounded-xl overflow-hidden ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {images.map((url, j) => (
                          <img key={j} src={url} alt="" className="w-full aspect-square object-cover" loading="lazy" />
                        ))}
                      </div>
                    )}
                    
                    {post.timestamp && (
                      <p className={`text-[10px] mt-3 font-bold ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                        {post.timestamp?.toDate ? post.timestamp.toDate().toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-8 text-sm font-bold ${isDark ? 'text-white/30' : 'text-black/30'}`}>Belum ada postingan</div>
          )}

          {/* Moderation actions */}
          {!isOwnProfile && currentUser && (
            <div className={`mx-4 mt-2 mb-8 pt-4 border-t flex flex-col gap-2 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <button onClick={handleReportUser} className={`flex items-center gap-2 text-xs font-bold ${isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'} transition-colors`}>
                <ClipboardList size={14} /> Laporkan Akun Ini
              </button>
              <button onClick={handleBlockUser} className={`flex items-center gap-2 text-xs font-bold text-rose-500/70 hover:text-rose-500 transition-colors`}>
                <AlertTriangle size={14} /> Blokir Pengguna
              </button>
            </div>
          )}
        </div>
      </div>
      {dialog}
    </div>
  );
}
