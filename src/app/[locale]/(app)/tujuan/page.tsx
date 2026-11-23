'use client';

import React, { useState, useEffect } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { Target, Plus, CheckCircle2, ArrowRight, Loader2, Calendar, Sparkles } from 'lucide-react';

export default function TujuanPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const json = await res.json();
        setGoals(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          data: {
            name,
            targetAmount: Number(targetAmount),
            deadline: deadline ? new Date(deadline) : undefined,
            reason,
          },
        }),
      });

      if (res.ok) {
        setName('');
        setTargetAmount('');
        setDeadline('');
        setReason('');
        setIsModalOpen(false);
        await fetchGoals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-page">
      <AppNavbar />

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-6xl tw-mx-auto tw-w-full tw-space-y-6">
        <div className="tw-flex tw-items-center tw-justify-between">
          <div>
            <h1 className="tw-text-2xl tw-font-bold tw-text-heading">Tujuan Masa Depan (Goals)</h1>
            <p className="tw-text-xs tw-text-muted">
              Rencanakan impian dan pantau progres tabungan terencana
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-sm tw-rounded-xl tw-flex tw-items-center tw-gap-1.5 tw-font-semibold"
          >
            <Plus className="tw-w-4 tw-h-4" />
            <span>Tambah Tujuan</span>
          </button>
        </div>

        {isLoading ? (
          <div className="tw-p-12 tw-text-center">
            <Loader2 className="tw-w-6 tw-h-6 tw-animate-spin tw-mx-auto tw-text-brand-primary" />
          </div>
        ) : goals.length === 0 ? (
          <div className="card tw-p-12 tw-text-center tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-space-y-3">
            <Target className="tw-w-12 tw-h-12 tw-text-muted tw-mx-auto" />
            <h2 className="tw-text-base tw-font-bold tw-text-heading">Belum Ada Tujuan Keuangan</h2>
            <p className="tw-text-xs tw-text-muted tw-max-w-md tw-mx-auto">
              Mulai rencanakan liburan, beli gawai baru, dana menikah, atau modal usaha dengan alokasi otomatis dari bucket Tujuan.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-outline-primary btn-sm tw-rounded-xl tw-font-semibold"
            >
              Buat Tujuan Pertamamu
            </button>
          </div>
        ) : (
          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
            {goals.map((g) => {
              const isCompleted = g.status === 'COMPLETED';
              return (
                <div
                  key={g.id}
                  className="card tw-p-5 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-4"
                >
                  <div className="tw-flex tw-items-start tw-justify-between">
                    <div>
                      <h2 className="tw-text-base tw-font-bold tw-text-heading">{g.name}</h2>
                      {g.reason && <p className="tw-text-xs tw-text-muted tw-mt-0.5">{g.reason}</p>}
                    </div>
                    {isCompleted ? (
                      <span className="badge bg-success-subtle text-success tw-text-xs">Tercapai</span>
                    ) : (
                      <span className="badge bg-primary-subtle text-primary tw-text-xs font-mono">
                        {g.progress}%
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="tw-flex tw-justify-between tw-text-xs tw-mb-1.5">
                      <span className="tw-text-muted">Terkumpul:</span>
                      <span className="tw-font-mono tw-font-bold">
                        Rp {g.currentAmount.toLocaleString('id-ID')} / Rp {g.targetAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="progress tw-h-2 tw-rounded-full tw-bg-page">
                      <div
                        className={`progress-bar ${isCompleted ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="tw-flex tw-items-center tw-justify-between tw-pt-3 tw-border-t tw-border-border tw-text-xs tw-text-muted">
                    {g.deadline ? (
                      <span className="tw-flex tw-items-center tw-gap-1">
                        <Calendar className="tw-w-3.5 tw-h-3.5" />
                        Target: {new Date(g.deadline).toLocaleDateString('id-ID')}
                      </span>
                    ) : (
                      <span>Tanpa batas waktu</span>
                    )}
                    <span>Sisa: Rp {g.remaining.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Tambah Tujuan */}
        {isModalOpen && (
          <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
            <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-space-y-4">
              <h2 className="tw-text-base tw-font-bold tw-text-heading">Tambah Tujuan Baru</h2>

              <form onSubmit={handleCreateGoal} className="tw-space-y-4">
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Nama Tujuan <span className="tw-text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="Contoh: Beli Laptop Baru, Liburan ke Bali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Target Dana (Rp) <span className="tw-text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control tw-text-sm tw-font-mono"
                    placeholder="15000000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>

                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Tenggat Waktu / Target Tanggal (Opsional)
                  </label>
                  <input
                    type="date"
                    className="form-control tw-text-sm"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Alasan / Motivasi (Opsional)
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="Untuk mendukung kerja produktif..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="tw-flex tw-items-center tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-outline-secondary btn-sm tw-rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name || !targetAmount}
                    className="btn btn-primary btn-sm tw-rounded-xl tw-font-semibold"
                  >
                    {isSubmitting ? <Loader2 className="tw-w-3.5 tw-h-3.5 tw-animate-spin" /> : null}
                    <span>Simpan Tujuan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

