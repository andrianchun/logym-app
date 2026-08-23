# 🎨 Logym Design System & Guidelines (`design.md`)

> **ATURAN MUTLAK**: Seluruh antarmuka, komponen, modul baru, dan pembaruan visual di **Logym App** **WAJIB** mematuhi spesifikasi warna, tipografi, dan tema *Glassmorphism* dalam dokumen ini. Tidak diperkenankan menggunakan warna di luar palet atau ukuran font yang terlalu kecil untuk layar HP/APK.

---

## 1. Filosofi Desain & Karakter Visual

Logym mengusung tema **Modern Athletic Glassmorphism** yang selaras dengan ekosistem aplikasi saudara (Lomeal):
- **Permukaan Kaca yang Bersih (*Crystal Glass*)**: Latar belakang tembus pandang dengan efek *blur* halus (`backdrop-blur-xl`) dan *saturation boost*.
- **Aksen Biru Elektrik (*Electric Cobalt*)**: Memberi energi, fokus, dan kesan *high-performance fitness tech*.
- **Sentuhan Modern & Ramah Jari**: Tombol dan target sentuh besar (*touch target* minimal 44px) dengan sudut membulat (*squircle/rounded-3xl*).
- **Tipografi Tegas & Terbaca di HP**: Font terstruktur rapi, kontras tinggi, dan tidak ada teks kerdil yang membuat mata lelah saat latihan di gym.

---

## 2. Palet Warna Resmi (*Color Palette*)

### A. Warna Utama & Aksen Brand
| Nama Token | Hex / Nilai CSS | Preview / Penggunaan |
| :--- | :--- | :--- |
| **Electric Blue (Primary)** | `#3B82F6` (`blue-500`) | Warna aksen utama, tombol aksi primer, ikon aktif, indikator latihan |
| **Cobalt Deep** | `#1D4ED8` (`blue-700`) | Gradien akhir tombol primer, bayangan glow |
| **Sky Bright** | `#38BDF8` (`sky-400`) | Aksen teks terang pada mode gelap, highlight biometrik |
| **Primary Gradient** | `from-[#3B82F6] to-[#1D4ED8]` | Tombol Simpan, Start Workout, Floating Timer, Program Badge |

### B. Warna Latar Belakang (*Canvas & Ambient Meshes*)
| Mode | Warna Dasar | Efek Radial Ambient Gradient |
| :--- | :--- | :--- |
| **Dark Mode (`app-bg-dark`)** | `#05070D` (Deep Onyx) | `radial-gradient(ellipse at 15% -10%, rgba(59,130,246,0.24), transparent 60%)` |
| **Light Mode (`app-bg-light`)** | `#EEF3FB` (Cool Soft Cloud) | `radial-gradient(ellipse at 15% -10%, rgba(59,130,246,0.14), transparent 60%)` |

### C. Permukaan Kaca (*Glassmorphism Surfaces*)
| Elemen | Tema Gelap (*Dark*) | Tema Terang (*Light*) | Border & Blur |
| :--- | :--- | :--- | :--- |
| **Glass Card (Utama)** | `bg-white/[0.045]` | `bg-white/70` | `border-white/10` (Dark) / `border-black/10` (Light), `backdrop-blur-xl` |
| **Glass Nav (Bottom Bar)** | `bg-white/[0.05]` | `bg-white/80` | `border-white/10` (Dark) / `border-black/10` (Light), `backdrop-blur-2xl` |
| **Card Solid (Bebas Kedip)** | `bg-[#121A2F]` | `bg-white` | Digunakan pada modal/kartu yang memiliki animasi gerak masuk |
| **Input / Button Soft** | `bg-white/5` | `bg-black/[0.04]` | `focus:ring-2 focus:ring-[#3B82F6]` |

### D. Warna Status Semantik (*Functional & Alert Colors*)
| Status / Fitur | Hex / Utility | Penerapan |
| :--- | :--- | :--- |
| **Rose / Sedang Berlangsung / Overdue** | `#F43F5E` (`rose-500`) | Status "Sedang Berlangsung", istirahat minus (>30s), tombol batalkan |
| **Emerald / Selesai / Rekor** | `#10B981` (`emerald-500`) | Status "Selesai", pencapaian rekor baru (PR), target tercapai |
| **Amber / Istirahat / Belum Disimpan** | `#F59E0B` (`amber-500`) | Countdown rest (0s s/d -30s), status "Belum Disimpan", warning |
| **Violet / AI Coach Logy** | `#8B5CF6` (`violet-500`) | Badge AI Coach Logy, rekomendasi cerdas, badge analitik |

---

## 3. Standar Tipografi (1 Jenis Font Seragam: `Inter`)

Menggunakan **1 jenis font seragam untuk seluruh aplikasi: `Inter`** (`font-sans`) dengan **Sistem 3 Tingkat Ukuran Baku berbasis `rem`** (Sama persis dengan arsitektur Lomeal). Seluruh judul, subjudul, isi, tombol, dan badge konsisten menggunakan `Inter`.

### 1 Keluarga Huruf Seragam (*Single Font Family*)
- **`Inter`** (`font-sans`): Digunakan untuk seluruh teks di aplikasi (Judul, Angka, Tombol, Isi, Label, Badge). Memberikan nuansa bersih, modern, dan sangat nyaman dibaca (*high legibility*) di berbagai layar HP/APK.

### 3 Hierarki Ukuran Font Baku (Dipetakan di `tailwind.config.js`)

| Tingkat | Utility Class | Ukuran REM (Default PX) | Ketebalan & Tracking | Penggunaan Wajib |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Display / Judul Layar** | `.h1` (`text-2xl`) | **2.0625rem** (~33px) | `font-black tracking-tight leading-tight` | • Judul Halaman Utama & Header Layar |
| **Tier 2: Judul Kartu & Angka Metrik** | `.h2`, `.body-lg` (`text-md`) | **1.3125rem** (~21px) | `font-bold leading-snug` | • Nama Latihan, Angka Beban & Reps, Tombol Aksi Utama |
| **Tier 3: Teks Isi, Label & Badge** | `.h3`, `.body-md`, `.caption` (`text-sm`, `text-xs`) | **1.0000rem** (~16px) | `font-bold / font-semibold leading-relaxed` | • Instruksi Latihan, Label Kolom, Badge, Status, Unit |

> 💡 **Prinsip Utama**: Seluruh utilitas teks Tailwind (`xs`, `sm`, `base`) dipetakan ke baseline `1rem` (16px) font `Inter`. Dilarang keras memakai `text-[10px]` atau font kecil arbitrary agar tata letak tetap proporsional dan tidak pernah kerdil di APK.

---

## 4. Komponen & Dimensi Baku

### A. Sudut Membulat (*Border Radius*)
- **Modal & Layar Penuh**: `rounded-3xl` s/d `rounded-[2.5rem]` (24px – 32px)
- **Kartu Latihan & Kontainer**: `rounded-3xl` (24px)
- **Tombol & Kotak Input**: `rounded-2xl` (16px) atau `rounded-full`
- **Badge & Chip Filter**: `rounded-xl` (12px) atau `rounded-full`

### B. Target Sentuh (*Touch Target Size*)
- **Tombol Utama**: Tinggi minimal **44px – 48px** (`h-11` s/d `h-12`).
- **Tombol Icon (Check/Timer/Options)**: Minimal **40px × 40px** (`w-10 h-10` s/d `w-11 h-11`).

### C. Penanganan Status Bar & Safe Area (*APK Notch Protection*)
Semua modal layar penuh (`ImmersiveWorkout`, `SettingsModal`, `CommunityTab`, `BottomSheet`) **WAJIB** menyertakan padding aman sistem:
```jsx
// Atas (Status Bar / Notch):
style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 24px))' }}

// Bawah (Home Indicator Bar):
style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))' }}
```

---

## 5. Aturan Larangan Keras (*Strict Restrictions*)

1. ❌ **Dilarang Menambahkan Warna Hex Acak**: Semua styling warna harus merujuk ke token tema `t.bgAccent`, `t.textMain`, `t.border`, atau warna semantik resmi di atas.
2. ❌ **Dilarang Font Terlalu Kecil & Arbitrary**: Jangan gunakan `text-[8px]`, `text-[9px]`, atau font arbitrary. Semua teks wajib menggunakan 3 hierarki baku berbasis `rem` (`.h1`, `.h2`, `.h3`, `.body-lg`, `.body-md`, `.caption`).
3. ❌ **HARAM Redundansi Ikon & Emoji (*No Duplicate Visuals*)**:
   - DILARANG menaruh ikon Lucide di kiri sekaligus emoji dot di teks baris yang sama (Contoh salah: `[Icon Zap] 🟢 Prima`). Pilih SATU representasi visual saja!
   - DILARANG menaruh emoji mengambang dekoratif tanpa fungsi di atas judul modal (Contoh salah: `⚡` di atas `Kondisi Badan`).
4. ❌ **HARAM Copywriting Panjang & Bertele-Tele (*Concise & Action-Oriented*)**:
   - Seluruh teks modal, kartu, dan opsi wajib padat, to-the-point, dan hemat ruang.
   - Judul maksimal 1–4 kata, subjudul/deskripsi 1 baris singkat.
5. ❌ **Dilarang Menggunakan Abu-Abu Mati (*Dull Flat Grey*)**: Selalu gunakan warna bernuansa kaca atau slate berpadu biru lembut (`text-slate-400`, `bg-white/[0.045]`, `border-white/10`).
6. ❌ **Dilarang Mencampur Bahasa**: String UI harus 100% mengikuti setelan bahasa aktif (`lang.id` untuk Indonesia atau `lang.en` untuk English).

---
*Dokumen ini merupakan standar baku desain Logym App v1.2+.*
