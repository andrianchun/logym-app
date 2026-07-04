/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Sora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
