import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy, Heart, MessageCircle, Flame, Loader2, Award, Plus, Bell,
  MoreHorizontal, Trash2, Edit3, Send, RefreshCw, Share2, X, Check, ClipboardList, Search,
  ImagePlus, Clock
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import {
  getGlobalFeed, getUserPosts, toggleLike, deletePost, updatePost,
  addComment, getComments, repostPost, getNotifications, sendNotification,
  getWeeklyLeaderboard, updateLeaderboardScore, getCurrentWeekId, searchUsers,
  getFollowingFeed
} from '../utils/communityApi';
import { uploadImageToFirebase } from '../utils/storage';
import { getFollowingIds, getFollowerList, getBlockedList, blockUser } from '../utils/followApi';
import { containsBadWords, reportPost, reportUser, getLocalHiddenPosts, getLocalBlockedUsers } from '../utils/moderationApi';
import { formatNumber } from '../utils/numberFormat';
import { ACHIEVEMENTS } from '../data/achievements';
import ImageModal from '../components/ImageModal';
import CreatePostModal from '../components/CreatePostModal';
import ProgramCard from '../components/ProgramCard';
import UserProfileModal from '../components/UserProfileModal';
import UnifiedBadge from '../components/UnifiedBadge';

import useDialog from '../hooks/useDialog';

const FILTERS = ['Semua', 'Diikuti', 'Teman'];

const CommunityTab = ({ t, theme, user, programs, setPrograms, soundEnabled, playSoundEffect, activeFilter = 'Semua', highlightPostId = null, onClearHighlight = null, onEditOwnProfile = null }) => {
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);
  const [followerIds, setFollowerIds] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [viewingProfile, setViewingProfile] = useState(null); // {userId, userName, userPhoto}
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // per-post state
  const [likedPosts, setLikedPosts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [menuOpen, setMenuOpen] = useState(null); // postId
  const [editingPost, setEditingPost] = useState(null); // {id, text, imageUrls, newFiles, type, programData}
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef(null);
  const [createPostOverrides, setCreatePostOverrides] = useState({});

  const isDark = theme === 'dark';
  const { dialog, showAlert, showConfirm } = useDialog(isDark);
  const postRefs = useRef({});
  const [flashingPostId, setFlashingPostId] = useState(null);

  // Modal Scroll Lock Protocol
  useEffect(() => {
    if (editingPost || viewingProfile || selectedImages || isCreatingPost) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [editingPost, viewingProfile, selectedImages, isCreatingPost]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results); // Allow searching self
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user?.uid]);

  useEffect(() => {
    const el = postRefs.current[highlightPostId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
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
      let data = [];
      
      if (activeFilter === 'Semua') {
        data = await getGlobalFeed(50);
      } else if (activeFilter === 'Diikuti' && user?.uid) {
        if (followingIds.length > 0) {
          data = await getFollowingFeed(followingIds, 50);
        } else {
          data = [];
        }
      } else if (activeFilter === 'Teman' && user?.uid) {
        const mutualIds = followingIds.filter(id => followerIds.includes(id));
        if (mutualIds.length > 0) {
          data = await getFollowingFeed(mutualIds, 50);
        } else {
          data = [];
        }
      }
      
      const hiddenPosts = getLocalHiddenPosts();
      const blockedUsersLocal = getLocalBlockedUsers();
      
      // Filter out blocked users (from DB and Local) and hidden posts
      data = data.filter(p => 
        !blockedIds.includes(p.userId) && 
        !blockedUsersLocal.includes(p.userId) &&
        !hiddenPosts.includes(p.id) &&
        p.isHidden !== true // Server-side Auto-Takedown
      );

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

        // Pastikan user ini "terdaftar" di leaderboard minggu ini (skor 0 kalau belum pernah
        // aktif) supaya dia kelihatan punya posisi dan termotivasi mempertahankannya — bukan
        // cuma nongol begitu udah dapat poin. +0 aman diulang (tidak mereset skor asli),
        // tapi dibatasi sekali/minggu lewat localStorage biar tidak nulis Firestore tiap buka tab.
        if (user?.uid) {
          const seedKey = `lyfit_lb_seeded_${getCurrentWeekId()}_${user.uid}`;
          if (!localStorage.getItem(seedKey)) {
            updateLeaderboardScore(user.uid, user.name || user.email?.split('@')[0], user.photoURL, 0)
              .then(() => localStorage.setItem(seedKey, '1'))
              .catch(() => {});
          }
        }
      } else {
        setLeaderboard([]);
      }
    } catch (e) { 
      console.error(e); 
      showAlert(e.message || "Gagal memuat feed", { type: 'error', title: 'Error Feed' });
    }
    setIsLoading(false);
  }, [activeFilter, user?.uid, followingIds, followerIds, blockedIds]);

  useEffect(() => { loadData(); }, [activeFilter, loadData]);

  useEffect(() => {
    if (!user?.uid) return;
    getFollowingIds(user.uid).then(setFollowingIds);
    getFollowerList(user.uid).then(list => setFollowerIds(list.map(f => f.uid)));
    getBlockedList(user.uid).then(setBlockedIds);
  }, [user?.uid]);

  const scrollToPost = (postId) => {
    if (!postId) return;
    const el = postRefs.current[postId];
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      setFlashingPostId(postId);
      setTimeout(() => setFlashingPostId(null), 2500);
    } else {
      showAlert('Postingan tidak dapat ditemukan atau berada terlalu jauh di bawah.');
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

    if (containsBadWords(editingPost.text || '')) {
      await showAlert('Pesan mengandung kata-kata yang tidak pantas atau melanggar standar komunitas.', { type: 'error', title: 'Peringatan' });
      return;
    }

    setIsSavingEdit(true);
    try {
      let finalImageUrls = [...(editingPost.imageUrls || [])];
      
      // Upload any new files selected during edit
      if (editingPost.newFiles && editingPost.newFiles.length > 0) {
        for (let i = 0; i < editingPost.newFiles.length; i++) {
          const file = editingPost.newFiles[i];
          const url = await uploadImageToFirebase(file, `community_posts/${user?.uid || 'guest'}/edit_${editingPost.id}_${Date.now()}_${i}`);
          if (url) finalImageUrls.push(url);
        }
      }

      const isStillTemplate = editingPost.type === 'template' && !!editingPost.programData;
      const updatePayload = {
        text: editingPost.text || '',
        imageUrls: finalImageUrls,
        type: isStillTemplate ? 'template' : (editingPost.type === 'template' ? 'user_post' : editingPost.type || 'user_post'),
        programData: isStillTemplate ? editingPost.programData : null,
        programName: isStillTemplate ? (editingPost.programName || editingPost.programData?.name || null) : null,
        exercises: isStillTemplate ? (editingPost.exercises || editingPost.programData?.exercises || null) : null,
        routines: isStillTemplate ? (editingPost.routines || editingPost.programData?.routines || null) : null,
        planName: isStillTemplate ? (editingPost.planName || editingPost.programData?.planName || null) : null,
        restTime: isStillTemplate ? (editingPost.restTime || editingPost.programData?.restTime || null) : null,
      };

      await updatePost(editingPost.id, updatePayload);

      setFeed(prev => prev.map(p => p.id === editingPost.id ? {
        ...p,
        ...updatePayload,
        editedAt: new Date()
      } : p));

      setEditingPost(null);
      await showAlert('Postingan berhasil diperbarui!', { type: 'success', title: 'Berhasil' });
    } catch (e) {
      console.error(e);
      await showAlert('Gagal menyimpan perubahan. Silakan coba lagi.', { type: 'error', title: 'Error' });
    } finally {
      setIsSavingEdit(false);
    }
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
    try {
      const el = postRefs.current[post.id];
      const shareUrl = `${window.location.origin}/?p=${post.id}`;
      const text = post.text ? `${post.userName} di Logym: "${post.text}" - ${shareUrl}` : `Postingan dari ${post.userName} di Logym - ${shareUrl}`;
      
      if (el && navigator.share) {
        const dataUrl = await toJpeg(el, { quality: 0.95, backgroundColor: isDark ? '#0f172a' : '#f1f5f9' });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `Logym-post-${post.id}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: post.userName, text, files: [file] });
          return;
        }
      }
      
      if (navigator.share) {
        await navigator.share({ title: post.userName, text, url: shareUrl });
      } else {
        const link = document.createElement('a');
        link.download = `Logym-post-${post.userName}.jpg`;
        if (el) {
          const dataUrl = await toJpeg(el, { quality: 0.95, backgroundColor: isDark ? '#0f172a' : '#f1f5f9' });
          link.href = dataUrl;
          link.click();
          await showAlert('Gambar postingan berhasil diunduh!', { type: 'success' });
        } else {
          navigator.clipboard?.writeText(text);
          await showAlert('Teks postingan disalin ke clipboard!', { type: 'success' });
        }
      }
    } catch (err) {
      console.error(err);
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
        <div className={`relative ${isTopTen ? 'ring-2 ring-blue-400 p-[2px]' : ''} rounded-full bg-${isDark ? 'slate-800' : 'white'} z-10 w-9 h-9 flex items-center justify-center overflow-hidden`}>
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName || ''}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              decoding="async"
              loading="lazy"
              className={`w-full h-full rounded-full object-cover ${!isTopTen ? `ring-2 ${t.ringAccent} ring-opacity-20 hover:ring-opacity-50` : ''} transition-all`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.classList.remove('hidden');
                }
              }}
            />
          ) : null}
          <div className={`w-full h-full rounded-full ${!isTopTen ? t.bgAccentSoft : 'bg-blue-100'} ${!isTopTen ? t.textAccent : 'text-blue-600'} flex items-center justify-center font-black text-sm transition-all ${userPhoto ? 'hidden' : ''}`}>
            {(userName || '?').charAt(0).toUpperCase()}
          </div>
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

    // Edit time window check: max 30 minutes from creation
    const EDIT_WINDOW_MS = 30 * 60 * 1000;
    const postDate = post.timestamp?.toDate ? post.timestamp.toDate() : (post.timestamp ? new Date(post.timestamp) : null);
    const postAgeMs = postDate ? (Date.now() - postDate.getTime()) : 0;
    const isEditExpired = postAgeMs > EDIT_WINDOW_MS;
    const canEdit = isOwn && (!isEditExpired || isAdmin);

    const postImages = Array.isArray(post.imageUrls) && post.imageUrls.length > 0
      ? post.imageUrls.filter(Boolean)
      : (post.imageUrl ? [post.imageUrl] : (post.mealPhoto ? [post.mealPhoto] : (post.photoUrl ? [post.photoUrl] : (post.dishPhoto ? [post.dishPhoto] : (post.photo ? [post.photo] : [])))));

    return (
      <div
        key={post.id || idx}
        ref={el => { if (el) postRefs.current[post.id] = el; }}
        className={`pb-6 border-b transition-all duration-500 ${
          flashingPostId === post.id
            ? 'bg-blue-500/10'
            : isDark ? 'border-white/10' : 'border-slate-200'
        } ${menuOpen === post.id ? 'relative z-50' : 'relative z-10'}`}
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
              {post.sourceApp && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  String(post.sourceApp).toLowerCase() === 'lomeal'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {String(post.sourceApp).toLowerCase() === 'lomeal' ? 'Lomeal' : 'Logym'}
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-medium ${t.textMuted}`}>
              <span>{formatTimeAgo(post.timestamp)}</span>
              {post.editedAt && (
                <span className="text-[10px] text-zinc-400 font-medium italic">(Diedit)</span>
              )}
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
                className={`absolute right-0 top-8 z-50 glass-card ${isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white/80 border-black/10'} border rounded-2xl shadow-xl overflow-hidden w-max`}
              >
                {isOwn ? (
                  <>
                    {canEdit ? (
                      <button
                        onClick={() => {
                          const existingPhotos = Array.isArray(post.imageUrls) && post.imageUrls.length > 0
                            ? [...post.imageUrls]
                            : (post.imageUrl ? [post.imageUrl] : (post.mealPhoto ? [post.mealPhoto] : (post.photoUrl ? [post.photoUrl] : (post.dishPhoto ? [post.dishPhoto] : (post.photo ? [post.photo] : [])))));
                          
                          setEditingPost({
                            id: post.id,
                            text: post.text || '',
                            imageUrls: existingPhotos,
                            newFiles: [],
                            type: post.type || 'user_post',
                            programData: post.programData || (post.type === 'template' ? {
                              name: post.programName,
                              routines: post.routines,
                              exercises: post.exercises,
                              restTime: post.restTime
                            } : null),
                            programName: post.programName || post.programData?.name || null,
                            exercises: post.exercises || post.programData?.exercises || null,
                            routines: post.routines || post.programData?.routines || null,
                            planName: post.planName || post.programData?.planName || null,
                            restTime: post.restTime || post.programData?.restTime || null,
                          });
                          setMenuOpen(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold whitespace-nowrap ${isDark ? 'text-white hover:bg-white/5' : 'text-black hover:bg-black/5'} transition-colors`}
                      >
                        <Edit3 size={16} /> Edit
                      </button>
                    ) : (
                      <div className="px-4 py-2 text-[11px] font-medium text-zinc-500 border-b border-white/5 flex items-center gap-1.5">
                        <Clock size={12} /> Batas edit (30 mnt) lewat
                      </div>
                    )}
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

        {/* Post Content */}
          <>
            {/* Repost: original content preview */}
            {post.type === 'repost' && (
              <>
                {post.text && <p className={`text-sm ${t.textMain} mb-3 whitespace-pre-wrap`}>{post.text}</p>}
                <div 
                  onClick={() => scrollToPost(post.originalPostId)}
                className={`mb-3 rounded-2xl border cursor-pointer hover:opacity-80 transition-opacity flex flex-col overflow-hidden relative ${isDark ? 'border-white/8' : 'border-black/6'}`}
              >
                {post.originalImageUrls?.[0] ? (
                  <>
                    <img src={post.originalImageUrls[0]} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" decoding="async" loading="lazy" className="w-full aspect-[4/3] sm:aspect-video object-cover object-top block" />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-[#061626]/60 backdrop-blur-md border-t border-white/10">
                      <div className="flex items-center gap-2 mb-1.5">
                        {renderAvatar(post.originalUserName, post.originalUserPhoto, post.originalUserId)}
                        <span className={`text-xs font-black text-white`}>{post.originalUserName}</span>
                      </div>
                      {post.originalText && <p className={`text-xs text-white/80 leading-relaxed`}>{post.originalText}</p>}
                      
                      {post.originalType === 'template' && (
                        <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold bg-black/40 text-white flex items-center gap-2`}>
                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-white/20`}>
                             <ClipboardList size={14} className="text-white" />
                           </div>
                           Program Latihan
                        </div>
                      )}
                      {(post.originalType === 'workout_log' || !post.originalType) && !post.originalImageUrls?.length && !post.originalText && (
                        <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold bg-black/40 text-white flex items-center gap-2`}>
                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/20`}>
                             <Flame size={14} className="text-amber-500" />
                           </div>
                           Sesi Latihan Selesai
                        </div>
                      )}
                      {post.originalType === 'achievement' && (
                        <div className={`mt-2 p-2 rounded-xl text-[11px] font-bold bg-amber-900/40 text-amber-400 flex items-center gap-2 border border-amber-500/20`}>
                           <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/30`}>
                             <Award size={14} className="text-amber-400" />
                           </div>
                           Lencana Terbuka
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {renderAvatar(post.originalUserName, post.originalUserPhoto, post.originalUserId)}
                      <span className={`text-xs font-black ${t.textMain}`}>{post.originalUserName}</span>
                    </div>
                    {post.originalText && <p className={`text-xs ${t.textMuted} leading-relaxed`}>{post.originalText}</p>}
                    
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
                )}
              </div>
              </>
            )}

            {/* Post Media Images (Single or Multi-image carousel for all post types) */}
            {postImages.length > 0 && (
              <div
                className="overflow-x-auto hide-scrollbar mb-3 gap-1.5"
                style={{display:'flex', touchAction:'pan-x pan-y', WebkitOverflowScrolling:'touch'}}
                onTouchStart={e => e.stopPropagation()}
                onTouchMove={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
              >
                {postImages.map((url, i) => (
                  <div
                    key={i}
                    style={{minWidth: postImages.length === 1 ? '100%' : '85%', height:'240px'}}
                    className={`shrink-0 overflow-hidden cursor-pointer bg-slate-900/30 ${postImages.length === 1 ? 'rounded-2xl' : i === 0 ? 'rounded-l-2xl' : ''} ${i === postImages.length - 1 && postImages.length > 1 ? 'rounded-r-2xl' : ''}`}
                    onClick={() => setSelectedImages({ urls: postImages, index: i })}
                  >
                    <img
                      src={url}
                      alt=""
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      decoding="async"
                      loading="lazy"
                      className="w-full h-full object-cover object-center block"
                      onError={(e) => {
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Post Text */}
            {post.text && post.type !== 'repost' && (
              <p className={`text-sm ${t.textMain} mb-3 whitespace-pre-wrap leading-relaxed`}>{post.text}</p>
            )}

            {/* WORKOUT LOG STATS (when no image is present) */}
            {(!post.type || post.type === 'workout_log') && postImages.length === 0 && (
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'} border ${t.borderDashed} border-dashed mb-3`}>
                <h5 className={`font-black text-lg ${t.textMain} mb-1`}>{post.workoutName || post.programName || 'Sesi Latihan'}</h5>
                <div className="flex gap-4">
                  {post.duration && <span className={`text-xs font-bold ${t.textMuted} flex items-center gap-1`}><Flame size={12}/> {post.duration}</span>}
                  <span className={`text-xs font-bold ${t.textMuted} flex items-center gap-1`}><Trophy size={12}/> {formatNumber(post.totalVolume || 0, 'id')} kg</span>
                </div>
              </div>
            )}

            {/* LOMEAL / MEAL LOG CARD */}
            {(String(post.sourceApp).toLowerCase() === 'lomeal' || post.type === 'meal_log' || post.type === 'meal') && (post.calories || post.macros || post.mealName) && (
              <div className={`p-3.5 rounded-2xl ${isDark ? 'bg-emerald-950/25 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} border mb-3 flex items-center justify-between`}>
                <div>
                  <h5 className={`font-black text-sm ${t.textMain}`}>{post.mealName || 'Catatan Nutrisi'}</h5>
                  <div className="flex gap-3 mt-1 text-xs font-bold text-emerald-500">
                    {post.calories ? <span>{Math.round(post.calories)} kkal</span> : null}
                    {post.macros?.protein ? <span>P: {Math.round(post.macros.protein)}g</span> : null}
                    {post.macros?.carbs ? <span>K: {Math.round(post.macros.carbs)}g</span> : null}
                    {post.macros?.fat ? <span>L: {Math.round(post.macros.fat)}g</span> : null}
                  </div>
                </div>
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
                const planId = 'custom-' + Date.now();
                const restTime = post.restTime || post.programData?.restTime || 90;
                
                if (routines.length > 0) {
                  // Simpan sebagai multi-day split yang rapi per hari
                  const newPrograms = routines.map((r, ri) => ({
                    id: `prog-imported-${Date.now()}-${ri}`,
                    planId: planId,
                    planName: planName || programName,
                    name: r.name || `Hari ${ri + 1}`,
                    assignedDays: r.assignedDays || [],
                    restTime: r.restTime || restTime,
                    source: 'community',
                    sharedBy: sharedByName,
                    exercises: (r.exercises || []).map((e, ei) => ({
                      ...e,
                      id: typeof e.id === 'number' ? e.id : (Date.now() + ri * 100 + ei),
                      sets: e.sets || 3,
                      reps: e.reps || 10,
                      duration: e.duration || 0,
                      type: e.type || 'weight',
                      equipment: e.equipment || 'Lainnya',
                      target: Array.isArray(e.target) ? e.target : (e.target ? [e.target] : []),
                      defaultWeight: e.defaultWeight || 0,
                      ytVideo: e.ytVideo || ''
                    }))
                  }));
                  setPrograms(prev => [...prev, ...newPrograms]);
                } else {
                  // Fallback sesi tunggal
                  const newProgram = {
                    id: 'prog-imported-' + Date.now(),
                    planId: planId,
                    planName: planName || programName,
                    name: programName,
                    restTime: restTime,
                    source: 'community',
                    sharedBy: sharedByName,
                    exercises: (exercises || []).map((ex, ei) => ({
                      ...ex,
                      id: typeof ex.id === 'number' ? ex.id : (Date.now() + ei),
                      sets: ex.sets || 3,
                      reps: ex.reps || 10,
                      duration: ex.duration || 0,
                      type: ex.type || 'weight',
                      equipment: ex.equipment || 'Lainnya',
                      target: Array.isArray(ex.target) ? ex.target : (ex.target ? [ex.target] : []),
                      defaultWeight: ex.defaultWeight || 0,
                      ytVideo: ex.ytVideo || ''
                    }))
                  };
                  setPrograms(prev => [...prev, newProgram]);
                }
                await showAlert(`Program "${programName}" berhasil disimpan ke daftar programmu!`, { type: 'success', title: 'Program Tersimpan' });
              };
              return (
                <div className="mb-3 flex flex-col gap-2">
                  {post.text && <p className={`text-xs ${t.textMain} whitespace-pre-wrap leading-relaxed`}>{post.text}</p>}
                  <ProgramCard 
                    post={post} 
                    isDark={isDark} 
                    t={t} 
                    onOpenProfile={({ userId, userName, userPhoto }) => setViewingProfile({ userId, userName, userPhoto })}
                  />
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
                  <img
                    src={c.userPhoto}
                    alt=""
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    decoding="async"
                    loading="lazy"
                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.classList.remove('hidden');
                      }
                    }}
                  />
                ) : null}
                <div className={`w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-black ${isDark ? 'bg-white/10 text-white/60' : 'bg-black/8 text-black/50'} ${c.userPhoto ? 'hidden' : ''}`}>
                  {(c.userName || '?').charAt(0).toUpperCase()}
                </div>
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
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  decoding="async"
                  loading="lazy"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black ${t.bgAccentSoft} ${t.textAccent} ${user?.photoURL ? 'hidden' : ''}`}>
                {(user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/4 border-black/8'}`}>
                <input
                  type="text"
                  value={commentInput[post.id] || ''}
                  onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendComment(post); }}
                  placeholder="Tulis komentar..."
                  className={`flex-1 text-xs bg-transparent outline-none ${isDark ? 'text-white placeholder-white/30' : 'text-black placeholder-black/30'}`}
                />
                <button
                  onClick={() => handleSendComment(post)}
                  disabled={!commentInput[post.id]?.trim()}
                  className={`p-1.5 rounded-xl ${commentInput[post.id]?.trim() ? `${t.bgAccent} text-white` : `${t.textMuted} opacity-40`} transition-all`}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen pb-32">
        {/* Search Bar */}
        <div className="p-4 relative z-20" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 24px))' }}>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${t.inputBg} border ${t.border}`}>
            <Search size={18} className={t.textMuted} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari atlet atau teman..."
              className={`flex-1 bg-transparent text-sm ${t.textMain} outline-none placeholder:${t.textMuted}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={t.textMuted}>
                <X size={16} />
              </button>
            )}
          </div>
          {/* Search Dropdown */}
          {searchQuery && (
            <div className={`mt-2 p-2 rounded-2xl ${t.bgCard} border ${t.border} shadow-xl max-h-60 overflow-y-auto space-y-1 animate-in fade-in slide-in-from-top-2 duration-200`}>
              {isSearching ? (
                <div className="p-4 text-center text-xs font-bold text-muted flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-accent" /> Mencari atlet...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs font-bold text-muted">
                  Atlet tidak ditemukan.
                </div>
              ) : (
                searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setViewingProfile({ userId: u.id, userName: u.name, userPhoto: u.photoUrl });
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-3 p-2 rounded-xl hover:${t.bgAccentSoft} cursor-pointer transition-colors`}
                  >
                    {u.photoUrl ? (
                      <img
                        src={u.photoUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        decoding="async"
                        loading="lazy"
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.classList.remove('hidden');
                          }
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full ${t.bgAccentSoft} ${t.textAccent} flex items-center justify-center font-bold text-xs ${u.photoUrl ? 'hidden' : ''}`}>
                      {(u.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${t.textMain} truncate`}>{u.name}</div>
                      <div className={`text-[10px] ${t.textMuted}`}>Level {u.level || 1} • {u.totalWorkouts || 0} Sesi</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Leaderboard Podium Mini */}
        <div className="px-4 pb-4 relative z-10">
          <div className={`p-4 rounded-3xl ${isDark ? 'bg-gradient-to-b from-blue-950/20 to-slate-900/30' : 'bg-gradient-to-b from-blue-50/50 to-white'} border ${isDark ? 'border-blue-500/10' : 'border-blue-100'} shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-yellow-500" />
                <span className={`text-xs font-black uppercase tracking-wider ${t.textMain}`}>Top Atlet Minggu Ini</span>
              </div>
              <span className={`text-[10px] font-bold ${t.textMuted}`}>Reset Senin</span>
            </div>
            <div 
              className="flex items-center gap-3 overflow-x-auto hide-scrollbar pt-2 pb-1 no-swipe"
              onTouchStart={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
              style={{ touchAction: 'pan-x pan-y' }}
            >
              {leaderboard.length === 0 ? (
                <div className={`text-xs font-bold ${t.textMuted} py-4 text-center w-full`}>Memuat papan peringkat...</div>
              ) : (
                leaderboard.slice(0, 10).map((lbUser, idx) => (
                  <button
                    key={lbUser.id || idx}
                    onClick={() => setViewingProfile({ userId: lbUser.id, userName: lbUser.name, userPhoto: lbUser.photoUrl })}
                    className="flex flex-col items-center shrink-0 group focus:outline-none"
                  >
                    <div className="relative">
                      {lbUser.photoUrl ? (
                        <img
                          src={lbUser.photoUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          decoding="async"
                          loading="lazy"
                          className={`w-[72px] h-[72px] rounded-[24px] object-cover border-[3px] ${idx === 0 ? 'border-yellow-400' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-amber-600' : 'border-blue-400'} shadow-md`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-[72px] h-[72px] rounded-[24px] bg-blue-50 text-blue-500 flex items-center justify-center font-black text-3xl border-[3px] ${idx === 0 ? 'border-yellow-400' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-amber-600' : 'border-blue-400'} shadow-md ${lbUser.photoUrl ? 'hidden' : ''}`}>
                        {(lbUser.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600 text-amber-50' : 'bg-blue-500 text-white'} rounded-full flex items-center justify-center text-[11px] font-black border-2 ${isDark ? 'border-slate-900' : 'border-white'} shadow-sm`}>
                        #{idx + 1}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold max-w-[68px] truncate mt-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {lbUser.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="px-4 pt-2 relative z-10">
          {isLoading ? (
            <div className={`flex flex-col items-center justify-center py-20 ${t.textAccent} opacity-60`}>
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-bold text-sm">Memuat feed komunitas...</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-6">
              {feed.length === 0 ? (
                <p className={`text-center py-10 ${t.textMuted} text-sm font-bold`}>
                  {activeFilter === 'Diikuti' ? 'Ikuti seseorang untuk melihat postingan mereka.' : 'Belum ada postingan di komunitas.'}
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

      {selectedImages && selectedImages.urls && (
        <ImageModal images={selectedImages.urls} initialIndex={selectedImages.index} onClose={() => setSelectedImages(null)} />
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 touch-none overscroll-contain">
          <div className={`w-full sm:max-w-xl ${isDark ? 'bg-slate-900/90 backdrop-blur-2xl border border-white/10' : 'bg-white/95 backdrop-blur-2xl border border-black/10'} rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom-10 overscroll-contain`}>
            
            {/* Header */}
            <div className="p-5 flex items-center justify-between shrink-0 border-b border-white/5">
              <button 
                type="button"
                data-close-modal="true"
                onClick={() => { if (!isSavingEdit) setEditingPost(null); }} 
                className={`p-2.5 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'} transition-colors`}
              >
                <X size={22} />
              </button>
              <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-black'}`}>
                Edit Postingan
              </h3>
              <button 
                onClick={handleEditSave}
                disabled={isSavingEdit}
                className={`px-5 py-2.5 rounded-2xl font-black text-sm ${t?.bgAccent || 'bg-blue-500 text-white'} shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-1.5`}
              >
                {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Simpan</>}
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 overscroll-contain">

              {/* Attached Program Preview Card with Red X to Remove */}
              {editingPost.type === 'template' && editingPost.programData && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-sky-400">Lampiran Program</span>
                  <ProgramCard 
                    post={editingPost} 
                    isDark={isDark} 
                    t={t || {}} 
                    onRemove={() => {
                      setEditingPost(prev => ({
                        ...prev,
                        type: 'user_post',
                        programData: null,
                        programName: null,
                        exercises: null,
                        routines: null,
                        planName: null,
                        restTime: null
                      }));
                    }}
                  />
                </div>
              )}

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={editingPost.text || ''}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setEditingPost(prev => ({ ...prev, text: e.target.value }));
                    }
                  }}
                  placeholder="Tulis caption atau cerita postinganmu..."
                  className={`w-full min-h-[120px] p-3 rounded-2xl resize-none outline-none text-base border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/40' : 'bg-black/5 border-black/10 text-black placeholder-black/40'}`}
                />
                <div className={`text-right text-[11px] font-bold mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  {(editingPost.text || '').length}/500
                </div>
              </div>

              {/* Photos Grid & Add Photos */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                    Foto ({(editingPost.imageUrls?.length || 0) + (editingPost.newFiles?.length || 0)}/10)
                  </span>
                  {((editingPost.imageUrls?.length || 0) + (editingPost.newFiles?.length || 0)) < 10 && (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                        isDark ? 'bg-white/10 border-white/15 text-sky-400 hover:bg-white/15' : 'bg-black/5 border-black/10 text-sky-600 hover:bg-black/10'
                      }`}
                    >
                      <ImagePlus size={14} /> Tambah Foto
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const validFiles = files.filter(f => f.type.startsWith('image/'));
                    const currentTotal = (editingPost.imageUrls?.length || 0) + (editingPost.newFiles?.length || 0);
                    const toAdd = validFiles.slice(0, 10 - currentTotal);
                    setEditingPost(prev => ({
                      ...prev,
                      newFiles: [...(prev.newFiles || []), ...toAdd]
                    }));
                    e.target.value = '';
                  }}
                  multiple
                  accept="image/*"
                  className="hidden"
                />

                {/* Photos list */}
                {((editingPost.imageUrls?.length || 0) + (editingPost.newFiles?.length || 0)) > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {/* Existing URLs */}
                    {(editingPost.imageUrls || []).map((url, i) => (
                      <div key={`url-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                        <img src={url} alt={`photo-${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingPost(prev => ({
                            ...prev,
                            imageUrls: prev.imageUrls.filter((_, idx) => idx !== i)
                          }))}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-90"
                          title="Hapus Foto"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}

                    {/* Newly added File previews */}
                    {(editingPost.newFiles || []).map((file, i) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={`file-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-sky-500/40 group">
                          <img src={previewUrl} alt={`new-${i}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-sky-500/80 text-[8px] font-black text-white uppercase">
                            Baru
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingPost(prev => ({
                              ...prev,
                              newFiles: prev.newFiles.filter((_, idx) => idx !== i)
                            }))}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-90"
                            title="Hapus Foto"
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {isCreatingPost && (
        <CreatePostModal
          user={user}
          theme={theme}
          t={t}
          postDataOverrides={createPostOverrides}
          onClose={(shouldRefresh, newPostId) => {
            setIsCreatingPost(false);
            setCreatePostOverrides({});
            if (shouldRefresh) {
              loadData().then(() => {
                // Scroll ke postingan yang baru dibuat, biar user yakin udah kekirim
                if (newPostId) setTimeout(() => scrollToPost(newPostId), 300);
              });
            }
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
          leaderboardScore={leaderboard.find(u => u.id === viewingProfile.userId)?.score}
          onClose={() => setViewingProfile(null)}
          onNavigateToPost={(postId) => {
            setViewingProfile(null);
            scrollToPost(postId);
          }}
          onEditPersonalClick={onEditOwnProfile ? () => {
            setViewingProfile(null);
            onEditOwnProfile();
          } : undefined}
        />
      )}

      {/* In-app dialog */}
      {dialog}
    </div>
  );
};

export default CommunityTab;
