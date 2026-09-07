'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { IANA_TIMEZONES } from '@/lib/utils';
import { AppTopbar } from '@/components/layout/app-topbar';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [reportTime, setReportTime] = useState('08:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [gmail1Connected, setGmail1Connected] = useState(false);
  const [gmail2Connected, setGmail2Connected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [gmailAccounts, setGmailAccounts] = useState([]);
  const [profile, setProfile] = useState({
    name: '', gender: 'prefer_not_to_say', profession: 'professor_teacher', country: 'India',
  });

  // Fetch initial connection status
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/account');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setReportTime(data.settings.report_time || '08:00');
            setTimezone(data.settings.timezone || 'Asia/Kolkata');
            if (data.settings.profile_completed) setStep(1);
          }
          if (data.user) {
            setProfile((current) => ({
              ...current,
              name: data.user.name || '',
              gender: data.user.gender || current.gender,
              profession: data.user.profession || current.profession,
              country: data.user.country || current.country,
            }));
          }
          if (data.gmail_connections) {
            setGmailAccounts(data.gmail_connections);
            setGmail1Connected(data.gmail_connections.some((c) => c.connection_slot === 1 && c.status === 'connected'));
            setGmail2Connected(data.gmail_connections.some((c) => c.connection_slot === 2 && c.status === 'connected'));
          }
          if (data.drive_connection) {
            setDriveConnected(data.drive_connection.status === 'connected');
          }
        }
      } catch (err) {
        console.error('Failed to load initial account data:', err);
      }
    }
    checkStatus();
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, reportTime, timezone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Unable to save your profile.');
      }
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/update-report-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportTime, timezone, onboardingCompleted: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to update settings');
      }
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 0, title: 'Your Profile', desc: 'Required details for personalized reports' },
    { num: 1, title: 'Connect Mailboxes', desc: 'Authorize your primary & secondary Gmail' },
    { num: 2, title: 'Google Drive', desc: 'Authorize PDF report storage folder' },
    { num: 3, title: 'Delivery Schedule', desc: 'Select briefing time & timezone' },
    { num: 4, title: 'Subscription', desc: 'Activate your InboxIQ plan' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar title="Setup Wizard" subtitle="Complete your profile, then configure your email intelligence pipeline" />

      <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-8">
        {/* Step Indicator */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-xl border text-left transition-all ${
                step === s.num
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                  : step > s.num
                  ? 'border-emerald-200 dark:border-emerald-900 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-400'
                  : 'border-neutral-200 dark:border-neutral-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    step > s.num
                      ? 'bg-emerald-600 text-white'
                      : step === s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">{s.title}</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block">{s.desc}</p>
            </div>
          ))}
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Before You Connect: Tell Us About Yourself</CardTitle>
              <CardDescription>These required details personalize your briefing and are used as workflow context. They can only be changed by contacting support after setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">Full name</label>
                  <input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900" placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">Country</label>
                  <input required value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900" placeholder="Country" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">Profession</label>
                  <select value={profile.profession} onChange={(e) => setProfile({ ...profile, profession: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <option value="professor_teacher">Professor / Teacher</option><option value="student">Student</option><option value="others">Working Professional / Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">Gender</label>
                  <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">Preferred delivery time</label>
                  <select value={reportTime} onChange={(e) => setReportTime(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <option value="06:00">06:00 AM</option><option value="07:00">07:00 AM</option><option value="08:00">08:00 AM</option><option value="09:00">09:00 AM</option><option value="10:00">10:00 AM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    {IANA_TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter><span className="text-xs text-neutral-500">Required before Gmail can be connected.</span><Button variant="primary" loading={loading} onClick={handleSaveProfile}>Save profile &amp; continue <ArrowRight className="w-4 h-4 ml-2" /></Button></CardFooter>
          </Card>
        )}

        {/* STEP 1: CONNECT GMAIL */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Connect Your Gmail Accounts</CardTitle>
              <CardDescription>
                Connect up to 2 Gmail accounts (e.g. work/university and personal research).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Slot */}
              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Gmail #1 (Primary)
                    </h4>
                    <p className="text-xs text-neutral-500">
                      {gmail1Connected
                        ? `Connected (${gmailAccounts.find((c) => c.connection_slot === 1)?.account_email})`
                        : 'Required for morning briefing delivery'}
                    </p>
                  </div>
                </div>
                <div>
                  {gmail1Connected ? (
                    <Badge variant="success">Connected</Badge>
                  ) : (
                    <a href="/api/google/connect?type=gmail&slot=1">
                      <Button variant="primary" size="sm">
                        Connect Primary Gmail
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Secondary Slot */}
              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Gmail #2 (Optional)
                    </h4>
                    <p className="text-xs text-neutral-500">
                      {gmail2Connected
                        ? `Connected (${gmailAccounts.find((c) => c.connection_slot === 2)?.account_email})`
                        : 'Secondary account (e.g. personal research mailbox)'}
                    </p>
                  </div>
                </div>
                <div>
                  {gmail2Connected ? (
                    <Badge variant="success">Connected</Badge>
                  ) : (
                    <a href="/api/google/connect?type=gmail&slot=2">
                      <Button variant="outline" size="sm">
                        + Connect Second Gmail
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>We only request read &amp; send permissions. Tokens are encrypted at rest with AES-256.</span>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-neutral-500">
                {!gmail1Connected ? 'Connect at least Gmail #1 to proceed' : 'Ready to proceed'}
              </div>
              <Button
                variant="primary"
                disabled={!gmail1Connected && process.env.NODE_ENV === 'production'}
                onClick={() => setStep(2)}
              >
                Continue to Step 2 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: CONNECT GOOGLE DRIVE */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Connect Google Drive</CardTitle>
              <CardDescription>
                InboxIQ automatically archives generated PDF reports directly to your Google Drive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Google Drive Archival</h4>
                    <p className="text-xs text-neutral-500">
                      Creates: <code>My Drive &gt; InboxIQ &gt; Daily Reports</code>
                    </p>
                  </div>
                </div>
                <div>
                  {driveConnected ? (
                    <Badge variant="success">Connected</Badge>
                  ) : (
                    <a href="/api/google/connect?type=drive">
                      <Button variant="primary" size="sm">
                        Connect Google Drive
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <Alert variant="info" title="Automatic Folder Hierarchy">
                You never need to create folders manually. Once connected, InboxIQ creates and manages the &quot;Daily Reports&quot; folder using the least-privilege <code>drive.file</code> scope.
              </Alert>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Continue to Step 3 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: SCHEDULE & TIMEZONE */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Set Your Briefing Schedule</CardTitle>
              <CardDescription>
                Configure when your daily intelligence report should arrive every morning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                    Daily Report Time
                  </label>
                  <select
                    value={reportTime}
                    onChange={(e) => setReportTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="06:00">06:00 AM (Early Bird)</option>
                    <option value="07:00">07:00 AM</option>
                    <option value="08:00">08:00 AM (Recommended)</option>
                    <option value="09:00">09:00 AM (Standard Start)</option>
                    <option value="10:00">10:00 AM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                    IANA Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {IANA_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Calculated Reporting Window:
                </p>
                <p>
                  Every execution will process all emails received in the preceding 24 hours relative to {reportTime} in {timezone}.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button variant="primary" loading={loading} onClick={handleSaveSettings}>
                Save &amp; Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 4: SUBSCRIPTION ACTIVATION */}
        {step === 4 && (
          <Card className="border-2 border-emerald-500/80">
            <CardHeader className="text-center">
              <Badge variant="success" className="mx-auto mb-2">Almost Done</Badge>
              <CardTitle>Step 4: Activate InboxIQ Pro</CardTitle>
              <CardDescription>
                Complete your subscription to activate automated daily morning briefings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6 max-w-md mx-auto text-center">
              <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">InboxIQ Pro Subscription</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-neutral-900 dark:text-white">₹499</span>
                  <span className="text-xs text-neutral-500 font-semibold">/ month</span>
                </div>
                <p className="text-xs text-neutral-400">Includes 2 Gmail accounts + Google Drive PDF archival</p>
              </div>

              <div className="space-y-3">
                <Link href="/billing" className="block">
                  <Button size="lg" className="w-full text-base py-3">
                    Proceed to Razorpay Checkout <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    Skip to Dashboard (Setup Mode)
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
