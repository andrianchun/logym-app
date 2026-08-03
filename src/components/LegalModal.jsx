/* eslint-disable react/prop-types, react/no-unescaped-entities, no-unused-vars */
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const sharedTerms = (t) => (
  <>
    <h3 className={`text-lg font-bold mt-6 mb-2 ${t.textMain}`}>Ketentuan Umum & Komunitas</h3>
    <p className={`text-xs mb-3 italic ${t.textMuted}`}>Berlaku untuk seluruh ekosistem Hexa-Life.</p>
    
    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>1. Konten Buatan Pengguna (User-Generated Content)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Untuk fitur sosial dan komunitas (seperti membagikan rutinitas, mengirim komentar, atau mengunggah foto):<br/>
    - Anda bertanggung jawab penuh atas segala konten yang Anda unggah.<br/>
    - Pihak Pengembang tidak memiliki kewajiban untuk memantau setiap konten pengguna, namun memegang hak penuh (tanpa pemberitahuan) untuk menghapus konten yang dianggap melanggar norma, ilegal, atau menyinggung.<br/>
    - Anda membebaskan Pihak Pengembang dari segala tuntutan pencemaran nama baik, pelanggaran hak cipta, atau kerugian lain yang diakibatkan oleh konten pengguna lain di dalam komunitas.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>2. Penghentian & Penangguhan Akun</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Kami memiliki hak mutlak untuk memblokir, menangguhkan, atau menghapus akun Anda secara sepihak kapan saja, dengan atau tanpa alasan, dan tanpa pemberitahuan sebelumnya. Pihak Pengembang tidak bertanggung jawab atas hilangnya data Anda akibat pemblokiran akun.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>3. Layanan Pihak Ketiga & Keadaan Kahar (Force Majeure)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Aplikasi kami mengandalkan infrastruktur pihak ketiga (seperti server Google Firebase, API Health Connect, dan pemrosesan AI Gemini). Pihak Pengembang tidak bertanggung jawab atas kebocoran data, pemadaman server (downtime), atau kegagalan sistem yang diakibatkan oleh hacker, bencana alam, maupun kelalaian dari vendor pihak ketiga tersebut.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>4. Batasan Usia (Age Restriction)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Aplikasi ini hanya boleh digunakan oleh individu yang telah memenuhi batas usia persetujuan digital di yurisdiksinya (umumnya 13 tahun ke atas). Jika Anda mendapati anak di bawah umur menggunakan aplikasi ini tanpa pengawasan orang tua, segala risiko kesehatan dan pemrosesan data adalah tanggung jawab orang tua/wali sah.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>5. Hak Kekayaan Intelektual (Intellectual Property)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Semua aset, desain, algoritma, merek dagang, serta kode sumber aplikasi adalah hak milik eksklusif Pihak Pengembang. Anda dilarang keras merekayasa balik (reverse engineering), menyalin, atau mendistribusikan ulang bagian mana pun dari aplikasi ini tanpa izin tertulis.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>6. Ketidaktersediaan Jaminan Pemulihan Data</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Kami tidak memiliki kewajiban hukum untuk memulihkan, mengembalikan, atau menyelamatkan data Anda (termasuk riwayat olahraga) yang terhapus akibat glitch sistem, penghapusan akun oleh Anda sendiri, maupun pemblokiran oleh sistem kami.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>7. Tautan dan Entitas Pihak Ketiga</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Tautan ke situs web pihak ketiga, produk suplemen, atau merek alat olahraga yang mungkin muncul di komunitas atau dari bot AI, sepenuhnya berada di luar kendali kami. Kami tidak mendukung atau menjamin produk pihak ketiga tersebut.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>8. Transfer Data Internasional</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Dengan menggunakan aplikasi ini, Anda memberikan persetujuan tanpa batas agar data Anda diproses, ditransfer, dan disimpan di server yang mungkin berlokasi di luar negara asal Anda (misalnya server Google di Amerika Serikat).</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>9. Pengesampingan Gugatan Berkelompok (Class Action Waiver)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Setiap proses penyelesaian sengketa akan dilakukan hanya atas dasar individu dan bukan dalam gugatan perwakilan atau kelompok (Class Action).</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>10. Batas Maksimal Ganti Rugi (Cap on Liability)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Apabila pengadilan memutuskan Pihak Pengembang tetap harus bertanggung jawab atas suatu kerugian, maka Anda setuju bahwa total kewajiban finansial maksimal Pihak Pengembang dibatasi maksimal sebesar Rp150.000 (Seratus Lima Puluh Ribu Rupiah) atau setara nilai US$10, atau sebesar total yang Anda bayarkan kepada aplikasi ini selama 12 bulan terakhir (mana yang lebih kecil).</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>11. Batas Waktu Tuntutan (Statute of Limitations)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Anda setuju bahwa setiap klaim atau dasar gugatan yang timbul dari aplikasi ini harus diajukan dalam waktu 1 (satu) tahun setelah dasar gugatan tersebut muncul, atau hak tuntutan tersebut hangus untuk selamanya.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>12. Kepemilikan Umpan Balik (Feedback & Idea Assignment)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Segala bentuk saran, umpan balik, ide fitur, atau laporan bug yang Anda berikan bersifat sukarela. Kami sepenuhnya berhak mengimplementasikan ide tersebut tanpa kewajiban memberikan royalti atau kompensasi finansial apa pun kepada Anda.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>13. Kepatuhan Hukum Ekspor & Sanksi</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Anda menyatakan dan menjamin bahwa Anda tidak berlokasi di negara yang terkena embargo pemerintah, dan tidak tercantum dalam daftar pihak terlarang atau dibatasi.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>14. Perubahan Syarat & Ketentuan</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Pihak Pengembang berhak untuk memodifikasi atau memperbarui S&K serta Kebijakan Privasi ini kapan saja tanpa pemberitahuan eksplisit langsung. Penggunaan aplikasi yang terus-menerus merupakan bentuk persetujuan mengikat Anda terhadap ketentuan yang baru.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>15. Klausul Kelangsungan (Survival Clause)</h4>
    <p className={`text-sm mb-8 ${t.textMuted}`}>Ketentuan mengenai Penolakan Tanggung Jawab, Pembatasan Tanggung Jawab Mutlak, Batas Maksimal Ganti Rugi, Pelepasan Tuntutan, dan Penyelesaian Sengketa akan tetap berlaku selamanya, bahkan apabila Anda telah menghapus aplikasi atau menghapus akun.</p>
  </>
);

const TosContent = ({ t }) => (
  <div>
    <h2 className={`text-2xl font-black mb-1 ${t.textMain}`}>Syarat & Ketentuan</h2>
    <p className={`text-xs mb-6 ${t.textMuted}`}>Terakhir Diperbarui: 2 Agustus 2026</p>

    <p className={`text-sm mb-4 ${t.textMain}`}>Dengan menggunakan aplikasi <strong>Logym</strong>, Anda secara tegas menyetujui seluruh ketentuan berikut tanpa terkecuali. Jika Anda tidak setuju, mohon segera hentikan penggunaan aplikasi ini.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>1. Penolakan Tanggung Jawab Medis & Profesional</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Logym dirancang murni sebagai perangkat lunak pencatat dan perencana kebugaran. <strong>Aplikasi ini BUKAN pengganti tenaga medis, terapis fisik, dokter rehabilitasi, maupun pelatih kebugaran profesional (personal trainer).</strong> Segala keputusan untuk mengikuti rutinitas angkat beban yang disarankan adalah risiko Anda sendiri. Anda diwajibkan untuk berkonsultasi dengan profesional sebelum melakukan aktivitas fisik.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>2. Penggunaan Kecerdasan Buatan (AI)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Semua rekomendasi volume latihan dan program yang dihasilkan oleh AI disajikan berdasarkan kalkulasi matematis. Kami tidak menjamin keakuratan, kecocokan, atau keamanannya bagi kondisi fisiologis individu.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>3. Pembatasan Tanggung Jawab (Limitation of Liability)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}><strong>SEJAUH DIIZINKAN OLEH HUKUM</strong>, pengembang dan afiliasi dari aplikasi Logym <strong>TIDAK AKAN BERTANGGUNG JAWAB</strong> atas kerugian langsung, tidak langsung, insidental, atau konsekuensial, termasuk cedera fisik, cacat, kematian, gangguan psikologis, kehilangan data, atau kerugian finansial. Segala aktivitas yang Anda lakukan merupakan risiko dan tanggung jawab mutlak Anda.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>4. Tidak Ada Jaminan Hasil (No Guarantee of Results)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Kami sama sekali tidak menjamin hasil tertentu (seperti hipertrofi otot atau penurunan berat badan). Hasil kebugaran sangat bergantung pada faktor genetika, nutrisi, dedikasi, dan kondisi tubuh masing-masing individu.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>5. Penyediaan Layanan "Apa Adanya" (As-Is)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Layanan ini disediakan secara "AS-IS" (apa adanya) tanpa jaminan dalam bentuk apa pun. Pihak Pengembang tidak menjamin aplikasi ini akan bebas dari bug, error, atau gangguan layanan.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>6. Pelepasan Tuntutan (Indemnification)</h4>
    <p className={`text-sm mb-6 ${t.textMuted}`}>Anda setuju untuk melepaskan, membebaskan, dan membela Pihak Pengembang dari segala bentuk klaim, tuntutan hukum, gugatan, atau biaya ganti rugi yang diajukan oleh Anda atau pihak ketiga mana pun sebagai akibat dari penggunaan aplikasi ini.</p>

    {sharedTerms(t)}
  </div>
);

const PrivacyContent = ({ t }) => (
  <div>
    <h2 className={`text-2xl font-black mb-1 ${t.textMain}`}>Kebijakan Privasi</h2>
    <p className={`text-xs mb-6 ${t.textMuted}`}>Terakhir Diperbarui: 2 Agustus 2026</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>1. Pengumpulan & Pemrosesan Data</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Logym memproses dan menyimpan data metrik Anda (seperti tinggi, berat, riwayat set/repetisi) untuk keperluan aplikasi. Kami memproses data ini secara lokal dan/atau melalui integrasi cloud terenkripsi (Firebase).</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>2. Integrasi Data Kesehatan (Health Connect / Apple Health)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Kami hanya mengakses sensor detak jantung, jumlah langkah, dan metrik kalori terbakar jika Anda memberikan izin eksplisit pada sistem operasi Anda. Data ini <strong>tidak dijual</strong> dan hanya digunakan untuk analitik kebugaran internal Anda.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>3. Pemrosesan Data via Pihak Ketiga (AI)</h4>
    <p className={`text-sm mb-3 ${t.textMuted}`}>Beberapa preferensi latihan akan dikirim secara sekuensial kepada penyedia layanan AI (Google Gemini) untuk memberikan rekomendasi program. Anda dilarang memasukkan Informasi Identitas Pribadi (PII) atau informasi rahasia ke dalam prompt atau fitur tanya-jawab AI. Segala pelanggaran privasi akibat kelalaian Anda memasukkan PII ke dalam bot AI berada di luar tanggung jawab kami.</p>

    <h4 className={`text-sm font-bold mt-4 mb-1 ${t.textMain}`}>4. Penelitian, Analitik, & Penggunaan Data Anonim</h4>
    <p className={`text-sm mb-8 ${t.textMuted}`}>Pihak Pengembang berhak melakukan agregasi, de-identifikasi (menganonimkan), dan mengumpulkan data penggunaan aplikasi Anda (termasuk metrik otot, volume latihan, dan demografi dasar). Data anonim ini dapat digunakan, dibagikan, atau dipublikasikan untuk keperluan penelitian ilmiah, analitik komersial, studi akademis, maupun peningkatan fitur produk tanpa kewajiban kompensasi apa pun kepada Anda.</p>

    {sharedTerms(t)}
  </div>
);

export default function LegalModal({ type, onClose, t, isDark }) {
  if (!type) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] w-full h-[100dvh] flex flex-col overflow-hidden ${isDark ? 'bg-[#0f0f0f]' : 'bg-white'} animate-in slide-in-from-bottom-8 duration-300 ease-out`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 pt-safe sm:pt-4 border-b ${isDark ? 'border-white/10' : 'border-black/5'}`}>
        <h3 className={`font-bold text-lg ${t.textMain}`}>
          {type === 'tos' ? 'Syarat & Ketentuan' : 'Kebijakan Privasi'}
        </h3>
        <button
          onClick={onClose}
          className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-black/5 text-black/50 hover:text-black'}`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 pb-10 hide-scrollbar overscroll-contain">
        {type === 'tos' ? <TosContent t={t} /> : <PrivacyContent t={t} />}
      </div>

      {/* Footer */}
      <div className={`p-4 pb-safe sm:pb-4 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
        <button
          onClick={onClose}
          className={`w-full py-3.5 rounded-2xl font-bold transition-all active:scale-[0.98] bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20`}
        >
          Saya Mengerti
        </button>
      </div>
    </div>,
    document.body
  );
}
