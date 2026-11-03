/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { BottomNav, TabId } from './components/BottomNav.tsx';
import { SidebarNav } from './components/SidebarNav.tsx';
import { TabPlaceholder } from './components/TabPlaceholder.tsx';
import { CariView } from './components/CariView.tsx';
import { ShortlistView } from './components/ShortlistView.tsx';
import { RiwayatView } from './components/RiwayatView.tsx';
import { KalenderView } from './components/KalenderView.tsx';
import { PengaturanView } from './components/PengaturanView.tsx';
import { PanduanModal } from './components/PanduanModal.tsx';
import { AppDataStore, KandidatNiche, PencarianRecord } from './types.ts';
import { muatData, simpanData } from './storage.ts';
import { AlertTriangle, X } from 'lucide-react';

const MAKSIMAL_RIWAYAT_PENCARIAN = 50;

export default function App() {
  const [tabAktif, setTabAktif] = useState<TabId>('cari');
  const [store, setStore] = useState<AppDataStore>(() => muatData());

  // State Modal Panduan (Tahap 7)
  const [panduanBuka, setPanduanBuka] = useState(false);
  const [targetSectionPanduan, setTargetSectionPanduan] = useState<string | null>(null);

  // Momen terpilih saat beralih dari Tab Kalender ke Tab Cari
  const [momenTerpilihId, setMomenTerpilihId] = useState<string | null>(null);

  // Data pencarian yang dibuka ulang dari Riwayat
  const [reopenedData, setReopenedData] = useState<{
    record: PencarianRecord;
    kandidat: KandidatNiche[];
  } | null>(null);

  // Storage error banner
  const [storageErrorPesan, setStorageErrorPesan] = useState<string | null>(null);

  // Terapkan skala responsif ke root DOM
  // Aturan: default Otomatis (100% pada >=1024px, 85% di bawahnya). Jika skala_manual true, hormati pilihan itu.
  useEffect(() => {
    const terapkanSkalaResponsif = () => {
      if (store.pengaturan.skala_manual === true) {
        document.documentElement.style.setProperty('--skala', String(store.pengaturan.skala));
      } else {
        const skalaOtomatis = window.innerWidth >= 1024 ? 1.0 : 0.85;
        document.documentElement.style.setProperty('--skala', String(skalaOtomatis));
        if (store.pengaturan.skala !== skalaOtomatis) {
          setStore((prev) => ({
            ...prev,
            pengaturan: {
              ...prev.pengaturan,
              skala: skalaOtomatis,
            },
          }));
        }
      }
    };

    terapkanSkalaResponsif();
    window.addEventListener('resize', terapkanSkalaResponsif);
    return () => window.removeEventListener('resize', terapkanSkalaResponsif);
  }, [store.pengaturan.skala_manual, store.pengaturan.skala]);

  const handleBukaPanduan = (sectionId?: string) => {
    setTargetSectionPanduan(sectionId || null);
    setPanduanBuka(true);
  };

  const handleResetMulaiCepat = () => {
    window.dispatchEvent(new CustomEvent('niche_scout_reset_mulai_cepat'));
  };

  // Tangkap error kuota penyimpanan localStorage
  useEffect(() => {
    const handleStorageError = (e: any) => {
      const err = e.detail?.error;
      setStorageErrorPesan(
        'Penyimpanan lokal perangkat Anda penuh. Silakan bersihkan riwayat lama di tab Pengaturan.'
      );
    };

    window.addEventListener('niche_scout_storage_error', handleStorageError);
    return () => {
      window.removeEventListener('niche_scout_storage_error', handleStorageError);
    };
  }, []);

  const handleUpdateStore = (newStore: AppDataStore) => {
    setStore(newStore);
    simpanData(newStore);
  };

  const handleScaleChange = (newScale: number | 'otomatis') => {
    if (newScale === 'otomatis') {
      const skalaOtomatis = window.innerWidth >= 1024 ? 1.0 : 0.85;
      const updatedStore: AppDataStore = {
        ...store,
        pengaturan: {
          ...store.pengaturan,
          skala_manual: false,
          skala: skalaOtomatis,
        },
      };
      setStore(updatedStore);
      simpanData(updatedStore);
      document.documentElement.style.setProperty('--skala', String(skalaOtomatis));
    } else {
      const updatedStore: AppDataStore = {
        ...store,
        pengaturan: {
          ...store.pengaturan,
          skala_manual: true,
          skala: newScale,
        },
      };
      setStore(updatedStore);
      simpanData(updatedStore);
      document.documentElement.style.setProperty('--skala', String(newScale));
    }
  };

  // Handler saat pencarian selesai dieksekusi
  const handleSimpanHasilPencarian = (record: PencarianRecord, kandidatBaru: KandidatNiche[]) => {
    // 1. Simpan PencarianRecord: maksimal 50 pencarian terakhir, yang tertua dibuang
    const updatedPencarian = [record, ...store.pencarian.filter((p) => p.id !== record.id)].slice(
      0,
      MAKSIMAL_RIWAYAT_PENCARIAN
    );

    // 2. Gabungkan kandidat baru tanpa duplikasi ID
    const kandidatMap = new Map<string, KandidatNiche>();
    store.kandidat.forEach((k) => kandidatMap.set(k.id, k));
    kandidatBaru.forEach((k) => {
      // Pertahankan status 'dipantau' jika sebelumnya sudah di-shortlist
      const existing = kandidatMap.get(k.id);
      if (existing && existing.status === 'dipantau') {
        kandidatMap.set(k.id, { ...k, status: 'dipantau', catatan: existing.catatan, tag: existing.tag });
      } else {
        kandidatMap.set(k.id, k);
      }
    });

    const updatedStore: AppDataStore = {
      ...store,
      pencarian: updatedPencarian,
      kandidat: Array.from(kandidatMap.values()),
    };

    setStore(updatedStore);
    simpanData(updatedStore);
  };

  // Update Status Kandidat ('baru' | 'dipantau' | 'dibuang') - Tahap 4
  const handleUpdateStatus = (kandidatId: string, status: 'baru' | 'dipantau' | 'dibuang') => {
    const kandidatMap = new Map<string, KandidatNiche>();
    store.kandidat.forEach((k) => kandidatMap.set(k.id, k));

    const existing = kandidatMap.get(kandidatId);
    if (existing) {
      kandidatMap.set(kandidatId, { ...existing, status });
    }

    const updatedStore: AppDataStore = {
      ...store,
      kandidat: Array.from(kandidatMap.values()),
    };

    setStore(updatedStore);
    simpanData(updatedStore);
  };

  // Update Catatan Pribadi Kandidat - Tahap 4
  const handleUpdateCatatan = (kandidatId: string, catatan: string) => {
    const kandidatMap = new Map<string, KandidatNiche>();
    store.kandidat.forEach((k) => kandidatMap.set(k.id, k));

    const existing = kandidatMap.get(kandidatId);
    if (existing) {
      kandidatMap.set(kandidatId, { ...existing, catatan });
    }

    const updatedStore: AppDataStore = {
      ...store,
      kandidat: Array.from(kandidatMap.values()),
    };

    setStore(updatedStore);
    simpanData(updatedStore);
  };

  // Update Tag Kandidat - Tahap 4
  const handleUpdateTag = (kandidatId: string, tags: string[]) => {
    const kandidatMap = new Map<string, KandidatNiche>();
    store.kandidat.forEach((k) => kandidatMap.set(k.id, k));

    const existing = kandidatMap.get(kandidatId);
    if (existing) {
      kandidatMap.set(kandidatId, { ...existing, tag: tags });
    }

    const updatedStore: AppDataStore = {
      ...store,
      kandidat: Array.from(kandidatMap.values()),
    };

    setStore(updatedStore);
    simpanData(updatedStore);
  };

  // Buka Ulang Pencarian dari Riwayat - Tahap 4
  const handleBukaUlangPencarian = (record: PencarianRecord, kandidatList: KandidatNiche[]) => {
    setReopenedData({ record, kandidat: kandidatList });
    setTabAktif('cari');
  };

  // Hapus Satu Pencarian dari Riwayat - Tahap 4
  const handleHapusPencarian = (pencarianId: string) => {
    const updatedPencarian = store.pencarian.filter((p) => p.id !== pencarianId);
    // Pertahankan kandidat jika berstatus 'dipantau' (Shortlist)
    const updatedKandidat = store.kandidat.filter((k) => {
      if (k.status === 'dipantau') return true;
      return k.id_pencarian !== pencarianId;
    });

    const updatedStore: AppDataStore = {
      ...store,
      pencarian: updatedPencarian,
      kandidat: updatedKandidat,
    };

    setStore(updatedStore);
    simpanData(updatedStore);
  };

  // Pulihkan Kandidat yang Dibuang - Tahap 4
  const handlePulihkanKandidat = (kandidatId: string) => {
    handleUpdateStatus(kandidatId, 'baru');
  };

  const kandidatShortlist = store.kandidat.filter((k) => k.status === 'dipantau');

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sidebar Nav Desktop (>=1024px) */}
      <SidebarNav
        tabAktif={tabAktif}
        onGantiTab={setTabAktif}
        jumlahShortlist={kandidatShortlist.length}
        onBukaPanduan={() => handleBukaPanduan()}
        currentScale={store.pengaturan.skala}
        isScaleManual={store.pengaturan.skala_manual}
      />

      {/* Header Top */}
      <Header
        currentScale={store.pengaturan.skala}
        onGoToPengaturan={() => setTabAktif('pengaturan')}
        onBukaPanduan={() => handleBukaPanduan()}
        isScaleManual={store.pengaturan.skala_manual}
      />

      {/* Storage Error Toast jika ada */}
      {storageErrorPesan && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 text-xs px-4 py-2.5 flex items-center justify-between gap-2 shadow-lg lg:pl-[260px]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{storageErrorPesan}</span>
          </div>
          <button
            type="button"
            onClick={() => setStorageErrorPesan(null)}
            className="text-rose-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View Area - Responsif Penuh (HP, Tablet, Desktop) */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 pb-28 lg:pb-12 lg:pl-[260px] space-y-4 transition-all">
        {/* Tab 1: Cari (Tahap 2 & Tahap 4 & Tahap 7) */}
        {tabAktif === 'cari' && (
          <CariView
            store={store}
            onSimpanHasilPencarian={handleSimpanHasilPencarian}
            onUpdateStatus={handleUpdateStatus}
            onUpdateCatatan={handleUpdateCatatan}
            onUpdateTag={handleUpdateTag}
            reopenedData={reopenedData}
            onClearReopenedData={() => setReopenedData(null)}
            momenAwalId={momenTerpilihId}
            onBukaPanduan={handleBukaPanduan}
            onBukaPengaturan={() => setTabAktif('pengaturan')}
          />
        )}

        {/* Tab 2: Shortlist (Tahap 4) */}
        {tabAktif === 'shortlist' && (
          <ShortlistView
            store={store}
            onUpdateStatus={handleUpdateStatus}
            onUpdateCatatan={handleUpdateCatatan}
            onUpdateTag={handleUpdateTag}
            onGoToCari={() => setTabAktif('cari')}
            onBukaPanduan={handleBukaPanduan}
          />
        )}

        {/* Tab 3: Riwayat (Tahap 4) */}
        {tabAktif === 'riwayat' && (
          <RiwayatView
            store={store}
            onBukaUlangPencarian={handleBukaUlangPencarian}
            onHapusPencarian={handleHapusPencarian}
            onPulihkanKandidat={handlePulihkanKandidat}
            onGoToCari={() => setTabAktif('cari')}
          />
        )}

        {/* Tab 4: Kalender Musiman Mini (Tahap 5) */}
        {tabAktif === 'kalender' && (
          <KalenderView
            store={store}
            onUpdateStore={handleUpdateStore}
            onPilihMomenUntukCari={(id) => {
              setMomenTerpilihId(id);
              setTabAktif('cari');
            }}
          />
        )}

        {/* Tab 5: Pengaturan */}
        {tabAktif === 'pengaturan' && (
          <PengaturanView
            store={store}
            onUpdateStore={handleUpdateStore}
            onScaleChange={handleScaleChange}
            onBukaPanduan={handleBukaPanduan}
          />
        )}
      </main>

      {/* Navigasi Bawah 5 Tab */}
      <BottomNav
        tabAktif={tabAktif}
        onGantiTab={setTabAktif}
        jumlahShortlist={kandidatShortlist.length}
      />

      {/* Modal Panduan Interaktif (Tahap 7) */}
      <PanduanModal
        isOpen={panduanBuka}
        onClose={() => setPanduanBuka(false)}
        targetSectionId={targetSectionPanduan}
        onResetMulaiCepat={handleResetMulaiCepat}
      />
    </div>
  );
}
