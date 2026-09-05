'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-neutral-950 text-white">{children}</div>;
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
