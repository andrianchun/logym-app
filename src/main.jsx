import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import App from './App.jsx'
import './index.css'

// WAJIB dipanggil dalam appReadyTimeout Capgo (default 10 DETIK) sesudah bundle OTA
// baru boot, atau Capgo mengira update-nya gagal/nge-crash dan ROLLBACK OTOMATIS ke
// bundle sebelumnya di peluncuran berikutnya — diam-diam, tanpa error yang kelihatan.
// Dipanggil di sini, paling awal mungkin, SEBELUM nunggu apa pun (lihat main.jsx Lomeal).
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady();
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Handle Vite chunk load errors gracefully
    if (error && error.message && (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed')
    )) {
      if (!sessionStorage.getItem('app-updated-reload')) {
        sessionStorage.setItem('app-updated-reload', 'true');
        window.location.reload(true);
      }
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