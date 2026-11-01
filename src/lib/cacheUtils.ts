/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KandidatNiche, PencarianRecord } from '../types.ts';
import { getTodayLocalDateString } from './dailyLimit.ts';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Jam

/**
 * Menghasilkan kunci cache deterministik:
 * hash dari (tipe aset, tema ternormalisasi, momen, jumlah kandidat, tanggal lokal)
 */
export function generateCacheKey(
  tipe_aset: string,
  tema: string,
  momen_id: string | null,
  jumlah_kandidat: number,
  tanggalLokal: string = getTodayLocalDateString()
): string {
  const normTema = (tema || 'umum').trim().toLowerCase().replace(/\s+/g, '_');
  const normMomen = momen_id ? momen_id.trim().toLowerCase() : 'tanpa_momen';
  return `niche_${tipe_aset}_${normTema}_${normMomen}_${jumlah_kandidat}_${tanggalLokal}`;
}

export interface CacheLookupResult {
  record: PencarianRecord;
  kandidat: KandidatNiche[];
  waktuFormatted: string;
  jamLalu: number;
}

/**
 * Memeriksa apakah ada hasil pencarian dalam cache yang berusia < 24 jam
 */
export function findValidCache(
  pencarianList: PencarianRecord[],
  kandidatList: KandidatNiche[],
  cacheKey: string
): CacheLookupResult | null {
  if (!Array.isArray(pencarianList) || pencarianList.length === 0) return null;

  const now = Date.now();

  // Cari pencarian dengan kunci cache yang cocok
  const matched = pencarianList.find((p) => p.kunci_cache === cacheKey);
  if (!matched) return null;

  const searchTime = new Date(matched.waktu).getTime();
  const diffMs = now - searchTime;

  if (diffMs > CACHE_MAX_AGE_MS || diffMs < 0) {
    return null; // Kadaluarsa (> 24 jam)
  }

  // Ambil kandidat yang terkait
  const matchedKandidat = kandidatList.filter((k) => matched.kandidat_ids.includes(k.id));

  // Jika kandidat kosong, abaikan cache
  if (matchedKandidat.length === 0) return null;

  const jamLalu = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const menitLalu = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

  const waktuFormatted =
    jamLalu > 0
      ? `${jamLalu} jam ${menitLalu} menit yang lalu`
      : `${menitLalu} menit yang lalu`;

  return {
    record: matched,
    kandidat: matchedKandidat,
    waktuFormatted,
    jamLalu,
  };
}
