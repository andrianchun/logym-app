import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage.
 * 
 * @param {File|Blob} file - The file to upload.
 * @param {string} path - The exact path in Firebase Storage (e.g. 'lyfit_users/123/profile/pic_456')
 * @returns {Promise<string>} The download URL of the uploaded file.
 */
export const uploadImageToFirebase = async (file, path) => {
    try {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
    } catch (error) {
        console.error("Firebase Storage upload error:", error);
        throw new Error(error.message || "Gagal mengunggah gambar ke Firebase Storage");
    }
};
