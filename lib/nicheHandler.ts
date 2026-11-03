/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL_NAME } from '../src/config/model.ts';
import type { KandidatNiche, SumberRef, StatusDukungan, LevelBukti } from '../src/types.ts';

// Helper inisialisasi SDK di sisi server
// Mendukung kunci API kustom yang diinput manual oleh pengguna dari aplikasi, dengan fallback ke process.env.GEMINI_API_KEY
export function getAiClient(customApiKey?: string): GoogleGenAI {
  const key = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim())
    ? customApiKey.trim()
    : process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error('Kunci API Gemini belum diatur. Masukkan API Key Anda di Pengaturan aplikasi atau konfigurasi server.');
  }

  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface NicheHandlerRequest {
  tipe_aset: 'foto_nyata' | 'foto_ai' | 'ilustrasi_ai';
  tema?: string;
  momen_id?: string | null;
  momen_tahun?: number | null;
  nama_momen?: string | null;
  tanggal_puncak_target?: string | null;
  status_jendela?: string | null;
  hari_tersisa?: number | null;
  rentang_jendela?: string | null;
  jumlah_kandidat?: number;
}

export interface NicheHandlerResponse {
  success: boolean;
  kunci_cache: string;
  status: 'tergrounded' | 'tidak_tergrounded' | 'galat';
  pesan_galat: string | null;
  web_search_queries: string[];
  search_entry_point_html: string | null;
  kandidat: KandidatNiche[];
}

interface ParsedBlock {
  nomor: number;
  rawText: string;
  startByte: number;
  endByte: number;
  bodyStartByte: number;
  bodyEndByte: number;
}

/**
 * Ekstrak domain dari URI sumber.
 * Aturan: Jika uri berupa tautan pengalih milik Google, gunakan title sebagai domain;
 * jika tidak, ambil host dari uri. Jangan menelusuri tautan pengalih.
 */
function extractCleanDomain(uri: string, title?: string): string {
  try {
    const parsed = new URL(uri);
    let host = parsed.hostname.toLowerCase();
    if (host.includes('google.com') && (parsed.pathname.includes('/url') || parsed.pathname.includes('search'))) {
      // Gunakan title jika redirect link
      return title ? title.slice(0, 35) : host;
    }
    if (host.startsWith('www.')) host = host.slice(4);
    if (host.startsWith('m.')) host = host.slice(2);
    if (host.startsWith('amp.')) host = host.slice(4);
    return host;
  } catch {
    return title ? title.slice(0, 35) : 'web-source';
  }
}

/**
 * Pemetaan sumber oleh kode menggunakan offset byte UTF-8 (Buffer)
 */
function mapSourcesToBlocksByByteOffset(
  fullText: string,
  blocks: ParsedBlock[],
  groundingChunks: Array<{ web?: { uri?: string; title?: string } }>,
  groundingSupports: Array<{
    segment?: { startIndex?: number; endIndex?: number; text?: string };
    groundingChunkIndices?: number[];
  }>
): Map<number, { sumber: SumberRef[]; cakupan_dukungan: number | null }> {
  const result = new Map<number, { sumber: SumberRef[]; cakupan_dukungan: number | null }>();

  // Siapkan referensi sumber dari groundingChunks
  const chunkList: Array<{ url: string; title: string; domain: string }> = groundingChunks.map((chunk) => {
    const uri = chunk.web?.uri || '';
    const title = chunk.web?.title || uri;
    const domain = extractCleanDomain(uri, title);
    return { url: uri, title, domain };
  });

  const nowIso = new Date().toISOString();

  // Untuk setiap blok kandidat
  for (const block of blocks) {
    const matchedChunkIndices = new Set<number>();
    let coveredBytes = 0;

    const blockBodyLength = Math.max(1, block.bodyEndByte - block.bodyStartByte);

    // Kumpulkan interval byte support yang overlapping dengan badan blok
    const overlappingIntervals: Array<{ start: number; end: number }> = [];

    for (const support of groundingSupports) {
      const segStart = typeof support.segment?.startIndex === 'number' ? support.segment.startIndex : -1;
      const segEnd = typeof support.segment?.endIndex === 'number' ? support.segment.endIndex : -1;

      if (segStart < 0 || segEnd <= segStart) continue;

      // Cek apakah segmen bersinggungan dengan badan blok
      const overlapStart = Math.max(block.bodyStartByte, segStart);
      const overlapEnd = Math.min(block.bodyEndByte, segEnd);

      if (overlapEnd > overlapStart) {
        // Terdapat persinggungan
        overlappingIntervals.push({ start: overlapStart, end: overlapEnd });

        if (Array.isArray(support.groundingChunkIndices)) {
          for (const idx of support.groundingChunkIndices) {
            if (idx >= 0 && idx < chunkList.length) {
              matchedChunkIndices.add(idx);
            }
          }
        }
      }
    }

    // Hitung total byte tertutup tanpa duplikasi overlap interval
    if (overlappingIntervals.length > 0) {
      overlappingIntervals.sort((a, b) => a.start - b.start);
      let mergedStart = overlappingIntervals[0].start;
      let mergedEnd = overlappingIntervals[0].end;

      for (let i = 1; i < overlappingIntervals.length; i++) {
        const curr = overlappingIntervals[i];
        if (curr.start <= mergedEnd) {
          mergedEnd = Math.max(mergedEnd, curr.end);
        } else {
          coveredBytes += mergedEnd - mergedStart;
          mergedStart = curr.start;
          mergedEnd = curr.end;
        }
      }
      coveredBytes += mergedEnd - mergedStart;
    }

    // Bentuk daftar SumberRef unik (dedupe per URL)
    const sumberMap = new Map<string, SumberRef>();
    for (const idx of matchedChunkIndices) {
      const item = chunkList[idx];
      if (item && item.url) {
        sumberMap.set(item.url, {
          domain: item.domain,
          url: item.url,
          judul: item.title,
          tanggal_akses: nowIso,
        });
      }
    }

    const sumberUnique = Array.from(sumberMap.values());
    const cakupan =
      sumberUnique.length > 0
        ? Math.min(1, Math.max(0, Number((coveredBytes / blockBodyLength).toFixed(2))))
        : null;

    result.set(block.nomor, {
      sumber: sumberUnique,
      cakupan_dukungan: cakupan,
    });
  }

  return result;
}

/**
 * Memecah teks Langkah A berdasarkan penanda "## KANDIDAT n"
 * Menghitung offset byte UTF-8 secara presisi dengan TextEncoder
 */
function splitTextIntoCandidateBlocks(fullText: string): ParsedBlock[] {
  const encoder = new TextEncoder();
  const blocks: ParsedBlock[] = [];

  // Regex mencari penanda "## KANDIDAT n"
  const regex = /##\s*KANDIDAT\s*(\d+)/gi;
  const matches: Array<{ nomor: number; charIndex: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(fullText)) !== null) {
    const nomor = parseInt(match[1], 10);
    matches.push({ nomor, charIndex: match.index });
  }

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const nextCharIndex = i + 1 < matches.length ? matches[i + 1].charIndex : fullText.length;

    const blockText = fullText.slice(curr.charIndex, nextCharIndex);

    // Hitung offset byte UTF-8
    const startByte = encoder.encode(fullText.slice(0, curr.charIndex)).length;
    const endByte = startByte + encoder.encode(blockText).length;

    // Header penanda baris pertama (misal: "## KANDIDAT 1\n")
    const firstNewline = blockText.indexOf('\n');
    const headerSlice = firstNewline >= 0 ? blockText.slice(0, firstNewline + 1) : blockText;
    const headerByteLen = encoder.encode(headerSlice).length;

    const bodyStartByte = startByte + headerByteLen;
    const bodyEndByte = endByte;

    blocks.push({
      nomor: curr.nomor,
      rawText: blockText.trim(),
      startByte,
      endByte,
      bodyStartByte,
      bodyEndByte,
    });
  }

  return blocks;
}

/**
 * Eksekusi Langkah B: JSON terstruktur via Gemini (tanpa tool)
 */
async function executeStepBStructure(
  blocks: ParsedBlock[],
  customApiKey?: string,
  modelName: string = GEMINI_MODEL_NAME,
  retryCount: number = 0
): Promise<any[]> {
  const blocksInput = blocks.map((b) => ({
    nomor: b.nomor,
    teks: b.rawText,
  }));

  const promptB = `
Anda adalah parser data microstock presisi tinggi.
Tugas Anda: Mengubah blok-blok teks kandidat berikut menjadi array JSON terstruktur persis tanpa menambah atau mengarang informasi baru.
Semua informasi teks HARUS diambil secara murni dan setia dari teks input blok masing-masing.

Blok Input:
${JSON.stringify(blocksInput, null, 2)}

Peraturan Ekstraksi:
- Jumlah objek yang dihasilkan HARUS PERSIS sama dengan ${blocks.length}.
- nomor HARUS cocok dengan nomor blok masing-masing (misal 1, 2, ...).
- Field wajib:
  - nomor: number
  - kata_kunci_en: string (ambil dari "Kata kunci (EN):")
  - varian_id: string (ambil dari "Varian Indonesia:")
  - alasan: string (ambil dari "Alasan:")
  - sinyal_tren: string (ambil dari "Sinyal tren:")
  - saran_sudut: objek { copy_space: string, konteks_lokal: string, gaya: string }
  - saran_permintaan_1_5: number (1 sampai 5) atau null jika tidak ada bukti
  - risiko_merek: objek { ada: boolean, alasan: string | null }
`.trim();

  const ai = getAiClient(customApiKey);
  let responseB: any;
  const modelsB = [modelName || GEMINI_MODEL_NAME, 'gemini-3.5-flash'];
  const uniqueModelsB = Array.from(new Set(modelsB));

  for (const m of uniqueModelsB) {
    try {
      responseB = await ai.models.generateContent({
        model: m,
        contents: promptB,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nomor: { type: Type.INTEGER },
                kata_kunci_en: { type: Type.STRING },
                varian_id: { type: Type.STRING },
                alasan: { type: Type.STRING },
                sinyal_tren: { type: Type.STRING },
                saran_sudut: {
                  type: Type.OBJECT,
                  properties: {
                    copy_space: { type: Type.STRING },
                    konteks_lokal: { type: Type.STRING },
                    gaya: { type: Type.STRING },
                  },
                  required: ['copy_space', 'konteks_lokal', 'gaya'],
                },
                saran_permintaan_1_5: { type: Type.INTEGER },
                risiko_merek: {
                  type: Type.OBJECT,
                  properties: {
                    ada: { type: Type.BOOLEAN },
                    alasan: { type: Type.STRING },
                  },
                  required: ['ada'],
                },
              },
              required: [
                'nomor',
                'kata_kunci_en',
                'varian_id',
                'alasan',
                'sinyal_tren',
                'saran_sudut',
                'risiko_merek',
              ],
            },
          },
        },
      });
      if (responseB?.text) break;
    } catch (err: any) {
      if (m === uniqueModelsB[uniqueModelsB.length - 1]) {
        throw err;
      }
    }
  }

  const parsed = JSON.parse(responseB.text || '[]');
  const list = Array.isArray(parsed) ? parsed : [];

  // Validasi: jumlah objek sama dengan jumlah blok dan nomor cocok
  const isValidCount = list.length === blocks.length;
  const isNumbersMatching = blocks.every((b, idx) => list[idx] && list[idx].nomor === b.nomor);

  if (!isValidCount || !isNumbersMatching) {
    if (retryCount === 0) {
      // Coba ulang SEKALI sesuai spesifikasi
      return executeStepBStructure(blocks, customApiKey, modelName, 1);
    }
    throw new Error(
      `Validasi Langkah B gagal: jumlah kandidat (${list.length}) tidak sesuai blok (${blocks.length}).`
    );
  }

  return list;
}

/**
 * Handler utama pencarian dua langkah
 */
export async function handleNicheScout(
  params: NicheHandlerRequest,
  customApiKey?: string
): Promise<NicheHandlerResponse> {
  const {
    tipe_aset,
    tema = '',
    momen_id = null,
    momen_tahun = null,
    nama_momen = null,
    tanggal_puncak_target = null,
    status_jendela = null,
    hari_tersisa = null,
    rentang_jendela = null,
    jumlah_kandidat = 10,
  } = params;

  // 1. Validasi Input
  if (!tipe_aset || !['foto_nyata', 'foto_ai', 'ilustrasi_ai'].includes(tipe_aset)) {
    throw new Error('Tipe aset wajib dan harus berupa: foto_nyata, foto_ai, atau ilustrasi_ai.');
  }

  const cleanTema = typeof tema === 'string' ? tema.trim().slice(0, 80) : '';
  const count = Math.min(15, Math.max(3, Number(jumlah_kandidat) || 10));

  const labelTipeAset =
    tipe_aset === 'foto_nyata'
      ? 'Foto Nyata (keaslian, staging fisik, model dan property release, lokasi otentik)'
      : tipe_aset === 'foto_ai'
        ? 'Foto AI Generatif (fotorealistik, konsep unik, hindari wajah tokoh nyata dan merek)'
        : 'Ilustrasi AI / Vektor AI (vektor komersial, flat, 3D icon set, background copy space)';

  // Tanggal hari ini dari server (Aturan Tahap 2)
  const todayServer = new Date().toISOString().slice(0, 10);

  // Kunci cache unik
  const todayLocal = new Date().toLocaleDateString('en-CA');
  const kunci_cache = `cache_${tipe_aset}_${cleanTema.toLowerCase().replace(/\s+/g, '_')}_${momen_id || 'none'}_${count}_${todayLocal}`;

  // Konteks Musiman jika ada (Tahap 5)
  const konteksMusimanText =
    nama_momen && tanggal_puncak_target
      ? `
Target Momen: ${nama_momen}.
Target puncak: ${tanggal_puncak_target}. Jendela unggah ideal: ${rentang_jendela || '120 s/d 60 hari sebelum puncak'}.
Cari sinyal permintaan untuk musim tersebut dan jangan menyarankan produksi untuk musim yang sudah lewat.
${
  status_jendela === 'Jendela sudah lewat (target musim berikutnya)'
    ? 'CATATAN KHUSUS: Jendela unggah musim tahun ini sudah lewat (< 60 hari). Semua konsep dan rekomendasi kata kunci HARUS ditujukan untuk persiapan produksi MUSIM BERIKUTNYA (' +
      tanggal_puncak_target +
      '). Sertakan konteks musim berikutnya pada alasan atau deskripsi jika relevan.'
    : ''
}
`.trim()
      : '';

  // 2. LANGKAH A: Panggil Gemini dengan tool googleSearch
  const promptA = `
Tanggal Hari Ini (Server): ${todayServer}.
Peran: Anda analis tren pasar microstock (Adobe Stock, Shutterstock, Freepik, Getty Images/iStock).
Tugas: Cari sinyal permintaan terkini untuk ${labelTipeAset} dengan tema "${cleanTema || 'umum / tren komersial paling dicari'}".
${konteksMusimanText ? `\n${konteksMusimanText}\n` : ''}
Hasilkan TEPAT ${count} kandidat ide niche.

Gunakan format persis untuk setiap kandidat:
## KANDIDAT n
Kata kunci (EN): <5-8 kata kunci relevan bahasa Inggris>
Varian Indonesia: <nama konsep dalam Bahasa Indonesia>
Alasan: <kebutuhan pembeli microstock berdasarkan hasil pencarian>
Sinyal tren: <sinyal kenaikan permintaan atau data relevan dari pencarian, jika tidak ada tulis "Sinyal tidak ditemukan">
Copy space: <rekomendasi ruang kosong negatif untuk teks desain>
Konteks lokal: <sentuhan budaya atau kearifan lokal spesifik>
Gaya: <komposisi, pencahayaan, sudut kamera atau gaya ilustrasi>

ATURAN SANGAT KETAT:
1. Alasan dan sinyal tren HANYA boleh berdasar hasil pencarian;
2. Jangan menulis angka, persentase, atau statistik yang tidak ada di sumber;
3. Jika tidak menemukan sinyal untuk sebuah kandidat, tulis "Sinyal tidak ditemukan";
4. JANGAN PERNAH menyarankan nama merek (misal Lego, Apple, Nike, Barbie, Disney, dll.), karakter berhak cipta, produk bermerek, atau tokoh nyata;
5. Sesuaikan sudut kreatif dengan tipe aset:
   - Foto nyata: sebutkan kebutuhan model/property release dan lokasi;
   - AI: ingatkan hindari wajah tokoh nyata dan merek dagang.
`.trim();

/**
 * Generator langsung 1-turn tanpa tool jika kuota pencarian grounding habis.
 * Menghasilkan kandidat dalam ~8 detik (mencegah timeout Load failed di Safari).
 */
async function executeDirectUngroundedCandidates(
  payload: NicheHandlerRequest,
  customApiKey?: string,
  modelName: string = GEMINI_MODEL_NAME
): Promise<any[]> {
  const ai = getAiClient(customApiKey);
  const { tipe_aset, tema, nama_momen, rentang_jendela, status_jendela, jumlah_kandidat } = payload;
  const count = Math.min(Math.max(jumlah_kandidat || 10, 3), 15);

  const assetLabel =
    tipe_aset === 'foto_nyata'
      ? 'Foto Nyata / Real Photography (otentik, model nyata, staging fisik)'
      : tipe_aset === 'foto_ai'
        ? 'Foto AI Generatif Komersial (konsep visual AI fotorealistik)'
        : 'Ilustrasi AI / Vektor AI (flat, 3D render komersial, isolasi)';

  const prompt = `
Peran: Anda adalah kurator riset tren pasar microstock (Adobe Stock, Shutterstock, Freepik, Getty Images).
Hasilkan tepat ${count} ide niche komersial microstock yang spesifik, relevan, dan tinggi permintaannya.

Parameter:
- Tipe Aset: ${assetLabel}
- Tema: ${tema || 'Tren microstock paling dicari saat ini'}
${nama_momen ? `- Momen Musiman: ${nama_momen} (${status_jendela || ''}, target ${rentang_jendela || ''})` : ''}

Peraturan:
1. Hasilkan tepat ${count} objek kandidat dalam array JSON.
2. Setiap objek WAJIB memiliki:
   - nomor: integer (1 sampai ${count})
   - kata_kunci_en: string (5-8 kata kunci komersial bahasa Inggris dipisahkan koma)
   - varian_id: string (konsep visual dalam Bahasa Indonesia)
   - alasan: string (1-2 kalimat ringkas mengapa pembeli membutuhkan foto ini)
   - sinyal_tren: string ("Sinyal tidak ditemukan" atau tren musiman relevan)
   - saran_sudut: objek { copy_space: string, konteks_lokal: string, gaya: string }
   - risiko_merek: objek { ada: boolean, alasan: string | null }
3. JANGAN PERNAH menyarankan merek dagang berhak cipta (Lego, Apple, Nike, Barbie, Disney, dll.).
`.trim();

  const candidateModels = [modelName || GEMINI_MODEL_NAME, 'gemini-3.8-flash', 'gemini-flash-latest'];
  const uniqueCandidateModels = Array.from(new Set(candidateModels));
  let response: any = null;
  let lastErr: any = null;

  for (const m of uniqueCandidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nomor: { type: Type.INTEGER },
                  kata_kunci_en: { type: Type.STRING },
                  varian_id: { type: Type.STRING },
                  alasan: { type: Type.STRING },
                  sinyal_tren: { type: Type.STRING },
                  saran_sudut: {
                    type: Type.OBJECT,
                    properties: {
                      copy_space: { type: Type.STRING },
                      konteks_lokal: { type: Type.STRING },
                      gaya: { type: Type.STRING },
                    },
                    required: ['copy_space', 'konteks_lokal', 'gaya'],
                  },
                  risiko_merek: {
                    type: Type.OBJECT,
                    properties: {
                      ada: { type: Type.BOOLEAN },
                      alasan: { type: Type.STRING },
                    },
                    required: ['ada'],
                  },
                },
                required: [
                  'nomor',
                  'kata_kunci_en',
                  'varian_id',
                  'alasan',
                  'sinyal_tren',
                  'saran_sudut',
                  'risiko_merek',
                ],
              },
            },
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastErr = err;
        const msg = err?.message || '';
        // Jika 503 lonjakan beban, tunggu sejenak lalu retry atau coba model berikutnya
        if (err?.status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE')) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
        }
        // JIKA 429 (KUOTA PROYEK HABIS): HENTIKAN SELURUH LOOP SEGERA!
        // Batas kuota Free Tier Google (20 req/hari) berlaku untuk SELURUH model di project ini.
        // Langsung lempar error agar server merespons dalam 1 detik (mencegah Load failed di Safari).
        if (err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('429: Batas kuota harian akun Google Anda (Free Tier 20 permintaan/hari) telah tercapai. Silakan masukkan API Key dari akun Google lain di tab Pengaturan.');
        }
      }
    }
    if (response?.text) break;
  }

  if (!response?.text) {
    throw lastErr || new Error('Gagal menghasilkan kandidat niche.');
  }

  const parsed = JSON.parse(response.text || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

  let responseA: any;
  let modelBerhasil: string = GEMINI_MODEL_NAME;
  let fallbackPesan: string | null = null;
  const ai = getAiClient(customApiKey);

  let groundingSuccess = false;
  let isGrounded = false;
  let structuredList: any[] = [];
  let sourceMapping = new Map<number, { sumber: SumberRef[]; cakupan_dukungan: number | null }>();
  let webSearchQueries: string[] = [];
  let searchEntryPointHtml: string | null = null;

  // Percobaan 1: Menggunakan Google Search Grounding (timeout ketat 5 detik)
  try {
    const searchPromise = ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: promptA,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    responseA = await Promise.race([
      searchPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 3500)),
    ]);

    const candidateZero = responseA?.candidates?.[0];
    const groundingMetadata = candidateZero?.groundingMetadata;
    const groundingChunks = Array.isArray(groundingMetadata?.groundingChunks)
      ? groundingMetadata.groundingChunks
      : [];

    if (groundingChunks.length > 0) {
      groundingSuccess = true;
      isGrounded = true;
      webSearchQueries = Array.isArray(groundingMetadata?.webSearchQueries)
        ? groundingMetadata.webSearchQueries
        : [];
      searchEntryPointHtml = groundingMetadata?.searchEntryPoint?.renderedContent || null;

      const fullText = responseA?.text || '';
      const blocks = splitTextIntoCandidateBlocks(fullText);

      if (blocks.length > 0) {
        sourceMapping = mapSourcesToBlocksByByteOffset(
          fullText,
          blocks,
          groundingChunks,
          Array.isArray(groundingMetadata?.groundingSupports) ? groundingMetadata.groundingSupports : []
        );
        structuredList = await executeStepBStructure(blocks, customApiKey, modelBerhasil);
      }
    }
  } catch (err: any) {
    groundingSuccess = false;
    isGrounded = false;
  }

  // Percobaan 2: Jika Google Search grounding gagal atau kuota habis (429/timeout),
  // langsung gunakan single-turn generator cepat tanpa grounding (hanya ~8 detik)
  if (!groundingSuccess || structuredList.length === 0) {
    fallbackPesan =
      'Fitur Google Search Grounding mencapai batas kuota akun Anda. Hasil pencarian ditampilkan berbasis analisis tren Gemini (status Tanpa Sumber).';
    structuredList = await executeDirectUngroundedCandidates(params, customApiKey, modelBerhasil);
  }

  // 6. GABUNGKAN HASIL DENGAN SUMBER DAN CAKUPAN DARI KODE
  const idPencarian = `search-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const finalKandidat: KandidatNiche[] = structuredList.map((item, idx) => {
    const nomor = item.nomor || idx + 1;
    const mapping = sourceMapping.get(nomor) || { sumber: [], cakupan_dukungan: null };

    const sumber = mapping.sumber;
    const cakupan = mapping.cakupan_dukungan;

    // Hitung level bukti dan status dukungan murni oleh KODE (Aturan 3 & Tahap 2)
    let bukti: LevelBukti = 'tidak_ada';
    let dukungan: StatusDukungan = 'tidak_diketahui';

    if (isGrounded && sumber.length > 0) {
      if (sumber.length >= 2 && (cakupan ?? 0) >= 0.4) {
        bukti = 'kuat';
        dukungan = 'didukung';
      } else if (sumber.length >= 1) {
        bukti = 'sedang';
        dukungan = 'sebagian';
      } else {
        bukti = 'lemah';
        dukungan = 'sebagian';
      }
    } else {
      bukti = 'tidak_ada';
      dukungan = 'tidak_didukung';
    }

    // Periksa risiko merek dari kata kunci
    const brandCheck = item.risiko_merek || { ada: false, alasan: null };

    return {
      id: `kandidat-${idPencarian}-${nomor}`,
      id_pencarian: idPencarian,
      nomor,
      kata_kunci_en: String(item.kata_kunci_en || ''),
      varian_id: String(item.varian_id || ''),
      alasan: String(item.alasan || ''),
      sinyal_tren: String(item.sinyal_tren || 'Sinyal tidak ditemukan'),
      saran_sudut: {
        copy_space: item.saran_sudut?.copy_space || 'Ruang kosong bersih untuk teks',
        konteks_lokal: item.saran_sudut?.konteks_lokal || 'Elemen lokal Indonesia',
        gaya: item.saran_sudut?.gaya || 'Komersial microstock',
      },
      sumber,
      jumlah_domain: new Set(sumber.map((s) => s.domain)).size,
      cakupan_dukungan: cakupan,
      dukungan,
      bukti,
      saran_permintaan_1_5: isGrounded ? (typeof item.saran_permintaan_1_5 === 'number' ? item.saran_permintaan_1_5 : 3) : null,
      risiko_merek: {
        ada: Boolean(brandCheck.ada),
        alasan: brandCheck.alasan || null,
      },
      mirip_dengan: null,
      sudah_pernah_muncul: false,
      status: 'baru',
      catatan: '',
      tag: (item.kata_kunci_en || '').split(/\s*,\s*|\s+/).filter(Boolean).slice(0, 8),
      dibuat_pada: nowIso,
    };
  });

  return {
    success: true,
    kunci_cache,
    status: isGrounded ? 'tergrounded' : 'tidak_tergrounded',
    pesan_galat: fallbackPesan,
    web_search_queries: webSearchQueries,
    search_entry_point_html: searchEntryPointHtml,
    kandidat: finalKandidat,
  };
}

/**
 * Verifikasi kode akses dinonaktifkan (diizinkan untuk semua akses)
 * Memenuhi instruksi: "Hilangkan kode akses dan buat agar api key dapat diinput secara manual melalui aplikasi"
 */
export function verifyPasscode(_providedPasscode: string | undefined | null): { allowed: boolean; status?: number; error?: string } {
  return { allowed: true };
}

/**
 * Handler bersama untuk rute /api/niche yang dapat dipanggil oleh Express (server.ts) maupun Vercel Serverless (api/niche.ts)
 */
export async function handleApiNicheRequest(req: any, res: any): Promise<void> {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      status: 'galat',
      pesan_galat: 'Metode tidak diizinkan. Gunakan POST.',
      kandidat: [],
    });
    return;
  }

  // 1. Ambil data request body
  const body = req.body || {};

  // Ambil Kunci API Gemini kustom dari body (aman dari batasan header WebKit) atau header
  const clientApiKey =
    body.apiKey ||
    req.headers?.['x-gemini-api-key'] ||
    req.headers?.['X-Gemini-Api-Key'] ||
    req.headers?.['x-gemini-api-key'.toLowerCase()];

  const effectiveApiKey =
    typeof clientApiKey === 'string' && clientApiKey.trim().length > 0
      ? clientApiKey.replace(/[^\x20-\x7E]/g, '').trim()
      : undefined;

  // 2. Validasi Server
  const {
    tipe_aset,
    tema,
    momen_id,
    momen_tahun,
    nama_momen,
    tanggal_puncak_target,
    status_jendela,
    hari_tersisa,
    rentang_jendela,
    jumlah_kandidat,
  } = body;

  if (!tipe_aset || !['foto_nyata', 'foto_ai', 'ilustrasi_ai'].includes(tipe_aset)) {
    res.status(400).json({
      success: false,
      status: 'galat',
      pesan_galat: 'Permintaan tidak valid: Tipe aset harus foto_nyata, foto_ai, atau ilustrasi_ai.',
      kandidat: [],
    });
    return;
  }

  if (tema && typeof tema === 'string' && tema.trim().length > 100) {
    res.status(400).json({
      success: false,
      status: 'galat',
      pesan_galat: 'Permintaan tidak valid: Panjang tema maksimal 100 karakter.',
      kandidat: [],
    });
    return;
  }

  const count = Number(jumlah_kandidat) || 10;
  if (count < 3 || count > 15) {
    res.status(400).json({
      success: false,
      status: 'galat',
      pesan_galat: 'Permintaan tidak valid: Jumlah kandidat harus antara 3 dan 15.',
      kandidat: [],
    });
    return;
  }

  // 3. Pastikan API key tersedia (baik dari header klien maupun environment server)
  if (!effectiveApiKey && !process.env.GEMINI_API_KEY) {
    res.status(400).json({
      success: false,
      status: 'galat',
      pesan_galat: 'Kunci API Gemini belum diatur. Silakan masukkan API Key Anda di tab Pengaturan.',
      kandidat: [],
    });
    return;
  }

  // 4. Jalankan riset niche dua langkah
  try {
    const result = await handleNicheScout(
      {
        tipe_aset,
        tema: typeof tema === 'string' ? tema.trim() : '',
        momen_id: momen_id || null,
        momen_tahun: momen_tahun || null,
        nama_momen: typeof nama_momen === 'string' ? nama_momen : null,
        tanggal_puncak_target: typeof tanggal_puncak_target === 'string' ? tanggal_puncak_target : null,
        status_jendela: status_jendela || null,
        hari_tersisa: typeof hari_tersisa === 'number' ? hari_tersisa : null,
        rentang_jendela: typeof rentang_jendela === 'string' ? rentang_jendela : null,
        jumlah_kandidat: count,
      },
      effectiveApiKey
    );

    res.status(200).json(result);
  } catch (err: any) {
    const msg = err?.message || '';
    const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    const isUnavailable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
    const isAuthError = msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('API key not valid');

    let pesanGalat = 'Layanan sedang sibuk. Gagal memproses pencarian niche saat ini.';
    let statusCode = 500;

    if (isRateLimit) {
      pesanGalat = 'Batas kuota harian akun Google Anda (Free Tier 20 permintaan/hari) telah tercapai (HTTP 429). Silakan masukkan API Key dari akun Google lain di tab Pengaturan untuk langsung melanjutkan riset.';
    } else if (isAuthError) {
      pesanGalat = 'Kunci API Gemini tidak valid atau tidak diizinkan. Silakan periksa kembali API Key di tab Pengaturan.';
    } else if (isUnavailable) {
      pesanGalat = 'Server Google Gemini sedang mengalami lonjakan beban sementara (HTTP 503). Silakan klik "Coba Lagi" atau masukkan API Key dari akun lain.';
    } else if (msg) {
      pesanGalat = msg.slice(0, 180);
    }

    // Selalu kirim status HTTP 200 agar peramban Safari di iOS iframe tidak menganggapnya sebagai koneksi terputus (Load failed)
    res.status(200).json({
      success: false,
      status: 'galat',
      pesan_galat: pesanGalat,
      web_search_queries: [],
      search_entry_point_html: null,
      kandidat: [],
    });
  }
}

/**
 * Endpoint pengujian kunci API langsung dari halaman Pengaturan
 */
export async function handleApiTestKeyRequest(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Metode harus POST.' });
    return;
  }

  const clientApiKey =
    req.body?.apiKey ||
    req.headers?.['x-gemini-api-key'] ||
    req.headers?.['X-Gemini-Api-Key'];

  const testKey =
    typeof clientApiKey === 'string' && clientApiKey.trim().length > 0
      ? clientApiKey.trim()
      : process.env.GEMINI_API_KEY;

  if (!testKey) {
    res.status(200).json({
      success: false,
      message: 'Kunci API belum diisi. Masukkan kunci API Gemini terlebih dahulu.',
    });
    return;
  }

  try {
    // 1. Verifikasi autentikasi cepat ke Google Generative Language API (<300ms)
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(testKey)}&pageSize=1`;
    const authRes = await fetch(directUrl, {
      signal: AbortSignal.timeout(3500),
    });

    if (!authRes.ok) {
      const errBody: any = await authRes.json().catch(() => ({}));
      const errCode = authRes.status;
      const errMsg = errBody?.error?.message || '';

      if (
        errCode === 401 ||
        errCode === 400 ||
        errCode === 403 ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
        errMsg.includes('not valid')
      ) {
        res.status(200).json({
          success: false,
          isValidKey: false,
          message: 'Kunci API tidak valid atau salah karakter (HTTP 400/401). Pastikan menyalin seluruh teks kunci dari Google AI Studio.',
        });
        return;
      }

      if (errCode === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
        res.status(200).json({
          success: false,
          isValidKey: true,
          isQuotaExhausted: true,
          message: 'Kunci API valid, namun kuota akun ini telah habis (HTTP 429 RESOURCE_EXHAUSTED). Gunakan kunci dari akun Google lain.',
        });
        return;
      }

      res.status(200).json({
        success: false,
        message: `Google API merespons status ${errCode}: ${errMsg.slice(0, 120)}`,
      });
      return;
    }

    // 2. Kunci terbukti valid dan terautentikasi oleh Google!
    // Jalankan probe singkat (maksimal 2.5 detik) untuk mengecek ketersediaan kuota inferensi
    let isQuotaExhausted = false;
    let isHighDemand = false;

    try {
      const ai = new GoogleGenAI({
        apiKey: testKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL_NAME,
          contents: 'Ping',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PROBE_TIMEOUT')), 2500)),
      ]);
    } catch (probeErr: any) {
      const pMsg = probeErr?.message || '';
      if (probeErr?.status === 429 || pMsg.includes('429') || pMsg.includes('RESOURCE_EXHAUSTED')) {
        isQuotaExhausted = true;
      } else if (probeErr?.status === 503 || pMsg.includes('503') || pMsg.includes('UNAVAILABLE')) {
        isHighDemand = true;
      }
      // Jika PROBE_TIMEOUT, abaikan karena kunci sudah terbukti valid pada langkah 1
    }

    if (isQuotaExhausted) {
      res.status(200).json({
        success: false,
        isValidKey: true,
        isQuotaExhausted: true,
        message: 'Kunci API valid dan terdaftar, TETAPI kuota permintaan akun Google ini telah habis (HTTP 429 RESOURCE_EXHAUSTED). Anda perlu membuat API Key baru dari akun Google lain.',
      });
      return;
    }

    if (isHighDemand) {
      res.status(200).json({
        success: true,
        isValidKey: true,
        message: 'Kunci API aktif dan valid! (Catatan: Server Gemini sedang mengalami lonjakan beban sementara HTTP 503, kunci tetap dapat disimpan).',
      });
      return;
    }

    res.status(200).json({
      success: true,
      isValidKey: true,
      message: 'Koneksi berhasil! Kunci API Gemini aktif dan siap digunakan untuk mencari ide niche.',
    });
  } catch (err: any) {
    const msg = err?.message || '';
    res.status(200).json({
      success: false,
      message: `Pemeriksaan kunci selesai dengan catatan: ${msg.slice(0, 120) || 'Koneksi jaringan lambat.'}`,
    });
  }
}

