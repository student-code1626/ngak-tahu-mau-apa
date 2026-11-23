import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Nama panggilan minimal 2 karakter' })
    .max(50, { message: 'Nama panggilan maksimal 50 karakter' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Alamat email tidak valid' })
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: 'Password minimal 8 karakter' })
    .max(100, { message: 'Password terlalu panjang' }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Alamat email tidak valid' })
    .toLowerCase(),
  password: z
    .string()
    .min(1, { message: 'Password wajib diisi' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

