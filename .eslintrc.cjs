module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  // di-inject vite dari package.json (lihat vite.config.js)
  globals: { __APP_VERSION__: 'readonly' },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  // react-body-highlighter itu salinan pustaka pihak ketiga yang ditaruh di dalam src — bukan kode
  // kita, tidak akan diperbaiki, dan errornya cuma menutupi milik sendiri.
  ignorePatterns: ['dist', '.eslintrc.cjs', 'src/components/react-body-highlighter'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    // DIMATIKAN SUPAYA `no-undef` KELIHATAN.
    //
    // Komponen di app ini memang tidak memakai propTypes sama sekali, jadi aturan ini menghasilkan
    // ratusan error yang tidak akan pernah dikerjakan. Akibatnya bukan sekadar berisik: `npm run
    // lint` selalu merah, jadi tidak ada yang membacanya — dan `no-undef` ikut terkubur di
    // dalamnya. Dua kali dalam dua hari itu berujung crash di produksi (handleSaveWorkout mati
    // total v1.1.2-v1.1.6, dasbor mati v1.1.7), padahal keduanya sudah dilaporkan lint sejak awal.
    //
    // Kalau kelak propTypes benar-benar mau dipakai, hidupkan lagi — tapi jangan sebelum jumlah
    // errornya nol, supaya sinyalnya tidak tenggelam lagi.
    'react/prop-types': 'off',
    // Sisanya diturunkan jadi peringatan dengan alasan yang sama: ini kebersihan, bukan bahaya.
    // Yang tetap ERROR sekarang cuma kelas yang benar-benar menjatuhkan app saat dijalankan —
    // `no-undef`, `react/jsx-no-undef`, dan `rules-of-hooks`. Jadi keluaran `npm run lint` bisa
    // dibaca sekilas, dan yang berbahaya tidak lagi terkubur di antara ratusan baris.
    'no-unused-vars': 'warn',
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
    'no-constant-condition': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
