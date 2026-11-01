/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Camera,
  Info,
  Layers,
  FileWarning,
  Trash2,
  RotateCcw,
  Tag as TagIcon,
  Edit3,
  Plus,
  X,
} from 'lucide-react';
import { KandidatNiche } from '../types.ts';

interface KandidatCardProps {
  kandidat: KandidatNiche;
  onUpdateStatus?: (kandidatId: string, status: 'baru' | 'dipantau' | 'dibuang') => void;
  onUpdateCatatan?: (kandidatId: string, catatan: string) => void;
  onUpdateTag?: (kandidatId: string, tags: string[]) => void;
  // Untuk kompatibilitas toggle lama
  onToggleShortlist?: (kandidat: KandidatNiche) => void;
  isShortlisted?: boolean;
  modeShortlist?: boolean;
  onBukaPanduan?: (sectionId?: string) => void;
}

export const KandidatCard: React.FC<KandidatCardProps> = ({
  kandidat,
  onUpdateStatus,
  onUpdateCatatan,
  onUpdateTag,
  onToggleShortlist,
  isShortlisted = false,
  modeShortlist = false,
  onBukaPanduan,
}) => {
  const [salinSukses, setSalinSukses] = useState(false);
  const [bukaSumber, setBukaSumber] = useState(false);

  // State Catatan & Tag (Tahap 4)
  const [bukaEditCatatan, setBukaEditCatatan] = useState(modeShortlist);
  const [teksCatatan, setTeksCatatan] = useState(kandidat.catatan || '');
  const [catatanTersimpan, setCatatanTersimpan] = useState(false);

  const [inputTagBaru, setInputTagBaru] = useState('');

  const statusAktif = kandidat.status || (isShortlisted ? 'dipantau' : 'baru');

  const handleSalinKataKunci = () => {
    navigator.clipboard.writeText(kandidat.kata_kunci_en);
    setSalinSukses(true);
    setTimeout(() => setSalinSukses(false), 2000);
  };

  const handleSimpanCatatan = () => {
    if (onUpdateCatatan) {
      onUpdateCatatan(kandidat.id, teksCatatan.trim());
      setCatatanTersimpan(true);
      setTimeout(() => setCatatanTersimpan(false), 2000);
    }
  };

  const handleTambahTag = () => {
    const trimmed = inputTagBaru.trim().toLowerCase();
    if (!trimmed) return;

    const tagsSaatIni = kandidat.tag || [];
    if (!tagsSaatIni.includes(trimmed)) {
      const tagsBaru = [...tagsSaatIni, trimmed];
      if (onUpdateTag) {
        onUpdateTag(kandidat.id, tagsBaru);
      }
    }
    setInputTagBaru('');
  };

  const handleHapusTag = (tagYangDihapus: string) => {
    const tagsBaru = (kandidat.tag || []).filter((t) => t !== tagYangDihapus);
    if (onUpdateTag) {
      onUpdateTag(kandidat.id, tagsBaru);
    }
  };

  const handleSetStatus = (statusBaru: 'baru' | 'dipantau' | 'dibuang') => {
    if (onUpdateStatus) {
      onUpdateStatus(kandidat.id, statusBaru);
    } else if (onToggleShortlist) {
      onToggleShortlist(kandidat);
    }
  };

  const adaSumber = kandidat.sumber && kandidat.sumber.length > 0;
  const cakupanPct =
    kandidat.cakupan_dukungan !== null
      ? `${Math.round(kandidat.cakupan_dukungan * 100)}%`
      : '0%';

  const teksAlasanBukti =
    kandidat.alasan_bukti ||
    (adaSumber
      ? `${kandidat.jumlah_domain} domain, cakupan ${cakupanPct}`
      : '0 domain, tanpa rujukan langsung');

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5 transition-all hover:border-slate-700/80">
      {/* 1. TOP BAR: Nomor, Lencana Bukti & Alasan Audit, Aksi Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            #{kandidat.nomor}
          </span>

          {/* Lencana Bukti (kuat / sedang / lemah / tidak_ada) */}
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
              kandidat.bukti === 'kuat'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : kandidat.bukti === 'sedang'
                  ? 'bg-teal-950/80 text-teal-300 border-teal-700/80'
                  : kandidat.bukti === 'lemah'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={`Bukti ${kandidat.bukti.toUpperCase()}: ${teksAlasanBukti}`}
          >
            {kandidat.bukti === 'kuat' || kandidat.bukti === 'sedang' ? (
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            ) : (
              <Info className="w-3 h-3" />
            )}
            <span>Bukti {kandidat.bukti.toUpperCase()}</span>
          </span>

          {/* Tombol Bantuan Bukti (?) */}
          {onBukaPanduan && (
            <button
              type="button"
              onClick={() => onBukaPanduan('lencana-bukti')}
              className="btn-min-touch w-4 h-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px] font-bold border border-slate-700 transition-colors"
              title="Pelajari Lencana Bukti di Panduan"
            >
              ?
            </button>
          )}

          {/* Alasan audit bukti */}
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {teksAlasanBukti}
          </span>
        </div>

        {/* AKSI STATUS PADA KARTU (Tahap 4) */}
        <div className="flex items-center gap-1.5">
          {statusAktif === 'dipantau' ? (
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-300">
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dipantau</span>
              </span>
              <button
                type="button"
                onClick={() => handleSetStatus('baru')}
                className="btn-min-touch px-2 py-1 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95"
                title="Batalkan pantauan (kembalikan ke baru)"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSetStatus('dibuang')}
                className="btn-min-touch p-1 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-950/40 transition-all active:scale-95"
                title="Buang ide ini"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : statusAktif === 'dibuang' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-800">
                Dibuang
              </span>
              <button
                type="button"
                onClick={() => handleSetStatus('baru')}
                className="btn-min-touch inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-xl bg-teal-950/80 hover:bg-teal-900 border border-teal-700 text-teal-300 transition-all active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Pulihkan</span>
              </button>
            </div>
          ) : (
            // Status: 'baru'
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSetStatus('dipantau')}
                className="btn-min-touch inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 transition-all active:scale-95"
                title="Pantau ide ini (tambahkan ke shortlist)"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Pantau</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetStatus('dibuang')}
                className="btn-min-touch inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-800 border border-slate-700 text-slate-400 transition-all active:scale-95"
                title="Buang ide ini dari daftar aktif"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Buang</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. BARIS LENCANA STATUS DEDUPE & RISIKO MEREK */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Lencana Mirip dengan #n */}
        {kandidat.mirip_dengan && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Mirip dengan #{kandidat.mirip_dengan}</span>
          </span>
        )}

        {/* Lencana Pernah Muncul */}
        {kandidat.sudah_pernah_muncul && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
            <span>Pernah muncul sebelumnya</span>
          </span>
        )}

        {/* Lencana Periksa Merek */}
        {kandidat.risiko_merek && kandidat.risiko_merek.ada && (
          <div className="inline-flex items-center gap-1">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800"
              title={kandidat.risiko_merek.alasan || 'Kemungkinan ada unsur merek'}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Periksa Merek</span>
            </span>
            {onBukaPanduan && (
              <button
                type="button"
                onClick={() => onBukaPanduan('penanda-merek')}
                className="btn-min-touch w-3.5 h-3.5 rounded-full bg-amber-950 hover:bg-amber-900 text-amber-300 flex items-center justify-center text-[9px] font-bold border border-amber-800 transition-colors"
                title="Pelajari Penanda Merek di Panduan"
              >
                ?
              </button>
            )}
          </div>
        )}

        {/* Status Dukungan */}
        <div className="inline-flex items-center gap-1">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              kandidat.dukungan === 'didukung'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                : kandidat.dukungan === 'sebagian'
                  ? 'bg-teal-950 text-teal-400 border border-teal-800/60'
                  : 'bg-rose-950 text-rose-300 border border-rose-800/60'
            }`}
          >
            {kandidat.dukungan === 'didukung'
              ? 'Didukung Sumber'
              : kandidat.dukungan === 'sebagian'
                ? 'Dukungan Sebagian'
                : 'Tidak Didukung Sumber'}
          </span>
          {onBukaPanduan && (
            <button
              type="button"
              onClick={() => onBukaPanduan('lencana-bukti')}
              className="btn-min-touch w-3.5 h-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-[9px] font-bold border border-slate-700 transition-colors"
              title="Pelajari Cakupan Dukungan di Panduan"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* 3. PERINGATAN KANDIDAT TIDAK DIDUKUNG */}
      {kandidat.dukungan === 'tidak_didukung' && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <FileWarning className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Peringatan Verifikasi:</strong> Klaim kandidat ini tidak punya sumber langsung. Evaluasi dengan hati-hati sebelum memproduksi.
          </p>
        </div>
      )}

      {/* 4. DETAIL KONSEP & KATA KUNCI EN */}
      <div className="space-y-1.5">
        <h3 className="font-bold text-base text-white leading-snug">
          {kandidat.varian_id || 'Ide Niche Komersial'}
        </h3>

        {/* Kotak Kata Kunci EN dengan tombol salin */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
          <code className="text-xs font-mono text-emerald-300 break-all select-all flex-1">
            {kandidat.kata_kunci_en}
          </code>
          <button
            type="button"
            onClick={handleSalinKataKunci}
            className="btn-min-touch shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 transition-all active:scale-95"
            title="Salin Kata Kunci Bahasa Inggris"
          >
            {salinSukses ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{salinSukses ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>

      {/* 5. SARAN PERMINTAAN DIKUNCI KODE */}
      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Saran permintaan (belum dikonfirmasi):</span>
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {kandidat.saran_permintaan_1_5 !== null
              ? `${kandidat.saran_permintaan_1_5} / 5`
              : 'Tidak Tersedia (Tanpa Sumber)'}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 italic">
          *Ini adalah estimasi saran sistem yang dikunci oleh kode berdasarkan bukti rujukan, bukan data penjualan riil.
        </p>
      </div>

      {/* 6. ALASAN & SINYAL TREN */}
      <div className="space-y-2 text-xs">
        <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/70 space-y-1">
          <span className="font-semibold text-slate-300 block">Kebutuhan Pembeli:</span>
          <p className="text-slate-300 leading-relaxed">{kandidat.alasan}</p>
        </div>

        <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/70 space-y-1">
          <span className="font-semibold text-teal-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Sinyal Tren Terkini:
          </span>
          <p className="text-slate-300 leading-relaxed">{kandidat.sinyal_tren}</p>
        </div>
      </div>

      {/* 7. SUDUT KREATIF */}
      <div className="space-y-1.5 p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1">
          <Camera className="w-3.5 h-3.5 text-teal-400" />
          Saran Sudut Kreatif:
        </span>
        <div className="space-y-1 text-[11px] text-slate-300">
          <div>
            <strong className="text-slate-400">Copy Space:</strong> {kandidat.saran_sudut.copy_space}
          </div>
          <div>
            <strong className="text-slate-400">Konteks Lokal:</strong> {kandidat.saran_sudut.konteks_lokal}
          </div>
          <div>
            <strong className="text-slate-400">Gaya Visual:</strong> {kandidat.saran_sudut.gaya}
          </div>
        </div>
      </div>

      {/* 8. DETAIL RISIKO MEREK JIKA ADA */}
      {kandidat.risiko_merek && kandidat.risiko_merek.ada && (
        <div className="p-2.5 bg-amber-950/50 border border-amber-800/70 rounded-xl text-xs space-y-1 text-amber-200">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Peringatan Risiko Merek:</span>
          </div>
          <p className="text-[11px] leading-relaxed pl-5">
            {kandidat.risiko_merek.alasan || 'Terdeteksi nama merek dagang atau entitas komersial berhak cipta.'}
          </p>
          <p className="text-[10px] text-amber-400/80 italic pl-5">
            *Catatan: Penanda bantu otomatis, bukan penilaian hukum mutlak.
          </p>
        </div>
      )}

      {/* 9. CATATAN PRIBADI & TAG (Tahap 4) */}
      {(modeShortlist || onUpdateCatatan || onUpdateTag) && (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
          {/* Header Catatan & Tag */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
              <span>Catatan & Tag Pribadi</span>
            </span>
            <button
              type="button"
              onClick={() => setBukaEditCatatan(!bukaEditCatatan)}
              className="text-[11px] text-teal-400 hover:text-teal-300 font-medium"
            >
              {bukaEditCatatan ? 'Tutup' : 'Kelola'}
            </button>
          </div>

          {/* Tag Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(kandidat.tag && kandidat.tag.length > 0) ? (
              kandidat.tag.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-teal-950/80 text-teal-300 border border-teal-800/70 px-2 py-0.5 rounded-md"
                >
                  <span>#{tag}</span>
                  {onUpdateTag && (
                    <button
                      type="button"
                      onClick={() => handleHapusTag(tag)}
                      className="text-teal-400 hover:text-white p-0.5 rounded"
                      title={`Hapus tag ${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-500 italic">Belum ada tag</span>
            )}
          </div>

          {/* Form Tambah Tag & Edit Catatan saat dibuka */}
          {bukaEditCatatan && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              {/* Tambah Tag */}
              {onUpdateTag && (
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputTagBaru}
                      onChange={(e) => setInputTagBaru(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTambahTag();
                        }
                      }}
                      placeholder="Tambah tag baru (misal: lansia, ai, q4)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTambahTag}
                    className="btn-min-touch px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Edit Catatan */}
              {onUpdateCatatan && (
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    value={teksCatatan}
                    onChange={(e) => setTeksCatatan(e.target.value)}
                    placeholder="Tulis catatan rencana foto/ilustrasi untuk ide ini..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    style={{ fontSize: '16px' }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      {catatanTersimpan && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Catatan tersimpan</span>
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleSimpanCatatan}
                      className="btn-min-touch px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold active:scale-95"
                    >
                      Simpan Catatan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tampilan teks catatan singkat jika tertutup tapi ada catatan */}
          {!bukaEditCatatan && kandidat.catatan && (
            <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              "{kandidat.catatan}"
            </p>
          )}
        </div>
      )}

      {/* 10. DAFTAR SUMBER */}
      {adaSumber && (
        <div className="pt-1 border-t border-slate-800/70">
          <button
            type="button"
            onClick={() => setBukaSumber(!bukaSumber)}
            className="w-full flex items-center justify-between text-xs font-semibold text-teal-400 hover:text-teal-300 py-1"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Daftar Sumber Rujukan ({kandidat.sumber.length} tautan)</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${bukaSumber ? 'rotate-180' : ''}`} />
          </button>

          {bukaSumber && (
            <div className="mt-2 space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-400 italic">
                *Catatan audit: Domain berbeda belum tentu independen (bisa satu konglomerasi penerbit).
              </p>
              <ul className="space-y-1.5">
                {kandidat.sumber.map((s, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      {s.domain}
                      {s.is_platform && (
                        <span className="text-[9px] text-teal-300 bg-teal-950 px-1 rounded border border-teal-800">
                          sumber platform
                        </span>
                      )}
                    </span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 underline break-all text-[11px]"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span>{s.judul || s.url}</span>
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
