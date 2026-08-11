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
    // Guard sessionStorage biar gak reload berulang kalau bundle terbarunya sendiri yang crash.
    if (error && !sessionStorage.getItem('app-updated-reload')) {
      sessionStorage.setItem('app-updated-reload', 'true');
      (async () => {
        // DI APK, BERSIH-BERSIH SERVICE WORKER TIDAK ADA GUNANYA. JS-nya dibaca dari bundle OTA di
        // penyimpanan perangkat (https://localhost/assets/...), bukan dari jaringan — reload
        // sesudah menghapus cache cuma memuat ulang bundle rusak yang sama. Yang benar: kembalikan
        // ke bundle bawaan APK lewat reset(), lalu pengecekan OTA bisa jalan lagi dan menarik versi
        // perbaikannya. Tanpa ini, satu crash saat render mengunci APK permanen.
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

  componentDidMount() {
    setTimeout(() => {
      sessionStorage.removeItem('app-updated-reload');
    }, 1000);
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: 'black', color: 'red', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
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