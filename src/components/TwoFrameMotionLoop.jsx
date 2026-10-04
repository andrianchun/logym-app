import React, { useState, useEffect, useMemo } from 'react';

/**
 * TwoFrameMotionLoop
 * Komponen lini ketiga untuk backup visual: memutar animasi looping 2 frame (0.jpg <-> 1.jpg)
 * dari Free Exercise DB GitHub untuk menampilkan gerak repetisi latihan jika video MP4
 * atau YouTube belum tersedia.
 */
export default function TwoFrameMotionLoop({ exerciseId, gifUrl, name, fallbackUrl, className = '', intervalMs = 700 }) {
  const [frame, setFrame] = useState(0);
  const [frame0Error, setFrame0Error] = useState(false);
  const [frame1Error, setFrame1Error] = useState(false);

  const frames = useMemo(() => {
    let slug = null;

    // 1. Ekstrak slug dari gifUrl jika mengarah ke yuhonas free-exercise-db
    if (gifUrl && typeof gifUrl === 'string') {
      const match = gifUrl.match(/exercises\/([^/]+)\/[01]\.jpg/);
      if (match) slug = match[1];
    }

    // 2. Jika belum ketemu, periksa exerciseId (buang prefix edb- dan abaikan jika murni angka lokal)
    if (!slug && exerciseId) {
      const clean = String(exerciseId).replace(/^edb-/, '').trim();
      if (clean && !clean.match(/^\d+$/)) {
        slug = clean;
      }
    }

    // 3. Jika belum ketemu, periksa fallbackUrl
    if (!slug && fallbackUrl && typeof fallbackUrl === 'string') {
      const match = fallbackUrl.match(/exercises\/([^/]+)\/[01]\.jpg/);
      if (match) slug = match[1];
    }

    if (slug) {
      return [
        `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/0.jpg`,
        `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/1.jpg`
      ];
    }

    // 4. Fallback jika gifUrl berupa custom URL dengan /0.jpg atau /1.jpg
    if (gifUrl && typeof gifUrl === 'string') {
      if (gifUrl.includes('/0.jpg')) {
        return [gifUrl, gifUrl.replace('/0.jpg', '/1.jpg')];
      }
      if (gifUrl.includes('/1.jpg')) {
        return [gifUrl.replace('/1.jpg', '/0.jpg'), gifUrl];
      }
    }

    return null;
  }, [exerciseId, gifUrl, fallbackUrl]);

  // Preload both images immediately to prevent decode lag
  useEffect(() => {
    if (!frames || frames.length < 2) return;
    setFrame0Error(false);
    setFrame1Error(false);
    setFrame(0);
    const img0 = new Image();
    img0.src = frames[0];
    const img1 = new Image();
    img1.src = frames[1];
  }, [frames]);

  useEffect(() => {
    if (!frames || frames.length < 2 || frame1Error) return;
    const timer = setInterval(() => {
      setFrame(prev => (prev === 0 ? 1 : 0));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [frames, intervalMs, frame1Error]);

  if (!frames || frame0Error) {
    if (fallbackUrl) {
      return (
        <div className={`relative w-full h-full flex items-center justify-center bg-black ${className}`}>
          <img src={fallbackUrl} alt={name || ''} className="w-full h-full object-contain" />
        </div>
      );
    }
    return null;
  }

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
        onError={() => setFrame0Error(true)}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl z-0"
      />

      {/* Frame 1 rendered directly on top, instantly toggled (zero black flickering) */}
      {!frame1Error && (
        <img
          src={frames[1]}
          alt={name || 'Exercise Form B'}
          onError={() => setFrame1Error(true)}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-2xl z-10 ${frame === 1 ? 'visible opacity-100' : 'invisible opacity-0'}`}
        />
      )}
    </div>
  );
}
