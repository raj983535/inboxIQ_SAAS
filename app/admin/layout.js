'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAdminAuth() {
      try {
        const res = await fetch('/api/account');
        if (!res.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await res.json();
        const role = data.user?.role;
        if (role === 'admin' || role === 'super_admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setTimeout(() => router.push('/dashboard'), 2500);
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAuth();
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
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900/60 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
