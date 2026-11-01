/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HasilJendelaMomen, Momen, StatusJendelaMomen } from '../types.ts';

/**
 * Daftar Momen Awal Resmi Tahap 5:
 * - Tanggal tetap (terisi otomatis): Tahun Baru, Valentine, Hari Kemerdekaan RI, Halloween, Natal, Black Friday.
 * - Tanggal bergeser (BIARKAN KOSONG dan beri peringatan "Isi dan verifikasi tanggal puncak"):
 *   Ramadan, Idulfitri/Lebaran, Idul Adha, Imlek, Back to School.
 */
export const MOMEN_DEFAULT_TAHAP5: Momen[] = [
  {
    id: 'tahun_baru',
    nama: 'Tahun Baru',
    tanggal_puncak: '2027-01-01',
    tetap: true,
    aktif: true,
    deskripsi: 'Perayaan pergantian tahun global, resolusi, pesta, dan kalender.',
  },
  {
    id: 'valentine',
    nama: 'Hari Valentine',
    tanggal_puncak: '2027-02-14',
    tetap: true,
    aktif: true,
    deskripsi: 'Hari kasih sayang, kartu ucapan, cokelat, romansa, dan hadiah.',
  },
  {
    id: 'kemerdekaan_ri',
    nama: 'Hari Kemerdekaan RI',
    tanggal_puncak: '2027-08-17',
    tetap: true,
    aktif: true,
    deskripsi: 'HUT RI kebangsaan, lomba 17 Agustus, merah putih, dan patriotisme.',
  },
  {
    id: 'halloween',
    nama: 'Halloween',
    tanggal_puncak: '2026-10-31',
    tetap: true,
    aktif: true,
    deskripsi: 'Kostum horor, pesta labu, trick-or-treat, dan tema spooky.',
  },
  {
    id: 'natal',
    nama: 'Hari Raya Natal',
    tanggal_puncak: '2026-12-25',
    tetap: true,
    aktif: true,
    deskripsi: 'Perayaan Natal keluarga, pohon natal, dekorasi musim dingin, dan belanja liburan.',
  },
  {
    id: 'black_friday',
    nama: 'Black Friday / Cyber Week',
    tanggal_puncak: '2026-11-27', // Dihitung dinamis per tahun oleh kode
    tetap: true,
    aktif: true,
    deskripsi: 'Musim diskon belanja ritel & online terbesar akhir tahun (Jumat setelah Kamis ke-4 November).',
  },
  // Tanggal bergeser (BIARKAN KOSONG dan beri peringatan "Isi dan verifikasi tanggal puncak")
  {
    id: 'ramadan',
    nama: 'Ramadan',
    tanggal_puncak: null,
    tetap: false,
    aktif: true,
    deskripsi: 'Bulan suci puasa umat Muslim, sahur, ngabuburit, dan spiritualitas.',
  },
  {
    id: 'idulfitri',
    nama: 'Idulfitri / Lebaran',
    tanggal_puncak: null,
    tetap: false,
    aktif: true,
    deskripsi: 'Hari raya kemenangan, mudik lebaran, kuliner ketupat, dan silaturahmi keluarga.',
  },
  {
    id: 'idul_adha',
    nama: 'Idul Adha',
    tanggal_puncak: null,
    tetap: false,
    aktif: true,
    deskripsi: 'Hari raya kurban, ibadah haji, dan kebersamaan umat.',
  },
  {
    id: 'imlek',
    nama: 'Tahun Baru Imlek',
    tanggal_puncak: null,
    tetap: false,
    aktif: true,
    deskripsi: 'Perayaan tahun baru Tionghoa, lampion merah, shio, angpao, dan pesta keluarga.',
  },
  {
    id: 'back_to_school',
    nama: 'Kembali ke Sekolah (Back to School)',
    tanggal_puncak: null,
    tetap: false,
    aktif: true,
    deskripsi: 'Tahun ajaran baru, perlengkapan belajar, seragam, dan edukasi.',
  },
];

/**
 * Aturan Tahap 5: Hitung tanggal Black Friday secara pasti melalui kode:
 * Jumat setelah Kamis keempat November.
 */
export function hitungBlackFriday(tahun: number): string {
  // 1 November tahun target (UTC agar bebas offset lokal)
  const nov1 = new Date(Date.UTC(tahun, 10, 1)); // Month index 10 adalah November
  const dayOfWeek = nov1.getUTCDay(); // 0 = Minggu, 1 = Senin, ..., 4 = Kamis
  const selisihKeKamisPertama = (4 - dayOfWeek + 7) % 7;
  const kamisPertama = 1 + selisihKeKamisPertama;
  const kamisKeempat = kamisPertama + 21;
  const jumatBlackFriday = kamisKeempat + 1; // Hari Jumat tepat setelah Kamis ke-4

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${tahun}-11-${pad(jumatBlackFriday)}`;
}

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function parseDateParts(input: string | Date): DateParts {
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
    const d = new Date(input);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
  }
  return {
    year: input.getFullYear(),
    month: input.getMonth() + 1,
    day: input.getDate(),
  };
}

export function formatDateIso(parts: DateParts): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/**
 * Selisih hari kalender murni (bebas timezone dan DST).
 * Positif jika target di masa depan, 0 jika sama, negatif jika target di masa lalu.
 */
export function diffCalendarDays(from: DateParts, to: DateParts): number {
  const utcFrom = Date.UTC(from.year, from.month - 1, from.day);
  const utcTo = Date.UTC(to.year, to.month - 1, to.day);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utcTo - utcFrom) / msPerDay);
}

/**
 * Tambah/kurang hari kalender dari tanggal dasar
 */
export function addDays(parts: DateParts, days: number): DateParts {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const resultUtc = new Date(utc + days * 24 * 60 * 60 * 1000);
  return {
    year: resultUtc.getUTCFullYear(),
    month: resultUtc.getUTCMonth() + 1,
    day: resultUtc.getUTCDate(),
  };
}

const BULAN_INDONESIA_SINGKAT = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatTanggalIndonesia(parts: DateParts): string {
  return `${parts.day} ${BULAN_INDONESIA_SINGKAT[parts.month] || ''} ${parts.year}`;
}

export function formatRentangIndonesia(startParts: DateParts, endParts: DateParts): string {
  if (startParts.year === endParts.year) {
    if (startParts.month === endParts.month) {
      return `${startParts.day} - ${endParts.day} ${BULAN_INDONESIA_SINGKAT[startParts.month]} ${startParts.year}`;
    }
    return `${startParts.day} ${BULAN_INDONESIA_SINGKAT[startParts.month]} - ${endParts.day} ${BULAN_INDONESIA_SINGKAT[endParts.month]} ${startParts.year}`;
  }
  return `${formatTanggalIndonesia(startParts)} - ${formatTanggalIndonesia(endParts)}`;
}

/**
 * Ekstrak pola bulan dan tanggal untuk momen tetap berulang.
 */
function getFixedMonthDay(momen: Momen): { month: number; day: number } | null {
  if (momen.id === 'tahun_baru') return { month: 1, day: 1 };
  if (momen.id === 'valentine') return { month: 2, day: 14 };
  if (momen.id === 'kemerdekaan_ri') return { month: 8, day: 17 };
  if (momen.id === 'halloween') return { month: 10, day: 31 };
  if (momen.id === 'natal') return { month: 12, day: 25 };

  if (momen.tetap && momen.tanggal_puncak) {
    const parts = parseDateParts(momen.tanggal_puncak);
    return { month: parts.month, day: parts.day };
  }
  return null;
}

/**
 * Hitung Status Jendela Unggah untuk satu momen (Aturan Tahap 5).
 * Jendela ideal = 120 sampai 60 hari sebelum puncak (H-120 s/d H-60).
 * Status tiap momen:
 * - "Sedang di jendela" (60 s/d 120 hari)
 * - "Masuk jendela dalam 30 hari" (121 s/d 150 hari)
 * - "Belum dibuka" (> 150 hari)
 * - "Jendela sudah lewat (target musim berikutnya)" (< 60 hari)
 * - "Tanggal belum diisi" (jika tanggal puncak null atau kosong)
 *
 * Menerima parameter opsional `tanggalSekarang` untuk uji sistem deterministik.
 */
export function hitungJendelaMomen(
  momen: Momen,
  tanggalSekarang?: string | Date
): HasilJendelaMomen {
  // Jika tanggal puncak tidak diisi sama sekali
  if (!momen.tanggal_puncak || momen.tanggal_puncak.trim() === '') {
    return {
      momen_id: momen.id,
      nama: momen.nama,
      status: 'Tanggal belum diisi',
      hari_tersisa: null,
      target_tahun: null,
      tanggal_puncak_target: null,
      rentang_unggah_awal: null,
      rentang_unggah_akhir: null,
      rentang_label: null,
      is_musim_berikutnya: false,
    };
  }

  const today = parseDateParts(tanggalSekarang || new Date());
  const currentYear = today.year;

  // Cek apakah ini momen Black Friday (dihitung khusus per tahun)
  const isBlackFriday = momen.id === 'black_friday';
  const fixedMonthDay = getFixedMonthDay(momen);

  if (isBlackFriday) {
    const bfThisYearStr = hitungBlackFriday(currentYear);
    const bfThisYearParts = parseDateParts(bfThisYearStr);
    const diffThisYear = diffCalendarDays(today, bfThisYearParts);

    // Jika tahun ini masih >= 60 hari, evaluasi tahun ini
    if (diffThisYear >= 60) {
      let status: StatusJendelaMomen;
      if (diffThisYear <= 120) status = 'Sedang di jendela';
      else if (diffThisYear <= 150) status = 'Masuk jendela dalam 30 hari';
      else status = 'Belum dibuka';

      const windowStart = addDays(bfThisYearParts, -120);
      const windowEnd = addDays(bfThisYearParts, -60);

      return {
        momen_id: momen.id,
        nama: momen.nama,
        status,
        hari_tersisa: diffThisYear,
        target_tahun: currentYear,
        tanggal_puncak_target: formatDateIso(bfThisYearParts),
        rentang_unggah_awal: formatDateIso(windowStart),
        rentang_unggah_akhir: formatDateIso(windowEnd),
        rentang_label: formatRentangIndonesia(windowStart, windowEnd),
        is_musim_berikutnya: false,
      };
    }

    // Jika diffThisYear < 60 (termasuk sudah lewat atau tinggal < 60 hari),
    // jendela untuk musim ini sudah lewat! Target dialihkan ke tahun berikutnya.
    const bfNextYearStr = hitungBlackFriday(currentYear + 1);
    const bfNextYearParts = parseDateParts(bfNextYearStr);
    const windowStartNext = addDays(bfNextYearParts, -120);
    const windowEndNext = addDays(bfNextYearParts, -60);

    return {
      momen_id: momen.id,
      nama: momen.nama,
      status: 'Jendela sudah lewat (target musim berikutnya)',
      hari_tersisa: Math.max(0, diffThisYear), // hari tersisa ke event terdekat (misal 27 hari)
      target_tahun: currentYear + 1,
      tanggal_puncak_target: formatDateIso(bfNextYearParts),
      rentang_unggah_awal: formatDateIso(windowStartNext),
      rentang_unggah_akhir: formatDateIso(windowEndNext),
      rentang_label: formatRentangIndonesia(windowStartNext, windowEndNext),
      is_musim_berikutnya: true,
    };
  }

  // Jika ini momen tetap berulang tahunan (Tahun Baru, Valentine, Halloween, Natal, dll.)
  if (fixedMonthDay) {
    const peakThisYearParts: DateParts = {
      year: currentYear,
      month: fixedMonthDay.month,
      day: fixedMonthDay.day,
    };
    const diffThisYear = diffCalendarDays(today, peakThisYearParts);

    // Perhatikan pergantian tahun: jika momen terjadi di awal tahun (misal Tahun Baru 1 Jan)
    // dan dilihat dari akhir tahun (misal Oktober-Desember):
    // Peak tahun berjalan (1 Jan currentYear) sudah berlalu jauh di masa lalu (diffThisYear < 0).
    // Maka peak terdekat yang kita hadapi sebenarnya adalah 1 Jan (currentYear + 1)!
    if (diffThisYear < 0) {
      const peakNextYearParts: DateParts = {
        year: currentYear + 1,
        month: fixedMonthDay.month,
        day: fixedMonthDay.day,
      };
      const diffNextYear = diffCalendarDays(today, peakNextYearParts);

      if (diffNextYear >= 60) {
        let status: StatusJendelaMomen;
        if (diffNextYear <= 120) status = 'Sedang di jendela';
        else if (diffNextYear <= 150) status = 'Masuk jendela dalam 30 hari';
        else status = 'Belum dibuka';

        const windowStart = addDays(peakNextYearParts, -120);
        const windowEnd = addDays(peakNextYearParts, -60);

        return {
          momen_id: momen.id,
          nama: momen.nama,
          status,
          hari_tersisa: diffNextYear,
          target_tahun: currentYear + 1,
          tanggal_puncak_target: formatDateIso(peakNextYearParts),
          rentang_unggah_awal: formatDateIso(windowStart),
          rentang_unggah_akhir: formatDateIso(windowEnd),
          rentang_label: formatRentangIndonesia(windowStart, windowEnd),
          is_musim_berikutnya: false,
        };
      }

      // diffNextYear < 60: Berarti untuk peak yang tinggal < 60 hari ini, jendela unggahnya sudah lewat!
      // Target produksi dialihkan ke musim berikutnya lagi (currentYear + 2).
      const peakFollowingYearParts: DateParts = {
        year: currentYear + 2,
        month: fixedMonthDay.month,
        day: fixedMonthDay.day,
      };
      const windowStartFollowing = addDays(peakFollowingYearParts, -120);
      const windowEndFollowing = addDays(peakFollowingYearParts, -60);

      return {
        momen_id: momen.id,
        nama: momen.nama,
        status: 'Jendela sudah lewat (target musim berikutnya)',
        hari_tersisa: Math.max(0, diffNextYear),
        target_tahun: currentYear + 2,
        tanggal_puncak_target: formatDateIso(peakFollowingYearParts),
        rentang_unggah_awal: formatDateIso(windowStartFollowing),
        rentang_unggah_akhir: formatDateIso(windowEndFollowing),
        rentang_label: formatRentangIndonesia(windowStartFollowing, windowEndFollowing),
        is_musim_berikutnya: true,
      };
    }

    // diffThisYear >= 0
    if (diffThisYear >= 60) {
      let status: StatusJendelaMomen;
      if (diffThisYear <= 120) status = 'Sedang di jendela';
      else if (diffThisYear <= 150) status = 'Masuk jendela dalam 30 hari';
      else status = 'Belum dibuka';

      const windowStart = addDays(peakThisYearParts, -120);
      const windowEnd = addDays(peakThisYearParts, -60);

      return {
        momen_id: momen.id,
        nama: momen.nama,
        status,
        hari_tersisa: diffThisYear,
        target_tahun: currentYear,
        tanggal_puncak_target: formatDateIso(peakThisYearParts),
        rentang_unggah_awal: formatDateIso(windowStart),
        rentang_unggah_akhir: formatDateIso(windowEnd),
        rentang_label: formatRentangIndonesia(windowStart, windowEnd),
        is_musim_berikutnya: false,
      };
    }

    // diffThisYear < 60: Musim ini tinggal < 60 hari (misal Halloween 0 hari, Natal 55 hari).
    // Jendela sudah lewat untuk musim ini, target dialihkan ke tahun depan.
    const peakNextYearParts: DateParts = {
      year: currentYear + 1,
      month: fixedMonthDay.month,
      day: fixedMonthDay.day,
    };
    const windowStartNext = addDays(peakNextYearParts, -120);
    const windowEndNext = addDays(peakNextYearParts, -60);

    return {
      momen_id: momen.id,
      nama: momen.nama,
      status: 'Jendela sudah lewat (target musim berikutnya)',
      hari_tersisa: diffThisYear,
      target_tahun: currentYear + 1,
      tanggal_puncak_target: formatDateIso(peakNextYearParts),
      rentang_unggah_awal: formatDateIso(windowStartNext),
      rentang_unggah_akhir: formatDateIso(windowEndNext),
      rentang_label: formatRentangIndonesia(windowStartNext, windowEndNext),
      is_musim_berikutnya: true,
    };
  }

  // Momen tanggal khusus / bergeser yang diisi secara spesifik (misal pengguna mengisi "2027-03-10")
  const parsedPeak = parseDateParts(momen.tanggal_puncak);
  const diffDays = diffCalendarDays(today, parsedPeak);

  if (diffDays < 60) {
    // Kurang dari 60 hari atau sudah lewat
    return {
      momen_id: momen.id,
      nama: momen.nama,
      status: 'Jendela sudah lewat (target musim berikutnya)',
      hari_tersisa: Math.max(0, diffDays),
      target_tahun: parsedPeak.year + 1,
      tanggal_puncak_target: formatDateIso({ ...parsedPeak, year: parsedPeak.year + 1 }),
      rentang_unggah_awal: null,
      rentang_unggah_akhir: null,
      rentang_label: null,
      is_musim_berikutnya: true,
    };
  }

  let status: StatusJendelaMomen;
  if (diffDays <= 120) status = 'Sedang di jendela';
  else if (diffDays <= 150) status = 'Masuk jendela dalam 30 hari';
  else status = 'Belum dibuka';

  const windowStart = addDays(parsedPeak, -120);
  const windowEnd = addDays(parsedPeak, -60);

  return {
    momen_id: momen.id,
    nama: momen.nama,
    status,
    hari_tersisa: diffDays,
    target_tahun: parsedPeak.year,
    tanggal_puncak_target: formatDateIso(parsedPeak),
    rentang_unggah_awal: formatDateIso(windowStart),
    rentang_unggah_akhir: formatDateIso(windowEnd),
    rentang_label: formatRentangIndonesia(windowStart, windowEnd),
    is_musim_berikutnya: false,
  };
}

/**
 * Pengurutan prioritas untuk Tab Kalender:
 * 1. Sedang di jendela (paling mendesak)
 * 2. Masuk jendela dalam 30 hari (segera dibuka)
 * 3. Belum dibuka (masih jauh)
 * 4. Jendela sudah lewat (target musim berikutnya)
 * 5. Tanggal belum diisi (membutuhkan input pengguna)
 */
export function urutkanMomenBerdasarkanUrgensi(
  list: Array<{ momen: Momen; jendela: HasilJendelaMomen }>
): Array<{ momen: Momen; jendela: HasilJendelaMomen }> {
  const getWeight = (status: StatusJendelaMomen): number => {
    switch (status) {
      case 'Sedang di jendela':
        return 1;
      case 'Masuk jendela dalam 30 hari':
        return 2;
      case 'Belum dibuka':
        return 3;
      case 'Jendela sudah lewat (target musim berikutnya)':
        return 4;
      case 'Tanggal belum diisi':
        return 5;
      default:
        return 6;
    }
  };

  return [...list].sort((a, b) => {
    const wA = getWeight(a.jendela.status);
    const wB = getWeight(b.jendela.status);
    if (wA !== wB) return wA - wB;

    // Jika bobot sama dan ada hari tersisa, urutkan yang tersisa lebih sedikit dahulu
    if (a.jendela.hari_tersisa !== null && b.jendela.hari_tersisa !== null) {
      return a.jendela.hari_tersisa - b.jendela.hari_tersisa;
    }
    return 0;
  });
}
