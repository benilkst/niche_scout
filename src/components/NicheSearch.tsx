/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Bot, Palette, Sparkles, Calendar, Search, Layers, ChevronDown } from 'lucide-react';
import { MicrostockCategory, NicheSearchPayload } from '../types/index.ts';
import { SEASONAL_EVENTS } from '../lib/scoring.ts';

interface NicheSearchProps {
  onSearch: (payload: NicheSearchPayload) => void;
  isLoading: boolean;
  loadingStep: string;
}

export const NicheSearch: React.FC<NicheSearchProps> = ({ onSearch, isLoading, loadingStep }) => {
  const [kategori, setKategori] = useState<MicrostockCategory>('real_photo');
  const [topikUtama, setTopikUtama] = useState('');
  const [targetMusimAtauBulan, setTargetMusimAtauBulan] = useState('');
  const [gayaVisualTambahan, setGayaVisualTambahan] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presets = [
    { label: 'Green Energy & Solar', topik: 'Pembangkit listrik tenaga surya dan teknisi energi terbarukan di atap gedung komersial', kategori: 'real_photo' as const },
    { label: 'Keluarga Asia Ramah Lansia', topik: 'Keluarga 3 generasi di ruang tamu modern sedang berinteraksi hangat dengan teknologi', kategori: 'real_photo' as const },
    { label: 'Bioteknologi Masa Depan', topik: 'Ilmuwan di laboratorium tanaman kultur jaringan hidroponik futuristik dengan sensor IoT', kategori: 'ai_photo' as const },
    { label: 'FinTech & Keuangan Syariah', topik: 'Konsep investasi digital mikro, perbankan tanpa cabang, dan dompet digital UMKM', kategori: 'ai_illustration' as const },
    { label: 'Persiapan Ramadhan', topik: 'Momen sahur keluarga, silaturahmi, dan kaligrafi modern minimalis dengan ruang copy-space', kategori: 'real_photo' as const, musim: 'ramadhan' },
    { label: 'Persiapan Natal / Q4', topik: 'Dekorasi perayaan akhir tahun ramah lingkungan (eco-friendly zero-waste holiday)', kategori: 'real_photo' as const, musim: 'natal' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      kategori,
      topikUtama: topikUtama.trim(),
      targetMusimAtauBulan: targetMusimAtauBulan.trim(),
      gayaVisualTambahan: gayaVisualTambahan.trim(),
    });
  };

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setKategori(preset.kategori);
    setTopikUtama(preset.topik);
    if (preset.musim) {
      setTargetMusimAtauBulan(preset.musim);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Category selector (3 tabs) */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          Format Konten Microstock
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setKategori('real_photo')}
            className={`btn-min-touch flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all ${
              kategori === 'real_photo'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="leading-tight">Foto Nyata</span>
          </button>

          <button
            type="button"
            onClick={() => setKategori('ai_photo')}
            className={`btn-min-touch flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all ${
              kategori === 'ai_photo'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="leading-tight">Foto AI</span>
          </button>

          <button
            type="button"
            onClick={() => setKategori('ai_illustration')}
            className={`btn-min-touch flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all ${
              kategori === 'ai_illustration'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span className="leading-tight">Ilustrasi AI</span>
          </button>
        </div>
      </div>

      {/* Preset Chips */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Inspirasi Cepat Tren Terkini:</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="btn-min-touch shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-emerald-300 transition-all active:scale-95 whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Input Topik / Kata Kunci - Aturan 7: font-size 16px */}
        <div>
          <label htmlFor="topikInput" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Topik / Subjek Riset
          </label>
          <div className="relative">
            <input
              id="topikInput"
              type="text"
              value={topikUtama}
              onChange={(e) => setTopikUtama(e.target.value)}
              placeholder="Contoh: Pekerja logistik wanita mengoperasikan forklift listrik"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              style={{ fontSize: '16px' }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Kosongkan jika ingin Gemini mencari peluang niche yang sedang naik daun secara otomatis.
          </p>
        </div>

        {/* Musim / Momen selector */}
        <div>
          <label htmlFor="musimSelect" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Target Momen Musiman / Peristiwa (Opsional)
          </label>
          <div className="relative">
            <select
              id="musimSelect"
              value={targetMusimAtauBulan}
              onChange={(e) => setTargetMusimAtauBulan(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
              style={{ fontSize: '16px' }}
            >
              <option value="">-- Tanpa Batasan Musim (Evergreen) --</option>
              {Object.entries(SEASONAL_EVENTS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.namaLengkap} (Bulan {val.bulan})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Kontributor disarankan mengunggah aset 60-90 hari sebelum momen dimulai.
          </p>
        </div>

        {/* Toggle Advanced */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Sembunyikan Opsi Gaya' : 'Tambah Preferensi Gaya Visual'}</span>
        </button>

        {showAdvanced && (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <label htmlFor="gayaInput" className="block text-xs font-semibold text-slate-300">
              Gaya Visual / Komposisi
            </label>
            <input
              id="gayaInput"
              type="text"
              value={gayaVisualTambahan}
              onChange={(e) => setGayaVisualTambahan(e.target.value)}
              placeholder="Contoh: Flat lay dengan copy space, candid cinematic, palet pastel"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              style={{ fontSize: '16px' }}
            />
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-min-touch w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{loadingStep || 'Sedang Meriset Pasar...'}</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Cari Niche dengan Grounding Google</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
