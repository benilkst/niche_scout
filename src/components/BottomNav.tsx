/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Bookmark, History, Calendar, Settings } from 'lucide-react';

export type TabId = 'cari' | 'shortlist' | 'riwayat' | 'kalender' | 'pengaturan';

interface BottomNavProps {
  tabAktif: TabId;
  onGantiTab: (tab: TabId) => void;
  jumlahShortlist?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ tabAktif, onGantiTab, jumlahShortlist = 0 }) => {
  const tabs = [
    { id: 'cari' as const, label: 'Cari', icon: Search },
    { id: 'shortlist' as const, label: 'Shortlist', icon: Bookmark, badge: jumlahShortlist },
    { id: 'riwayat' as const, label: 'Riwayat', icon: History },
    { id: 'kalender' as const, label: 'Kalender', icon: Calendar },
    { id: 'pengaturan' as const, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 lg:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="w-full max-w-xl mx-auto grid grid-cols-5 gap-1 px-3 pt-1.5 bottom-nav-min-touch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tabAktif === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onGantiTab(tab.id)}
              className={`btn-min-touch relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400 font-bold bg-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                    {tab.badge! > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-none tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
