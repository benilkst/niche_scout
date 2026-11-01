/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MicrostockCategory = 'real_photo' | 'ai_photo' | 'ai_illustration';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface NicheRawIdea {
  id: string;
  judul: string;
  kategori: MicrostockCategory;
  deskripsiVisual: string;
  elemenKunci: string[];
  kataKunciRekomendasi: string[];
  targetIndustri: string[];
  alasanKebutuhanPembeli: string;
  rekomendasiPlatform: string[];
  statusGroundingAI: boolean;
}

export interface NicheScoreBreakdown {
  skorKompleksitas: number; // 1-10 dihitung kode
  skorPermintaanPasar: number; // 1-10 dihitung kode dari grounding & keyword count
  skorKepadatanKompetisi: number; // 1-10 dihitung kode dari spesifisitas kata kunci
  indeksPeluang: number; // 1-100 dihitung kode murni
  labelBukti: 'Bersumber' | 'Tanpa Rujukan Grounding'; // Aturan 5
  jumlahRujukanGrounding: number;
  perkiraanHariMenujuMomen?: number; // dihitung kode murni
}

export interface NicheScoredIdea extends NicheRawIdea {
  skor: NicheScoreBreakdown;
  sumberGrounding: GroundingSource[];
  dibuatPada: string; // ISO String
}

export interface NicheSearchPayload {
  kategori: MicrostockCategory;
  topikUtama: string;
  targetMusimAtauBulan?: string;
  gayaVisualTambahan?: string;
}

export interface SavedNicheStoragePayload {
  schema_version: number; // Aturan 8
  items: NicheScoredIdea[];
  terakhirDiperbarui: string;
}

export interface SystemTestResult {
  id: string;
  namaTes: string;
  kategori: 'Perhitungan Skor' | 'Tanggal & Jarak Hari' | 'Aturan Grounding' | 'LocalStorage Schema';
  status: 'berhasil' | 'gagal';
  pesan: string;
  detail?: string;
}
