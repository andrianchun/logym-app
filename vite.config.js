import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  // Dibaca App.jsx buat bandingkan versi bundle yang BENERAN jalan vs /ota/version.json
  // (lihat OTA-TEMPLATE.md di lomeal-app) — jangan pakai CapacitorUpdater.current(), itu cuma
  // label saat download, bisa beda dari isi bundle.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      // Ubah dari autoUpdate jadi prompt supaya bisa munculin notif update di dalam app
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        name: 'Logym Tracker',
        short_name: 'Logym',
        description: 'Aplikasi pelacak progres fitness harian',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#0ea5e9',
        icons: [
          { src: '/icon-48.png', type: 'image/png', sizes: '48x48', purpose: 'any maskable' },
          { src: '/icon-72.png', type: 'image/png', sizes: '72x72', purpose: 'any maskable' },
          { src: '/icon-96.png', type: 'image/png', sizes: '96x96', purpose: 'any maskable' },
          { src: '/icon-128.png', type: 'image/png', sizes: '128x128', purpose: 'any maskable' },
          { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any maskable' },
          { src: '/icon-256.png', type: 'image/png', sizes: '256x256', purpose: 'any maskable' },
          { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Default glob Workbox tidak mencakup .webp/.json — tanpa ini, background gambar
        // dan exercisedb.json (dipakai utk nambah exercise ke rutinitas) gagal saat offline.
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,json,woff2}'],
        // exercisedb.json (~1MB) & beberapa bg-*.webp melebihi limit default Workbox (2MB aman,
        // tapi dinaikkan sedikit untuk jaga-jaga total payload gabungan).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // WAJIB — tanpa ini Workbox memetakan '/' ke entri precache index.html (directoryIndex,
        // default aktif) karena globPatterns di atas ikut match .html. Selama itu terjadi,
        // reload berapa kali pun tetap menyajikan versi lama, header HTTP gak ngaruh sama
        // sekali karena request-nya gak pernah sampai jaringan — inilah yang bikin user
        // "harus hapus cache/data" biar update kelihatan. Lihat OTA-TEMPLATE.md jebakan #1.
        navigateFallback: null,
        globIgnores: ['index.html'],
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'html', networkTimeoutSeconds: 3, expiration: { maxEntries: 1 } },
        }],
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Pisahkan vendor besar ke chunk sendiri: parse per-unit lebih kecil di device
        // low-end, dan cache browser tetap valid saat kode aplikasi berubah.
        // PENTING: react/react-dom/scheduler harus satu chunk tersendiri yang tidak
        // mengimpor chunk lain, supaya tidak terjadi circular init (layar putih).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('html2canvas')) return undefined; // biarkan ikut dynamic import (lazy)
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) return 'vendor-firebase';
          if (id.includes('recharts') || id.includes('victory-vendor') || /node_modules\/d3-/.test(id)) return 'vendor-recharts';
          if (id.includes('lucide-react') || id.includes('@dnd-kit')) return 'vendor-ui';
          return 'vendor';
        },
      },
    },
  },
})
