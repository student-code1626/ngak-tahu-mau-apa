import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineTransaction {
  id: string;
  action: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  data: any;
  timestamp: number;
}

interface WiseFinanceDB extends DBSchema {
  offlineTransactions: {
    key: string;
    value: OfflineTransaction;
  };
}

let dbPromise: Promise<IDBPDatabase<WiseFinanceDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<WiseFinanceDB>('wisefinance-offline-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offlineTransactions')) {
          db.createObjectStore('offlineTransactions', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Queue a transaction locally when offline
 */
export async function queueOfflineTransaction(action: 'INCOME' | 'EXPENSE' | 'TRANSFER', data: any): Promise<string> {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB not supported');

  const id = `offline-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const item: OfflineTransaction = {
    id,
    action,
    data,
    timestamp: Date.now(),
  };

  await db.put('offlineTransactions', item);
  return id;
}

/**
 * Get count of pending offline transactions
 */
export async function getPendingOfflineCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  return await db.count('offlineTransactions');
}

/**
 * Sync all pending offline transactions to server
 */
export async function syncOfflineTransactions(): Promise<{ synced: number; failed: number }> {
  const db = await getDB();
  if (!db) return { synced: 0, failed: 0 };

  const all = await db.getAll('offlineTransactions');
  if (all.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of all) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: item.action, data: item.data }),
      });

      if (res.ok) {
        await db.delete('offlineTransactions', item.id);
        synced++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  return { synced, failed };
}

