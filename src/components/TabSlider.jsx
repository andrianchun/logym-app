import React, { useRef, useEffect } from 'react';

/**
 * TabSlider — animated tab container using direct DOM transforms.
 * Sama tekniknya dengan PanoramicSlider: translate3d ke DOM langsung,
 * tanpa React re-render loop, tanpa CSS class animation yang terasa "fade".
 * 
 * PENTING: willChange hanya aktif selama animasi berlangsung, lalu dimatikan.
 * Ini mencegah terbentuknya stacking context baru yang bisa merusak
 * posisi elemen fixed (seperti EmptyWorkoutState yang pakai fixed inset-0).
 */
const TabSlider = ({ activeTab, tabIndex, children, className = '' }) => {
  const wrapperRef = useRef(null);
  const prevIndexRef = useRef(tabIndex);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const prevIdx = prevIndexRef.current;
    const curIdx = tabIndex;

    if (prevIdx === curIdx) return;

    // Tentukan dari mana content masuk
    const fromRight = curIdx > prevIdx;
    const startX = fromRight ? '100%' : '-100%';

    // Aktifkan willChange HANYA saat animasi — mencegah stacking context permanen
    el.style.willChange = 'transform';

    // Set posisi awal TANPA transition (instant)
    el.style.transition = 'none';
    el.style.transform = `translate3d(${startX}, 0, 0)`;
    el.style.opacity = '0.7';

    // Force reflow supaya browser "melihat" posisi awal
    el.getBoundingClientRect();

    // Sekarang animate ke posisi normal
    el.style.transition = 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.18s ease';
    el.style.transform = 'translate3d(0, 0, 0)';
    el.style.opacity = '1';

    prevIndexRef.current = curIdx;

    // Matikan willChange setelah animasi selesai — restores normal stacking context
    const cleanup = setTimeout(() => {
      if (el) {
        el.style.willChange = 'auto';
        el.style.transition = '';
        el.style.transform = '';
      }
    }, 300);

    return () => clearTimeout(cleanup);
  }, [tabIndex]);

  return (
    <div
      ref={wrapperRef}
      className={`w-full ${className}`}
    >
      {children}
    </div>
  );
};

export default TabSlider;
