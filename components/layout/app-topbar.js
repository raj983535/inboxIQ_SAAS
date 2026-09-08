'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  X,
  LayoutDashboard,
  Compass,
  Settings,
  CreditCard,
  Mail,
  LogOut,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useClerk } from '@clerk/nextjs';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

function SafeUserButton() {
  if (!isLiveClerk) {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
        IQ
      </div>
    );
  }

  try {
    return <UserButton afterSignOutUrl="/" />;
  } catch {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
        IQ
      </div>
    );
  }
}

function MobileSignOutButton({ onClose }) {
  const router = useRouter();

  const handleSignOut = () => {
    onClose();
    router.push('/');
  };

  if (!isLiveClerk) {
    return (
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    );
  }

  try {
    const { signOut } = useClerk();
    return (
      <button
        onClick={() => {
          onClose();
          signOut({ redirectUrl: '/' });
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    );
  } catch {
    return (
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    );
  }
}

export function AppTopbar({ title, subtitle }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Onboarding Wizard', href: '/onboarding', icon: Compass },
    { label: 'Settings & Mailboxes', href: '/settings', icon: Settings },
    { label: 'Billing & Plan', href: '/billing', icon: CreditCard },
  ];

  return (
    <>
      <header className="h-16 px-4 sm:px-8 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#070a10]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              {title || 'Dashboard'}
            </h1>
            {subtitle && <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px] sm:max-w-none">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Badge variant="success" className="hidden sm:inline-flex">
            System Ready
          </Badge>
          <SafeUserButton />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white dark:bg-[#070a10] border-r border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-neutral-100 dark:border-neutral-800">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 font-bold text-lg text-neutral-900 dark:text-neutral-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold tracking-tight">
                    Inbox<span className="text-emerald-600">IQ</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="py-6 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
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

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-neutral-500 font-medium">Theme</span>
                <ThemeToggle />
              </div>
              <MobileSignOutButton onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
