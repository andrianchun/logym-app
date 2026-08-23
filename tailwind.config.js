/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // TIGA tingkat ukuran baku (adaptasi dari Lomeal).
      // Semua utility Tailwind dipetakan ke 3 nilai rem ini agar tidak ada teks kerdil
      // dan teks otomatis membesar mengikuti setelan aksesibilitas HP/APK.
      fontSize: {
        'xs': ['1rem', '1.4'],        // 16px (1rem) — teks isi, label, meta, badge
        'sm': ['1rem', '1.4'],
        'base': ['1rem', '1.4'],
        'md': ['1.3125rem', '1.4'],   // 21px (1.3125rem) — judul kartu, angka, tombol utama
        'lg': ['1.3125rem', '1.4'],
        'xl': ['1.3125rem', '1.4'],
        '2xl': ['2.0625rem', '1.2'],  // 33px (2.0625rem) — judul layar
        '3xl': ['2.0625rem', '1.2'],
        '4xl': ['2.0625rem', '1.2'],
        '5xl': ['2.0625rem', '1.2'],
        '6xl': ['2.0625rem', '1.2'],
      },
      boxShadow: {
        glow: '0 8px 32px -8px rgba(59,130,246,0.35)',
        'glow-lg': '0 20px 60px -15px rgba(59,130,246,0.45)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
}
