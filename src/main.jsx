import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import App from './App.jsx'
import './index.css'

// notifyAppReady() SENGAJA TIDAK DIPANGGIL DI SINI LAGI. Lihat App.jsx — sekarang dipanggil dari
// useEffect, yaitu SESUDAH React berhasil merender sekali tanpa melempar.
//
// Dulu dipanggil persis di titik ini, saat modul dimuat, sebelum React menyentuh apa pun. Capgo
// langsung menandai bundle-nya "sehat" — jadi bundle yang crash SAAT RENDER tetap dianggap sukses
// dan rollback otomatisnya tidak pernah berjalan. Bersama ErrorBoundary yang cuma tahu cara
// memperbaiki masalah service worker (jalan di web, sia-sia di APK karena bundle-nya dibaca dari
// penyimpanan lokal, bukan server), APK jadi TERKUNCI PERMANEN di bundle rusak: layar merah tiap
// buka, pengecekan OTA tidak pernah jalan, dan tidak ada jalan keluar selain hapus data aplikasi.
// Persis yang terjadi di v1.1.7.
//
// Batas appReadyTimeout Capgo 10 detik dan render pertama React jauh di bawah itu — dia tidak
// menunggu data, cuma menggambar kerangka.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Crash apa pun (bukan cuma gagal fetch chunk) bisa berarti PWA masih ngunci bundle LAMA
    // di service worker cache — app rusak sebelum sempat nampilin modal update sendiri
    // (lihat checkOta di App.jsx), jadi user macet gak bisa keluar dari layar merah ini.
    // Coba SEKALI: unregister semua SW + hapus cache Workbox, baru hard-reload — biar reload
    // itu benar-benar ambil ulang index.html + bundle terbaru dari server, bukan dari cache.
    // Guard 15 detik biar gak reload berulang/looping kalau bundle terbarunya sendiri yang crash.
    const lastReload = Number(sessionStorage.getItem('app-updated-reload') || 0);
    const now = Date.now();
    if (error && (!lastReload || now - lastReload > 15000)) {
      sessionStorage.setItem('app-updated-reload', String(now));
      (async () => {
        try {
          if (Capacitor.isNativePlatform()) {
            await CapacitorUpdater.reset();
          } else {
            const regs = await navigator.serviceWorker?.getRegistrations?.();
            await Promise.all((regs || []).map(r => r.unregister()));
            const keys = await caches?.keys?.();
            await Promise.all((keys || []).map(k => caches.delete(k)));
          }
        } catch (e) { /* best-effort — tetap reload walau gagal bersih-bersih */ }
        window.location.reload();
      })();
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', backgroundColor: '#090e1a', color: '#f87171', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px', fontWeight: 'bold' }}>Terjadi Masalah pada Aplikasi</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '16px' }}>
            Aplikasi mengalami kendala saat memuat antarmuka. Anda dapat mencoba memuat ulang aplikasi di bawah ini.
          </p>
          <button 
            type="button"
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '10px 18px', 
              backgroundColor: '#38bdf8', 
              color: '#000', 
              border: 'none', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            Muat Ulang Aplikasi
          </button>
          <details style={{ whiteSpace: 'pre-wrap', color: '#f87171', fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px' }}>
            <summary style={{ cursor: 'pointer', color: '#cbd5e1', marginBottom: '8px' }}>Detail Teknis</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)