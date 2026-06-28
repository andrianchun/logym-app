import React, { useState, useEffect, useRef } from 'react';
import { playSoundEffect } from '../utils/audio';
import { formatNumber, parseFormattedNumber } from '../utils/numberFormat';

const SwipeInput = ({ value, onChange, disabled, step = 1, className, min = 0, soundEnabled, placeholder, language = 'ID' }) => {
    const inputRef = useRef(null);
    const dragRef = useRef({ isDragging: false, startY: 0, startVal: 0, lastCalculatedValue: undefined });
    const [isFocused, setIsFocused] = useState(false);
    
    // STATE LOKAL: Untuk render 60fps tanpa menunggu parent re-render
    const [localValue, setLocalValue] = useState(value);

    // SINKRONISASI: Update localValue jika parent mengubah prop value
    useEffect(() => {
        if (!dragRef.current.isDragging) {
            setLocalValue(value);
        }
    }, [value]);

    const onTouchStart = (e) => {
        if (disabled) return; 
        e.stopPropagation(); // Mencegah global swipe
        
        let sVal = Number(localValue);
        if (isNaN(sVal) || localValue === '' || localValue === null || localValue === undefined) {
            sVal = placeholder ? (Number(placeholder.toString().replace(/[^\d.-]/g, '')) || 0) : 0;
        }
        
        // lastCalculatedValue di-reset ke undefined agar sekadar nge-tap tidak otomatis mengisi angka placeholder
        dragRef.current = { isDragging: true, startY: e.touches[0].clientY, startVal: sVal, lastCalculatedValue: undefined };
    };

    const onTouchMove = (e) => {
        if (!dragRef.current.isDragging || disabled) return;
        e.stopPropagation(); // Mencegah global swipe
        
        const diffY = dragRef.current.startY - e.touches[0].clientY;
        const steps = Math.round(diffY / 15); 
        
        // Ensure step and startVal are valid numbers
        const validStep = isNaN(Number(step)) ? 1 : Number(step);
        const validStartVal = isNaN(dragRef.current.startVal) ? 0 : dragRef.current.startVal;
        
        let newValue = validStartVal + (steps * validStep);
        const validMin = isNaN(Number(min)) ? 0 : Number(min);
        newValue = Math.max(validMin, Number(newValue.toFixed(2))); 
        
        if (newValue !== Number(localValue)) {
            dragRef.current.lastCalculatedValue = newValue;
            setLocalValue(newValue); // Update UI lokal secara instan
            playSoundEffect('swipe', soundEnabled);
        }
    };

    const onTouchEnd = () => {
        if (dragRef.current.isDragging) {
            dragRef.current.isDragging = false;
            // Baru lempar ke parent (re-render berat) SAAT JARI DIANGKAT (dan jika ada perubahan dari drag)
            if (dragRef.current.lastCalculatedValue !== undefined && dragRef.current.lastCalculatedValue !== Number(value)) {
                onChange(dragRef.current.lastCalculatedValue);
            }
        }
    };

    const handleManualChange = (e) => {
        let val = e.target.value;
        val = val.replace(/^0+(?=\d)/, ''); // Remove leading zeros before digits
        
        // Intercept numpad dot to comma for ID language
        if (language === 'ID' && val.endsWith('.')) {
            if (!val.slice(0, -1).includes(',')) val = val.slice(0, -1) + ',';
        }

        if (isFocused) {
            // Parse to raw string (standard JS float format: 10000.5)
            const parsed = parseFormattedNumber(val, language);
            if (parsed === '') {
                setLocalValue('');
                onChange('');
                return;
            }

            // Limit to max 2 decimal places during manual typing
            if (parsed.includes('.')) {
                const fraction = parsed.split('.')[1];
                if (fraction && fraction.length > 2) {
                    return; // Ignore the keystroke
                }
            }
            
            // Allow typing trailing decimals like "10." or "10,"
            // Regardless of language, if the user typed a punctuation mark at the end, treat it as starting a decimal
            let toStore = parsed;
            if ((val.endsWith(',') || val.endsWith('.')) && !parsed.includes('.')) {
                toStore = parsed + '.';
            }
            
            setLocalValue(toStore);
            
            const numVal = parseFloat(parsed);
            if (!isNaN(numVal)) onChange(numVal);
        }
    };

    const getDisplayValue = () => {
        if (localValue === null || localValue === undefined || localValue === '') return '';
        
        if (!isFocused) return formatNumber(localValue, language);
        
        // When focused, we still want thousands separators, but must preserve exact decimal typing
        const rawStr = localValue.toString();
        const parts = rawStr.split('.');
        const integerPart = parts[0];
        const fractionalPart = parts.length > 1 ? parts[1] : undefined;
        
        const decSep = language === 'ID' ? ',' : '.';
        const formattedInteger = formatNumber(integerPart, language);
        
        if (fractionalPart !== undefined) {
            return `${formattedInteger}${decSep}${fractionalPart}`;
        } else if (rawStr.endsWith('.')) {
            return `${formattedInteger}${decSep}`;
        }
        
        return formattedInteger;
    };

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const handleMove = (e) => {
            if (dragRef.current.isDragging) e.preventDefault();
        };
        el.addEventListener('touchmove', handleMove, { passive: false });
        return () => el.removeEventListener('touchmove', handleMove);
    }, []);

    return (
        <div className="relative w-full flex items-center">
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                style={{ touchAction: 'none' }}
                value={getDisplayValue()} 
                onChange={handleManualChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    // On blur, sync back
                    if (localValue === '' || localValue === '.') {
                        setLocalValue('');
                        onChange('');
                    } else {
                        const finalVal = parseFloat(localValue);
                        if (!isNaN(finalVal)) {
                            setLocalValue(finalVal);
                            onChange(finalVal);
                        }
                    }
                }}
                disabled={disabled}
                placeholder={formatNumber(placeholder, language)}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onTouchCancel={onTouchEnd}
                className={`text-center ${className}`}
            />
        </div>
    );
};

export default SwipeInput;