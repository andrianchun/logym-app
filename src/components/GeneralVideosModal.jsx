import React, { useState, useEffect } from 'react';
import { X, Plus, Play, Flame, Snowflake, AlertTriangle } from 'lucide-react';
import { getVideoId } from '../data/constants';
import { playSoundEffect } from '../utils/audio';

const parseVideoList = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str.filter(Boolean);
  return String(str)
    .split(/(?:\r\n|\r|\n|\s)+/)
    .map(s => s.trim())
    .filter(Boolean);
};

const GeneralVideosModal = ({
  isOpen,
  onClose,
  warmupVideos = '',
  setWarmupVideos,
  cooldownVideos = '',
  setCooldownVideos,
  t,
  lang,
  soundEnabled,
  setConfirmModal
}) => {
  const [activeTab, setActiveTab] = useState('warmup'); // 'warmup' | 'cooldown'
  const [warmupList, setWarmupList] = useState(() => parseVideoList(warmupVideos));
  const [cooldownList, setCooldownList] = useState(() => parseVideoList(cooldownVideos));
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const wList = parseVideoList(warmupVideos);
      const cList = parseVideoList(cooldownVideos);
      setWarmupList(wList);
      setCooldownList(cList);
      setSelectedVideoUrl(wList[0] || cList[0] || '');
      setIsAutoPlay(false);
      setItemToDelete(null);
      setHasSaved(false);
    }
  }, [isOpen, warmupVideos, cooldownVideos]);

  if (!isOpen) return null;

  const currentList = activeTab === 'warmup' ? warmupList : cooldownList;
  const setCurrentList = activeTab === 'warmup' ? setWarmupList : setCooldownList;

  const handleUpdateItem = (index, value) => {
    const updated = [...currentList];
    updated[index] = value;
    setCurrentList(updated);
  };

  const handleAddItem = () => {
    playSoundEffect('click', soundEnabled);
    setCurrentList([...currentList, '']);
  };

  const executeRemoveItem = (index) => {
    playSoundEffect('click', soundEnabled);
    const removedUrl = currentList[index];
    const updated = currentList.filter((_, i) => i !== index);
    setCurrentList(updated);
    if (selectedVideoUrl === removedUrl) {
      setSelectedVideoUrl(updated[0] || '');
      setIsAutoPlay(false);
    }
    setItemToDelete(null);
  };

  const handleRequestRemove = (index) => {
    playSoundEffect('click', soundEnabled);
    const itemUrl = currentList[index];
    if (!itemUrl || !itemUrl.trim()) {
      executeRemoveItem(index);
      return;
    }

    if (setConfirmModal) {
      setConfirmModal({
        isOpen: true,
        title: 'Hapus Video?',
        message: `Apakah Anda yakin ingin menghapus video poin #${index + 1}?`,
        onConfirm: () => {
          executeRemoveItem(index);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setItemToDelete(index);
    }
  };

  const handleSave = () => {
    playSoundEffect('click', soundEnabled);
    setWarmupVideos(warmupList.filter(Boolean).join('\n'));
    setCooldownVideos(cooldownList.filter(Boolean).join('\n'));
    setHasSaved(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const activeVideoId = getVideoId(selectedVideoUrl || currentList[0] || '');

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain touch-none no-swipe"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-2xl mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border ${t.border} animate-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${t.border} flex items-center justify-between shrink-0`}>
          <h2 className={`text-lg font-black ${t.textMain}`}>Video Instruksi Umum</h2>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-full ${t.btnBg} hover:opacity-80 transition-all`}
            data-close-modal="true"
          >
            <X size={18} className={t.textMain} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-4 sm:px-6 pb-2 flex gap-2">
          <button
            onClick={() => {
              setActiveTab('warmup');
              playSoundEffect('click', soundEnabled);
              setIsAutoPlay(false);
              if (warmupList.length > 0) setSelectedVideoUrl(warmupList[0]);
            }}
            className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'warmup'
                ? `${t.bgAccent} text-white shadow-md shadow-orange-500/20`
                : `${t.bgCard} border ${t.border} ${t.textMuted} hover:bg-black/5 dark:hover:bg-white/5`
            }`}
          >
            <Flame size={16} />
            <span>Pemanasan</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'warmup' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
              {warmupList.filter(Boolean).length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cooldown');
              playSoundEffect('click', soundEnabled);
              setIsAutoPlay(false);
              if (cooldownList.length > 0) setSelectedVideoUrl(cooldownList[0]);
            }}
            className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'cooldown'
                ? `${t.bgAccent} text-white shadow-md shadow-blue-500/20`
                : `${t.bgCard} border ${t.border} ${t.textMuted} hover:bg-black/5 dark:hover:bg-white/5`
            }`}
          >
            <Snowflake size={16} />
            <span>Pendinginan</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'cooldown' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
              {cooldownList.filter(Boolean).length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* Large Video Player Preview */}
          {activeVideoId ? (
            <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black aspect-video relative shadow-lg">
              <iframe
                key={`${activeVideoId}-${isAutoPlay ? 'autoplay' : 'normal'}`}
                src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?rel=0&modestbranding=1&enablejsapi=1${isAutoPlay ? '&autoplay=1' : ''}`}
                title="Preview Video Instruksi"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className={`rounded-2xl border-2 border-dashed ${t.border} p-6 text-center flex flex-col items-center justify-center gap-2 bg-black/[0.02] dark:bg-white/[0.02]`}>
              <Play size={28} className={`${t.textMuted} opacity-40`} />
              <p className={`text-xs font-bold ${t.textMuted}`}>Masukkan URL YouTube di bawah untuk melihat cuplikan layar besar.</p>
            </div>
          )}

          {/* List of Points */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black uppercase tracking-wider ${t.textMuted}`}>
                Video {activeTab === 'warmup' ? 'Pemanasan' : 'Pendinginan'}
              </span>
            </div>

            {currentList.length === 0 ? (
              <div className={`p-4 rounded-xl border ${t.border} text-center text-xs ${t.textMuted}`}>
                Belum ada video {activeTab === 'warmup' ? 'pemanasan' : 'pendinginan'}. Klik tombol tambah di bawah untuk menambahkan.
              </div>
            ) : (
              currentList.map((url, idx) => {
                const isSelected = selectedVideoUrl === url && url.trim().length > 0;
                const vId = getVideoId(url);
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      isSelected ? `border-2 ${t.borderAccentSoft} ${t.bgAccentSoft}` : `${t.border} ${t.bgCard}`
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? `${t.bgAccent} text-white` : 'bg-black/5 dark:bg-white/10 text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </div>

                      <input
                        type="url"
                        value={url}
                        onChange={(e) => handleUpdateItem(idx, e.target.value)}
                        placeholder="https://youtu.be/... atau https://www.youtube.com/watch?v=..."
                        className={`flex-1 min-w-0 px-3 py-2 rounded-xl ${t.inputBg} ${t.textMain} text-xs sm:text-sm outline-none focus:ring-2 ${t.ringAccent} transition-all`}
                      />

                      {vId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVideoUrl(url);
                            setIsAutoPlay(true);
                            playSoundEffect('click', soundEnabled);
                          }}
                          title="Putar Video Ini"
                          className={`p-2 rounded-xl transition-all shrink-0 flex items-center gap-1 ${
                            isSelected && isAutoPlay ? `${t.bgAccent} text-white animate-pulse` : (isSelected ? `${t.bgAccent} text-white` : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20')
                          }`}
                        >
                          <Play size={15} fill={isSelected && isAutoPlay ? 'currentColor' : 'none'} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRequestRemove(idx)}
                        title="Hapus Video"
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 active:scale-95 transition-all shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <button
              type="button"
              onClick={handleAddItem}
              className={`w-full py-3 border-2 border-dashed ${t.borderAccentSoft} rounded-2xl font-black text-xs ${t.textAccent} hover:${t.bgAccentSoft} active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mt-2`}
            >
              <Plus size={15} /> Tambah Video {activeTab === 'warmup' ? 'Pemanasan' : 'Pendinginan'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:p-6 border-t ${t.border} bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-end gap-3`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-3 rounded-2xl font-bold text-sm bg-black/5 dark:bg-white/5 border ${t.border} ${t.textMain} hover:bg-black/10 dark:hover:bg-white/10 transition-all`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-6 py-3 rounded-2xl font-black text-sm ${t.bgAccent} text-white hover:opacity-90 shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2`}
          >
            <span>{hasSaved ? 'Tersimpan!' : 'Simpan Pengaturan Video'}</span>
          </button>
        </div>

        {/* Internal Fallback Confirmation Dialog if setConfirmModal is not supplied */}
        {itemToDelete !== null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-sm ${t.bgCard} p-6 rounded-3xl border ${t.border} shadow-2xl space-y-4 animate-in zoom-in-95`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className={`font-black body-lg ${t.textMain}`}>Hapus Video?</h3>
                  <p className={`text-xs ${t.textMuted}`}>Yakin ingin menghapus poin #{itemToDelete + 1}?</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs bg-black/5 dark:bg-white/5 ${t.textMain}`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeRemoveItem(itemToDelete)}
                  className="px-4 py-2.5 rounded-xl font-black text-xs bg-rose-500 text-white shadow-md shadow-rose-500/20"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GeneralVideosModal;
