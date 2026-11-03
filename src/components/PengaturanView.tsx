/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Sliders,
  Download,
  Upload,
  Trash2,
  FlaskConical,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  ShieldCheck,
  Check,
  Play,
  Info,
  Lock,
  Smartphone,
  KeyRound,
  BookOpen,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { AppDataStore, HasilUjiSistem, RingkasanImpor } from '../types.ts';
import {
  eksporDataSebagaiJson,
  hapusSemuaDataDenganBackup,
  imporJson,
  validasiDanRingkasJson,
} from '../storage.ts';
import { jalankanTesSistemTahap1 } from '../lib/testSistemTahap1.ts';
import { getStorageUsageReport, pruneOldestSearches, StorageUsageReport } from '../lib/storageQuota.ts';

interface PengaturanViewProps {
  store: AppDataStore;
  onUpdateStore: (newStore: AppDataStore) => void;
  onScaleChange: (newScale: number | 'otomatis') => void;
  onBukaPanduan?: (sectionId?: string) => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  store,
  onUpdateStore,
  onScaleChange,
  onBukaPanduan,
}) => {
  const skala = store.pengaturan.skala;

  // State untuk modal impor
  const [bukaModalImpor, setBukaModalImpor] = useState(false);
  const [teksJsonImpor, setTeksJsonImpor] = useState('');
  const [namaFileImpor, setNamaFileImpor] = useState<string | null>(null);
  const [hasilValidasi, setHasilValidasi] = useState<{
    valid: boolean;
    pesanError?: string;
    ringkasan?: RingkasanImpor;
    parsedData?: any;
  } | null>(null);
  const [pesanSuksesImpor, setPesanSuksesImpor] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State untuk Batas Penyimpanan (Tahap 4)
  const [laporanStorage, setLaporanStorage] = useState<StorageUsageReport>(() => getStorageUsageReport());
  const [pesanStorageBersih, setPesanStorageBersih] = useState<string | null>(null);
  const [modalPruneBuka, setModalPruneBuka] = useState(false);

  // State untuk konfirmasi hapus data (dua tingkat)
  const [tahapHapus, setTahapHapus] = useState<0 | 1 | 2>(0);
  const [teksKonfirmasiHapus, setTeksKonfirmasiHapus] = useState('');
  const [pesanStatusHapus, setPesanStatusHapus] = useState<string | null>(null);

  // State untuk Tes Sistem
  const [hasilTes, setHasilTes] = useState<HasilUjiSistem[]>([]);
  const [sedangUji, setSedangUji] = useState(false);

  // State Kunci API Gemini Manual (Pengaturan API Key Pengguna)
  const [apiKeyTersimpan, setApiKeyTersimpan] = useState<string>(() => {
    try {
      return localStorage.getItem('niche_scout_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [inputApiKey, setInputApiKey] = useState('');
  const [lihatApiKey, setLihatApiKey] = useState(false);
  const [statusUjiApiKey, setStatusUjiApiKey] = useState<{
    sedangMenguji: boolean;
    pesan: string | null;
    sukses?: boolean;
  }>({ sedangMenguji: false, pesan: null });

  // State PWA Install (Tahap 6)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [bukaPanduanIOS, setBukaPanduanIOS] = useState(false);
  const [pwaInstallSukses, setPwaInstallSukses] = useState(false);

  React.useEffect(() => {
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setPwaInstallSukses(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleSimpanApiKey = async () => {
    const clean = inputApiKey.trim();
    if (!clean) return;
    try {
      localStorage.setItem('niche_scout_gemini_api_key', clean);
      setApiKeyTersimpan(clean);
      setInputApiKey('');
      setStatusUjiApiKey({
        sedangMenguji: true,
        pesan: 'Kunci API disimpan! Sedang memverifikasi status kuota ke Google...',
      });
      // Verifikasi kunci secara instan ke backend
      await handleUjiKoneksiApiKey(clean);
    } catch {
      setStatusUjiApiKey({
        sedangMenguji: false,
        pesan: 'Gagal menyimpan ke penyimpanan lokal browser.',
        sukses: false,
      });
    }
  };

  const handleHapusApiKey = () => {
    try {
      localStorage.removeItem('niche_scout_gemini_api_key');
      setApiKeyTersimpan('');
      setInputApiKey('');
      setStatusUjiApiKey({
        sedangMenguji: false,
        pesan: 'Kunci API kustom dihapus. Aplikasi kembali menggunakan kunci default server.',
        sukses: true,
      });
      setTimeout(() => setStatusUjiApiKey({ sedangMenguji: false, pesan: null }), 4500);
    } catch {
      setStatusUjiApiKey({ sedangMenguji: false, pesan: 'Gagal menghapus kunci API.', sukses: false });
    }
  };

  const handleUjiKoneksiApiKey = async (kunciUntukDiuji?: string) => {
    const key = (kunciUntukDiuji ?? (inputApiKey.trim() || apiKeyTersimpan)).trim();
    setStatusUjiApiKey({ sedangMenguji: true, pesan: 'Memeriksa status kunci API ke Google...' });
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setStatusUjiApiKey({
          sedangMenguji: false,
          pesan: data.message || 'Koneksi berhasil! Kunci API Gemini aktif dan siap digunakan.',
          sukses: true,
        });
      } else {
        setStatusUjiApiKey({
          sedangMenguji: false,
          pesan: data.message || 'Kunci API tidak dapat digunakan.',
          sukses: false,
        });
      }
    } catch (err: any) {
      // Penanganan khusus untuk kendala jaringan di browser Safari mobile
      setStatusUjiApiKey({
        sedangMenguji: false,
        pesan: 'Verifikasi instan terhambat sinyal/jaringan. Kunci Anda sudah tersimpan di browser dan dapat langsung dicoba di tab Cari.',
        sukses: true,
      });
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setPwaInstallSukses(true);
    }
  };

  // Handlers Batas Penyimpanan (Tahap 4)
  const handleEksekusiPrune = () => {
    const hasil = pruneOldestSearches(store, 25);
    onUpdateStore(hasil.storeBaru);
    setLaporanStorage(getStorageUsageReport());
    setPesanStorageBersih(
      `Berhasil membersihkan ${hasil.pencarianDihapusCount} riwayat tertua dan ${hasil.kandidatDihapusCount} kandidat (Shortlist tetap utuh).`
    );
    setModalPruneBuka(false);
    setTimeout(() => setPesanStorageBersih(null), 4000);
  };

  // Handlers Skala
  const handleSliderSkala = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onScaleChange(val);
  };

  const handleTombolCepatSkala = (val: number) => {
    onScaleChange(val);
  };

  // Handlers Ekspor Backup
  const handleBackup = () => {
    eksporDataSebagaiJson(store);
  };

  // Handlers Baca Berkas Impor
  const handlePilihBerkas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNamaFileImpor(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTeksJsonImpor(content);
      const validasi = validasiDanRingkasJson(content, store);
      setHasilValidasi(validasi);
    };
    reader.readAsText(file);
  };

  const handleTeksJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setTeksJsonImpor(content);
    setNamaFileImpor(null);
    if (content.trim()) {
      const validasi = validasiDanRingkasJson(content, store);
      setHasilValidasi(validasi);
    } else {
      setHasilValidasi(null);
    }
  };

  const handleEksekusiImpor = (mode: 'gabung' | 'timpa') => {
    const res = imporJson(teksJsonImpor, mode, store);
    if (res.success && res.storeBaru) {
      onUpdateStore(res.storeBaru);
      setPesanSuksesImpor(res.pesan);
      setTimeout(() => {
        setBukaModalImpor(false);
        setTeksJsonImpor('');
        setHasilValidasi(null);
        setPesanSuksesImpor(null);
      }, 1500);
    } else {
      setHasilValidasi({
        valid: false,
        pesanError: res.pesan,
      });
    }
  };

  // Handlers Hapus Semua Data (Dua Konfirmasi + Auto Backup)
  const handleMulaiHapus = () => {
    setTahapHapus(1);
    setTeksKonfirmasiHapus('');
    setPesanStatusHapus(null);
  };

  const handleLanjutTahap2 = () => {
    setTahapHapus(2);
  };

  const handleEksekusiHapusFinal = () => {
    const fresh = hapusSemuaDataDenganBackup(store);
    onUpdateStore(fresh);
    setTahapHapus(0);
    setTeksKonfirmasiHapus('');
    setPesanStatusHapus('Semua data berhasil dibersihkan! Cadangan otomatis telah diunduh ke perangkat Anda.');
    setTimeout(() => setPesanStatusHapus(null), 4000);
  };

  // Handlers Tes Sistem
  const handleJalankanTes = () => {
    setSedangUji(true);
    setTimeout(() => {
      const tes = jalankanTesSistemTahap1();
      setHasilTes(tes);
      setSedangUji(false);
    }, 250);
  };

  const tesLulusCount = hasilTes.filter((t) => t.status === 'lulus').length;
  const tesGagalCount = hasilTes.filter((t) => t.status === 'gagal').length;

  return (
    <div className="space-y-4">
      {/* 0. PANDUAN APLIKASI (Tahap 7) */}
      {onBukaPanduan && (
        <section className="bg-gradient-to-r from-slate-900 to-emerald-950/50 border border-emerald-800/60 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-white leading-tight">Panduan Aplikasi & Audit</h2>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/80">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">10 bab panduan alur, rumus audit kode, dan FAQ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onBukaPanduan()}
            className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 shrink-0 transition-all active:scale-95"
          >
            <span>Buka</span>
            <span>→</span>
          </button>
        </section>
      )}

      {/* Kartu Status Hapus Sukses jika ada */}
      {pesanStatusHapus && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{pesanStatusHapus}</span>
        </div>
      )}

      {/* Tata Letak 2 Kolom di Desktop (>=1024px) */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        {/* Kolom Kiri: Tampilan, Kuota, Penyimpanan, PWA */}
        <div className="space-y-4">
          {/* 1. BAGIAN SKALA TAMPILAN (Aturan 7 & Tahap 1) */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Skala Tampilan (Aturan 7)</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  store.pengaturan.skala_manual
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {store.pengaturan.skala_manual ? 'Manual' : 'Otomatis'}
                </span>
                <span className="font-mono text-sm font-bold text-emerald-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                  {Math.round(skala * 100)}% ({skala.toFixed(2)})
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Mengatur ukuran dasar <code className="text-emerald-400 font-mono">rem</code> melalui variabel CSS{' '}
              <code className="text-emerald-400 font-mono">--skala</code>. Tidak memakai zoom atau perbesaran viewport.
            </p>

            {/* Pilihan Mode Skala: Otomatis vs Manual */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Mode Responsif:</span>
                <button
                  type="button"
                  onClick={() => onScaleChange('otomatis')}
                  className={`btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    !store.pengaturan.skala_manual
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {!store.pengaturan.skala_manual && <Check className="w-3.5 h-3.5" />}
                  <span>Otomatis (Default)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {!store.pengaturan.skala_manual
                  ? 'Mode otomatis aktif: Menggunakan 100% pada desktop (≥1024px) dan 85% pada tablet/ponsel untuk kenyamanan membaca optimal.'
                  : 'Mode manual aktif: Pilihan skala Anda akan dipertahankan di semua ukuran layar.'}
              </p>
            </div>

            {/* Slider Manual 60% sampai 100% langkah 5% */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                <span>Atur Manual:</span>
                <span className="font-mono text-emerald-400">{Math.round(skala * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.60"
                max="1.00"
                step="0.05"
                value={skala}
                onChange={handleSliderSkala}
                className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>60%</span>
                <span>70%</span>
                <span className="text-teal-400 font-semibold">85% (HP)</span>
                <span>90%</span>
                <span className="text-emerald-400 font-semibold">100% (PC)</span>
              </div>
            </div>

            {/* Tombol Cepat: 70%, 80%, 90%, 100% */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[0.7, 0.8, 0.9, 1.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleTombolCepatSkala(val)}
                  className={`btn-min-touch flex items-center justify-center rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                    store.pengaturan.skala_manual && Math.abs(skala - val) < 0.01
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {store.pengaturan.skala_manual && Math.abs(skala - val) < 0.01 && <Check className="w-3 h-3 text-emerald-400 mr-1" />}
                  <span>{Math.round(val * 100)}%</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onScaleChange('otomatis')}
              className="btn-min-touch w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan ke Skala Otomatis (Default)</span>
            </button>
          </section>

      {/* 1.5 BAGIAN BATAS PANGGILAN HARIAN & KODE AKSES SERVER (Tahap 2 & Tahap 6) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Batas Panggilan Harian</h2>
            <p className="text-xs text-slate-400">Pengingat kuota pencarian lokal per tanggal (default: 50)</p>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
            {store.pengaturan.batas_harian || 50} / hari
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="5"
            max="200"
            step="5"
            value={store.pengaturan.batas_harian || 50}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 5) {
                onUpdateStore({
                  ...store,
                  pengaturan: {
                    ...store.pengaturan,
                    batas_harian: val,
                  },
                });
              }
            }}
            className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
            style={{ fontSize: '16px' }}
          />
          <span className="text-xs text-slate-400">panggilan per hari</span>
        </div>

        {/* Catatan Pengaman Kuota & Kunci API */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Bebas Kode Akses:</strong> Kode akses server telah dinonaktifkan. Anda dapat langsung mencari ide niche atau memasukkan kunci API Gemini pribadi Anda sendiri di bawah ini jika kuota server habis.
          </p>
        </div>

        {/* Sub-bagian Kunci API Gemini Manual (Input Manual) */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Kunci API Gemini (Manual / Pribadi)</h3>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                apiKeyTersimpan
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {apiKeyTersimpan ? 'Kunci Kustom Aktif' : 'Kunci Server Default'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Kunci API disimpan secara lokal di browser Anda (<code className="text-emerald-400">localStorage</code>) dan diteruskan ke server proxy backend saat melakukan pencarian. Anda dapat menggunakan kunci pribadi dari Google AI Studio untuk menghindari batas kuota publik.
          </p>

          {/* Notifikasi Status Tes / Simpan */}
          {statusUjiApiKey.pesan && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                statusUjiApiKey.sukses === true
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : statusUjiApiKey.sukses === false
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
              }`}
            >
              {statusUjiApiKey.sedangMenguji ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              ) : statusUjiApiKey.sukses === true ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="leading-snug">{statusUjiApiKey.pesan}</span>
            </div>
          )}

          {/* Kartu Status Kunci Tersimpan */}
          {apiKeyTersimpan ? (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Kunci Aktif Saat Ini:</span>
                <span className="font-mono text-emerald-400 font-bold text-[11px]">
                  {apiKeyTersimpan.slice(0, 8)}••••••••{apiKeyTersimpan.slice(-6)}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUjiKoneksiApiKey(apiKeyTersimpan)}
                  disabled={statusUjiApiKey.sedangMenguji}
                  className="btn-min-touch flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Uji Kunci Aktif</span>
                </button>
                <button
                  type="button"
                  onClick={handleHapusApiKey}
                  className="btn-min-touch flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Kunci</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Menggunakan kunci API dari environment server.</span>
              <button
                type="button"
                onClick={() => handleUjiKoneksiApiKey()}
                disabled={statusUjiApiKey.sedangMenguji}
                className="btn-min-touch px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold"
              >
                Uji Kunci Server
              </button>
            </div>
          )}

          {/* Form Input Kunci Baru */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <label className="block text-[11px] font-semibold text-slate-200">
              {apiKeyTersimpan ? 'Ganti dengan Kunci Baru:' : 'Masukkan Kunci API Gemini Baru:'}
            </label>
            <div className="relative">
              <input
                type={lihatApiKey ? 'text' : 'password'}
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                placeholder="Tempel API Key (AIzaSy... / AQ.Ab8...)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={() => setLihatApiKey(!lihatApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                aria-label={lihatApiKey ? 'Sembunyikan' : 'Lihat'}
              >
                {lihatApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSimpanApiKey}
                disabled={!inputApiKey.trim()}
                className="btn-min-touch flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Kunci</span>
              </button>
              <button
                type="button"
                onClick={() => handleUjiKoneksiApiKey(inputApiKey)}
                disabled={!inputApiKey.trim() || statusUjiApiKey.sedangMenguji}
                className="btn-min-touch flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
              >
                <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                <span>Tes Kunci Ini</span>
              </button>
            </div>

            <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
              <span>Belum punya kunci? Buat gratis di</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 1.55 BAGIAN PWA (APLIKASI WEB PROGRESIF) - Tahap 6 */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white">Aplikasi Web Progresif (PWA)</h2>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isStandalone
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            {isStandalone ? 'Mode Standalone' : 'Mode Browser'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Niche Scout dapat dipasang ke Layar Utama perangkat Anda agar berjalan mandiri tanpa bilah URL peramban, lengkap dengan dukungan offline.
        </p>

        {isStandalone ? (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Aplikasi sedang berjalan dalam mode terpasang (Standalone).</span>
          </div>
        ) : (
          <div className="space-y-2">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallPWA}
                className="btn-min-touch w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Aplikasi ke Perangkat (Install)</span>
              </button>
            )}

            {isIOS && (
              <button
                type="button"
                onClick={() => setBukaPanduanIOS(true)}
                className="btn-min-touch w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95"
              >
                <Smartphone className="w-4 h-4 text-teal-400" />
                <span>Petunjuk Pasang di iPhone / iPad (Safari)</span>
              </button>
            )}

            {!deferredPrompt && !isIOS && (
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Buka menu opsi peramban Anda (ikon titik tiga atau bagikan) lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).
              </div>
            )}
          </div>
        )}

        {/* Modal Petunjuk iOS */}
        {bukaPanduanIOS && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Pasang di iPhone / Safari</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setBukaPanduanIOS(false)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p>1. Ketuk tombol <strong>Bagikan</strong> (ikon kotak dengan panah ke atas di bilah alat Safari).</p>
                <p>2. Gulir ke bawah lalu pilih menu <strong>Tambahkan ke Layar Utama</strong> (Add to Home Screen).</p>
                <p>3. Ketuk <strong>Tambah</strong> di sudut kanan atas.</p>
              </div>

              <button
                type="button"
                onClick={() => setBukaPanduanIOS(false)}
                className="btn-min-touch w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </section>
    </div>

    {/* Kolom Kanan: Ambang Bukti, Domain Stok, Backup/Impor, Tes Sistem, Zona Bahaya */}
    <div className="space-y-4">
      {/* 1.6 AMBANG AUDIT BUKTI & CAKUPAN (Tahap 3) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Ambang Penilaian Bukti (Tahap 3)</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onUpdateStore({
                ...store,
                pengaturan: {
                  ...store.pengaturan,
                  ambang_domain_kuat: 3,
                  ambang_cakupan_kuat: 0.5,
                  ambang_domain_sedang: 2,
                  ambang_cakupan_didukung: 0.6,
                  ambang_cakupan_sebagian: 0.2,
                },
              });
            }}
            className="text-[11px] text-teal-400 hover:text-teal-300 underline font-semibold"
          >
            Reset Ambang
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Ambang batas penilaian yang dihitung oleh kode untuk mengklasifikasikan bukti kuat, sedang, lemah, dan status dukungan.
        </p>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <label className="text-slate-300 font-semibold block text-[11px]">Domain Minimal Kuat:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={store.pengaturan.ambang_domain_kuat ?? 3}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) {
                  onUpdateStore({
                    ...store,
                    pengaturan: { ...store.pengaturan, ambang_domain_kuat: val },
                  });
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
              style={{ fontSize: '16px' }}
            />
            <span className="text-[10px] text-slate-500">Default: 3 domain</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <label className="text-slate-300 font-semibold block text-[11px]">Cakupan Minimal Kuat:</label>
            <input
              type="number"
              min="0.1"
              max="1.0"
              step="0.05"
              value={store.pengaturan.ambang_cakupan_kuat ?? 0.5}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0 && val <= 1) {
                  onUpdateStore({
                    ...store,
                    pengaturan: { ...store.pengaturan, ambang_cakupan_kuat: val },
                  });
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
              style={{ fontSize: '16px' }}
            />
            <span className="text-[10px] text-slate-500">Default: 0.5 (50%)</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <label className="text-slate-300 font-semibold block text-[11px]">Domain Minimal Sedang:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={store.pengaturan.ambang_domain_sedang ?? 2}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) {
                  onUpdateStore({
                    ...store,
                    pengaturan: { ...store.pengaturan, ambang_domain_sedang: val },
                  });
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
              style={{ fontSize: '16px' }}
            />
            <span className="text-[10px] text-slate-500">Default: 2 domain</span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <label className="text-slate-300 font-semibold block text-[11px]">Cakupan "Didukung":</label>
            <input
              type="number"
              min="0.1"
              max="1.0"
              step="0.05"
              value={store.pengaturan.ambang_cakupan_didukung ?? 0.6}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0 && val <= 1) {
                  onUpdateStore({
                    ...store,
                    pengaturan: { ...store.pengaturan, ambang_cakupan_didukung: val },
                  });
                }
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
              style={{ fontSize: '16px' }}
            />
            <span className="text-[10px] text-slate-500">Default: 0.6 (60%)</span>
          </div>
        </div>
      </section>

      {/* 1.7 DAFTAR DOMAIN PLATFORM STOK (Tahap 3) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Daftar Domain Platform Stok</h2>
            <p className="text-xs text-slate-400">
              Domain yang diberi label "sumber platform" (dipisahkan koma atau spasi)
            </p>
          </div>
          <span className="text-[11px] font-mono text-teal-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {store.pengaturan.domain_platform?.length || 0} platform
          </span>
        </div>

        <textarea
          rows={3}
          value={(store.pengaturan.domain_platform || []).join(', ')}
          onChange={(e) => {
            const list = e.target.value
              .split(/[,\n]/)
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            onUpdateStore({
              ...store,
              pengaturan: { ...store.pengaturan, domain_platform: list },
            });
          }}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          style={{ fontSize: '16px' }}
        />
      </section>

      {/* 1.8 KATA PERINGATAN RISIKO MEREK (Tahap 3) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Daftar Kata Peringatan Merek</h2>
            <p className="text-xs text-slate-400">
              Kata kunci pemicu lencana "Periksa merek" (dipisahkan koma)
            </p>
          </div>
          <span className="text-[11px] font-mono text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {store.pengaturan.kata_peringatan_merek?.length || 0} merek
          </span>
        </div>

        <textarea
          rows={3}
          value={(store.pengaturan.kata_peringatan_merek || []).join(', ')}
          onChange={(e) => {
            const list = e.target.value
              .split(/[,\n]/)
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            onUpdateStore({
              ...store,
              pengaturan: { ...store.pengaturan, kata_peringatan_merek: list },
            });
          }}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
          style={{ fontSize: '16px' }}
        />
        <p className="text-[10px] text-slate-500 italic">
          *Catatan: Penanda bantu otomatis, bukan penilaian hukum.
        </p>
      </section>

      {/* 1.9 BAGIAN BATAS & PEMAKAIAN PENYIMPANAN (Tahap 4) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white">Batas Penyimpanan Browser (Tahap 4)</h2>
          </div>
          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {laporanStorage.usedKb} KB / ~5,120 KB ({laporanStorage.percentage}%)
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Kapasitas localStorage browser dibatasi ~5 MB. Pantau penggunaan dan bersihkan riwayat riset lama jika kuota mendekati batas.
        </p>

        {/* Progress Bar Penyimpanan */}
        <div className="space-y-1">
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                laporanStorage.percentage >= 80
                  ? 'bg-rose-500'
                  : laporanStorage.percentage >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, laporanStorage.percentage))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0%</span>
            <span>Ambang Waspada 80%</span>
            <span>100% (~5 MB)</span>
          </div>
        </div>

        {/* Banner Peringatan jika >= 80% */}
        {laporanStorage.isNearLimit && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block">Penyimpanan Mendekati Batas ({laporanStorage.percentage}%)</strong>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                Penyimpanan browser Anda hampir penuh. Bersihkan riwayat lama sekarang untuk mencegah kegagalan penyimpanan riset baru.
              </p>
            </div>
          </div>
        )}

        {/* Banner Sukses Pembersihan */}
        {pesanStorageBersih && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pesanStorageBersih}</span>
          </div>
        )}

        {/* Tombol Aksi Bersihkan Riwayat Tertua */}
        <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            disabled={store.pencarian.length === 0}
            onClick={() => setModalPruneBuka(true)}
            className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Bersihkan Riwayat Tertua (25%)</span>
          </button>
          <span className="text-[10px] text-slate-500 italic">
            *Kandidat Shortlist tidak akan dihapus
          </span>
        </div>
      </section>

      {/* 2. BAGIAN DATA & PENYIMPANAN (Backup, Impor, Hapus Semua Data) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-400" />
          <h2 className="text-sm font-bold text-white">Manajemen Data & Penyimpanan</h2>
        </div>

        <p className="text-xs text-slate-400">
          Semua data disimpan di <code className="text-teal-400 font-mono">localStorage</code> dalam satu objek berskema{' '}
          <code className="text-teal-400 font-mono">schema_version: {store.schema_version}</code>.
        </p>

        {/* Ringkasan Isi Penyimpanan */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Kandidat Niche</span>
            <span className="text-sm font-bold text-white">{store.kandidat.length}</span>
          </div>
          <div className="border-x border-slate-800">
            <span className="text-[10px] text-slate-400 block">Riwayat Riset</span>
            <span className="text-sm font-bold text-white">{store.pencarian.length}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Momen Musiman</span>
            <span className="text-sm font-bold text-teal-400">{store.momen.length}</span>
          </div>
        </div>

        {/* Tombol Aksi: Backup & Impor */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleBackup}
            className="btn-min-touch flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Backup (Ekspor JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setBukaModalImpor(true)}
            className="btn-min-touch flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Impor JSON</span>
          </button>
        </div>

        {/* Tombol Bahaya: Hapus Semua Data */}
        <div className="pt-2 border-t border-slate-800/80">
          {tahapHapus === 0 && (
            <button
              type="button"
              onClick={handleMulaiHapus}
              className="btn-min-touch w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Hapus Semua Data</span>
            </button>
          )}

          {/* Konfirmasi Tingkat 1 */}
          {tahapHapus === 1 && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-200">Konfirmasi 1 dari 2: Hapus Semua Data?</p>
                  <p className="text-[11px] text-rose-300/80 leading-relaxed">
                    Tindakan ini akan mengosongkan seluruh kandidat niche dan riwayat. <strong>Aplikasi akan otomatis mengunduh berkas backup terlebih dahulu</strong> sebelum menghapus data.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleLanjutTahap2}
                  className="btn-min-touch flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg"
                >
                  Lanjut ke Konfirmasi Akhir
                </button>
                <button
                  type="button"
                  onClick={() => setTahapHapus(0)}
                  className="btn-min-touch px-3 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Konfirmasi Tingkat 2 */}
          {tahapHapus === 2 && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl space-y-2.5">
              <p className="text-xs font-bold text-rose-100 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Konfirmasi Akhir: Ketik "HAPUS" di bawah ini
              </p>
              <input
                type="text"
                value={teksKonfirmasiHapus}
                onChange={(e) => setTeksKonfirmasiHapus(e.target.value)}
                placeholder='Ketik "HAPUS"'
                className="w-full bg-slate-950 border border-rose-800 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-rose-500"
                style={{ fontSize: '16px' }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={teksKonfirmasiHapus.trim() !== 'HAPUS'}
                  onClick={handleEksekusiHapusFinal}
                  className="btn-min-touch flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-lg shadow-md"
                >
                  Unduh Backup & Hapus Bersih
                </button>
                <button
                  type="button"
                  onClick={() => setTahapHapus(0)}
                  className="btn-min-touch px-3 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. BAGIAN TES SISTEM TERPADU (Tahap 1 s/d 5) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Tes Sistem Terpadu (20 Uji Otomatis)</h2>
          </div>
          <button
            type="button"
            onClick={handleJalankanTes}
            disabled={sedangUji}
            className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {sedangUji ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Jalankan 20 Tes</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Menguji menyeluruh tanpa AI: kontrak data (Tahap 1), cache & kuota (Tahap 2), penilaian bukti matematis & merek (Tahap 3), ekspor-impor & kuota penyimpanan (Tahap 4), dan kalender musiman (Tahap 5).
        </p>

        {/* Ringkasan Hasil Tes jika sudah dijalankan */}
        {hasilTes.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Lulus (Passed)</span>
                <span className="text-sm font-bold text-emerald-400">{tesLulusCount} / {hasilTes.length}</span>
              </div>
              <div className="border-l border-slate-800">
                <span className="text-[10px] text-slate-400 block">Gagal (Failed)</span>
                <span className={`text-sm font-bold ${tesGagalCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {tesGagalCount}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {hasilTes.map((uji) => (
                <div
                  key={uji.id}
                  className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {uji.status === 'lulus' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-bold text-white text-xs">{uji.nama}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        uji.status === 'lulus'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {uji.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed pl-6">{uji.pesan}</p>
                  {uji.detail && (
                    <p className="text-slate-400 font-mono text-[10px] pl-6 pt-0.5">{uji.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
        </div>
      </div>

      {/* MODAL / FORM IMPOR JSON DUA CARA (Input Berkas & Kolom Tempel) */}
      {bukaModalImpor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div
            className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto animate-fadeIn"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Impor Cadangan JSON</h3>
              </div>
              <button
                type="button"
                onClick={() => setBukaModalImpor(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Pesan Sukses */}
            {pesanSuksesImpor && (
              <div className="bg-emerald-950/90 border border-emerald-800 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pesanSuksesImpor}</span>
              </div>
            )}

            {/* Cara 1: Input Berkas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Cara 1: Unggah Berkas JSON
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handlePilihBerkas}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-min-touch w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 border-dashed rounded-xl text-xs text-slate-300 font-medium"
              >
                <FileText className="w-4 h-4 text-teal-400" />
                <span>{namaFileImpor ? `Berkas: ${namaFileImpor}` : 'Pilih Berkas JSON dari Perangkat...'}</span>
              </button>
            </div>

            {/* Cara 2: Kolom Tempel JSON */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Cara 2: Tempel Teks JSON
              </label>
              <textarea
                value={teksJsonImpor}
                onChange={handleTeksJsonChange}
                placeholder='Tempelkan isi JSON lengkap di sini, misal: { "schema_version": 1, ... }'
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Hasil Validasi & Ringkasan */}
            {hasilValidasi && (
              <div className="space-y-2 pt-1">
                {hasilValidasi.valid && hasilValidasi.ringkasan ? (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Struktur JSON Valid (schema_version = {hasilValidasi.ringkasan.schema_version})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 font-mono">
                      <span>• Kandidat: {hasilValidasi.ringkasan.jumlah_kandidat}</span>
                      <span>• Pencarian: {hasilValidasi.ringkasan.jumlah_pencarian}</span>
                      <span>• Momen: {hasilValidasi.ringkasan.jumlah_momen}</span>
                      <span>
                        • Skala: {hasilValidasi.ringkasan.skala_di_file ? `${Math.round(hasilValidasi.ringkasan.skala_di_file * 100)}%` : 'Default'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-emerald-800/60 space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-200 block">Pilih Mode Impor:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEksekusiImpor('gabung')}
                          className="btn-min-touch px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
                        >
                          Gabung (Merge)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEksekusiImpor('timpa')}
                          className="btn-min-touch px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                        >
                          Timpa Semua
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Validasi Gagal (Berkas Ditolak)</span>
                    </div>
                    <p className="text-rose-200 text-[11px] leading-relaxed">
                      {hasilValidasi.pesanError}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBukaModalImpor(false)}
                className="btn-min-touch px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI BERSIHKAN RIWAYAT TERTUA (Tahap 4) */}
      {modalPruneBuka && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-white">
              <RotateCcw className="w-5 h-5 text-teal-400 shrink-0" />
              <h3 className="font-bold text-sm">Bersihkan 25% Riwayat Tertua?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menghapus 25% riwayat pencarian paling lama untuk menghemat kapasitas localStorage browser.
            </p>
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[11px] text-emerald-300">
              <strong>Proteksi Shortlist:</strong> Semua ide yang sedang Anda pantau di Shortlist akan tetap dipertahankan dan tidak akan dihapus.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleEksekusiPrune}
                className="btn-min-touch flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                Ya, Bersihkan
              </button>
              <button
                type="button"
                onClick={() => setModalPruneBuka(false)}
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
