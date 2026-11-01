/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NicheScoredIdea, SavedNicheStoragePayload } from '../types/index.ts';

/**
 * Aturan 8: Penyimpanan di localStorage selalu dibungkus try/catch dan memakai schema_version.
 */
export const STORAGE_KEY = 'niche_scout_saved_items_v1';
export const CURRENT_SCHEMA_VERSION = 1;

export function loadSavedNiches(): NicheScoredIdea[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as SavedNicheStoragePayload;
    if (!parsed || typeof parsed !== 'object') {
      return [];
    }

    // Validasi schema_version
    if (parsed.schema_version === CURRENT_SCHEMA_VERSION && Array.isArray(parsed.items)) {
      return parsed.items;
    }

    // Migrasi versi masa depan jika schema_version berbeda
    if (typeof parsed.schema_version === 'number' && parsed.schema_version < CURRENT_SCHEMA_VERSION) {
      // Migrasi skema lama ke versi 1
      const migratedItems = Array.isArray(parsed.items) ? parsed.items : [];
      saveAllNiches(migratedItems);
      return migratedItems;
    }

    return [];
  } catch (err) {
    console.warn('Gagal membaca localStorage niche_scout:', err);
    return [];
  }
}

export function saveAllNiches(items: NicheScoredIdea[]): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const payload: SavedNicheStoragePayload = {
      schema_version: CURRENT_SCHEMA_VERSION,
      items: Array.isArray(items) ? items : [],
      terakhirDiperbarui: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan ke localStorage niche_scout:', err);
    return false;
  }
}

export function addSavedNiche(idea: NicheScoredIdea): { success: boolean; isDuplicate: boolean } {
  try {
    const existing = loadSavedNiches();
    const exists = existing.some((item) => item.id === idea.id || item.judul.toLowerCase() === idea.judul.toLowerCase());
    if (exists) {
      return { success: false, isDuplicate: true };
    }
    const updated = [idea, ...existing];
    const success = saveAllNiches(updated);
    return { success, isDuplicate: false };
  } catch (err) {
    console.warn('Gagal menambah ide tersimpan:', err);
    return { success: false, isDuplicate: false };
  }
}

export function removeSavedNiche(id: string): boolean {
  try {
    const existing = loadSavedNiches();
    const filtered = existing.filter((item) => item.id !== id);
    return saveAllNiches(filtered);
  } catch (err) {
    console.warn('Gagal menghapus ide tersimpan:', err);
    return false;
  }
}

export function getStorageDiagnostics() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { exists: false, schema_version: CURRENT_SCHEMA_VERSION, count: 0, error: null };
    }
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      schema_version: parsed?.schema_version ?? null,
      count: Array.isArray(parsed?.items) ? parsed.items.length : 0,
      terakhirDiperbarui: parsed?.terakhirDiperbarui || null,
      error: null,
    };
  } catch (err: any) {
    return {
      exists: false,
      schema_version: null,
      count: 0,
      error: err?.message || 'Error parsing storage',
    };
  }
}
