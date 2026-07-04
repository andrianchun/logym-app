import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
