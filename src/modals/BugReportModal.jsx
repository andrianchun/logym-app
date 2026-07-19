import React, { useState, useRef } from 'react';
import { X, Camera, Loader2, Send, Image as ImageIcon } from 'lucide-react';
import { uploadImageToFirebase } from '../utils/storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import useDialog from '../hooks/useDialog';

export default function BugReportModal({ showModal, setShowModal, user }) {
    const [description, setDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fileInputRef = useRef(null);
    const { showAlert } = useDialog();

    if (!showModal) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showAlert("Ukuran maksimal file adalah 5MB.", { type: 'error' });
            return;
        }

        if (!file.type.startsWith('image/')) {
            showAlert("File harus berupa gambar.", { type: 'error' });
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            showAlert("Harap isi deskripsi bug/masalah.", { type: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl = null;
            if (selectedFile) {
                const path = `bug_reports/${user?.uid || 'guest'}/${Date.now()}_${selectedFile.name}`;
                imageUrl = await uploadImageToFirebase(selectedFile, path);
            }

            await addDoc(collection(db, 'bug_reports'), {
                uid: user?.uid || 'anonymous',
                email: user?.email || 'unknown',
                description: description.trim(),
                imageUrl: imageUrl,
                timestamp: serverTimestamp(),
                status: 'open',
                deviceInfo: navigator.userAgent
            });

            await showAlert("Laporan bug berhasil dikirim! Terima kasih atas bantuan Anda.", { type: 'success' });
            
            // Reset & close
            setDescription('');
            setSelectedFile(null);
            setPreviewUrl(null);
            setShowModal(false);
        } catch (error) {
            console.error("Gagal mengirim laporan bug:", error);
            showAlert("Gagal mengirim laporan bug. Silakan coba lagi.", { type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-black/90 sm:bg-black/60 sm:items-center sm:justify-center animate-in fade-in duration-200">
            <div className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-neutral-900 sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md relative z-10">
                    <h2 className="text-xl font-black text-white tracking-tight">Laporkan Bug</h2>
                    <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-neutral-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 relative z-10">
                    <p className="text-sm text-neutral-400">
                        Menemukan error, tampilan yang aneh, atau fitur yang tidak berfungsi? 
                        Laporkan kepada kami agar Logym menjadi lebih baik!
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-300">Deskripsi Masalah</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ceritakan detail masalahnya, dan apa yang sedang Anda lakukan saat masalah terjadi..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500/50 resize-none min-h-[120px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-300 flex justify-between items-center">
                            <span>Screenshot <span className="text-neutral-500 font-normal">(Opsional)</span></span>
                            {selectedFile && (
                                <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="text-rose-400 text-xs hover:underline">
                                    Hapus
                                </button>
                            )}
                        </label>
                        
                        {!previewUrl ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-neutral-300 hover:border-white/30 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <ImageIcon size={24} className="mb-2" />
                                <span className="text-xs font-medium">Klik untuk upload gambar</span>
                                <span className="text-[10px] opacity-70 mt-1">Maks. 5MB</span>
                            </div>
                        ) : (
                            <div className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-black/50 group">
                                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain" />
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 text-white font-medium bg-black/60 px-4 py-2 rounded-full">
                                        <Camera size={16} /> Ganti Gambar
                                    </div>
                                </div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0 relative z-10">
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !description.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={18} className="animate-spin" /> Mengirim...</>
                        ) : (
                            <><Send size={18} /> Kirim Laporan</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
