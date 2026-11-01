/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Sparkles, X, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';

interface MulaiCepatCardProps {
  onTutup: () => void;
  onBukaPanduan: (targetSectionId?: string) => void;
}

export const MulaiCepatCard: React.FC<MulaiCepatCardProps> = ({ onTutup, onBukaPanduan }) => {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-emerald-700/60 rounded-3xl p-4 shadow-xl space-y-3.5 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Kartu */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-white leading-tight">Mulai Cepat Niche Scout</h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded-full">
                Pemula
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Panduan 6 langkah ringkas riset ide komersial</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onTutup}
          className="btn-min-touch p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Tutup kartu Mulai Cepat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 6 Langkah Ringkas */}
      <div className="space-y-1.5 text-xs text-slate-300 relative z-10">
        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            1
          </span>
          <p className="text-[11px] leading-relaxed">
            Pilih <strong>Tipe Aset</strong> (Foto nyata, Foto AI, Ilustrasi AI), isi tema, atau pilih momen musiman.
          </p>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            2
          </span>
          <p className="text-[11px] leading-relaxed">
            Ketuk <strong>Cari Ide Niche</strong> dan tunggu hasil pencarian grounded dengan Google Search.
          </p>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            3
          </span>
          <p className="text-[11px] leading-relaxed">
            Periksa <strong>Lencana Bukti</strong> & buka sumber tautan untuk verifikasi klaim tren.
          </p>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            4
          </span>
          <p className="text-[11px] leading-relaxed">
            Ketuk <strong>Pantau</strong> pada kandidat layak produksi, atau <strong>Buang</strong> bila tidak sesuai.
          </p>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            5
          </span>
          <p className="text-[11px] leading-relaxed">
            Kelola ide di tab <strong>Shortlist</strong>, tambahkan catatan studio atau tag klasifikasi.
          </p>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            6
          </span>
          <p className="text-[11px] leading-relaxed">
            Ekspor ke <strong>CSV UTF-8</strong> atau salin kata kunci EN untuk langsung diproduksi.
          </p>
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="flex items-center justify-between gap-2 pt-1 relative z-10">
        <button
          type="button"
          onClick={() => onBukaPanduan('mulai-cepat')}
          className="btn-min-touch inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Buka Panduan Lengkap</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={onTutup}
          className="btn-min-touch inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all active:scale-95"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mengerti</span>
        </button>
      </div>
    </div>
  );
};
