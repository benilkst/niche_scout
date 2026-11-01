/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Bookmark, History, Calendar, LucideIcon } from 'lucide-react';
import { TabId } from './BottomNav.tsx';

interface TabPlaceholderProps {
  tabId: 'cari' | 'shortlist' | 'riwayat' | 'kalender';
}

const TAB_CONFIG: Record<string, { judul: string; deskripsi: string; detail: string; icon: LucideIcon }> = {
  cari: {
    judul: 'Pencarian Ide Niche',
    deskripsi: 'Modul eksplorasi dan riset ide niche microstock berbasis Google Search grounding.',
    detail: 'Pada tahap selanjutnya, Anda dapat mencari ide foto nyata, foto AI, dan ilustrasi AI dengan parameter tema, tipe aset, dan momen musiman.',
    icon: Search,
  },
  shortlist: {
    judul: 'Shortlist Niche Unggulan',
    deskripsi: 'Daftar ide kandidat niche yang Anda pantau untuk rencana produksi konten.',
    detail: 'Menyimpan ide dengan status dipantau, catatan personal, saran sudut pengambilan gambar, serta bukti rujukan domain.',
    icon: Bookmark,
  },
  riwayat: {
    judul: 'Riwayat Pencarian & Grounding',
    deskripsi: 'Log riwayat query pencarian web dan catatan hasil riset sebelumnya.',
    detail: 'Menyimpan riwayat lengkap parameter pencarian, status grounding, serta cache pencarian agar efisien dan terorganisir.',
    icon: History,
  },
  kalender: {
    judul: 'Kalender Momen Musiman',
    deskripsi: 'Jadwal persiapan momen tahunan microstock untuk upload 60-90 hari sebelum tanggal puncak.',
    detail: 'Memuat tanggal puncak Ramadhan, Natal, Tahun Baru, Imlek, Black Friday, dan momen musiman global lainnya.',
    icon: Calendar,
  },
};

export const TabPlaceholder: React.FC<TabPlaceholderProps> = ({ tabId }) => {
  const config = TAB_CONFIG[tabId] || TAB_CONFIG.cari;
  const Icon = config.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-bold text-white tracking-tight">{config.judul}</h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-[320px] mx-auto">
          {config.deskripsi}
        </p>
      </div>

      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-left">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {config.detail}
        </p>
      </div>

      <div className="pt-2 text-[10px] text-slate-500 font-mono">
        Status: Fondasi data Tahap 1 aktif • Kontrak tipe data siap
      </div>
    </div>
  );
};
