'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { Mail, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export default function SignUpPage() {
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080c14] transition-colors">
      {/* Brand Header */}
      <div className="mb-5 text-center space-y-2 max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-neutral-900 dark:text-neutral-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Mail className="w-4 h-4" />
          </div>
          <span>Inbox<span className="text-emerald-600">IQ</span></span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Your Account</h1>
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Get started with AI-driven executive email briefings in under 2 minutes.
        </p>
      </div>

      {/* Terms & Conditions Acceptance Box (Above Continue with Google) */}
      <div className="w-full max-w-[400px] mb-4 p-3.5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-sm transition-all">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            aria-label="Accept Terms & Conditions and Privacy Policy"
          />
          <div className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-0.5"
            >
              Terms of Service <ExternalLink className="w-2.5 h-2.5" />
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-0.5"
            >
              Privacy Policy <ExternalLink className="w-2.5 h-2.5" />
            </Link>
            , and consent to AI processing of email metadata.
          </div>
        </label>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit SSL Protected</span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-neutral-500">Zero Raw Email Storage</span>
        </div>

        {!acceptedTerms && (
          <div className="mt-2.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Please accept the Terms &amp; Conditions to continue registration.</span>
          </div>
        )}
      </div>

      {/* Clerk Sign Up Component */}
      <div className={`w-full flex justify-center transition-all duration-300 ${!acceptedTerms ? 'opacity-40 pointer-events-none select-none filter grayscale' : 'opacity-100'}`}>
        {isLiveClerk ? (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/onboarding"
            appearance={{
              layout: {
                termsPageUrl: '/terms',
                privacyPageUrl: '/privacy',
              },
            }}
          />
        ) : (
          <p className="max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Clerk is not configured in this environment. Add real Clerk keys to test registration locally.
          </p>
        )}
      </div>
    </div>
  );
}
