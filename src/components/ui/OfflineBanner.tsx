'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getPendingOfflineCount, syncOfflineTransactions } from '@/lib/offline-queue';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for offline queue
    getPendingOfflineCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const { synced, failed } = await syncOfflineTransactions();
      const count = await getPendingOfflineCount();
      setPendingCount(count);

      if (synced > 0) {
        setSyncStatus(`${synced} transaksi offline berhasil disinkronkan ke server!`);
        setTimeout(() => setSyncStatus(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !syncStatus) {
    return null;
  }

  return (
    <div className="tw-fixed tw-bottom-20 md:tw-bottom-4 tw-left-4 tw-right-4 md:tw-left-auto md:tw-right-4 md:tw-max-w-md tw-z-50">
      {!isOnline ? (
        <div className="tw-p-4 tw-rounded-2xl tw-bg-amber-500 tw-text-white tw-shadow-xl tw-flex tw-items-center tw-justify-between tw-gap-3">
          <div className="tw-flex tw-items-center tw-gap-2.5">
            <WifiOff className="tw-w-5 tw-h-5 tw-shrink-0" />
            <div>
              <p className="tw-text-xs tw-font-bold">Mode Offline Aktif</p>
              <p className="tw-text-[11px] tw-opacity-90">
                {pendingCount > 0
                  ? `${pendingCount} transaksi tersimpan di memori lokal perangkat.`
                  : 'Transaksi yang dicatat akan diantrekan secara otomatis.'}
              </p>
            </div>
          </div>
        </div>
      ) : syncStatus ? (
        <div className="tw-p-4 tw-rounded-2xl tw-bg-green-600 tw-text-white tw-shadow-xl tw-flex tw-items-center tw-gap-2.5">
          <CheckCircle2 className="tw-w-5 tw-h-5 tw-shrink-0" />
          <span className="tw-text-xs tw-font-semibold">{syncStatus}</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="tw-p-4 tw-rounded-2xl tw-bg-surface tw-border tw-border-border tw-shadow-xl tw-flex tw-items-center tw-justify-between tw-gap-3">
          <div>
            <p className="tw-text-xs tw-font-bold tw-text-heading">
              {pendingCount} Transaksi Offline Menunggu
            </p>
            <p className="tw-text-[11px] tw-text-muted">Koneksi internet telah kembali.</p>
          </div>
          <button
            type="button"
            onClick={triggerSync}
            disabled={isSyncing}
            className="btn btn-primary btn-sm tw-rounded-xl tw-font-semibold tw-flex tw-items-center tw-gap-1.5"
          >
            <RefreshCw className={`tw-w-3.5 tw-h-3.5 ${isSyncing ? 'tw-animate-spin' : ''}`} />
            <span>Sinkronkan</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

