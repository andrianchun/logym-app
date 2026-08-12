import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { bleAvailable, connectAndListen, saveMeasurement } from '../utils/ble';

const SAVED_KEY = 'ble_devices';
const loadSaved = () => {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};
const persist = (list) => localStorage.setItem(SAVED_KEY, JSON.stringify(list));

export function useBleManager({ setHistory, userProfile }) {
  const [available, setAvailable] = useState(false);
  const [devices, setDevices] = useState(loadSaved);
  const [status, setStatus] = useState({});   // deviceId -> 'connecting' | 'listening'
  const [readings, setReadings] = useState({}); // deviceId -> hasil ukur terakhir
  const [errors, setErrors] = useState({});   // deviceId -> pesan
  const [warn, setWarn] = useState('');
  
  const stops = useRef({});                   // deviceId -> fungsi pemutus

  const patch = (setter, id, val) => setter((prev) => ({ ...prev, [id]: val }));

  useEffect(() => { bleAvailable().then(setAvailable); }, []);

  // Simpan referensi ke deps untuk callback saveMeasurement
  const deps = useRef({ setHistory, userProfile });
  useEffect(() => {
    deps.current = { setHistory, userProfile };
  }, [setHistory, userProfile]);

  const listen = useCallback(async (dev) => {
    const id = dev.deviceId;
    patch(setErrors, id, ''); setWarn('');
    patch(setStatus, id, 'connecting');
    try {
      await stops.current[id]?.(); // jangan menumpuk langganan kalau ditekan dua kali
      stops.current[id] = await connectAndListen(id, async (r) => {
        if (r.type === 'disconnected') { patch(setStatus, id, undefined); return; }
        try {
          // Gunakan deps terbaru agar kita tidak perlu re-subscribe BLE saat profil berubah
          const { setHistory: sh, userProfile: up } = deps.current;
          const res = await saveMeasurement(r, { setHistory: sh, userProfile: up });
          patch(setReadings, id, r);
          
          setDevices((prev) => {
            const next = prev.map((d) => (d.deviceId === id ? { ...d, kind: r.type } : d));
            persist(next);
            return next;
          });
          setWarn(res?.hcOk ? '' : 'Tersimpan di Logym, tapi belum masuk Health Connect — tekan "Hubungkan" di bagian Health Connect di atas, lalu ukur lagi. (Di browser memang selalu begini; Health Connect cuma ada di aplikasi Android.)');
        } catch (e) {
          patch(setErrors, id, e?.message || 'Gagal menyimpan hasil ukur.');
        }
      });
      patch(setStatus, id, 'listening');
    } catch (e) {
      if (e.message?.includes('already pending')) {
        // Abaikan
      } else {
        patch(setStatus, id, undefined);
        patch(setErrors, id, 'Gagal menyambung. Pastikan Bluetooth dan Lokasi nyala.');
      }
    }
  }, []);

  // Auto-connect saat app mount (Background Listener)
  useEffect(() => {
    if (available) {
      devices.forEach(dev => listen(dev));
    }
    // Cleanup pada unmount App
    return () => {
      Object.values(stops.current).forEach((s) => s?.());
    };
    // Hanya run sekali saat available true. Perubahan devices di-handle via manual add/forget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]); 

  const addDevice = useCallback((dev) => {
    setDevices((prev) => {
      if (prev.find((d) => d.deviceId === dev.deviceId)) return prev;
      const next = [...prev, dev];
      persist(next);
      return next;
    });
    listen(dev);
  }, [listen]);

  const forgetDevice = useCallback(async (id) => {
    await stops.current[id]?.();
    delete stops.current[id];
    patch(setStatus, id, undefined);
    setDevices((prev) => {
      const next = prev.filter((d) => d.deviceId !== id);
      persist(next);
      return next;
    });
  }, []);

  // Indikator boolean jika ADA alat yang sedang connecting atau listening
  // (ataupun sekadar untuk memunculkan ikon muter-muter)
  const isBleBusy = useMemo(() => {
    return Object.values(status).some(s => s === 'connecting' || s === 'listening');
  }, [status]);

  return {
    available,
    devices,
    status,
    readings,
    errors,
    warn,
    isBleBusy,
    addDevice,
    forgetDevice,
    listen,
    setWarn,
    setErrors
  };
}
