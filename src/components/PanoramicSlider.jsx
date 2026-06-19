import React, { useRef, useEffect, useState } from 'react';

const PanoramicSlider = ({ onSwipeLeft, onSwipeRight, renderPanel, swipeThreshold = 0.5, onUpSwipe, onDownSwipe }) => {
  const scrollRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const isResetting = useRef(false);

  // Vertical swipe detection
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const distanceY = touchStartY.current - touchEndY;
    const distanceX = touchStartX.current - touchEndX;

    if (Math.abs(distanceY) > 40 && Math.abs(distanceY) > Math.abs(distanceX)) {
      if (distanceY > 0 && onUpSwipe) onUpSwipe();
      if (distanceY < 0 && onDownSwipe) onDownSwipe();
    }
  };

  useEffect(() => {
    if (scrollRef.current && !isReady) {
      scrollRef.current.scrollLeft = scrollRef.current.clientWidth;
      setIsReady(true);
    }
  }, [isReady]);

  // Handle window resize to keep it centered
  useEffect(() => {
    const handleResize = () => {
      if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.clientWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = (e) => {
    if (!isReady || isResetting.current) return;
    const el = e.currentTarget;
    const cw = el.clientWidth;
    if (cw === 0) return;

    if (el.scrollLeft <= cw * (1 - swipeThreshold)) {
      isResetting.current = true;
      onSwipeRight(); // Swiped right, go to previous
      requestAnimationFrame(() => {
          if (scrollRef.current) {
             scrollRef.current.style.scrollBehavior = 'auto';
             scrollRef.current.scrollLeft = cw;
          }
          setTimeout(() => { isResetting.current = false; }, 50);
      });
    } else if (el.scrollLeft >= cw * (1 + swipeThreshold)) {
      isResetting.current = true;
      onSwipeLeft(); // Swiped left, go to next
      requestAnimationFrame(() => {
          if (scrollRef.current) {
             scrollRef.current.style.scrollBehavior = 'auto';
             scrollRef.current.scrollLeft = cw;
          }
          setTimeout(() => { isResetting.current = false; }, 50);
      });
    }
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full ${isReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
      style={{ scrollBehavior: 'auto', touchAction: 'pan-x pan-y' }}
    >
      <div className="w-full shrink-0 snap-center flex flex-col justify-start">
        {renderPanel('prev')}
      </div>
      <div className="w-full shrink-0 snap-center flex flex-col justify-start">
        {renderPanel('curr')}
      </div>
      <div className="w-full shrink-0 snap-center flex flex-col justify-start">
        {renderPanel('next')}
      </div>
    </div>
  );
};

export default PanoramicSlider;
