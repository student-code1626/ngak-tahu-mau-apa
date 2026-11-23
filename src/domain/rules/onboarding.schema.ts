import { z } from 'zod';

export const profileStepSchema = z.object({
  displayName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(50),
  budgetStartDay: z.coerce.number().int().min(1).max(31, 'Tanggal mulai antara 1 sampai 31'),
  incomeType: z.enum(['ROUTINE', 'IRREGULAR'], {
    errorMap: () => ({ message: 'Pilih jenis penghasilan (Tetap atau Tidak Tentu)' }),
  }),
  occupation: z.string().trim().max(100).optional().nullable(),
  estIncome: z.coerce.number().min(0).optional().nullable(),
  primaryGoal: z.string().trim().max(200).optional().nullable(),
  preferredHour: z.coerce.number().int().min(0).max(23).default(20),
});

export const walletItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Nama dompet wajib diisi').max(50),
  type: z.enum(['BANK', 'EWALLET', 'CASH', 'OTHER']),
  currency: z.string().default('IDR'),
  brandKey: z.string().optional().nullable(),
  initialBalance: z.coerce.number().min(0, 'Saldo awal tidak boleh minus'),
});

export const walletsStepSchema = z.object({
  wallets: z.array(walletItemSchema).min(1, 'Tambahkan minimal satu dompet'),
});

export const initialAllocationItemSchema = z.object({
  pos: z.enum(['EMERGENCY', 'SAVINGS', 'INVESTMENT', 'GOALS', 'LIVING', 'PLAYING']),
  amount: z.coerce.number().min(0, 'Jumlah alokasi tidak boleh minus'),
});

export const initialAllocationStepSchema = z.object({
  allocations: z.array(initialAllocationItemSchema),
});

export type ProfileStepInput = z.infer<typeof profileStepSchema>;
export type WalletItemInput = z.infer<typeof walletItemSchema>;
export type WalletsStepInput = z.infer<typeof walletsStepSchema>;
export type InitialAllocationInput = z.infer<typeof initialAllocationStepSchema>;

