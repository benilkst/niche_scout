/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bookmark, Trash2, Download, Filter, FileText, Check, AlertTriangle } from 'lucide-react';
import { NicheScoredIdea, MicrostockCategory } from '../types/index.ts';
import { NicheCard } from './NicheCard.tsx';
import { CURRENT_SCHEMA_VERSION } from '../lib/storage.ts';

interface SavedNichesProps {
  items: NicheScoredIdea[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onGoToSearch: () => void;
}

export const SavedNiches: React.FC<SavedNichesProps> = ({ items, onRemoveItem, onClearAll, onGoToSearch }) => {
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const filteredItems = items.filter((item) => {
    if (filterKategori === 'all') return true;
    return item.kategori === filterKategori;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      schema_version: CURRENT_SCHEMA_VERSION,
      diexportPada: new Date().toISOString(),
      totalIde: items.length,
      items,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `niche-scout-saved-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyAllKeywords = () => {
    const allKeywords = Array.from(new Set(items.flatMap((i) => i.kataKunciRekomendasi))).join(', ');
    navigator.clipboard.writeText(allKeywords);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <Bookmark className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base text-white">Belum Ada Ide Niche Tersimpan</h3>
          <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
            Simpan ide niche potensial dari hasil pencarian grounding untuk rencana produksi konten Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToSearch}
          className="btn-min-touch inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/20 active:scale-95 transition-all"
        >
          Mulai Riset Niche Baru
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls & Export */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">Koleksi Niche Tersimpan</h2>
            <p className="text-xs text-slate-400">{items.length} ide tersimpan di localStorage (schema_version {CURRENT_SCHEMA_VERSION})</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportJson}
              className="btn-min-touch p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1"
              title="Unduh File JSON"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              type="button"
              onClick={handleCopyAllKeywords}
              className="btn-min-touch p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1"
              title="Salin Semua Kata Kunci Gabungan"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden sm:inline">{copiedAll ? 'Tersalin' : 'Keywords'}</span>
            </button>
          </div>
        </div>

        {/* Filter kategori tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'real_photo', label: 'Foto Nyata' },
            { id: 'ai_photo', label: 'Foto AI' },
            { id: 'ai_illustration', label: 'Ilustrasi AI' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterKategori(cat.id)}
              className={`btn-min-touch px-3 py-1 text-xs rounded-xl border transition-all whitespace-nowrap ${
                filterKategori === cat.id
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Clear All Danger Action */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          {showConfirmClear ? (
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Hapus semua {items.length} ide?
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setShowConfirmClear(false);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmClear(true)}
              className="text-slate-500 hover:text-rose-400 flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Bersihkan Koleksi</span>
            </button>
          )}
        </div>
      </div>

      {/* List items */}
      <div className="space-y-3.5">
        {filteredItems.map((idea) => (
          <NicheCard
            key={idea.id}
            idea={idea}
            isSaved={true}
            onToggleSave={() => onRemoveItem(idea.id)}
          />
        ))}
      </div>
    </div>
  );
};
