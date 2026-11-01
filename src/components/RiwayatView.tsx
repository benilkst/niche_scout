/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  Clock,
  Search,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileWarning,
} from 'lucide-react';
import { AppDataStore, KandidatNiche, PencarianRecord } from '../types.ts';
import { unduhCsv } from '../lib/csvExport.ts';

interface RiwayatViewProps {
  store: AppDataStore;
  onBukaUlangPencarian: (record: PencarianRecord, kandidatList: KandidatNiche[]) => void;
  onHapusPencarian: (pencarianId: string) => void;
  onPulihkanKandidat: (kandidatId: string) => void;
  onGoToCari: () => void;
}

export const RiwayatView: React.FC<RiwayatViewProps> = ({
  store,
  onBukaUlangPencarian,
  onHapusPencarian,
  onPulihkanKandidat,
  onGoToCari,
}) => {
  // Modal Konfirmasi Hapus
  const [pencarianMauDihapus, setPencarianMauDihapus] = useState<PencarianRecord | null>(null);

  // Accordion Kandidat Dibuang per pencarian
  const [bukaDibuangMap, setBukaDibuangMap] = useState<Record<string, boolean>>({});

  const toggleAccordionDibuang = (id: string) => {
    setBukaDibuangMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleEksporSatuPencarian = (record: PencarianRecord) => {
    // Ambil kandidat yang sesuai ID kandidat pencarian ini
    const listKandidat = store.kandidat.filter((k) =>
      record.kandidat_ids.includes(k.id) || k.id_pencarian === record.id
    );

    const safeNama = (record.parameter.tema || 'tren-umum')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const tgl = record.waktu ? record.waktu.slice(0, 10) : 'riset';
    unduhCsv(listKandidat, `pencarian-${safeNama}-${tgl}`, record.parameter.tipe_aset);
  };

  const handleKonfirmasiHapus = () => {
    if (pencarianMauDihapus) {
      onHapusPencarian(pencarianMauDihapus.id);
      setPencarianMauDihapus(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. HEADER RIWAYAT */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Riwayat Riset ({store.pencarian.length})</span>
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Semua catatan riset tersimpan secara lokal. Buka ulang hasil kapan saja tanpa kuota panggilan tambahan, atau pulihkan kandidat yang sebelumnya dibuang.
        </p>
      </section>

      {/* 2. DAFTAR RIWAYAT PENCARIAN */}
      {store.pencarian.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xl">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="font-bold text-sm text-white">Belum Ada Riwayat</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pencarian niche yang Anda lakukan di tab Cari akan otomatis tercatat di sini lengkap dengan sumber metadata grounding.
          </p>
          <button
            type="button"
            onClick={onGoToCari}
            className="btn-min-touch px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            Mulai Riset di Tab Cari
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {store.pencarian.map((record) => {
            const waktuStr = record.waktu
              ? new Date(record.waktu).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Waktu tidak tercatat';

            // Kandidat untuk pencarian ini
            const kandidatRecord = store.kandidat.filter((k) =>
              record.kandidat_ids.includes(k.id) || k.id_pencarian === record.id
            );

            // Kandidat berstatus 'dibuang' untuk pencarian ini
            const kandidatDibuang = kandidatRecord.filter((k) => k.status === 'dibuang');

            const isDibuangOpen = Boolean(bukaDibuangMap[record.id]);

            return (
              <article
                key={record.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 transition-all hover:border-slate-700/80"
              >
                {/* Baris Atas: Waktu & Status Grounding */}
                <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>{waktuStr}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Status Grounded Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        record.status === 'tergrounded'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : record.status === 'tidak_tergrounded'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {record.status === 'tergrounded'
                        ? 'Tergrounded'
                        : record.status === 'tidak_tergrounded'
                          ? 'Tanpa Grounding'
                          : 'Galat'}
                    </span>

                    {/* Tipe Aset */}
                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 capitalize">
                      {record.parameter.tipe_aset.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Tema & Jumlah Kandidat */}
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white">
                    {record.parameter.tema || 'Tren Umum (Tanpa Tema Khusus)'}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Target: {record.parameter.jumlah_kandidat} kandidat</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">
                      Tersimpan: {kandidatRecord.length} ide
                    </span>
                    {kandidatDibuang.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400 font-medium">
                          {kandidatDibuang.length} dibuang
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Kueri Web Search Preview */}
                {record.web_search_queries && record.web_search_queries.length > 0 && (
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Kueri Pencarian Web ({record.web_search_queries.length}):
                    </span>
                    <div className="space-y-0.5 font-mono text-[10px] text-slate-300">
                      {record.web_search_queries.slice(0, 3).map((q, idx) => (
                        <div key={idx} className="truncate">
                          • {q}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TOMBOL AKSI: Buka Ulang, Ekspor CSV, Hapus */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onBukaUlangPencarian(record, kandidatRecord)}
                    className="btn-min-touch flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                    title="Buka ulang hasil riset ini di tab Cari tanpa panggilan API baru"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buka Ulang Hasil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEksporSatuPencarian(record)}
                    className="btn-min-touch inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
                    title="Ekspor CSV untuk pencarian ini saja"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPencarianMauDihapus(record)}
                    className="btn-min-touch p-2 bg-slate-800/60 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 font-semibold text-xs rounded-xl border border-slate-700/60 transition-all active:scale-95"
                    title="Hapus pencarian ini dari riwayat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* ACCORDION KANDIDAT DIBUANG DARI PENCARIAN INI */}
                {kandidatDibuang.length > 0 && (
                  <div className="pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => toggleAccordionDibuang(record.id)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-rose-300 hover:text-rose-200 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Kandidat Dibuang ({kandidatDibuang.length})</span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isDibuangOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isDibuangOpen && (
                      <div className="mt-2 space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-400 italic">
                          Ide-ide ini sebelumnya dibuang dari hasil pencarian. Anda dapat memulihkannya kembali ke status 'baru'.
                        </p>
                        <div className="space-y-1.5">
                          {kandidatDibuang.map((k) => (
                            <div
                              key={k.id}
                              className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-slate-200 block truncate">
                                  {k.varian_id || k.kata_kunci_en}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 block truncate">
                                  {k.kata_kunci_en}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPulihkanKandidat(k.id)}
                                className="btn-min-touch shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-teal-950 hover:bg-teal-900 border border-teal-700 text-teal-300 text-xs font-semibold rounded-lg transition-all active:scale-95"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Pulihkan</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS RIWAYAT */}
      {pencarianMauDihapus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <h3 className="font-bold text-sm">Hapus Pencarian Ini?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pencarian <strong>"{pencarianMauDihapus.parameter.tema || 'Tren Umum'}"</strong> akan dihapus dari riwayat. Kandidat yang sedang Anda pantau di Shortlist akan tetap aman dipertahankan.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleKonfirmasiHapus}
                className="btn-min-touch flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                Ya, Hapus
              </button>
              <button
                type="button"
                onClick={() => setPencarianMauDihapus(null)}
                className="btn-min-touch px-4 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
