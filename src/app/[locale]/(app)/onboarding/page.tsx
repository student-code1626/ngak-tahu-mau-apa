'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  PiggyBank,
  TrendingUp,
  Target,
  Coffee,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Building2,
  CreditCard,
  Banknote,
  HelpCircle,
} from 'lucide-react';

interface WalletItem {
  id?: string;
  name: string;
  type: 'BANK' | 'EWALLET' | 'CASH' | 'OTHER';
  currency: string;
  initialBalance: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Profile form state
  const [displayName, setDisplayName] = useState('');
  const [budgetStartDay, setBudgetStartDay] = useState(1);
  const [incomeType, setIncomeType] = useState<'ROUTINE' | 'IRREGULAR'>('ROUTINE');
  const [occupation, setOccupation] = useState('');
  const [estIncome, setEstIncome] = useState<number | ''>('');
  const [primaryGoal, setPrimaryGoal] = useState('menabung');
  const [preferredHour, setPreferredHour] = useState(20);

  // Step 2: Wallets state
  const [wallets, setWallets] = useState<WalletItem[]>([
    { name: 'Rekening BCA', type: 'BANK', currency: 'IDR', initialBalance: 5000000 },
    { name: 'GoPay', type: 'EWALLET', currency: 'IDR', initialBalance: 500000 },
    { name: 'Uang Tunai', type: 'CASH', currency: 'IDR', initialBalance: 500000 },
  ]);

  // Step 3: Allocations state
  const [allocations, setAllocations] = useState<{ [pos: string]: number }>({
    EMERGENCY: 2000000,
    SAVINGS: 1000000,
    INVESTMENT: 500000,
    GOALS: 500000,
    LIVING: 1500000,
    PLAYING: 500000,
  });

  // Calculate totals
  const totalWallets = wallets.reduce((acc, w) => acc + (Number(w.initialBalance) || 0), 0);
  const totalAllocated = Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const remainingToAllocate = totalWallets - totalAllocated;

  useEffect(() => {
    if (session?.user?.displayName && !displayName) {
      setDisplayName(session.user.displayName);
    }
  }, [session, displayName]);

  // Load existing state if available
  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch('/api/onboarding');
        if (!res.ok) return;
        const json = await res.json();
        if (json.data?.profile) {
          const p = json.data.profile;
          setDisplayName(p.displayName || '');
          setBudgetStartDay(p.budgetStartDay || 1);
          setIncomeType(p.incomeType || 'ROUTINE');
          setOccupation(p.occupation || '');
          setEstIncome(p.estIncome ? Number(p.estIncome) : '');
          setPrimaryGoal(p.primaryGoal || 'menabung');
          setPreferredHour(p.preferredHour || 20);

          if (p.onboardingDone) {
            router.push('/id/dashboard');
          } else if (p.onboardingStep > 1) {
            setCurrentStep(p.onboardingStep);
          }
        }
        if (json.data?.wallets && json.data.wallets.length > 0) {
          setWallets(
            json.data.wallets.map((w: any) => ({
              id: w.id,
              name: w.name,
              type: w.type,
              currency: w.currency,
              initialBalance: Number(w.cachedBal),
            }))
          );
        }
      } catch (e) {
        // Continue with defaults
      }
    }
    if (status === 'authenticated') {
      loadState();
    }
  }, [status, router]);

  // Wallet helpers
  const handleAddWallet = (name = '', type: 'BANK' | 'EWALLET' | 'CASH' | 'OTHER' = 'BANK', balance = 0) => {
    setWallets([
      ...wallets,
      { name, type, currency: 'IDR', initialBalance: balance },
    ]);
  };

  const handleUpdateWallet = (index: number, field: keyof WalletItem, value: any) => {
    const updated = [...wallets];
    updated[index] = { ...updated[index], [field]: value };
    setWallets(updated);
  };

  const handleRemoveWallet = (index: number) => {
    if (wallets.length <= 1) return;
    setWallets(wallets.filter((_, i) => i !== index));
  };

  // Submit Step 1
  const handleSaveProfile = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          data: {
            displayName,
            budgetStartDay: Number(budgetStartDay),
            incomeType,
            occupation: occupation || null,
            estIncome: estIncome ? Number(estIncome) : null,
            primaryGoal,
            preferredHour: Number(preferredHour),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menyimpan profil');
      }
      setCurrentStep(2);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Step 2
  const handleSaveWallets = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const validWallets = wallets.filter((w) => w.name.trim().length > 0);
      if (validWallets.length === 0) {
        throw new Error('Minimal harus ada 1 dompet');
      }
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          data: {
            wallets: validWallets.map((w) => ({
              ...w,
              initialBalance: Number(w.initialBalance) || 0,
            })),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menyimpan dompet');
      }

      // Pre-fill initial allocations to match total wallets
      applyDefaultSplit(totalWallets);

      setCurrentStep(3);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyDefaultSplit = (total: number) => {
    const living = Math.round(total * 0.45);
    const playing = Math.round(total * 0.15);
    const savingTotal = total - living - playing;
    const emergency = Math.round(savingTotal * 0.5);
    const savings = Math.round(savingTotal * 0.25);
    const investment = Math.round(savingTotal * 0.15);
    const goals = savingTotal - emergency - savings - investment;

    setAllocations({
      EMERGENCY: emergency,
      SAVINGS: savings,
      INVESTMENT: investment,
      GOALS: goals,
      LIVING: living,
      PLAYING: playing,
    });
  };

  // Submit Step 3 (Atomic Ledger Transaction)
  const handleCompleteAllocation = async () => {
    if (remainingToAllocate !== 0) {
      setErrorMsg(
        `Seluruh saldo awal (Rp ${totalWallets.toLocaleString('id-ID')}) wajib dialokasikan. Sisa belum dialokasikan: Rp ${remainingToAllocate.toLocaleString('id-ID')}`
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const allocationList = Object.entries(allocations).map(([pos, amount]) => ({
        pos,
        amount: Number(amount) || 0,
      }));

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 3,
          data: { allocations: allocationList },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menyelesaikan alokasi awal');
      }

      // Refresh JWT session to mark onboarding done
      await update({ onboardingDone: true });
      setCurrentStep(4);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'BANK':
        return <Building2 className="tw-w-4 tw-h-4 tw-text-[#35684b]" />;
      case 'EWALLET':
        return <CreditCard className="tw-w-4 tw-h-4 tw-text-[#7d9fa0]" />;
      case 'CASH':
        return <Banknote className="tw-w-4 tw-h-4 tw-text-[#d5b55e]" />;
      default:
        return <HelpCircle className="tw-w-4 tw-h-4 tw-text-[#7b847b]" />;
    }
  };

  return (
    <div className="tw-min-h-screen tw-py-8 sm:tw-py-12 tw-px-4 sm:tw-px-6 tw-max-w-3xl tw-mx-auto tw-flex tw-flex-col tw-justify-center">
      {/* Top Brand Header */}
      <div className="gt-brand tw-justify-center tw-mb-6">
        <span className="gt-logo" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 18 9 9l4 5 3-4 5 8" />
          </svg>
        </span>
        <span className="gt-name">
          wise<b>finance</b>
        </span>
      </div>

      {/* Main Panel Container */}
      <div className="panel panel-lg tw-p-6 sm:tw-p-9 tw-space-y-6">
        {/* Step Progress Tracker */}
        <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#e6e9e1] tw-pb-4">
          <div>
            <p className="eyebrow tw-mb-1">
              LANGKAH {currentStep} DARI 3 ·{' '}
              {currentStep === 1 && 'IDENTITAS & SIKLUS'}
              {currentStep === 2 && 'SETUP DOMPET'}
              {currentStep === 3 && 'ALOKASI DUA LAPISAN'}
              {currentStep === 4 && 'SELESAI'}
            </p>
            <h1 className="tw-text-xl sm:tw-text-2xl tw-font-extrabold tw-font-display tw-tracking-tight tw-text-[#202820]">
              {currentStep === 1 && 'Identitas & Siklus Keuangan'}
              {currentStep === 2 && 'Setup Dompet & Saldo Saat Ini'}
              {currentStep === 3 && 'Alokasi ke Pos & Dua Lapisan'}
              {currentStep === 4 && 'Akun Siap Digunakan!'}
            </h1>
          </div>

          {/* Stepper Dots */}
          <div className="tw-flex tw-items-center tw-gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`tw-h-2 tw-rounded-full tw-transition-all duration-200 ${
                  step === currentStep
                    ? 'tw-w-6 tw-bg-[#35684b]'
                    : step < currentStep
                      ? 'tw-w-2 tw-bg-[#7da080]'
                      : 'tw-w-2 tw-bg-[#e6e9e1]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wise Mascot Speech Bubble */}
        <div className="wise-bubble">
          <div className="wise-bubble-avatar" aria-hidden="true">
            <Sparkles className="tw-w-4 tw-h-4" />
          </div>
          <div className="wise-bubble-content">
            <strong className="tw-block tw-font-display tw-font-bold tw-text-[0.86rem] tw-text-[#202820] tw-mb-0.5">
              Wise · Asisten Keuangan
            </strong>
            <p className="tw-text-xs tw-text-[#485447] tw-leading-relaxed tw-m-0">
              {currentStep === 1 &&
                'Halo! Selamat datang di WiseFinance. Mari atur profilmu dan tentukan kapan siklus anggaran barumu dimulai setiap bulannya.'}
              {currentStep === 2 &&
                'Sekarang sebutkan semua dompet atau rekening tempat uangmu berada (misal BCA, GoPay, Tunai) beserta saldo saat ini.'}
              {currentStep === 3 &&
                `Halo ${displayName || 'Teman'}! Total uangmu saat ini Rp ${totalWallets.toLocaleString('id-ID')}. Dari jumlah ini, ada yang sudah jadi Dana darurat atau Tabungan sebelumnya? Yuk kita amankan dulu sebelum mulai anggaran bulanan.`}
              {currentStep === 4 &&
                'Luar biasa! Seluruh saldo awalmu sudah tercatat rapi di buku besar (ledger) tanpa ada rupiah yang hilang atau mengambang bebas.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="gt-err" role="alert">
            <AlertCircle className="tw-w-4 tw-h-4 tw-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: Profil & Tanggal Gajian */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="tw-space-y-5">
            <div className="form-grid">
              <div>
                <label className="field-label">
                  <span>Nama Panggilan *</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Alex"
                    required
                  />
                </label>
              </div>

              <div>
                <label className="field-label">
                  <span>Tanggal Mulai Anggaran (Gajian) *</span>
                  <div className="tw-relative">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={budgetStartDay}
                      onChange={(e) => setBudgetStartDay(Number(e.target.value))}
                      className="tw-pr-28"
                      required
                    />
                    <span className="tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.72rem] tw-font-semibold tw-text-[#7b847b] tw-bg-[#f1f4ed] tw-px-2 tw-py-1 tw-rounded-md pointer-events-none">
                      Tiap tgl {budgetStartDay}
                    </span>
                  </div>
                </label>
                <p className="tw-text-[0.68rem] tw-text-[#7b847b] tw-mt-1.5">
                  Anggaranmu akan di-reset dan dihitung dari tanggal ini setiap bulan.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="field-label">
                  <span>Tipe Penghasilan *</span>
                  <select
                    value={incomeType}
                    onChange={(e) => setIncomeType(e.target.value as any)}
                  >
                    <option value="ROUTINE">Tetap / Rutin (Gaji Bulanan)</option>
                    <option value="IRREGULAR">Tidak Tentu (Freelance / Bisnis)</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="field-label">
                  <span>Tujuan Finansial Utama</span>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                  >
                    <option value="menabung">Membangun Tabungan Rutin</option>
                    <option value="darurat">Mengamankan Dana Darurat</option>
                    <option value="hutang">Melunasi Hutang & Cicilan</option>
                    <option value="jajan">Mengontrol Pengeluaran Gaya Hidup</option>
                    <option value="investasi">Mulai Berinvestasi</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label className="field-label">
                  <span>Pekerjaan / Status (Opsional)</span>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Contoh: Mahasiswa, Freelancer, Karyawan"
                  />
                </label>
              </div>

              <div>
                <label className="field-label">
                  <span>Perkiraan Pemasukan Bulanan (Opsional)</span>
                  <div className="tw-relative">
                    <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.78rem] tw-font-bold tw-text-[#7b847b]">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={estIncome}
                      onChange={(e) => setEstIncome(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Contoh: 5.000.000"
                      className="tw-pl-9"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="tw-flex tw-justify-end tw-pt-4 tw-border-t tw-border-[#e6e9e1]">
              <button
                type="button"
                disabled={isLoading || !displayName.trim()}
                onClick={handleSaveProfile}
                className="button button-primary"
              >
                {isLoading ? <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" /> : null}
                <span>Lanjut: Setup Dompet</span>
                <ArrowRight className="tw-w-4 tw-h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Setup Dompet & Saldo Awal */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="tw-space-y-5">
            <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-2">
              <div>
                <h2 className="tw-text-base tw-font-bold tw-font-display tw-text-[#202820]">
                  Dompet & Rekening Aktif
                </h2>
                <p className="tw-text-xs tw-text-[#7b847b]">
                  Catat semua rekening bank, e-wallet, atau uang tunai yang kamu pegang.
                </p>
              </div>
              <div className="tw-text-left sm:tw-text-right tw-bg-[#f1f4ed] tw-px-3.5 tw-py-2 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                <span className="tw-text-[0.68rem] tw-font-semibold tw-text-[#677363] tw-block">
                  Total Saldo Semua Dompet:
                </span>
                <strong className="tw-font-display tw-font-extrabold tw-text-base tw-text-[#35684b]">
                  Rp {totalWallets.toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            {/* Quick Add Preset Chips */}
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-pt-1">
              <span className="tw-text-[0.72rem] tw-font-bold tw-text-[#7b847b]">Tambah cepat:</span>
              <button
                type="button"
                onClick={() => handleAddWallet('BCA', 'BANK', 0)}
                className="type-badge badge-neutral hover:tw-bg-[#e8f1e7] tw-cursor-pointer tw-border tw-border-[#d7ddd2]"
              >
                + BCA
              </button>
              <button
                type="button"
                onClick={() => handleAddWallet('Mandiri', 'BANK', 0)}
                className="type-badge badge-neutral hover:tw-bg-[#e8f1e7] tw-cursor-pointer tw-border tw-border-[#d7ddd2]"
              >
                + Mandiri
              </button>
              <button
                type="button"
                onClick={() => handleAddWallet('GoPay', 'EWALLET', 0)}
                className="type-badge badge-neutral hover:tw-bg-[#e8f1e7] tw-cursor-pointer tw-border tw-border-[#d7ddd2]"
              >
                + GoPay
              </button>
              <button
                type="button"
                onClick={() => handleAddWallet('DANA', 'EWALLET', 0)}
                className="type-badge badge-neutral hover:tw-bg-[#e8f1e7] tw-cursor-pointer tw-border tw-border-[#d7ddd2]"
              >
                + DANA
              </button>
              <button
                type="button"
                onClick={() => handleAddWallet('Tunai', 'CASH', 0)}
                className="type-badge badge-neutral hover:tw-bg-[#e8f1e7] tw-cursor-pointer tw-border tw-border-[#d7ddd2]"
              >
                + Uang Tunai
              </button>
            </div>

            {/* Wallet Rows List */}
            <div className="tw-space-y-3">
              {wallets.map((w, idx) => (
                <div
                  key={idx}
                  className="tw-p-4 tw-rounded-xl tw-border tw-border-[#e6e9e1] tw-bg-[#fbfcf9] tw-grid tw-grid-cols-1 sm:tw-grid-cols-12 tw-gap-3 tw-items-center"
                >
                  <div className="sm:tw-col-span-5">
                    <label className="field-label">
                      <span className="tw-flex tw-items-center tw-gap-1.5">
                        {getWalletIcon(w.type)}
                        <span>Nama Dompet</span>
                      </span>
                      <input
                        type="text"
                        value={w.name}
                        placeholder="Contoh: BCA, GoPay, Tunai"
                        onChange={(e) => handleUpdateWallet(idx, 'name', e.target.value)}
                        className="tw-h-10"
                      />
                    </label>
                  </div>

                  <div className="sm:tw-col-span-3">
                    <label className="field-label">
                      <span>Jenis</span>
                      <select
                        value={w.type}
                        onChange={(e) => handleUpdateWallet(idx, 'type', e.target.value)}
                        className="tw-h-10"
                      >
                        <option value="BANK">Bank</option>
                        <option value="EWALLET">E-Wallet</option>
                        <option value="CASH">Tunai</option>
                        <option value="OTHER">Lainnya</option>
                      </select>
                    </label>
                  </div>

                  <div className="sm:tw-col-span-3">
                    <label className="field-label">
                      <span>Saldo Awal</span>
                      <div className="tw-relative">
                        <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.74rem] tw-font-bold tw-text-[#7b847b]">
                          Rp
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={w.initialBalance}
                          onChange={(e) =>
                            handleUpdateWallet(
                              idx,
                              'initialBalance',
                              Math.max(0, Number(e.target.value))
                            )
                          }
                          className="tw-h-10 tw-pl-8 tw-font-display tw-font-bold"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="sm:tw-col-span-1 tw-flex tw-justify-end tw-pt-2 sm:tw-pt-4">
                    <button
                      type="button"
                      disabled={wallets.length <= 1}
                      onClick={() => handleRemoveWallet(idx)}
                      className="tw-w-8 tw-h-8 tw-rounded-lg tw-border tw-border-transparent hover:tw-border-[#f5cfc7] hover:tw-bg-[#faeae5] tw-text-[#bd5f52] tw-grid tw-place-items-center disabled:tw-opacity-30 disabled:tw-cursor-not-allowed"
                      title="Hapus dompet"
                    >
                      <Trash2 className="tw-w-4 tw-h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddWallet()}
              className="button button-secondary tw-w-full"
            >
              <Plus className="tw-w-4 tw-h-4" />
              <span>Tambah Dompet Lainnya</span>
            </button>

            <div className="tw-flex tw-items-center tw-justify-between tw-pt-4 tw-border-t tw-border-[#e6e9e1]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="button button-secondary"
              >
                <ArrowLeft className="tw-w-4 tw-h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                disabled={isLoading || wallets.some((w) => !w.name.trim())}
                onClick={handleSaveWallets}
                className="button button-primary"
              >
                {isLoading ? <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" /> : null}
                <span>Lanjut: Alokasi Pos</span>
                <ArrowRight className="tw-w-4 tw-h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Isi Bucket Awal (Interactive Strict Invariant Allocator) */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="tw-space-y-6">
            <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-3">
              <div>
                <h2 className="tw-text-base tw-font-bold tw-font-display tw-text-[#202820]">
                  Alokasi ke Dua Lapisan Uang
                </h2>
                <p className="tw-text-xs tw-text-[#7b847b]">
                  Setiap rupiah di dompet harus punya tempat tinggal yang pasti.
                </p>
              </div>

              {/* Real-time Invariant Status Pill */}
              <div
                className={`summary-note ${
                  remainingToAllocate === 0
                    ? 'balanced'
                    : remainingToAllocate > 0
                      ? 'unbalanced'
                      : 'danger'
                }`}
              >
                {remainingToAllocate === 0 ? (
                  <>
                    <CheckCircle2 className="tw-w-4 tw-h-4 tw-shrink-0" />
                    <span>✓ Invarian Sempurna (Sisa: Rp 0)</span>
                  </>
                ) : remainingToAllocate > 0 ? (
                  <>
                    <AlertCircle className="tw-w-4 tw-h-4 tw-shrink-0" />
                    <span>Sisa Rp {remainingToAllocate.toLocaleString('id-ID')} belum dialokasikan</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="tw-w-4 tw-h-4 tw-shrink-0" />
                    <span>Melebihi saldo sebesar Rp {Math.abs(remainingToAllocate).toLocaleString('id-ID')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Auto-Split Button */}
            <div className="tw-flex tw-items-center tw-justify-between tw-bg-[#fbfcf9] tw-p-3 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
              <span className="tw-text-xs tw-text-[#677363]">
                Ingin pembagian seimbang otomatis?
              </span>
              <button
                type="button"
                onClick={() => applyDefaultSplit(totalWallets)}
                className="type-badge badge-saving tw-cursor-pointer hover:tw-opacity-80"
              >
                Bagi Rekomendasi (45% Living, 15% Playing, 40% Saving)
              </button>
            </div>

            {/* Lapisan 1: Operasional Bulan Ini */}
            <div
              className="tw-p-5 tw-rounded-2xl tw-border tw-border-[#e6ebde] tw-bg-[#fafcf7] tw-space-y-4"
              style={{ borderLeft: '5px solid #d5b55e' }}
            >
              <div className="tw-flex tw-items-center tw-justify-between">
                <div>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="type-badge badge-living">LAPISAN 1</span>
                    <strong className="tw-text-xs tw-font-bold tw-text-[#202820] tw-uppercase tw-tracking-wider">
                      Uang Bulan Ini (Living & Playing)
                    </strong>
                  </div>
                  <p className="tw-text-[0.72rem] tw-text-[#7b847b] tw-mt-1">
                    Anggaran yang dialokasikan untuk kebutuhan operasional dan gaya hidup periode ini.
                  </p>
                </div>
                <div className="tw-text-right">
                  <span className="tw-text-[0.68rem] tw-text-[#7b847b] tw-block">Subtotal:</span>
                  <strong className="tw-font-display tw-font-extrabold tw-text-sm tw-text-[#9a7e39]">
                    Rp {(allocations.LIVING + allocations.PLAYING).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                <div className="tw-bg-[#ffffff] tw-p-3.5 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                  <label className="field-label">
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-[#826615]">
                      <ShoppingBag className="tw-w-4 tw-h-4" />
                      <span>Pos Living (Kebutuhan Hidup)</span>
                    </span>
                    <div className="tw-relative">
                      <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.76rem] tw-font-bold tw-text-[#7b847b]">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={allocations.LIVING}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            LIVING: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="tw-pl-8 tw-font-display tw-font-bold"
                      />
                    </div>
                  </label>
                  <p className="tw-text-[0.65rem] tw-text-[#7b847b] tw-mt-1.5">
                    Makan, tagihan, transportasi, dan kebutuhan pokok.
                  </p>
                </div>

                <div className="tw-bg-[#ffffff] tw-p-3.5 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                  <label className="field-label">
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-[#366365]">
                      <Coffee className="tw-w-4 tw-h-4" />
                      <span>Pos Playing (Jajan & Gaya Hidup)</span>
                    </span>
                    <div className="tw-relative">
                      <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.76rem] tw-font-bold tw-text-[#7b847b]">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={allocations.PLAYING}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            PLAYING: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="tw-pl-8 tw-font-display tw-font-bold"
                      />
                    </div>
                  </label>
                  <p className="tw-text-[0.65rem] tw-text-[#7b847b] tw-mt-1.5">
                    Nongkrong, hiburan, langganan streaming, dan hobi.
                  </p>
                </div>
              </div>
            </div>

            {/* Lapisan 2: Uang Tersimpan (Bucket Saving) */}
            <div
              className="tw-p-5 tw-rounded-2xl tw-border tw-border-[#dbe6d6] tw-bg-[#f4f7f2] tw-space-y-4"
              style={{ borderLeft: '5px solid #4e835c' }}
            >
              <div className="tw-flex tw-items-center tw-justify-between">
                <div>
                  <div className="tw-flex tw-items-center tw-gap-2">
                    <span className="type-badge badge-saving">LAPISAN 2</span>
                    <strong className="tw-text-xs tw-font-bold tw-text-[#202820] tw-uppercase tw-tracking-wider">
                      Uang Tersimpan (Bucket Saving)
                    </strong>
                  </div>
                  <p className="tw-text-[0.72rem] tw-text-[#7b847b] tw-mt-1">
                    Uang yang diamankan dan tidak boleh digunakan untuk belanja bulanan.
                  </p>
                </div>
                <div className="tw-text-right">
                  <span className="tw-text-[0.68rem] tw-text-[#7b847b] tw-block">Subtotal:</span>
                  <strong className="tw-font-display tw-font-extrabold tw-text-sm tw-text-[#35684b]">
                    Rp{' '}
                    {(
                      allocations.EMERGENCY +
                      allocations.SAVINGS +
                      allocations.INVESTMENT +
                      allocations.GOALS
                    ).toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                <div className="tw-bg-[#ffffff] tw-p-3.5 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                  <label className="field-label">
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-[#35684b]">
                      <ShieldCheck className="tw-w-4 tw-h-4" />
                      <span>Dana Darurat (Emergency)</span>
                    </span>
                    <div className="tw-relative">
                      <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.76rem] tw-font-bold tw-text-[#7b847b]">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={allocations.EMERGENCY}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            EMERGENCY: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="tw-pl-8 tw-font-display tw-font-bold"
                      />
                    </div>
                  </label>
                  <p className="tw-text-[0.65rem] tw-text-[#7b847b] tw-mt-1.5">
                    Khusus kondisi darurat kesehatan atau kehilangan pemasukan.
                  </p>
                </div>

                <div className="tw-bg-[#ffffff] tw-p-3.5 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                  <label className="field-label">
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-[#35684b]">
                      <PiggyBank className="tw-w-4 tw-h-4" />
                      <span>Tabungan Rutin (Savings)</span>
                    </span>
                    <div className="tw-relative">
                      <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.76rem] tw-font-bold tw-text-[#7b847b]">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={allocations.SAVINGS}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            SAVINGS: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="tw-pl-8 tw-font-display tw-font-bold"
                      />
                    </div>
                  </label>
                  <p className="tw-text-[0.65rem] tw-text-[#7b847b] tw-mt-1.5">
                    Tabungan umum yang terus dipupuk.
                  </p>
                </div>

                <div className="tw-bg-[#ffffff] tw-p-3.5 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                  <label className="field-label">
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-[#35684b]">
                      <TrendingUp className="tw-w-4 tw-h-4" />
                      <span>Investasi</span>
                    </span>
                    <div className="tw-relative">
                      <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.76rem] tw-font-bold tw-text-[#7b847b]">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={allocations.INVESTMENT}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            INVESTMENT: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="tw-pl-8 tw-font-display tw-font-bold"
                      />
                    </div>
                  </label>
                  <p className="tw-text-[0.65rem] tw-text-[#7b847b] tw-mt-1.5">
                    Reksadana, saham, emas, atau aset produktif.
                  </p>
                </div>

                <div className="tw-bg-[#ffffff] tw-p-3.5 tw-rounded-xl tw-border tw-border-[#e6e9e1]">
                  <label className="field-label">
                    <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-[#35684b]">
                      <Target className="tw-w-4 tw-h-4" />
                      <span>Tujuan Impian (Goals)</span>
                    </span>
                    <div className="tw-relative">
                      <span className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-[0.76rem] tw-font-bold tw-text-[#7b847b]">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={allocations.GOALS}
                        onChange={(e) =>
                          setAllocations({
                            ...allocations,
                            GOALS: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="tw-pl-8 tw-font-display tw-font-bold"
                      />
                    </div>
                  </label>
                  <p className="tw-text-[0.65rem] tw-text-[#7b847b] tw-mt-1.5">
                    Target spesifik: beli laptop, liburan, DP rumah.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="tw-flex tw-items-center tw-justify-between tw-pt-4 tw-border-t tw-border-[#e6e9e1]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="button button-secondary"
              >
                <ArrowLeft className="tw-w-4 tw-h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                disabled={isLoading || remainingToAllocate !== 0}
                onClick={handleCompleteAllocation}
                className="button button-primary"
              >
                {isLoading ? <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" /> : null}
                <span>Kunci Alokasi & Selesaikan</span>
                <ArrowRight className="tw-w-4 tw-h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Selesai & Berhasil */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="tw-p-6 sm:tw-p-8 tw-text-center tw-space-y-6">
            <div className="tw-w-16 tw-h-16 tw-rounded-2xl tw-bg-[#e8f1e7] tw-text-[#35684b] tw-flex tw-items-center tw-justify-center tw-mx-auto tw-shadow-sm">
              <CheckCircle2 className="tw-w-8 tw-h-8" />
            </div>

            <div>
              <h2 className="tw-text-2xl tw-font-extrabold tw-font-display tw-tracking-tight tw-text-[#202820]">
                Akun Siap Digunakan!
              </h2>
              <p className="tw-text-xs tw-text-[#7b847b] tw-max-w-md tw-mx-auto tw-mt-2 tw-leading-relaxed">
                Seluruh saldo awalmu sudah tercatat rapi dalam buku kas (ledger) dengan status POSTED.
                Invarian seimbang sempurna: total dompet sama dengan total seluruh pos!
              </p>
            </div>

            <div className="tw-p-5 tw-rounded-2xl tw-bg-[#fbfcf9] tw-border tw-border-[#e6e9e1] tw-max-w-md tw-mx-auto tw-text-left tw-space-y-3">
              <div className="tw-flex tw-justify-between tw-text-xs">
                <span className="tw-text-[#7b847b] tw-font-medium">Total Uang di Semua Dompet:</span>
                <span className="tw-font-display tw-font-extrabold tw-text-[#202820]">
                  Rp {totalWallets.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="tw-flex tw-justify-between tw-text-xs tw-pt-2 tw-border-t tw-border-[#e6e9e1]">
                <span className="tw-text-[#826615] tw-font-semibold">
                  Lapisan 1 (Uang Bulan Ini):
                </span>
                <span className="tw-font-display tw-font-bold tw-text-[#826615]">
                  Rp {(allocations.LIVING + allocations.PLAYING).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="tw-flex tw-justify-between tw-text-xs tw-pt-2 tw-border-t tw-border-[#e6e9e1]">
                <span className="tw-text-[#35684b] tw-font-semibold">
                  Lapisan 2 (Uang Tersimpan):
                </span>
                <span className="tw-font-display tw-font-bold tw-text-[#35684b]">
                  Rp{' '}
                  {(
                    allocations.EMERGENCY +
                    allocations.SAVINGS +
                    allocations.INVESTMENT +
                    allocations.GOALS
                  ).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => router.push('/id/dashboard')}
                className="button button-primary tw-px-8 tw-py-3 tw-text-sm"
              >
                <span>Buka Dashboard WiseFinance</span>
                <ArrowRight className="tw-w-4 tw-h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
