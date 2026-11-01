/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TAHAP 1: KONTRAK DATA RESMI NICHE SCOUT
 */

export interface SumberRef {
  domain: string;
  url: string;
  judul: string;
  tanggal_akses: string; // ISO 8601 string
  is_platform?: boolean;
}

export type StatusDukungan = 'didukung' | 'sebagian' | 'tidak_didukung' | 'tidak_diketahui';
export type LevelBukti = 'kuat' | 'sedang' | 'lemah' | 'tidak_ada';
export type StatusKandidat = 'baru' | 'dipantau' | 'dibuang';

export interface SaranSudut {
  copy_space: string;
  konteks_lokal: string;
  gaya: string;
}

export interface RisikoMerek {
  ada: boolean;
  alasan: string | null;
}

export interface KandidatNiche {
  id: string;
  id_pencarian: string;
  nomor: number;
  kata_kunci_en: string;
  varian_id: string;
  alasan: string;
  sinyal_tren: string;
  saran_sudut: SaranSudut;
  sumber: SumberRef[];
  jumlah_domain: number;
  cakupan_dukungan: number | null; // 0 sampai 1 atau null
  dukungan: StatusDukungan;
  bukti: LevelBukti;
  alasan_bukti?: string; // Tahap 3: contoh "2 domain, cakupan 38%"
  saran_permintaan_1_5: number | null;
  risiko_merek: RisikoMerek;
  mirip_dengan: string | null;
  sudah_pernah_muncul: boolean;
  status: StatusKandidat;
  catatan: string;
  tag: string[];
  dibuat_pada: string; // ISO 8601 string
}

export type StatusPencarian = 'tergrounded' | 'tidak_tergrounded' | 'galat';

export type StatusJendelaMomen =
  | 'Sedang di jendela'
  | 'Masuk jendela dalam 30 hari'
  | 'Belum dibuka'
  | 'Jendela sudah lewat (target musim berikutnya)'
  | 'Tanggal belum diisi';

export interface HasilJendelaMomen {
  momen_id: string;
  nama: string;
  status: StatusJendelaMomen;
  hari_tersisa: number | null;
  target_tahun: number | null;
  tanggal_puncak_target: string | null; // Format YYYY-MM-DD
  rentang_unggah_awal: string | null; // Format YYYY-MM-DD
  rentang_unggah_akhir: string | null; // Format YYYY-MM-DD
  rentang_label: string | null; // Format "3 Sep - 2 Nov 2026"
  is_musim_berikutnya: boolean;
}

export interface ParameterPencarian {
  tipe_aset: string; // e.g. "foto_nyata" | "foto_ai" | "ilustrasi_ai"
  tema: string;
  momen_id: string | null;
  momen_tahun: number | null;
  nama_momen?: string | null;
  tanggal_puncak_target?: string | null;
  status_jendela?: StatusJendelaMomen | string | null;
  hari_tersisa?: number | null;
  rentang_jendela?: string | null;
  jumlah_kandidat: number;
}

export interface PencarianRecord {
  id: string;
  waktu: string; // ISO 8601 string
  parameter: ParameterPencarian;
  kunci_cache: string;
  web_search_queries: string[];
  search_entry_point_html: string | null;
  status: StatusPencarian;
  pesan_galat: string | null;
  kandidat_ids: string[];
}

export interface Momen {
  id: string;
  nama: string;
  tanggal_puncak: string | null; // Format YYYY-MM-DD atau ISO 8601 string atau null
  tetap: boolean;
  aktif: boolean;
  kustom?: boolean;
  deskripsi?: string;
}

export interface Pengaturan {
  skala: number; // default 0.7 (70%) atau dinamis jika skala_manual: false
  skala_manual?: boolean; // true jika pengguna memilih manual; false/undefined = Otomatis (100% >=1024px, 85% <1024px)
  batas_harian: number;
  ambang_bukti: string;
  ambang_cakupan: number;
  // Tahap 3: ambang audit bukti yang bisa disesuaikan
  ambang_domain_kuat?: number; // default 3
  ambang_cakupan_kuat?: number; // default 0.5
  ambang_domain_sedang?: number; // default 2
  ambang_cakupan_didukung?: number; // default 0.6
  ambang_cakupan_sebagian?: number; // default 0.2
  domain_platform: string[];
  kata_peringatan_merek: string[];
}

/**
 * Satu objek penyimpanan dengan schema_version = 1 (Aturan 8 & Tahap 1)
 */
export interface AppDataStore {
  schema_version: 1;
  pengaturan: Pengaturan;
  kandidat: KandidatNiche[];
  pencarian: PencarianRecord[];
  momen: Momen[];
}

export interface RingkasanImpor {
  schema_version: number;
  jumlah_kandidat: number;
  jumlah_pencarian: number;
  jumlah_momen: number;
  ada_pengaturan: boolean;
  skala_di_file: number | null;
  kandidat_baru: number;
  pencarian_baru: number;
}

export interface HasilUjiSistem {
  id: string;
  nama: string;
  keterangan: string;
  status: 'lulus' | 'gagal';
  pesan: string;
  detail?: string;
}
