/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroundingSource, NicheRawIdea, NicheScoreBreakdown, NicheScoredIdea } from '../types/index.ts';

/**
 * Aturan 3: AI tidak boleh menghitung, mengarang angka, statistik, jumlah hasil pencarian, atau tanggal.
 * Semua skor, label bukti, jarak hari, dan penggabungan dilakukan KODE.
 */

/**
 * Pemetaan nama momen / musim ke tanggal aproksimasi tahunan (Bulan 1-12, Hari 1-31)
 */
export const SEASONAL_EVENTS: Record<string, { bulan: number; hari: number; namaLengkap: string }> = {
  'ramadhan': { bulan: 3, hari: 1, namaLengkap: 'Ramadhan & Idul Fitri' },
  'idul fitri': { bulan: 3, hari: 30, namaLengkap: 'Idul Fitri' },
  'natal': { bulan: 12, hari: 25, namaLengkap: 'Hari Natal' },
  'tahun baru': { bulan: 1, hari: 1, namaLengkap: 'Tahun Baru' },
  'imlek': { bulan: 2, hari: 10, namaLengkap: 'Tahun Baru Imlek' },
  'halloween': { bulan: 10, hari: 31, namaLengkap: 'Halloween' },
  'valentine': { bulan: 2, hari: 14, namaLengkap: 'Hari Valentine' },
  'back to school': { bulan: 7, hari: 15, namaLengkap: 'Kembali ke Sekolah (Back to School)' },
  'black friday': { bulan: 11, hari: 27, namaLengkap: 'Black Friday / Cyber Monday' },
  'hari bumi': { bulan: 4, hari: 22, namaLengkap: 'Hari Bumi (Earth Day)' },
  'musim panas': { bulan: 6, hari: 21, namaLengkap: 'Musim Panas (Summer)' },
  'musim dingin': { bulan: 12, hari: 21, namaLengkap: 'Musim Dingin (Winter)' },
  'musim gugur': { bulan: 9, hari: 22, namaLengkap: 'Musim Gugur (Autumn)' },
  'musim semi': { bulan: 3, hari: 20, namaLengkap: 'Musim Semi (Spring)' },
};

/**
 * Menghitung jarak hari (integer) menuju momen tertentu dari tanggal acuan.
 * Murni dihitung oleh kode JavaScript.
 */
export function calculateDaysToEvent(eventKeyOrDate: string, referenceDate: Date = new Date()): number | undefined {
  if (!eventKeyOrDate || typeof eventKeyOrDate !== 'string') return undefined;

  const normalized = eventKeyOrDate.trim().toLowerCase();

  // 1. Cek apakah cocok dengan kamus momen
  for (const [key, event] of Object.entries(SEASONAL_EVENTS)) {
    if (normalized.includes(key)) {
      const currentYear = referenceDate.getFullYear();
      let target = new Date(currentYear, event.bulan - 1, event.hari);

      // Jika momen tahun ini sudah lewat > 14 hari, jadwalkan untuk tahun depan
      const diffMs = target.getTime() - referenceDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < -14) {
        target = new Date(currentYear + 1, event.bulan - 1, event.hari);
      }

      const finalDiffDays = Math.ceil((target.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, finalDiffDays);
    }
  }

  // 2. Cek apakah format tanggal valid YYYY-MM-DD
  const parsed = Date.parse(eventKeyOrDate);
  if (!isNaN(parsed)) {
    const target = new Date(parsed);
    const diff = Math.ceil((target.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  return undefined;
}

/**
 * Aturan 4 & Aturan 5:
 * URL sumber hanya boleh berasal dari metadata grounding (groundingChunks), bukan dari teks yang ditulis model.
 * Label harus jujur: "Bersumber" hanya berarti ada rujukan dari hasil pencarian, bukan bahwa klaimnya pasti benar.
 */
export function generateEvidenceLabel(sourcesCount: number): 'Bersumber' | 'Tanpa Rujukan Grounding' {
  return sourcesCount > 0 ? 'Bersumber' : 'Tanpa Rujukan Grounding';
}

/**
 * Menghitung skor murni dengan formula matematika tanpa angka buatan AI.
 */
export function calculateNicheScore(
  rawIdea: NicheRawIdea,
  groundingSources: GroundingSource[],
  targetMomen?: string,
  referenceDate: Date = new Date()
): NicheScoreBreakdown {
  const sourcesCount = Array.isArray(groundingSources) ? groundingSources.length : 0;
  const elementsCount = Array.isArray(rawIdea.elemenKunci) ? rawIdea.elemenKunci.length : 0;
  const keywords = Array.isArray(rawIdea.kataKunciRekomendasi) ? rawIdea.kataKunciRekomendasi : [];
  const industries = Array.isArray(rawIdea.targetIndustri) ? rawIdea.targetIndustri : [];

  // 1. Skor Kompleksitas (1 - 10)
  // Dipengaruhi oleh jenis kategori dan kedalaman elemen kunci visual
  let baseComplexity = 5;
  if (rawIdea.kategori === 'real_photo') baseComplexity = 6.5; // foto nyata butuh model/properti/lokasi
  if (rawIdea.kategori === 'ai_photo') baseComplexity = 5.0;
  if (rawIdea.kategori === 'ai_illustration') baseComplexity = 4.5;

  const elementsBonus = Math.min(3, elementsCount * 0.6);
  const descBonus = Math.min(1.5, (rawIdea.deskripsiVisual?.length || 0) / 100);
  const skorKompleksitas = Math.min(10, Math.max(1, Number((baseComplexity + elementsBonus + descBonus).toFixed(1))));

  // 2. Skor Permintaan Pasar (1 - 10)
  // Berdasarkan verifikasi rujukan grounding pencarian riil dan cakupan industri pembeli
  const groundingScore = sourcesCount >= 4 ? 4.5 : sourcesCount >= 2 ? 3.5 : sourcesCount === 1 ? 2.5 : 1.5;
  const industrySpread = Math.min(3, industries.length * 0.75);
  const keywordVolumeBonus = Math.min(2.5, keywords.length * 0.4);
  const skorPermintaanPasar = Math.min(10, Math.max(1, Number((groundingScore + industrySpread + keywordVolumeBonus).toFixed(1))));

  // 3. Skor Kepadatan Kompetisi (1 - 10)
  // Kata kunci panjang (long-tail 3+ kata) menandakan micro-niche spesifik -> kompetisi lebih rendah
  const longTailKeywords = keywords.filter((k) => k.trim().split(/\s+/).length >= 3);
  const longTailRatio = keywords.length > 0 ? longTailKeywords.length / keywords.length : 0.3;
  // Rasio long-tail tinggi => kompetisi rendah (misal skor 3-5). Kata kunci pendek umum => kompetisi tinggi (skor 7-9)
  const baseCompetition = 8.5;
  const longTailDiscount = longTailRatio * 3.5;
  const specificityDiscount = Math.min(2.0, elementsCount * 0.3);
  const skorKepadatanKompetisi = Math.min(10, Math.max(1, Number((baseCompetition - longTailDiscount - specificityDiscount).toFixed(1))));

  // 4. Indeks Peluang (1 - 99)
  // Formula: (Permintaan * 1.4 + (11 - Kompetisi) * 1.2 + (Kompleksitas * 0.4)) / 30 * 100
  const demandWeight = skorPermintaanPasar * 1.4;
  const roomWeight = (11 - skorKepadatanKompetisi) * 1.2;
  const barrierWeight = skorKompleksitas * 0.4;
  const rawIndex = ((demandWeight + roomWeight + barrierWeight) / 30) * 100;
  const indeksPeluang = Math.min(99, Math.max(10, Math.round(rawIndex)));

  const labelBukti = generateEvidenceLabel(sourcesCount);
  const perkiraanHariMenujuMomen = targetMomen ? calculateDaysToEvent(targetMomen, referenceDate) : undefined;

  return {
    skorKompleksitas,
    skorPermintaanPasar,
    skorKepadatanKompetisi,
    indeksPeluang,
    labelBukti,
    jumlahRujukanGrounding: sourcesCount,
    perkiraanHariMenujuMomen,
  };
}

/**
 * Penggabungan murni data dari model mentah dan metadata grounding
 */
export function buildScoredIdea(
  rawIdea: NicheRawIdea,
  groundingSources: GroundingSource[],
  targetMomen?: string,
  referenceDate: Date = new Date()
): NicheScoredIdea {
  const skor = calculateNicheScore(rawIdea, groundingSources, targetMomen, referenceDate);
  return {
    ...rawIdea,
    skor,
    sumberGrounding: groundingSources || [],
    dibuatPada: new Date().toISOString(),
  };
}
