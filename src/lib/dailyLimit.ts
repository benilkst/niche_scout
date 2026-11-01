/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DAILY_TRACKER_KEY = 'niche_scout_daily_tracker_v1';

interface DailyTrackerData {
  schema_version: 1;
  tanggal_lokal: string; // YYYY-MM-DD
  jumlah_panggilan: number;
}

export function getTodayLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyCallCount(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const raw = window.localStorage.getItem(DAILY_TRACKER_KEY);
    if (!raw) return 0;

    const data: DailyTrackerData = JSON.parse(raw);
    const today = getTodayLocalDateString();

    // Reset otomatis tiap tanggal lokal
    if (data.tanggal_lokal !== today) {
      const resetData: DailyTrackerData = {
        schema_version: 1,
        tanggal_lokal: today,
        jumlah_panggilan: 0,
      };
      window.localStorage.setItem(DAILY_TRACKER_KEY, JSON.stringify(resetData));
      return 0;
    }

    return Number(data.jumlah_panggilan) || 0;
  } catch (err) {
    console.warn('Gagal membaca daily tracker:', err);
    return 0;
  }
}

export function incrementDailyCallCount(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 1;
    const current = getDailyCallCount();
    const today = getTodayLocalDateString();

    const updated: DailyTrackerData = {
      schema_version: 1,
      tanggal_lokal: today,
      jumlah_panggilan: current + 1,
    };
    window.localStorage.setItem(DAILY_TRACKER_KEY, JSON.stringify(updated));
    return updated.jumlah_panggilan;
  } catch (err) {
    console.warn('Gagal menambah counter harian:', err);
    return 1;
  }
}

export function isNearDailyLimit(current: number, batas: number): boolean {
  return current >= Math.floor(batas * 0.8) && current < batas;
}

export function isOverDailyLimit(current: number, batas: number): boolean {
  return current >= batas;
}
