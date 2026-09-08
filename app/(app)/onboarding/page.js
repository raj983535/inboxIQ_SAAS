'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Mail,
  HardDrive,
  Clock,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  BellRing,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useAccount } from '@/context/account-context';
import { IANA_TIMEZONES } from '@/lib/utils';
import { AppTopbar } from '@/components/layout/app-topbar';
import { getPlanForProfession } from '@/lib/pricing';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: accountData, refreshAccount } = useAccount();
  const [step, setStepState] = useState(1); // Step 1: Profile | Step 2: Connect | Step 3: Payment
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Form State
  const [reportTime, setReportTime] = useState('08:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [gmail1Connected, setGmail1Connected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [gmailAccounts, setGmailAccounts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    gender: 'male',
    profession: 'professor_teacher',
    country: 'India',
  });

  const setStep = (newStep) => {
    setStepState(newStep);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inboxiq_onboarding_active_step', String(newStep));
    }
  };

  // Sync state from AccountContext data
  useEffect(() => {
    if (!accountData) return;

    const user = accountData.user;
    const settings = accountData.settings;
    const gmailConnections = accountData.gmail_connections || [];
    const driveConnection = accountData.drive_connection;
    const subscription = accountData.subscription;

    setUserData(user);

    if (user) {
      setProfile((prev) => ({
        name: prev.name || user.name || '',
        gender: user.gender || prev.gender || 'male',
        profession: user.profession || prev.profession || 'professor_teacher',
        country: user.country || prev.country || 'India',
      }));
    }

    if (settings) {
      if (settings.report_time) setReportTime(settings.report_time);
      if (settings.timezone) setTimezone(settings.timezone);
    }

    const hasGmail = gmailConnections.some((c) => c.connection_slot === 1 && c.status === 'connected');
    const hasDrive = driveConnection?.status === 'connected';
    const isProfileDone = Boolean(settings?.profile_completed || (user?.name && user?.profession));
    const isSubscribed = subscription?.status === 'active';

    setGmailAccounts(gmailConnections);
    setGmail1Connected(hasGmail);
    setDriveConnected(hasDrive);

    if (isSubscribed) {
      router.push('/dashboard');
      return;
    }

    // Determine Step Placement with localStorage memory
    const savedStepStr = typeof window !== 'undefined' ? localStorage.getItem('inboxiq_onboarding_active_step') : null;
    const savedStep = savedStepStr ? parseInt(savedStepStr, 10) : null;

    if (savedStep === 3 && (hasGmail || isProfileDone)) {
      setStepState(3);
    } else if (savedStep === 2 && isProfileDone) {
      setStepState(2);
    } else if (hasGmail && isProfileDone) {
      setStepState(3);
    } else if (isProfileDone) {
      setStepState(2);
    } else {
      setStepState(1);
    }
  }, [accountData, router]);

  // STEP 1: Save Profile to Supabase
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, reportTime, timezone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Unable to save your profile.');
      }
      await refreshAccount();
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Razorpay Subscription Checkout
  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setError(null);

    const planInfo = getPlanForProfession(profile.profession, 'INR');

    try {
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: 'INR',
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to initialize subscription checkout.');
      }

      const { subscriptionId, keyId } = await res.json();

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK is loading. Please try again in a moment.');
      }

      const options = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: 'InboxIQ SaaS',
        description: `${planInfo.name} (${planInfo.activePricing.formatted}/month)`,
        currency: 'INR',
        handler: async function (response) {
          // Mark onboarding completed in database
          await fetch('/api/update-report-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportTime, timezone, onboardingCompleted: true }),
          });
          setPaymentSuccess(true);
        },
        prefill: {
          name: profile.name || userData?.name || '',
          email: userData?.email || '',
        },
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Profile Setup', desc: 'Personalize your AI briefing' },
    { num: 2, title: 'Connect Mailbox', desc: 'Link 1 Gmail & Google Drive' },
    { num: 3, title: 'Activate Subscription', desc: 'Start your daily intelligence' },
  ];

  const planInfo = getPlanForProfession(profile.profession, 'INR');

  const isProfileDone = Boolean(userData?.name && userData?.profession);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#080c14]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <AppTopbar title="Setup Wizard" subtitle="Complete the 3 quick steps to activate your daily intelligence briefing" />

      <div className="p-6 sm:p-10 max-w-3xl mx-auto w-full space-y-8">
        {/* Step Indicator (Interactive) */}
        <div className="grid grid-cols-3 gap-3">
          {steps.map((s) => {
            const isClickable = s.num === 1 || (s.num === 2 && isProfileDone) || (s.num === 3 && isProfileDone && gmail1Connected);
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (isClickable) setStep(s.num);
                }}
                disabled={!isClickable}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  step === s.num
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                    : isClickable
                    ? 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/40 bg-white dark:bg-neutral-900/60 cursor-pointer'
                    : 'border-neutral-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                      step > s.num
                        ? 'bg-emerald-600 text-white'
                        : step === s.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{s.title}</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block">{s.desc}</p>
              </button>
            );
          })}
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* ========================================================================= */}
        {/* STEP 1: PROFILE SETUP */}
        {/* ========================================================================= */}
        {step === 1 && (
          <Card className="shadow-xl">
            <form onSubmit={handleSaveProfile}>
              <CardHeader>
                <CardTitle>Step 1: Your Profile &amp; Preferences</CardTitle>
                <CardDescription>
                  These details permanently tailor your daily AI briefing to your professional priorities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                      Full Name
                    </label>
                    <input
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      placeholder="e.g. Sahil Raj"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                      Gender
                    </label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                      Your Profession (AI Persona Focus)
                    </label>
                    <select
                      value={profile.profession}
                      onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-medium"
                    >
                      <option value="professor_teacher">Professor / Teacher (Faculty Tier - ₹499/mo)</option>
                      <option value="student">Student (Scholar Tier - ₹99/mo)</option>
                      <option value="others">Working Professional / Others (₹499/mo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                      Country
                    </label>
                    <select
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                      Preferred Briefing Time
                    </label>
                    <select
                      value={reportTime}
                      onChange={(e) => setReportTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    >
                      <option value="06:00">06:00 AM (Early Bird)</option>
                      <option value="07:00">07:00 AM</option>
                      <option value="08:00">08:00 AM (Recommended)</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    >
                      {IANA_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Saved securely in your private account.</span>
                <Button type="submit" variant="primary" loading={loading}>
                  Save Profile &amp; Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CONNECT GOOGLE (1 GMAIL + 1 DRIVE) */}
        {/* ========================================================================= */}
        {step === 2 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Step 2: Connect Your Google Mailbox &amp; Drive</CardTitle>
              <CardDescription>
                InboxIQ analyzes your primary mailbox and archives formatted PDF reports to your Google Drive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Gmail Slot (1 Mailbox for v1) */}
              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Primary Gmail Mailbox (v1)</h4>
                    <p className="text-xs text-neutral-500">
                      {gmail1Connected
                        ? `Connected (${gmailAccounts.find((c) => c.connection_slot === 1)?.account_email})`
                        : 'Required for daily briefing analysis & delivery'}
                    </p>
                  </div>
                </div>
                <div>
                  {gmail1Connected ? (
                    <Badge variant="success">✓ Connected</Badge>
                  ) : (
                    <a href="/api/google/connect?type=gmail&slot=1">
                      <Button variant="primary" size="sm">
                        Connect Primary Gmail
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Google Drive Slot */}
              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Google Drive Archival</h4>
                    <p className="text-xs text-neutral-500">
                      {driveConnected ? 'Connected (Folder: My Drive > InboxIQ > Daily Reports)' : 'Optional — Archives PDF briefings directly to Drive'}
                    </p>
                  </div>
                </div>
                <div>
                  {driveConnected ? (
                    <Badge variant="success">✓ Connected</Badge>
                  ) : (
                    <a href="/api/google/connect?type=drive">
                      <Button variant="outline" size="sm">
                        Connect Google Drive
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Tokens are encrypted with AES-256. Secondary mailbox slot will be available in v2.</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                variant="primary"
                disabled={!gmail1Connected}
                onClick={() => setStep(3)}
              >
                Continue to Step 3 (Activate Subscription) <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: MONTHLY SUBSCRIPTION & ACTIVATION */}
        {/* ========================================================================= */}
        {step === 3 && (
          <Card className="shadow-2xl border-2 border-emerald-500/80">
            <CardHeader className="text-center pb-2">
              <Badge variant="success" className="mx-auto mb-2">Final Step</Badge>
              <CardTitle className="text-2xl font-bold">Activate Your Monthly Intelligence Plan</CardTitle>
              <CardDescription>
                Payment activates the scheduled daily intelligence pipeline. Briefings will be sent to <strong>{userData?.email}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6 max-w-lg mx-auto text-center">
              {paymentSuccess ? (
                /* IN-APP CONFIRMATION NOTIFICATION ON PAYMENT SUCCESS */
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
                    <BellRing className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                      Payment Successful!
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Your AI email intelligence pipeline is <strong>ACTIVATED</strong> and scheduled to execute every morning at <strong>{reportTime} ({timezone})</strong>. Briefings will be delivered directly to <strong>{userData?.email}</strong>.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="primary"
                    size="lg"
                    className="w-full text-base py-3"
                  >
                    Go to Your Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                /* CHECKOUT CARD */
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{planInfo.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-neutral-900 dark:text-white">
                        {planInfo.activePricing.formatted}
                      </span>
                      <span className="text-xs text-neutral-500 font-semibold">{planInfo.activePricing.period}</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Tailored for: {planInfo.target}
                    </p>
                    <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1.5 text-left pt-3 border-t border-neutral-200 dark:border-neutral-800">
                      {planInfo.features.slice(0, 3).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={handleSubscribe}
                    loading={checkoutLoading}
                    variant="primary"
                    size="lg"
                    className="w-full text-base py-3.5 shadow-lg"
                  >
                    Subscribe &amp; Activate Briefing ({planInfo.activePricing.formatted}/mo) <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <p className="text-[11px] text-neutral-400">
                    Cancel anytime in 1-click from Settings. Secured by Razorpay.
                  </p>
                </div>
              )}
            </CardContent>
            {!paymentSuccess && (
              <CardFooter className="flex justify-start">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Connect
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
