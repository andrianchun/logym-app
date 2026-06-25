import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const PanoramicSlider = forwardRef(({ onSwipeLeft, onSwipeRight, renderPanel, swipeThreshold = 0.25, onUpSwipe, onDownSwipe, className = '' }, ref) => {
  const containerRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const isHorizontalDrag = useRef(false);
  const lastTouchTime = useRef(0);

  useImperativeHandle(ref, () => ({
    slideLeft: () => {
      if (isAnimating) return;
      setIsAnimating(true);
      const cw = containerRef.current?.clientWidth || window.innerWidth;
      setOffsetX(-cw);
      setTimeout(() => {
        if(onSwipeLeft) onSwipeLeft();
        setIsDragging(true);
        setOffsetX(0);
        setTimeout(() => { setIsDragging(false); setIsAnimating(false); }, 50);
      }, 300);
    },
    slideRight: () => {
      if (isAnimating) return;
      setIsAnimating(true);
      const cw = containerRef.current?.clientWidth || window.innerWidth;
      setOffsetX(cw);
      setTimeout(() => {
        if(onSwipeRight) onSwipeRight();
        setIsDragging(true);
        setOffsetX(0);
        setTimeout(() => { setIsDragging(false); setIsAnimating(false); }, 50);
      }, 300);
    }
  }));

  const handleTouchStart = (e) => {
    if (isAnimating) return; // Block touches while snapping
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    lastTouchTime.current = Date.now();
    setIsDragging(true);
    isHorizontalDrag.current = null; // null means undetermined
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isAnimating) return;
    
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const distanceY = touchStartY.current - currentY;
    const distanceX = touchStartX.current - currentX;

    // Determine swipe direction on first move
    if (isHorizontalDrag.current === null) {
      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        isHorizontalDrag.current = true;
      } else {
        isHorizontalDrag.current = false;
      }
    }

    if (!isHorizontalDrag.current) {
      // It's a vertical scroll, let browser handle it normally
      return; 
    }

    // It's a horizontal scroll, prevent default to stop page scrolling
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Add resistance at the edges if we wanted, but we have infinite loop so no edges
    setOffsetX(-distanceX);
  };

  const handleTouchEnd = (e) => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);
    
    if (touchStartY.current === null || touchStartX.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const distanceY = touchStartY.current - touchEndY;
    const distanceX = touchStartX.current - touchEndX;
    const timeElapsed = Date.now() - lastTouchTime.current;

    // Handle vertical swipe detection (for changing calendar mode)
    if (isHorizontalDrag.current === false) {
      if (Math.abs(distanceY) > 40) {
        if (distanceY > 0 && onUpSwipe) onUpSwipe();
        if (distanceY < 0 && onDownSwipe) onDownSwipe();
      }
      setOffsetX(0);
      return;
    }

    const cw = containerRef.current?.clientWidth || window.innerWidth;
    const threshold = cw * swipeThreshold;
    const isFastSwipe = timeElapsed < 300 && Math.abs(distanceX) > 30;

    setIsAnimating(true);

    if (distanceX > threshold || (isFastSwipe && distanceX > 0)) {
      // Swiped Left -> go to Next
      setOffsetX(-cw);
      setTimeout(() => {
        onSwipeLeft();
        // Instantly reset position without animation
        setIsDragging(true); // Temporarily trick the style to disable transition
        setOffsetX(0);
        setTimeout(() => {
           setIsDragging(false);
           setIsAnimating(false);
        }, 50);
      }, 300); // Wait for CSS transition (0.3s)
    } else if (distanceX < -threshold || (isFastSwipe && distanceX < 0)) {
      // Swiped Right -> go to Prev
      setOffsetX(cw);
      setTimeout(() => {
        onSwipeRight();
        setIsDragging(true);
        setOffsetX(0);
        setTimeout(() => {
           setIsDragging(false);
           setIsAnimating(false);
        }, 50);
      }, 300);
    } else {
      // Snap back to center (didn't pass threshold)
      setOffsetX(0);
      setTimeout(() => {
         setIsAnimating(false);
      }, 300);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full overflow-hidden relative touch-pan-y ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div 
        className="w-full relative"
        style={{ 
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' 
        }}
      >
        <div className="w-full absolute top-0 -left-full flex flex-col justify-start">
          {renderPanel('prev')}
        </div>
        <div className="w-full relative flex flex-col justify-start">
          {renderPanel('curr')}
        </div>
        <div className="w-full absolute top-0 left-full flex flex-col justify-start">
          {renderPanel('next')}
        </div>
      </div>
    </div>
  );
});

export default PanoramicSlider;
