/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Database,
  Calculator,
  Terminal,
} from 'lucide-react';
import { SystemTestResult } from '../types/index.ts';
import { runAllSystemTests } from '../lib/systemTests.ts';
import { getStorageDiagnostics, CURRENT_SCHEMA_VERSION } from '../lib/storage.ts';
import { calculateDaysToEvent } from '../lib/scoring.ts';
import { GEMINI_MODEL_NAME } from '../config/model.ts';

export const SystemTestsView: React.FC = () => {
  const [results, setResults] = useState<SystemTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [storageDiag, setStorageDiag] = useState(getStorageDiagnostics());

  // Interactive sandbox state for user testing
  const [sandboxMomen, setSandboxMomen] = useState('natal');
  const [sandboxDaysResult, setSandboxDaysResult] = useState<number | undefined>(undefined);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllSystemTests();
      setResults(res);
      setStorageDiag(getStorageDiagnostics());
      setIsRunning(false);
    }, 300);
  };

  useEffect(() => {
    executeTests();
  }, []);

  useEffect(() => {
    setSandboxDaysResult(calculateDaysToEvent(sandboxMomen));
  }, [sandboxMomen]);

  const passedCount = results.filter((r) => r.status === 'berhasil').length;
  const failedCount = results.filter((r) => r.status === 'gagal').length;

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base text-white">Tes Sistem Logika Murni</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Aturan 10: Verifikasi otomatis logika perhitungan, pemetaan, dan tanggal terpisah dari UI.
            </p>
          </div>
          <button
            type="button"
            onClick={executeTests}
            disabled={isRunning}
            className="btn-min-touch inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Jalankan Ulang</span>
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Total Pengujian</span>
            <span className="text-sm font-bold text-white">{results.length}</span>
          </div>
          <div className="border-x border-slate-800">
            <span className="text-[10px] text-slate-400 block">Lolos (Pass)</span>
            <span className="text-sm font-bold text-emerald-400">{passedCount}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Gagal (Fail)</span>
            <span className={`text-sm font-bold ${failedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {failedCount}
            </span>
          </div>
        </div>

        {/* Diagnostics Info */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block">Model Konfigurasi (Aturan 6):</span>
            <span className="font-mono font-semibold text-emerald-400">{GEMINI_MODEL_NAME}</span>
          </div>
          <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block">Schema Version (Aturan 8):</span>
            <span className="font-mono font-semibold text-teal-400">
              version {storageDiag.schema_version ?? CURRENT_SCHEMA_VERSION} ({storageDiag.count} item)
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Sandbox: Uji Langsung Perhitungan Tanggal Murni */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal-400" />
          <h3 className="font-bold text-xs text-white">Sandbox Pengujian Tanggal (Kode Murni)</h3>
        </div>
        <p className="text-[11px] text-slate-400">
          Uji perhitungan jarak hari secara deterministik tanpa AI. Pilih momen atau masukkan nama momen/tanggal.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={sandboxMomen}
            onChange={(e) => setSandboxMomen(e.target.value)}
            placeholder="Ketik: natal, ramadhan, halloween, atau 2026-12-31"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            style={{ fontSize: '16px' }}
          />
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Jarak Hari Dihitung Kode:</span>
            <span className="font-mono font-bold text-emerald-400">
              {sandboxDaysResult !== undefined ? `+${sandboxDaysResult} hari dari sekarang` : 'Momen tidak dikenal'}
            </span>
          </div>
        </div>
      </div>

      {/* Test List Cards */}
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-slate-400 px-1">Rincian Hasil Uji Unit:</span>
        {results.map((test) => (
          <div
            key={test.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5 shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {test.status === 'berhasil' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-bold text-xs text-white">{test.namaTes}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {test.kategori}
              </span>
            </div>
            <p className="text-xs text-slate-300 pl-6 leading-relaxed">{test.pesan}</p>
            {test.detail && (
              <div className="pl-6 pt-1">
                <pre className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80 overflow-x-auto whitespace-pre-wrap">
                  {test.detail}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
