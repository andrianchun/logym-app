import React, { useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * PanoramicSlider — horizontal swipe carousel with smooth vertical scroll coexistence.
 *
 * Perbaikan utama vs versi lama:
 * - Semua drag state pakai ref, BUKAN useState → tidak ada re-render selama drag berlangsung
 *   sehingga posisi tidak pernah tiba-tiba reset di tengah gesture.
 * - Transform ditulis langsung ke DOM node (trackRef.current.style.transform) via rAF,
 *   sama seperti AuthPage — ini jauh lebih smooth daripada setState → render → CSS.
 * - Direction lock dilakukan setelah 6px movement, setelah itu arah terkunci hingga touchend.
 *   Tidak ada lagi kasus "nyangkut di tengah" karena arah yang ambigu.
 * - isAnimating pakai ref, bukan state, sehingga tidak bisa "tertinggal" karena batching render.
 * - touchAction='pan-y' di container → browser langsung tahu boleh scroll vertikal tanpa
 *   menunggu JS, tapi horizontal masih bisa dicegah via preventDefault setelah lock.
 */
const PanoramicSlider = forwardRef(({
  onSwipeLeft,
  onSwipeRight,
  renderPanel,
  swipeThreshold = 0.25,
  onUpSwipe,
  onDownSwipe,
  className = '',
  fillHeight = false,
}, ref) => {
  const containerRef = useRef(null);
  const trackRef    = useRef(null);   // div yang di-translate
  const animating   = useRef(false);  // true saat snap/swipe animation berjalan

  // Semua drag state dalam satu ref object — zero re-renders
  const drag = useRef({
    active:    false,
    startX:    0,
    startY:    0,
    startTime: 0,
    dir:       null,   // null = belum ditentukan, 'h' = horizontal, 'v' = vertical
    offsetX:   0,      // offset aktual saat ini
  });

  // ── Helper: set transform tanpa React re-render ──
  const setTransform = (x, withTransition) => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = withTransition
      ? 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none';
    trackRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
    drag.current.offsetX = x;
  };

  // ── Selesaikan swipe: animasi ke tepi, panggil callback, snap balik ke 0 ──
  const commitSwipe = (direction) => {
    animating.current = true;
    const cw = containerRef.current?.clientWidth || window.innerWidth;
    const target = direction === 'left' ? -cw : cw;

    setTransform(target, true);

    setTimeout(() => {
      // Nonaktifkan transisi dulu, reset ke 0, lalu panggil callback
      setTransform(0, false);
      if (direction === 'left') onSwipeLeft?.();
      else                      onSwipeRight?.();
      // Sedikit delay kecil sebelum buka kembali input baru
      setTimeout(() => { animating.current = false; }, 50);
    }, 280);
  };

  // ── Snap balik ke tengah ──
  const snapBack = () => {
    setTransform(0, true);
    // Beri waktu transisi selesai baru buka lagi
    setTimeout(() => { animating.current = false; }, 290);
  };

  // ── Touch Handlers ──
  const handleTouchStart = (e) => {
    if (animating.current) return;
    const t = e.touches[0];
    drag.current = {
      active:    true,
      startX:    t.clientX,
      startY:    t.clientY,
      startTime: Date.now(),
      dir:       null,
      offsetX:   0,
    };
    // Matikan transisi agar drag terasa instan
    setTransform(0, false);
  };

  const handleTouchMove = (e) => {
    const d = drag.current;
    if (!d.active || animating.current) return;

    const t  = e.touches[0];
    const dx = t.clientX - d.startX;
    const dy = t.clientY - d.startY;

    // Lock direction setelah 6px — sekali terkunci, tidak bisa berubah
    if (d.dir === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        d.dir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
      return; // tunggu lock dulu sebelum mulai gerak
    }

    if (d.dir === 'v') return; // biarkan browser scroll vertikal

    // Horizontal — cegah scroll browser
    if (e.cancelable) e.preventDefault();
    setTransform(dx, false);
  };

  const handleTouchEnd = (e) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;

    const t  = e.changedTouches[0];
    const dx = t.clientX - d.startX;
    const dy = t.clientY - d.startY;
    const dt = Date.now() - d.startTime;

    // Arah belum terkunci = tap biasa, tidak ada swipe
    if (d.dir === null) return;

    // Swipe vertikal
    if (d.dir === 'v') {
      if (Math.abs(dy) > 40) {
        if (dy < 0 && onUpSwipe)   onUpSwipe();
        if (dy > 0 && onDownSwipe) onDownSwipe();
      }
      return;
    }

    // Swipe horizontal — evaluasi threshold & kecepatan
    const cw       = containerRef.current?.clientWidth || window.innerWidth;
    const absDx    = Math.abs(dx);
    const isFast   = dt < 280 && absDx > 25;
    const isPast   = absDx > cw * swipeThreshold;

    if (isPast || isFast) {
      commitSwipe(dx < 0 ? 'left' : 'right');
    } else {
      snapBack();
    }
  };

  // ── Expose imperative API (untuk swipe programatik dari kalender) ──
  useImperativeHandle(ref, () => ({
    slideLeft:  () => commitSwipe('left'),
    slideRight: () => commitSwipe('right'),
  }));

  const hClass = fillHeight ? 'h-full' : '';

  return (
    <div
      ref={containerRef}
      className={`w-full relative ${hClass} ${className}`}
      style={{
        overflow:    fillHeight ? 'hidden' : 'visible',
        touchAction: 'pan-y',    // browser handles vertical scroll natively
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Track — ini yang bergerak horizontal */}
      <div
        ref={trackRef}
        className={`w-full relative flex-1 ${hClass}`}
        style={{ willChange: 'transform' }}
      >
        {/* Panel kiri (prev) */}
        <div className={`w-full absolute top-0 -left-full flex flex-col min-h-full`}>
          {renderPanel('prev')}
        </div>
        {/* Panel tengah (curr) — ini yang terlihat */}
        <div className={`w-full relative flex flex-col min-h-full`}>
          {renderPanel('curr')}
        </div>
        {/* Panel kanan (next) */}
        <div className={`w-full absolute top-0 left-full flex flex-col min-h-full`}>
          {renderPanel('next')}
        </div>
      </div>
    </div>
  );
});

export default PanoramicSlider;
