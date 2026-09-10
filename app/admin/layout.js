'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Menu,
  X,
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
} from 'lucide-react';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useClerk } from '@clerk/nextjs';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  
  // Synchronous initialization from cache prevents flashes/sign-in jumps during tab switching
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('inboxiq_cached_account');
        if (cached) {
          const parsed = JSON.parse(cached);
          const role = parsed?.user?.role;
          if (role === 'admin' || role === 'super_admin') return true;
        }
      } catch (e) {}
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('inboxiq_cached_account');
        if (cached) {
          const parsed = JSON.parse(cached);
          const role = parsed?.user?.role;
          if (role === 'admin' || role === 'super_admin') return false;
        }
      } catch (e) {}
    }
    return true;
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const res = await fetch('/api/account');
        if (!res.ok) {
          if (isMounted) setIsAdmin(false);
          return;
        }
        const data = await res.json();
        const role = data.user?.role;
        if (role === 'admin' || role === 'super_admin') {
          if (isMounted) {
            setIsAdmin(true);
            try {
              sessionStorage.setItem('inboxiq_cached_account', JSON.stringify(data));
            } catch (e) {}
          }
        } else {
          if (isMounted) {
            setIsAdmin(false);
            setTimeout(() => router.push('/dashboard'), 2500);
          }
        }
      } catch (err) {
        // If already validated from cache, do not kick out on transient fetch glitch
        if (isMounted && isAdmin === null) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <div className="min-h-screen bg-neutral-950 text-white">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs uppercase tracking-wider font-semibold">Verifying Administrator Privileges...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6 text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Administrator Access Required</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This area is strictly restricted to system administrators. Redirecting you back to your user dashboard...
            </p>
          </div>
          <Link href="/dashboard" className="block">
            <Button variant="outline" size="sm" className="w-full text-xs text-white border-neutral-700 hover:bg-neutral-800">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Return to User Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-neutral-950 text-neutral-100">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Topbar */}
      <header className="lg:hidden h-16 px-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-800 transition-colors"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white text-xs font-bold shadow">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-white">InboxIQ Admin</span>
          </div>
        </div>
        <Link href="/dashboard">
          <Button size="sm" variant="outline" className="text-xs text-neutral-300 border-neutral-700">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> App
          </Button>
        </Link>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col justify-between shadow-2xl z-50">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-white text-sm">InboxIQ Admin</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-neutral-800 text-white font-semibold border-l-2 border-rose-500'
                          : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : 'text-neutral-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to User Dashboard
              </Link>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-neutral-500">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900/60 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
