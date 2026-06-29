import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy, Heart, MessageCircle, Flame, Loader2, Award, Plus, Bell,
  MoreHorizontal, Trash2, Edit3, Send, RefreshCw, Share2, X, Check, ClipboardList
} from 'lucide-react';
import {
  getGlobalFeed, getUserPosts, toggleLike, deletePost, updatePost,
  addComment, getComments, repostPost, getNotifications, sendNotification,
  getWeeklyLeaderboard
} from '../utils/communityApi';
import { getFollowingIds, getBlockedList, blockUser } from '../utils/followApi';
import { containsBadWords, reportPost, reportUser, getLocalHiddenPosts, getLocalBlockedUsers } from '../utils/moderationApi';
import { formatNumber } from '../utils/numberFormat';
import { ACHIEVEMENTS } from '../data/achievements';
import ImageModal from '../components/ImageModal';
import CreatePostModal from '../components/CreatePostModal';
import ProgramCard from '../components/ProgramCard';
import UserProfileModal from '../components/UserProfileModal';
import UnifiedBadge from '../components/UnifiedBadge';
import { uploadToCloudinary } from '../utils/cloudinary';
import useDialog from '../hooks/useDialog';

const FILTERS = ['Semua', 'Diikuti', 'Saya'];

const CommunityTab = ({ t, theme, user, programs, setPrograms, soundEnabled, playSoundEffect, activeFilter = 'Semua', highlightPostId = null, onClearHighlight = null }) => {
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [viewingProfile, setViewingProfile] = useState(null); // {userId, userName, userPhoto}
  const [leaderboard, setLeaderboard] = useState([]);
  
  // per-post state
  const [likedPosts, setLikedPosts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [menuOpen, setMenuOpen] = useState(null); // postId
  const [editingPost, setEditingPost] = useState(null); // {id, text, imageUrls}
  const [createPostOverrides, setCreatePostOverrides] = useState({});

  const isDark = theme === 'dark';
  const { dialog, showAlert, showConfirm } = useDialog(isDark);
  const postRefs = useRef({});
  const [flashingPostId, setFlashingPostId] = useState(null);

  useEffect(() => {
    if (!highlightPostId || feed.length === 0) return;
    const el = postRefs.current[highlightPostId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFlashingPostId(highlightPostId);
        setTimeout(() => {
          setFlashingPostId(null);
          if (onClearHighlight) onClearHighlight();
        }, 2500);
      }, 300);
    }
  }, [highlightPostId, feed]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let data = activeFilter === 'Saya' && user?.uid
        ? await getUserPosts(user?.uid, 30) 
        : await getGlobalFeed(50);
      
      const hiddenPosts = getLocalHiddenPosts();
      const blockedUsersLocal = getLocalBlockedUsers();
      
      // Filter out blocked users (from DB and Local) and hidden posts
      data = data.filter(p => 
        !blockedIds.includes(p.userId) && 
        !blockedUsersLocal.includes(p.userId) &&
        !hiddenPosts.includes(p.id) &&
        p.isHidden !== true // Server-side Auto-Takedown
      );

      // if filter is 'Diikuti'
      if (activeFilter === 'Diikuti' && user?.uid) {
        data = data.filter(p => followingIds.includes(p.userId) || p.userId === user.uid);
      }
      setFeed(data);

      // init liked state
      if (user?.uid) {
        const liked = {};
        data.forEach(p => { liked[p.id] = (p.likedBy || []).includes(user.uid); });
        setLikedPosts(liked);
      }
      
      // Load Leaderboard only if on 'Semua' filter (global feed)
      if (activeFilter === 'Semua') {
        const lb = await getWeeklyLeaderboard();
        setLeaderboard(lb);
      } else {
        setLeaderboard([]);
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  }, [activeFilter, user?.uid, followingIds, blockedIds]);

  useEffect(() => { loadData(); }, [activeFilter, loadData]);

  useEffect(() => {
    if (!user?.uid) return;
    getFollowingIds(user.uid).then(setFollowingIds);
    getBlockedList(user.uid).then(setBlockedIds);
  }, [user?.uid]);

  const scrollToPost = (postId) => {
    if (!postId) return;
    const el = postRefs.current[postId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashingPostId(postId);
      setTimeout(() => setFlashingPostId(null), 2500);
    } else {
      showAlert('Postingan asli tidak dapat ditemukan atau berada terlalu jauh di bawah.');
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Baru saja';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Baru saja';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mnt lalu`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} hr lalu`;
    return `${Math.floor(seconds / 2592000)} bln lalu`;
  };

  const handleLike = async (post) => {
    if (!user?.uid) return;
    const newLiked = await toggleLike(post.id, user.uid, post.userId, user.name || user.email?.split('@')[0], user.photoURL);
    setLikedPosts(prev => ({ ...prev, [post.id]: newLiked }));
    setFeed(prev => prev.map(p => p.id === post.id
      ? { ...p, likes: newLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1) }
      : p
    ));
  };

  const handleReportPost = async (post) => {
    setMenuOpen(null);
    const reason = prompt("Mengapa Anda melaporkan postingan ini? (Misal: Spam, Kata Kotor, Tidak Senonoh)");
    if (!reason) return;
    
    const success = await reportPost(post.id, user?.uid, reason);
    if (success) {
      await showAlert("Laporan berhasil dikirim. Postingan telah disembunyikan dari beranda Anda.", { type: 'success' });
      // Hapus dari state lokal
      setFeed(prev => prev.filter(p => p.id !== post.id));
    }
  };

  const handleBlockUser = async (targetUserId) => {
    setMenuOpen(null);
    const confirm = await showConfirm(
      "Blokir Pengguna?",
      "Anda tidak akan lagi melihat postingan maupun komentar dari pengguna ini. Lanjutkan?",
      "Ya, Blokir", "Batal"
    );
    if (!confirm) return;

    try {
      await blockUser(user?.uid, targetUserId);
      const localBlocked = getLocalBlockedUsers();
      if (!localBlocked.includes(targetUserId)) {
        localBlocked.push(targetUserId);
        localStorage.setItem('lyfit_blocked_users_local', JSON.stringify(localBlocked));
      }
      setBlockedIds(prev => [...prev, targetUserId]);
      await showAlert("Pengguna berhasil diblokir.", { type: 'success' });
      // Bersihkan feed lokal
      setFeed(prev => prev.filter(p => p.userId !== targetUserId));
    } catch (err) {
      await showAlert("Gagal memblokir pengguna.", { type: 'error' });
    }
  };

  const handleDelete = async (postId) => {
    const ok = await showConfirm('Hapus postingan ini?', { title: 'Hapus Postingan', confirmText: 'Hapus', danger: true });
    if (!ok) return;
    await deletePost(postId);
    setFeed(prev => prev.filter(p => p.id !== postId));
    setMenuOpen(null);
  };

  const handleEditSave = async () => {
    if (!editingPost) return;
    try {
      await updatePost(editingPost.id, { text: editingPost.text, imageUrls: editingPost.imageUrls });
      setFeed(prev => prev.map(p => p.id === editingPost.id ? { ...p, text: editingPost.text, imageUrls: editingPost.imageUrls } : p));
      setEditingPost(null);
    } catch (e) { await showAlert('Gagal menyimpan perubahan.', { type: 'error', title: 'Error' }); }
  };

  const handleExpandComments = async (postId) => {
    const next = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: next }));
    if (next && !comments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      const data = await getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleSendComment = async (post) => {
    const text = (commentInput[post.id] || '').trim();
    if (!text || !user?.uid) return;

    if (containsBadWords(text)) {
      await showAlert('Komentar mengandung kata-kata yang tidak pantas.', { type: 'error', title: 'Peringatan' });
      return;
    }

    const newComment = {
      id: 'temp-' + Date.now(),
      userId: user.uid,
      userName: user.name || user.email?.split('@')[0] || 'Anonim',
      userPhoto: user.photoURL || null,
      text,
      timestamp: null
    };
    setComments(prev => ({ ...prev, [post.id]: [...(prev[post.id] || []), newComment] }));
    setCommentInput(prev => ({ ...prev, [post.id]: '' }));
    setFeed(prev => prev.map(p => p.id === post.id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    await addComment(post.id, { userId: user.uid, userName: newComment.userName, userPhoto: newComment.userPhoto, text }, post.userId);
  };

  const handleRepost = async (post) => {
    if (!user?.uid) return;
    setCreatePostOverrides({
      type: 'repost',
      originalPostId: post.id,
      originalUserId: post.userId || null,
      originalUserName: post.userName || 'Anonim',
      originalUserPhoto: post.userPhoto || null,
      originalText: post.text || '',
      originalImageUrls: post.imageUrls || [],
      originalType: post.type || null,
    });
    setIsCreatingPost(true);
  };

  const handleNativeShare = async (post) => {
    const text = post.text || `Postingan dari ${post.userName} di LyFit`;
    if (navigator.share) {
      navigator.share({ title: post.userName, text });
    } else {
      navigator.clipboard?.writeText(text);
      await showAlert('Teks postingan disalin ke clipboard!', { type: 'success' });
    }
  };

  const renderAvatar = (userName, userPhoto, userId) => {
    const isTopTen = leaderboard.some(u => u.id === userId);
    return (
      <button
        onClick={() => setViewingProfile({ userId, userName, userPhoto })}
        className="shrink-0 relative group"
      >
        {isTopTen && (
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-300 via-blue-500 to-indigo-600 animate-pulse-slow opacity-80 blur-[2px]" />
        )}
        <div className={`relative ${isTopTen ? 'ring-2 ring-blue-400 p-[2px]' : ''} rounded-full bg-${isDark ? 'slate-800' : 'white'} z-10`}>
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className={`w-9 h-9 rounded-full object-cover ${!isTopTen ? `ring-2 ${t.ringAccent} ring-opacity-20 hover:ring-opacity-50` : ''} transition-all`} />
          ) : (
            <div className={`w-9 h-9 rounded-full ${!isTopTen ? t.bgAccentSoft : 'bg-blue-100'} ${!isTopTen ? t.textAccent : 'text-blue-600'} flex items-center justify-center font-black text-sm transition-all`}>
              {(userName || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderPostCard = (post, idx) => {
    const isOwn = user?.uid === post.userId;
    const isAdmin = user?.email === 'untheryan@gmail.com';
    const liked = likedPosts[post.id] || false;
    const commentsOpen = expandedComments[post.id] || false;
    const postComments = comments[post.id] || [];
    const isEditingThis = editingPost?.id === post.id;

    return (
      <div
        key={post.id || idx}
        ref={el => { if (el) postRefs.current[post.id] = el; }}
        className={`${
          isDark ? 'bg-slate-800/40' : 'bg-white/60'
        } backdrop-blur-md rounded-3xl p-4 border transition-all duration-500 ${
          flashingPostId === post.id
            ? 'border-[#41759b] shadow-[0_0_0_3px_rgba(65,117,155,0.3)]'
            : isDark ? 'border-white/10' : 'border-white/40'
        } shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${menuOpen === post.id ? 'relative z-50' : 'relative z-10'}`}
      >

        {/* Post header */}
        <div className="flex items-start gap-3 mb-3">
          {renderAvatar(post.userName, post.userPhoto, post.userId)}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
              <button
                onClick={() => setViewingProfile({ userId: post.userId, userName: post.userName, userPhoto: post.userPhoto })}
                className={`font-black text-sm ${t.textMain} hover:underline`}
              >
                {post.userName}
              </button>
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-medium ${t.textMuted}`}>
              <span>{formatTimeAgo(post.timestamp)}</span>
              {post.type === 'repost' && (
                <>
                  <span>•</span>
                  <span className="font-bold flex items-center gap-1">
                    <RefreshCw size={10}/> membagikan ulang
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ⋯ menu */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === post.id ? null : post.id); }}
              className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-black/40'} transition-colors`}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen === post.id && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-8 z-50 ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-black/10'} border rounded-2xl shadow-xl overflow-hidden w-max`}
              >
                {isOwn ? (
                  <>
                    <button
                      onClick={() => { setEditingPost({ id: post.id, text: post.text || '', imageUrls: post.imageUrls || [] }); setMenuOpen(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold whitespace-nowrap ${isDark ? 'text-white hover:bg-white/5' : 'text-black hover:bg-black/5'} transition-colors`}
                    >
                      <Edit3 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={16} /> Hapus
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleReportPost(post)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold whitespace-nowrap ${isDark ? 'text-white hover:bg-white/5' : 'text-black hover:bg-black/5'} transition-colors`}
                    >
                      <ClipboardList size={16} /> Laporkan
                    </button>
                    <button
                      onClick={() => handleBlockUser(post.userId)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <X size={16} /> Blokir Pengguna
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-rose-600 hover:bg-rose-600/10 transition-colors border-t border-rose-500/10"
                      >
                        <Trash2 size={16} /> Force Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit mode */}
        {isEditingThis ? (
          <div className="mb-3 flex flex-col gap-2">
            <textarea
              value={editingPost.text}
              onChange={e => setEditingPost(prev => ({ ...prev, text: e.target.value }))}
              className={`w-full p-3 rounded-2xl resize-none outline-none text-sm border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingPost(null)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>Batal</button>
              <button onClick={handleEditSave} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${t.bgAccent} flex items-center gap-1`}><Check size={12}/> Simpan</button>
            </div>
          </div>
        ) : (
          <>
            {/* Repost: original content preview */}
            {post.type === 'repost' && (
              <>
                {post.text && <p className={`text-sm ${t.textMain} mb-3 whitespace-pre-wrap`}>{post.text}</p>}
                <div 
                  onClick={() => scrollToPost(post.originalPostId)}
                className={`mb-3 p-3 rounded-2xl border cursor-pointer hover:opacity-80 transition-opacity ${isDark ? 'bg-white/5 border-white/8' : 'bg-slate-50 border-black/6'}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {renderAvatar(post.originalUserName, post.originalUserPhoto, post.originalUserId)}
                  <span className={`text-xs font-black ${t.textMain}`}>{post.originalUserName}</span>
                </div>
                {post.originalText && <p className={`text-xs ${t.textMuted} leading-relaxed`}>{post.originalText}</p>}
                {post.originalImageUrls?.[0] && (
                  <img src={post.originalImageUrls[0]} alt="" className="mt-2 w-full rounded-xl object-cover max-h-40" />
                )}
                
                {post.originalType === 'template' && (
                  <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold ${isDark ? 'bg-black/20 text-white' : 'bg-slate-100 text-black'} flex items-center gap-2`}>
                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                       <ClipboardList size={14} className={t.textMain} />
                     </div>
                     Program Latihan
                  </div>
                )}
                {(post.originalType === 'workout_log' || !post.originalType) && !post.originalImageUrls?.length && !post.originalText && (
                  <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold ${isDark ? 'bg-black/20 text-white' : 'bg-slate-100 text-black'} flex items-center gap-2`}>
                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                       <Flame size={14} className="text-amber-500" />
                     </div>
                     Sesi Latihan Selesai
                  </div>
                )}
                {post.originalType === 'achievement' && (
                  <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold ${isDark ? 'bg-amber-900/20 text-amber-500' : 'bg-amber-50 text-amber-600'} flex items-center gap-2`}>
                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                       <Award size={14} className="text-amber-500" />
                     </div>
                     Lencana Terbuka
                  </div>
                )}
              </div>
              </>
            )}

            {/* WORKOUT LOG */}
            {(!post.type || post.type === 'workout_log') && (
              <div className="mb-3">
                {post.text && <p className={`text-sm ${t.textMain} mb-3 whitespace-pre-wrap`}>{post.text}</p>}
                {post.imageUrl && !post.imageUrls && (
                  <div className="w-full rounded-[2rem] overflow-hidden cursor-pointer mb-2" onClick={() => setSelectedImage(post.imageUrl)}>
                    <img src={post.imageUrl} alt="Shared workout" className="w-full h-auto object-contain block" loading="lazy" />
                  </div>
                )}
                {post.imageUrls && post.imageUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar snap-x mb-2">
                    {post.imageUrls.map((url, i) => (
                      <div key={i} className="relative w-[80%] h-64 shrink-0 snap-center rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
                {(!post.imageUrl && (!post.imageUrls || post.imageUrls.length === 0)) && (
                  <div className={`p-3 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'} border ${t.borderDashed} border-dashed`}>
                    <h5 className={`font-black text-lg ${t.textMain} mb-1`}>{post.workoutName || post.programName}</h5>
                    <div className="flex gap-4">
                      <span className={`text-xs font-bold ${t.textMuted} flex items-center gap-1`}><Flame size={12}/> {post.duration}</span>
                      <span className={`text-xs font-bold ${t.textMuted} flex items-center gap-1`}><Trophy size={12}/> {formatNumber(post.totalVolume || 0, 'id')} kg</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* USER POST */}
            {post.type === 'user_post' && (
              <div className="mb-3">
                {post.text && <p className={`text-sm ${t.textMain} mb-3 whitespace-pre-wrap`}>{post.text}</p>}
                {post.imageUrls && post.imageUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar snap-x">
                    {post.imageUrls.map((url, i) => (
                      <div key={i} className="relative w-[80%] h-64 shrink-0 snap-center rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TEMPLATE */}
            {post.type === 'template' && (() => {
              const exercises = post.exercises || post.programData?.exercises || [];
              const programName = post.programName || post.programData?.name || 'Custom Program';
              const planName = post.planName || post.programData?.planName || 'Custom';
              const sharedByName = post.userName || post.programData?.userName || 'User';
              const handleImportProgram = async () => {
                if (!setPrograms) { await showAlert('Tidak bisa menyimpan program saat ini.', { type: 'error' }); return; }
                const routines = post.routines || post.programData?.routines || [];
                const newProgram = {
                  id: 'custom-imported-' + Date.now(), planId: 'custom-' + Date.now(),
                  name: programName, planName,
                  routines: routines.map((r, ri) => ({
                    id: 'routine-' + Date.now() + ri, name: r.name,
                    exercises: (r.exercises || []).map(e => ({ ...e, id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substr(2,5), sets: e.sets || 3, reps: e.reps || 10 })),
                  })),
                  exercises: exercises.map(ex => ({ ...ex, id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substr(2,5), sets: ex.sets || 3, reps: ex.reps || 10 })),
                  restTime: post.restTime || post.programData?.restTime || 90,
                  source: 'community', sharedBy: sharedByName,
                };
                setPrograms(prev => [...prev, newProgram]);
                await showAlert(`Program "${programName}" berhasil disimpan ke daftar programmu!`, { type: 'success', title: 'Program Tersimpan' });
              };
              return (
                <div className="mb-3 flex flex-col gap-2">
                  {post.text && <p className={`text-xs ${t.textMain} whitespace-pre-wrap leading-relaxed`}>{post.text}</p>}
                  <ProgramCard post={post} isDark={isDark} t={t} />
                  <button onClick={handleImportProgram} className={`w-full py-2 rounded-xl text-xs font-black shadow-sm hover:opacity-80 active:scale-95 transition-all ${t.bgAccent}`}>
                    Simpan Program
                  </button>
                </div>
              );
            })()}

            {/* ACHIEVEMENT */}
            {post.type === 'achievement' && (
              <div className={`p-4 rounded-2xl ${isDark ? 'bg-amber-900/10' : 'bg-amber-50'} border ${isDark ? 'border-amber-500/10' : 'border-amber-500/20'} mb-3 flex items-center justify-between`}>
                <div>
                  <div className={`text-[10px] font-bold ${isDark ? 'text-amber-500' : 'text-amber-600'} uppercase tracking-wider mb-1 flex items-center gap-1`}>
                    <Award size={12} />
                    Lencana Terbuka
                  </div>
                  <h5 className={`font-black text-sm ${t.textMain} leading-snug`}>{post.achievementTitle}</h5>
                  <p className={`text-xs ${t.textMuted} mt-1`}>Berhasil membuka pencapaian baru!</p>
                </div>
                <div className="shrink-0 -mr-2">
                  <UnifiedBadge achievementId={post.achievementId} achievementTitle={post.achievementTitle} isDark={isDark} t={t} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Action bar */}
        <div className={`flex items-center gap-1 pt-2 border-t ${t.borderDashed} border-dashed`}>
          {/* Like */}
          <button
            onClick={() => handleLike(post)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-90 ${
              liked ? 'text-rose-500 bg-rose-500/10' : `${t.textMuted} hover:bg-rose-500/10 hover:text-rose-500`
            }`}
          >
            <Heart size={13} fill={liked ? 'currentColor' : 'none'} /> {post.likes || 0}
          </button>

          {/* Comment */}
          <button
            onClick={() => handleExpandComments(post.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all ${commentsOpen ? `${t.textAccent} ${t.bgAccentSoft}` : `${t.textMuted} hover:${t.bgAccentSoft} hover:${t.textAccent}`}`}
          >
            <MessageCircle size={13} /> {post.commentCount || 0}
          </button>

          {/* Repost */}
          <button
            onClick={() => handleRepost(post)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold ${t.textMuted} hover:bg-green-500/10 hover:text-green-500 transition-all`}
            title="Repost"
          >
            <RefreshCw size={13} />
          </button>

          {/* Native share */}
          <button
            onClick={() => handleNativeShare(post)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold ${t.textMuted} hover:bg-purple-500/10 hover:text-purple-500 transition-all`}
            title="Bagikan"
          >
            <Share2 size={13} />
          </button>
        </div>

        {/* Comments section (expandable) */}
        {commentsOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {loadingComments[post.id] && (
              <div className={`text-center py-3 text-xs font-bold ${t.textMuted}`}>Memuat komentar...</div>
            )}
            {postComments.map((c, ci) => (
              <div key={c.id || ci} className="flex gap-2 items-start">
                {c.userPhoto ? (
                  <img src={c.userPhoto} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                ) : (
                  <div className={`w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-black ${isDark ? 'bg-white/10 text-white/60' : 'bg-black/8 text-black/50'}`}>
                    {(c.userName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`flex-1 px-3 py-2 rounded-2xl rounded-tl-sm text-xs ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                  <span className={`font-black mr-1.5 ${t.textMain}`}>{c.userName}</span>
                  <span className={t.textMuted}>{c.text}</span>
                </div>
              </div>
            ))}
            {postComments.length === 0 && !loadingComments[post.id] && (
              <p className={`text-xs text-center py-1 ${t.textMuted}`}>Belum ada komentar. Jadilah yang pertama!</p>
            )}
            {/* Comment input */}
            <div className="flex gap-2 items-center mt-1">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black ${t.bgAccentSoft} ${t.textAccent}`}>
                  {(user?.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/4 border-black/8'}`}>
                <input
                  type="text"
                  value={commentInput[post.id] || ''}
                  onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendComment(post); }}
                  placeholder="Tulis komentar..."
                  className={`flex-1 text-xs bg-transparent outline-none ${isDark ? 'text-white placeholder-white/30' : 'text-black placeholder-black/30'}`}
                />
                <button onClick={() => handleSendComment(post)} className={`${t.textAccent} hover:opacity-80 transition-colors shrink-0`}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col pb-24">
      {/* Feed */}
      <div className="px-4 pt-3">
        {isLoading ? (
          <div className={`flex flex-col items-center justify-center py-20 ${t.textAccent} opacity-60`}>
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="font-bold text-sm">Memuat feed komunitas...</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {/* Leaderboard Section */}
            {activeFilter === 'Semua' && (
              <div className={`p-4 rounded-3xl ${isDark ? 'bg-gradient-to-br from-blue-500/10 to-[#1e1c17] border border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-white border border-blue-200'} shadow-lg mb-2 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Trophy size={64} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <div className="flex items-start gap-3 mb-4 relative z-10">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Trophy size={18} />
                  </div>
                  <div>
                    <h3 className={`font-black text-sm tracking-wide ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      10 Pengguna Teratas
                    </h3>
                    <p className={`text-[10px] font-bold ${isDark ? 'text-blue-300/60' : 'text-blue-600/70'}`}>
                      share latihanmu ke sini dan jadilah juara!
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pt-2 pb-3 px-1 relative z-10 min-h-[80px]">
                  {leaderboard.length === 0 ? (
                    <div className={`w-full flex flex-col items-center justify-center py-4 text-center ${isDark ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
                      <Award size={24} className="mb-2 opacity-50" />
                      <p className="text-xs font-bold">Jadilah yang pertama membagikan latihanmu sekarang!</p>
                    </div>
                  ) : (
                    leaderboard.map((lbUser, idx) => (
                      <button 
                        key={lbUser.id}
                        onClick={() => setViewingProfile({ userId: lbUser.id, userName: lbUser.name, userPhoto: lbUser.photoUrl })}
                        className="flex flex-col items-center gap-1.5 shrink-0 group relative"
                      >
                        <div className="relative">
                          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-300 via-blue-500 to-indigo-600 opacity-60 blur-[2px] group-hover:opacity-100 transition-opacity" />
                          <div className={`relative p-[2px] bg-${isDark ? 'slate-800' : 'white'} rounded-full z-10`}>
                            {lbUser.photoUrl ? (
                              <img src={lbUser.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg">
                                {(lbUser.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-black z-20 border-2 border-white dark:border-slate-800">
                            {idx + 1}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold max-w-[60px] truncate ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                          {lbUser.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {feed.length === 0 ? (
              <p className={`text-center py-10 ${t.textMuted} text-sm font-bold`}>
                {activeFilter === 'Diikuti' ? 'Ikuti seseorang untuk melihat postingan mereka.' : 'Belum ada post di komunitas.'}
              </p>
            ) : (
              feed.map((post, idx) => renderPostCard(post, idx))
            )}
          </div>
        )}
      </div>

      {/* FAB Create Post */}
      <button
        onClick={() => setIsCreatingPost(true)}
        className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full ${t.bgAccent} shadow-xl ${t.shadowAccent} flex justify-center items-center hover:scale-105 active:scale-95 transition-all`}
      >
        <Plus size={28} />
      </button>

      {/* Modals */}

      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />

      {isCreatingPost && (
        <CreatePostModal
          user={user}
          theme={theme}
          t={t}
          postDataOverrides={createPostOverrides}
          onClose={(shouldRefresh) => {
            setIsCreatingPost(false);
            setCreatePostOverrides({});
            if (shouldRefresh) loadData();
          }}
        />
      )}

      {viewingProfile && (
        <UserProfileModal
          profileUserId={viewingProfile.userId}
          profileUserName={viewingProfile.userName}
          profileUserPhoto={viewingProfile.userPhoto}
          currentUser={user}
          isDark={isDark}
          t={t}
          leaderboardRank={leaderboard.findIndex(u => u.id === viewingProfile.userId) + 1}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {/* In-app dialog */}
      {dialog}
    </div>
  );
};

export default CommunityTab;
