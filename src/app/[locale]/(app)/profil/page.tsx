'use client';

import React, { useState, useEffect } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { User, Settings, Globe, Shield, Bell, CheckCircle2, Loader2, Sliders } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ProfilPage() {
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [budgetStartDay, setBudgetStartDay] = useState(1);
  const [baseCurrency, setBaseCurrency] = useState('IDR');
  const [incomeType, setIncomeType] = useState('ROUTINE');
  const [occupation, setOccupation] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('menabung');
  const [preferredHour, setPreferredHour] = useState(20);

  // Income rule fields
  const [routineSaving, setRoutineSaving] = useState(40);
  const [routineLiving, setRoutineLiving] = useState(45);
  const [routinePlaying, setRoutinePlaying] = useState(15);

  const [emergencyPct, setEmergencyPct] = useState(50);
  const [savingsPct, setSavingsPct] = useState(20);
  const [investPct, setInvestPct] = useState(20);
  const [goalsPct, setGoalsPct] = useState(10);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const json = await res.json();
          const p = json.data?.profile;
          if (p) {
            setDisplayName(p.displayName || '');
            setBudgetStartDay(p.budgetStartDay || 1);
            setBaseCurrency(p.baseCurrency || 'IDR');
            setIncomeType(p.incomeType || 'ROUTINE');
            setOccupation(p.occupation || '');
            setPrimaryGoal(p.primaryGoal || 'menabung');
            setPreferredHour(p.preferredHour || 20);
          }

          const rules = json.data?.incomeRules || [];
          const routine = rules.find((r: any) => r.incomeType === 'ROUTINE');
          if (routine) {
            setRoutineSaving(Number(routine.savingPct));
            setRoutineLiving(Number(routine.livingPct));
            setRoutinePlaying(Number(routine.playingPct));
            setEmergencyPct(Number(routine.emergencyPct));
            setSavingsPct(Number(routine.savingsPct));
            setInvestPct(Number(routine.investPct));
            setGoalsPct(Number(routine.goalsPct));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            displayName,
            budgetStartDay,
            baseCurrency,
            incomeType,
            occupation,
            primaryGoal,
            preferredHour,
          },
          routineRule: {
            savingPct: routineSaving,
            livingPct: routineLiving,
            playingPct: routinePlaying,
            emergencyPct,
            savingsPct,
            investPct,
            goalsPct,
          },
        }),
      });

      if (res.ok) {
        setSuccessMsg('Pengaturan profil dan aturan alokasi berhasil disimpan!');
        await update({ displayName });
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

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

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-4xl tw-mx-auto tw-w-full tw-space-y-6">
        <div>
          <h1 className="tw-text-2xl tw-font-bold tw-text-heading">Profil & Pengaturan Akun</h1>
          <p className="tw-text-xs tw-text-muted">
            Atur identitas, siklus gajian, mata uang utama, dan persentase pembagian pos
          </p>
        </div>

        {successMsg && (
          <div className="alert alert-success tw-text-xs tw-p-4 tw-rounded-2xl tw-flex tw-items-center tw-gap-2.5">
            <CheckCircle2 className="tw-w-5 tw-h-5 tw-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="tw-space-y-6">
          {/* Section 1: Profil & Siklus */}
          <div className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-4">
            <div className="tw-flex tw-items-center tw-gap-2 tw-pb-3 tw-border-b tw-border-border">
              <User className="tw-w-4 tw-h-4 tw-text-brand-primary" />
              <h2 className="tw-text-sm tw-font-bold tw-text-heading">Informasi Profil & Siklus Anggaran</h2>
            </div>

            <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">Nama Panggilan</label>
                <input
                  type="text"
                  className="form-control tw-text-sm"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                  Tanggal Mulai Anggaran (Gajian)
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-control tw-text-sm"
                    value={budgetStartDay}
                    onChange={(e) => setBudgetStartDay(Number(e.target.value))}
                    required
                  />
                  <span className="input-group-text tw-text-xs tw-bg-page">Tiap tanggal</span>
                </div>
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">Mata Uang Utama (Base)</label>
                <select
                  className="form-select tw-text-sm"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                >
                  <option value="IDR">IDR — Rupiah Indonesia (Rp)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="SGD">SGD — Singapore Dollar (S$)</option>
                  <option value="MYR">MYR — Malaysian Ringgit (RM)</option>
                  <option value="JPY">JPY — Japanese Yen (¥)</option>
                </select>
              </div>

              <div>
                <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">Jam Pengingat Harian</label>
                <div className="input-group">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="form-control tw-text-sm"
                    value={preferredHour}
                    onChange={(e) => setPreferredHour(Number(e.target.value))}
                  />
                  <span className="input-group-text tw-text-xs tw-bg-page">:00 WIB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Aturan Persentase Pembagian Pos */}
          <div className="card tw-p-6 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-4">
            <div className="tw-flex tw-items-center tw-gap-2 tw-pb-3 tw-border-b tw-border-border">
              <Sliders className="tw-w-4 tw-h-4 tw-text-brand-primary" />
              <h2 className="tw-text-sm tw-font-bold tw-text-heading">Aturan Pembagian Pemasukan Rutin (Default 40/45/15)</h2>
            </div>

            <p className="tw-text-xs tw-text-muted">
              Pemasukan rutin otomatis dibagi ke 3 porsi besar ini (Total harus tepat 100%):
            </p>

            <div className="tw-grid tw-grid-cols-3 tw-gap-3">
              <div className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border">
                <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-saving)' }}>
                  Saving (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control form-control-sm tw-font-mono tw-mt-1"
                  value={routineSaving}
                  onChange={(e) => setRoutineSaving(Number(e.target.value))}
                />
              </div>

              <div className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border">
                <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-living)' }}>
                  Living (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control form-control-sm tw-font-mono tw-mt-1"
                  value={routineLiving}
                  onChange={(e) => setRoutineLiving(Number(e.target.value))}
                />
              </div>

              <div className="tw-p-3 tw-rounded-xl tw-bg-page tw-border tw-border-border">
                <label className="tw-text-xs tw-font-semibold" style={{ color: 'var(--pos-playing)' }}>
                  Playing (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control form-control-sm tw-font-mono tw-mt-1"
                  value={routinePlaying}
                  onChange={(e) => setRoutinePlaying(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="tw-pt-3 tw-border-t tw-border-border">
              <span className="tw-text-xs tw-font-bold tw-text-heading tw-block tw-mb-2">
                Pembagian Sub-Saving ke 4 Bucket (Total 100% dari porsi Saving):
              </span>
              <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-4 tw-gap-2.5">
                <div>
                  <label className="tw-text-[11px] tw-font-semibold" style={{ color: 'var(--pos-emergency)' }}>
                    Darurat ({emergencyPct}%)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm tw-font-mono"
                    value={emergencyPct}
                    onChange={(e) => setEmergencyPct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="tw-text-[11px] tw-font-semibold" style={{ color: 'var(--pos-saving)' }}>
                    Tabungan ({savingsPct}%)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm tw-font-mono"
                    value={savingsPct}
                    onChange={(e) => setSavingsPct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="tw-text-[11px] tw-font-semibold" style={{ color: 'var(--pos-investment)' }}>
                    Investasi ({investPct}%)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm tw-font-mono"
                    value={investPct}
                    onChange={(e) => setInvestPct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="tw-text-[11px] tw-font-semibold" style={{ color: 'var(--pos-goals)' }}>
                    Tujuan ({goalsPct}%)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm tw-font-mono"
                    value={goalsPct}
                    onChange={(e) => setGoalsPct(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="tw-flex tw-justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary tw-px-6 tw-py-2.5 tw-font-semibold tw-rounded-xl tw-flex tw-items-center tw-gap-2"
            >
              {isSaving ? <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" /> : null}
              <span>Simpan Perubahan Pengaturan</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

