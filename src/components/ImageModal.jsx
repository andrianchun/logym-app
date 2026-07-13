import React, { useState, useRef, useEffect } from 'react';

export default function ImageModal({ images = [], initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, initialPinchDistance: null, startTouchX: 0 });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  if (!images || images.length === 0) return null;

  const getPinchDistance = (touches) => {
    if (touches.length < 2) return null;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      dragStartRef.current.initialPinchDistance = getPinchDistance(e.touches);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
        startTouchX: e.touches[0].clientX
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && dragStartRef.current.initialPinchDistance) {
      const currentDistance = getPinchDistance(e.touches);
      const delta = currentDistance - dragStartRef.current.initialPinchDistance;
      const newScale = Math.min(Math.max(1, scale + delta * 0.01), 4);
      setScale(newScale);
      
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      dragStartRef.current.initialPinchDistance = currentDistance;
      
    } else if (e.touches.length === 1 && isDragging) {
      if (scale > 1) {
        setPosition({
          x: e.touches[0].clientX - dragStartRef.current.x,
          y: e.touches[0].clientY - dragStartRef.current.y
        });
      } else if (images.length > 1) {
        let diffX = e.touches[0].clientX - dragStartRef.current.startTouchX;
        // Resistance at edges
        if ((currentIndex === 0 && diffX > 0) || (currentIndex === images.length - 1 && diffX < 0)) {
          diffX = diffX * 0.3;
        }
        setPosition({ x: diffX, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current.initialPinchDistance = null;
    
    if (scale === 1 && images.length > 1) {
      if (position.x > 80 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (position.x < -80 && currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.history.back();
  };

  const containerTransform = `translateX(calc(-${currentIndex * 100}vw + ${scale === 1 ? position.x : 0}px))`;

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-xl flex flex-col justify-center animate-in fade-in duration-300 overflow-hidden"
      onClick={(e) => { if(e.target === e.currentTarget) handleClose(); }}
    >
      
      {/* Pagination indicators - Bottom */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
          {images.map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}

      {/* Carousel Track */}
      <div 
        className={`flex h-full w-full touch-none ${!isDragging ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{ transform: containerTransform }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => { if(e.target === e.currentTarget) handleClose(); }}
      >
        {images.map((img, idx) => (
          <div 
            key={idx} 
            className="w-[100vw] h-full shrink-0 flex justify-center items-center relative px-4 py-12"
            onClick={(e) => { if(e.target === e.currentTarget) handleClose(); }}
          >
            <img 
              src={img} 
              alt={`Fullscreen view ${idx + 1}`} 
              className={`max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-6rem)] object-contain rounded-xl shadow-2xl ${scale === 1 ? 'transition-transform duration-300' : ''}`}
              style={{ 
                transform: idx === currentIndex && scale > 1 ? `translate(${position.x}px, ${position.y}px) scale(${scale})` : 'none',
                cursor: scale > 1 ? 'grab' : 'zoom-in'
              }}
              draggable="false"
              onClick={(e) => {
                e.stopPropagation();
                if (scale > 1) {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                } else {
                  handleClose();
                }
              }}
            />
          </div>
        ))}
      </div>

    </div>
  );
}

