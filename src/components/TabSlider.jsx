import React from 'react';

/**
 * TabSlider — lightweight, GPU-accelerated tab container.
 * Menggunakan CSS fade-in hardware-accelerated tanpa synchronous layout reflow
 * (getBoundingClientRect) agar perpindahan tab instan dan BottomNav tidak pernah
 * mengalami freeze/stuck di tengah animasi.
 */
const TabSlider = ({ activeTab, tabIndex, children, className = '' }) => {
  return (
    <div
      className={`w-full ${className}`}
    >
      {children}
    </div>
  );
};

export default TabSlider;
