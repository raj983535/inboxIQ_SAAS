'use client';

import React from 'react';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { Mail } from 'lucide-react';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export default function SignUpPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080c14]">
      <div className="mb-6 text-center space-y-2 max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-neutral-900 dark:text-neutral-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Mail className="w-4 h-4" />
          </div>
          <span>Inbox<span className="text-emerald-600">IQ</span></span>
        </Link>
        <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Create Your Account</h1>
        <p className="text-xs text-neutral-500">Create a secure account, then connect your inboxes in the setup wizard.</p>
      </div>

      {isLiveClerk ? (
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/onboarding" />
      ) : (
        <p className="max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Clerk is not configured in this environment. Add real Clerk keys to test registration locally.
        </p>
      )}
    </div>
  );
}
