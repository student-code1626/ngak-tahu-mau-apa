'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterInput } from '@/domain/rules/auth.schema';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mendaftar akun');
      }

      // Auto sign-in after successful registration
      const loginRes = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (!loginRes?.ok) {
        router.push('/id/login');
        return;
      }

      router.push('/id/onboarding');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat registrasi');
      setIsLoading(false);
    }
  };

  return (
    <div className="tw-min-h-[90vh] tw-flex tw-items-center tw-justify-center tw-px-4 tw-py-10">
      <div className="gt-card">
        {/* Brand header matching WiseFinance-Updated_claude_11.html */}
        <div className="gt-brand">
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

        <h1 className="tw-text-xl tw-font-extrabold tw-font-display tw-tracking-tight tw-text-[#202820] tw-mb-1.5">
          Daftar ke WiseFinance
        </h1>
        <p className="tw-text-xs tw-text-[#7b847b] tw-mb-5 tw-leading-relaxed">
          Mulai atur keuangan dengan asisten cerdas Wise dan pos Saving, Living, Playing.
        </p>

        {errorMsg && (
          <div className="gt-err" role="alert">
            <AlertCircle className="tw-w-4 tw-h-4 tw-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-3.5">
          <div>
            <label className="field-label">
              <span>Nama Panggilan</span>
              <input
                type="text"
                autoComplete="given-name"
                placeholder="Contoh: Alex"
                className={errors.displayName ? 'tw-border-[#bd5f52]' : ''}
                {...register('displayName')}
              />
            </label>
            {errors.displayName && (
              <p className="tw-text-[0.72rem] tw-font-semibold tw-text-[#bd5f52] tw-mt-1">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label className="field-label">
              <span>Alamat Email</span>
              <input
                type="email"
                autoComplete="username"
                placeholder="nama@email.com"
                className={errors.email ? 'tw-border-[#bd5f52]' : ''}
                {...register('email')}
              />
            </label>
            {errors.email && (
              <p className="tw-text-[0.72rem] tw-font-semibold tw-text-[#bd5f52] tw-mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="field-label">
              <span>Kata Sandi (Min. 8 Karakter)</span>
              <span className="gt-pw">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className={errors.password ? 'tw-border-[#bd5f52]' : ''}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="gt-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </span>
            </label>
            {errors.password && (
              <p className="tw-text-[0.72rem] tw-font-semibold tw-text-[#bd5f52] tw-mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="gt-btn">
            {isLoading ? (
              <>
                <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" />
                <span>Membuat Akun...</span>
              </>
            ) : (
              <span>Buat Akun Sekarang</span>
            )}
          </button>
        </form>

        <p className="gt-note">
          Datamu tersimpan aman di akunmu dan tersinkron antar perangkat.
        </p>

        <div className="tw-text-center tw-mt-4 tw-pt-4 tw-border-t tw-border-[#e6e9e1]">
          <Link href="/id/login" className="gt-link">
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
