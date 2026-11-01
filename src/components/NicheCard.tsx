/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Bot,
  Palette,
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Info,
  Calendar,
  Tag,
  Target,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { NicheScoredIdea } from '../types/index.ts';

interface NicheCardProps {
  idea: NicheScoredIdea;
  isSaved?: boolean;
  onToggleSave?: (idea: NicheScoredIdea) => void;
}

export const NicheCard: React.FC<NicheCardProps> = ({ idea, isSaved = false, onToggleSave }) => {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const copyKeywords = () => {
    const text = idea.kataKunciRekomendasi.join(', ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryMeta = {
    real_photo: { label: 'Foto Nyata', icon: Camera, color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' },
    ai_photo: { label: 'Foto AI', icon: Bot, color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' },
    ai_illustration: { label: 'Ilustrasi AI', icon: Palette, color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
  }[idea.kategori] || { label: 'Foto Nyata', icon: Camera, color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' };

  const CategoryIcon = categoryMeta.icon;

  // Skor Indeks Peluang color
  const opportunityColor =
    idea.skor.indeksPeluang >= 75
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
      : idea.skor.indeksPeluang >= 60
        ? 'text-amber-400 border-amber-500/40 bg-amber-950/40'
        : 'text-slate-400 border-slate-700 bg-slate-900';

  return (
    <article className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5 transition-all hover:border-slate-700">
      {/* Top Bar: Kategori, Label Bukti Jujur, Tombol Simpan */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${categoryMeta.color}`}>
            <CategoryIcon className="w-3 h-3" />
            {categoryMeta.label}
          </span>

          {/* Aturan 5: Label bukti jujur */}
          {idea.skor.labelBukti === 'Bersumber' ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
              title="Bersumber: Memiliki rujukan hasil pencarian web nyata dari Google Search grounding."
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Bersumber ({idea.skor.jumlahRujukanGrounding} rujukan)</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700"
              title="Ide deskriptif tanpa link rujukan grounding langsung."
            >
              <span>Tanpa Rujukan Grounding</span>
            </span>
          )}
        </div>

        {/* Action: Simpan */}
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(idea)}
            className={`btn-min-touch px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all active:scale-95 ${
              isSaved
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
            <span>{isSaved ? 'Tersimpan' : 'Simpan'}</span>
          </button>
        )}
      </div>

      {/* Judul & Indeks Peluang (Dihitung KODE murni) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h2 className="font-bold text-base text-white leading-snug">{idea.judul}</h2>
        </div>
        <div className={`shrink-0 flex flex-col items-center justify-center px-2.5 py-1 rounded-xl border ${opportunityColor}`}>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Peluang</span>
          <span className="text-lg font-black leading-none">{idea.skor.indeksPeluang}</span>
          <span className="text-[9px] text-slate-400">/ 100</span>
        </div>
      </div>

      {/* Breakdown Skor KODE (Aturan 3: AI tidak boleh mengarang angka) */}
      <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] text-slate-400 block">Permintaan</span>
          <span className="text-xs font-bold text-emerald-400">{idea.skor.skorPermintaanPasar} / 10</span>
        </div>
        <div className="border-x border-slate-800">
          <span className="text-[10px] text-slate-400 block">Kompetisi</span>
          <span className="text-xs font-bold text-teal-400">{idea.skor.skorKepadatanKompetisi} / 10</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Kompleksitas</span>
          <span className="text-xs font-bold text-sky-400">{idea.skor.skorKompleksitas} / 10</span>
        </div>
      </div>

      {/* Jarak Hari Momen (Dihitung KODE murni) */}
      {typeof idea.skor.perkiraanHariMenujuMomen === 'number' && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {idea.skor.perkiraanHariMenujuMomen === 0
              ? 'Momen berlangsung hari ini!'
              : `+${idea.skor.perkiraanHariMenujuMomen} hari menuju momen (waktu upload ideal: 60-90 hari sebelum)`}
          </span>
        </div>
      )}

      {/* Deskripsi Visual Detail */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-400" />
          Deskripsi & Komposisi Visual:
        </span>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
          {idea.deskripsiVisual}
        </p>
      </div>

      {/* Elemen Kunci Visual */}
      {idea.elemenKunci.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Elemen Wajib Dalam Frame:</span>
          <div className="flex flex-wrap gap-1">
            {idea.elemenKunci.map((elem, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
                • {elem}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alasan Kebutuhan Pembeli */}
      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Target className="w-3 h-3 text-emerald-400" />
          Mengapa Pembeli Membutuhkan Visual Ini:
        </span>
        <p className="text-xs text-slate-400 leading-relaxed italic">
          "{idea.alasanKebutuhanPembeli}"
        </p>
      </div>

      {/* Target Industri & Platform */}
      <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
        {idea.targetIndustri.map((ind, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800/80 text-teal-300 border border-teal-900/60">
            {ind}
          </span>
        ))}
        {idea.rekomendasiPlatform.map((plat, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800/80 text-sky-300 border border-sky-900/60">
            {plat}
          </span>
        ))}
      </div>

      {/* Kata Kunci Rekomendasi (dengan tombol salin) */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Tag className="w-3 h-3 text-emerald-400" />
            Kata Kunci Metadata ({idea.kataKunciRekomendasi.length}):
          </span>
          <button
            type="button"
            onClick={copyKeywords}
            className="btn-min-touch inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-800/60 transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin Semua'}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {idea.kataKunciRekomendasi.map((kw, i) => (
            <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Aturan 4: Rujukan Resmi Grounding (Hanya dari groundingChunks) */}
      {idea.sumberGrounding.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between text-xs text-teal-400 hover:text-teal-300 font-semibold py-1"
          >
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sumber Rujukan Google Search ({idea.sumberGrounding.length})</span>
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showSources ? 'rotate-90' : ''}`} />
          </button>

          {showSources && (
            <div className="mt-2 space-y-1.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
              <p className="text-[10px] text-slate-400 italic mb-1.5">
                *Aturan 5: "Bersumber" hanya berarti ada rujukan dari hasil pencarian Google, bukan bahwa klaimnya pasti benar. URL berasal murni dari metadata groundingChunks.
              </p>
              <ul className="space-y-1">
                {idea.sumberGrounding.map((src, i) => (
                  <li key={i} className="text-xs">
                    <a
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:text-teal-300 underline inline-flex items-center gap-1 break-all"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span>{src.title || src.uri}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
