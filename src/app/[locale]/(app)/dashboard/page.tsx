'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import {
  Sparkles,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  ShoppingBag,
  Coffee,
  ShieldAlert,
  PiggyBank,
  TrendingUp,
  Target,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  SlidersHorizontal,
  History,
  X,
  Loader2,
  Trash2,
  Info,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [balanceSummary, setBalanceSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bucket History Modal
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [bucketHistory, setBucketHistory] = useState<any[]>([]);
  const [isLoadingBucketHistory, setIsLoadingBucketHistory] = useState(false);

  // Cocokkan Saldo (Adjustment) Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjWalletId, setAdjWalletId] = useState('');
  const [actualBal, setActualBal] = useState<number | ''>('');
  const [shortfallPos, setShortfallPos] = useState<'LIVING' | 'PLAYING' | 'EMERGENCY'>('LIVING');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Voiding Transaction Modal
  const [voidTxId, setVoidTxId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('Salah input nominal');
  const [isVoiding, setIsVoiding] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        fetch('/api/ledger/balance'),
        fetch('/api/transactions?limit=15'),
      ]);

      if (balRes.ok) {
        const balJson = await balRes.json();
        setBalanceSummary(balJson.data);
        if (balJson.data?.wallets?.length > 0 && !adjWalletId) {
          setAdjWalletId(balJson.data.wallets[0].id);
        }
      }

      if (txRes.ok) {
        const txJson = await txRes.json();
        setTransactions(txJson.data?.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Open Bucket History Drawer
  const handleOpenBucketHistory = async (pos: string) => {
    setActiveBucket(pos);
    setIsLoadingBucketHistory(true);
    try {
      const res = await fetch(`/api/ledger/bucket/${pos}`);
      if (res.ok) {
        const json = await res.json();
        setBucketHistory(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBucketHistory(false);
    }
  };

  // Submit Adjustment (Cocokkan Saldo)
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjWalletId || actualBal === '') return;

    setIsSubmittingAdj(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADJUSTMENT',
          data: {
            walletId: adjWalletId,
            actualBalance: Number(actualBal),
            shortfallPos,
            note: 'Pencocokan saldo manual dari Dashboard',
          },
        }),
      });

      if (res.ok) {
        setIsAdjModalOpen(false);
        setActualBal('');
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // Submit Void Transaction
  const handleConfirmVoid = async () => {
    if (!voidTxId) return;
    setIsVoiding(true);
    try {
      const res = await fetch(`/api/transactions/${voidTxId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      });
      if (res.ok) {
        setVoidTxId(null);
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVoiding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-page">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
          <Loader2 className="tw-w-8 tw-h-8 tw-animate-spin tw-text-brand-primary" />
          <p className="tw-text-xs tw-text-muted">Memuat data keuangan...</p>
        </div>
      </div>
    );
  }

  const livingBudget = Number(balanceSummary?.layerMonth?.livingBudget || 0);
  const livingSpent = Number(balanceSummary?.layerMonth?.livingSpent || 0);
  const livingRemaining = livingBudget - livingSpent;
  const livingProgress = livingBudget > 0 ? Math.min(100, Math.round((livingSpent / livingBudget) * 100)) : 0;

  const playingBudget = Number(balanceSummary?.layerMonth?.playingBudget || 0);
  const playingSpent = Number(balanceSummary?.layerMonth?.playingSpent || 0);
  const playingRemaining = playingBudget - playingSpent;
  const playingProgress = playingBudget > 0 ? Math.min(100, Math.round((playingSpent / playingBudget) * 100)) : 0;

  const isInvariantBalanced = balanceSummary?.invariant?.isBalanced ?? true;
  const invariantDiff = balanceSummary?.invariant?.diff ?? '0';

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-page">
      <AppNavbar />

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-6xl tw-mx-auto tw-w-full tw-space-y-8">
        {/* Aesthetic Financial Freedom Hero Banner (Clean, Static, Unobstructed) */}
        <div className="tw-relative tw-rounded-3xl tw-overflow-hidden tw-border tw-border-emerald-700/20 tw-shadow-sm tw-bg-[#eef5eb] dark:tw-bg-[#18231a] tw-min-h-[200px] tw-flex tw-items-center">
          <div className="tw-absolute tw-inset-0 tw-pointer-events-none tw-overflow-hidden">
            <img
              src="/images/financial-freedom-banner.jpg"
              alt="Financial Freedom Illustration"
              className="tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-auto tw-max-w-[62%] tw-object-cover tw-object-right tw-opacity-100 dark:tw-opacity-40 tw-transform-none tw-transition-none"
            />
            <div className="tw-absolute tw-inset-0 tw-bg-gradient-to-r tw-from-[#eef5eb] tw-from-35% tw-via-[#eef5eb]/80 tw-via-55% tw-to-transparent dark:tw-from-[#18231a] dark:tw-from-35% dark:tw-via-[#18231a]/80 dark:tw-via-55% dark:tw-to-transparent" />
          </div>

          <div className="tw-relative tw-z-10 tw-w-full tw-p-6 sm:tw-p-8 tw-flex tw-items-center">
            <div className="tw-max-w-md tw-space-y-3">
              <div className="tw-inline-flex tw-items-center tw-gap-2 tw-px-3 tw-py-1 tw-rounded-full tw-bg-emerald-800/10 dark:tw-bg-emerald-500/15 tw-border tw-border-emerald-800/20 tw-text-emerald-800 dark:tw-text-emerald-300 tw-text-xs tw-font-bold">
                <span>✨</span>
                <span>FINANCIAL FREEDOM · SAGE WELLNESS</span>
              </div>
              <h1 className="tw-text-2xl sm:tw-text-3xl tw-font-extrabold tw-text-heading tw-tracking-tight">
                Selamat Datang di WiseFinance 🌿
              </h1>
              <p className="tw-text-xs sm:tw-text-sm tw-text-muted tw-leading-relaxed">
                Jaga kebutuhan hidup, dana darurat, dan gaya hidup tetap seimbang menuju kebebasan finansial.
              </p>
              <div className="tw-flex tw-items-center tw-gap-3 tw-pt-1">
                <Link
                  href="/id/catat"
                  className="btn btn-primary tw-font-bold tw-px-5 tw-py-2.5 tw-rounded-xl tw-shadow-md hover:tw-shadow-lg tw-transition-all tw-whitespace-nowrap"
                >
                  ＋ Catat Transaksi
                </Link>
                <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-2 tw-rounded-xl tw-bg-white/85 dark:tw-bg-surface/85 tw-border tw-border-border tw-text-xs tw-font-semibold tw-shadow-xs">
                  <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-emerald-600" />
                  100% Terarah
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Invariant & Balance Banner */}
        <div
          className={`tw-p-5 tw-rounded-2xl tw-border tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-4 tw-shadow-sm ${
            isInvariantBalanced
              ? 'tw-bg-brand-primary/5 tw-border-brand-primary/20'
              : 'tw-bg-amber-500/10 tw-border-amber-500/30'
          }`}
        >
          <div className="tw-flex tw-items-center tw-gap-3.5">
            <div
              className={`tw-w-10 tw-h-10 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shrink-0 ${
                isInvariantBalanced
                  ? 'tw-bg-brand-primary/10 tw-text-brand-primary'
                  : 'tw-bg-amber-500/20 tw-text-amber-800'
              }`}
            >
              {isInvariantBalanced ? <CheckCircle2 className="tw-w-5 tw-h-5" /> : <AlertCircle className="tw-w-5 tw-h-5" />}
            </div>
            <div>
              <div className="tw-flex tw-items-center tw-gap-2">
                <p className="tw-text-sm tw-font-bold tw-text-heading">
                  {isInvariantBalanced
                    ? 'Buku Kas Seimbang (Invarian Terpenuhi)'
                    : 'Peringatan: Ada Selisih Saldo'}
                </p>
                <span className="tw-text-[11px] tw-font-mono tw-px-2 tw-py-0.5 tw-rounded tw-bg-surface tw-border tw-border-border">
                  Selisih: Rp {Number(invariantDiff).toLocaleString('id-ID')}
                </span>
              </div>
              <p className="tw-text-xs tw-text-muted tw-mt-0.5">
                Total Dompet: <strong>Rp {Number(balanceSummary?.totalWallets || 0).toLocaleString('id-ID')}</strong> = Uang Bulan Ini (Rp {Number(balanceSummary?.layerMonth?.total || 0).toLocaleString('id-ID')}) + Uang Tersimpan (Rp {Number(balanceSummary?.layerStored?.total || 0).toLocaleString('id-ID')})
              </p>
            </div>
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            <button
              type="button"
              onClick={() => setIsAdjModalOpen(true)}
              className="btn btn-sm btn-outline-primary tw-font-semibold tw-rounded-xl tw-whitespace-nowrap"
            >
              <SlidersHorizontal className="tw-w-3.5 tw-h-3.5 tw-inline tw-mr-1.5" />
              Cocokkan Saldo
            </button>
            <Link
              href="/id/catat"
              className="btn btn-sm btn-primary tw-font-semibold tw-rounded-xl tw-whitespace-nowrap"
            >
              <PlusCircle className="tw-w-3.5 tw-h-3.5 tw-inline tw-mr-1.5" />
              Catat
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LAPISAN 1: UANG BULAN INI (Living & Playing) */}
        {/* ============================================================== */}
        <section className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between">
            <div className="tw-flex tw-items-center tw-gap-2">
              <span className="tw-w-3 tw-h-3 tw-rounded-full" style={{ backgroundColor: 'var(--layer-month-indicator)' }} />
              <h2 className="tw-text-lg tw-font-bold tw-text-heading">Lapisan 1: Uang Bulan Ini</h2>
            </div>
            <span className="tw-text-xs tw-text-muted tw-font-mono">
              Total: Rp {Number(balanceSummary?.layerMonth?.total || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
            {/* POS LIVING (45%) */}
            <div
              className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm"
              style={{ borderLeft: '5px solid var(--pos-living)' }}
            >
              <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
                <div className="tw-flex tw-items-center tw-gap-2" style={{ color: 'var(--pos-living)' }}>
                  <ShoppingBag className="tw-w-5 tw-h-5" />
                  <h3 className="tw-text-sm tw-font-bold tw-tracking-wide">POS LIVING (KEBUTUHAN)</h3>
                </div>
                <span className={`tw-text-xs tw-font-bold tw-px-2 tw-py-0.5 tw-rounded ${livingRemaining < 0 ? 'tw-bg-red-500/10 tw-text-red-600' : 'tw-bg-page tw-text-muted'}`}>
                  {livingRemaining < 0 ? 'Defisit' : `${100 - livingProgress}% Sisa`}
                </span>
              </div>

              <div className="tw-flex tw-items-baseline tw-justify-between tw-mb-2">
                <div>
                  <span className="tw-text-xs tw-text-muted">Sisa Anggaran:</span>
                  <p className={`tw-text-2xl tw-font-extrabold tw-font-mono tw-mt-0.5 ${livingRemaining < 0 ? 'tw-text-red-600' : 'tw-text-heading'}`}>
                    Rp {livingRemaining.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="tw-text-right">
                  <span className="tw-text-xs tw-text-muted">Total Anggaran:</span>
                  <p className="tw-text-sm tw-font-bold tw-font-mono tw-text-muted">
                    Rp {livingBudget.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress tw-h-2 tw-rounded-full tw-bg-page tw-mb-2">
                <div
                  className={`progress-bar ${livingRemaining < 0 ? 'bg-danger' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, livingProgress)}%` }}
                />
              </div>

              <div className="tw-flex tw-justify-between tw-text-[11px] tw-text-muted">
                <span>Terpakai: Rp {livingSpent.toLocaleString('id-ID')}</span>
                <span>Porsi: 45%</span>
              </div>

              {livingRemaining < 0 && (
                <div className="tw-mt-3 tw-p-2.5 tw-rounded-xl tw-bg-red-500/10 tw-text-red-700 tw-text-xs tw-flex tw-items-center tw-gap-2">
                  <Info className="tw-w-4 tw-h-4 tw-shrink-0" />
                  <span>Saran Wise: Living minus dapat ditutup dari pos Playing atau pemasukan baru periode ini.</span>
                </div>
              )}
            </div>

            {/* POS PLAYING (15%) */}
            <div
              className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm"
              style={{ borderLeft: '5px solid var(--pos-playing)' }}
            >
              <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
                <div className="tw-flex tw-items-center tw-gap-2" style={{ color: 'var(--pos-playing)' }}>
                  <Coffee className="tw-w-5 tw-h-5" />
                  <h3 className="tw-text-sm tw-font-bold tw-tracking-wide">POS PLAYING (GAYA HIDUP)</h3>
                </div>
                <span className={`tw-text-xs tw-font-bold tw-px-2 tw-py-0.5 tw-rounded ${playingRemaining < 0 ? 'tw-bg-red-500/10 tw-text-red-600' : 'tw-bg-page tw-text-muted'}`}>
                  {playingRemaining < 0 ? 'Defisit' : `${100 - playingProgress}% Sisa`}
                </span>
              </div>

              <div className="tw-flex tw-items-baseline tw-justify-between tw-mb-2">
                <div>
                  <span className="tw-text-xs tw-text-muted">Sisa Anggaran:</span>
                  <p className={`tw-text-2xl tw-font-extrabold tw-font-mono tw-mt-0.5 ${playingRemaining < 0 ? 'tw-text-red-600' : 'tw-text-heading'}`}>
                    Rp {playingRemaining.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="tw-text-right">
                  <span className="tw-text-xs tw-text-muted">Total Anggaran:</span>
                  <p className="tw-text-sm tw-font-bold tw-font-mono tw-text-muted">
                    Rp {playingBudget.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress tw-h-2 tw-rounded-full tw-bg-page tw-mb-2">
                <div
                  className={`progress-bar ${playingRemaining < 0 ? 'bg-danger' : 'bg-warning'}`}
                  style={{ width: `${Math.min(100, playingProgress)}%` }}
                />
              </div>

              <div className="tw-flex tw-justify-between tw-text-[11px] tw-text-muted">
                <span>Terpakai: Rp {playingSpent.toLocaleString('id-ID')}</span>
                <span>Porsi: 15%</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* LAPISAN 2: UANG TERSIMPAN (Saving Buckets) */}
        {/* ============================================================== */}
        <section className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between">
            <div className="tw-flex tw-items-center tw-gap-2">
              <span className="tw-w-3 tw-h-3 tw-rounded-full" style={{ backgroundColor: 'var(--layer-stored-indicator)' }} />
              <h2 className="tw-text-lg tw-font-bold tw-text-heading">Lapisan 2: Uang Tersimpan (Bucket Tabungan)</h2>
            </div>
            <span className="tw-text-xs tw-text-muted tw-font-mono">
              Total: Rp {Number(balanceSummary?.layerStored?.total || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
            {[
              {
                pos: 'EMERGENCY',
                label: 'Dana Darurat',
                desc: 'Aman untuk musibah/medis',
                val: balanceSummary?.layerStored?.emergency || 0,
                color: 'var(--pos-emergency)',
                icon: ShieldAlert,
              },
              {
                pos: 'SAVINGS',
                label: 'Tabungan Rutin',
                desc: 'Tabungan jangka pendek/menengah',
                val: balanceSummary?.layerStored?.savings || 0,
                color: 'var(--pos-saving)',
                icon: PiggyBank,
              },
              {
                pos: 'INVESTMENT',
                label: 'Investasi',
                desc: 'Portofolio aset produktif',
                val: balanceSummary?.layerStored?.investment || 0,
                color: 'var(--pos-investment)',
                icon: TrendingUp,
              },
              {
                pos: 'GOALS',
                label: 'Tujuan (Goals)',
                desc: 'Impian & target terencana',
                val: balanceSummary?.layerStored?.goals || 0,
                color: 'var(--pos-goals)',
                icon: Target,
              },
            ].map((bucket) => {
              const Icon = bucket.icon;
              return (
                <div
                  key={bucket.pos}
                  onClick={() => handleOpenBucketHistory(bucket.pos)}
                  className="card tw-p-5 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm hover:tw-shadow-md tw-cursor-pointer tw-transition-all tw-group"
                  style={{ borderLeft: `4px solid ${bucket.color}` }}
                >
                  <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
                    <div className="tw-flex tw-items-center tw-gap-2" style={{ color: bucket.color }}>
                      <Icon className="tw-w-4 tw-h-4" />
                      <h3 className="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide">
                        {bucket.label}
                      </h3>
                    </div>
                    <History className="tw-w-4 tw-h-4 tw-text-muted group-hover:tw-text-heading tw-transition-colors" />
                  </div>
                  <p className="tw-text-xl tw-font-bold tw-font-mono tw-text-heading">
                    Rp {Number(bucket.val).toLocaleString('id-ID')}
                  </p>
                  <p className="tw-text-[11px] tw-text-muted tw-mt-1">{bucket.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================== */}
        {/* DOMPET (WALLETS) SUMMARY */}
        {/* ============================================================== */}
        <section className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between">
            <h2 className="tw-text-lg tw-font-bold tw-text-heading">Daftar Dompet</h2>
            <span className="tw-text-xs tw-text-muted">
              {balanceSummary?.wallets?.length || 0} dompet terdaftar
            </span>
          </div>

          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-4">
            {balanceSummary?.wallets?.map((w: any) => (
              <div
                key={w.id}
                className="tw-p-4 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-flex tw-items-center tw-justify-between"
              >
                <div>
                  <span className="tw-text-xs tw-text-muted tw-block">{w.type}</span>
                  <p className="tw-text-sm tw-font-bold tw-text-heading">{w.name}</p>
                </div>
                <p className="tw-text-base tw-font-bold tw-font-mono tw-text-brand-primary">
                  Rp {Number(w.balance).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* RIWAYAT TRANSAKSI TERKINI */}
        {/* ============================================================== */}
        <section className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between">
            <h2 className="tw-text-lg tw-font-bold tw-text-heading">Riwayat Transaksi</h2>
            <Link href="/id/laporan" className="tw-text-xs tw-text-brand-primary tw-font-semibold hover:tw-underline">
              Lihat Semua Laporan
            </Link>
          </div>

          <div className="card tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-overflow-hidden">
            {transactions.length === 0 ? (
              <div className="tw-p-8 tw-text-center tw-text-muted tw-text-xs">
                Belum ada transaksi tercatat. Mulai catat transaksi pertamamu!
              </div>
            ) : (
              <div className="tw-divide-y tw-divide-border">
                {transactions.map((tx) => {
                  const isVoided = tx.status === 'VOIDED';
                  const isIncome = tx.type === 'INCOME';
                  const isExpense = tx.type === 'EXPENSE';
                  const isTransfer = tx.type === 'TRANSFER';

                  return (
                    <div
                      key={tx.id}
                      className={`tw-p-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-3 hover:tw-bg-page/50 tw-transition-colors ${
                        isVoided ? 'tw-opacity-40 tw-line-through' : ''
                      }`}
                    >
                      <div className="tw-flex tw-items-center tw-gap-3">
                        <div
                          className={`tw-w-9 tw-h-9 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shrink-0 ${
                            isIncome
                              ? 'tw-bg-green-500/10 tw-text-green-600'
                              : isExpense
                              ? 'tw-bg-red-500/10 tw-text-red-600'
                              : 'tw-bg-blue-500/10 tw-text-blue-600'
                          }`}
                        >
                          {isIncome && <ArrowDownLeft className="tw-w-4 tw-h-4" />}
                          {isExpense && <ArrowUpRight className="tw-w-4 tw-h-4" />}
                          {isTransfer && <Repeat className="tw-w-4 tw-h-4" />}
                        </div>
                        <div>
                          <div className="tw-flex tw-items-center tw-gap-2">
                            <span className="tw-text-sm tw-font-bold tw-text-heading">
                              {tx.title}
                            </span>
                            {tx.isOverBudget && (
                              <span className="badge bg-warning-subtle text-warning tw-text-[10px]">
                                Melebihi Anggaran
                              </span>
                            )}
                            {tx.emergencyFlag === 'OUTSIDE_EMERGENCY' && (
                              <span className="badge bg-danger-subtle text-danger tw-text-[10px]">
                                Di Luar Darurat
                              </span>
                            )}
                            {isVoided && (
                              <span className="badge bg-secondary text-white tw-text-[10px]">
                                Dibatalkan
                              </span>
                            )}
                          </div>
                          <p className="tw-text-[11px] tw-text-muted tw-mt-0.5">
                            {new Date(tx.date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            • {tx.walletEntries?.map((w: any) => w.walletName).join(', ')}
                            {tx.category ? ` • ${tx.category.name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="tw-flex tw-items-center tw-justify-between sm:tw-justify-end tw-gap-4">
                        <span
                          className={`tw-text-base tw-font-bold tw-font-mono ${
                            isIncome
                              ? 'tw-text-green-600'
                              : isExpense
                              ? 'tw-text-red-600'
                              : 'tw-text-blue-600'
                          }`}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}Rp{' '}
                          {Number(tx.amount).toLocaleString('id-ID')}
                        </span>

                        {!isVoided && tx.type !== 'OPENING' && (
                          <button
                            type="button"
                            onClick={() => setVoidTxId(tx.id)}
                            className="btn btn-sm btn-outline-danger tw-p-1.5 tw-rounded-lg"
                            title="Batalkan Transaksi (Void)"
                          >
                            <Trash2 className="tw-w-3.5 tw-h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* DRAWER / MODAL: RIWAYAT ASAL UANG BUCKET */}
      {/* ============================================================== */}
      {activeBucket && (
        <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
          <div className="card tw-w-full tw-max-w-lg tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-max-h-[85vh] tw-flex tw-flex-col">
            <div className="tw-flex tw-items-center tw-justify-between tw-pb-4 tw-border-b tw-border-border tw-mb-4">
              <div>
                <h3 className="tw-text-base tw-font-bold tw-text-heading">
                  Riwayat Asal Uang: {activeBucket}
                </h3>
                <p className="tw-text-xs tw-text-muted">
                  Jejak sumber dana dan pemakaian yang tercatat di ledger
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveBucket(null)}
                className="btn btn-sm btn-outline-secondary tw-p-1.5 tw-rounded-lg"
              >
                <X className="tw-w-4 tw-h-4" />
              </button>
            </div>

            <div className="tw-flex-1 tw-overflow-y-auto tw-space-y-3">
              {isLoadingBucketHistory ? (
                <div className="tw-p-8 tw-text-center">
                  <Loader2 className="tw-w-6 tw-h-6 tw-animate-spin tw-mx-auto tw-text-brand-primary" />
                </div>
              ) : bucketHistory.length === 0 ? (
                <p className="tw-text-xs tw-text-muted tw-text-center tw-py-8">
                  Belum ada entri tercatat untuk pos ini.
                </p>
              ) : (
                bucketHistory.map((item) => (
                  <div
                    key={item.id}
                    className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border tw-flex tw-items-center tw-justify-between"
                  >
                    <div>
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-text-xs tw-font-bold tw-text-heading">{item.title}</span>
                        <span className="badge bg-secondary-subtle text-secondary tw-text-[9px]">
                          {item.source}
                        </span>
                      </div>
                      <p className="tw-text-[11px] tw-text-muted tw-mt-0.5">
                        {new Date(item.date).toLocaleDateString('id-ID')}
                        {item.note ? ` • ${item.note}` : ''}
                      </p>
                    </div>
                    <span
                      className={`tw-text-sm tw-font-bold tw-font-mono ${
                        Number(item.amountBase) >= 0 ? 'tw-text-green-600' : 'tw-text-red-600'
                      }`}
                    >
                      {Number(item.amountBase) >= 0 ? '+' : ''}Rp{' '}
                      {Number(item.amountBase).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: COCOKKAN SALDO (ADJUSTMENT) */}
      {/* ============================================================== */}
      {isAdjModalOpen && (
        <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
          <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-space-y-4">
            <div className="tw-flex tw-items-center tw-justify-between tw-pb-3 tw-border-b tw-border-border">
              <h3 className="tw-text-base tw-font-bold tw-text-heading">Cocokkan Saldo Dompet</h3>
              <button
                type="button"
                onClick={() => setIsAdjModalOpen(false)}
                className="btn btn-sm btn-outline-secondary tw-p-1.5 tw-rounded-lg"
              >
                <X className="tw-w-4 tw-h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="tw-space-y-4">
              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                  Pilih Dompet
                </label>
                <select
                  className="form-select tw-text-sm"
                  value={adjWalletId}
                  onChange={(e) => setAdjWalletId(e.target.value)}
                >
                  {balanceSummary?.wallets?.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Tercatat: Rp {Number(w.balance).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                  Saldo Riil / Fisik Saat Ini (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control tw-text-sm tw-font-mono tw-font-bold"
                  placeholder="0"
                  value={actualBal}
                  onChange={(e) => setActualBal(e.target.value ? Number(e.target.value) : '')}
                  required
                />
              </div>

              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                  Bila Saldo Riil Lebih Kecil (Ke mana uang ini?)
                </label>
                <select
                  className="form-select tw-text-sm"
                  value={shortfallPos}
                  onChange={(e) => setShortfallPos(e.target.value as any)}
                >
                  <option value="LIVING">Beban Pos Living (Kebutuhan)</option>
                  <option value="PLAYING">Beban Pos Playing (Jajan)</option>
                  <option value="EMERGENCY">Beban Dana Darurat</option>
                </select>
                <p className="tw-text-[11px] tw-text-muted tw-mt-1">
                  Selisih kurang akan dicatat sebagai pengeluaran tidak tercatat di pos tersebut. Tidak ada selisih yang menggantung.
                </p>
              </div>

              <div className="tw-flex tw-items-center tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-border">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="btn btn-outline-secondary btn-sm tw-rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj || actualBal === ''}
                  className="btn btn-primary btn-sm tw-rounded-xl tw-font-semibold"
                >
                  {isSubmittingAdj ? <Loader2 className="tw-w-3.5 tw-h-3.5 tw-animate-spin" /> : null}
                  <span>Simpan Penyesuaian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: KONFIRMASI BATALKAN TRANSAKSI (VOID) */}
      {/* ============================================================== */}
      {voidTxId && (
        <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
          <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-space-y-4">
            <h3 className="tw-text-base tw-font-bold tw-text-heading">Batalkan Transaksi (Void)</h3>
            <p className="tw-text-xs tw-text-muted">
              Transaksi tidak akan dihapus fisik dari database, melainkan dibatalkan dengan entri pembalik yang menormalkan kembali saldo dompet dan pos secara atomik.
            </p>

            <div>
              <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                Alasan Pembatalan
              </label>
              <input
                type="text"
                className="form-control tw-text-sm"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Alasan pembatalan..."
              />
            </div>

            <div className="tw-flex tw-items-center tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-border">
              <button
                type="button"
                onClick={() => setVoidTxId(null)}
                className="btn btn-outline-secondary btn-sm tw-rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleConfirmVoid}
                className="btn btn-danger btn-sm tw-rounded-xl tw-font-semibold"
              >
                {isVoiding ? <Loader2 className="tw-w-3.5 tw-h-3.5 tw-animate-spin" /> : null}
                <span>Ya, Batalkan Transaksi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
