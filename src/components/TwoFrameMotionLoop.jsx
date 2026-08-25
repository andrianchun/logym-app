import React, { useState, useEffect, useMemo } from 'react';

/**
 * TwoFrameMotionLoop
 * Komponen lini ketiga untuk backup visual: memutar animasi looping 2 frame (0.jpg <-> 1.jpg)
 * dari Free Exercise DB GitHub untuk menampilkan gerak repetisi latihan jika video MP4
 * atau YouTube belum tersedia.
 */
export default function TwoFrameMotionLoop({ exerciseId, gifUrl, name, className = '', intervalMs = 850 }) {
  const [frame, setFrame] = useState(0);
  const [hasError, setHasError] = useState(false);

  const frames = useMemo(() => {
    let f0 = '';
    let f1 = '';

    if (exerciseId) {
      f0 = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exerciseId}/0.jpg`;
      f1 = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exerciseId}/1.jpg`;
    } else if (gifUrl && typeof gifUrl === 'string') {
      if (gifUrl.includes('/0.jpg')) {
        f0 = gifUrl;
        f1 = gifUrl.replace('/0.jpg', '/1.jpg');
      } else if (gifUrl.includes('/1.jpg')) {
        f0 = gifUrl.replace('/1.jpg', '/0.jpg');
        f1 = gifUrl;
      }
    }

    if (f0 && f1) return [f0, f1];
    return null;
  }, [exerciseId, gifUrl]);

  useEffect(() => {
    if (!frames || frames.length < 2) return;
    const timer = setInterval(() => {
      setFrame(prev => (prev === 0 ? 1 : 0));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [frames, intervalMs]);

  if (!frames || hasError) return null;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center select-none ${className}`}>
      {/* Background glow / ambient backdrop */}
      <img
        src={frames[frame]}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-25 blur-2xl scale-125 pointer-events-none transition-opacity duration-300"
      />

      {/* Frame 0 & Frame 1 with crossfade */}
      <img
        src={frames[0]}
        alt={name || 'Exercise Form A'}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl transition-opacity duration-150 ${frame === 0 ? 'opacity-100' : 'opacity-0'}`}
      />
      <img
        src={frames[1]}
        alt={name || 'Exercise Form B'}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl transition-opacity duration-150 ${frame === 1 ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Frame indicator badge */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-wider text-white/80 z-20 pointer-events-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>Loop {frame === 0 ? 'Posisi A' : 'Posisi B'}</span>
      </div>
    </div>
  );
}
