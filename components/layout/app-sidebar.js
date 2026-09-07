'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  CreditCard,
  Mail,
  Compass,
  LogOut,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

function SignOutButton() {
  const router = useRouter();

  if (!isLiveClerk) {
    return (
      <button
        onClick={() => router.push('/')}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>
    );
  }

  try {
    const { signOut } = useClerk();
    return (
      <button
        onClick={() => signOut({ redirectUrl: '/' })}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>
    );
  } catch {
    return (
      <button
        onClick={() => router.push('/')}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>
    );
  }
}

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Onboarding Wizard', href: '/onboarding', icon: Compass },
    { label: 'Settings & Mailboxes', href: '/settings', icon: Settings },
    { label: 'Billing & Plan', href: '/billing', icon: CreditCard },
  ];

  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#070a10] flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Logo */}
        <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-neutral-900 dark:text-neutral-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Mail className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight">
              Inbox<span className="text-emerald-600">IQ</span>
            </span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded">
            Pro
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Controls */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
