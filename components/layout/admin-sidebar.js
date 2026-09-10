'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  CreditCard,
  Mail,
  GitBranch,
  FileText,
  AlertTriangle,
  Activity,
  Sliders,
  LogOut,
  ArrowLeft,
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

function AdminSignOutButton() {
  const router = useRouter();

  if (!isLiveClerk) {
    return (
      <button
        onClick={() => router.push('/admin/login')}
        className="w-full flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 transition-colors pt-2"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign Out Admin
      </button>
    );
  }

  try {
    const { signOut } = useClerk();
    return (
      <button
        onClick={() => signOut({ redirectUrl: '/admin/login' })}
        className="w-full flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 transition-colors pt-2"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign Out Admin
      </button>
    );
  } catch {
    return (
      <button
        onClick={() => router.push('/admin/login')}
        className="w-full flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 transition-colors pt-2"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign Out Admin
      </button>
    );
  }
}

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { label: 'Connections', href: '/admin/connections', icon: Mail },
    { label: 'Workflows', href: '/admin/workflows', icon: GitBranch },
    { label: 'Reports', href: '/admin/reports', icon: FileText },
    { label: 'Errors & Failures', href: '/admin/errors', icon: AlertTriangle },
    { label: 'System Health', href: '/admin/system', icon: Activity },
    { label: 'Platform Settings', href: '/admin/settings', icon: Sliders },
  ];

  return (
    <aside className="hidden lg:flex w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen transition-colors">
      <div>
        {/* Admin Header */}
        <div className="h-16 px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="font-black tracking-tight">InboxIQ Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-50 dark:bg-neutral-800 text-rose-600 dark:text-white font-semibold border-l-2 border-rose-500'
                    : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-slate-400 dark:text-neutral-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to User Dashboard
        </Link>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500 dark:text-neutral-500 font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <AdminSignOutButton />
      </div>
    </aside>
  );
}
