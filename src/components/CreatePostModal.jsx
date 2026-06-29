import React, { useState, useRef } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '../utils/cloudinary';
import { createCommunityPost } from '../utils/communityApi';
import { containsBadWords } from '../utils/moderationApi';
import ProgramCard from './ProgramCard';
import useDialog from '../hooks/useDialog';

export default function CreatePostModal({ user, onClose, theme, t, initialFiles = [], postDataOverrides = {} }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isDark = theme === 'dark';
  const { dialog, showAlert } = useDialog(isDark);
  const isTemplate = postDataOverrides.type === 'template';
  const isRepost = postDataOverrides.type === 'repost';
  const programData = postDataOverrides.programData || {};
  const exercises = programData.exercises || [];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/')).slice(0, 5 - images.length);
    setImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const MAX_CHARS = 500;
  const canPost = (isTemplate || isRepost || text.trim() || images.length > 0) && text.length <= MAX_CHARS;
  const charsLeft = MAX_CHARS - text.length;
  const isNearLimit = charsLeft <= 50;
  const isOverLimit = charsLeft < 0;

  const handleSubmit = async () => {
    if (!canPost) return;

    if (containsBadWords(text)) {
      await showAlert('Pesan mengandung kata-kata yang tidak pantas atau melanggar standar komunitas.', { type: 'error', title: 'Peringatan' });
      return;
    }

    setIsUploading(true);
    
    try {
      const imageUrls = [];
      for (const file of images) {
        const url = await uploadToCloudinary(file);
        if (url) imageUrls.push(url);
      }

      await createCommunityPost(
        user?.uid,
        user?.name || user?.email?.split('@')[0],
        user?.photoURL,
        { text, imageUrls, ...postDataOverrides }
      );
      
      onClose(true);
    } catch (err) {
      console.error(err);
      await showAlert('Gagal memposting. Silakan coba lagi.', { type: 'error', title: 'Gagal' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className={`w-full sm:max-w-md ${isDark ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-10`}>
        
        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/10'} shrink-0`}>
          <button onClick={() => onClose()} className={`p-2 rounded-full ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}>
            <X size={20} />
          </button>
          <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-black'}`}>
            {isTemplate ? 'Bagikan Program' : (isRepost ? 'Bagikan Ulang' : 'Buat Postingan')}
          </h3>
          <button 
            onClick={handleSubmit}
            disabled={isUploading || !canPost}
            className={`px-4 py-1.5 rounded-full font-bold text-sm ${t?.bgAccent || 'bg-[#41759b] text-white'} disabled:opacity-50`}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {/* Program Preview Card */}
          {isTemplate && (
            <ProgramCard post={postDataOverrides} isDark={isDark} t={{}} />
          )}

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => { if (e.target.value.length <= MAX_CHARS + 10) setText(e.target.value); }}
              placeholder={isTemplate
                ? 'Tambahkan deskripsi, tips, atau cerita tentang program ini...'
                : 'Bagikan progress atau tips latihanmu hari ini...'}
              className={`w-full min-h-[100px] resize-none outline-none text-base bg-transparent ${isDark ? 'text-white placeholder-white/40' : 'text-black placeholder-black/40'}`}
            />
            {(isNearLimit || text.length > 0) && (
              <div className={`text-right text-xs font-bold mt-1 ${
                isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : (isDark ? 'text-white/30' : 'text-black/30')
              }`}>
                {isOverLimit ? `-${Math.abs(charsLeft)}` : charsLeft}
              </div>
            )}
          </div>
          
          {/* Repost Preview */}
          {isRepost && (
            <div className={`mt-3 p-3 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-slate-50'} opacity-80 pointer-events-none mb-3`}>
              <div className="flex items-center gap-2 mb-2">
                {postDataOverrides.originalUserPhoto ? (
                  <img src={postDataOverrides.originalUserPhoto} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                    {postDataOverrides.originalUserName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-black">{postDataOverrides.originalUserName}</span>
              </div>
              <p className="text-xs line-clamp-2 leading-relaxed">{postDataOverrides.originalText || (postDataOverrides.originalType === 'template' ? 'Program Latihan' : (postDataOverrides.originalType === 'achievement' ? 'Lencana Terbuka' : 'Sesi Latihan'))}</p>
            </div>
          )}

          {/* Selected Images Preview */}
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar snap-x">
              {images.map((file, i) => (
                <div key={i} className="relative w-28 h-36 shrink-0 snap-center rounded-xl overflow-hidden bg-black/5 border border-black/5">
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-rose-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {(!isTemplate && !isRepost) && (
          <div className={`p-3 border-t ${isDark ? 'border-white/10 bg-slate-900' : 'border-black/10 bg-white'} rounded-b-3xl flex items-center shrink-0`}>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 5}
              className={`p-2 rounded-xl flex items-center gap-2 font-bold text-sm disabled:opacity-50 ${t?.textAccent || 'text-[#41759b]'} ${t?.bgAccentSoft || 'bg-[#41759b]/10'} hover:opacity-80`}
            >
              <ImagePlus size={20} />
              <span>Tambah Foto ({images.length}/5)</span>
            </button>
          </div>
        )}

        {dialog}
      </div>
    </div>
  );
}
