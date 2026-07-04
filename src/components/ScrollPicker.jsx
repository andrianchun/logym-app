import React, { useRef, useEffect, useState } from 'react';

const ScrollPicker = ({ value, onChange, min = 0, max = 200, step = 1, width = 'w-16', theme = 'light' }) => {
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);

  // Generate options based on min, max, step
  const options = [];
  for (let i = min; i <= max; i += step) {
    options.push(Number(i.toFixed(1))); // Handle float step
  }

  // Handle initial scroll position
  useEffect(() => {
    if (!containerRef.current || isScrolling) return;
    const index = options.indexOf(value);
    if (index !== -1) {
      containerRef.current.scrollTop = index * 40; // 40px is the height of one item
    }
  }, [value, options, isScrolling]);

  const handleScroll = (e) => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
      const scrollTop = e.target.scrollTop;
      const index = Math.round(scrollTop / 40);
      
      if (index >= 0 && index < options.length) {
        const newValue = options[index];
        if (newValue !== value) {
          onChange(newValue);
        }
      }
    }, 150); // Debounce scroll end
  };

  return (
    <div 
      className={`relative h-[120px] ${width} ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-xl overflow-hidden shadow-inner`}
      style={{ touchAction: 'pan-y', scrollSnapType: 'y mandatory' }}
    >
      {/* Active selection overlay */}
      <div className={`absolute top-1/2 left-0 w-full h-[40px] -translate-y-1/2 border-y-2 pointer-events-none z-10 ${theme === 'dark' ? 'bg-[#3b82f6]/20 border-[#3b82f6]' : 'bg-[#B79347]/20 border-[#B79347]'}`} />
      
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar relative z-20"
        style={{ scrollBehavior: isScrolling ? 'auto' : 'smooth' }}
      >
        {/* Padding items to allow snapping to first and last */}
        <div className="h-[40px] snap-center"></div>
        
        {options.map((opt) => (
          <div 
            key={opt}
            className={`h-[40px] flex items-center justify-center snap-center font-bold text-lg transition-opacity ${
              opt === value ? (theme === 'dark' ? 'opacity-100 text-[#9db8d6]' : 'opacity-100 text-[#81571E]') : (theme === 'dark' ? 'opacity-20 text-slate-400' : 'opacity-20 text-slate-600')
            }`}
          >
            {opt}
          </div>
        ))}

        <div className="h-[40px] snap-center"></div>
      </div>
    </div>
  );
};

export default ScrollPicker;
