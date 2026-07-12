import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserMinus, UserPlus, ShieldOff, Shield, Loader2, Users } from 'lucide-react';
import {
  getFollowerList, getFollowingList,
  followUser, unfollowUser,
  blockUser, unblockUser, isBlocked, getFollowingIds
} from '../utils/followApi';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import UserProfileModal from './UserProfileModal';

export default function FollowListModal({ currentUser, type, isDark, t, onClose, onEditOwnProfile = null }) {
  const [list, setList] = useState([]);        // [{uid, name, photo}]
  const [isLoading, setIsLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState(new Set()); // UIDs I follow
  const [blockedSet, setBlockedSet] = useState(new Set());     // UIDs I blocked
  const [actionLoading, setActionLoading] = useState(null);    // uid being acted on
  const [selectedUser, setSelectedUser] = useState(null);      // user to show profile for

  const title = type === 'followers' ? 'Followers' : 'Following';

  useEffect(() => {
    if (!currentUser?.uid) return;
    const load = async () => {
      setIsLoading(true);
      try {
        // Load my following & blocked sets FIRST
        const [myFollowing, myBlocked] = await Promise.all([
          getFollowingIds(currentUser.uid),
          (async () => {
            const snap = await getDocs(query(collection(db, 'blocks'), where('blockerId', '==', currentUser.uid)));
            return snap.docs.map(d => d.data().blockedId);
          })()
        ]);

        // Load list
        const rawList = type === 'followers'
          ? await getFollowerList(currentUser.uid)
          : await getFollowingList(currentUser.uid);

        // Extract UIDs, combining with blocked users to keep them in the list
        const allUids = Array.from(new Set([...rawList.map(r => r.uid), ...myBlocked]));

        // Batch fetch user profiles for names/photos
        let profiles = {};
        if (allUids.length > 0) {
          // Firestore 'in' limited to 30; chunk if needed
          const chunks = [];
          for (let i = 0; i < allUids.length; i += 30) chunks.push(allUids.slice(i, i + 30));
          for (const chunk of chunks) {
            const [uSnap, cSnap] = await Promise.all([
              getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))),
              getDocs(query(collection(db, 'community_users'), where(documentId(), 'in', chunk)))
            ]);
            uSnap.docs.forEach(d => { profiles[d.id] = { ...profiles[d.id], ...d.data() }; });
            cSnap.docs.forEach(d => { profiles[d.id] = { ...profiles[d.id], ...d.data() }; });
          }
        }

        const enriched = allUids.map(uid => {
          const r = rawList.find(x => x.uid === uid) || {};
          return {
            uid,
            name: profiles[uid]?.name || r.followerName || r.followingName || 'Sobat LOGYM',
            photo: profiles[uid]?.photoURL || profiles[uid]?.photoUrl || r.followerPhoto || r.followingPhoto || null,
          };
        });
        
        setList(enriched);
        setFollowingSet(new Set(myFollowing));
        setBlockedSet(new Set(myBlocked));
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    load();
  }, [currentUser?.uid, type]);

  const handleFollow = async (uid) => {
    setActionLoading(uid + '_follow');
    try {
      await followUser(currentUser.uid, uid, currentUser.name, currentUser.photoURL);
      setFollowingSet(prev => new Set([...prev, uid]));
    } catch(e) {}
    setActionLoading(null);
  };

  const handleUnfollow = async (uid) => {
    setActionLoading(uid + '_follow');
    try {
      await unfollowUser(currentUser.uid, uid);
      setFollowingSet(prev => { const s = new Set(prev); s.delete(uid); return s; });
      // If viewing following list, remove from list too
      if (type === 'following') setList(prev => prev.filter(u => u.uid !== uid));
    } catch(e) {}
    setActionLoading(null);
  };

  const handleBlock = async (uid) => {
    setActionLoading(uid + '_block');
    try {
      await blockUser(currentUser.uid, uid);
      setBlockedSet(prev => new Set([...prev, uid]));
      setFollowingSet(prev => { const s = new Set(prev); s.delete(uid); return s; });
      // Don't remove from list — move to blocked section below
    } catch(e) {}
    setActionLoading(null);
  };

  const handleUnblock = async (uid) => {
    setActionLoading(uid + '_block');
    try {
      await unblockUser(currentUser.uid, uid);
      setBlockedSet(prev => { const s = new Set(prev); s.delete(uid); return s; });
    } catch(e) {}
    setActionLoading(null);
  };

  const renderRow = (u) => {
    const iAmFollowing = followingSet.has(u.uid);
    const iBlocked = blockedSet.has(u.uid);
    const isActingFollow = actionLoading === u.uid + '_follow';
    const isActingBlock = actionLoading === u.uid + '_block';

    return (
      <div key={u.uid} className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-black/5'} ${iBlocked ? 'opacity-60' : ''}`}>
        
        {/* Clickable Profile Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group" onClick={() => setSelectedUser(u)}>
          {/* Avatar */}
          {u.photo ? (
            <img src={u.photo} alt={u.name} className="w-10 h-10 rounded-full object-cover shrink-0 group-hover:opacity-80 transition-opacity" />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 group-hover:opacity-80 transition-opacity ${t?.bgAccentSoft || 'bg-[#3b82f6]/10'} ${t?.textAccent || 'text-[#3b82f6]'}`}>
              {(u.name || '?').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name */}
          <p className={`font-bold text-sm truncate group-hover:underline ${isDark ? 'text-white' : 'text-black'}`}>{u.name}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Follow / Unfollow */}
          {!iBlocked && (
            <button
              onClick={() => iAmFollowing ? handleUnfollow(u.uid) : handleFollow(u.uid)}
              disabled={!!isActingFollow}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${
                iAmFollowing
                  ? (isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black')
                  : (t?.bgAccent || 'bg-[#3b82f6] text-white')
              }`}
            >
              {isActingFollow ? <Loader2 size={12} className="animate-spin" /> : (
                iAmFollowing
                  ? <><UserMinus size={12}/> Unfollow</>
                  : <><UserPlus size={12}/> Follow</>
              )}
            </button>
          )}

          {/* Block / Unblock */}
          <button
            onClick={() => iBlocked ? handleUnblock(u.uid) : handleBlock(u.uid)}
            disabled={!!isActingBlock}
            title={iBlocked ? 'Unblock' : 'Block'}
            className={`p-1.5 rounded-full transition-all disabled:opacity-50 ${
              iBlocked
                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                : (isDark ? 'bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-500' : 'bg-black/5 text-black/30 hover:bg-red-500/10 hover:text-red-500')
            }`}
          >
            {isActingBlock ? <Loader2 size={14} className="animate-spin" /> : (
              iBlocked ? <ShieldOff size={14}/> : <Shield size={14}/>
            )}
          </button>
        </div>
      </div>
    );
  };

  const modal = (
    <div
      className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm ${isDark ? 'bg-slate-900' : 'bg-white'} rounded-3xl flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3.5 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/8'} shrink-0`}>
          <h3 className={`font-black text-base ${isDark ? 'text-white' : 'text-black'}`}>{title}</h3>
          <button onClick={onClose} className={`p-1.5 rounded-full ${isDark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/50'}`}>
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className={`animate-spin ${isDark ? 'text-white/30' : 'text-black/30'}`} />
            </div>
          ) : list.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
              <Users size={36} className="opacity-30" />
              <p className="text-sm font-bold">Belum ada {title.toLowerCase()}</p>
            </div>
          ) : (
            <>
              {/* Active (non-blocked) users */}
              {list.filter(u => !blockedSet.has(u.uid)).map(u => renderRow(u))}

              {/* Blocked section */}
              {list.some(u => blockedSet.has(u.uid)) && (
                <>
                  <div className={`px-4 py-2 flex items-center gap-2 border-t ${isDark ? 'border-white/10' : 'border-black/8'} mt-1`}>
                    <Shield size={12} className="text-amber-500" />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-black/30'}`}>Diblokir</span>
                  </div>
                  {list.filter(u => blockedSet.has(u.uid)).map(u => renderRow(u))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Profile Modal on top of this modal */}
      {selectedUser && (
        <UserProfileModal
          profileUserId={selectedUser.uid}
          profileUserName={selectedUser.name}
          profileUserPhoto={selectedUser.photo}
          currentUser={currentUser}
          isDark={isDark}
          t={t}
          onClose={() => setSelectedUser(null)}
          onEditPersonalClick={onEditOwnProfile ? () => {
            setSelectedUser(null);
            onEditOwnProfile();
          } : undefined}
        />
      )}
    </div>
  );

  return createPortal(modal, document.body);
}
