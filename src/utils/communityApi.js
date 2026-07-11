import { db } from '../firebase';
import {
  collection, addDoc, getDocs, getDoc, query, orderBy, limit,
  serverTimestamp, doc, setDoc, updateDoc, deleteDoc,
  increment, where, writeBatch, arrayUnion, arrayRemove
} from 'firebase/firestore';

// ─── Community User Registration ────────────────────────────────────────────
export const registerToCommunity = async (userId, userProfile) => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'community_users', userId);
    await setDoc(userRef, {
      name: userProfile.name || 'Lyfit User',
      photoUrl: userProfile.photoUrl || '',
      totalWorkouts: userProfile.totalWorkouts || 0,
      totalVolume: userProfile.totalVolume || 0,
      badges: userProfile.badges || [],
      lastActive: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Gagal update profil komunitas:", err);
  }
};

// ─── Leaderboard Engine (Weekly Atomic Increments) ─────────────────────────
export const getCurrentWeekId = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}_W${weekNo}`;
};

export const updateLeaderboardScore = async (userId, userName, userPhoto, scoreChange) => {
  if (!userId) return;
  try {
    const weekId = getCurrentWeekId();
    const lbRef = doc(db, 'leaderboards', weekId);
    // PENTING: setDoc (walau dengan merge) TIDAK menafsirkan titik sebagai nested path —
    // key "scores.uid.score" akan jadi nama field literal. Gunakan objek nested agar
    // merge:true melakukan deep-merge dan getWeeklyLeaderboard bisa membaca data.scores.
    await setDoc(lbRef, {
      scores: {
        [userId]: {
          score: increment(scoreChange),
          name: userName || 'Pengguna',
          photoUrl: userPhoto || null,
        }
      }
    }, { merge: true });
  } catch(e) { console.error("Update LB Error:", e); }
};

export const getWeeklyLeaderboard = async () => {
  try {
    const weekId = getCurrentWeekId();
    const lbRef = doc(db, 'leaderboards', weekId);
    const snap = await getDoc(lbRef);
    if(!snap.exists()) return [];
    const data = snap.data();
    if(!data || !data.scores) return [];
    
    const arr = Object.entries(data.scores).map(([id, val]) => ({
      id,
      name: val.name,
      photoUrl: val.photoUrl,
      score: val.score || 0
    }));
    return arr.sort((a,b) => b.score - a.score).slice(0, 10);
  } catch(e) {
    console.error("Fetch LB Error:", e);
    return [];
  }
};

// ─── Share Workout to Feed ────────────────────────────────────────────────────
export const shareWorkoutToFeed = async (userId, userName, userPhoto, workoutData) => {
  try {
    await addDoc(collection(db, 'community_posts'), {
      userId,
      userName: userName || 'Anonim',
      userPhoto: userPhoto || null,
      type: 'workout_log',
      workoutName: workoutData.programName || 'Sesi Latihan',
      duration: workoutData.duration || '00:00',
      totalVolume: workoutData.totalVolume || 0,
      imageUrl: workoutData.imageUrl || null,
      timestamp: serverTimestamp(),
      likes: 0,
      likedBy: [],
      commentCount: 0,
    });
    // Add +1 Leaderboard Score for posting a workout
    await updateLeaderboardScore(userId, userName, userPhoto, 1);
  } catch (err) {
    console.error("Gagal share ke feed:", err);
  }
};

// ─── Create Community Post ────────────────────────────────────────────────────
export const createCommunityPost = async (userId, userName, userPhoto, postData) => {
  try {
    await addDoc(collection(db, 'community_posts'), {
      userId,
      userName: userName || 'Anonim',
      userPhoto: userPhoto || null,
      type: postData.type || 'user_post',
      text: postData.text || '',
      imageUrls: postData.imageUrls || [],
      programName: postData.programName || (postData.programData?.name) || null,
      duration: postData.duration || null,
      totalVolume: postData.totalVolume || null,
      exercises: postData.programData?.exercises || null,
      routines: postData.programData?.routines || null,
      planName: postData.programData?.planName || null,
      restTime: postData.programData?.restTime || null,
      programData: postData.programData || null,
      originalPostId: postData.originalPostId || null,
      originalUserId: postData.originalUserId || null,
      originalUserName: postData.originalUserName || 'Anonim',
      originalUserPhoto: postData.originalUserPhoto || null,
      originalText: postData.originalText || '',
      originalImageUrls: postData.originalImageUrls || [],
      originalType: postData.originalType || null,
      timestamp: serverTimestamp(),
      likes: 0,
      likedBy: [],
      commentCount: 0,
    });
    if (postData.type === 'repost' && postData.originalUserId && postData.originalUserId !== userId) {
      await sendNotification(postData.originalUserId, { type: 'repost', fromUserId: userId, fromUserName: userName, fromUserPhoto: userPhoto, postId: postData.originalPostId });
    }
  } catch (err) {
    console.error("Gagal membuat postingan:", err);
    throw err;
  }
};

// ─── Update Post ──────────────────────────────────────────────────────────────
export const updatePost = async (postId, { text, imageUrls }) => {
  try {
    const ref = doc(db, 'community_posts', postId);
    await updateDoc(ref, { text, imageUrls });
  } catch (err) {
    console.error("Gagal update post:", err);
    throw err;
  }
};

// ─── Delete Post ──────────────────────────────────────────────────────────────
export const deletePost = async (postId) => {
  try {
    await deleteDoc(doc(db, 'community_posts', postId));
  } catch (err) {
    console.error("Gagal hapus post:", err);
    throw err;
  }
};

// ─── Toggle Like ──────────────────────────────────────────────────────────────
export const toggleLike = async (postId, userId, postOwnerId, fromUserName = null, fromUserPhoto = null) => {
  const postRef = doc(db, 'community_posts', postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) return;
  const liked = (snap.data().likedBy || []).includes(userId);
  const postOwnerName = snap.data().userName;
  const postOwnerPhoto = snap.data().userPhoto;

  if (liked) {
    await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(userId) });
    if (postOwnerId && postOwnerId !== userId) {
      await updateLeaderboardScore(postOwnerId, postOwnerName, postOwnerPhoto, -1);
    }
  } else {
    await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(userId) });
    if (postOwnerId && postOwnerId !== userId) {
      await sendNotification(postOwnerId, { type: 'like', fromUserId: userId, fromUserName, fromUserPhoto, postId });
      await updateLeaderboardScore(postOwnerId, postOwnerName, postOwnerPhoto, 1);
    }
  }
  return !liked;
};

// --- Repost -------------------------------------------------------------------
export const repostPost = async (userId, userName, userPhoto, originalPost, caption = '') => {
  try {
    await addDoc(collection(db, 'community_posts'), {
      userId,
      userName: userName || 'Anonim',
      userPhoto: userPhoto || null,
      type: 'repost',
      originalPostId: originalPost.id,
      originalUserId: originalPost.userId || null,
      originalUserName: originalPost.userName || 'Anonim',
      originalUserPhoto: originalPost.userPhoto || null,
      originalText: originalPost.text || '',
      originalImageUrls: originalPost.imageUrls || [],
      originalType: originalPost.type || null,
      text: caption,
      timestamp: serverTimestamp(),
      likes: 0,
      likedBy: [],
      commentCount: 0,
    });
    if (originalPost.userId !== userId) {
      await sendNotification(originalPost.userId, { type: 'repost', fromUserId: userId, fromUserName: userName, fromUserPhoto: userPhoto, postId: originalPost.id });
    }
  } catch (err) {
    console.error("Gagal repost:", err);
    throw err;
  }
};

// --- Comments -----------------------------------------------------------------
export const addComment = async (postId, { userId, userName, userPhoto, text }, postOwnerId) => {
  try {
    const ref = collection(db, 'community_posts', postId, 'comments');
    await addDoc(ref, { userId, userName: userName || 'Anonim', userPhoto: userPhoto || null, text, timestamp: serverTimestamp() });
    await updateDoc(doc(db, 'community_posts', postId), { commentCount: increment(1) });
    if (postOwnerId && postOwnerId !== userId) {
      await sendNotification(postOwnerId, { type: 'comment', fromUserId: userId, fromUserName: userName, fromUserPhoto: userPhoto, postId });
    }
  } catch (err) {
    console.error("Gagal tambah komentar:", err);
    throw err;
  }
};

export const getComments = async (postId) => {
  try {
    const q = query(collection(db, 'community_posts', postId, 'comments'), orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Gagal fetch komentar:", err);
    return [];
  }
};

// ─── Feed ─────────────────────────────────────────────────────────────────────
export const getGlobalFeed = async (limitCount = 30) => {
  try {
    const q = query(collection(db, 'community_posts'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Gagal fetch feed:", err);
    return [];
  }
};

export const getUserPosts = async (userId, limitCount = 30) => {
  try {
    // Query ideal — butuh composite index (userId ASC, timestamp DESC), lihat firestore.indexes.json
    const q = query(collection(db, 'community_posts'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Fallback saat index belum di-deploy: tanpa orderBy hasilnya berdasarkan urutan ID,
    // jadi ambil lebih banyak lalu sort di client agar 30 teratas benar-benar terbaru.
    try {
      const q = query(collection(db, 'community_posts'), where('userId', '==', userId), limit(200));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0))
        .slice(0, limitCount);
    } catch (err2) {
      console.error("Gagal fetch user posts:", err2);
      return [];
    }
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const sendNotification = async (toUserId, { type, fromUserId, fromUserName = null, fromUserPhoto = null, postId = null }) => {
  if (!toUserId || !fromUserId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      toUserId, type, fromUserId, fromUserName, fromUserPhoto, postId, read: false, createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Gagal kirim notifikasi:", err);
  }
};

export const getNotifications = async (userId, limitCount = 30) => {
  try {
    // Query ideal — butuh composite index (toUserId ASC, createdAt DESC), lihat firestore.indexes.json
    const q = query(collection(db, 'notifications'), where('toUserId', '==', userId), orderBy('createdAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Fallback saat index belum di-deploy: ambil lebih banyak lalu sort di client
    try {
      const q = query(collection(db, 'notifications'), where('toUserId', '==', userId), limit(200));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, limitCount);
    } catch (err2) {
      console.error("Gagal fetch notifikasi:", err2);
      return [];
    }
  }
};

export const markNotificationsRead = async (userId) => {
  try {
    const q = query(collection(db, 'notifications'), where('toUserId', '==', userId), where('read', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (err) {
    console.error("Gagal mark notifikasi:", err);
  }
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export const getLeaderboard = async (limitCount = 50) => {
  try {
    const q = query(collection(db, 'community_users'), orderBy('totalWorkouts', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Gagal fetch leaderboard:", err);
    return [];
  }
};

export const shareTemplate = async (userId, userName, program) => {
  try {
    const docRef = await addDoc(collection(db, 'community_posts'), {
      type: 'template', userId, userName: userName || 'Coach Raiga',
      programName: program.name || 'My Custom Program',
      planName: program.planName || 'Custom Plan',
      exercises: program.exercises || [],
      restTime: program.restTime || 90,
      downloads: 0, likes: 0, likedBy: [], commentCount: 0,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("Gagal share template:", err);
    throw err;
  }
};

export const shareAchievementToFeed = async (userId, userName, userPhoto, achievement) => {
  try {
    const docRef = await addDoc(collection(db, 'community_posts'), {
      type: 'achievement', userId, userName: userName || 'Anonim',
      userPhoto: userPhoto || null,
      achievementId: achievement.id, achievementTitle: achievement.title,
      likes: 0, likedBy: [], commentCount: 0,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("Gagal share achievement:", err);
    return null;
  }
};

export const getSharedTemplates = async (limitCount = 20) => {
  try {
    const q = query(collection(db, 'community_posts'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Gagal fetch templates:", err);
    return [];
  }
};


// ─── Update User Profile in Feed ──────────────────────────────────────────────

// ─── Update User Profile in Feed ──────────────────────────────────────────────
export const updateUserProfileInFeed = async (userId, newName, newPhoto) => {
  if (!userId) return;
  try {
    // 1. Update community_users (Use set with merge because document might not exist)
    const userRef = doc(db, 'community_users', userId);
    const userUpdate = {};
    if (newName !== undefined) userUpdate.name = newName;
    if (newPhoto !== undefined) userUpdate.photoUrl = newPhoto;
    if (Object.keys(userUpdate).length > 0) {
      await setDoc(userRef, userUpdate, { merge: true });
    }

    // 2. Update all posts in community_posts — WriteBatch maksimal 500 operasi, pecah per 450
    const postsQuery = query(collection(db, 'community_posts'), where('userId', '==', userId));
    const snap = await getDocs(postsQuery);

    const postUpdate = {};
    if (newName !== undefined) postUpdate.userName = newName;
    if (newPhoto !== undefined) postUpdate.userPhoto = newPhoto;

    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 450).forEach((d) => batch.update(d.ref, postUpdate));
      await batch.commit();
    }
  } catch (err) {
    console.error('Gagal update user profile in feed:', err);
  }
};



