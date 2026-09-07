'use client';

import React from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

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

export function AppTopbar({ title, subtitle }) {
  return (
    <header className="h-16 px-6 sm:px-8 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-[#070a10]/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          {title || 'Dashboard'}
        </h1>
        {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="success" className="hidden sm:inline-flex">
          System Ready
        </Badge>
        <SafeUserButton />
      </div>
    </header>
  );
}
