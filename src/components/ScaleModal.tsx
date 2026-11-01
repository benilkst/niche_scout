/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Check, RotateCcw, AlertCircle } from 'lucide-react';

interface ScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (newScale: number) => void;
}

export const ScaleModal: React.FC<ScaleModalProps> = ({ isOpen, onClose, scale, onScaleChange }) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onScaleChange(0.7); // Aturan 7: default 0.7
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white">Pengaturan Skala Tampilan</h3>
            <p className="text-xs text-slate-400">Aturan 7: CSS variable --skala (default 0.7)</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Nilai Skala Saat Ini:</span>
            <span className="text-sm font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              --skala: {scale.toFixed(2)}
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="0.65"
              max="1.0"
              step="0.05"
              value={scale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0.65 (Padat)</span>
              <span className="text-emerald-400 font-semibold">0.70 (Default)</span>
              <span>1.00 (Standar)</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[0.7, 0.8, 0.9].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onScaleChange(val)}
                className={`btn-min-touch flex items-center justify-center gap-1 rounded-xl text-xs font-medium border transition-all ${
                  Math.abs(scale - val) < 0.01
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {Math.abs(scale - val) < 0.01 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{val.toFixed(2)} {val === 0.7 ? '(Def)' : ''}</span>
              </button>
            ))}
          </div>

          {/* Rule 7 Compliance Notice */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex gap-2.5 items-start">
            <AlertCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200">Kepatuhan Standar Safari iOS:</p>
              <p className="text-slate-400">
                Ukuran berbasis <code className="text-emerald-400">rem</code> dengan formula{' '}
                <code className="text-emerald-400">calc(16px * var(--skala))</code>. Tidak menggunakan CSS zoom atau transform scale. Font input tetap 16px.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="btn-min-touch flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset (0.7)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-min-touch flex-1 inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            Terapkan & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
