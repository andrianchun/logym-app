import React, { useState, useEffect } from 'react';
import SharedProfileView from './SharedProfileView';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

export default function UserProfileModal({ profileUserId, profileUserName, profileUserPhoto, currentUser, isDark, t, leaderboardRank, leaderboardScore, onClose, onNavigateToPost, onEditPersonalClick }) {
  const [userProfileData, setUserProfileData] = useState(null);
  // Bisa saja profil yang dibuka di sini adalah diri sendiri (mis. dari hasil search,
  // leaderboard, daftar follower, atau share link ?u= milik sendiri) — kalau begitu,
  // tombol aksinya harus jadi "Edit", bukan "Follow" (gak masuk akal follow diri sendiri).
  const isOwnProfile = !!currentUser?.uid && currentUser.uid === profileUserId;

  useEffect(() => {
    if (!profileUserId) return;
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, 'community_users', profileUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfileData(userSnap.data());
        }
      } catch (err) {
        console.error("Error fetching user profile data:", err);
      }
    };
    fetchProfile();
  }, [profileUserId]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 p-0 sm:p-4 pb-0" onClick={onClose}>
      <div className={`w-full sm:max-w-md h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 flex flex-col relative ${isDark ? 'bg-slate-900' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors shadow-lg">
          <X size={20} />
        </button>
        <SharedProfileView
          profileUserId={profileUserId}
          profileUserName={profileUserName}
          profileUserPhoto={profileUserPhoto}
          currentUser={currentUser}
          isOwnProfile={isOwnProfile}
          isDark={isDark}
          t={t}
          userProfileData={userProfileData}
          onClose={onClose}
          onEditPersonalClick={isOwnProfile ? onEditPersonalClick : undefined}
          onPostClick={(postId) => {
            onClose();
            if (onNavigateToPost) onNavigateToPost(postId);
          }}
        />
      </div>
    </div>
  );
}
