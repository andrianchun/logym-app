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

  // Preload both images immediately to prevent decode lag
  useEffect(() => {
    if (!frames || frames.length < 2) return;
    const img0 = new Image();
    img0.src = frames[0];
    const img1 = new Image();
    img1.src = frames[1];
  }, [frames]);

  useEffect(() => {
    if (!frames || frames.length < 2) return;
    const timer = setInterval(() => {
      setFrame(prev => (prev === 0 ? 1 : 0));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [frames, intervalMs]);

  if (!frames || hasError) return null;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#0a0f1d] flex items-center justify-center select-none ${className}`}>
      {/* Background glow / ambient backdrop (steady, no flashing) */}
      <img
        src={frames[0]}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-125 pointer-events-none"
      />

      {/* Frame 0 always rendered solid underneath */}
      <img
        src={frames[0]}
        alt={name || 'Exercise Form A'}
        onError={() => setHasError(true)}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl z-0"
      />

      {/* Frame 1 rendered directly on top, instantly toggled (zero black flickering) */}
      <img
        src={frames[1]}
        alt={name || 'Exercise Form B'}
        onError={() => setHasError(true)}
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl z-10 ${frame === 1 ? 'visible opacity-100' : 'invisible opacity-0'}`}
      />
    </div>
  );
}
