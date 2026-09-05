'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = clerkKey && !clerkKey.includes('placeholder') && !clerkKey.includes('mock') && !clerkKey.includes('Y2xlcmsuaW5ib3hpcS5kZXYk');

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#080c14]">
      <div className="mb-6 text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-neutral-900 dark:text-neutral-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Mail className="w-4 h-4" />
          </div>
          <span>Inbox<span className="text-emerald-600">IQ</span></span>
        </Link>
        <p className="text-xs text-neutral-500">Sign in to manage your email intelligence control panel</p>
      </div>

      {isLiveClerk ? (
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full max-w-md',
              card: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-2xl',
              headerTitle: 'text-neutral-900 dark:text-white font-bold',
              headerSubtitle: 'text-neutral-500 dark:text-neutral-400 text-xs',
              formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm',
              footerActionLink: 'text-emerald-600 hover:text-emerald-700',
            },
          }}
        />
      ) : (
        <Card className="w-full max-w-md shadow-xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Welcome to InboxIQ</h2>
              <p className="text-xs text-neutral-500">Development mode authentication preview</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Dev Mode Ready
              </span>
              <p>Click below to enter the dashboard as an authenticated user.</p>
            </div>

            <Button
              onClick={() => router.push('/dashboard')}
              variant="primary"
              size="lg"
              className="w-full text-base py-3"
            >
              Continue to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="text-center">
              <Link href="/admin/login" className="text-xs text-neutral-500 hover:text-emerald-600">
                Are you an administrator? Sign in to Admin Portal →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
