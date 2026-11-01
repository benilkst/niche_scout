/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDataStore, KandidatNiche, Momen, PencarianRecord, Pengaturan, RingkasanImpor } from './types.ts';
import { MOMEN_DEFAULT_TAHAP5 } from './lib/kalenderMusiman.ts';

export const STORAGE_KEY = 'niche_scout_store_v1';
export const CURRENT_SCHEMA_VERSION = 1 as const;

export const PENGATURAN_DEFAULT: Pengaturan = {
  skala: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 1.0 : 0.85,
  skala_manual: false,
  batas_harian: 50,
  ambang_bukti: 'sedang',
  ambang_cakupan: 0.5,
  ambang_domain_kuat: 3,
  ambang_cakupan_kuat: 0.5,
  ambang_domain_sedang: 2,
  ambang_cakupan_didukung: 0.6,
  ambang_cakupan_sebagian: 0.2,
  domain_platform: [
    'adobe.com',
    'stock.adobe.com',
    'shutterstock.com',
    'freepik.com',
    'gettyimages.com',
    'istockphoto.com',
    'elements.envato.com',
    'vecteezy.com',
    '123rf.com',
    'dreamstime.com',
    'depositphotos.com',
    'pond5.com',
  ],
  kata_peringatan_merek: [
    'lego',
    'apple',
    'nike',
    'adidas',
    'disney',
    'marvel',
    'pokemon',
    'barbie',
    'coca-cola',
    'pepsi',
    'mcdonalds',
    'starbucks',
    'sony',
    'playstation',
    'nintendo',
    'ferrari',
    'lamborghini',
    'bmw',
    'mercedes',
    'gucci',
    'rolex',
    'netflix',
    'pixar',
    'star wars',
  ],
};

export const MOMEN_DEFAULT: Momen[] = MOMEN_DEFAULT_TAHAP5;

export function getInitialStore(): AppDataStore {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    pengaturan: { ...PENGATURAN_DEFAULT },
    kandidat: [],
    pencarian: [],
    momen: [...MOMEN_DEFAULT],
  };
}

const memoryFallbackStore = new Map<string, string>();

export function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memoryFallbackStore.get(key) || null;
}

export function setStorageItem(key: string, value: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {}
  memoryFallbackStore.set(key, value);
  return true;
}

/**
 * Muat data dari localStorage dengan try/catch dan validasi schema_version (Aturan 8).
 */
export function muatData(): AppDataStore {
  try {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialStore();
      simpanData(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return getInitialStore();
    }

    // Validasi schema_version persis
    if (parsed.schema_version === CURRENT_SCHEMA_VERSION) {
      return {
        schema_version: CURRENT_SCHEMA_VERSION,
        pengaturan: {
          ...PENGATURAN_DEFAULT,
          ...(parsed.pengaturan || {}),
          skala_manual: typeof parsed.pengaturan?.skala_manual === 'boolean' ? parsed.pengaturan.skala_manual : false,
          // Pastikan skala valid dan tidak NaN
          skala: typeof parsed.pengaturan?.skala === 'number' && !isNaN(parsed.pengaturan.skala)
            ? parsed.pengaturan.skala
            : PENGATURAN_DEFAULT.skala,
        },
        kandidat: Array.isArray(parsed.kandidat) ? parsed.kandidat : [],
        pencarian: Array.isArray(parsed.pencarian) ? parsed.pencarian : [],
        momen: (() => {
          const rawMomen = Array.isArray(parsed.momen) && parsed.momen.length > 0 ? parsed.momen : [...MOMEN_DEFAULT_TAHAP5];
          const map = new Map<string, Momen>();
          MOMEN_DEFAULT_TAHAP5.forEach((m) => map.set(m.id, m));
          rawMomen.forEach((m: Momen) => map.set(m.id, m));
          return Array.from(map.values());
        })(),
      };
    }

    // Lakukan migrasi jika data berasal dari format lama
    return migrasiData(parsed);
  } catch (err) {
    console.warn('Gagal membaca penyimpanan Niche Scout:', err);
    return getInitialStore();
  }
}

export let lastStorageError: string | null = null;

/**
 * Simpan data ke localStorage dengan try/catch dan deteksi QuotaExceededError (Aturan 8 & Tahap 4).
 */
export function simpanData(data: AppDataStore): boolean {
  try {
    const payload: AppDataStore = {
      schema_version: CURRENT_SCHEMA_VERSION,
      pengaturan: data.pengaturan ? { ...data.pengaturan } : { ...PENGATURAN_DEFAULT },
      kandidat: Array.isArray(data.kandidat) ? data.kandidat : [],
      pencarian: Array.isArray(data.pencarian) ? data.pencarian : [],
      momen: Array.isArray(data.momen) ? data.momen : [...MOMEN_DEFAULT],
    };
    const jsonStr = JSON.stringify(payload);
    const ok = setStorageItem(STORAGE_KEY, jsonStr);
    if (ok) {
      lastStorageError = null;
    }
    return ok;
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.message?.includes('quota');
    lastStorageError = isQuota
      ? 'Batas kuota penyimpanan browser (localStorage) terlampaui! Bersihkan riwayat atau ekspor cadangan.'
      : (err?.message || 'Gagal menyimpan data.');
    console.error('Peringatan Penyimpanan:', lastStorageError);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('niche_scout_storage_error', { detail: lastStorageError }));
    }
    return false;
  }
}


/**
 * Migrasi data dari format lain / versi lama ke schema_version 1.
 */
export function migrasiData(raw: any): AppDataStore {
  const store = getInitialStore();
  if (!raw || typeof raw !== 'object') return store;

  // Jika terdapat format saved_items sebelumnya
  if (Array.isArray(raw.items)) {
    // Membaca item lama
    store.kandidat = raw.items.map((it: any, index: number): KandidatNiche => ({
      id: String(it.id || `migrated-${Date.now()}-${index}`),
      id_pencarian: 'migrated-search',
      nomor: index + 1,
      kata_kunci_en: String(it.judul || 'Migrated Niche'),
      varian_id: String(it.judul || 'Migrated Niche'),
      alasan: String(it.alasanKebutuhanPembeli || it.deskripsiVisual || 'Migrasi data'),
      sinyal_tren: 'Migrasi lokal',
      saran_sudut: {
        copy_space: 'Sediakan ruang negatif untuk teks iklan',
        konteks_lokal: 'Aksen budaya dan elemen lokal autentik',
        gaya: 'Komersial microstock',
      },
      sumber: Array.isArray(it.sumberGrounding)
        ? it.sumberGrounding.map((s: any) => ({
            domain: new URL(s.uri || 'https://example.com').hostname,
            url: s.uri,
            judul: s.title || s.uri,
            tanggal_akses: new Date().toISOString(),
          }))
        : [],
      jumlah_domain: Array.isArray(it.sumberGrounding) ? it.sumberGrounding.length : 0,
      cakupan_dukungan: 0.8,
      dukungan: 'didukung',
      bukti: 'sedang',
      saran_permintaan_1_5: 4,
      risiko_merek: { ada: false, alasan: null },
      mirip_dengan: null,
      sudah_pernah_muncul: false,
      status: 'dipantau',
      catatan: '',
      tag: Array.isArray(it.kataKunciRekomendasi) ? it.kataKunciRekomendasi : [],
      dibuat_pada: it.dibuatPada || new Date().toISOString(),
    }));
  }

  if (raw.pengaturan && typeof raw.pengaturan === 'object') {
    store.pengaturan = {
      ...PENGATURAN_DEFAULT,
      ...raw.pengaturan,
    };
  }

  simpanData(store);
  return store;
}

/**
 * Validasi string JSON impor dan hasilkan ringkasan data sebelum dieksekusi.
 */
export function validasiDanRingkasJson(
  jsonString: string,
  currentStore: AppDataStore
): { valid: boolean; pesanError?: string; ringkasan?: RingkasanImpor; parsedData?: any } {
  try {
    if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
      return { valid: false, pesanError: 'Konten JSON kosong. Tempelkan teks JSON atau unggah file berkas.' };
    }

    const parsed = JSON.parse(jsonString.trim());
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, pesanError: 'Format JSON tidak valid (bukan objek).' };
    }

    // Periksa schema_version (Aturan: Tolak versi tidak dikenal dengan pesan jelas)
    if (parsed.schema_version === undefined || parsed.schema_version === null) {
      return {
        valid: false,
        pesanError: 'Format ditolak: Properti "schema_version" tidak ditemukan. Berkas bukan cadangan resmi Niche Scout.',
      };
    }

    if (parsed.schema_version !== CURRENT_SCHEMA_VERSION) {
      return {
        valid: false,
        pesanError: `Versi skema tidak dikenal: Versi ${parsed.schema_version} tidak didukung. Aplikasi ini membutuhkan schema_version = ${CURRENT_SCHEMA_VERSION}.`,
      };
    }

    const kandidatList: KandidatNiche[] = Array.isArray(parsed.kandidat) ? parsed.kandidat : [];
    const pencarianList: PencarianRecord[] = Array.isArray(parsed.pencarian) ? parsed.pencarian : [];
    const momenList: Momen[] = Array.isArray(parsed.momen) ? parsed.momen : [];

    // Hitung berapa item baru yang belum ada di database saat ini
    const existingKandidatIds = new Set(currentStore.kandidat.map((k) => k.id));
    const kandidatBaruCount = kandidatList.filter((k) => !existingKandidatIds.has(k.id)).length;

    const existingPencarianIds = new Set(currentStore.pencarian.map((p) => p.id));
    const pencarianBaruCount = pencarianList.filter((p) => !existingPencarianIds.has(p.id)).length;

    const ringkasan: RingkasanImpor = {
      schema_version: parsed.schema_version,
      jumlah_kandidat: kandidatList.length,
      jumlah_pencarian: pencarianList.length,
      jumlah_momen: momenList.length,
      ada_pengaturan: !!parsed.pengaturan,
      skala_di_file: parsed.pengaturan?.skala ?? null,
      kandidat_baru: kandidatBaruCount,
      pencarian_baru: pencarianBaruCount,
    };

    return { valid: true, ringkasan, parsedData: parsed };
  } catch (err: any) {
    return {
      valid: false,
      pesanError: `Format JSON rusak atau tidak dapat diuraikan: ${err?.message || 'SyntaxError'}`,
    };
  }
}

/**
 * Eksekusi impor JSON dengan pilihan mode 'gabung' atau 'timpa'.
 */
export function imporJson(
  jsonString: string,
  mode: 'gabung' | 'timpa',
  currentStore: AppDataStore
): { success: boolean; pesan: string; storeBaru?: AppDataStore } {
  const validasi = validasiDanRingkasJson(jsonString, currentStore);
  if (!validasi.valid || !validasi.parsedData) {
    return { success: false, pesan: validasi.pesanError || 'Validasi JSON gagal.' };
  }

  const incoming = validasi.parsedData;

  try {
    let storeHasil: AppDataStore;

    if (mode === 'timpa') {
      storeHasil = {
        schema_version: CURRENT_SCHEMA_VERSION,
        pengaturan: incoming.pengaturan ? { ...PENGATURAN_DEFAULT, ...incoming.pengaturan } : { ...currentStore.pengaturan },
        kandidat: Array.isArray(incoming.kandidat) ? incoming.kandidat : [],
        pencarian: Array.isArray(incoming.pencarian) ? incoming.pencarian : [],
        momen: Array.isArray(incoming.momen) && incoming.momen.length > 0 ? incoming.momen : [...currentStore.momen],
      };
    } else {
      // Mode 'gabung' (Merge data tanpa duplikasi ID)
      const kandidatMap = new Map<string, KandidatNiche>();
      // Masukkan item lama dulu
      currentStore.kandidat.forEach((k) => kandidatMap.set(k.id, k));
      // Timpa atau tambahkan dari incoming
      if (Array.isArray(incoming.kandidat)) {
        incoming.kandidat.forEach((k: KandidatNiche) => kandidatMap.set(k.id, k));
      }

      const pencarianMap = new Map<string, PencarianRecord>();
      currentStore.pencarian.forEach((p) => pencarianMap.set(p.id, p));
      if (Array.isArray(incoming.pencarian)) {
        incoming.pencarian.forEach((p: PencarianRecord) => pencarianMap.set(p.id, p));
      }

      const momenMap = new Map<string, Momen>();
      currentStore.momen.forEach((m) => momenMap.set(m.id, m));
      if (Array.isArray(incoming.momen)) {
        incoming.momen.forEach((m: Momen) => momenMap.set(m.id, m));
      }

      storeHasil = {
        schema_version: CURRENT_SCHEMA_VERSION,
        pengaturan: incoming.pengaturan
          ? { ...currentStore.pengaturan, ...incoming.pengaturan }
          : { ...currentStore.pengaturan },
        kandidat: Array.from(kandidatMap.values()),
        pencarian: Array.from(pencarianMap.values()),
        momen: Array.from(momenMap.values()),
      };
    }

    const ok = simpanData(storeHasil);
    if (!ok) {
      return { success: false, pesan: 'Gagal menulis ke localStorage saat impor.' };
    }

    return {
      success: true,
      pesan:
        mode === 'timpa'
          ? `Berhasil menimpa semua data (${storeHasil.kandidat.length} kandidat, ${storeHasil.pencarian.length} pencarian).`
          : `Berhasil menggabungkan data (${storeHasil.kandidat.length} total kandidat, ${storeHasil.pencarian.length} total pencarian).`,
      storeBaru: storeHasil,
    };
  } catch (err: any) {
    return { success: false, pesan: `Terjadi galat selama penggabungan impor: ${err?.message}` };
  }
}

/**
 * Ekspor data ke file JSON yang langsung terunduh di browser.
 */
export function eksporDataSebagaiJson(data: AppDataStore): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const tanggal = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `niche-scout-backup-${tanggal}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Hapus semua data dengan otomatis mengunduh cadangan (backup) terlebih dahulu.
 */
export function hapusSemuaDataDenganBackup(dataSaatIni: AppDataStore): AppDataStore {
  // 1. Otomatis unduh cadangan sebelum hapus
  try {
    eksporDataSebagaiJson(dataSaatIni);
  } catch (e) {
    console.warn('Gagal memicu unduhan otomatis sebelum penghapusan data:', e);
  }

  // 2. Bersihkan dan kembalikan ke initial store
  const fresh = getInitialStore();
  simpanData(fresh);
  return fresh;
}
