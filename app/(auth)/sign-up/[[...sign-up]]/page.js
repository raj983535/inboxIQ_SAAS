'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  GraduationCap,
  Globe,
  Clock,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { SignUp } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { IANA_TIMEZONES } from '@/lib/utils';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'United Arab Emirates',
  'Singapore',
  'Japan',
  'Netherlands',
  'Other',
];

export default function SignUpPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'male',
    profession: 'professor_teacher',
    country: 'India',
    reportTime: '08:00',
    timezone: 'Asia/Kolkata',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-detect browser timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setFormData((prev) => ({
          ...prev,
          timezone: detected,
          country: detected.includes('Calcutta') || detected.includes('Kolkata') ? 'India' : prev.country,
        }));
      }
    } catch (e) {
      console.warn('Could not auto-detect timezone:', e);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to complete registration.');
      }

      // Route to onboarding wizard
      router.push('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <p className="text-xs text-neutral-500">
          Personalize your daily email intelligence briefing based on your role.
        </p>
      </div>

      {isLiveClerk ? (
        <SignUp
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
          fallbackRedirectUrl="/onboarding"
          signInUrl="/sign-in"
        />
      ) : (
        <Card className="w-full max-w-xl shadow-2xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Compulsory Registration Information</CardTitle>
            <CardDescription>
              Profession, Country &amp; Gender are permanent setup details used to tailor your AI briefing.
            </CardDescription>
          </CardHeader>
        <CardContent>
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                placeholder="Prof. Sahil Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="sharma@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* 2. Password & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Password"
                type="password"
                required
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Gender (Permanent)
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-Binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* 3. Profession Selection (3 User Types) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                Your Profession (One-time Selection)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Professor */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, profession: 'professor_teacher' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    formData.profession === 'professor_teacher'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/60 ring-2 ring-emerald-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <GraduationCap className={`w-5 h-5 mb-1 ${formData.profession === 'professor_teacher' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`} />
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Professor / Teacher</div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Faculty, lecturers &amp; researchers</p>
                </button>

                {/* Student */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, profession: 'student' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    formData.profession === 'student'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/60 ring-2 ring-amber-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <BookOpen className={`w-5 h-5 mb-1 ${formData.profession === 'student' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'}`} />
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Student</div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Undergrad, postgrad &amp; scholars</p>
                </button>

                {/* Others */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, profession: 'others' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    formData.profession === 'others'
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 ring-2 ring-blue-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <Briefcase className={`w-5 h-5 mb-1 ${formData.profession === 'others' ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'}`} />
                  <div className="text-xs font-bold text-neutral-900 dark:text-white">Others / Pro</div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Knowledge workers &amp; executives</p>
                </button>
              </div>
            </div>

            {/* 4. Country & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Country (Permanent)
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Report Delivery Time
                </label>
                <select
                  value={formData.reportTime}
                  onChange={(e) => setFormData({ ...formData, reportTime: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="06:00">06:00 AM</option>
                  <option value="07:00">07:00 AM</option>
                  <option value="08:00">08:00 AM (Recommended)</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                </select>
              </div>
            </div>

            {/* 5. Timezone Selection (Pre-detected) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                Timezone (Auto-detected)
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {IANA_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={loading} variant="primary" size="lg" className="w-full text-base py-3">
                Complete Registration &amp; Setup <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="text-center pt-2">
              <Link href="/sign-in" className="text-xs text-neutral-500 hover:text-emerald-600">
                Already registered? Sign in to your existing account →
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
