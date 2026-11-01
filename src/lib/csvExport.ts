/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KandidatNiche } from '../types.ts';

/**
 * Escapes a cell according to RFC 4180:
 * If the cell contains quotes, commas, or newlines, enclose it in double quotes
 * and replace any internal double quote with two double quotes ("").
 */
function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const CSV_HEADER_COLUMNS = [
  'kata_kunci_en',
  'varian_id',
  'tipe_aset',
  'bukti',
  'jumlah_domain',
  'cakupan_dukungan_persen',
  'saran_permintaan',
  'periksa_merek',
  'sumber_url',
  'catatan',
  'tag',
  'status',
  'tanggal',
];

/**
 * Mengubah daftar KandidatNiche menjadi string CSV UTF-8 dengan BOM (\uFEFF)
 */
export function buildCsvString(
  kandidatList: KandidatNiche[],
  tipeAsetFallback: string = 'foto_nyata'
): string {
  const headerLine = CSV_HEADER_COLUMNS.join(',');

  const rows = (kandidatList || []).map((k) => {
    const sumberUrls = (k.sumber || []).map((s) => s.url).filter(Boolean).join(' | ');
    const tagList = (k.tag || []).join(';');
    const cakupanPersen =
      k.cakupan_dukungan !== null ? `${Math.round(k.cakupan_dukungan * 100)}%` : '0%';
    const saranPermintaan =
      k.saran_permintaan_1_5 !== null ? String(k.saran_permintaan_1_5) : '';
    const periksaMerek = k.risiko_merek && k.risiko_merek.ada ? 'Ya' : 'Tidak';
    const tanggalIso = k.dibuat_pada || new Date().toISOString();

    const cells = [
      escapeCsvCell(k.kata_kunci_en),
      escapeCsvCell(k.varian_id),
      escapeCsvCell(tipeAsetFallback),
      escapeCsvCell(k.bukti),
      escapeCsvCell(k.jumlah_domain),
      escapeCsvCell(cakupanPersen),
      escapeCsvCell(saranPermintaan),
      escapeCsvCell(periksaMerek),
      escapeCsvCell(sumberUrls),
      escapeCsvCell(k.catatan || ''),
      escapeCsvCell(tagList),
      escapeCsvCell(k.status),
      escapeCsvCell(tanggalIso),
    ];

    return cells.join(',');
  });

  // TAHAP 4: UTF-8 BOM (\uFEFF) agar Microsoft Excel & spreadsheet membuka huruf beraksen dengan benar
  return `\uFEFF${headerLine}\r\n${rows.join('\r\n')}`;
}

/**
 * Memicu unduhan file CSV langsung di browser
 */
export function unduhCsv(
  kandidatList: KandidatNiche[],
  namaFile: string = 'niche-scout-export',
  tipeAsetFallback: string = 'foto_nyata'
): void {
  const csvContent = buildCsvString(kandidatList, tipeAsetFallback);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile.endsWith('.csv') ? namaFile : `${namaFile}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
