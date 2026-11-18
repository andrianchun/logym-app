import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { playSoundEffect } from '../utils/audio';
import { formatNumber, parseFormattedNumber } from '../utils/numberFormat';

const formatTimeClock = (rawVal, isSecondsFormat) => {
  const num = Number(rawVal);
  if (rawVal === '' || rawVal === null || rawVal === undefined || Number.isNaN(num)) return '';
  const totalSecs = isSecondsFormat ? Math.round(num) : Math.round(num * 60);
  if (!Number.isFinite(totalSecs)) return '';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatDisplayText = (rawVal, { isFocused, isTimeFormat, isSecondsFormat, formatValue, language }) => {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  if (isTimeFormat && !isFocused) {
    return formatTimeClock(rawVal, isSecondsFormat);
  }
  if (formatValue && !isFocused) {
    return formatValue(rawVal);
  }
  if (!isFocused) return formatNumber(rawVal, language);

  const str = rawVal.toString();
  const decSep = language === 'ID' ? ',' : '.';
  const hasDot = str.includes('.');
  const [integerPart, fractionalPart] = str.split('.');
  const formattedInteger = formatNumber(integerPart, language);
  if (hasDot) {
    if (fractionalPart !== undefined && fractionalPart !== '') {
      return `${formattedInteger}${decSep}${fractionalPart}`;
    }
    return `${formattedInteger}${decSep}`;
  }
  return formattedInteger;
};

// Kurva sensitivitas geser: 14px/step untuk presisi awal, berakselerasi ringan (9px/step)
// setelah 56px jarak tarikan (khusus rentang non-wrap) supaya lompatan beban besar tetap ringan.
const pixelsToSteps = (diffY, allowTurbo) => {
  const absY = Math.abs(diffY);
  const dir = diffY >= 0 ? 1 : -1;
  if (absY < 5) return 0;
  const effectivePx = absY - 4;
  if (!allowTurbo || effectivePx <= 56) {
    return dir * Math.round(effectivePx / 14);
  }
  const baseSteps = 4; // 56 / 14
  const extraSteps = Math.round((effectivePx - 56) / 9);
  return dir * (baseSteps + extraSteps);
};

const SwipeInput = ({
  value,
  onChange,
  onLiveChange,
  onLiveEnd,
  disabled,
  step = 1,
  className = '',
  min = 0,
  max,
  wrap = false,
  soundEnabled,
  placeholder,
  language = 'ID',
  isTimeFormat = false,
  isSecondsFormat = false,
  formatValue
}) => {
  const containerRef = useRef(null);
  const displayTextRef = useRef(null);
  const inputRef = useRef(null);
  const hudValRef = useRef(null);
  const hudDeltaRef = useRef(null);

  const dragRef = useRef({
    active: false,
    locked: false,
    cancelled: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    startVal: 0,
    lastValue: undefined
  });
  const lastSoundTimeRef = useRef(0);
  const lastVibeTimeRef = useRef(0);

  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [hudRect, setHudRect] = useState(null);

  const propsRef = useRef({
    disabled, step, min, max, wrap, soundEnabled, language, isTimeFormat, isSecondsFormat, formatValue, onChange, onLiveChange, onLiveEnd, value
  });
  propsRef.current = {
    disabled, step, min, max, wrap, soundEnabled, language, isTimeFormat, isSecondsFormat, formatValue, onChange, onLiveChange, onLiveEnd, value
  };

  useEffect(() => {
    if (!isFocused && !dragRef.current.active) {
      setLocalValue(value);
      if (displayTextRef.current) {
        const txt = formatDisplayText(value, { isFocused: false, isTimeFormat, isSecondsFormat, formatValue, language });
        displayTextRef.current.textContent = txt || '';
      }
    }
  }, [value, isFocused, isTimeFormat, isSecondsFormat, formatValue, language]);

  const computeNextStepValue = useCallback((diffY) => {
    const { step: rawStep, min: rawMin, max: rawMax, wrap: isWrap, isTimeFormat: isTime } = propsRef.current;
    const validStep = Number(rawStep) || 1;
    const validStartVal = Number.isNaN(dragRef.current.startVal) ? 0 : dragRef.current.startVal;
    const validMin = Number.isNaN(Number(rawMin)) ? 0 : Number(rawMin);
    const validMax = rawMax !== undefined && !Number.isNaN(Number(rawMax)) ? Number(rawMax) : undefined;
    const allowTurbo = !isWrap && !isTime && (validMax === undefined || (validMax - validMin) / validStep > 12);

    const steps = pixelsToSteps(diffY, allowTurbo);
    let newValue = validStartVal;
    if (steps > 0) {
      newValue = Math.ceil((validStartVal + 0.0001) / validStep) * validStep + (steps - 1) * validStep;
    } else if (steps < 0) {
      newValue = Math.floor((validStartVal - 0.0001) / validStep) * validStep + (steps + 1) * validStep;
    }

    if (isWrap && validMax !== undefined) {
      const range = validMax - validMin + validStep;
      newValue = ((newValue - validMin) % range + range) % range + validMin;
    } else {
      newValue = Math.max(validMin, validMax !== undefined ? Math.min(validMax, newValue) : newValue);
    }
    return Number(newValue.toFixed(2));
  }, []);

  const applyDragDomUpdate = useCallback((nextVal) => {
    const p = propsRef.current;
    const formatted = formatDisplayText(nextVal, {
      isFocused: false,
      isTimeFormat: p.isTimeFormat,
      isSecondsFormat: p.isSecondsFormat,
      formatValue: p.formatValue,
      language: p.language
    });

    if (displayTextRef.current) {
      displayTextRef.current.textContent = formatted;
      displayTextRef.current.style.opacity = '1';
    }
    if (hudValRef.current) {
      hudValRef.current.textContent = formatted;
    }
    if (hudDeltaRef.current) {
      const delta = Number((nextVal - dragRef.current.startVal).toFixed(2));
      if (delta === 0) {
        hudDeltaRef.current.textContent = '•';
        hudDeltaRef.current.className = 'text-xs font-bold tabular-nums text-slate-400';
      } else {
        const sign = delta > 0 ? '+' : '';
        const deltaStr = p.isTimeFormat
          ? `${sign}${delta}${p.isSecondsFormat ? 's' : 'm'}`
          : `${sign}${formatNumber(delta, p.language)}`;
        hudDeltaRef.current.textContent = deltaStr;
        hudDeltaRef.current.className = `text-xs font-black tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`;
      }
    }
    dragRef.current.hudFormatted = formatted;
    dragRef.current.hudDeltaVal = Number((nextVal - dragRef.current.startVal).toFixed(2));
  }, []);

  const notifyStepFeedback = useCallback((nextVal) => {
    const p = propsRef.current;
    const now = Date.now();
    if (p.soundEnabled && now - lastSoundTimeRef.current > 55) {
      lastSoundTimeRef.current = now;
      playSoundEffect('swipe', p.soundEnabled);
    }
    if (now - lastVibeTimeRef.current > 45 && typeof navigator !== 'undefined' && navigator.vibrate) {
      lastVibeTimeRef.current = now;
      try { navigator.vibrate(4); } catch {}
    }
    p.onLiveChange?.(nextVal);
  }, []);

  const beginDragSession = useCallback((clientX, clientY) => {
    const p = propsRef.current;
    if (p.disabled || isFocused) return false;
    let sVal = Number(localValue);
    if (Number.isNaN(sVal) || localValue === '' || localValue === null || localValue === undefined) {
      sVal = placeholder ? (Number(placeholder.toString().replace(/[^\d.-]/g, '')) || 0) : 0;
    }
    dragRef.current = {
      active: true,
      locked: false,
      cancelled: false,
      startX: clientX,
      startY: clientY,
      startTime: Date.now(),
      startVal: sVal,
      lastValue: undefined
    };
    return true;
  }, [isFocused, localValue, placeholder]);

  const moveDragSession = useCallback((clientX, clientY, preventDefaultFn) => {
    const d = dragRef.current;
    if (!d.active || d.cancelled || propsRef.current.disabled) return;

    const dx = clientX - d.startX;
    const dy = d.startY - clientY; // swipe ke atas = nilai naik

    if (!d.locked) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) + 4) {
        d.cancelled = true;
        return;
      }
      if (Math.abs(dy) < 5) return;
      d.locked = true;
      const newValue = computeNextStepValue(dy);
      d.lastValue = newValue;
      applyDragDomUpdate(newValue);
      if (containerRef.current) {
        containerRef.current.dataset.scrubbing = '1';
        const r = containerRef.current.getBoundingClientRect();
        setHudRect({
          centerX: Math.min(Math.max(56, r.left + r.width / 2), (window.innerWidth || 400) - 56),
          top: Math.max(12, r.top - 52),
          val: d.hudFormatted,
          delta: d.hudDeltaVal
        });
      }
      if (newValue !== d.startVal) {
        notifyStepFeedback(newValue);
      }
      if (preventDefaultFn) preventDefaultFn();
      return;
    }

    if (preventDefaultFn) preventDefaultFn();

    const newValue = computeNextStepValue(dy);
    if (newValue !== d.lastValue) {
      const prevChanged = d.lastValue;
      d.lastValue = newValue;
      applyDragDomUpdate(newValue);
      if (prevChanged !== undefined || newValue !== d.startVal) {
        notifyStepFeedback(newValue);
      }
    }
  }, [computeNextStepValue, applyDragDomUpdate, notifyStepFeedback]);

  const endDragSession = useCallback((shouldAllowTapFocus = true, preventDefaultFn = null) => {
    const d = dragRef.current;
    if (!d.active) return;

    const wasLocked = d.locked;
    const wasCancelled = d.cancelled;
    const finalVal = d.lastValue;
    d.active = false;
    d.locked = false;
    d.cancelled = false;

    if (containerRef.current) {
      delete containerRef.current.dataset.scrubbing;
    }
    if (displayTextRef.current) {
      displayTextRef.current.style.opacity = '';
    }
    setHudRect(null);

    if (wasLocked) {
      if (preventDefaultFn) preventDefaultFn();
      if (finalVal !== undefined) {
        setLocalValue(finalVal);
        if (finalVal !== Number(propsRef.current.value)) {
          propsRef.current.onChange?.(finalVal);
        }
      }
      propsRef.current.onLiveEnd?.();
      return;
    }

    if (!wasCancelled && shouldAllowTapFocus && !propsRef.current.disabled) {
      setIsFocused(true);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const el = inputRef.current;
      if (el) {
        el.focus({ preventScroll: true });
        try { el.select(); } catch {}
      }
    }
  }, [isFocused]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isFocused) return;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      beginDragSession(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      if (!dragRef.current.active || e.touches.length !== 1) return;
      moveDragSession(
        e.touches[0].clientX,
        e.touches[0].clientY,
        () => { if (e.cancelable) e.preventDefault(); }
      );
    };

    const handleTouchEnd = (e) => {
      endDragSession(true, () => { if (e.cancelable) e.preventDefault(); });
    };

    const handleTouchCancel = () => {
      endDragSession(false);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isFocused, beginDragSession, moveDragSession, endDragSession]);

  const handleMouseDown = (e) => {
    if (disabled || isFocused || e.button !== 0) return;
    if (!beginDragSession(e.clientX, e.clientY)) return;

    const onMouseMove = (ev) => {
      moveDragSession(ev.clientX, ev.clientY, () => ev.preventDefault());
    };
    const onMouseUp = (ev) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      endDragSession(true, () => ev.preventDefault());
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleManualChange = (e) => {
    let val = e.target.value;
    val = val.replace(/^0+(?=\d)/, '');

    if (language === 'ID' && val.endsWith('.')) {
      if (!val.slice(0, -1).includes(',')) val = val.slice(0, -1) + ',';
    }

    const parsed = parseFormattedNumber(val, language);
    if (parsed === '') {
      setLocalValue('');
      onChange?.('');
      return;
    }

    if (parsed.includes('.')) {
      const fraction = parsed.split('.')[1];
      if (fraction && fraction.length > 2) return;
    }

    if (parsed === '-' || /^-?\d*\.?\d*$/.test(parsed)) {
      let toStore = parsed;
      if ((val.endsWith(',') || val.endsWith('.')) && !parsed.includes('.')) {
        toStore = parsed + '.';
      }
      setLocalValue(toStore);

      const numVal = parseFloat(parsed);
      if (!Number.isNaN(numVal)) {
        onChange?.(numVal);
      }
    }
  };

  const commitBlurValue = () => {
    setIsFocused(false);
    onLiveEnd?.();
    if (localValue !== '' && localValue !== '-') {
      const finalVal = parseFloat(localValue);
      if (!Number.isNaN(finalVal)) {
        const validMin = Number.isNaN(Number(min)) ? 0 : Number(min);
        const validMax = max !== undefined && !Number.isNaN(Number(max)) ? Number(max) : undefined;
        let clamped = Math.max(validMin, validMax !== undefined ? Math.min(validMax, finalVal) : finalVal);
        clamped = Number(clamped.toFixed(2));
        setLocalValue(clamped);
        onChange?.(clamped);
        return;
      }
    }
    setLocalValue(value);
  };

  const displayStr = formatDisplayText(localValue, {
    isFocused,
    isTimeFormat,
    isSecondsFormat,
    formatValue,
    language
  });
  const placeholderStr = placeholder !== undefined && placeholder !== null && placeholder !== ''
    ? formatNumber(placeholder, language)
    : '';
  const hasValue = displayStr !== '' && displayStr !== null && displayStr !== undefined;

  return (
    <>
      {isFocused ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayStr}
          onChange={handleManualChange}
          onFocus={(e) => {
            e.target.select();
          }}
          onBlur={commitBlurValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
          placeholder={placeholderStr}
          className={`${className} touch-manipulation`}
        />
      ) : (
        <div
          ref={containerRef}
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          aria-valuenow={typeof localValue === 'number' ? localValue : undefined}
          aria-disabled={disabled || undefined}
          onMouseDown={handleMouseDown}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsFocused(true);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: disabled ? 'pan-y' : 'none' }}
          className={`${className} flex items-center justify-center select-none overflow-hidden whitespace-nowrap ${disabled ? '' : 'cursor-ns-resize transition-transform duration-75 data-[scrubbing=1]:scale-[1.04] data-[scrubbing=1]:ring-2 data-[scrubbing=1]:ring-sky-400 data-[scrubbing=1]:bg-sky-500/15'}`}
        >
          <span ref={displayTextRef} className={hasValue ? '' : 'opacity-40 pointer-events-none'}>
            {hasValue ? displayStr : placeholderStr}
          </span>
        </div>
      )}

      {hudRect && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[999999] pointer-events-none -translate-x-1/2"
          style={{ left: hudRect.centerX, top: hudRect.top }}
        >
          <div className="bg-[#0B132B]/95 text-white border border-sky-400/50 shadow-[0_12px_30px_rgba(2,6,23,0.75)] rounded-2xl px-3.5 py-1.5 flex items-center gap-2.5 min-w-[84px] justify-center">
            <span className="text-xs text-sky-400 font-black leading-none">▲▼</span>
            <span ref={hudValRef} className="text-lg font-black tabular-nums tracking-tight leading-none text-white">
              {hudRect.val ?? displayStr}
            </span>
            <span
              ref={hudDeltaRef}
              className={`text-xs font-black tabular-nums ${hudRect.delta > 0 ? 'text-emerald-400' : hudRect.delta < 0 ? 'text-rose-400' : 'text-slate-400'}`}
            >
              {hudRect.delta ? `${hudRect.delta > 0 ? '+' : ''}${isTimeFormat ? `${hudRect.delta}${isSecondsFormat ? 's' : 'm'}` : formatNumber(hudRect.delta, language)}` : '•'}
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default React.memo(SwipeInput);
