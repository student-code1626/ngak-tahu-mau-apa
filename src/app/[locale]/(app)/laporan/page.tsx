'use client';

import React, { useState, useEffect } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export default function LaporanPage() {
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const json = await res.json();
          setReport(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, []);

  if (isLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-page">
        <Loader2 className="tw-w-8 tw-h-8 tw-animate-spin tw-text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-page">
      <AppNavbar />

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-6xl tw-mx-auto tw-w-full tw-space-y-8">
        <div>
          <h1 className="tw-text-2xl tw-font-bold tw-text-heading">Laporan & Analisis Keuangan</h1>
          <p className="tw-text-xs tw-text-muted">
            Ringkasan kekayaan bersih, arus kas, dan proporsi pengeluaran Living vs Playing
          </p>
        </div>

        {/* Net Worth Summary Card */}
        <div className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-4">
          <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-2">
            <div>
              <span className="tw-text-xs tw-text-muted">Total Kekayaan Bersih (Net Worth):</span>
              <p className="tw-text-3xl tw-font-black tw-font-mono tw-text-brand-primary tw-mt-1">
                Rp {Number(report?.netWorth?.netWorth || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <span className="tw-text-xs tw-text-muted">
              Rumus: Dompet + Aset - Hutang
            </span>
          </div>

          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-3 tw-pt-4 tw-border-t tw-border-border">
            <div className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border">
              <span className="tw-text-[11px] tw-text-muted">Saldo Dompet Kas</span>
              <p className="tw-text-base tw-font-bold tw-font-mono tw-mt-0.5">
                Rp {Number(report?.netWorth?.totalWallets || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border">
              <span className="tw-text-[11px] tw-text-muted">Nilai Total Aset</span>
              <p className="tw-text-base tw-font-bold tw-font-mono tw-mt-0.5 tw-text-green-600">
                +Rp {Number(report?.netWorth?.totalAssets || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border">
              <span className="tw-text-[11px] tw-text-muted">Kewajiban Hutang</span>
              <p className="tw-text-base tw-font-bold tw-font-mono tw-mt-0.5 tw-text-red-600">
                -Rp {Number(report?.netWorth?.totalDebts || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section: Living vs Playing Trend & Cashflow */}
        <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
          {/* Chart 1: Living vs Playing Spend Trend */}
          <div className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-4">
            <div className="tw-flex tw-items-center tw-justify-between">
              <h2 className="tw-text-sm tw-font-bold tw-text-heading">Trend Living vs Playing</h2>
              <span className="tw-text-xs tw-text-muted">6 Bulan Terakhir</span>
            </div>

            <div className="tw-h-64 tw-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="living" name="Living (Kebutuhan)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="playing" name="Playing (Jajan)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Cashflow (Pemasukan vs Pengeluaran) */}
          <div className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-4">
            <div className="tw-flex tw-items-center tw-justify-between">
              <h2 className="tw-text-sm tw-font-bold tw-text-heading">Arus Kas (Masuk vs Keluar)</h2>
              <span className="tw-text-xs tw-text-muted">6 Bulan Terakhir</span>
            </div>

            <div className="tw-h-64 tw-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

