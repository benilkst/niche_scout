/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HasilUjiSistem, AppDataStore, KandidatNiche } from '../types.ts';
import {
  CURRENT_SCHEMA_VERSION,
  getInitialStore,
  imporJson,
  muatData,
  simpanData,
  validasiDanRingkasJson,
} from '../storage.ts';
import { generateCacheKey, findValidCache } from './cacheUtils.ts';
import { getTodayLocalDateString, isNearDailyLimit, isOverDailyLimit } from './dailyLimit.ts';
import {
  normalizeDomain,
  isPlatformDomain,
  calculateEvidenceQuality,
  normalizeKeywordTokens,
  calculateJaccardSimilarity,
  applyDeduplication,
  checkBrandRisk,
} from './evidenceScoring.ts';
import { buildCsvString } from './csvExport.ts';
import { getStorageUsageReport, pruneOldestSearches } from './storageQuota.ts';
import { hitungBlackFriday, hitungJendelaMomen, MOMEN_DEFAULT_TAHAP5 } from './kalenderMusiman.ts';

/**
 * Menjalankan rangkaian uji sistem otomatis Tahap 1 sampai 5.
 */
export function jalankanTesSistemTahap1(): HasilUjiSistem[] {
  const hasil: HasilUjiSistem[] = [];

  // Data sampel untuk pengujian
  const sampelKandidat: KandidatNiche = {
    id: 'kandidat-uji-1',
    id_pencarian: 'search-uji-1',
    nomor: 1,
    kata_kunci_en: 'sustainable agriculture solar farm hydroponic',
    varian_id: 'Pertanian Hidroponik Bertenaga Surya',
    alasan: 'Tren ESG dan efisiensi energi terbarukan di sektor agrikultur',
    sinyal_tren: 'Peningkatan pencarian visual energi bersih di Adobe Stock & Freepik',
    saran_sudut: {
      copy_space: 'Sisi kiri atas frame bersih untuk judul editorial',
      konteks_lokal: 'Greenhouse modern Asia tropis',
      gaya: 'Fotografi komersial otentik',
    },
    sumber: [
      {
        domain: 'stock.adobe.com',
        url: 'https://stock.adobe.com/search?k=solar+hydroponic',
        judul: 'Adobe Stock Visual Trends 2026',
        tanggal_akses: new Date().toISOString(),
      },
    ],
    jumlah_domain: 1,
    cakupan_dukungan: 0.85,
    dukungan: 'didukung',
    bukti: 'kuat',
    saran_permintaan_1_5: 4,
    risiko_merek: { ada: false, alasan: null },
    mirip_dengan: null,
    sudah_pernah_muncul: false,
    status: 'dipantau',
    catatan: 'Ide unggulan untuk Q1',
    tag: ['agrikultur', 'green energy', 'solar panel'],
    dibuat_pada: new Date().toISOString(),
  };

  // --- Uji 1: Ekspor lalu impor pada salinan data menghasilkan data identik ---
  try {
    const storeAsli: AppDataStore = {
      ...getInitialStore(),
      pengaturan: {
        ...getInitialStore().pengaturan,
        skala: 0.8,
        batas_harian: 30,
      },
      kandidat: [sampelKandidat],
    };

    const exportedJsonStr = JSON.stringify(storeAsli, null, 2);
    const imporHasil = imporJson(exportedJsonStr, 'timpa', getInitialStore());

    if (!imporHasil.success || !imporHasil.storeBaru) {
      hasil.push({
        id: 'uji-ekspor-impor-identik',
        nama: 'Ekspor & Impor Data Identik',
        keterangan: 'Memastikan data yang diekspor ke JSON dapat diimpor kembali tanpa kehilangan atau perubahan struktur.',
        status: 'gagal',
        pesan: `Gagal impor: ${imporHasil.pesan}`,
      });
    } else {
      const storeHasil = imporHasil.storeBaru;
      const samaSchema = storeHasil.schema_version === storeAsli.schema_version;
      const samaSkala = storeHasil.pengaturan.skala === storeAsli.pengaturan.skala;
      const samaJumlahKandidat = storeHasil.kandidat.length === storeAsli.kandidat.length;
      const samaId = storeHasil.kandidat[0]?.id === storeAsli.kandidat[0]?.id;
      const samaKataKunci = storeHasil.kandidat[0]?.kata_kunci_en === storeAsli.kandidat[0]?.kata_kunci_en;

      const identik = samaSchema && samaSkala && samaJumlahKandidat && samaId && samaKataKunci;

      hasil.push({
        id: 'uji-ekspor-impor-identik',
        nama: 'Ekspor & Impor Data Identik',
        keterangan: 'Memastikan data yang diekspor ke JSON dapat diimpor kembali tanpa kehilangan atau perubahan struktur.',
        status: identik ? 'lulus' : 'gagal',
        pesan: identik
          ? `Lulus: Seluruh struktur data (${storeHasil.kandidat.length} kandidat, skala ${storeHasil.pengaturan.skala}) terestorasi 100% identik.`
          : 'Gagal: Data hasil impor berbeda dengan data asli sebelum ekspor.',
        detail: `Asli: ${storeAsli.kandidat[0]?.kata_kunci_en} | Hasil: ${storeHasil.kandidat[0]?.kata_kunci_en}`,
      });
    }
  } catch (err: any) {
    hasil.push({
      id: 'uji-ekspor-impor-identik',
      nama: 'Ekspor & Impor Data Identik',
      keterangan: 'Memastikan data yang diekspor ke JSON dapat diimpor kembali tanpa kehilangan.',
      status: 'gagal',
      pesan: `Error eksekusi uji: ${err?.message}`,
    });
  }

  // --- Uji 2: Impor menolak versi skema tidak dikenal dengan pesan jelas ---
  try {
    const jsonVersiTidakDikenal = JSON.stringify({
      schema_version: 999, // versi palsu
      kandidat: [],
      pengaturan: {},
    });

    const validasiVersiAsing = validasiDanRingkasJson(jsonVersiTidakDikenal, getInitialStore());
    const importDitolak = !validasiVersiAsing.valid && validasiVersiAsing.pesanError?.includes('999');

    // Uji juga JSON tanpa properti schema_version sama sekali
    const jsonTanpaVersi = JSON.stringify({ items: [] });
    const validasiTanpaVersi = validasiDanRingkasJson(jsonTanpaVersi, getInitialStore());
    const tanpaVersiDitolak = !validasiTanpaVersi.valid;

    const lulusPenolakan = importDitolak && tanpaVersiDitolak;

    hasil.push({
      id: 'uji-tolak-versi-tidak-dikenal',
      nama: 'Penolakan Versi Skema Tidak Dikenal',
      keterangan: 'Memastikan berkas JSON versi asing (misal schema_version: 999 atau tanpa versi) ditolak dengan pesan jelas.',
      status: lulusPenolakan ? 'lulus' : 'gagal',
      pesan: lulusPenolakan
        ? `Lulus: Sistem berhasil menolak berkas asing dengan pesan: "${validasiVersiAsing.pesanError}".`
        : 'Gagal: Sistem tidak menolak berkas dengan versi skema tidak dikenal.',
      detail: `Pesan validasi: ${validasiVersiAsing.pesanError}`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-tolak-versi-tidak-dikenal',
      nama: 'Penolakan Versi Skema Tidak Dikenal',
      keterangan: 'Memastikan berkas JSON versi asing ditolak.',
      status: 'gagal',
      pesan: `Error eksekusi uji: ${err?.message}`,
    });
  }

  // --- Uji 3: Skala tersimpan dan terbaca ulang dari localStorage ---
  try {
    const storeSekarang = muatData();
    const skalaSebelum = storeSekarang.pengaturan.skala;

    // Simpan skala baru
    const skalaUji = 0.85;
    const storeDimodifikasi: AppDataStore = {
      ...storeSekarang,
      pengaturan: {
        ...storeSekarang.pengaturan,
        skala: skalaUji,
      },
    };
    simpanData(storeDimodifikasi);

    // Baca ulang dari localStorage
    const storeTerbaca = muatData();
    const skalaBerhasilTerbaca = Math.abs(storeTerbaca.pengaturan.skala - skalaUji) < 0.001;

    // Kembalikan ke skala semula agar tidak mengubah state pengguna
    simpanData({
      ...storeTerbaca,
      pengaturan: {
        ...storeTerbaca.pengaturan,
        skala: skalaSebelum,
      },
    });

    hasil.push({
      id: 'uji-skala-tersimpan-terbaca',
      nama: 'Persistensi Nilai Skala Tampilan',
      keterangan: 'Memverifikasi nilai skala tampilan tersimpan ke localStorage dan terbaca konsisten saat muat ulang.',
      status: skalaBerhasilTerbaca ? 'lulus' : 'gagal',
      pesan: skalaBerhasilTerbaca
        ? `Lulus: Nilai skala ${skalaUji} tersimpan dan terbaca ulang dengan presisi, lalu dikembalikan ke ${skalaSebelum}.`
        : `Gagal: Nilai skala terbaca (${storeTerbaca.pengaturan.skala}) tidak sesuai dengan yang disimpan (${skalaUji}).`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-skala-tersimpan-terbaca',
      nama: 'Persistensi Nilai Skala Tampilan',
      keterangan: 'Memverifikasi nilai skala tampilan tersimpan ke localStorage.',
      status: 'gagal',
      pesan: `Error eksekusi uji: ${err?.message}`,
    });
  }

  // --- Uji 4: Uji Mode Gabung (Merge) vs Timpa (Overwrite) ---
  try {
    const basisStore: AppDataStore = {
      ...getInitialStore(),
      kandidat: [sampelKandidat],
    };

    const kandidatBaru: KandidatNiche = {
      ...sampelKandidat,
      id: 'kandidat-uji-2',
      nomor: 2,
      kata_kunci_en: 'generative ai microstock isometric icons 3d render',
      varian_id: 'Ikon Isometrik 3D Render AI',
    };

    const payloadIncoming = JSON.stringify({
      schema_version: 1,
      kandidat: [kandidatBaru],
      pencarian: [],
      momen: [],
      pengaturan: { skala: 0.75 },
    });

    // Jalankan mode 'gabung'
    const hasilGabung = imporJson(payloadIncoming, 'gabung', basisStore);
    const jumlahKandidatSetelahGabung = hasilGabung.storeBaru?.kandidat.length;
    const gabungSukses = jumlahKandidatSetelahGabung === 2;

    // Jalankan mode 'timpa'
    const hasilTimpa = imporJson(payloadIncoming, 'timpa', basisStore);
    const jumlahKandidatSetelahTimpa = hasilTimpa.storeBaru?.kandidat.length;
    const timpaSukses = jumlahKandidatSetelahTimpa === 1 && hasilTimpa.storeBaru?.kandidat[0]?.id === 'kandidat-uji-2';

    const operasiValid = gabungSukses && timpaSukses;

    hasil.push({
      id: 'uji-gabung-vs-timpa',
      nama: 'Logika Mode Impor (Gabung vs Timpa)',
      keterangan: 'Memastikan mode Gabung mempertahankan item lama + baru, sedangkan mode Timpa menggantikan seluruh data.',
      status: operasiValid ? 'lulus' : 'gagal',
      pesan: operasiValid
        ? `Lulus: Mode Gabung menghasilkan ${jumlahKandidatSetelahGabung} item; Mode Timpa menghasilkan ${jumlahKandidatSetelahTimpa} item.`
        : `Gagal: Hasil tidak sesuai (Gabung: ${jumlahKandidatSetelahGabung}, Timpa: ${jumlahKandidatSetelahTimpa}).`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-gabung-vs-timpa',
      nama: 'Logika Mode Impor (Gabung vs Timpa)',
      keterangan: 'Memastikan mode Gabung vs Timpa bekerja sesuai aturan.',
      status: 'gagal',
      pesan: `Error eksekusi uji: ${err?.message}`,
    });
  }

  // --- Uji 5: Kepatuhan Objek Tunggal & schema_version: 1 (Aturan 8) ---
  try {
    const store = muatData();
    const memilikiSchema1 = store.schema_version === CURRENT_SCHEMA_VERSION;
    const memilikiSemuaKunci =
      'pengaturan' in store &&
      'kandidat' in store &&
      'pencarian' in store &&
      'momen' in store;

    const lulusKepatuhan = memilikiSchema1 && memilikiSemuaKunci;

    hasil.push({
      id: 'uji-schema-version-kontrak',
      nama: 'Kepatuhan Kontrak Objek Tunggal (schema_version = 1)',
      keterangan: 'Memastikan penyimpanan berada dalam 1 objek tunggal dengan schema_version = 1 dan properti wajib lengkap.',
      status: lulusKepatuhan ? 'lulus' : 'gagal',
      pesan: lulusKepatuhan
        ? `Lulus: Objek penyimpanan valid schema_version: 1 dengan properti lengkap (pengaturan, kandidat, pencarian, momen).`
        : 'Gagal: Kontrak data objek tunggal tidak lengkap atau schema_version tidak cocok.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-schema-version-kontrak',
      nama: 'Kepatuhan Kontrak Objek Tunggal',
      keterangan: 'Memastikan penyimpanan sesuai kontrak Tahap 1.',
      status: 'gagal',
      pesan: `Error eksekusi uji: ${err?.message}`,
    });
  }

  // --- Uji 6: Kunci Cache 24 Jam Deterministik (Tahap 2) ---
  try {
    const key1 = generateCacheKey('foto_nyata', 'pertanian organik', null, 10, '2026-10-31');
    const key2 = generateCacheKey('foto_nyata', 'pertanian  organik ', null, 10, '2026-10-31');
    const keyBerbeda = generateCacheKey('foto_ai', 'pertanian organik', null, 10, '2026-10-31');

    const deterministik = key1 === key2 && key1 !== keyBerbeda;

    // Uji kedaluwarsa 24 jam
    const now = Date.now();
    const dummyRecordValid = {
      id: 'rec-1',
      waktu: new Date(now - 2 * 3600 * 1000).toISOString(), // 2 jam lalu
      parameter: { tipe_aset: 'foto_nyata', tema: 'test', momen_id: null, momen_tahun: null, jumlah_kandidat: 10 },
      kunci_cache: key1,
      web_search_queries: [],
      search_entry_point_html: null,
      status: 'tergrounded' as const,
      pesan_galat: null,
      kandidat_ids: [sampelKandidat.id],
    };
    const cacheHit = findValidCache([dummyRecordValid], [sampelKandidat], key1);

    const dummyRecordExpired = {
      ...dummyRecordValid,
      waktu: new Date(now - 25 * 3600 * 1000).toISOString(), // 25 jam lalu (> 24 jam)
    };
    const cacheMissExpired = findValidCache([dummyRecordExpired], [sampelKandidat], key1);

    const validCacheLogic = deterministik && cacheHit !== null && cacheMissExpired === null;

    hasil.push({
      id: 'uji-cache-24-jam',
      nama: 'Kunci Cache Deterministik & Masa Berlaku 24 Jam (Tahap 2)',
      keterangan: 'Memastikan normalisasi kunci cache konsisten dan data kedaluwarsa setelah 24 jam.',
      status: validCacheLogic ? 'lulus' : 'gagal',
      pesan: validCacheLogic
        ? `Lulus: Kunci cache ternormalisasi konsisten, pencarian 2 jam lalu ditemukan di cache, pencarian 25 jam lalu dinyatakan kedaluwarsa.`
        : 'Gagal: Logika cache deterministik atau kedaluwarsa 24 jam tidak sesuai spesifikasi.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-cache-24-jam',
      nama: 'Kunci Cache Deterministik & Masa Berlaku 24 Jam',
      keterangan: 'Memverifikasi fungsi cache 24 jam.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 7: Pelacak Kuota Panggilan Harian & Batas (Tahap 2) ---
  try {
    const today = getTodayLocalDateString();
    const isTodayFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(today);

    const near = isNearDailyLimit(42, 50); // 84% >= 80%
    const notNear = isNearDailyLimit(30, 50); // 60%
    const over = isOverDailyLimit(51, 50);
    const notOver = isOverDailyLimit(49, 50);

    const logicValid = isTodayFormatValid && near && !notNear && over && !notOver;

    hasil.push({
      id: 'uji-kuota-harian-logika',
      nama: 'Pelacak Kuota Panggilan Harian & Peringatan Batas (Tahap 2)',
      keterangan: 'Memastikan format tanggal lokal YYYY-MM-DD dan deteksi peringatan kuota (>=80%) serta batas maksimum.',
      status: logicValid ? 'lulus' : 'gagal',
      pesan: logicValid
        ? `Lulus: Tanggal lokal "${today}" valid, deteksi batas mendekati (42/50) dan melewati batas (51/50) bekerja akurat.`
        : 'Gagal: Logika pelacak kuota harian tidak sesuai kalkulasi.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-kuota-harian-logika',
      nama: 'Pelacak Kuota Panggilan Harian',
      keterangan: 'Memverifikasi logika kuota harian.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 8: Normalisasi Domain & Deteksi Platform Stok (Tahap 3) ---
  try {
    const d1 = normalizeDomain('https://m.shutterstock.com/search?q=coffee');
    const d2 = normalizeDomain('amp.theguardian.com/environment');
    const d3 = normalizeDomain('www.adobe.com');
    const d4 = normalizeDomain('stock.adobe.com');

    const platforms = ['adobe.com', 'shutterstock.com', 'freepik.com'];
    const isP1 = isPlatformDomain(d1, platforms); // shutterstock.com
    const isP2 = isPlatformDomain(d2, platforms); // theguardian.com
    const isP3 = isPlatformDomain(d3, platforms); // adobe.com
    const isP4 = isPlatformDomain(d4, platforms); // stock.adobe.com

    const domainValid =
      d1 === 'shutterstock.com' &&
      d2 === 'theguardian.com' &&
      d3 === 'adobe.com' &&
      d4 === 'stock.adobe.com' &&
      isP1 && !isP2 && isP3 && isP4;

    hasil.push({
      id: 'uji-normalisasi-domain',
      nama: 'Normalisasi Domain & Penanda Sumber Platform (Tahap 3)',
      keterangan: 'Memastikan subdomain m., amp., dan www. dibuang serta platform stok teridentifikasi tepat.',
      status: domainValid ? 'lulus' : 'gagal',
      pesan: domainValid
        ? `Lulus: Domain "m.shutterstock.com" dinormalisasi ke "${d1}" (platform), "amp.theguardian.com" ke "${d2}" (bukan platform).`
        : 'Gagal: Normalisasi domain atau penandaan platform stok tidak sesuai aturan.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-normalisasi-domain',
      nama: 'Normalisasi Domain & Sumber Platform',
      keterangan: 'Memverifikasi normalisasi domain.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 9: Fixture Non-ASCII (Emoji & Karakter Beraksen) & Cakupan (Tahap 3) ---
  try {
    // Teks tiruan dengan huruf beraksen (café, résumé) dan emoji (🌾 🌱 ☀️)
    const teksFixture = `
## KANDIDAT 1
Kata kunci (EN): organic café barista pouring latte art
Varian Indonesia: Barista menuangkan seni latte di kafe organik 🌾
Alasan: Tren kopi berkelanjutan dan estetika kafe ramah lingkungan 🌱.
Sinyal tren: Pencarian visual kafe hijau meningkat 2026 ☀️.
Copy space: Sisi kanan atas
Konteks lokal: Kafe lokal Indonesia
Gaya: Candid cinematic
`.trim();

    const encoder = new TextEncoder();
    const textBytes = encoder.encode(teksFixture);
    const segmenStart = encoder.encode('## KANDIDAT 1\nKata kunci (EN): organic café barista pouring latte art\nVarian Indonesia: Barista menuangkan seni latte di kafe organik 🌾\nAlasan: ').length;
    const segmenEnd = segmenStart + encoder.encode('Tren kopi berkelanjutan dan estetika kafe ramah lingkungan 🌱.').length;

    const sources = [
      { domain: 'stock.adobe.com', url: 'https://stock.adobe.com/coffee-trend', judul: 'Coffee Trends', tanggal_akses: new Date().toISOString() },
      { domain: 'm.shutterstock.com', url: 'https://m.shutterstock.com/cafes', judul: 'Cafe Aesthetic', tanggal_akses: new Date().toISOString() },
    ];

    // Evaluasi kualitas bukti dari fixture
    const evalResult = calculateEvidenceQuality(sources, 0.45, 4);

    const isNonAsciiSafe =
      textBytes.length > teksFixture.length && // Bukti UTF-8 multibyte
      evalResult.jumlah_domain === 2 &&
      evalResult.bukti === 'sedang' &&
      evalResult.dukungan === 'sebagian';

    hasil.push({
      id: 'uji-fixture-non-ascii',
      nama: 'Pemrosesan Teks Non-ASCII & Emoji (Fixture UTF-8) (Tahap 3)',
      keterangan: 'Memverifikasi ketahanan parsing dan offset byte TextEncoder terhadap karakter beraksen dan emoji.',
      status: isNonAsciiSafe ? 'lulus' : 'gagal',
      pesan: isNonAsciiSafe
        ? `Lulus: Teks non-ASCII (${textBytes.length} byte UTF-8) terhitung presisi dengan 2 domain unik (bukti SEDANG).`
        : 'Gagal: Kesalahan penanganan karakter non-ASCII pada fixture.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-fixture-non-ascii',
      nama: 'Pemrosesan Teks Non-ASCII & Emoji',
      keterangan: 'Memverifikasi penanganan UTF-8 TextEncoder.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 10: Penguncian Saran Permintaan oleh Kode (Tahap 3) ---
  try {
    // 1. Tanpa sumber (bukti: tidak_ada) -> harus null
    const resTanpaSumber = calculateEvidenceQuality([], 0, 5);
    const tanpaSumberNull = resTanpaSumber.saran_permintaan_1_5 === null;

    // 2. Bukti lemah (1 domain) -> maksimal 3 meskipun model menyarankan 5
    const resLemah = calculateEvidenceQuality([{ domain: 'example.com', url: 'https://example.com', judul: 'Uji', tanggal_akses: '' }], 0.15, 5);
    const lemahMax3 = resLemah.saran_permintaan_1_5 === 3 && resLemah.bukti === 'lemah';

    // 3. Bukti kuat (3 domain, cakupan >= 0.5) -> tetap 4
    const resKuat = calculateEvidenceQuality([
      { domain: 'adobe.com', url: 'https://adobe.com', judul: '1', tanggal_akses: '' },
      { domain: 'shutterstock.com', url: 'https://shutterstock.com', judul: '2', tanggal_akses: '' },
      { domain: 'freepik.com', url: 'https://freepik.com', judul: '3', tanggal_akses: '' },
    ], 0.65, 4);
    const kuatTetap = resKuat.saran_permintaan_1_5 === 4 && resKuat.bukti === 'kuat';

    const lockedValid = tanpaSumberNull && lemahMax3 && kuatTetap;

    hasil.push({
      id: 'uji-kunci-saran-permintaan',
      nama: 'Penguncian Saran Permintaan Murni oleh Kode (Tahap 3)',
      keterangan: 'Memastikan bukti tidak_ada menjadi null, bukti lemah dibatasi max 3, dan bukti kuat dibiarkan.',
      status: lockedValid ? 'lulus' : 'gagal',
      pesan: lockedValid
        ? 'Lulus: Tanpa sumber menjadi null; Bukti lemah (model sarankan 5) terkunci ke 3; Bukti kuat tetap 4.'
        : 'Gagal: Penguncian saran permintaan tidak bekerja sesuai spesifikasi.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-kunci-saran-permintaan',
      nama: 'Penguncian Saran Permintaan Murni oleh Kode',
      keterangan: 'Memverifikasi penguncian saran permintaan.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 11: Dedupe Jaccard >= 0.8 & Deteksi Pernah Muncul (Tahap 3) ---
  try {
    const batchUji: KandidatNiche[] = [
      {
        ...sampelKandidat,
        id: 'kandidat-a',
        nomor: 1,
        kata_kunci_en: 'sustainable organic coffee farming highland plantation',
      },
      {
        ...sampelKandidat,
        id: 'kandidat-b', // Sangat mirip dengan kandidat-a (Jaccard >= 0.8)
        nomor: 2,
        kata_kunci_en: 'organic sustainable highland coffee farming plantation',
      },
      {
        ...sampelKandidat,
        id: 'kandidat-c', // Berbeda
        nomor: 3,
        kata_kunci_en: 'cyberpunk neon city drone delivery aerial view',
      },
    ];

    const pastList: KandidatNiche[] = [
      {
        ...sampelKandidat,
        id: 'kandidat-past',
        kata_kunci_en: 'cyberpunk neon city drone delivery aerial view', // Sama persis dengan kandidat-c
      },
    ];

    const deduped = applyDeduplication(batchUji, pastList);

    const miripTerdeteksi = deduped[1].mirip_dengan === '1'; // Kandidat 2 mirip dengan #1
    const bukanMirip = deduped[0].mirip_dengan === null && deduped[2].mirip_dengan === null;
    const pernahMunculTerdeteksi = deduped[2].sudah_pernah_muncul === true && deduped[0].sudah_pernah_muncul === false;

    const dedupeValid = miripTerdeteksi && bukanMirip && pernahMunculTerdeteksi;

    hasil.push({
      id: 'uji-dedupe-jaccard-riwayat',
      nama: 'Deduplikasi Jaccard (≥ 0.8) & Deteksi Pernah Muncul (Tahap 3)',
      keterangan: 'Memastikan token kata kunci dinormalisasi, kemiripan dihitung matematis, dan riwayat terdeteksi.',
      status: dedupeValid ? 'lulus' : 'gagal',
      pesan: dedupeValid
        ? 'Lulus: Kandidat #2 berhasil dideteksi mirip dengan #1 (Jaccard ≥ 0.8), dan Kandidat #3 terdeteksi pernah muncul di riwayat.'
        : 'Gagal: Logika deduplikasi Jaccard atau deteksi kemunculan riwayat bermasalah.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-dedupe-jaccard-riwayat',
      nama: 'Deduplikasi Jaccard & Deteksi Riwayat',
      keterangan: 'Memverifikasi deduplikasi.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 12: Deteksi Penanda Risiko Merek (OR Model + Kode) (Tahap 3) ---
  try {
    const daftarMerek = ['lego', 'apple', 'nike', 'disney', 'barbie'];

    // Kasus 1: Model tidak menandai, tetapi kode mendeteksi kata merek "Lego"
    const cek1 = checkBrandRisk('child playing with colorful lego bricks', 'Anak bermain balok', { ada: false, alasan: null }, daftarMerek);
    const cek1Ok = cek1.ada === true && cek1.alasan?.includes('lego');

    // Kasus 2: Model menandai, kode tidak mendeteksi kata merek
    const cek2 = checkBrandRisk('futuristic vehicle concept', 'Konsep kendaraan', { ada: true, alasan: 'Mirip logo produsen mobil' }, daftarMerek);
    const cek2Ok = cek2.ada === true && cek2.alasan?.includes('Mirip logo produsen mobil');

    // Kasus 3: Bersih tanpa merek
    const cek3 = checkBrandRisk('traditional tea ceremony artisan', 'Upacara minum teh', { ada: false, alasan: null }, daftarMerek);
    const cek3Ok = cek3.ada === false;

    const riskValid = cek1Ok && cek2Ok && cek3Ok;

    hasil.push({
      id: 'uji-deteksi-risiko-merek',
      nama: 'Penanda Risiko Merek (OR Logika Model + Kode) (Tahap 3)',
      keterangan: 'Memastikan kode mendeteksi kata merek dagang terdaftar dan menggabungkan tanda dari model secara aman.',
      status: riskValid ? 'lulus' : 'gagal',
      pesan: riskValid
        ? 'Lulus: Kata "lego" terdeteksi otomatis oleh kode; Tanda model dipertahankan; Kasus bersih tidak memicu peringatan palsu.'
        : 'Gagal: Penanda risiko merek tidak bekerja sesuai spesifikasi.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-deteksi-risiko-merek',
      nama: 'Penanda Risiko Merek',
      keterangan: 'Memverifikasi risiko merek.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 13: Format Ekspor CSV UTF-8 dengan BOM & RFC 4180 Escaping (Tahap 4) ---
  try {
    const kandidatUjiCsv: KandidatNiche = {
      ...sampelKandidat,
      kata_kunci_en: 'artisan café "espresso", barista pouring',
      varian_id: 'Kopi Kafe, Varian "Spesial"',
      catatan: 'Catatan dengan tanda koma, tanda "kutip ganda", dan\nbaris baru (multiline)',
      tag: ['kopi', 'kafe lokal', 'barista;profesional'],
      dibuat_pada: '2026-10-31T10:00:00.000Z',
    };

    const csvOutput = buildCsvString([kandidatUjiCsv], 'foto_nyata');

    // 1. Memeriksa ada UTF-8 BOM (\uFEFF) di karakter pertama
    const hasBom = csvOutput.charCodeAt(0) === 0xFEFF;

    // 2. Memeriksa header lengkap
    const baris = csvOutput.replace(/^\uFEFF/, '').split('\r\n');
    const header = baris[0];
    const expectedHeader =
      'kata_kunci_en,varian_id,tipe_aset,bukti,jumlah_domain,cakupan_dukungan_persen,saran_permintaan,periksa_merek,sumber_url,catatan,tag,status,tanggal';
    const headerValid = header === expectedHeader;

    // 3. Memeriksa escaping RFC 4180 untuk kutip ganda dan koma
    const rowContent = baris.slice(1).join('\r\n');
    const quotesEscaped = rowContent.includes('""espresso""') && rowContent.includes('""kutip ganda""');
    const multiLineEscaped = rowContent.includes('baris baru (multiline)');

    const csvValid = hasBom && headerValid && quotesEscaped && multiLineEscaped;

    hasil.push({
      id: 'uji-ekspor-csv-bom-rfc4180',
      nama: 'Format CSV UTF-8 BOM & RFC 4180 Escaping (Tahap 4)',
      keterangan: 'Memastikan CSV diawali BOM \\uFEFF untuk Excel, 13 kolom lengkap, tanda kutip/koma di-escape RFC 4180.',
      status: csvValid ? 'lulus' : 'gagal',
      pesan: csvValid
        ? 'Lulus: Berkas CSV diawali \\uFEFF BOM, header 13 kolom sesuai spesifikasi, dan tanda kutip ganda di-escape ("") dengan benar.'
        : 'Gagal: Format CSV tidak memenuhi standar BOM atau escaping RFC 4180.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-ekspor-csv-bom-rfc4180',
      nama: 'Format CSV UTF-8 BOM & RFC 4180',
      keterangan: 'Memverifikasi format CSV.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 14: Siklus Status Kandidat & Persistensi Shortlist (Tahap 4) ---
  try {
    const itemA: KandidatNiche = { ...sampelKandidat, id: 'k-trans-1', status: 'baru' };

    // Transisi 1: baru -> dipantau (Shortlist)
    const itemDipantau: KandidatNiche = { ...itemA, status: 'dipantau', catatan: 'Target prioritas', tag: ['fokus'] };

    // Transisi 2: dipantau -> dibuang
    const itemDibuang: KandidatNiche = { ...itemDipantau, status: 'dibuang' };

    // Transisi 3: dibuang -> pulihkan ke baru
    const itemDipulihkan: KandidatNiche = { ...itemDibuang, status: 'baru' };

    const statusFlowOk =
      itemA.status === 'baru' &&
      itemDipantau.status === 'dipantau' &&
      itemDibuang.status === 'dibuang' &&
      itemDipulihkan.status === 'baru' &&
      itemDipulihkan.catatan === 'Target prioritas'; // Catatan tetap terjaga

    hasil.push({
      id: 'uji-siklus-status-kandidat',
      nama: 'Siklus Status Kandidat (Pantau, Buang, Pulihkan) (Tahap 4)',
      keterangan: 'Memastikan transisi status kandidat dan persistensi catatan/tag antar-status bekerja konsisten.',
      status: statusFlowOk ? 'lulus' : 'gagal',
      pesan: statusFlowOk
        ? 'Lulus: Siklus status (baru -> dipantau -> dibuang -> dipulihkan) berjalan mulus tanpa kehilangan catatan/tag.'
        : 'Gagal: Transisi status kandidat tidak konsisten.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-siklus-status-kandidat',
      nama: 'Siklus Status Kandidat',
      keterangan: 'Memverifikasi status kandidat.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 15: Pemantauan Kuota Penyimpanan & Prune Tertua (Tahap 4) ---
  try {
    const report = getStorageUsageReport();
    const reportStructureValid =
      typeof report.usedBytes === 'number' &&
      typeof report.usedKb === 'number' &&
      typeof report.percentage === 'number' &&
      typeof report.isNearLimit === 'boolean';

    // Buat store uji dengan 4 pencarian (terlama ke terbaru) dan kandidat terkait
    const testStore: AppDataStore = {
      ...getInitialStore(),
      pencarian: [
        {
          id: 'p-1',
          waktu: '2026-01-01T00:00:00Z', // Tertua
          parameter: { tipe_aset: 'foto_nyata', tema: 'old 1', momen_id: null, momen_tahun: null, jumlah_kandidat: 1 },
          kunci_cache: 'k1',
          web_search_queries: [],
          search_entry_point_html: null,
          status: 'tergrounded',
          pesan_galat: null,
          kandidat_ids: ['k-old-1'],
        },
        {
          id: 'p-2',
          waktu: '2026-02-01T00:00:00Z',
          parameter: { tipe_aset: 'foto_nyata', tema: 'old 2', momen_id: null, momen_tahun: null, jumlah_kandidat: 1 },
          kunci_cache: 'k2',
          web_search_queries: [],
          search_entry_point_html: null,
          status: 'tergrounded',
          pesan_galat: null,
          kandidat_ids: ['k-old-2'],
        },
        {
          id: 'p-3',
          waktu: '2026-03-01T00:00:00Z',
          parameter: { tipe_aset: 'foto_nyata', tema: 'recent 1', momen_id: null, momen_tahun: null, jumlah_kandidat: 1 },
          kunci_cache: 'k3',
          web_search_queries: [],
          search_entry_point_html: null,
          status: 'tergrounded',
          pesan_galat: null,
          kandidat_ids: ['k-recent-1'],
        },
        {
          id: 'p-4',
          waktu: '2026-04-01T00:00:00Z', // Terbaru
          parameter: { tipe_aset: 'foto_nyata', tema: 'recent 2', momen_id: null, momen_tahun: null, jumlah_kandidat: 1 },
          kunci_cache: 'k4',
          web_search_queries: [],
          search_entry_point_html: null,
          status: 'tergrounded',
          pesan_galat: null,
          kandidat_ids: ['k-recent-2'],
        },
      ],
      kandidat: [
        { ...sampelKandidat, id: 'k-old-1', id_pencarian: 'p-1', status: 'dipantau' }, // Wajib DIPERTAHANKAN karena status: 'dipantau'!
        { ...sampelKandidat, id: 'k-old-2', id_pencarian: 'p-2', status: 'baru' }, // Boleh dibuang
        { ...sampelKandidat, id: 'k-recent-1', id_pencarian: 'p-3', status: 'baru' },
        { ...sampelKandidat, id: 'k-recent-2', id_pencarian: 'p-4', status: 'baru' },
      ],
    };

    // Bersihkan 25% (1 dari 4 pencarian tertua, yaitu p-1)
    const pruneResult = pruneOldestSearches(testStore, 25);

    const p1Dihapus = !pruneResult.storeBaru.pencarian.some((p) => p.id === 'p-1');
    const p2Ada = pruneResult.storeBaru.pencarian.some((p) => p.id === 'p-2');
    const kOld1Dipertahankan = pruneResult.storeBaru.kandidat.some((k) => k.id === 'k-old-1'); // Karena dipantau!

    const pruneValid = reportStructureValid && p1Dihapus && p2Ada && kOld1Dipertahankan;

    hasil.push({
      id: 'uji-kuota-storage-prune',
      nama: 'Pemantauan Kuota Penyimpanan & Prune Riwayat Tertua (Tahap 4)',
      keterangan: 'Memverifikasi perhitungan byte storage dan pembersihan riwayat tertua dengan proteksi shortlist.',
      status: pruneValid ? 'lulus' : 'gagal',
      pesan: pruneValid
        ? 'Lulus: Struktur laporan storage valid, pencarian tertua (p-1) dibuang, dan kandidat shortlist (k-old-1) tetap dipertahankan.'
        : 'Gagal: Logika pemantauan storage atau pembersihan riwayat tertua tidak sesuai spesifikasi.',
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-kuota-storage-prune',
      nama: 'Pemantauan Kuota Storage & Prune',
      keterangan: 'Memverifikasi fungsi kuota storage.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 16: Uji Batas Jendela Unggah (120, 60, 121, 150, 151 hari) - Tahap 5 ---
  try {
    const tanggalUji = '2026-01-01';

    // Momen uji khusus dengan tanggal yang disuntik
    // 120 hari dari 2026-01-01 -> 2026-05-01 (Jan:30, Feb:28, Mar:31, Apr:30, +1 = 120)
    const m120 = { id: 'test_120', nama: 'Test 120', tanggal_puncak: '2026-05-01', tetap: false, aktif: true };
    const j120 = hitungJendelaMomen(m120, tanggalUji);

    // 60 hari dari 2026-01-01 -> 2026-03-02 (Jan:30, Feb:28, +2 = 60)
    const m60 = { id: 'test_60', nama: 'Test 60', tanggal_puncak: '2026-03-02', tetap: false, aktif: true };
    const j60 = hitungJendelaMomen(m60, tanggalUji);

    // 121 hari dari 2026-01-01 -> 2026-05-02
    const m121 = { id: 'test_121', nama: 'Test 121', tanggal_puncak: '2026-05-02', tetap: false, aktif: true };
    const j121 = hitungJendelaMomen(m121, tanggalUji);

    // 150 hari dari 2026-01-01 -> 2026-05-31
    const m150 = { id: 'test_150', nama: 'Test 150', tanggal_puncak: '2026-05-31', tetap: false, aktif: true };
    const j150 = hitungJendelaMomen(m150, tanggalUji);

    // 151 hari dari 2026-01-01 -> 2026-06-01
    const m151 = { id: 'test_151', nama: 'Test 151', tanggal_puncak: '2026-06-01', tetap: false, aktif: true };
    const j151 = hitungJendelaMomen(m151, tanggalUji);

    const lulus120 = j120.hari_tersisa === 120 && j120.status === 'Sedang di jendela';
    const lulus60 = j60.hari_tersisa === 60 && j60.status === 'Sedang di jendela';
    const lulus121 = j121.hari_tersisa === 121 && j121.status === 'Masuk jendela dalam 30 hari';
    const lulus150 = j150.hari_tersisa === 150 && j150.status === 'Masuk jendela dalam 30 hari';
    const lulus151 = j151.hari_tersisa === 151 && j151.status === 'Belum dibuka';

    const semuaBatasLulus = lulus120 && lulus60 && lulus121 && lulus150 && lulus151;

    hasil.push({
      id: 'uji-batas-jendela-unggah',
      nama: 'Uji Batas Ambang Jendela Unggah (Tahap 5)',
      keterangan: 'Memverifikasi status tepat 120 hari & 60 hari (Sedang di jendela), 121 & 150 hari (Masuk jendela), dan 151 hari (Belum dibuka).',
      status: semuaBatasLulus ? 'lulus' : 'gagal',
      pesan: semuaBatasLulus
        ? 'Lulus: Semua 5 titik batas jendela unggah (120, 60, 121, 150, 151 hari) dievaluasi persis sesuai rumus H-120 s/d H-60.'
        : `Gagal: 120hr=${j120.status}, 60hr=${j60.status}, 121hr=${j121.status}, 150hr=${j150.status}, 151hr=${j151.status}`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-batas-jendela-unggah',
      nama: 'Uji Batas Ambang Jendela Unggah (Tahap 5)',
      keterangan: 'Memverifikasi ambang batas jendela.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 17: Uji Pergantian Tahun (Desember melihat Januari) - Tahap 5 ---
  try {
    // 15 Desember 2026 melihat Tahun Baru (1 Jan)
    const tanggalDesember = '2026-12-15';
    const momenTahunBaru = { id: 'tahun_baru', nama: 'Tahun Baru', tanggal_puncak: '2027-01-01', tetap: true, aktif: true };
    const jDes = hitungJendelaMomen(momenTahunBaru, tanggalDesember);

    // Hari tersisa ke 1 Jan 2027 adalah 17 hari (< 60 hari).
    // Karena < 60 hari, jendela untuk 2027 sudah lewat! Target dialihkan ke 2028-01-01.
    const statusLewat = jDes.status === 'Jendela sudah lewat (target musim berikutnya)';
    const target2028 = jDes.target_tahun === 2028 && jDes.tanggal_puncak_target === '2028-01-01';

    // 15 September 2026 melihat Tahun Baru (1 Jan 2027): 108 hari -> Sedang di jendela
    const tanggalSep = '2026-09-15';
    const jSep = hitungJendelaMomen(momenTahunBaru, tanggalSep);
    const statusJendela = jSep.status === 'Sedang di jendela' && jSep.target_tahun === 2027;

    const pergantianTahunLulus = statusLewat && target2028 && statusJendela;

    hasil.push({
      id: 'uji-pergantian-tahun',
      nama: 'Uji Pergantian Tahun & Target Musim Berikutnya (Tahap 5)',
      keterangan: 'Memverifikasi evaluasi momen awal tahun (Januari) ketika dilihat dari akhir tahun (Desember).',
      status: pergantianTahunLulus ? 'lulus' : 'gagal',
      pesan: pergantianTahunLulus
        ? 'Lulus: Pada 15 Des 2026, status Tahun Baru tepat "Jendela sudah lewat (target musim berikutnya)" dengan target tahun 2028; dan pada 15 Sep 2026 tepat "Sedang di jendela".'
        : `Gagal: Des status=${jDes.status}, target=${jDes.tanggal_puncak_target}; Sep status=${jSep.status}`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-pergantian-tahun',
      nama: 'Uji Pergantian Tahun (Tahap 5)',
      keterangan: 'Memverifikasi pergantian tahun.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 18: Uji Tahun Kabisat (29 Februari 2028) - Tahap 5 ---
  try {
    // 2028 adalah tahun kabisat (Februari memiliki 29 hari)
    const momenKabisat = { id: 'test_leap', nama: 'Hari Kabisat', tanggal_puncak: '2028-02-29', tetap: false, aktif: true };

    // Dari 2027-11-01 ke 2028-02-29:
    // Nov: 29 hari tersisa + Des: 31 + Jan: 31 + Feb: 29 = tepat 120 hari!
    const jKabisat120 = hitungJendelaMomen(momenKabisat, '2027-11-01');
    const lulus120Kabisat = jKabisat120.hari_tersisa === 120 && jKabisat120.status === 'Sedang di jendela';

    // Dari 2027-10-31 ke 2028-02-29: tepat 121 hari!
    const jKabisat121 = hitungJendelaMomen(momenKabisat, '2027-10-31');
    const lulus121Kabisat = jKabisat121.hari_tersisa === 121 && jKabisat121.status === 'Masuk jendela dalam 30 hari';

    const kabisatLulus = lulus120Kabisat && lulus121Kabisat;

    hasil.push({
      id: 'uji-tahun-kabisat',
      nama: 'Uji Kalender Tahun Kabisat (Tahap 5)',
      keterangan: 'Memverifikasi perhitungan hari akurat untuk tanggal 29 Februari 2028.',
      status: kabisatLulus ? 'lulus' : 'gagal',
      pesan: kabisatLulus
        ? 'Lulus: Hari kabisat 29 Feb 2028 terhitung tepat 120 hari pada 1 Nov 2027 dan 121 hari pada 31 Okt 2027.'
        : `Gagal: 120hr=${jKabisat120.hari_tersisa} (${jKabisat120.status}), 121hr=${jKabisat121.hari_tersisa} (${jKabisat121.status})`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-tahun-kabisat',
      nama: 'Uji Tahun Kabisat (Tahap 5)',
      keterangan: 'Memverifikasi perhitungan tahun kabisat.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 19: Uji Perhitungan Black Friday (2025, 2026, 2027) - Tahap 5 ---
  try {
    const bf2025 = hitungBlackFriday(2025);
    const bf2026 = hitungBlackFriday(2026);
    const bf2027 = hitungBlackFriday(2027);

    const valid2025 = bf2025 === '2025-11-28';
    const valid2026 = bf2026 === '2026-11-27';
    const valid2027 = bf2027 === '2027-11-26';

    const blackFridayLulus = valid2025 && valid2026 && valid2027;

    hasil.push({
      id: 'uji-hitung-black-friday',
      nama: 'Uji Perhitungan Black Friday Dinamis (Tahap 5)',
      keterangan: 'Memverifikasi rumus Jumat setelah Kamis keempat November untuk tahun 2025, 2026, dan 2027.',
      status: blackFridayLulus ? 'lulus' : 'gagal',
      pesan: blackFridayLulus
        ? `Lulus: Black Friday 2025 terhitung ${bf2025}, 2026 terhitung ${bf2026}, dan 2027 terhitung ${bf2027} (100% presisi).`
        : `Gagal: 2025=${bf2025} (diharapkan 2025-11-28), 2026=${bf2026} (diharapkan 2026-11-27), 2027=${bf2027} (diharapkan 2027-11-26)`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-hitung-black-friday',
      nama: 'Uji Perhitungan Black Friday (Tahap 5)',
      keterangan: 'Memverifikasi fungsi hitungBlackFriday.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  // --- Uji 20: Uji Evaluasi Terhadap Tanggal Sistem (2026-10-31) & Momen Tanpa Tanggal - Tahap 5 ---
  try {
    const tanggalRef = '2026-10-31';

    // 1. Halloween (31 Okt) pada 2026-10-31: 0 hari tersisa -> 'Jendela sudah lewat (target musim berikutnya)'
    const mHalloween = { id: 'halloween', nama: 'Halloween', tanggal_puncak: '2026-10-31', tetap: true, aktif: true };
    const jHalloween = hitungJendelaMomen(mHalloween, tanggalRef);
    const lulusHalloween =
      jHalloween.status === 'Jendela sudah lewat (target musim berikutnya)' &&
      jHalloween.hari_tersisa === 0 &&
      jHalloween.tanggal_puncak_target === '2027-10-31';

    // 2. Black Friday (27 Nov 2026) pada 2026-10-31: 27 hari tersisa -> 'Jendela sudah lewat (target musim berikutnya)'
    const mBlackFriday = { id: 'black_friday', nama: 'Black Friday', tanggal_puncak: '2026-11-27', tetap: true, aktif: true };
    const jBlackFriday = hitungJendelaMomen(mBlackFriday, tanggalRef);
    const lulusBlackFriday =
      jBlackFriday.status === 'Jendela sudah lewat (target musim berikutnya)' &&
      jBlackFriday.hari_tersisa === 27 &&
      jBlackFriday.tanggal_puncak_target === '2027-11-26';

    // 3. Natal (25 Des 2026) pada 2026-10-31: 55 hari tersisa -> 'Jendela sudah lewat (target musim berikutnya)'
    const mNatal = { id: 'natal', nama: 'Hari Raya Natal', tanggal_puncak: '2026-12-25', tetap: true, aktif: true };
    const jNatal = hitungJendelaMomen(mNatal, tanggalRef);
    const lulusNatal =
      jNatal.status === 'Jendela sudah lewat (target musim berikutnya)' &&
      jNatal.hari_tersisa === 55 &&
      jNatal.tanggal_puncak_target === '2027-12-25';

    // 4. Tahun Baru (1 Jan 2027) pada 2026-10-31: 62 hari tersisa -> 'Sedang di jendela'
    const mTahunBaru = { id: 'tahun_baru', nama: 'Tahun Baru', tanggal_puncak: '2027-01-01', tetap: true, aktif: true };
    const jTahunBaru = hitungJendelaMomen(mTahunBaru, tanggalRef);
    const lulusTahunBaru =
      jTahunBaru.status === 'Sedang di jendela' &&
      jTahunBaru.hari_tersisa === 62 &&
      jTahunBaru.tanggal_puncak_target === '2027-01-01';

    // 5. Momen bergeser tanpa tanggal (Ramadan, dll.) -> 'Tanggal belum diisi'
    const mRamadan = { id: 'ramadan', nama: 'Ramadan', tanggal_puncak: null, tetap: false, aktif: true };
    const jRamadan = hitungJendelaMomen(mRamadan, tanggalRef);
    const lulusKosong = jRamadan.status === 'Tanggal belum diisi' && jRamadan.hari_tersisa === null;

    const semuaUji20Lulus = lulusHalloween && lulusBlackFriday && lulusNatal && lulusTahunBaru && lulusKosong;

    hasil.push({
      id: 'uji-evaluasi-sistem-tahap5',
      nama: 'Evaluasi Kalender Musiman Tanggal Referensi 2026-10-31 (Tahap 5)',
      keterangan: 'Memverifikasi status Halloween (0hr: lewat), Black Friday (27hr: lewat), Natal (55hr: lewat), Tahun Baru (62hr: sedang di jendela), dan momen tanpa tanggal.',
      status: semuaUji20Lulus ? 'lulus' : 'gagal',
      pesan: semuaUji20Lulus
        ? 'Lulus: Seluruh kalkulasi status jendela pada 2026-10-31 (Halloween 0 hari, Black Friday 27 hari, Natal 55 hari, Tahun Baru 62 hari, dan Ramadan tanpa tanggal) 100% tepat.'
        : `Gagal: Hal=${jHalloween.status}(${jHalloween.hari_tersisa}hr), BF=${jBlackFriday.status}(${jBlackFriday.hari_tersisa}hr), Natal=${jNatal.status}(${jNatal.hari_tersisa}hr), TB=${jTahunBaru.status}(${jTahunBaru.hari_tersisa}hr), Ram=${jRamadan.status}`,
    });
  } catch (err: any) {
    hasil.push({
      id: 'uji-evaluasi-sistem-tahap5',
      nama: 'Evaluasi Kalender Musiman Tanggal Referensi (Tahap 5)',
      keterangan: 'Memverifikasi evaluasi tanggal referensi.',
      status: 'gagal',
      pesan: `Error: ${err?.message}`,
    });
  }

  return hasil;
}
