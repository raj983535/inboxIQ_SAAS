'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export default function AdminLoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-950 text-white">
      <div className="mb-6 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-xs font-bold text-rose-300">
          <ShieldAlert className="w-3.5 h-3.5" /> Restricted Access
        </div>
        <h1 className="text-2xl font-black tracking-tight">InboxIQ Admin Portal</h1>
        <p className="text-xs text-neutral-400 max-w-sm">
          Administrative session authentication. Only verified accounts with admin role authorization can access this console.
        </p>
      </div>

      {isLiveClerk ? (
        <SignIn
          routing="path"
          path="/admin/login"
          signUpUrl="/sign-up"
          afterSignInUrl="/admin/dashboard"
          appearance={{
            baseTheme: dark,
            elements: {
              rootBox: 'mx-auto w-full max-w-md',
              card: 'bg-neutral-900 border border-neutral-800 shadow-2xl rounded-2xl text-white',
              headerTitle: 'text-white font-bold text-lg',
              headerSubtitle: 'text-neutral-400 text-xs',
              formButtonPrimary: 'bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm',
              footerActionLink: 'text-rose-400 hover:text-rose-300',
            },
          }}
        />
      ) : (
        <Card className="w-full max-w-md shadow-2xl bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold">Admin Console Access</h2>
              <p className="text-xs text-neutral-400">Development mode administrator preview</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900 text-xs text-rose-300 space-y-1">
              <span className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-rose-400" /> Admin Role Authorized
              </span>
              <p>Click below to enter the Admin Dashboard with full telemetry &amp; monitoring visibility.</p>
            </div>

            <Button
              onClick={() => router.push('/admin/dashboard')}
              variant="danger"
              size="lg"
              className="w-full text-base py-3"
            >
              Enter Admin Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Public Website
        </Link>
      </div>
    </div>
  );
}
