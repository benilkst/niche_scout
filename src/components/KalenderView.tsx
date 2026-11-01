/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Plus,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Check,
  Info,
} from 'lucide-react';
import { AppDataStore, Momen, StatusJendelaMomen } from '../types.ts';
import {
  hitungJendelaMomen,
  urutkanMomenBerdasarkanUrgensi,
  MOMEN_DEFAULT_TAHAP5,
} from '../lib/kalenderMusiman.ts';

interface KalenderViewProps {
  store: AppDataStore;
  onUpdateStore: (newStore: AppDataStore) => void;
  onPilihMomenUntukCari: (momenId: string) => void;
}

export const KalenderView: React.FC<KalenderViewProps> = ({
  store,
  onUpdateStore,
  onPilihMomenUntukCari,
}) => {
  // Filter tab
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [cariTeks, setCariTeks] = useState('');

  // Modal State
  const [modalEditBuka, setModalEditBuka] = useState(false);
  const [momenDiedit, setMomenDiedit] = useState<Momen | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [editAktif, setEditAktif] = useState(true);

  // Modal Tambah State
  const [modalTambahBuka, setModalTambahBuka] = useState(false);
  const [tambahNama, setTambahNama] = useState('');
  const [tambahTanggal, setTambahTanggal] = useState('');
  const [tambahDeskripsi, setTambahDeskripsi] = useState('');

  // Evaluasi semua momen dengan status jendela
  const evaluatedMomen = useMemo(() => {
    const list = store.momen.map((m) => {
      const jendela = hitungJendelaMomen(m);
      return { momen: m, jendela };
    });
    return urutkanMomenBerdasarkanUrgensi(list);
  }, [store.momen]);

  // Statistik Ringkas
  const statSedangJendela = evaluatedMomen.filter((item) => item.jendela.status === 'Sedang di jendela').length;
  const statMasukJendela = evaluatedMomen.filter((item) => item.jendela.status === 'Masuk jendela dalam 30 hari').length;
  const statLewat = evaluatedMomen.filter((item) => item.jendela.status === 'Jendela sudah lewat (target musim berikutnya)').length;
  const statBelumDiisi = evaluatedMomen.filter((item) => item.jendela.status === 'Tanggal belum diisi').length;

  // Filter daftar momen
  const filteredList = evaluatedMomen.filter(({ momen, jendela }) => {
    if (cariTeks.trim()) {
      const q = cariTeks.toLowerCase();
      const matchNama = momen.nama.toLowerCase().includes(q);
      const matchDeskripsi = momen.deskripsi?.toLowerCase().includes(q) || false;
      if (!matchNama && !matchDeskripsi) return false;
    }

    if (filterStatus === 'sedang_di_jendela') {
      return jendela.status === 'Sedang di jendela';
    }
    if (filterStatus === 'segera_dibuka') {
      return jendela.status === 'Masuk jendela dalam 30 hari';
    }
    if (filterStatus === 'lewat') {
      return jendela.status === 'Jendela sudah lewat (target musim berikutnya)';
    }
    if (filterStatus === 'belum_diisi') {
      return jendela.status === 'Tanggal belum diisi';
    }
    return true;
  });

  const handleBukaEdit = (m: Momen) => {
    setMomenDiedit(m);
    setEditNama(m.nama);
    setEditTanggal(m.tanggal_puncak ? m.tanggal_puncak.slice(0, 10) : '');
    setEditDeskripsi(m.deskripsi || '');
    setEditAktif(m.aktif);
    setModalEditBuka(true);
  };

  const handleSimpanEdit = () => {
    if (!momenDiedit) return;

    const updatedMomenList = store.momen.map((m) => {
      if (m.id === momenDiedit.id) {
        return {
          ...m,
          nama: editNama.trim() || m.nama,
          tanggal_puncak: editTanggal.trim() ? editTanggal.trim() : null,
          deskripsi: editDeskripsi.trim() || undefined,
          aktif: editAktif,
        };
      }
      return m;
    });

    onUpdateStore({
      ...store,
      momen: updatedMomenList,
    });
    setModalEditBuka(false);
    setMomenDiedit(null);
  };

  const handleSimpanTambah = () => {
    if (!tambahNama.trim()) return;

    const newMomen: Momen = {
      id: `momen_kustom_${Date.now()}`,
      nama: tambahNama.trim(),
      tanggal_puncak: tambahTanggal.trim() ? tambahTanggal.trim() : null,
      deskripsi: tambahDeskripsi.trim() || undefined,
      tetap: false,
      aktif: true,
      kustom: true,
    };

    onUpdateStore({
      ...store,
      momen: [newMomen, ...store.momen],
    });

    setModalTambahBuka(false);
    setTambahNama('');
    setTambahTanggal('');
    setTambahDeskripsi('');
  };

  const handleHapusMomenKustom = (id: string) => {
    if (window.confirm('Hapus momen kustom ini dari kalender?')) {
      const updated = store.momen.filter((m) => m.id !== id);
      onUpdateStore({
        ...store,
        momen: updated,
      });
    }
  };

  const handleToggleAktif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = store.momen.map((m) => {
      if (m.id === id) {
        return { ...m, aktif: !m.aktif };
      }
      return m;
    });
    onUpdateStore({
      ...store,
      momen: updated,
    });
  };

  const handleResetDefault = () => {
    if (
      window.confirm(
        'Kembalikan daftar momen ke konfigurasi default Tahap 5? Momen kustom buatan Anda akan tetap disimpan.'
      )
    ) {
      const kustomList = store.momen.filter((m) => m.kustom);
      onUpdateStore({
        ...store,
        momen: [...MOMEN_DEFAULT_TAHAP5, ...kustomList],
      });
    }
  };

  // Helper badge warna dan ikon status
  const getBadgeStyle = (status: StatusJendelaMomen) => {
    switch (status) {
      case 'Sedang di jendela':
        return {
          bg: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300',
          dot: 'bg-emerald-400 animate-pulse',
          label: 'Sedang di Jendela Unggah',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'Masuk jendela dalam 30 hari':
        return {
          bg: 'bg-amber-950/80 border-amber-700/60 text-amber-300',
          dot: 'bg-amber-400',
          label: 'Masuk Jendela (< 30 Hari)',
          icon: <Hourglass className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'Belum dibuka':
        return {
          bg: 'bg-sky-950/80 border-sky-800/60 text-sky-300',
          dot: 'bg-sky-400',
          label: 'Belum Dibuka',
          icon: <Clock className="w-3.5 h-3.5 text-sky-400" />,
        };
      case 'Jendela sudah lewat (target musim berikutnya)':
        return {
          bg: 'bg-purple-950/80 border-purple-800/60 text-purple-300',
          dot: 'bg-purple-400',
          label: 'Jendela Lewat (Target Musim Berikutnya)',
          icon: <RefreshCw className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'Tanggal belum diisi':
        return {
          bg: 'bg-rose-950/80 border-rose-800/60 text-rose-300',
          dot: 'bg-rose-400 animate-bounce',
          label: 'Tanggal Belum Diisi',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Tab Kalender */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-950/80 border border-emerald-800/60 rounded-xl text-emerald-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kalender Musiman Mini</h2>
              <p className="text-[11px] text-slate-400">
                Jendela ideal: 120 s/d 60 hari sebelum puncak (H-120 s/d H-60)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalTambahBuka(true)}
            className="btn-min-touch flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>

        {/* Ringkasan Jendela Unggah */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-center">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/50">
            <span className="block text-xs font-bold text-emerald-400">{statSedangJendela}</span>
            <span className="text-[9px] text-slate-400 leading-tight">Sedang Jendela</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/50">
            <span className="block text-xs font-bold text-amber-400">{statMasukJendela}</span>
            <span className="text-[9px] text-slate-400 leading-tight">Segera Dibuka</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/50">
            <span className="block text-xs font-bold text-purple-400">{statLewat}</span>
            <span className="text-[9px] text-slate-400 leading-tight">Musim Depan</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/50">
            <span className="block text-xs font-bold text-rose-400">{statBelumDiisi}</span>
            <span className="text-[9px] text-slate-400 leading-tight">Perlu Tanggal</span>
          </div>
        </div>

        {/* Banner Peringatan jika ada tanggal bergeser yang belum diisi */}
        {statBelumDiisi > 0 && (
          <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex-1 text-[11px] leading-snug">
              Ada {statBelumDiisi} momen tanggal bergeser (misal Ramadan, Lebaran, Imlek).
              <span className="font-semibold text-rose-200"> Isi dan verifikasi tanggal puncak</span> agar jendela unggah dapat dihitung.
            </div>
          </div>
        )}
      </div>

      {/* Kontrol Pencarian & Filter Status */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={cariTeks}
            onChange={(e) => setCariTeks(e.target.value)}
            placeholder="Cari momen musiman..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          {cariTeks && (
            <button
              onClick={() => setCariTeks('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            type="button"
            onClick={() => setFilterStatus('semua')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterStatus === 'semua'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({evaluatedMomen.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('sedang_di_jendela')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterStatus === 'sedang_di_jendela'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sedang Jendela ({statSedangJendela})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('segera_dibuka')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterStatus === 'segera_dibuka'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Segera Dibuka ({statMasukJendela})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('belum_diisi')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterStatus === 'belum_diisi'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Perlu Tanggal ({statBelumDiisi})
          </button>
        </div>
      </div>

      {/* Daftar Momen Terurut Urgensi: Grid 3 Kolom di Layar Lebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Tidak ada momen yang sesuai</p>
            <p className="text-xs text-slate-500">Coba ubah kata kunci atau filter status.</p>
          </div>
        ) : (
          filteredList.map(({ momen, jendela }) => {
            const badge = getBadgeStyle(jendela.status);
            const isDiisi = jendela.status !== 'Tanggal belum diisi';

            return (
              <div
                key={momen.id}
                className={`p-3.5 bg-slate-900 border rounded-2xl transition-all ${
                  momen.aktif ? 'border-slate-800 shadow-sm' : 'border-slate-800/50 opacity-60'
                }`}
              >
                {/* Header Kartu Momen */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {momen.nama}
                      </h3>
                      {momen.tetap ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Tetap
                        </span>
                      ) : momen.kustom ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Kustom
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                          Bergeser
                        </span>
                      )}
                      {!momen.aktif && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    {momen.deskripsi && (
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {momen.deskripsi}
                      </p>
                    )}
                  </div>

                  {/* Toggle Aktif / Nonaktif */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleAktif(momen.id, e)}
                    title={momen.aktif ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    className={`btn-min-touch px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      momen.aktif
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {momen.aktif ? 'Aktif' : 'Mati'}
                  </button>
                </div>

                {/* Status Jendela Badge */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${badge.bg}`}>
                    <div className="flex items-center gap-1.5">
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                    {jendela.hari_tersisa !== null && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-950/60 border border-current">
                        {jendela.hari_tersisa === 0
                          ? 'Hari ini'
                          : `${jendela.hari_tersisa} hari tersisa`}
                      </span>
                    )}
                  </div>

                  {/* Detail Target & Rentang */}
                  {isDiisi ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/70">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          Target Puncak {jendela.is_musim_berikutnya ? '(Musim Depan)' : ''}:
                        </span>
                        <span className="font-semibold text-slate-200">
                          {jendela.tanggal_puncak_target || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-medium">
                          Jendela Ideal (H-120 s/d H-60):
                        </span>
                        <span className="font-semibold text-emerald-400 font-mono">
                          {jendela.rentang_label || '-'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-950/30 border border-rose-800/60 rounded-xl text-[11px] text-rose-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Isi dan verifikasi tanggal puncak untuk momen ini.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBukaEdit(momen)}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold"
                      >
                        Isi Tanggal
                      </button>
                    </div>
                  )}

                  {/* Catatan jika jendela musim ini sudah lewat */}
                  {jendela.status === 'Jendela sudah lewat (target musim berikutnya)' && (
                    <div className="p-2 bg-purple-950/40 border border-purple-800/50 rounded-xl text-[10px] text-purple-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        Jendela unggah musim ini sudah lewat. Hasil ide ditujukan untuk persiapan musim tahun berikutnya.
                      </span>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Kartu */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleBukaEdit(momen)}
                      className="btn-min-touch flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {momen.kustom && (
                      <button
                        type="button"
                        onClick={() => handleHapusMomenKustom(momen.id)}
                        className="btn-min-touch flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  {/* Tombol Cari Ide untuk Momen ini */}
                  <button
                    type="button"
                    disabled={!momen.aktif}
                    onClick={() => onPilihMomenUntukCari(momen.id)}
                    className="btn-min-touch flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Cari Ide Momen Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Kalender: Reset Default */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleResetDefault}
          className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
        >
          Reset Kalender ke Momen Default Tahap 5
        </button>
      </div>

      {/* Modal Edit Momen */}
      {modalEditBuka && momenDiedit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Momen: {momenDiedit.nama}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalEditBuka(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Momen
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tanggal Puncak (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Untuk momen bergeser (misal Ramadan atau Lebaran), tentukan perkiraan tanggal puncak tahun berjalan.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Deskripsi / Konsep Kunci
                </label>
                <textarea
                  rows={2}
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  placeholder="Konteks visual atau objek utama..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300 font-semibold">Status Aktif di Pencarian:</span>
                <button
                  type="button"
                  onClick={() => setEditAktif(!editAktif)}
                  className={`px-3 py-1 rounded-lg font-bold border transition-colors ${
                    editAktif
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {editAktif ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setModalEditBuka(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanEdit}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Momen Kustom */}
      {modalTambahBuka && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-[560px] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Momen Musiman Sendiri</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalTambahBuka(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Momen <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={tambahNama}
                  onChange={(e) => setTambahNama(e.target.value)}
                  placeholder="Contoh: Hari Guru Nasional, Waisak, Summer Holiday"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tanggal Puncak (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={tambahTanggal}
                  onChange={(e) => setTambahTanggal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Deskripsi Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={tambahDeskripsi}
                  onChange={(e) => setTambahDeskripsi(e.target.value)}
                  placeholder="Ide visual, subjek, atau pasar target..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setModalTambahBuka(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!tambahNama.trim()}
                onClick={handleSimpanTambah}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Tambah Momen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
