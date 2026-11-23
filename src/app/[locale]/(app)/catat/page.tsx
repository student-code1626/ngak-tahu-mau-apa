'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppNavbar } from '@/components/layout/AppNavbar';
import {
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Wallet,
  ShoppingBag,
  Coffee,
  ShieldAlert,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import { splitIncome, IncomeType } from '@/domain/split/income-splitter';
import { evaluateEmergencyExpense } from '@/domain/rules/emergency-evaluator';
import { Money } from '@/domain/money/money';

export default function CatatPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Common data
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<any>(null);

  // Form Fields
  const [amount, setAmount] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [walletId, setWalletId] = useState('');

  // INCOME Specific
  const [incomeType, setIncomeType] = useState<IncomeType>('ROUTINE');

  // EXPENSE Specific
  const [categoryId, setCategoryId] = useState('');
  const [selectedPos, setSelectedPos] = useState<'LIVING' | 'PLAYING' | 'EMERGENCY' | 'SAVINGS'>('LIVING');
  const [isMultiPos, setIsMultiPos] = useState(false);
  const [multiAllocations, setMultiAllocations] = useState<{ [pos: string]: number }>({
    LIVING: 0,
    PLAYING: 0,
    EMERGENCY: 0,
    SAVINGS: 0,
  });

  // TRANSFER Specific
  const [transferType, setTransferType] = useState<'WALLET_TO_WALLET' | 'BUCKET_TO_BUCKET'>('WALLET_TO_WALLET');
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [adminFee, setAdminFee] = useState<number | ''>(0);
  const [fromPos, setFromPos] = useState<'LIVING' | 'PLAYING' | 'EMERGENCY' | 'SAVINGS' | 'INVESTMENT' | 'GOALS'>('LIVING');
  const [toPos, setToPos] = useState<'LIVING' | 'PLAYING' | 'EMERGENCY' | 'SAVINGS' | 'INVESTMENT' | 'GOALS'>('SAVINGS');

  // Load balances, wallets, categories
  useEffect(() => {
    async function loadData() {
      try {
        const [balRes, catRes] = await Promise.all([
          fetch('/api/ledger/balance'),
          fetch('/api/categories'),
        ]);

        if (balRes.ok) {
          const balJson = await balRes.json();
          if (balJson.data) {
            setBalanceSummary(balJson.data);
            setWallets(balJson.data.wallets || []);
            if (balJson.data.wallets?.length > 0) {
              setWalletId(balJson.data.wallets[0].id);
              setFromWalletId(balJson.data.wallets[0].id);
              if (balJson.data.wallets.length > 1) {
                setToWalletId(balJson.data.wallets[1].id);
              }
            }
          }
        }

        if (catRes.ok) {
          const catJson = await catRes.json();
          if (catJson.data) {
            setCategories(catJson.data);
            if (catJson.data.length > 0) {
              setCategoryId(catJson.data[0].id);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  // Income preview split calculation
  const numAmount = Number(amount) || 0;
  const incomeSplitPreview = numAmount > 0 && activeTab === 'INCOME' ? splitIncome(Money.from(numAmount), incomeType) : null;

  // Emergency heuristic evaluation for Expense
  const emergencyEval = activeTab === 'EXPENSE' && (selectedPos === 'EMERGENCY' || multiAllocations.EMERGENCY > 0)
    ? evaluateEmergencyExpense(
        title,
        categories.find((c) => c.id === categoryId)?.name,
        note
      )
    : null;

  // Over-budget check for Expense
  let isOverBudgetPreview = false;
  if (activeTab === 'EXPENSE' && balanceSummary && numAmount > 0) {
    if (selectedPos === 'LIVING') {
      const budget = Number(balanceSummary.layerMonth?.livingBudget || 0);
      const spent = Number(balanceSummary.layerMonth?.livingSpent || 0);
      if (spent + numAmount > budget) isOverBudgetPreview = true;
    } else if (selectedPos === 'PLAYING') {
      const budget = Number(balanceSummary.layerMonth?.playingBudget || 0);
      const spent = Number(balanceSummary.layerMonth?.playingSpent || 0);
      if (spent + numAmount > budget) isOverBudgetPreview = true;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      setErrorMsg('Masukkan nominal transaksi yang valid');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (activeTab === 'INCOME') {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'INCOME',
            data: {
              walletId,
              amount: numAmount,
              incomeType,
              title: title || (incomeType === 'ROUTINE' ? 'Gaji / Pemasukan Rutin' : 'Pemasukan Lainnya'),
              note,
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);
        setSuccessMsg(`Pemasukan Rp ${numAmount.toLocaleString('id-ID')} berhasil dicatat & dibagi ke pos!`);
      } else if (activeTab === 'EXPENSE') {
        const posSources = isMultiPos
          ? Object.entries(multiAllocations)
              .filter(([_, val]) => Number(val) > 0)
              .map(([pos, val]) => ({ pos, amount: Number(val) }))
          : [{ pos: selectedPos, amount: numAmount }];

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'EXPENSE',
            data: {
              walletId,
              categoryId: categoryId || undefined,
              amount: numAmount,
              title: title || 'Pengeluaran',
              note,
              posSources,
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);
        setSuccessMsg(`Pengeluaran Rp ${numAmount.toLocaleString('id-ID')} berhasil dicatat.`);
      } else if (activeTab === 'TRANSFER') {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'TRANSFER',
            data: {
              transferType,
              amount: numAmount,
              title: title || (transferType === 'WALLET_TO_WALLET' ? 'Transfer Antar Dompet' : `Pindah ${fromPos} ke ${toPos}`),
              note: transferType === 'BUCKET_TO_BUCKET' ? note : (note || 'Transfer'),
              fromWalletId: transferType === 'WALLET_TO_WALLET' ? fromWalletId : undefined,
              toWalletId: transferType === 'WALLET_TO_WALLET' ? toWalletId : undefined,
              adminFee: transferType === 'WALLET_TO_WALLET' ? Number(adminFee) || 0 : undefined,
              fromPos: transferType === 'BUCKET_TO_BUCKET' ? fromPos : undefined,
              toPos: transferType === 'BUCKET_TO_BUCKET' ? toPos : undefined,
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);
        setSuccessMsg(`Pemindahan uang Rp ${numAmount.toLocaleString('id-ID')} berhasil dicatat.`);
      }

      // Reset form
      setAmount('');
      setTitle('');
      setNote('');
      setTimeout(() => router.push('/id/dashboard'), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-page">
      <AppNavbar />

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-3xl tw-mx-auto tw-w-full">
        <div className="tw-mb-6">
          <h1 className="tw-text-2xl tw-font-bold tw-text-heading">Catat Transaksi</h1>
          <p className="tw-text-xs tw-text-muted">
            Satu form terpadu untuk Pemasukan, Pengeluaran, dan Pemindahan uang
          </p>
        </div>

        {/* Action Tabs: Masuk / Keluar / Pindahkan */}
        <div className="tw-grid tw-grid-cols-3 tw-p-1 tw-bg-surface tw-border tw-border-border tw-rounded-2xl tw-mb-6 tw-shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('EXPENSE')}
            className={`tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-all ${
              activeTab === 'EXPENSE'
                ? 'tw-bg-red-500/10 tw-text-red-700 tw-shadow-sm'
                : 'tw-text-muted hover:tw-text-heading'
            }`}
          >
            <ArrowUpRight className="tw-w-4 tw-h-4" />
            <span>Keluar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INCOME')}
            className={`tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-all ${
              activeTab === 'INCOME'
                ? 'tw-bg-green-500/10 tw-text-green-700 tw-shadow-sm'
                : 'tw-text-muted hover:tw-text-heading'
            }`}
          >
            <ArrowDownLeft className="tw-w-4 tw-h-4" />
            <span>Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRANSFER')}
            className={`tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-all ${
              activeTab === 'TRANSFER'
                ? 'tw-bg-brand-primary/10 tw-text-brand-primary tw-shadow-sm'
                : 'tw-text-muted hover:tw-text-heading'
            }`}
          >
            <Repeat className="tw-w-4 tw-h-4" />
            <span>Pindahkan</span>
          </button>
        </div>

        {successMsg && (
          <div className="alert alert-success tw-text-xs tw-p-4 tw-rounded-2xl tw-flex tw-items-center tw-gap-2.5 tw-mb-6">
            <CheckCircle2 className="tw-w-5 tw-h-5 tw-shrink-0" />
            <span>{successMsg} Dialihkan ke Dashboard...</span>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-danger tw-text-xs tw-p-4 tw-rounded-2xl tw-flex tw-items-center tw-gap-2.5 tw-mb-6">
            <AlertCircle className="tw-w-5 tw-h-5 tw-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Unified Form Card */}
        <form onSubmit={handleSubmit} className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-5">
          {/* 1. Nominal (Amount) Input */}
          <div>
            <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
              Nominal Transaksi (Rp) <span className="tw-text-red-500">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text tw-bg-page tw-font-bold tw-text-sm">Rp</span>
              <input
                type="number"
                min="1"
                step="any"
                className="form-control form-control-lg tw-font-mono tw-font-bold tw-text-xl"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
            {numAmount > 0 && (
              <p className="tw-text-xs tw-text-brand-primary tw-font-mono tw-mt-1">
                Terbilang: Rp {numAmount.toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* 2. Judul & Catatan */}
          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
            <div>
              <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                Judul / Keterangan
              </label>
              <input
                type="text"
                className="form-control tw-text-sm"
                placeholder={
                  activeTab === 'INCOME'
                    ? 'Contoh: Gaji Bulanan, Bonus Proyek'
                    : activeTab === 'EXPENSE'
                    ? 'Contoh: Makan Siang, Beli Obat'
                    : 'Contoh: Topup GoPay dari BCA'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                className="form-control tw-text-sm"
                placeholder="Catatan detail..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* TAB 1: KELUAR (EXPENSE) FIELDS */}
          {activeTab === 'EXPENSE' && (
            <div className="tw-space-y-5 tw-pt-2 tw-border-t tw-border-border">
              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                {/* Dompet Pembayaran */}
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Dompet Sumber Pembayaran
                  </label>
                  <select
                    className="form-select tw-text-sm"
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori */}
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Kategori Pengeluaran
                  </label>
                  <select
                    className="form-select tw-text-sm"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pos Sumber Dana */}
              <div>
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading tw-mb-0">
                    Pos Sumber Anggaran
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMultiPos(!isMultiPos)}
                    className="tw-text-xs tw-text-brand-primary tw-font-semibold hover:tw-underline"
                  >
                    {isMultiPos ? 'Mode Satu Pos' : 'Bagi ke Beberapa Pos'}
                  </button>
                </div>

                {!isMultiPos ? (
                  <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-2.5">
                    {[
                      {
                        pos: 'LIVING',
                        label: 'Pos Living',
                        sisa: balanceSummary?.layerMonth?.livingBudget
                          ? Number(balanceSummary.layerMonth.livingBudget) - Number(balanceSummary.layerMonth.livingSpent)
                          : 0,
                        color: 'var(--pos-living)',
                      },
                      {
                        pos: 'PLAYING',
                        label: 'Pos Playing',
                        sisa: balanceSummary?.layerMonth?.playingBudget
                          ? Number(balanceSummary.layerMonth.playingBudget) - Number(balanceSummary.layerMonth.playingSpent)
                          : 0,
                        color: 'var(--pos-playing)',
                      },
                      {
                        pos: 'EMERGENCY',
                        label: 'Dana Darurat',
                        sisa: Number(balanceSummary?.layerStored?.emergency || 0),
                        color: 'var(--pos-emergency)',
                      },
                      {
                        pos: 'SAVINGS',
                        label: 'Tabungan',
                        sisa: Number(balanceSummary?.layerStored?.savings || 0),
                        color: 'var(--pos-saving)',
                      },
                    ].map((item) => (
                      <button
                        key={item.pos}
                        type="button"
                        onClick={() => setSelectedPos(item.pos as any)}
                        className={`tw-p-3 tw-rounded-xl tw-border tw-text-left tw-transition-all ${
                          selectedPos === item.pos
                            ? 'tw-border-brand-primary tw-bg-brand-primary/5 tw-ring-2 tw-ring-brand-primary/20'
                            : 'tw-border-border tw-bg-page hover:tw-border-border-dark'
                        }`}
                      >
                        <span className="tw-text-xs tw-font-bold tw-block" style={{ color: item.color }}>
                          {item.label}
                        </span>
                        <span className="tw-text-[11px] tw-text-muted tw-block tw-mt-0.5">
                          Sisa: Rp {item.sisa.toLocaleString('id-ID')}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="tw-space-y-3 tw-p-4 tw-rounded-xl tw-bg-page tw-border tw-border-border">
                    <p className="tw-text-xs tw-text-muted">
                      Tentukan jumlah yang dibayar dari masing-masing pos:
                    </p>
                    <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-3">
                      <div>
                        <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-living)' }}>
                          Living (Kebutuhan)
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm tw-font-mono"
                          value={multiAllocations.LIVING}
                          onChange={(e) =>
                            setMultiAllocations({ ...multiAllocations, LIVING: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-playing)' }}>
                          Playing (Jajan)
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm tw-font-mono"
                          value={multiAllocations.PLAYING}
                          onChange={(e) =>
                            setMultiAllocations({ ...multiAllocations, PLAYING: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-emergency)' }}>
                          Dana Darurat
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm tw-font-mono"
                          value={multiAllocations.EMERGENCY}
                          onChange={(e) =>
                            setMultiAllocations({ ...multiAllocations, EMERGENCY: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-saving)' }}>
                          Tabungan
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm tw-font-mono"
                          value={multiAllocations.SAVINGS}
                          onChange={(e) =>
                            setMultiAllocations({ ...multiAllocations, SAVINGS: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Over-budget Warning Badge */}
              {isOverBudgetPreview && (
                <div className="alert alert-warning tw-text-xs tw-p-3 tw-rounded-xl tw-flex tw-items-center tw-gap-2">
                  <AlertCircle className="tw-w-4 tw-h-4 tw-shrink-0" />
                  <span>
                    <strong>Peringatan Melebihi Anggaran:</strong> Pengeluaran ini akan membuat pos {selectedPos} defisit. Transaksi tetap akan disimpan dan ditandai &apos;melebihi anggaran&apos;.
                  </span>
                </div>
              )}

              {/* Emergency Heuristic Warning Badge */}
              {emergencyEval && emergencyEval.flag === 'OUTSIDE_EMERGENCY' && (
                <div className="alert alert-warning tw-text-xs tw-p-3 tw-rounded-xl tw-flex tw-items-center tw-gap-2">
                  <ShieldAlert className="tw-w-4 tw-h-4 tw-shrink-0" />
                  <div>
                    <strong>Peringatan Wise (Di Luar Kebutuhan Darurat):</strong> {emergencyEval.reason} Transaksi tetap diizinkan disimpan.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MASUK (INCOME) FIELDS */}
          {activeTab === 'INCOME' && (
            <div className="tw-space-y-5 tw-pt-2 tw-border-t tw-border-border">
              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                {/* Dompet Penerima */}
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Dompet Tujuan Penerimaan
                  </label>
                  <select
                    className="form-select tw-text-sm"
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenis Pemasukan */}
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Jenis Pemasukan
                  </label>
                  <select
                    className="form-select tw-text-sm"
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value as IncomeType)}
                  >
                    <option value="ROUTINE">Rutin (Gaji, Uang Saku) — 40/45/15</option>
                    <option value="IRREGULAR">Tidak Tentu (Bonus, Freelance) — 70/20/10</option>
                    <option value="TRANSFER_IN">Transfer Masuk dari Orang Lain</option>
                    <option value="NON_INCOME">Bukan Pendapatan (Pinjaman, Titipan, Pengembalian)</option>
                  </select>
                </div>
              </div>

              {/* Split Summary Pop-up/Preview */}
              {incomeSplitPreview && !incomeSplitPreview.isNonIncome && (
                <div className="tw-p-4 tw-rounded-xl tw-border tw-border-border tw-bg-page tw-space-y-3">
                  <div className="tw-flex tw-items-center tw-justify-between">
                    <span className="tw-text-xs tw-font-bold tw-text-heading">
                      Pratinjau Pembagian Otomatis ke Pos
                    </span>
                    <span className="badge bg-success-subtle text-success tw-text-[10px]">
                      Satu Sumber Kebenaran
                    </span>
                  </div>

                  <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 tw-gap-2">
                    {incomeSplitPreview.allocations.map((alloc) => (
                      <div key={alloc.pos} className="tw-p-2 tw-rounded-lg tw-bg-surface tw-border tw-border-border">
                        <span className="tw-text-[10px] tw-text-muted tw-block">{alloc.label}</span>
                        <span className="tw-text-xs tw-font-bold tw-font-mono tw-text-heading">
                          Rp {alloc.amount.toNumber().toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incomeType === 'NON_INCOME' && (
                <div className="tw-p-3 tw-rounded-xl tw-bg-blue-500/10 tw-border tw-border-blue-500/30 tw-text-blue-900 tw-text-xs tw-flex tw-items-center tw-gap-2">
                  <Info className="tw-w-4 tw-h-4 tw-shrink-0" />
                  <span>
                    Pemasukan Non-Income tidak dibagi ke Living/Playing/Saving. Hanya menambah saldo dompet.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PINDAHKAN (TRANSFER) FIELDS */}
          {activeTab === 'TRANSFER' && (
            <div className="tw-space-y-5 tw-pt-2 tw-border-t tw-border-border">
              {/* Transfer Mode Toggle */}
              <div className="tw-flex tw-items-center tw-gap-3">
                <button
                  type="button"
                  onClick={() => setTransferType('WALLET_TO_WALLET')}
                  className={`btn btn-sm tw-rounded-xl tw-text-xs tw-font-bold ${
                    transferType === 'WALLET_TO_WALLET' ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                >
                  Pindah Antar Dompet
                </button>
                <button
                  type="button"
                  onClick={() => setTransferType('BUCKET_TO_BUCKET')}
                  className={`btn btn-sm tw-rounded-xl tw-text-xs tw-font-bold ${
                    transferType === 'BUCKET_TO_BUCKET' ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                >
                  Pindah Antar Pos / Bucket
                </button>
              </div>

              {transferType === 'WALLET_TO_WALLET' ? (
                <div className="tw-space-y-4">
                  <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                    <div>
                      <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                        Dari Dompet
                      </label>
                      <select
                        className="form-select tw-text-sm"
                        value={fromWalletId}
                        onChange={(e) => setFromWalletId(e.target.value)}
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                        Ke Dompet
                      </label>
                      <select
                        className="form-select tw-text-sm"
                        value={toWalletId}
                        onChange={(e) => setToWalletId(e.target.value)}
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} (Saldo: Rp {Number(w.balance).toLocaleString('id-ID')})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                      Biaya Admin Transfer (Opsional, masuk beban Living)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control tw-text-sm tw-font-mono"
                      placeholder="0"
                      value={adminFee}
                      onChange={(e) => setAdminFee(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>
              ) : (
                <div className="tw-space-y-4">
                  <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                    <div>
                      <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                        Dari Pos
                      </label>
                      <select
                        className="form-select tw-text-sm"
                        value={fromPos}
                        onChange={(e) => setFromPos(e.target.value as any)}
                      >
                        <option value="LIVING">Living (Kebutuhan)</option>
                        <option value="PLAYING">Playing (Jajan)</option>
                        <option value="EMERGENCY">Dana Darurat</option>
                        <option value="SAVINGS">Tabungan Rutin</option>
                        <option value="INVESTMENT">Investasi</option>
                        <option value="GOALS">Tujuan (Goals)</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                        Ke Pos
                      </label>
                      <select
                        className="form-select tw-text-sm"
                        value={toPos}
                        onChange={(e) => setToPos(e.target.value as any)}
                      >
                        <option value="SAVINGS">Tabungan Rutin</option>
                        <option value="EMERGENCY">Dana Darurat</option>
                        <option value="INVESTMENT">Investasi</option>
                        <option value="GOALS">Tujuan (Goals)</option>
                        <option value="LIVING">Living (Kebutuhan)</option>
                        <option value="PLAYING">Playing (Jajan)</option>
                      </select>
                    </div>
                  </div>

                  <p className="tw-text-xs tw-text-muted">
                    *Alasan pemindahan wajib dituliskan pada kolom catatan di atas dan akan tercatat permanen di riwayat kedua pos.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="tw-pt-4 tw-border-t tw-border-border">
            <button
              type="submit"
              disabled={isLoading || !amount || numAmount <= 0}
              className="btn btn-primary tw-w-full tw-py-3 tw-font-bold tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" />
                  <span>Menyimpan ke Ledger...</span>
                </>
              ) : (
                <span>Simpan Transaksi</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

