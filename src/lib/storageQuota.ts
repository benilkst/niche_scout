/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDataStore } from '../types.ts';

// Kuota rata-rata standar browser untuk localStorage adalah ~5 MB
export const ESTIMATED_MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface StorageUsageReport {
  usedBytes: number;
  usedKb: number;
  maxBytes: number;
  percentage: number;
  isNearLimit: boolean; // >= 80%
  totalKeys: number;
}

/**
 * Menghitung perkiraan pemakaian localStorage dalam byte
 */
export function getStorageUsageReport(maxBytes: number = ESTIMATED_MAX_STORAGE_BYTES): StorageUsageReport {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        usedBytes: 0,
        usedKb: 0,
        maxBytes,
        percentage: 0,
        isNearLimit: false,
        totalKeys: 0,
      };
    }

    let totalBytes = 0;
    const len = window.localStorage.length;

    for (let i = 0; i < len; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const val = window.localStorage.getItem(key) || '';
        // 2 byte per karakter (UTF-16 di JavaScript memory)
        totalBytes += (key.length + val.length) * 2;
      }
    }

    const percentage = Number(((totalBytes / maxBytes) * 100).toFixed(1));
    const isNearLimit = percentage >= 80;

    return {
      usedBytes: totalBytes,
      usedKb: Number((totalBytes / 1024).toFixed(1)),
      maxBytes,
      percentage,
      isNearLimit,
      totalKeys: len,
    };
  } catch (err) {
    console.warn('Gagal menghitung pemakaian storage:', err);
    return {
      usedBytes: 0,
      usedKb: 0,
      maxBytes,
      percentage: 0,
      isNearLimit: false,
      totalKeys: 0,
    };
  }
}

/**
 * Membuang riwayat pencarian tertua dan kandidat yang tidak di-shortlist
 * untuk menghemat ruang penyimpanan saat mendekati batas
 */
export function pruneOldestSearches(
  store: AppDataStore,
  percentToPrune: number = 25
): {
  storeBaru: AppDataStore;
  pencarianDihapusCount: number;
  kandidatDihapusCount: number;
} {
  const pencarianList = [...store.pencarian];
  if (pencarianList.length === 0) {
    return { storeBaru: store, pencarianDihapusCount: 0, kandidatDihapusCount: 0 };
  }

  // Hitung berapa pencarian tertua yang akan dibuang
  const countToRemove = Math.max(1, Math.ceil((pencarianList.length * percentToPrune) / 100));

  // Urutkan dari terlama ke terbaru
  pencarianList.sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());

  const pencarianDibuang = pencarianList.slice(0, countToRemove);
  const dibuangPencarianIds = new Set(pencarianDibuang.map((p) => p.id));

  // Sisa pencarian dipertahankan
  const sisaPencarian = pencarianList.slice(countToRemove);

  // Cari ID kandidat dari pencarian yang dibuang
  const kandidatDibuangIds = new Set(pencarianDibuang.flatMap((p) => p.kandidat_ids));

  // Pertahankan kandidat jika berstatus 'dipantau' (Shortlist) meskipun pencariannya dibuang
  let kandidatDihapusCount = 0;
  const sisaKandidat = store.kandidat.filter((k) => {
    if (k.status === 'dipantau') return true; // Wajib pertahankan shortlist!
    if (dibuangPencarianIds.has(k.id_pencarian) || kandidatDibuangIds.has(k.id)) {
      kandidatDihapusCount++;
      return false;
    }
    return true;
  });

  const storeBaru: AppDataStore = {
    ...store,
    pencarian: sisaPencarian,
    kandidat: sisaKandidat,
  };

  return {
    storeBaru,
    pencarianDihapusCount: countToRemove,
    kandidatDihapusCount,
  };
}
