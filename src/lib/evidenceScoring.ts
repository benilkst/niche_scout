/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  KandidatNiche,
  LevelBukti,
  Pengaturan,
  StatusDukungan,
  SumberRef,
} from '../types.ts';

/**
 * Daftar stopword bahasa Inggris umum untuk normalisasi token kata kunci microstock
 */
const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves',
]);

/**
 * 1. NORMALISASI DOMAIN (Tahap 3):
 * Huruf kecil, buang "www.", abaikan subdomain "m." dan "amp."
 */
export function normalizeDomain(urlOrHost: string): string {
  if (!urlOrHost || typeof urlOrHost !== 'string') return 'unknown-source';

  let str = urlOrHost.trim().toLowerCase();

  // Buang protokol jika ada
  if (str.includes('://')) {
    str = str.split('://')[1];
  }

  // Buang path, query, hash, dan port
  str = str.split('/')[0].split('?')[0].split('#')[0].split(':')[0];

  // Buang "www."
  if (str.startsWith('www.')) {
    str = str.slice(4);
  }

  // Abaikan subdomain mobile "m."
  if (str.startsWith('m.')) {
    str = str.slice(2);
  }

  // Abaikan subdomain "amp."
  if (str.startsWith('amp.')) {
    str = str.slice(4);
  }

  return str;
}

/**
 * Cek apakah domain termasuk platform stok terdaftar
 */
export function isPlatformDomain(domain: string, platformList: string[]): boolean {
  if (!domain || !Array.isArray(platformList)) return false;
  const cleanDomain = normalizeDomain(domain);

  return platformList.some((plat) => {
    const cleanPlat = normalizeDomain(plat);
    return cleanDomain === cleanPlat || cleanDomain.endsWith('.' + cleanPlat);
  });
}

/**
 * 2 & 3 & 4. PENILAIAN KUALITAS BUKTI & SARAN PERMINTAAN DIKUNCI KODE (Tahap 3)
 */
export function calculateEvidenceQuality(
  sources: SumberRef[],
  cakupanDukungan: number | null,
  rawDemand: number | null,
  pengaturan?: Pengaturan
): {
  normalizedSources: SumberRef[];
  jumlah_domain: number;
  alasan_bukti: string;
  bukti: LevelBukti;
  dukungan: StatusDukungan;
  saran_permintaan_1_5: number | null;
} {
  const platformList = pengaturan?.domain_platform || [];

  // Ambang yang dapat dikonfigurasi (dengan default Tahap 3)
  const ambangDomainKuat = pengaturan?.ambang_domain_kuat ?? 3;
  const ambangCakupanKuat = pengaturan?.ambang_cakupan_kuat ?? 0.5;
  const ambangDomainSedang = pengaturan?.ambang_domain_sedang ?? 2;
  const ambangCakupanDidukung = pengaturan?.ambang_cakupan_didukung ?? 0.6;
  const ambangCakupanSebagian = pengaturan?.ambang_cakupan_sebagian ?? 0.2;

  // Normalisasi sumber dan tandai domain platform
  const domainSet = new Set<string>();
  const normalizedSources: SumberRef[] = (sources || []).map((s) => {
    const cleanHost = normalizeDomain(s.domain || s.url);
    domainSet.add(cleanHost);
    const isPlat = isPlatformDomain(cleanHost, platformList);
    return {
      ...s,
      domain: cleanHost,
      is_platform: isPlat,
    };
  });

  const jumlah_domain = domainSet.size;
  const cakupan = cakupanDukungan !== null && !isNaN(cakupanDukungan) ? Math.min(1, Math.max(0, cakupanDukungan)) : null;

  // 2. Evaluasi Label Bukti
  let bukti: LevelBukti = 'tidak_ada';
  if (jumlah_domain >= ambangDomainKuat && (cakupan ?? 0) >= ambangCakupanKuat) {
    bukti = 'kuat';
  } else if (jumlah_domain >= ambangDomainSedang) {
    bukti = 'sedang';
  } else if (jumlah_domain === 1) {
    bukti = 'lemah';
  } else {
    bukti = 'tidak_ada';
  }

  // Alasan label yang dapat diaudit (contoh: "2 domain, cakupan 38%")
  const cakupanPct = cakupan !== null ? `${Math.round(cakupan * 100)}%` : '0%';
  const alasan_bukti =
    jumlah_domain > 0
      ? `${jumlah_domain} domain, cakupan ${cakupanPct}`
      : '0 domain, tanpa rujukan langsung';

  // 3. Evaluasi Cakupan Dukungan
  let dukungan: StatusDukungan = 'tidak_diketahui';
  if (cakupan === null || jumlah_domain === 0) {
    dukungan = 'tidak_didukung';
  } else if (cakupan >= ambangCakupanDidukung) {
    dukungan = 'didukung';
  } else if (cakupan >= ambangCakupanSebagian) {
    dukungan = 'sebagian';
  } else {
    dukungan = 'tidak_didukung';
  }

  // 4. Saran Permintaan Dikunci Kode:
  // - bukti tidak_ada: menjadi null
  // - bukti lemah: dibatasi maksimal 3
  // - bukti sedang atau kuat: dibiarkan (1-5)
  let saran_permintaan_1_5: number | null = null;
  if (bukti === 'tidak_ada') {
    saran_permintaan_1_5 = null;
  } else if (bukti === 'lemah') {
    const original = rawDemand !== null ? Number(rawDemand) : 2;
    saran_permintaan_1_5 = Math.min(3, Math.max(1, Math.round(original)));
  } else {
    // sedang atau kuat
    const original = rawDemand !== null ? Number(rawDemand) : 4;
    saran_permintaan_1_5 = Math.min(5, Math.max(1, Math.round(original)));
  }

  return {
    normalizedSources,
    jumlah_domain,
    alasan_bukti,
    bukti,
    dukungan,
    saran_permintaan_1_5,
  };
}

/**
 * 5. NORMALISASI KATA KUNCI & TOKENISASI (Tahap 3):
 * Huruf kecil, buang tanda baca, buang stopword umum bahasa Inggris, urutkan token.
 */
export function normalizeKeywordTokens(keywordText: string): string[] {
  if (!keywordText || typeof keywordText !== 'string') return [];

  // Huruf kecil, ganti tanda baca dengan spasi
  const cleaned = keywordText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();

  const rawTokens = cleaned.split(/\s+/).filter(Boolean);

  // Buang stopword umum bahasa Inggris
  const filtered = rawTokens.filter((token) => !ENGLISH_STOPWORDS.has(token) && token.length > 1);

  // Deduplikasi & urutkan token secara alfabetis
  const uniqueTokens = Array.from(new Set(filtered)).sort();
  return uniqueTokens;
}

/**
 * Hitung kesamaan Jaccard antara dua kumpulan token kata kunci
 * Nilai 0.0 sampai 1.0 = |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (!tokensA.length && !tokensB.length) return 0;
  if (!tokensA.length || !tokensB.length) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  if (unionCount === 0) return 0;

  return Number((intersectionCount / unionCount).toFixed(3));
}

/**
 * 5. PENERAPAN DEDUPE PADA KUMPULAN KANDIDAT:
 * - Jaccard >= 0.8 dengan kandidat lain pada pencarian yang sama: mirip_dengan
 * - Sama persis dengan kandidat di Shortlist atau Riwayat sebelumnya: sudah_pernah_muncul
 */
export function applyDeduplication(
  currentBatch: KandidatNiche[],
  pastKandidat: KandidatNiche[]
): KandidatNiche[] {
  const pastNormalizedMap = new Set<string>();

  for (const past of pastKandidat) {
    const pastTokens = normalizeKeywordTokens(past.kata_kunci_en).join(' ');
    if (pastTokens) {
      pastNormalizedMap.add(pastTokens);
    }
  }

  // Pre-kalkulasi token untuk batch saat ini
  const batchTokens = currentBatch.map((k) => ({
    id: k.id,
    nomor: k.nomor,
    tokens: normalizeKeywordTokens(k.kata_kunci_en),
    tokenString: normalizeKeywordTokens(k.kata_kunci_en).join(' '),
  }));

  return currentBatch.map((kandidat, idx) => {
    const curr = batchTokens[idx];
    let miripDenganId: string | null = null;
    let miripDenganNomor: number | null = null;

    // Cek kemiripan Jaccard dengan kandidat yang muncul lebih awal di batch yang sama
    for (let j = 0; j < idx; j++) {
      const other = batchTokens[j];
      const jaccard = calculateJaccardSimilarity(curr.tokens, other.tokens);
      if (jaccard >= 0.8) {
        miripDenganId = other.id;
        miripDenganNomor = other.nomor;
        break;
      }
    }

    // Cek apakah sama persis dengan yang pernah muncul di riwayat/shortlist
    const pernahMuncul = curr.tokenString ? pastNormalizedMap.has(curr.tokenString) : false;

    return {
      ...kandidat,
      mirip_dengan: miripDenganId ? String(miripDenganNomor) : null,
      sudah_pernah_muncul: pernahMuncul,
    };
  });
}

/**
 * 6. PENANDA RISIKO MEREK (Tahap 3):
 * Gabungkan (OR) tanda dari model dan pencocokan kode terhadap daftar kata peringatan merek di Pengaturan.
 */
export function checkBrandRisk(
  kataKunciEn: string,
  varianId: string,
  modelRisk: { ada: boolean; alasan: string | null },
  brandWarningWords: string[]
): { ada: boolean; alasan: string | null } {
  const combinedText = `${kataKunciEn} ${varianId}`.toLowerCase();
  const matchedBrands: string[] = [];

  for (const word of brandWarningWords) {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) continue;

    // Pencocokan batas kata atau substring bersih
    const regex = new RegExp(`(^|[^a-z0-9])${cleanWord}([^a-z0-9]|$)`, 'i');
    if (regex.test(combinedText)) {
      matchedBrands.push(cleanWord);
    }
  }

  const kodeMenemukanMerek = matchedBrands.length > 0;
  const adaRisiko = Boolean(modelRisk.ada || kodeMenemukanMerek);

  let alasan: string | null = null;
  if (kodeMenemukanMerek) {
    alasan = `Terdeteksi kata merek: ${matchedBrands.join(', ')}`;
    if (modelRisk.alasan) {
      alasan += ` (${modelRisk.alasan})`;
    }
  } else if (modelRisk.ada) {
    alasan = modelRisk.alasan || 'Model mendeteksi potensi risiko merek dagang';
  }

  return {
    ada: adaRisiko,
    alasan,
  };
}
