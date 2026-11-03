/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Bot,
  Palette,
  Search,
  Sliders,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  ChevronDown,
  X,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
  Lock,
  KeyRound,
} from 'lucide-react';
import { AppDataStore, KandidatNiche, PencarianRecord } from '../types.ts';
import { KandidatCard } from './KandidatCard.tsx';
import {
  getDailyCallCount,
  incrementDailyCallCount,
  isNearDailyLimit,
  isOverDailyLimit,
} from '../lib/dailyLimit.ts';
import { findValidCache, generateCacheKey } from '../lib/cacheUtils.ts';
import {
  calculateEvidenceQuality,
  applyDeduplication,
  checkBrandRisk,
} from '../lib/evidenceScoring.ts';
import { unduhCsv } from '../lib/csvExport.ts';
import { hitungJendelaMomen } from '../lib/kalenderMusiman.ts';
import { MulaiCepatCard } from './MulaiCepatCard.tsx';

interface CariViewProps {
  store: AppDataStore;
  onSimpanHasilPencarian: (record: PencarianRecord, kandidatBaru: KandidatNiche[]) => void;
  onUpdateStatus: (kandidatId: string, status: 'baru' | 'dipantau' | 'dibuang') => void;
  onUpdateCatatan: (kandidatId: string, catatan: string) => void;
  onUpdateTag: (kandidatId: string, tags: string[]) => void;
  reopenedData?: { record: PencarianRecord; kandidat: KandidatNiche[] } | null;
  onClearReopenedData?: () => void;
  momenAwalId?: string | null;
  onBukaPanduan?: (sectionId?: string) => void;
  onBukaPengaturan?: () => void;
}

export const CariView: React.FC<CariViewProps> = ({
  store,
  onSimpanHasilPencarian,
  onUpdateStatus,
  onUpdateCatatan,
  onUpdateTag,
  reopenedData,
  onClearReopenedData,
  momenAwalId,
  onBukaPanduan,
  onBukaPengaturan,
}) => {
  // Form State
  const [tipeAset, setTipeAset] = useState<'foto_nyata' | 'foto_ai' | 'ilustrasi_ai'>('foto_nyata');
  const [tema, setTema] = useState('');
  const [momenId, setMomenId] = useState<string>(momenAwalId || '');
  const [jumlahKandidat, setJumlahKandidat] = useState<number>(10);

  // Perbarui momenId jika momenAwalId berubah dari luar (misal dari tab Kalender)
  useEffect(() => {
    if (momenAwalId) {
      setMomenId(momenAwalId);
    }
  }, [momenAwalId]);

  // Status Pencarian & Loading
  const [sedangMencari, setSedangMencari] = useState(false);
  const [pesanProgres, setPesanProgres] = useState('');
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  // Hasil Aktif
  const [hasilKandidat, setHasilKandidat] = useState<KandidatNiche[]>([]);
  const [hasilPencarianRecord, setHasilPencarianRecord] = useState<PencarianRecord | null>(null);
  const [infoCache, setInfoCache] = useState<string | null>(null);

  // Filter Hasil
  const [sembunyikanTanpaSumber, setSembunyikanTanpaSumber] = useState(false);
  const [sembunyikanMirip, setSembunyikanMirip] = useState(false);
  const [hanyaBuktiSedangKeAtas, setHanyaBuktiSedangKeAtas] = useState(false);
  const [tampilkanDibuang, setTampilkanDibuang] = useState(false);

  // Kueri Accordion
  const [bukaKueri, setBukaKueri] = useState(false);

  // Modal Konfirmasi Melewati Batas Harian & Abaikan Cache
  const [modalBatasBuka, setModalBatasBuka] = useState(false);
  const [modalAbaikanCacheBuka, setModalAbaikanCacheBuka] = useState(false);

  // AbortController ref untuk tombol Batal
  const abortControllerRef = useRef<AbortController | null>(null);

  // Kartu Mulai Cepat Onboarding (Tahap 7)
  const [mulaiCepatDitutup, setMulaiCepatDitutup] = useState<boolean>(() => {
    try {
      return localStorage.getItem('niche_scout_mulai_cepat_dilihat') === 'true';
    } catch {
      return false;
    }
  });

  const handleTutupMulaiCepat = () => {
    setMulaiCepatDitutup(true);
    try {
      localStorage.setItem('niche_scout_mulai_cepat_dilihat', 'true');
    } catch {
      // safe fallback
    }
  };

  useEffect(() => {
    const handleResetMulaiCepat = () => {
      try {
        const isDismissed = localStorage.getItem('niche_scout_mulai_cepat_dilihat') === 'true';
        setMulaiCepatDitutup(isDismissed);
      } catch {
        setMulaiCepatDitutup(false);
      }
    };

    window.addEventListener('storage', handleResetMulaiCepat);
    window.addEventListener('niche_scout_reset_mulai_cepat', handleResetMulaiCepat);
    return () => {
      window.removeEventListener('storage', handleResetMulaiCepat);
      window.removeEventListener('niche_scout_reset_mulai_cepat', handleResetMulaiCepat);
    };
  }, []);

  // Tangani pembukaan ulang dari Riwayat tanpa API call
  useEffect(() => {
    if (reopenedData) {
      const tipe = reopenedData.record.parameter.tipe_aset;
      if (tipe === 'foto_ai' || tipe === 'ilustrasi_ai' || tipe === 'foto_nyata') {
        setTipeAset(tipe);
      }
      setTema(reopenedData.record.parameter.tema || '');
      setMomenId(reopenedData.record.parameter.momen_id || '');
      setJumlahKandidat(reopenedData.record.parameter.jumlah_kandidat || 10);
      setHasilKandidat(reopenedData.kandidat);
      setHasilPencarianRecord(reopenedData.record);
      setInfoCache('Dibuka ulang dari riwayat (0 panggilan API)');
      setErrorPesan(null);
    }
  }, [reopenedData]);

  // Sinkronisasi status kandidat dari store ke hasilKandidat aktif
  useEffect(() => {
    if (hasilKandidat.length === 0) return;
    setHasilKandidat((prevList) =>
      prevList.map((hk) => {
        const found = store.kandidat.find((k) => k.id === hk.id);
        if (found) {
          return {
            ...hk,
            status: found.status,
            catatan: found.catatan,
            tag: found.tag,
          };
        }
        return hk;
      })
    );
  }, [store.kandidat]);

  // Hitungan harian
  const batasHarian = store.pengaturan.batas_harian || 50;
  const panggilanHariIni = getDailyCallCount();
  const hampirBatas = isNearDailyLimit(panggilanHariIni, batasHarian);
  const lewatBatas = isOverDailyLimit(panggilanHariIni, batasHarian);

  // Jumlah kandidat berstatus dibuang
  const jumlahDibuang = hasilKandidat.filter((k) => k.status === 'dibuang').length;

  // Filter Hasil Aktif
  const filteredKandidat = hasilKandidat.filter((k) => {
    // Sembunyikan yang dibuang kecuali toggle aktif
    if (!tampilkanDibuang && k.status === 'dibuang') return false;
    if (sembunyikanTanpaSumber && k.jumlah_domain === 0) return false;
    if (sembunyikanMirip && k.mirip_dengan !== null) return false;
    if (hanyaBuktiSedangKeAtas && (k.bukti === 'tidak_ada' || k.bukti === 'lemah')) return false;
    return true;
  });

  const handleBatalPencarian = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSedangMencari(false);
    setPesanProgres('');
    setErrorPesan('Pencarian dibatalkan oleh pengguna.');
  };

  const eksekusiPanggilanServer = async (kunciCache: string) => {
    // 5. Penanganan offline (Tahap 6)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorPesan('Pencarian membutuhkan koneksi internet untuk memeriksa sumber.');
      setSedangMencari(false);
      setPesanProgres('');
      return;
    }

    setSedangMencari(true);
    setErrorPesan(null);
    setInfoCache(null);
    setPesanProgres('Langkah 1: Menghubungi Gemini dengan Google Search Grounding...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let customApiKey = '';
      try {
        customApiKey = localStorage.getItem('niche_scout_gemini_api_key') || '';
      } catch {
        customApiKey = '';
      }

      const selectedMomen = store.momen.find((m) => m.id === momenId);
      const jendela = selectedMomen ? hitungJendelaMomen(selectedMomen) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customApiKey.trim()) {
        headers['X-Gemini-Api-Key'] = customApiKey.trim();
      }

      const response = await fetch('/api/niche', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipe_aset: tipeAset,
          tema: tema.trim(),
          momen_id: momenId || null,
          momen_tahun: jendela?.target_tahun || null,
          nama_momen: selectedMomen?.nama || null,
          tanggal_puncak_target: jendela?.tanggal_puncak_target || null,
          status_jendela: jendela?.status || null,
          hari_tersisa: jendela?.hari_tersisa || null,
          rentang_jendela: jendela?.rentang_label || null,
          jumlah_kandidat: jumlahKandidat,
        }),
        signal: controller.signal,
      });

      setPesanProgres('Langkah 2: Memetakan sumber byte UTF-8 dan menstrukturkan JSON...');

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.pesan_galat || 'Gagal memproses pencarian niche di server.');
      }

      // Catat penambahan panggilan harian hanya bila sukses memanggil server
      incrementDailyCallCount();

      // Kualitas Bukti & Kunci Permintaan Murni Kode
      const rawList: KandidatNiche[] = data.kandidat || [];
      const auditedList = rawList.map((k) => {
        const evidence = calculateEvidenceQuality(
          k.sumber,
          k.cakupan_dukungan,
          k.saran_permintaan_1_5,
          store.pengaturan
        );
        const brandCheck = checkBrandRisk(
          k.kata_kunci_en,
          k.varian_id,
          k.risiko_merek,
          store.pengaturan.kata_peringatan_merek || []
        );

        return {
          ...k,
          sumber: evidence.normalizedSources,
          jumlah_domain: evidence.jumlah_domain,
          alasan_bukti: evidence.alasan_bukti,
          bukti: evidence.bukti,
          dukungan: evidence.dukungan,
          saran_permintaan_1_5: evidence.saran_permintaan_1_5,
          risiko_merek: brandCheck,
          status: 'baru' as const,
          catatan: '',
          tag: [],
        };
      });

      // Terapkan Deduplikasi
      const finalKandidat = applyDeduplication(auditedList, store.kandidat);

      const newRecord: PencarianRecord = {
        id: `search-${Date.now()}`,
        waktu: new Date().toISOString(),
        parameter: {
          tipe_aset: tipeAset,
          tema: tema.trim(),
          momen_id: momenId || null,
          momen_tahun: jendela?.target_tahun || null,
          nama_momen: selectedMomen?.nama || null,
          tanggal_puncak_target: jendela?.tanggal_puncak_target || null,
          status_jendela: jendela?.status || null,
          hari_tersisa: jendela?.hari_tersisa || null,
          rentang_jendela: jendela?.rentang_label || null,
          jumlah_kandidat: jumlahKandidat,
        },
        kunci_cache: kunciCache,
        web_search_queries: data.web_search_queries || [],
        search_entry_point_html: data.search_entry_point_html || null,
        status: data.status || 'tergrounded',
        pesan_galat: data.pesan_galat || null,
        kandidat_ids: finalKandidat.map((k: KandidatNiche) => k.id),
      };

      setHasilKandidat(finalKandidat);
      setHasilPencarianRecord(newRecord);
      onSimpanHasilPencarian(newRecord, finalKandidat);
      if (onClearReopenedData) onClearReopenedData();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setErrorPesan(err?.message || 'Terjadi gangguan jaringan atau server.');
    } finally {
      setSedangMencari(false);
      setPesanProgres('');
      abortControllerRef.current = null;
    }
  };

  const handleMulaiPencarian = (abaikanCache: boolean = false) => {
    const cleanTema = tema.trim().slice(0, 80);
    const kunciCache = generateCacheKey(tipeAset, cleanTema, momenId || null, jumlahKandidat);

    // Cek Cache 24 Jam
    if (!abaikanCache) {
      const cached = findValidCache(store.pencarian, store.kandidat, kunciCache);
      if (cached) {
        const auditedCache = cached.kandidat.map((k) => {
          const evidence = calculateEvidenceQuality(
            k.sumber,
            k.cakupan_dukungan,
            k.saran_permintaan_1_5,
            store.pengaturan
          );
          const brandCheck = checkBrandRisk(
            k.kata_kunci_en,
            k.varian_id,
            k.risiko_merek,
            store.pengaturan.kata_peringatan_merek || []
          );
          return {
            ...k,
            sumber: evidence.normalizedSources,
            jumlah_domain: evidence.jumlah_domain,
            alasan_bukti: evidence.alasan_bukti,
            bukti: evidence.bukti,
            dukungan: evidence.dukungan,
            saran_permintaan_1_5: evidence.saran_permintaan_1_5,
            risiko_merek: brandCheck,
          };
        });
        const finalCached = applyDeduplication(auditedCache, store.kandidat);

        setHasilKandidat(finalCached);
        setHasilPencarianRecord(cached.record);
        setInfoCache(`Dari cache (${cached.waktuFormatted})`);
        setErrorPesan(null);
        if (onClearReopenedData) onClearReopenedData();
        return;
      }
    }

    // Cek Batas Harian
    if (lewatBatas) {
      setModalBatasBuka(true);
      return;
    }

    eksekusiPanggilanServer(kunciCache);
  };

  const handleKonfirmasiLewatiBatas = () => {
    setModalBatasBuka(false);
    const cleanTema = tema.trim().slice(0, 80);
    const kunciCache = generateCacheKey(tipeAset, cleanTema, momenId || null, jumlahKandidat);
    eksekusiPanggilanServer(kunciCache);
  };

  const handleEksporPencarianIni = () => {
    if (!hasilKandidat.length) return;
    const safeTema = (tema.trim() || 'tren-umum').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    unduhCsv(hasilKandidat, `pencarian-${safeTema}`, tipeAset);
  };

  return (
    <div className="space-y-4">
      {/* 0. KARTU MULAI CEPAT ONBOARDING (Tahap 7) */}
      {!mulaiCepatDitutup && (
        <MulaiCepatCard
          onTutup={handleTutupMulaiCepat}
          onBukaPanduan={(sec) => onBukaPanduan?.(sec)}
        />
      )}

      {/* Grid 2 kolom di Desktop (>=1024px): Panel parameter kiri sticky, Hasil di kanan */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        {/* Kolom Kiri: Form Parameter Pencarian */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        {/* Header Form & Penghitung Panggilan Harian */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Riset Niche Microstock</span>
            </h2>
            <p className="text-[11px] text-slate-400">Pencarian dua langkah dengan grounding Google Search</p>
          </div>

          {/* Indikator Kuota Harian & Tombol Bantuan (?) */}
          <div className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${
                lewatBatas
                  ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                  : hampirBatas
                    ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-emerald-400'
              }`}
            >
              <span>Panggilan:</span>
              <span>
                {panggilanHariIni} / {batasHarian}
              </span>
            </div>

            {onBukaPanduan && (
              <button
                type="button"
                onClick={() => onBukaPanduan('kuota-dan-cache')}
                className="btn-min-touch w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px] font-bold border border-slate-700 transition-colors shrink-0"
                title="Pelajari Kuota Panggilan & Cache di Panduan"
              >
                ?
              </button>
            )}
          </div>
        </div>

        {/* Peringatan Mendekati Batas */}
        {hampirBatas && !lewatBatas && (
          <div className="p-2.5 bg-amber-950/50 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Peringatan: Anda mendekati batas harian ({panggilanHariIni}/{batasHarian}).</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleMulaiPencarian(false);
          }}
          className="space-y-3.5"
        >
          {/* Tipe Aset (Wajib) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Tipe Aset (Wajib)
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTipeAset('foto_nyata')}
                className={`btn-min-touch flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                  tipeAset === 'foto_nyata'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="leading-tight">Foto Nyata</span>
              </button>

              <button
                type="button"
                onClick={() => setTipeAset('foto_ai')}
                className={`btn-min-touch flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                  tipeAset === 'foto_ai'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="leading-tight">Foto AI</span>
              </button>

              <button
                type="button"
                onClick={() => setTipeAset('ilustrasi_ai')}
                className={`btn-min-touch flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                  tipeAset === 'ilustrasi_ai'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span className="leading-tight">Ilustrasi AI</span>
              </button>
            </div>
          </div>

          {/* Tema / Subjek (Opsional, max 80 karakter) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="inputTema" className="block text-xs font-semibold text-slate-300">
                Tema atau Subjek (Opsional)
              </label>
              <span className={`text-[10px] font-mono ${tema.length > 70 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                {tema.length} / 80
              </span>
            </div>
            <input
              id="inputTema"
              type="text"
              maxLength={80}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Contoh: Pekerja logistik wanita, energi surya atap, lansia cerdas"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Momen Musiman */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="selectMomen" className="block text-xs font-semibold text-slate-300">
                Momen Musiman (Opsional)
              </label>
              {momenId && (
                <button
                  type="button"
                  onClick={() => setMomenId('')}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  Reset Pilihan
                </button>
              )}
            </div>
            <div className="relative">
              <select
                id="selectMomen"
                value={momenId}
                onChange={(e) => setMomenId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                <option value="">Tanpa momen khusus</option>
                {store.momen
                  .filter((m) => m.aktif)
                  .map((m) => {
                    const j = hitungJendelaMomen(m);
                    let infoStatus = '';
                    if (j.status === 'Tanggal belum diisi') {
                      infoStatus = 'Tanggal belum diisi';
                    } else if (j.hari_tersisa !== null) {
                      infoStatus = `${j.status} - ${j.hari_tersisa === 0 ? 'Hari ini' : `${j.hari_tersisa} hari`}`;
                    } else {
                      infoStatus = j.status;
                    }
                    return (
                      <option key={m.id} value={m.id}>
                        {m.nama} ({infoStatus})
                      </option>
                    );
                  })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>

            {/* Banner Khusus Status Momen Terpilih */}
            {(() => {
              const selectedM = store.momen.find((m) => m.id === momenId);
              if (!selectedM) return null;
              const j = hitungJendelaMomen(selectedM);

              if (j.status === 'Jendela sudah lewat (target musim berikutnya)') {
                return (
                  <div className="p-2.5 bg-purple-950/60 border border-purple-800/80 rounded-xl text-xs text-purple-200 flex items-start gap-2 shadow-sm animate-fadeIn">
                    <RotateCcw className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-bold">Jendela unggah musim ini sudah lewat.</span> Hasil ditujukan untuk musim berikutnya ({j.tanggal_puncak_target}). Jendela unggah ideal: {j.rentang_label || 'H-120 s/d H-60'}.
                    </div>
                  </div>
                );
              }

              if (j.status === 'Tanggal belum diisi') {
                return (
                  <div className="p-2.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2 shadow-sm animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      Momen ini belum memiliki tanggal puncak. Buka tab <span className="font-semibold text-rose-200">Kalender</span> untuk melengkapi dan memverifikasi tanggal agar perhitungan optimal.
                    </div>
                  </div>
                );
              }

              if (j.status === 'Sedang di jendela') {
                return (
                  <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-start gap-2 shadow-sm animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-bold">Sedang di jendela unggah ideal!</span> Waktu terbaik submit aset microstock ({j.hari_tersisa} hari menuju puncak {j.tanggal_puncak_target}).
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>

          {/* Slider Jumlah Kandidat */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Jumlah Kandidat:
              </label>
              <span className="font-mono text-sm font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {jumlahKandidat} ide
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="1"
              value={jumlahKandidat}
              onChange={(e) => setJumlahKandidat(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>3</span>
              <span className="text-emerald-400">10 (Default)</span>
              <span>15</span>
            </div>
          </div>

          {/* Tombol Aksi: Cari & Batal */}
          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={sedangMencari}
              className="btn-min-touch flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {sedangMencari ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{pesanProgres || 'Sedang Meriset...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Cari Ide Niche</span>
                </>
              )}
            </button>

            {sedangMencari && (
              <button
                type="button"
                onClick={handleBatalPencarian}
                className="btn-min-touch px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </section>
    </div>

    {/* Kolom Kanan: Hasil Pencarian & Error */}
    <div className="space-y-4 min-w-0">
      {/* 2. ERROR BANNER */}
      {errorPesan && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 shadow-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p className="font-bold">Pencarian Gagal</p>
            <p className="text-rose-300 text-[11px] leading-relaxed">{errorPesan}</p>
            {(errorPesan.includes('429') ||
              errorPesan.toLowerCase().includes('kuota') ||
              errorPesan.toLowerCase().includes('kunci') ||
              errorPesan.toLowerCase().includes('api key')) &&
              onBukaPengaturan && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onBukaPengaturan}
                    className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Buka Pengaturan untuk Input API Key</span>
                  </button>
                </div>
              )}
          </div>
          <button
            onClick={() => setErrorPesan(null)}
            className="text-rose-400 hover:text-white text-xs font-bold px-1.5 py-0.5"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. HASIL PENCARIAN */}
      {hasilKandidat.length > 0 ? (
        <section className="space-y-3.5 pt-1">
          {/* Header Hasil, Indikator Cache, & Tombol Ekspor CSV */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Ditemukan {hasilKandidat.length} Kandidat Niche</span>
                </h3>
                {infoCache && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{infoCache}</span>
                  </span>
                )}
              </div>

              {/* Aksi Baris Atas: Ekspor CSV & Cari Ulang */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleEksporPencarianIni}
                  className="btn-min-touch inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 active:scale-95 transition-all"
                  title="Ekspor pencarian ini ke CSV UTF-8 dengan BOM"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>

                {infoCache && (
                  <button
                    type="button"
                    onClick={() => setModalAbaikanCacheBuka(true)}
                    className="btn-min-touch inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                    <span>Cari Ulang</span>
                  </button>
                )}
              </div>
            </div>

            {/* Banner Peringatan Tidak Tergrounded jika ada */}
            {hasilPencarianRecord?.status === 'tidak_tergrounded' && (
              <div className="p-2.5 bg-amber-950/70 border border-amber-800 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Peringatan Grounding:</strong> Pencarian web tidak digunakan; ide ini belum bersumber.
                </p>
              </div>
            )}

            {/* Banner Musim Berikutnya jika jendela unggah sudah lewat */}
            {hasilPencarianRecord?.parameter.status_jendela === 'Jendela sudah lewat (target musim berikutnya)' && (
              <div className="p-2.5 bg-purple-950/70 border border-purple-800 rounded-xl text-xs text-purple-200 flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Jendela unggah musim ini sudah lewat. Hasil ditujukan untuk musim berikutnya.</strong>
                  <div className="text-purple-300 mt-0.5">
                    Target Puncak: {hasilPencarianRecord.parameter.tanggal_puncak_target || '-'} {hasilPencarianRecord.parameter.rentang_jendela ? `(Jendela Ideal: ${hasilPencarianRecord.parameter.rentang_jendela})` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Accordion "Kueri yang Dipakai" */}
            {hasilPencarianRecord?.web_search_queries && hasilPencarianRecord.web_search_queries.length > 0 && (
              <div className="pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBukaKueri(!bukaKueri)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 font-semibold py-1"
                >
                  <span>Kueri yang dipakai ({hasilPencarianRecord.web_search_queries.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bukaKueri ? 'rotate-180' : ''}`} />
                </button>
                {bukaKueri && (
                  <div className="mt-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                    {hasilPencarianRecord.web_search_queries.map((q, i) => (
                      <div key={i} className="text-[11px] font-mono text-slate-300">
                        • {q}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Hasil Pencarian */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Filter Hasil Tampilan:</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Menampilkan {filteredKandidat.length} dari {hasilKandidat.length} ide
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setSembunyikanTanpaSumber(!sembunyikanTanpaSumber)}
                className={`btn-min-touch px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                  sembunyikanTanpaSumber
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {sembunyikanTanpaSumber ? '✓ ' : ''}Sembunyikan Tanpa Sumber
              </button>

              <button
                type="button"
                onClick={() => setSembunyikanMirip(!sembunyikanMirip)}
                className={`btn-min-touch px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                  sembunyikanMirip
                    ? 'bg-purple-950 text-purple-300 border-purple-600 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {sembunyikanMirip ? '✓ ' : ''}Sembunyikan Mirip
              </button>

              <button
                type="button"
                onClick={() => setHanyaBuktiSedangKeAtas(!hanyaBuktiSedangKeAtas)}
                className={`btn-min-touch px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                  hanyaBuktiSedangKeAtas
                    ? 'bg-teal-950 text-teal-300 border-teal-600 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {hanyaBuktiSedangKeAtas ? '✓ ' : ''}Hanya Bukti Sedang & Kuat
              </button>

              {/* Toggle Tampilkan Kandidat Dibuang */}
              {jumlahDibuang > 0 && (
                <button
                  type="button"
                  onClick={() => setTampilkanDibuang(!tampilkanDibuang)}
                  className={`btn-min-touch px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                    tampilkanDibuang
                      ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-rose-300'
                  }`}
                >
                  {tampilkanDibuang ? '✓ Sembunyikan' : `Tampilkan ${jumlahDibuang} dibuang`}
                </button>
              )}
            </div>
          </div>

          {/* Daftar Kartu Kandidat yang Difilter: Grid 2-3 Kolom Responsif */}
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
            {filteredKandidat.length === 0 ? (
              <div className="col-span-full p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
                <p className="text-xs text-slate-400">
                  Tidak ada kandidat yang cocok dengan kriteria filter aktif saat ini.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSembunyikanTanpaSumber(false);
                    setSembunyikanMirip(false);
                    setHanyaBuktiSedangKeAtas(false);
                    setTampilkanDibuang(false);
                  }}
                  className="btn-min-touch px-3 py-1.5 bg-slate-800 text-teal-400 font-bold text-xs rounded-xl"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              filteredKandidat.map((kandidat) => {
                const liveKandidat = store.kandidat.find((k) => k.id === kandidat.id) || kandidat;
                const isShortlisted = liveKandidat.status === 'dipantau';

                return (
                  <KandidatCard
                    key={liveKandidat.id}
                    kandidat={liveKandidat}
                    isShortlisted={isShortlisted}
                    onUpdateStatus={onUpdateStatus}
                    onUpdateCatatan={onUpdateCatatan}
                    onUpdateTag={onUpdateTag}
                    onBukaPanduan={onBukaPanduan}
                  />
                );
              })
            )}
          </div>

          {/* searchEntryPoint.renderedContent dalam iframe sandbox */}
          {hasilPencarianRecord?.search_entry_point_html && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Google Search Entry Point:
              </span>
              <iframe
                title="Google Search Grounding Entry Point"
                srcDoc={hasilPencarianRecord.search_entry_point_html}
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                className="w-full h-14 bg-transparent border-0 rounded-lg overflow-hidden"
              />
            </div>
          )}
        </section>
      ) : (
        <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 min-h-[380px]">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-300">Siap Meriset Niche Microstock</h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Pilih tipe aset, tentukan tema atau momen musiman di panel kiri, lalu tekan <strong>"Cari Ide Niche"</strong> untuk memulai pencarian berbasis grounding Google Search.
            </p>
          </div>
        </div>
      )}
    </div>
  </div>

      {/* MODAL BLOKIR LUNAK: LEBIH BATAS HARIAN */}
      {modalBatasBuka && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-[560px] bg-slate-900 border border-amber-800/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="font-bold text-sm">Melewati Batas Harian</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Anda telah melakukan {panggilanHariIni} panggilan dari kuota default {batasHarian} hari ini.
              Apakah Anda ingin tetap melanjutkan pencarian?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleKonfirmasiLewatiBatas}
                className="btn-min-touch flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl"
              >
                Tetap Lanjutkan
              </button>
              <button
                type="button"
                onClick={() => setModalBatasBuka(false)}
                className="btn-min-touch px-4 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI: CARI ULANG (ABAIKAN CACHE) */}
      {modalAbaikanCacheBuka && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-white">
              <RotateCcw className="w-5 h-5 text-teal-400 shrink-0" />
              <h3 className="font-bold text-sm">Cari Ulang (Abaikan Cache)?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pencarian ulang akan menghubungi server kembali dan menggunakan 1 kuota panggilan Gemini API hari ini.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setModalAbaikanCacheBuka(false);
                  handleMulaiPencarian(true);
                }}
                className="btn-min-touch flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
              >
                Ya, Cari Ulang
              </button>
              <button
                type="button"
                onClick={() => setModalAbaikanCacheBuka(false)}
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
