import { db } from '../firebase';
import { collection, addDoc, getDoc, getDocs, query, where, doc, updateDoc, setDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';

export const BAD_WORDS = [
    // INDONESIA
    'anjing', 'babi', 'monyet', 'bangsat', 'bajingan', 'kontol', 'memek', 'jembut',
    'ngentot', 'ngewe', 'perek', 'lonte', 'pelacur', 'jablay', 'tolol', 'goblok',
    'bego', 'dungu', 'idiot', 'peler', 'pepek', 'pantat', 'titit', 'tete', 'tetek',
    'payudara', 'silit', 'bokong', 'itil', 'toket', 'bgst', 'anjg', 'anj', 'ajg',
    'kntl', 'mmk', 'gblk', 'jancok', 'jancuk', 'cok', 'diancuk', 'ancur', 'asu',
    'kampret', 'keparat', 'ngehe', 'tai', 'taik', 'eek', 'berak', 'sialan', 'brengsek',
    'setan', 'iblis', 'peli', 'kentu', 'tempik', 'turuk', 'pukimak', 'kimak', 'pantek',
    // ENGLISH
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'motherfucker',
    'bastard', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag', 'cock', 'boobs',
    'tits', 'porn', 'sex', 'nude', 'naked', 'blowjob', 'handjob', 'cum'
];

/**
 * Checks if the text contains any inappropriate words.
 * Returns true if bad words are found, false otherwise.
 */
export const containsBadWords = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    
    // Split into words, removing punctuation
    const words = lowerText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").split(/\s+/);
    
    return words.some(word => BAD_WORDS.includes(word));
};

/**
 * Censors bad words in the text by replacing them with asterisks.
 */
export const censorBadWords = (text) => {
    if (!text) return text;
    let result = text;
    
    // Create a regex to match bad words exactly (word boundaries)
    BAD_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, '*'.repeat(word.length));
    });
    
    return result;
};

export const reportPost = async (postId, reporterId, reason) => {
    try {
        await addDoc(collection(db, 'community_reports'), {
            type: 'post', targetId: postId, reporterId, reason, timestamp: serverTimestamp()
        });
        const postRef = doc(db, 'community_posts', postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const currentReports = (postSnap.data().reportCount || 0) + 1;
            const updateData = { reportCount: increment(1) };
            if (currentReports >= 3) updateData.isHidden = true;
            await updateDoc(postRef, updateData);
        }
        const localHidden = JSON.parse(localStorage.getItem('lyfit_hidden_posts') || '[]');
        if (!localHidden.includes(postId)) {
            localHidden.push(postId);
            localStorage.setItem('lyfit_hidden_posts', JSON.stringify(localHidden));
        }
        return true;
    } catch (err) {
        console.error("Gagal melapor postingan:", err);
        return false;
    }
};

export const banUserGlobal = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            isBanned: true,
            hasBeenBanned: true,
            bannedAt: serverTimestamp()
        }, { merge: true });

        // Hide all posts from this user
        const q = query(collection(db, 'community_posts'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { isHidden: true });
        });
        await batch.commit();

        return true;
    } catch (error) {
        console.error('Gagal melakukan Global Ban:', error);
        return false;
    }
};

export const unbanUserGlobal = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            isBanned: false
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Gagal membuka Ban:', error);
        return false;
    }
};

export const getBannedUsers = async () => {
    try {
        const q = query(collection(db, 'users'), where('hasBeenBanned', '==', true));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('Gagal mengambil daftar banned:', error);
        return [];
    }
};

export const reportUser = async (targetUserId, reporterId, reason) => {
    try {
        await addDoc(collection(db, 'community_reports'), {
            type: 'user', targetId: targetUserId, reporterId, reason, timestamp: serverTimestamp()
        });
        const localBlocked = JSON.parse(localStorage.getItem('lyfit_blocked_users_local') || '[]');
        if (!localBlocked.includes(targetUserId)) {
            localBlocked.push(targetUserId);
            localStorage.setItem('lyfit_blocked_users_local', JSON.stringify(localBlocked));
        }
        return true;
    } catch (err) {
        console.error("Gagal melapor pengguna:", err);
        return false;
    }
};

export const getLocalHiddenPosts = () => {
    try { return JSON.parse(localStorage.getItem('lyfit_hidden_posts') || '[]'); } catch { return []; }
};

export const getLocalBlockedUsers = () => {
    try { return JSON.parse(localStorage.getItem('lyfit_blocked_users_local') || '[]'); } catch { return []; }
};
