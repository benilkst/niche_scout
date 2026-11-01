/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  HelpCircle,
  CheckCircle2,
  List,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  PANDUAN_DATA,
  PanduanBagian,
  VERSI_PANDUAN,
  VERSI_APLIKASI,
  CATATAN_PERUBAHAN,
} from '../data/panduanContent.ts';

interface PanduanModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSectionId?: string | null;
  onResetMulaiCepat?: () => void;
}

export const PanduanModal: React.FC<PanduanModalProps> = ({
  isOpen,
  onClose,
  targetSectionId,
  onResetMulaiCepat,
}) => {
  const [kataKunciCari, setKataKunciCari] = useState('');
  const [daftarIsiTerbuka, setDaftarIsiTerbuka] = useState(false);
  const [bukaBagianMap, setBukaBagianMap] = useState<Record<string, boolean>>(() => {
    // Default: bagian 1 dan 4 terbuka
    return {
      'mulai-cepat': true,
      'lencana-bukti': true,
    };
  });
  const [notifResetMulaiCepat, setNotifResetMulaiCepat] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Tangani targetSectionId saat modal dibuka atau targetSectionId berubah
  useEffect(() => {
    if (isOpen && targetSectionId) {
      setBukaBagianMap((prev) => ({
        ...prev,
        [targetSectionId]: true,
      }));

      // Delay sedikit agar DOM sudah ter-render sempurna
      const timer = setTimeout(() => {
        const el = sectionRefs.current[targetSectionId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [isOpen, targetSectionId]);

  // Kunci scroll body saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBagian = (id: string) => {
    setBukaBagianMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleBukaSemua = () => {
    const semua: Record<string, boolean> = {};
    PANDUAN_DATA.forEach((b) => {
      semua[b.id] = true;
    });
    setBukaBagianMap(semua);
  };

  const handleTutupSemua = () => {
    setBukaBagianMap({});
  };

  const handleLompatKeBagian = (id: string) => {
    setBukaBagianMap((prev) => ({ ...prev, [id]: true }));
    setDaftarIsiTerbuka(false);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollKeAtas = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleKlikResetMulaiCepat = () => {
    try {
      localStorage.removeItem('niche_scout_mulai_cepat_dilihat');
    } catch {
      // safe fallback
    }
    if (onResetMulaiCepat) {
      onResetMulaiCepat();
    }
    setNotifResetMulaiCepat(true);
    setTimeout(() => setNotifResetMulaiCepat(false), 3000);
  };

  // Helper fungsi sorot teks (Highlighter)
  const renderSorotTeks = (teks: string) => {
    const kueri = kataKunciCari.trim();
    if (!kueri) return teks;

    const regex = new RegExp(`(${kueri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const bagian = teks.split(regex);

    return bagian.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-amber-400 text-slate-950 px-1 py-0.5 rounded font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Hitung berapa bagian yang relevan dengan pencarian
  const bagianTerfilter = PANDUAN_DATA.map((bagian) => {
    const kueri = kataKunciCari.trim().toLowerCase();
    if (!kueri) return { bagian, cocok: true, jumlahCocok: 0 };

    let count = 0;
    if (bagian.judul.toLowerCase().includes(kueri)) count++;
    if (bagian.ringkasan.toLowerCase().includes(kueri)) count++;
    bagian.kontenTeks.forEach((t) => {
      if (t.toLowerCase().includes(kueri)) count++;
    });
    if (bagian.tabel) {
      bagian.tabel.baris.forEach((row) => {
        row.forEach((cell) => {
          if (cell.toLowerCase().includes(kueri)) count++;
        });
      });
    }

    return {
      bagian,
      cocok: count > 0,
      jumlahCocok: count,
    };
  });

  const totalCocok = bagianTerfilter.reduce((acc, curr) => acc + curr.jumlahCocok, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="panduan-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
    >
      <div
        className="w-full sm:max-w-6xl h-[95vh] sm:h-[90vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-fadeIn"
      >
        {/* HEADER MODAL */}
        <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="panduan-title" className="font-bold text-base text-white leading-tight">
                  Panduan Penggunaan
                </h2>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded-full">
                  {VERSI_PANDUAN}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Panduan resmi alur microstock & audit kode</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-min-touch w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/80 transition-all active:scale-95"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* CONTAINER 2 KOLOM PADA DESKTOP (>=1024px) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Kolom Kiri: TOC Tetap 280px di Desktop */}
          <aside className="w-[280px] shrink-0 border-r border-slate-800 p-4 overflow-y-auto hidden lg:flex flex-col space-y-3 bg-slate-950/40">
            {/* Search Input di Sidebar Desktop */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kataKunciCari}
                onChange={(e) => setKataKunciCari(e.target.value)}
                placeholder="Cari topik panduan..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {kataKunciCari && (
                <button
                  type="button"
                  onClick={() => setKataKunciCari('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Aksi Cepat Daftar Isi */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
              <span className="font-semibold text-slate-300">Daftar Isi (10 Bab)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBukaSemua}
                  className="text-teal-400 hover:underline font-semibold"
                >
                  Buka
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={handleTutupSemua}
                  className="text-slate-400 hover:underline"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Navigasi Tautan Bab */}
            <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
              {PANDUAN_DATA.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleLompatKeBagian(item.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between group transition-colors ${
                    bukaBagianMap[item.id]
                      ? 'bg-slate-800 text-white font-medium border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate pr-1">
                    <strong className="text-emerald-400 font-mono mr-1">#{item.nomor}</strong>
                    {item.judul}
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 shrink-0 font-mono">
                    →
                  </span>
                </button>
              ))}
            </nav>

            {/* Reset Mulai Cepat di Sidebar Desktop */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleKlikResetMulaiCepat}
                className="w-full text-left text-[11px] p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              >
                {notifResetMulaiCepat ? '✓ Mulai Cepat Diaktifkan' : 'Tampilkan Kartu Mulai Cepat'}
              </button>
            </div>
          </aside>

          {/* Kolom Kanan: Konten Baca dengan Lebar Maksimal 800px */}
          <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-[800px] mx-auto space-y-4">
              {/* Header Khusus Layar Kecil (Search & Collapsible TOC di Mobile/Tablet) */}
              <div className="lg:hidden space-y-4">
                {/* 1. KOLOM PENCARIAN TEKS DENGAN SOROTAN */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={kataKunciCari}
                      onChange={(e) => setKataKunciCari(e.target.value)}
                      placeholder="Cari topik panduan (misal: merek, bukti, kuota)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      style={{ fontSize: '16px' }}
                    />
                    {kataKunciCari && (
                      <button
                        type="button"
                        onClick={() => setKataKunciCari('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {kataKunciCari.trim() && (
                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                      <span>
                        Hasil temuan: <strong className="text-emerald-400">{totalCocok}</strong> bagian/paragraf
                      </span>
                      <button
                        type="button"
                        onClick={handleBukaSemua}
                        className="text-teal-400 hover:underline font-semibold"
                      >
                        Buka semua hasil
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. DAFTAR ISI DAPAT DILIPAT (COLLAPSIBLE TOC DI HP) */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDaftarIsiTerbuka(!daftarIsiTerbuka)}
                      className="flex items-center gap-2 text-xs font-bold text-white hover:text-emerald-300 transition-colors"
                    >
                      <List className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Daftar Isi (10 Bab)</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {daftarIsiTerbuka ? '(Sembunyikan)' : '(Lihat Tautan)'}
                      </span>
                    </button>

                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleBukaSemua}
                        className="text-teal-400 hover:underline font-semibold"
                      >
                        Buka Semua
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleTutupSemua}
                        className="text-slate-400 hover:underline"
                      >
                        Tutup Semua
                      </button>
                    </div>
                  </div>

                  {daftarIsiTerbuka && (
                    <nav className="pt-2 border-t border-slate-800/80 grid grid-cols-1 gap-1 text-xs">
                      {PANDUAN_DATA.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleLompatKeBagian(item.id)}
                          className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between group transition-colors"
                        >
                          <span className="truncate">
                            <strong className="text-emerald-400 font-mono mr-1.5">#{item.nomor}</strong>
                            {item.judul}
                          </span>
                          <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 font-mono">
                            Lompat →
                          </span>
                        </button>
                      ))}
                    </nav>
                  )}
                </div>

                {/* 3. TOMBOL RESET KARTU MULAI CEPAT DI HP */}
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white">Kartu Mulai Cepat Beranda</h4>
                    <p className="text-[11px] text-slate-400">
                      Tampilkan kembali kartu 6-langkah di tab Cari jika sebelumnya ditutup.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleKlikResetMulaiCepat}
                    className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-all active:scale-95 shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tampilkan</span>
                  </button>
                </div>
                {notifResetMulaiCepat && (
                  <div className="p-2 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Kartu Mulai Cepat akan muncul kembali di tab Cari.</span>
                  </div>
                )}
              </div>

          {/* 4. DAFTAR BAGIAN ACCORDION (1 s/d 10) */}
          <div className="space-y-3">
            {bagianTerfilter.map(({ bagian, cocok }) => {
              if (kataKunciCari.trim() && !cocok) return null;
              const terbuka = Boolean(bukaBagianMap[bagian.id]);

              return (
                <section
                  key={bagian.id}
                  id={bagian.id}
                  ref={(el) => {
                    sectionRefs.current[bagian.id] = el;
                  }}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                    terbuka
                      ? 'bg-slate-900/90 border-slate-700 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/70'
                  }`}
                >
                  {/* ACCORDION HEADER */}
                  <button
                    type="button"
                    onClick={() => handleToggleBagian(bagian.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        {bagian.nomor}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                          {renderSorotTeks(bagian.judul)}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {renderSorotTeks(bagian.ringkasan)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-slate-400">
                      {terbuka ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* ACCORDION BODY */}
                  {terbuka && (
                    <div className="p-3.5 pt-0 border-t border-slate-800/80 space-y-3 text-xs text-slate-300 leading-relaxed">
                      {/* Konten Paragraf */}
                      <div className="space-y-2 pt-2">
                        {bagian.kontenTeks.map((paragraf, pIdx) => (
                          <p
                            key={pIdx}
                            className={
                              paragraf.startsWith('•') || paragraf.startsWith('1.') || paragraf.startsWith('2.') || paragraf.startsWith('3.') || paragraf.startsWith('4.') || paragraf.startsWith('5.') || paragraf.startsWith('6.')
                                ? 'pl-2 text-slate-300'
                                : paragraf.endsWith(':')
                                  ? 'font-bold text-white pt-1'
                                  : 'text-slate-300'
                            }
                          >
                            {renderSorotTeks(paragraf)}
                          </p>
                        ))}
                      </div>

                      {/* Tabel (Jika Ada) - Digeser dengan scroll horizontal */}
                      {bagian.tabel && (
                        <div className="pt-2 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 block italic">
                            *Geser tabel ke samping pada layar ponsel jika terpotong:
                          </span>
                          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                            <table className="w-full text-left text-[11px] min-w-[460px]">
                              <thead>
                                <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-200">
                                  {bagian.tabel.header.map((th, thIdx) => (
                                    <th key={thIdx} className="p-2.5 font-bold whitespace-nowrap">
                                      {renderSorotTeks(th)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/80 font-mono">
                                {bagian.tabel.baris.map((row, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className={rIdx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/40'}
                                  >
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="p-2.5 align-top text-slate-300">
                                        {cIdx === 0 ? (
                                          <strong className="text-emerald-400 block font-sans">
                                            {renderSorotTeks(cell)}
                                          </strong>
                                        ) : (
                                          <span className="font-sans leading-normal">
                                            {renderSorotTeks(cell)}
                                          </span>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Tips Tambahan (Jika Ada) */}
                      {bagian.tips && bagian.tips.length > 0 && (
                        <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                          <strong className="text-emerald-400 block flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Tips Praktis:
                          </strong>
                          {bagian.tips.map((tip, tIdx) => (
                            <p key={tIdx} className="text-slate-400 leading-relaxed">
                              • {renderSorotTeks(tip)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* 5. VERSI APLIKASI & CATATAN PERUBAHAN */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Versi Aplikasi: {VERSI_APLIKASI}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{VERSI_PANDUAN}</span>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-300 block">
                Catatan Perubahan (Changelog):
              </span>
              {CATATAN_PERUBAHAN.map((c, idx) => (
                <div key={idx} className="space-y-1 text-[11px] text-slate-400">
                  <span className="text-white font-medium">{c.versi} - {c.tanggal}</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400">
                    {c.poin.map((p, pIdx) => (
                      <li key={pIdx}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

        {/* FOOTER MODAL DENGAN TOMBOL "KE ATAS" DAN "TUTUP" */}
        <footer className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleScrollKeAtas}
            className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Ke atas</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-min-touch inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <span>Selesai Membaca</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
