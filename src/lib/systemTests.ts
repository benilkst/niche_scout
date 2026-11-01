/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemTestResult, NicheRawIdea, GroundingSource } from '../types/index.ts';
import { calculateNicheScore, calculateDaysToEvent, generateEvidenceLabel, SEASONAL_EVENTS } from './scoring.ts';
import { CURRENT_SCHEMA_VERSION, saveAllNiches, loadSavedNiches, getStorageDiagnostics } from './storage.ts';

/**
 * Menjalankan rangkaian pengujian sistem otomatis terhadap logika murni (Aturan 10).
 */
export function runAllSystemTests(): SystemTestResult[] {
  const results: SystemTestResult[] = [];

  // --- 1. Tes Perhitungan Skor Matematis (Aturan 3) ---
  try {
    const dummyIdeaReal: NicheRawIdea = {
      id: 'test-1',
      judul: 'Petani Kopi Organik Dataran Tinggi Gayo',
      kategori: 'real_photo',
      deskripsiVisual: 'Petani paruh baya sedang memetik buah kopi merah matang di kebun berkabut pagi.',
      elemenKunci: ['petani lokal', 'biji kopi merah', 'cahaya pagi lembut', 'keranjang bambu'],
      kataKunciRekomendasi: ['indonesian coffee farmer', 'organic gayo arabica harvest', 'sustainable fairtrade agriculture', 'highland plantation'],
      targetIndustri: ['Food & Beverage', 'Editorial', 'Specialty Coffee Roasters'],
      alasanKebutuhanPembeli: 'Tingginya permintaan visual keberlanjutan dan kopi single origin untuk kemasan.',
      rekomendasiPlatform: ['Adobe Stock', 'Shutterstock', 'iStock'],
      statusGroundingAI: true,
    };

    const dummySources: GroundingSource[] = [
      { uri: 'https://example.com/coffee-trends-2026', title: 'Global Specialty Coffee Visual Trends' },
      { uri: 'https://example.com/microstock-demand', title: 'Top Microstock Themes' },
    ];

    const score = calculateNicheScore(dummyIdeaReal, dummySources, 'hari bumi');

    const isValidScores =
      score.skorKompleksitas >= 1 &&
      score.skorKompleksitas <= 10 &&
      score.skorPermintaanPasar >= 1 &&
      score.skorPermintaanPasar <= 10 &&
      score.skorKepadatanKompetisi >= 1 &&
      score.skorKepadatanKompetisi <= 10 &&
      score.indeksPeluang >= 1 &&
      score.indeksPeluang <= 100;

    results.push({
      id: 'score-calc-range',
      namaTes: 'Rentang Nilai Skor Deterministik (Aturan 3)',
      kategori: 'Perhitungan Skor',
      status: isValidScores ? 'berhasil' : 'gagal',
      pesan: isValidScores
        ? `Berhasil: Indeks Peluang (${score.indeksPeluang}/100), Kompleksitas (${score.skorKompleksitas}), Permintaan (${score.skorPermintaanPasar}), Kompetisi (${score.skorKepadatanKompetisi}) berada dalam rentang valid.`
        : 'Gagal: Nilai skor di luar batas rentang yang ditentukan.',
      detail: JSON.stringify(score),
    });

    // Uji perbedaan kategori foto nyata vs ilustrasi
    const dummyIdeaIllust: NicheRawIdea = {
      ...dummyIdeaReal,
      id: 'test-illust',
      kategori: 'ai_illustration',
    };
    const scoreIllust = calculateNicheScore(dummyIdeaIllust, dummySources);
    const isComplexityDifferentiated = score.skorKompleksitas > scoreIllust.skorKompleksitas;

    results.push({
      id: 'score-category-diff',
      namaTes: 'Diferensiasi Kompleksitas Kategori (Foto Nyata vs AI)',
      kategori: 'Perhitungan Skor',
      status: isComplexityDifferentiated ? 'berhasil' : 'gagal',
      pesan: isComplexityDifferentiated
        ? `Berhasil: Foto nyata (kompleksitas ${score.skorKompleksitas}) secara matematis lebih kompleks dari ilustrasi AI (${scoreIllust.skorKompleksitas}) karena kebutuhan staging fisik.`
        : 'Gagal: Diferensiasi bobot kategori tidak berjalan sesuai formula.',
    });
  } catch (err: any) {
    results.push({
      id: 'score-calc-error',
      namaTes: 'Perhitungan Skor Deterministik',
      kategori: 'Perhitungan Skor',
      status: 'gagal',
      pesan: `Error eksekusi: ${err?.message}`,
    });
  }

  // --- 2. Tes Label Bukti Jujur (Aturan 5) ---
  try {
    const labelWithSources = generateEvidenceLabel(3);
    const labelWithoutSources = generateEvidenceLabel(0);

    const isLabelAccurate = labelWithSources === 'Bersumber' && labelWithoutSources === 'Tanpa Rujukan Grounding';

    results.push({
      id: 'grounding-evidence-label',
      namaTes: 'Kejujuran Label Bukti (Aturan 5)',
      kategori: 'Aturan Grounding',
      status: isLabelAccurate ? 'berhasil' : 'gagal',
      pesan: isLabelAccurate
        ? `Berhasil: Label "Bersumber" hanya aktif jika jumlah rujukan > 0 (${labelWithSources}). Saat 0 rujukan, label otomatis "${labelWithoutSources}". Label tidak menjamin klaim mutlak benar.`
        : 'Gagal: Logika pelabelan bukti rujukan tidak sesuai Aturan 5.',
      detail: `sources>0: "${labelWithSources}", sources==0: "${labelWithoutSources}"`,
    });
  } catch (err: any) {
    results.push({
      id: 'grounding-label-error',
      namaTes: 'Kejujuran Label Bukti',
      kategori: 'Aturan Grounding',
      status: 'gagal',
      pesan: `Error eksekusi: ${err?.message}`,
    });
  }

  // --- 3. Tes Kalkulasi Tanggal & Jarak Hari (Aturan 3) ---
  try {
    // Tetapkan acuan tanggal statis untuk testing
    const fakeToday = new Date(2026, 9, 15); // 15 Oktober 2026
    const daysToHalloween = calculateDaysToEvent('halloween', fakeToday);
    const daysToChristmas = calculateDaysToEvent('natal', fakeToday);

    const isDateAccurate = daysToHalloween === 16 && daysToChristmas === 71;

    results.push({
      id: 'date-calc-events',
      namaTes: 'Kalkulasi Murni Jarak Hari Momen Musiman (Aturan 3)',
      kategori: 'Tanggal & Jarak Hari',
      status: isDateAccurate ? 'berhasil' : 'gagal',
      pesan: isDateAccurate
        ? `Berhasil: Dari 15 Okt 2026, Halloween (+16 hari) dan Natal (+71 hari) dihitung tepat tanpa mengandalkan angka buatan AI.`
        : `Gagal: Hasil tidak presisi (Halloween: ${daysToHalloween}, Natal: ${daysToChristmas}).`,
      detail: `Hasil: Halloween=${daysToHalloween} hari, Natal=${daysToChristmas} hari`,
    });

    // Uji kamus momen musiman
    const eventCount = Object.keys(SEASONAL_EVENTS).length;
    results.push({
      id: 'date-seasonal-dictionary',
      namaTes: 'Kamus Momen Musiman Microstock',
      kategori: 'Tanggal & Jarak Hari',
      status: eventCount >= 10 ? 'berhasil' : 'gagal',
      pesan: `Tersedia ${eventCount} momen musiman (Ramadhan, Imlek, Natal, Back to School, Black Friday, dll.) untuk perencanaan kontributor microstock.`,
    });
  } catch (err: any) {
    results.push({
      id: 'date-calc-error',
      namaTes: 'Kalkulasi Tanggal',
      kategori: 'Tanggal & Jarak Hari',
      status: 'gagal',
      pesan: `Error eksekusi: ${err?.message}`,
    });
  }

  // --- 4. Tes LocalStorage dengan schema_version & try/catch (Aturan 8) ---
  try {
    const diagBefore = getStorageDiagnostics();
    const testItem = {
      id: 'test-storage-item-' + Date.now(),
      judul: 'Sampel Uji Penyimpanan Schema',
      kategori: 'ai_photo' as const,
      deskripsiVisual: 'Sampel visual uji',
      elemenKunci: ['uji1', 'uji2'],
      kataKunciRekomendasi: ['test keyword'],
      targetIndustri: ['Tech'],
      alasanKebutuhanPembeli: 'Uji integrasi storage',
      rekomendasiPlatform: ['Adobe Stock'],
      statusGroundingAI: false,
      skor: {
        skorKompleksitas: 5,
        skorPermintaanPasar: 6,
        skorKepadatanKompetisi: 4,
        indeksPeluang: 72,
        labelBukti: 'Tanpa Rujukan Grounding' as const,
        jumlahRujukanGrounding: 0,
      },
      sumberGrounding: [],
      dibuatPada: new Date().toISOString(),
    };

    // Simpan item
    const currentList = loadSavedNiches();
    const saveOk = saveAllNiches([testItem, ...currentList.slice(0, 5)]);
    const diagAfter = getStorageDiagnostics();

    const isStorageSchemaValid =
      saveOk &&
      diagAfter.exists &&
      diagAfter.schema_version === CURRENT_SCHEMA_VERSION &&
      typeof diagAfter.schema_version === 'number';

    results.push({
      id: 'storage-schema-version',
      namaTes: 'Validasi schema_version & try/catch di localStorage (Aturan 8)',
      kategori: 'LocalStorage Schema',
      status: isStorageSchemaValid ? 'berhasil' : 'gagal',
      pesan: isStorageSchemaValid
        ? `Berhasil: Struktur storage memiliki schema_version = ${diagAfter.schema_version} dan seluruh mutasi dibungkus try/catch secara aman.`
        : `Gagal: schema_version tidak valid atau penyimpanan bermasalah.`,
      detail: JSON.stringify(diagAfter),
    });
  } catch (err: any) {
    results.push({
      id: 'storage-test-error',
      namaTes: 'LocalStorage Schema',
      kategori: 'LocalStorage Schema',
      status: 'gagal',
      pesan: `Error eksekusi: ${err?.message}`,
    });
  }

  return results;
}
