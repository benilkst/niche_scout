/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentScale: number;
  onGoToPengaturan?: () => void;
  onBukaPanduan?: () => void;
  isScaleManual?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScale,
  onGoToPengaturan,
  onBukaPanduan,
  isScaleManual,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 sm:px-6 lg:px-8 py-2.5 lg:pl-[260px] transition-all">
      <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-bold shrink-0">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-white leading-tight truncate">
                Niche Scout
              </h1>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded-full shrink-0">
                v1.0
              </span>
            </div>
            {/* Subjudul persis sesuai instruksi: "Ide niche microstock bersumber" */}
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-none truncate">
              Ide niche microstock bersumber
            </p>
          </div>
        </div>

        {/* Action Buttons: Panduan & Skala */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tombol Panduan (Ikon Buku) - terlihat di mobile/tablet, di desktop juga bisa dibuka */}
          {onBukaPanduan && (
            <button
              type="button"
              onClick={onBukaPanduan}
              className="btn-min-touch inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/80 transition-all active:scale-95 shadow-sm"
              title="Buka Panduan Aplikasi (v1.0)"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Panduan</span>
            </button>
          )}

          {/* Indikator Skala */}
          {onGoToPengaturan && (
            <button
              type="button"
              onClick={onGoToPengaturan}
              className="btn-min-touch inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/70 transition-all active:scale-95"
              title="Buka Pengaturan Skala"
            >
              <span className="text-slate-400 hidden sm:inline">Skala:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {Math.round(currentScale * 100)}%
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                ({isScaleManual ? 'Manual' : 'Otomatis'})
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
