/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PanduanBagian {
  id: string;
  nomor: number;
  judul: string;
  ringkasan: string;
  kontenTeks: string[];
  tabel?: {
    header: string[];
    baris: string[][];
  };
  tips?: string[];
}

export const VERSI_PANDUAN = 'Panduan v1.0';
export const VERSI_APLIKASI = 'v1.0.0';

export const PANDUAN_DATA: PanduanBagian[] = [
  {
    id: 'mulai-cepat',
    nomor: 1,
    judul: 'Mulai Cepat',
    ringkasan: 'Alur kerja 6 langkah untuk menemukan, memvalidasi, dan mengelola ide niche komersial.',
    kontenTeks: [
      '1. Buka tab Cari, pilih tipe aset (Foto nyata, Foto AI, atau Ilustrasi AI), isi tema jika ada, dan pilih momen musiman bila relevan.',
      '2. Ketuk tombol "Cari Ide Niche" dan tunggu proses penelusuran grounding selesai.',
      '3. Baca lencana Bukti pada tiap kartu kandidat, lalu buka sumber tautan untuk memastikan klaim tren.',
      '4. Ketuk "Pantau" pada kandidat yang layak diproduksi, dan "Buang" pada ide yang tidak sesuai preferensi.',
      '5. Kelola kandidat terpilih di tab Shortlist, beri catatan pribadi atau tag untuk pengorganisasian studio.',
      '6. Ekspor hasil ke CSV UTF-8 atau salin kata kunci bahasa Inggris untuk digunakan langsung saat memproduksi dan mengunggah aset ke agensi microstock.',
    ],
    tips: [
      'Gunakan tombol Salin pada kata kunci bahasa Inggris untuk kemudahan memasukkan metadata di agensi stok.',
      'Pencarian dengan parameter sama dalam 24 jam akan menggunakan cache lokal (0 panggilan API).',
    ],
  },
  {
    id: 'lingkup-aplikasi',
    nomor: 2,
    judul: 'Apa yang Dilakukan dan Tidak Dilakukan Aplikasi',
    ringkasan: 'Batasan sistem, prinsip keterbukaan sumber, dan tanggung jawab pengguna.',
    kontenTeks: [
      'Yang Dilakukan Aplikasi:',
      '• Mencari konsep niche komersial berdasarkan penelusuran web nyata menggunakan Google Search grounding.',
      '• Memetakan kutipan sumber (grounding metadata) ke setiap kandidat ide secara transparan.',
      '• Menghitung kualitas bukti, cakupan dukungan, dan keunikan domain 100% oleh kode deterministik (bukan dikarang AI).',
      '• Mendeteksi risiko merek dagang (trademark) terhadap daftar pantauan merek populer secara otomatis.',
      '• Menyediakan kalender musiman dengan perhitungan jendela unggah ideal 120-60 hari sebelum puncak momen.',
      'Yang Tidak Dilakukan Aplikasi:',
      '• Aplikasi ini BUKAN jaminan penjualan di agensi microstock (Adobe Stock, Shutterstock, Freepik, Getty, iStock, dll).',
      '• AI tidak pernah mengarang angka volume pencarian, jumlah unduhan, statistik pasar, atau data penjualan riil.',
      '• URL sumber tidak pernah diambil (fetched) dari server; semua tautan murni berasal dari metadata penelusuran resmi.',
      '• Aplikasi tidak menjamin legalitas komersial secara hukum; Anda tetap bertanggung jawab penuh atas hak cipta, merek dagang, dan rilis properti/model.',
    ],
  },
  {
    id: 'membaca-kartu',
    nomor: 3,
    judul: 'Cara Membaca Kartu Kandidat',
    ringkasan: 'Penjelasan elemen visual pada kartu ide dari nomor, kata kunci, hingga saran sudut pengambilan.',
    kontenTeks: [
      'Setiap kartu kandidat memuat data terstruktur hasil audit kode:',
      '• Nomor Urut (#1, #2, dst): Urutan kemunculan ide dalam sesi pencarian.',
      '• Konsep Varian ID: Judul konsep dalam bahasa Indonesia untuk memudahkan pemahaman ide.',
      '• Kata Kunci EN (English Keyword): Kata kunci komersial dalam bahasa Inggris yang dioptimalkan untuk mesin pencari microstock. Ketuk tombol "Salin" untuk langsung menyalin ke papan klip.',
      '• Lencana Bukti & Cakupan: Status pembuktian sumber berdasarkan jumlah domain rujukan dan cakupan teks.',
      '• Saran Permintaan (1-5): Nilai estimasi permintaan yang dihitung kode. Jika tanpa sumber rujukan, nilai ini dikunci menjadi null (Tidak Tersedia).',
      '• Kebutuhan Pembeli & Sinyal Tren: Analisis alasan pembeli membutuhkan visual ini beserta sinyal tren industri yang mendasarinya.',
      '• Saran Sudut Pengambilan: Rekomendasi teknis yang terdiri dari Copy Space (ruang kosong teks), Konteks Lokal (sentuhan budaya lokal), dan Gaya Visual (pencahayaan, komposisi).',
      '• Tautan Sumber: Daftar URL tempat klaim tren ini ditemukan pada indeks web.',
    ],
  },
  {
    id: 'lencana-bukti',
    nomor: 4,
    judul: 'Lencana Bukti & Cakupan Dukungan',
    ringkasan: 'Tolak ukur matematis yang dihitung kode untuk memastikan keterlacakan rujukan web.',
    kontenTeks: [
      'Label bukti tidak ditentukan oleh AI melainkan dihitung secara deterministik oleh kode program berdasarkan metadata penelusuran Google Search grounding:',
      'Klasifikasi Lencana Bukti:',
    ],
    tabel: {
      header: ['Lencana', 'Syarat Kode (Default)', 'Arti & Rekomendasi'],
      baris: [
        [
          'KUAT',
          'Domain unik >= 3 DAN Cakupan >= 50%',
          'Rujukan sangat kokoh dari berbagai sumber independen. Sangat direkomendasikan untuk dipertimbangkan.',
        ],
        [
          'SEDANG',
          'Domain unik >= 2',
          'Ditopang minimal 2 domain berbeda. Memiliki landasan rujukan yang layak dieksplorasi.',
        ],
        [
          'LEMAH',
          'Domain unik = 1',
          'Hanya didukung 1 domain. Periksa apakah sumber kredibel atau sekadar opini tunggal.',
        ],
        [
          'TANPA SUMBER',
          'Domain unik = 0',
          'Tidak ada kutipan penelusuran web langsung. Evaluasi dengan ekstra hati-hati sebelum memproduksi.',
        ],
      ],
    },
    tips: [
      'Status Cakupan Dukungan: "Didukung Sumber" (cakupan >= 60%), "Dukungan Sebagian" (cakupan 20% - 59%), dan "Tidak Didukung Sumber" (cakupan < 20% atau tanpa rujukan).',
      'Catatan Audit Kredibilitas: Dua domain berbeda belum tentu dua penerbit independen (bisa berada di bawah grup media yang sama). Gunakan akal sehat dan buka tautan sumber untuk verifikasi mandiri.',
    ],
  },
  {
    id: 'saran-permintaan',
    nomor: 5,
    judul: 'Saran Permintaan',
    ringkasan: 'Estimasi nilai 1-5 yang dikunci oleh kode deterministik dan penolakan manipulasi angka.',
    kontenTeks: [
      'Prinsip Utama Saran Permintaan:',
      '• Angka saran permintaan (skala 1 sampai 5) dihitung 100% oleh KODE, BUKAN oleh model AI.',
      '• AI dilarang keras mengarang angka statistik, volume unduhan, atau tanggal.',
      '• Jika kandidat tidak memiliki sumber rujukan (0 domain), nilai saran permintaan otomatis dikunci menjadi NULL (Tidak Tersedia).',
      '• Formula kode memperhitungkan bobot keberagaman domain, rasio cakupan teks grounded, dan relevansi kata kunci.',
      '• Nilai ini berfungsi sebagai panduan komparatif relatif antar ide dalam satu sesi, bukan jaminan angka penjualan riil di agensi stok.',
    ],
  },
  {
    id: 'penanda-merek',
    nomor: 6,
    judul: 'Penanda Merek dan Kepatuhan',
    ringkasan: 'Pencegahan pelanggaran hak cipta, merek dagang, dan pedoman kepatuhan microstock komersial.',
    kontenTeks: [
      'Agensi microstock memiliki kebijakan tanpa toleransi terhadap pelanggaran merek dagang pada aset komersial.',
      'Lencana "Periksa Merek" akan otomatis menyala jika judul atau kata kunci kandidat memuat istilah dalam daftar pantauan merek (seperti Apple, iPhone, Nike, Disney, Lego, Barbie, GoPro, Vespa, dsb).',
      'Langkah Kepatuhan yang Harus Dilakukan:',
      '1. Jangan gunakan nama merek terdaftar pada judul, deskripsi, atau kata kunci (keywords) aset komersial Anda.',
      '2. Saat memproduksi foto nyata atau ilustrasi, pastikan tidak ada logo, emblem, atau desain produk berhak cipta yang terlihat.',
      '3. Gunakan konsep generik: ganti "iPhone 16" menjadi "modern smartphone with blank screen", ganti "Vespa matic" menjadi "classic vintage scooter".',
      '4. Untuk foto nyata yang tak terhindarkan memuat merek di ruang publik, unggah sebagai lisensi Editorial jika agensi microstock Anda menyediakannya.',
    ],
  },
  {
    id: 'momen-musiman',
    nomor: 7,
    judul: 'Momen Musiman dan Jendela Unggah',
    ringkasan: 'Strategi waktu pengunggahan 120-60 hari sebelum puncak momen komersial.',
    kontenTeks: [
      'Pembeli microstock (desainer, tim periklanan, korporat) mencari dan mengunduh aset kampanye 1 hingga 3 bulan sebelum momen berlangsung.',
      'Jendela Unggah Ideal: 120 sampai 60 hari sebelum tanggal puncak momen.',
      'Status Jendela Musiman (Dihitung Kode):',
      '• Sedang di jendela (60 - 120 hari sebelum puncak): WAKTU TERBAIK untuk memproduksi dan mengunggah aset saat ini.',
      '• Masuk jendela dalam 30 hari (121 - 150 hari sebelum puncak): Segera rencanakan konsep agar siap diproduksi saat jendela dibuka.',
      '• Belum dibuka (> 150 hari sebelum puncak): Masih terlalu dini untuk musim ini.',
      '• Jendela sudah lewat (< 60 hari sebelum puncak atau sudah lewat): Waktu review agensi stok membutuhkan waktu; sistem otomatis menargetkan musim tahun berikutnya.',
      '• Tanggal belum diisi: Momen bergeser (Ramadan, Idulfitri, Imlek, Back to School). Silakan atur tanggal puncak yang akurat di tab Kalender.',
    ],
    tips: [
      'Black Friday selalu dihitung otomatis oleh kode: hari Jumat tepat setelah hari Kamis keempat bulan November.',
      'Anda dapat mengetuk tombol "Gunakan Momen Ini untuk Mencari Ide" di tab Kalender untuk langsung memuat momen ke formulir pencarian.',
    ],
  },
  {
    id: 'kuota-dan-cache',
    nomor: 8,
    judul: 'Kuota Panggilan dan Sistem Cache',
    ringkasan: 'Pengendalian biaya API, reset harian otomatis, dan efisiensi cache 24 jam.',
    kontenTeks: [
      'Pengendalian Kuota:',
      '• Batas panggilan harian default adalah 50 panggilan per hari (dapat disesuaikan di tab Pengaturan).',
      '• Satu pencarian sukses dihitung tepat satu kali panggilan.',
      '• Penghitung otomatis direset setiap pergantian tanggal lokal (pukul 00:00 waktu setempat).',
      '• Peringatan akan muncul saat mendekati batas (>= 80%), dan sistem memberikan konfirmasi peringatan lunak jika kuota terlampaui.',
      'Sistem Cache Lokal 24 Jam:',
      '• Pencarian dengan parameter yang identik (tipe aset, tema, momen, dan jumlah kandidat) akan disimpan di cache peramban selama 24 jam.',
      '• Membuka kembali pencarian yang sama akan memuat instan dari cache dengan 0 panggilan API.',
      '• Anda dapat mencentang "Abaikan cache" di formulir pencarian jika ingin memaksa penelusuran baru ke Google Search.',
    ],
  },
  {
    id: 'data-dan-privasi',
    nomor: 9,
    judul: 'Data dan Privasi',
    ringkasan: 'Arsitektur data 100% lokal, tanpa pelacak pihak ketiga, dan keamanan kode akses.',
    kontenTeks: [
      'Privasi Pengguna:',
      '• Seluruh data riwayat pencarian, kandidat yang dipantau (Shortlist), momen musiman, dan konfigurasi tersimpan aman di memori lokal peramban Anda (localStorage).',
      '• Tidak ada pengumpulan data pribadi, pelacak analitik invasif, atau iklan pihak ketiga.',
      '• API key Gemini hanya berada di sisi peladen (process.env.GEMINI_API_KEY) dan tidak pernah dibocorkan ke kode klien atau respons jaringan.',
      '• Fitur Kode Akses (Passcode) diverifikasi di server menggunakan pembandingan timing-safe (crypto.timingSafeEqual) untuk mencegah serangan timing analysis.',
      'Cadangan & Pemulihan:',
      '• Anda dapat mengekspor seluruh basis data ke berkas JSON kapan saja melalui tab Pengaturan untuk dicadangkan atau dipindahkan antar perangkat.',
      '• Format impor mendukung mode Timpa Bersih maupun Gabung Cerdas (Merge).',
    ],
  },
  {
    id: 'pemecahan-masalah',
    nomor: 10,
    judul: 'Pemecahan Masalah (Troubleshooting)',
    ringkasan: 'Solusi cepat untuk kendala umum mulai dari galat jaringan hingga kuota penyimpanan penuh.',
    kontenTeks: [
      'Berikut adalah rangkuman masalah umum dan langkah penyelesaiannya:',
    ],
    tabel: {
      header: ['Masalah', 'Kemungkinan Penyebab', 'Solusi'],
      baris: [
        [
          'Galat 401 (Tidak Diizinkan)',
          'Kode akses belum dimasukkan atau salah.',
          'Buka dialog kode akses atau masukkan kode akses yang tepat di tab Pengaturan sesuai setelan peladen.',
        ],
        [
          'Pencarian Menghasilkan 0 Ide',
          'Tema terlalu spesifik atau penelusuran web tidak menemukan sinyal.',
          'Kosongkan kolom tema untuk melihat tren umum, atau perluas kata kunci tema Anda.',
        ],
        [
          'Penyimpanan Lokal Penuh',
          'Riwayat pencarian atau kandidat telah mencapai batas kapasitas kuota peramban.',
          'Buka Pengaturan -> Gunakan "Pangkas Riwayat Lama" atau cadangkan JSON lalu bersihkan riwayat.',
        ],
        [
          'Aplikasi lambat di iPhone Safari',
          'Memori peramban Safari penuh.',
          'Segarkan (refresh) halaman, tutup tab yang tidak digunakan, dan pastikan skala kenyamanan diatur 70%.',
        ],
        [
          'PWA Tidak Ada Tombol Pasang di iOS',
          'Safari iOS tidak menyediakan API instalasi otomatis.',
          'Ketuk tombol "Bagikan" (ikon kotak panah ke atas) di menu Safari, lalu pilih "Tambahkan ke Layar Utama" (Add to Home Screen).',
        ],
      ],
    },
  },
];

export const CATATAN_PERUBAHAN = [
  {
    versi: 'v1.0.0 (Tahap 1 s/d Tahap 7)',
    tanggal: 'Oktober 2026',
    poin: [
      'Tahap 1: Kerangka navigasi 5-tab, kontrak data resmi (schema_version = 1), dan skala antarmuka responsif 375px.',
      'Tahap 2: Inti pencarian grounded dengan Gemini & Google Search Grounding, batas harian, dan cache 24 jam.',
      'Tahap 3: Kualitas bukti matematis oleh kode (domain unik, cakupan dukungan, deduplikasi cerdas, dan deteksi merek dagang).',
      'Tahap 4: Manajemen Shortlist, catatan pribadi, tag, riwayat 50 pencarian, ekspor CSV UTF-8 dengan BOM, dan ekspor/impor cadangan JSON penuh.',
      'Tahap 5: Kalender Musiman Mini dengan formula jendela unggah ideal 120-60 hari, dukungan tanggal tetap & bergeser, dan integrasi sekali ketuk ke pencarian.',
      'Tahap 6: Serverless deployment Vercel ready, timing-safe passcode security, PWA installable dengan service worker offline fallback.',
      'Tahap 7: Panduan interaktif dalam aplikasi dengan pencarian teks, sorotan, daftar isi accordion, tautan bantuan cerdas (?), dan kartu Mulai Cepat.',
    ],
  },
];
