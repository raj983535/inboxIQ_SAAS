'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickSignIn = (e) => {
    e.preventDefault();
    setLoading(true);
    // Route to dashboard / onboarding
    router.push('/dashboard');
  };

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

      <Card className="w-full max-w-md shadow-xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <CardContent className="p-8 space-y-6">
          <form onSubmit={handleQuickSignIn} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="sahilrajppm2022@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full text-base py-3"
            >
              Sign In to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link href="/sign-up" className="text-xs text-neutral-500 hover:text-emerald-600">
              Don&apos;t have an account yet? Register here →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
