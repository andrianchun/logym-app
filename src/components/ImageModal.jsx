import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ImageModal({ imageUrl, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPinchDistance: null });

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const getPinchDistance = (touches) => {
    if (touches.length < 2) return null;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      dragStartRef.current.initialPinchDistance = getPinchDistance(e.touches);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && dragStartRef.current.initialPinchDistance) {
      const currentDistance = getPinchDistance(e.touches);
      const delta = currentDistance - dragStartRef.current.initialPinchDistance;
      const newScale = Math.min(Math.max(1, scale + delta * 0.01), 4);
      setScale(newScale);
      
      // Reset position when zoomed out completely
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      
      dragStartRef.current.initialPinchDistance = currentDistance;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current.initialPinchDistance = null;
  };

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col justify-center items-center animate-in fade-in duration-300">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-10 bg-gradient-to-b from-black/60 to-transparent" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button 
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          <X size={24} />
        </button>
      </div>

      {/* Image Container */}
      <div 
        className="w-full h-full flex justify-center items-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // Reset zoom on click roughly (simple click toggle)
          if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }
        }}
      >
        <img 
          src={imageUrl} 
          alt="Fullscreen view" 
          className="max-w-full max-h-[85vh] object-contain transition-transform duration-200 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? 'grab' : 'zoom-in'
          }}
          draggable="false"
        />
      </div>

    </div>
  );
}
