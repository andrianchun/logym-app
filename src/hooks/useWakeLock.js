import { useState, useCallback, useEffect, useRef } from 'react';

export const useWakeLock = () => {
  const [isSupported] = useState('wakeLock' in navigator);
  const wakeLockRef = useRef(null);
  const isLockedRef = useRef(false);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return false;
    try {
      if (wakeLockRef.current !== null) return true;
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      isLockedRef.current = true;
      
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
        isLockedRef.current = false;
      });
      return true;
    } catch (err) {
      console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
      wakeLockRef.current = null;
      isLockedRef.current = false;
      return false;
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (!isSupported || !wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
    } catch (err) {
      console.warn(`Wake Lock release error: ${err.name}, ${err.message}`);
    } finally {
      wakeLockRef.current = null;
      isLockedRef.current = false;
    }
  }, [isSupported]);

  // Handle visibility changes (browser releases lock when hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLockedRef.current && !wakeLockRef.current) {
        // Re-request the lock if we wanted it locked but it was dropped (e.g. user minimized app and came back)
        requestWakeLock();
      }
    };

    if (isSupported) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    return () => {
      if (isSupported) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [isSupported, requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { requestWakeLock, releaseWakeLock, isSupported };
};
