'use client';

import React, { useState, useEffect } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import { TrendingUp, Plus, Loader2 } from 'lucide-react';

export default function AsetPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('EMAS');
  const [value, setValue] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/assets');
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

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          data: {
            name,
            category,
            value: Number(value),
            note,
          },
        }),
      });
      if (res.ok) {
        setName('');
        setValue('');
        setNote('');
        setIsModalOpen(false);
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

      <main className="tw-flex-1 tw-py-8 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-6xl tw-mx-auto tw-w-full tw-space-y-6">
        <div className="tw-flex tw-items-center tw-justify-between">
          <div>
            <h1 className="tw-text-2xl tw-font-bold tw-text-heading">Portofolio Aset & Investasi</h1>
            <p className="tw-text-xs tw-text-muted">
              Pencatatan aset fisik dan finansial (Emas, Properti, Kendaraan, Saham/Reksadana)
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-sm btn-primary tw-rounded-xl tw-font-semibold"
          >
            + Tambah Aset
          </button>
        </div>

        {/* Total Asset Card */}
        <div className="card tw-p-5 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm" style={{ borderLeft: '4px solid var(--pos-investment)' }}>
          <span className="tw-text-xs tw-text-muted">Total Nilai Estimasi Aset:</span>
          <p className="tw-text-3xl tw-font-extrabold tw-font-mono tw-text-brand-primary tw-mt-1">
            Rp {Number(data?.totalValue || 0).toLocaleString('id-ID')}
          </p>
          <p className="tw-text-[11px] tw-text-muted tw-mt-1">
            *Aset dicatat terpisah dan tidak memengaruhi anggaran bulanan kecuali saat dibeli dari bucket Investasi.
          </p>
        </div>

        {/* Assets List */}
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
          {data?.assets?.length === 0 ? (
            <div className="tw-col-span-full tw-p-8 tw-text-center tw-text-xs tw-text-muted card tw-rounded-2xl tw-border tw-border-border tw-bg-surface">
              Belum ada aset terdaftar. Catat aset berhargamu di sini!
            </div>
          ) : (
            data?.assets?.map((a: any) => (
              <div key={a.id} className="card tw-p-5 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-shadow-sm tw-space-y-3">
                <div className="tw-flex tw-items-center tw-justify-between">
                  <span className="badge bg-primary-subtle text-primary tw-text-[10px] tw-font-bold">
                    {a.category}
                  </span>
                  <span className="tw-text-[11px] tw-text-muted">
                    {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('id-ID') : ''}
                  </span>
                </div>
                <div>
                  <h3 className="tw-text-base tw-font-bold tw-text-heading">{a.name}</h3>
                  {a.note && <p className="tw-text-xs tw-text-muted tw-mt-0.5">{a.note}</p>}
                </div>
                <div className="tw-pt-3 tw-border-t tw-border-border tw-flex tw-items-baseline tw-justify-between">
                  <span className="tw-text-xs tw-text-muted">Nilai Sekarang:</span>
                  <span className="tw-text-base tw-font-bold tw-font-mono tw-text-brand-primary">
                    Rp {a.currentValue.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Tambah Aset */}
        {isModalOpen && (
          <div className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
            <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-p-6 tw-shadow-xl tw-space-y-4">
              <h2 className="tw-text-base tw-font-bold tw-text-heading">Tambah Aset Baru</h2>
              <form onSubmit={handleCreateAsset} className="tw-space-y-4">
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Nama Aset
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    placeholder="Emas Antam 10g, Rumah, Honda Vario..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Kategori Aset
                  </label>
                  <select
                    className="form-select tw-text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="EMAS">Logam Mulia (Emas / Perak)</option>
                    <option value="PROPERTI">Properti (Tanah / Rumah / Apartemen)</option>
                    <option value="KENDARAAN">Kendaraan Bermotor</option>
                    <option value="SAHAM">Saham / Reksadana / Kripto</option>
                    <option value="ELEKTRONIK">Gawai / Elektronik</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Nilai Sekarang (Rp)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control tw-text-sm tw-font-mono"
                    value={value}
                    onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div>
                  <label className="form-label tw-text-xs tw-font-semibold tw-text-heading">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    className="form-control tw-text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="tw-flex tw-justify-end tw-gap-2 tw-pt-3 tw-border-t tw-border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-sm btn-outline-secondary tw-rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name || !value}
                    className="btn btn-sm btn-primary tw-rounded-xl tw-font-semibold"
                  >
                    Simpan Aset
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

