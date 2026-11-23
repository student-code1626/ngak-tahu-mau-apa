'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  MessageSquare,
  Wallet,
  Target,
  CreditCard,
  TrendingUp,
  BarChart3,
  User,
  LogOut,
} from 'lucide-react';

export function AppNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { href: '/id/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/id/catat', label: 'Catat', icon: PlusCircle, isPrimary: true },
    { href: '/id/chat', label: 'Tanya Wise', icon: MessageSquare },
    { href: '/id/tujuan', label: 'Tujuan', icon: Target },
    { href: '/id/hutang', label: 'Hutang', icon: CreditCard },
    { href: '/id/aset', label: 'Aset', icon: TrendingUp },
    { href: '/id/laporan', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <>
      {/* Desktop / Tablet Header */}
      <header className="tw-bg-surface tw-border-b tw-border-border tw-sticky tw-top-0 tw-z-40">
        <div className="tw-max-w-6xl tw-mx-auto tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-h-16 tw-flex tw-items-center tw-justify-between">
          <div className="tw-flex tw-items-center tw-gap-6">
            <Link href="/id/dashboard" className="tw-flex tw-items-center tw-gap-2.5 tw-no-underline">
              <div className="tw-w-9 tw-h-9 tw-rounded-xl tw-bg-brand-primary tw-text-white tw-flex tw-items-center tw-justify-center tw-shadow-sm">
                <Sparkles className="tw-w-5 tw-h-5" />
              </div>
              <div>
                <span className="tw-text-base tw-font-bold tw-text-heading tw-tracking-tight tw-block">
                  WiseFinance
                </span>
                <span className="tw-text-[10px] tw-text-muted tw-block tw-leading-none">
                  Saving · Living · Playing
                </span>
              </div>
            </Link>

            <nav className="tw-hidden md:tw-flex tw-items-center tw-gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`tw-px-3 tw-py-2 tw-rounded-xl tw-text-xs tw-font-semibold tw-flex tw-items-center tw-gap-1.5 tw-transition-colors tw-no-underline ${
                      isActive
                        ? 'tw-bg-brand-primary/10 tw-text-brand-primary'
                        : 'tw-text-muted hover:tw-text-heading hover:tw-bg-page'
                    }`}
                  >
                    <Icon className="tw-w-4 tw-h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            <Link
              href="/id/catat"
              className="btn btn-sm btn-primary tw-hidden sm:tw-inline-flex tw-items-center tw-gap-1.5 tw-font-semibold tw-rounded-xl"
            >
              <PlusCircle className="tw-w-4 tw-h-4" />
              <span>Catat Transaksi</span>
            </Link>

            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary tw-rounded-xl tw-flex tw-items-center tw-gap-2 tw-py-1.5 tw-px-3"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="tw-w-6 tw-h-6 tw-rounded-full tw-bg-brand-primary/10 tw-text-brand-primary tw-flex tw-items-center tw-justify-center tw-text-xs tw-font-bold">
                  {session?.user?.displayName ? session.user.displayName[0].toUpperCase() : 'W'}
                </div>
                <span className="tw-text-xs tw-font-semibold tw-hidden sm:tw-inline">
                  {session?.user?.displayName || 'Profil'}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end tw-text-xs tw-shadow-lg tw-rounded-xl tw-p-2 tw-border-border">
                <li>
                  <Link className="dropdown-item tw-rounded-lg tw-py-2" href="/id/profil">
                    <User className="tw-w-3.5 tw-h-3.5 tw-inline tw-mr-2" />
                    Pengaturan Profil
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider tw-my-1" />
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: '/id/login' })}
                    className="dropdown-item tw-rounded-lg tw-py-2 tw-text-danger"
                  >
                    <LogOut className="tw-w-3.5 tw-h-3.5 tw-inline tw-mr-2" />
                    Keluar
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (PWA Experience) */}
      <nav className="md:tw-hidden tw-fixed tw-bottom-0 tw-left-0 tw-right-0 tw-bg-surface tw-border-t tw-border-border tw-z-40 tw-flex tw-items-center tw-justify-around tw-h-16 tw-px-2 tw-shadow-lg">
        {navLinks.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="tw-w-12 tw-h-12 tw-rounded-full tw-bg-brand-primary tw-text-white tw-flex tw-items-center tw-justify-center tw-shadow-md -tw-mt-5 tw-no-underline hover:tw-bg-brand-primary/90"
                aria-label="Catat Transaksi"
              >
                <Icon className="tw-w-6 tw-h-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`tw-flex tw-flex-col tw-items-center tw-gap-1 tw-text-[10px] tw-font-semibold tw-no-underline ${
                isActive ? 'tw-text-brand-primary' : 'tw-text-muted'
              }`}
            >
              <Icon className="tw-w-5 tw-h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

