/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL_NAME } from './src/config/model.ts';
import type { GroundingSource, MicrostockCategory, NicheRawIdea } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Inisialisasi Google GenAI SDK di sisi server
// Aturan 2: API key Gemini hanya dipakai di sisi server (process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Helper untuk mengekstrak metadata grounding secara aman
 * Aturan 4: URL sumber hanya boleh berasal dari metadata grounding (groundingChunks), bukan dari teks yang ditulis model.
 * Dilarang mengambil (fetch) URL sumber dari server.
 */
function extractGroundingSources(responseCandidate: any): GroundingSource[] {
  const sources: GroundingSource[] = [];
  const chunks = responseCandidate?.groundingMetadata?.groundingChunks;

  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      if (chunk?.web?.uri && typeof chunk.web.uri === 'string') {
        sources.push({
          uri: chunk.web.uri,
          title: chunk.web.title || chunk.web.uri,
        });
      }
    }
  }

  // Hilangkan duplikat URI
  const seen = new Set<string>();
  return sources.filter((item) => {
    if (seen.has(item.uri)) return false;
    seen.add(item.uri);
    return true;
  });
}

/**
 * Helper parsing JSON kualitatif dari jawaban model
 */
function parseIdeasFromJsonText(text: string, defaultCategory: MicrostockCategory): NicheRawIdea[] {
  let cleaned = text.trim();

  // Bersihkan markdown code fence jika ada
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed) ? parsed : parsed.ide || parsed.niches || [parsed];
    return list.map((item: any, idx: number) => ({
      id: `niche-${Date.now()}-${idx}`,
      judul: String(item.judul || item.title || `Ide Niche #${idx + 1}`),
      kategori: (item.kategori === 'real_photo' || item.kategori === 'ai_photo' || item.kategori === 'ai_illustration'
        ? item.kategori
        : defaultCategory) as MicrostockCategory,
      deskripsiVisual: String(item.deskripsiVisual || item.visualDescription || item.deskripsi || ''),
      elemenKunci: Array.isArray(item.elemenKunci)
        ? item.elemenKunci.map(String)
        : Array.isArray(item.visualElements)
          ? item.visualElements.map(String)
          : [],
      kataKunciRekomendasi: Array.isArray(item.kataKunciRekomendasi)
        ? item.kataKunciRekomendasi.map(String)
        : Array.isArray(item.keywords)
          ? item.keywords.map(String)
          : [],
      targetIndustri: Array.isArray(item.targetIndustri)
        ? item.targetIndustri.map(String)
        : Array.isArray(item.targetAudience)
          ? item.targetAudience.map(String)
          : ['Umum / Komersial'],
      alasanKebutuhanPembeli: String(item.alasanKebutuhanPembeli || item.buyerNeed || 'Kebutuhan visual pemasaran dan editorial.'),
      rekomendasiPlatform: Array.isArray(item.rekomendasiPlatform)
        ? item.rekomendasiPlatform.map(String)
        : ['Adobe Stock', 'Shutterstock', 'Freepik'],
      statusGroundingAI: false, // Akan diputuskan oleh kode
    }));
  } catch (err) {
    console.warn('Gagal mem-parse JSON murni dari model, melakukan fallback ekstraksi baris:', err);
    // Fallback minimal jika teks bukan format JSON murni
    return [
      {
        id: `niche-${Date.now()}-0`,
        judul: 'Eksplorasi Niche Microstock Berbasis Tren',
        kategori: defaultCategory,
        deskripsiVisual: cleaned.substring(0, 300) + '...',
        elemenKunci: ['Komposisi subjek utama', 'Pencahayaan komersial', 'Ruang copy-space'],
        kataKunciRekomendasi: ['microstock trend', 'commercial photography', 'authentic visual', 'high demand concept'],
        targetIndustri: ['Editorial', 'Advertising', 'Digital Marketing'],
        alasanKebutuhanPembeli: 'Kebutuhan aset kampanye iklan digital dan publikasi konten.',
        rekomendasiPlatform: ['Adobe Stock', 'Shutterstock', 'Getty Images'],
        statusGroundingAI: false,
      },
    ];
  }
}

// Endpoint API: Pencarian Niche dengan Google Search Grounding
app.post('/api/scout-niche', async (req, res) => {
  try {
    const { kategori = 'real_photo', topikUtama = '', targetMusimAtauBulan = '', gayaVisualTambahan = '' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server environment.',
      });
    }

    const categoryLabel =
      kategori === 'real_photo'
        ? 'Foto Nyata / Real Photography (keaslian, staging fisik, model, emosi otentik)'
        : kategori === 'ai_photo'
          ? 'Foto AI Generatif Komersial (fotorealistik, konsep unik yang sulit difoto langsung)'
          : 'Ilustrasi AI / Vektor AI (flat, 3D render komersial, ikonografi, background terisolasi)';

    // Prompt khusus dengan aturan ketat:
    // Model dilarang mengarang angka/skor/statistik atau tanggal (Aturan 3)
    const prompt = `
Peran: Anda adalah kurator riset tren pasar microstock (Adobe Stock, Shutterstock, Freepik, Getty Images/iStock).
Lakukan riset web terkini dengan Google Search untuk mencari tren niche dan visual yang sedang dibutuhkan pembeli komersial.

Parameter Permintaan:
- Format Kategori Konten: ${categoryLabel}
- Topik / Niche yang Dituju: ${topikUtama || 'Tren microstock paling dicari saat ini'}
${targetMusimAtauBulan ? `- Konteks Musiman / Momen: ${targetMusimAtauBulan}` : ''}
${gayaVisualTambahan ? `- Preferensi Gaya Visual: ${gayaVisualTambahan}` : ''}

ATURAN SANGAT KETAT:
1. JANGAN PERNAH menghitung, mengarang angka, statistik persen, estimasi jumlah download, atau estimasi jumlah hasil pencarian.
2. JANGAN PERNAH menghitung atau mengarang tanggal rilis atau jarak hari.
3. Seluruh evaluasi numerik akan dihitung oleh KODE secara terpisah. Anda HANYA memberikan riset kualitatif, konsep visual, kata kunci, dan alasan kebutuhan pembeli.
4. Hasilkan 3 sampai 4 ide niche spesifik (bukan ide generik yang sudah jenuh).
5. Berikan jawaban HANYA berupa array JSON valid tanpa teks pengantar di luar blok JSON.

Format setiap objek dalam array JSON:
[
  {
    "judul": "Nama niche ringkas & spesifik",
    "kategori": "${kategori}",
    "deskripsiVisual": "Penjelasan detail komposisi, sudut kamera/pencahayaan, subjek, mood, dan area copy-space.",
    "elemenKunci": ["elemen 1", "elemen 2", "elemen 3", "elemen 4"],
    "kataKunciRekomendasi": ["keyword inggris 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6"],
    "targetIndustri": ["Nama industri 1", "Nama industri 2"],
    "alasanKebutuhanPembeli": "Mengapa perusahaan / agensi membutuhkan visual ini saat ini.",
    "rekomendasiPlatform": ["Adobe Stock", "Shutterstock", "Freepik"]
  }
]
`.trim();

    // Memanggil model rekomendasi Build mode: GEMINI_MODEL_NAME ('gemini-3.8-flash')
    // Mengaktifkan Google Search Grounding: tools: [{ googleSearch: {} }]
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseCandidate = response.candidates?.[0];
    const generatedText = response.text || '';

    // Aturan 4: URL sumber hanya boleh berasal dari metadata grounding (groundingChunks)
    const groundingSources = extractGroundingSources(responseCandidate);

    // Parsing ide mentah kualitatif
    const rawIdeas = parseIdeasFromJsonText(generatedText, kategori as MicrostockCategory);

    // Kembalikan ke klien: Data kualitatif murni + daftar grounding sources resmi
    // Tanpa menyertakan API key atau skor buatan AI
    return res.json({
      success: true,
      modelUsed: GEMINI_MODEL_NAME,
      rawIdeas,
      groundingSources,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error pada /api/scout-niche:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Terjadi kesalahan saat memproses permintaan grounding.',
    });
  }
});

// TAHAP 6: Rute Resmi POST /api/niche (memakai modul bersama yang sama persis dengan Vercel api/niche.ts)
app.post('/api/niche', async (req, res) => {
  const { handleApiNicheRequest } = await import('./lib/nicheHandler.ts');
  return handleApiNicheRequest(req, res);
});

// Endpoint untuk menguji kunci API Gemini langsung dari Pengaturan
app.post('/api/test-key', async (req, res) => {
  const { handleApiTestKeyRequest } = await import('./lib/nicheHandler.ts');
  return handleApiTestKeyRequest(req, res);
});

// Endpoint status kesehatan backend
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    appName: 'Niche Scout',
    model: GEMINI_MODEL_NAME,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const portNumber = Number(PORT) || 3000;
  const httpServer = http.createServer(app);

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: portNumber,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(portNumber, '0.0.0.0', () => {
    console.log(`Niche Scout server running on http://0.0.0.0:${portNumber} (model: ${GEMINI_MODEL_NAME})`);
  });
}

startServer();
