import React, { useRef, useEffect, useState, useMemo } from 'react';

const ScrollPicker = ({ 
  value, 
  onChange, 
  onLiveChange, 
  onLiveEnd, 
  min = 0, 
  max = 200, 
  step = 1, 
  width = 'w-16', 
  height = 120, 
  theme = 'light', 
  t 
}) => {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const isScrollingRef = useRef(false);
  const activeIndexRef = useRef(-1);
  const activeOptRef = useRef(value);
  const scrollTimeout = useRef(null);
  const lastScrollEndAt = useRef(0);
  const pointerDownPos = useRef(null);

  const onChangeRef = useRef(onChange);
  const onLiveChangeRef = useRef(onLiveChange);
  const onLiveEndRef = useRef(onLiveEnd);
  onChangeRef.current = onChange;
  onLiveChangeRef.current = onLiveChange;
  onLiveEndRef.current = onLiveEnd;

  // Ketik manual — dipencet (tanpa geser) akan membuka input teks biasa,
  // sama seperti SwipeInput di tempat lain.
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const editInputRef = useRef(null);

  const borderClass = t?.borderAccent || 'border-[#3b82f6]';
  const bgSoftClass = t?.bgAccentSoft || 'bg-[#3b82f6]/20';
  const textAccentClass = t?.textAccent || (theme === 'dark' ? 'text-[#9db8d6]' : 'text-[#41759b]');
  const textMutedClass = t?.textMuted || (theme === 'dark' ? 'text-slate-400' : 'text-slate-600');

  // Update visual item aktif langsung di DOM (0 React re-render saat roda digulir cepat).
  const setActiveDomIndex = (nextIdx) => {
    const prevIdx = activeIndexRef.current;
    if (prevIdx === nextIdx) return;
    const prevEl = itemRefs.current[prevIdx];
    const nextEl = itemRefs.current[nextIdx];
    const baseItemCls = 'h-[40px] flex items-center justify-center snap-center font-bold text-lg select-none';
    if (prevEl) prevEl.className = `${baseItemCls} opacity-20 ${textMutedClass}`;
    if (nextEl) nextEl.className = `${baseItemCls} opacity-100 ${textAccentClass}`;
    activeIndexRef.current = nextIdx;
  };

  // Memoize options agar tidak alokasi array baru di tiap render
  const options = useMemo(() => {
    const opts = [];
    const validMin = Number(min) || 0;
    const validMax = Number(max) || 200;
    const validStep = Number(step) || 1;
    for (let i = validMin; i <= validMax; i += validStep) {
      opts.push(Number(i.toFixed(1)));
    }
    return opts;
  }, [min, max, step]);

  // Bersihkan timer pending saat unmount / pindah latihan agar tidak menembak nilai basi
  useEffect(() => () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
  }, []);

  // Handle initial / external scroll position secara stabil tanpa interupsi gestur
  useEffect(() => {
    if (!containerRef.current || isScrollingRef.current || isEditing) return;
    let index = options.indexOf(value);
    
    if (index === -1) {
      let minDiff = Infinity;
      options.forEach((opt, idx) => {
        const diff = Math.abs(opt - value);
        if (diff < minDiff) {
          minDiff = diff;
          index = idx;
        }
      });
    }

    if (index !== -1) {
      const targetScroll = index * 40;
      if (Math.abs(containerRef.current.scrollTop - targetScroll) > 2) {
        containerRef.current.scrollTop = targetScroll;
      }
      activeOptRef.current = options[index];
      setActiveDomIndex(index);
    }
  }, [value, options, isEditing, textAccentClass, textMutedClass]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleScroll = (e) => {
    isScrollingRef.current = true;
    
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / 40);
    
    if (index >= 0 && index < options.length) {
      const currentOpt = options[index];
      setActiveDomIndex(index);
      if (currentOpt !== activeOptRef.current) {
        activeOptRef.current = currentOpt;
        if (onLiveChangeRef.current) onLiveChangeRef.current(currentOpt);
      }
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      isScrollingRef.current = false;
      lastScrollEndAt.current = Date.now();

      if (index >= 0 && index < options.length) {
        const newValue = options[index];
        if (newValue !== value) {
          onChangeRef.current(newValue);
        }
      }
      if (onLiveEndRef.current) onLiveEndRef.current();
    }, 100); // Debounce scroll end lebih sigap tanpa menahan momentum native
  };

  const handlePointerDown = (e) => {
    const point = e.touches ? e.touches[0] : e;
    pointerDownPos.current = { x: point.clientX, y: point.clientY };
  };

  const handleTap = (e) => {
    // Bedakan tap murni dari geser: kalau baru saja scroll (atau masih scrolling), abaikan.
    if (isScrollingRef.current || Date.now() - lastScrollEndAt.current < 250) return;
    const point = e.changedTouches ? e.changedTouches[0] : e;
    if (pointerDownPos.current) {
      const dx = Math.abs(point.clientX - pointerDownPos.current.x);
      const dy = Math.abs(point.clientY - pointerDownPos.current.y);
      if (dx > 6 || dy > 6) return; // ini geser, bukan tap
    }
    setDraftValue(String(activeOptRef.current ?? value ?? ''));
    activeIndexRef.current = -1;
    setIsEditing(true);
  };

  const commitEdit = () => {
    setIsEditing(false);
    const parsed = parseFloat(String(draftValue).replace(',', '.'));
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      const snapped = Math.round(clamped / step) * step;
      onChangeRef.current(Number(snapped.toFixed(2)));
    }
  };

  const paddingHeight = Math.max(0, (height - 40) / 2);

  if (isEditing) {
    return (
      <div className={`relative ${width} ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-xl flex items-center justify-center`} style={{ height: `${height}px` }}>
        <input
          ref={editInputRef}
          type="text"
          inputMode="decimal"
          value={draftValue}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const clean = e.target.value.replace(/^0+(?=\d)/, '');
            setDraftValue(clean);
          }}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          className={`w-full text-center font-black text-2xl bg-transparent outline-none ${textAccentClass}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${width} ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-xl overflow-hidden shadow-inner select-none`}
      style={{ height: `${height}px` }}
    >
      {/* Active selection overlay */}
      <div className={`absolute top-1/2 left-0 w-full h-[40px] -translate-y-1/2 border-y-2 pointer-events-none z-10 ${bgSoftClass} ${borderClass}`} />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseUp={handleTap}
        onTouchEnd={handleTap}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar relative z-20 overscroll-contain"
        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', willChange: 'scroll-position', contain: 'layout style' }}
      >
        {/* Padding items to allow snapping to first and last */}
        <div style={{ height: `${paddingHeight}px` }} className="snap-center shrink-0"></div>

        {options.map((opt, idx) => (
          <div
            key={opt}
            ref={(el) => { itemRefs.current[idx] = el; }}
            style={{ contain: 'strict', height: '40px' }}
            className={`h-[40px] flex items-center justify-center snap-center font-bold text-lg select-none ${
              opt === activeOptRef.current ? `opacity-100 ${textAccentClass}` : `opacity-20 ${textMutedClass}`
            }`}
          >
            {opt}
          </div>
        ))}

        <div style={{ height: `${paddingHeight}px` }} className="snap-center shrink-0"></div>
      </div>
    </div>
  );
};

export default React.memo(ScrollPicker);
