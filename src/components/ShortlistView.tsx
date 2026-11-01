/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  Download,
  Search,
  Sliders,
  ArrowUpDown,
  Tag as TagIcon,
  Filter,
  Sparkles,
  Camera,
  Bot,
  Palette,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { AppDataStore, KandidatNiche } from '../types.ts';
import { KandidatCard } from './KandidatCard.tsx';
import { unduhCsv } from '../lib/csvExport.ts';

interface ShortlistViewProps {
  store: AppDataStore;
  onUpdateStatus: (kandidatId: string, status: 'baru' | 'dipantau' | 'dibuang') => void;
  onUpdateCatatan: (kandidatId: string, catatan: string) => void;
  onUpdateTag: (kandidatId: string, tags: string[]) => void;
  onGoToCari: () => void;
  onBukaPanduan?: (sectionId?: string) => void;
}

type SortOption = 'terbaru' | 'bukti_terkuat' | 'abjad';

export const ShortlistView: React.FC<ShortlistViewProps> = ({
  store,
  onUpdateStatus,
  onUpdateCatatan,
  onUpdateTag,
  onGoToCari,
  onBukaPanduan,
}) => {
  // Filter States
  const [pencarianTeks, setPencarianTeks] = useState('');
  const [filterTipeAset, setFilterTipeAset] = useState<'semua' | 'foto_nyata' | 'foto_ai' | 'ilustrasi_ai'>('semua');
  const [filterBukti, setFilterBukti] = useState<'semua' | 'kuat' | 'sedang' | 'lemah' | 'tidak_ada'>('semua');
  const [tagDipilih, setTagDipilih] = useState<string | null>(null);
  const [urutan, setUrutan] = useState<SortOption>('terbaru');

  // Kandidat shortlist murni: status === 'dipantau'
  const semuaShortlist = useMemo(() => {
    return store.kandidat.filter((k) => k.status === 'dipantau');
  }, [store.kandidat]);

  // Semua tag unik yang ada di shortlist
  const daftarSemuaTag = useMemo(() => {
    const set = new Set<string>();
    semuaShortlist.forEach((k) => {
      (k.tag || []).forEach((t) => set.add(t.toLowerCase()));
    });
    return Array.from(set).sort();
  }, [semuaShortlist]);

  // Peta tipe aset dari pencarianRecord jika kandidat punya id_pencarian
  const searchTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    store.pencarian.forEach((p) => {
      map.set(p.id, p.parameter.tipe_aset);
    });
    return map;
  }, [store.pencarian]);

  // Filter & Urutkan
  const shortlistTersaring = useMemo(() => {
    return semuaShortlist
      .filter((k) => {
        // 1. Filter Teks
        if (pencarianTeks.trim()) {
          const q = pencarianTeks.toLowerCase();
          const matchKw = k.kata_kunci_en.toLowerCase().includes(q);
          const matchVar = (k.varian_id || '').toLowerCase().includes(q);
          const matchCatatan = (k.catatan || '').toLowerCase().includes(q);
          const matchTag = (k.tag || []).some((t) => t.toLowerCase().includes(q));
          if (!matchKw && !matchVar && !matchCatatan && !matchTag) return false;
        }

        // 2. Filter Tipe Aset
        if (filterTipeAset !== 'semua') {
          const asetKandidat = searchTypeMap.get(k.id_pencarian);
          if (asetKandidat && asetKandidat !== filterTipeAset) return false;
        }

        // 3. Filter Bukti
        if (filterBukti !== 'semua') {
          if (k.bukti !== filterBukti) return false;
        }

        // 4. Filter Tag
        if (tagDipilih) {
          if (!(k.tag || []).includes(tagDipilih)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (urutan === 'terbaru') {
          const timeA = a.dibuat_pada ? new Date(a.dibuat_pada).getTime() : 0;
          const timeB = b.dibuat_pada ? new Date(b.dibuat_pada).getTime() : 0;
          return timeB - timeA;
        }
        if (urutan === 'bukti_terkuat') {
          const bobot = { kuat: 4, sedang: 3, lemah: 2, tidak_ada: 1 };
          return (bobot[b.bukti] || 0) - (bobot[a.bukti] || 0);
        }
        if (urutan === 'abjad') {
          return a.kata_kunci_en.localeCompare(b.kata_kunci_en);
        }
        return 0;
      });
  }, [semuaShortlist, pencarianTeks, filterTipeAset, filterBukti, tagDipilih, urutan, searchTypeMap]);

  const handleEksporShortlistCsv = () => {
    const tanggalHariIni = new Date().toISOString().slice(0, 10);
    unduhCsv(shortlistTersaring, `shortlist-niche-scout-${tanggalHariIni}`);
  };

  const handleResetFilter = () => {
    setPencarianTeks('');
    setFilterTipeAset('semua');
    setFilterBukti('semua');
    setTagDipilih(null);
    setUrutan('terbaru');
  };

  return (
    <div className="space-y-4">
      {/* 1. HEADER KARTU SHORTLIST & TOMBOL EKSPOR */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              <span>Shortlist Niche ({semuaShortlist.length})</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Ide niche yang Anda pantau untuk rencana produksi konten mikrostock.
            </p>
          </div>

          {/* Tombol Ekspor CSV Shortlist */}
          <button
            type="button"
            disabled={shortlistTersaring.length === 0}
            onClick={handleEksporShortlistCsv}
            className="btn-min-touch shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all active:scale-95"
            title="Ekspor CSV UTF-8 dengan BOM untuk Excel / Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* 2. PENCARIAN TEKS */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={pencarianTeks}
            onChange={(e) => setPencarianTeks(e.target.value)}
            placeholder="Cari kata kunci, varian, catatan, atau tag..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            style={{ fontSize: '16px' }}
          />
          {pencarianTeks && (
            <button
              type="button"
              onClick={() => setPencarianTeks('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3. FILTER TIPE ASET, BUKTI, DAN URUTAN */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          {/* Tipe Aset */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 block">Tipe Aset:</label>
            <select
              value={filterTipeAset}
              onChange={(e) => setFilterTipeAset(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              style={{ fontSize: '16px' }}
            >
              <option value="semua">Semua Tipe</option>
              <option value="foto_nyata">Foto Nyata</option>
              <option value="foto_ai">Foto AI</option>
              <option value="ilustrasi_ai">Ilustrasi AI</option>
            </select>
          </div>

          {/* Bukti */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 block">Kualitas Bukti:</label>
            <select
              value={filterBukti}
              onChange={(e) => setFilterBukti(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              style={{ fontSize: '16px' }}
            >
              <option value="semua">Semua Bukti</option>
              <option value="kuat">Bukti Kuat</option>
              <option value="sedang">Bukti Sedang</option>
              <option value="lemah">Bukti Lemah</option>
              <option value="tidak_ada">Tanpa Sumber</option>
            </select>
          </div>

          {/* Urutan */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 block">Urutkan:</label>
            <select
              value={urutan}
              onChange={(e) => setUrutan(e.target.value as SortOption)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              style={{ fontSize: '16px' }}
            >
              <option value="terbaru">Terbaru</option>
              <option value="bukti_terkuat">Bukti Terkuat</option>
              <option value="abjad">Abjad (A-Z)</option>
            </select>
          </div>
        </div>

        {/* 4. CHIP FILTER TAG (Jika ada tag yang dibuat) */}
        {daftarSemuaTag.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold">
                <TagIcon className="w-3 h-3 text-teal-400" />
                <span>Filter Tag:</span>
              </span>
              {tagDipilih && (
                <button
                  type="button"
                  onClick={() => setTagDipilih(null)}
                  className="text-teal-400 hover:text-white underline text-[10px]"
                >
                  Semua Tag
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {daftarSemuaTag.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTagDipilih(tagDipilih === t ? null : t)}
                  className={`btn-min-touch px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all ${
                    tagDipilih === t
                      ? 'bg-teal-600 text-white border-teal-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. DAFTAR KANDIDAT SHORTLIST */}
      {semuaShortlist.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xl">
          <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="font-bold text-sm text-white">Shortlist Kosong</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Belum ada ide yang dipantau. Buka tab <strong>Cari</strong>, lalu tekan tombol <strong>"Pantau"</strong> pada ide niche yang ingin Anda rencanakan.
          </p>
          <button
            type="button"
            onClick={onGoToCari}
            className="btn-min-touch px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            Mulai Riset di Tab Cari
          </button>
        </div>
      ) : shortlistTersaring.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2 shadow-xl">
          <p className="text-xs text-slate-400">
            Tidak ada ide di shortlist yang cocok dengan filter atau kata kunci pencarian aktif.
          </p>
          <button
            type="button"
            onClick={handleResetFilter}
            className="btn-min-touch px-3 py-1.5 bg-slate-800 text-teal-400 font-bold text-xs rounded-xl"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Menampilkan {shortlistTersaring.length} dari {semuaShortlist.length} ide dipantau</span>
            <span className="font-mono text-[10px]">Urut: {urutan}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {shortlistTersaring.map((kandidat) => (
              <KandidatCard
                key={kandidat.id}
                kandidat={kandidat}
                isShortlisted={true}
                modeShortlist={true}
                onUpdateStatus={onUpdateStatus}
                onUpdateCatatan={onUpdateCatatan}
                onUpdateTag={onUpdateTag}
                onBukaPanduan={onBukaPanduan}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
