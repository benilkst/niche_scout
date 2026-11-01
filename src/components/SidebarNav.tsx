/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Search, Bookmark, History, Calendar, Settings, BookOpen } from 'lucide-react';
import { TabId } from './BottomNav.tsx';
import { VERSI_APLIKASI, VERSI_PANDUAN } from '../data/panduanContent.ts';

interface SidebarNavProps {
  tabAktif: TabId;
  onGantiTab: (tab: TabId) => void;
  jumlahShortlist?: number;
  onBukaPanduan?: () => void;
  currentScale: number;
  isScaleManual?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  tabAktif,
  onGantiTab,
  jumlahShortlist = 0,
  onBukaPanduan,
  currentScale,
  isScaleManual,
}) => {
  const menuItems: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'cari', label: 'Cari Ide Niche', icon: <Search className="w-5 h-5" /> },
    {
      id: 'shortlist',
      label: 'Shortlist Ide',
      icon: <Bookmark className="w-5 h-5" />,
      badge: jumlahShortlist,
    },
    { id: 'riwayat', label: 'Riwayat Pencarian', icon: <History className="w-5 h-5" /> },
    { id: 'kalender', label: 'Kalender Musiman', icon: <Calendar className="w-5 h-5" /> },
    { id: 'pengaturan', label: 'Pengaturan & Audit', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-[240px] fixed top-0 bottom-0 left-0 bg-slate-900 border-r border-slate-800 z-40 hidden lg:flex flex-col justify-between p-4 select-none">
      {/* Brand Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 shrink-0">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white leading-tight">
                Niche Scout
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded-full">
                {VERSI_APLIKASI}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Ide niche microstock bersumber</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const aktif = tabAktif === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onGantiTab(item.id)}
                className={`btn-min-touch w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  aktif
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={aktif ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      aktif
                        ? 'bg-white text-emerald-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Sidebar: Tombol Panduan & Info Skala / Versi */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        {onBukaPanduan && (
          <button
            type="button"
            onClick={onBukaPanduan}
            className="btn-min-touch w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Buka {VERSI_PANDUAN}</span>
          </button>
        )}

        <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>Skala Tampilan:</span>
          <span className="font-mono text-emerald-400 font-bold">
            {Math.round(currentScale * 100)}%
            <span className="text-[10px] text-slate-500 ml-1 font-sans">
              ({isScaleManual ? 'Manual' : 'Otomatis'})
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
};
