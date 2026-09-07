'use client';

import React from 'react';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Mail } from 'lucide-react';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#080c14]">
      <div className="mb-6 text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-neutral-900 dark:text-neutral-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Mail className="w-4 h-4" />
          </div>
          <span>Inbox<span className="text-emerald-600">IQ</span></span>
        </Link>
        <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Sign In to InboxIQ</h1>
        <p className="text-xs text-neutral-500">Access your email intelligence dashboard and settings</p>
      </div>

      {isLiveClerk ? (
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      ) : (
        <p className="max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Clerk is not configured in this environment. Add real Clerk keys to test sign-in locally.
        </p>
      )}
    </div>
  );
}
