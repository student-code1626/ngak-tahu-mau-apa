'use client';

import React, { useState, useEffect } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { CreditCard, Users, Plus, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function HutangPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);

  // Debt Form
  const [debtName, setDebtName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [principal, setPrincipal] = useState<number | ''>('');
  const [installment, setInstallment] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receivable Form
  const [personName, setPersonName] = useState('');
  const [recAmount, setRecAmount] = useState<number | ''>('');
  const [recNote, setRecNote] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/debts');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtName || !principal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_DEBT',
          data: {
            name: debtName,
            creditor,
            kind: 'PERSONAL',
            principal: Number(principal),
            installment: installment ? Number(installment) : 0,
          },
        }),
      });
      if (res.ok) {
        setDebtName('');
        setCreditor('');
        setPrincipal('');
        setInstallment('');
        setIsDebtModalOpen(false);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !recAmount) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RECEIVABLE',
          data: {
            personName,
            amount: Number(recAmount),
            note: recNote,
          },
        }),
      });
      if (res.ok) {
        setPersonName('');
        setRecAmount('');
        setRecNote('');
        setIsRecModalOpen(false);
        await fetchData();
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

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-6xl tw-mx-auto tw-w-full tw-space-y-8">
        <div className="tw-flex tw-items-center tw-justify-between">
          <div>
            <h1 className="tw-text-2xl tw-font-bold tw-text-heading">Hutang & Talangan (Piutang)</h1>
            <p className="tw-text-xs tw-text-muted">
              Pantau kewajiban cicilan dan uang yang ditalangi untuk teman
            </p>
          </div>
          <div className="tw-flex tw-items-center tw-gap-2">
            <button
              onClick={() => setIsRecModalOpen(true)}
              className="btn btn-sm btn-outline-primary tw-rounded-xl tw-font-semibold"
            >
              + Catat Talangan
            </button>
            <button
              onClick={() => setIsDebtModalOpen(true)}
              className="btn btn-sm btn-primary tw-rounded-xl tw-font-semibold"
            >
              + Catat Hutang
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
          <div className="card tw-p-5 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm" style={{ borderLeft: '4px solid var(--pos-emergency)' }}>
            <span className="tw-text-xs tw-text-muted">Total Sisa Hutang:</span>
            <p className="tw-text-2xl tw-font-bold tw-font-mono tw-text-red-600 tw-mt-1">
              Rp {Number(data?.totalDebt || 0).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="card tw-p-5 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm" style={{ borderLeft: '4px solid var(--pos-saving)' }}>
            <span className="tw-text-xs tw-text-muted">Total Piutang / Talangan Teman:</span>
            <p className="tw-text-2xl tw-font-bold tw-font-mono tw-text-green-600 tw-mt-1">
              Rp {Number(data?.totalReceivable || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Section 1: Daftar Hutang */}
        <section className="tw-space-y-4">
          <h2 className="tw-text-base tw-font-bold tw-text-heading">Daftar Hutang & Cicilan</h2>
          <div className="card tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-divide-y tw-divide-border">
            {data?.debts?.length === 0 ? (
              <p className="tw-p-6 tw-text-xs tw-text-muted tw-text-center">
                Tidak ada catatan hutang aktif. Keuanganmu bebas hutang!
              </p>
            ) : (
              data?.debts?.map((d: any) => (
                <div key={d.id} className="tw-p-4 tw-flex tw-items-center tw-justify-between">
                  <div>
                    <h3 className="tw-text-sm tw-font-bold tw-text-heading">{d.name}</h3>
                    <p className="tw-text-xs tw-text-muted tw-mt-0.5">
                      Kreditur: {d.creditor || '-'} • Cicilan: Rp {d.installment.toLocaleString('id-ID')}/bulan
                    </p>
                  </div>
                  <div className="tw-text-right">
                    <span className="tw-text-xs tw-text-muted">Sisa Pokok:</span>
                    <p className="tw-text-base tw-font-bold tw-font-mono tw-text-red-600">
                      Rp {d.balance.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section 2: Daftar Talangan (Piutang) */}
        <section className="tw-space-y-4">
          <h2 className="tw-text-base tw-font-bold tw-text-heading">Daftar Talangan Teman</h2>
          <div className="card tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-divide-y tw-divide-border">
            {data?.receivables?.length === 0 ? (
              <p className="tw-p-6 tw-text-xs tw-text-muted tw-text-center">
                Tidak ada piutang atau talangan yang belum lunas.
              </p>
            ) : (
              data?.receivables?.map((r: any) => (
                <div key={r.id} className="tw-p-4 tw-flex tw-items-center tw-justify-between">
                  <div>
                    <h3 className="tw-text-sm tw-font-bold tw-text-heading">{r.personName}</h3>
                    {r.note && <p className="tw-text-xs tw-text-muted tw-mt-0.5">{r.note}</p>}
                  </div>
                  <div className="tw-text-right">
                    <span className="tw-text-xs tw-text-muted">Sisa Belum Diganti:</span>
                    <p className="tw-text-base tw-font-bold tw-font-mono tw-text-green-600">
                      Rp {r.remaining.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Modal Tambah Hutang */}
        {isDebtModalOpen && (
          <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
            <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-space-y-4">
              <h2 className="tw-text-base tw-font-bold tw-text-heading">Catat Hutang Baru</h2>
              <form onSubmit={handleCreateDebt} className="tw-space-y-4">
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Nama Pinjaman
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="KTA Bank, Cicilan Gadget..."
                    value={debtName}
                    onChange={(e) => setDebtName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Pemberi Pinjaman (Kreditur)
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="BCA, Teman, Saudara..."
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Total Pokok Hutang (Rp)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control tw-text-sm tw-font-mono"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Cicilan per Bulan (Opsional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control tw-text-sm tw-font-mono"
                    value={installment}
                    onChange={(e) => setInstallment(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-border">
                  <button
                    type="button"
                    onClick={() => setIsDebtModalOpen(false)}
                    className="btn btn-sm btn-outline-secondary tw-rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !debtName || !principal}
                    className="btn btn-sm btn-primary tw-rounded-xl tw-font-semibold"
                  >
                    Simpan Hutang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Talangan */}
        {isRecModalOpen && (
          <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
            <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-space-y-4">
              <h2 className="tw-text-base tw-font-bold tw-text-heading">Catat Talangan untuk Teman</h2>
              <form onSubmit={handleCreateReceivable} className="tw-space-y-4">
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Nama Teman
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="Contoh: Rian"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Nominal Talangan (Rp)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control tw-text-sm tw-font-mono"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="Makan siang bersama, tiket bioskop..."
                    value={recNote}
                    onChange={(e) => setRecNote(e.target.value)}
                  />
                </div>
                <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-border">
                  <button
                    type="button"
                    onClick={() => setIsRecModalOpen(false)}
                    className="btn btn-sm btn-outline-secondary tw-rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !personName || !recAmount}
                    className="btn btn-sm btn-primary tw-rounded-xl tw-font-semibold"
                  >
                    Simpan Talangan
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

