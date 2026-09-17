'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Shield,
  FileText,
  Activity,
  Calendar,
  Sparkles,
  RefreshCw,
  GraduationCap,
  BookOpen,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { AppTopbar } from '@/components/layout/app-topbar';
import { checkIsAdmin } from '@/lib/admin-auth';

import { useAccount } from '@/context/account-context';

export default function DashboardPage() {
  const { data, loading, error, refreshAccount } = useAccount();

  useEffect(() => {
    refreshAccount();
  }, []);

  const user = data?.user;
  const settings = data?.settings;
  const subscription = data?.subscription;
  const gmailConnections = data?.gmail_connections || [];
  const driveConnection = data?.drive_connection;
  const recentReports = data?.recent_reports || [];

  const activeGmailCount = gmailConnections.filter((c) => c.status === 'connected').length;
  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing' && subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();
  const isTrialExpired = subscription?.status === 'trial_ended' || (subscription?.status === 'trialing' && subscription?.current_period_end && new Date(subscription.current_period_end) <= new Date());
  const isSubscriptionExpired = subscription?.status === 'subscription_ended' || subscription?.status === 'expired' || (subscription?.status === 'cancelled' && subscription?.current_period_end && new Date(subscription.current_period_end) <= new Date());
  const isSubscribed = isActive || isTrialing;
  const trialHoursRemaining = isTrialing
    ? Math.max(0, Math.round((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60) * 10) / 10)
    : 0;
  const isDriveConnected = driveConnection?.status === 'connected';
  const profession = user?.profession || 'professor_teacher';
  const isAdmin = checkIsAdmin(user);

  // Profession-specific content customization
  const professionConfig = {
    professor_teacher: {
      title: 'Faculty Email Intelligence',
      badge: 'Professor / Teacher',
      badgeIcon: GraduationCap,
      badgeVariant: 'success',
      sampleSummary: 'Prioritizing student inquiries, NIRF/NAAC department circulars, thesis letters & exam schedules.',
      categories: [
        'Urgent Student Replies',
        'Department & Committee Circulars',
        'Academic & Research Memos',
        'FDP & Conference Invitations',
      ],
    },
    student: {
      title: 'Student Academic Digest',
      badge: 'Student',
      badgeIcon: BookOpen,
      badgeVariant: 'warning',
      sampleSummary: 'Prioritizing assignments, upcoming exams, project deadlines, internship offers & placement drives.',
      categories: [
        'Assignment & Lab Deadlines',
        'Exam Timetables & Hall Tickets',
        'Internship & Placement Alerts',
        'College & Club Activity Notices',
      ],
    },
    others: {
      title: 'Executive Email Intelligence',
      badge: 'Professional',
      badgeIcon: Briefcase,
      badgeVariant: 'brand',
      sampleSummary: 'Prioritizing client deliverables, meeting follow-ups, pending contract reviews & escalations.',
      categories: [
        'High-Priority Action Items',
        'Meeting Follow-ups & Notes',
        'Pending Client Responses',
        'Document & Invoice Approvals',
      ],
    },
  };

  const currentProf = professionConfig[profession] || professionConfig.professor_teacher;
  const ProfIcon = currentProf.badgeIcon;

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar
        title={`Welcome back${user?.name ? `, ${user.name}` : ''}`}
        subtitle={`${currentProf.title} • Next briefing @ ${settings?.report_time || '08:00 AM'}`}
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Live Active / Inactive Subscription Notification Section */}
        {loading && !data ? (
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-300 dark:bg-neutral-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-48 bg-neutral-300 dark:bg-neutral-800 rounded" />
                <div className="h-3 w-72 bg-neutral-200 dark:bg-neutral-800/60 rounded" />
              </div>
            </div>
            <div className="h-8 w-24 bg-neutral-300 dark:bg-neutral-800 rounded-lg shrink-0 hidden sm:block" />
          </div>
        ) : isTrialing ? (
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Free Trial Active ({trialHoursRemaining}h remaining)
                  </span>
                  <Badge variant="warning">Trial Active</Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Your daily AI briefing is scheduled to execute at <strong className="text-amber-700 dark:text-amber-300 font-bold">{settings?.report_time || '08:00 AM'}</strong> ({settings?.timezone || 'Asia/Kolkata'}) and deliver to <strong className="text-neutral-900 dark:text-white font-bold">{user?.email}</strong>.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <Link href="/billing" className="block">
                <Button size="sm" variant="primary" className="w-full sm:w-auto text-xs">
                  Upgrade to Paid Plan <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ) : isActive ? (
          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Payment Verified &amp; Workflow Scheduled
                  </span>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Your daily AI briefing is scheduled to execute at <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{settings?.report_time || '08:00 AM'}</strong> ({settings?.timezone || 'Asia/Kolkata'}) and deliver to <strong className="text-neutral-900 dark:text-white font-bold">{user?.email}</strong>.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <Link href="/billing" className="block">
                <Button size="sm" variant="outline" className="w-full sm:w-auto border-emerald-600/40 text-emerald-800 dark:text-emerald-300 text-xs">
                  Manage Plan
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    {isTrialExpired ? 'Trial Expired' : isSubscriptionExpired ? 'Subscription Expired' : 'Subscription Inactive'}
                  </span>
                  <Badge variant="danger">Action Required</Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {isTrialExpired
                    ? 'Your 3-day free trial has expired. Upgrade your subscription to resume automated daily email briefings.'
                    : isSubscriptionExpired
                    ? 'Your subscription period has ended. Renew your subscription to resume automated scheduled briefings.'
                    : 'Automated email intelligence is locked. Please activate your monthly subscription to enable scheduled briefings.'}
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <Link href="/billing" className="block">
                <Button size="sm" variant="primary" className="w-full sm:w-auto text-xs">
                  {isTrialExpired ? 'Upgrade Subscription' : isSubscriptionExpired ? 'Renew Subscription' : 'Activate Subscription'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Gmail Connection Auth Expired / Error Alert */}
        {gmailConnections.some((c) => c.status === 'error') && (
          <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    Action Required: Gmail Authorization Expired
                  </span>
                  <Badge variant="danger">Reconnect Needed</Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Google authorization for your Gmail account has expired. Your daily briefings cannot fetch new emails until you reconnect.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <Link href="/settings" className="block">
                <Button size="sm" variant="danger" className="w-full sm:w-auto text-xs">
                  Reconnect in Settings <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Admin Quick Banner (Strictly visible only to verified Admin sahilrajppm2022@gmail.com) */}
        {isAdmin && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-neutral-900 border border-rose-200 dark:border-neutral-800 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Admin Privileges Active</span>
                <p className="text-xs text-slate-600 dark:text-neutral-300">
                  You are logged in as the verified administrator. You can manage system telemetry or switch to the Admin Portal.
                </p>
              </div>
            </div>
            <Link href="/admin/dashboard">
              <Button size="sm" variant="danger" className="text-xs">
                Open Admin Portal <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Role & Operational Status Banner */}
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ProfIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {currentProf.title}
                </h2>
                <Badge variant={currentProf.badgeVariant}>{currentProf.badge}</Badge>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentProf.sampleSummary}
              </p>
            </div>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              Adjust Preferences
            </Button>
          </Link>
        </div>

        {/* Operational Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Subscription Status */}
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Plan Status</span>
                <CreditCard className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                    {loading && !data ? (
                      <span className="inline-block w-20 h-6 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    ) : (
                      subscription?.status ? subscription.status.toUpperCase() : 'INACTIVE'
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {loading && !data
                      ? 'Loading...'
                      : isTrialing
                      ? `${trialHoursRemaining}h remaining in trial`
                      : isTrialExpired
                      ? 'Trial expired — renew'
                      : isActive
                      ? `${subscription?.plan_name || 'Pro Active'}`
                      : 'Setup Required'}
                  </p>
                </div>
                {loading && !data ? (
                  <span className="inline-block w-14 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                ) : (
                  <Badge variant={isActive ? 'success' : isTrialing ? 'warning' : 'danger'}>
                    {isActive ? 'Active' : isTrialing ? 'Trial Active' : 'Not Active'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gmail Connections Status */}
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Mailboxes</span>
                <Mail className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                    {loading && !data ? (
                      <span className="inline-block w-14 h-6 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    ) : (
                      `${activeGmailCount} / 2`
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {loading && !data ? 'Checking...' : activeGmailCount === 2 ? 'Both Connected' : activeGmailCount === 1 ? '1 Slot Available' : 'No Mailbox'}
                  </p>
                </div>
                {loading && !data ? (
                  <span className="inline-block w-16 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                ) : (
                  <Badge variant={activeGmailCount > 0 ? 'brand' : 'danger'}>
                    {activeGmailCount > 0 ? 'Connected' : 'Disconnected'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Briefing Delivery Status */}
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Delivery Target</span>
                <Mail className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                    Gmail Inbox
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[130px]">
                    {loading && !data ? 'Checking...' : user?.email || 'Primary Account'}
                  </p>
                </div>
                <Badge variant={activeGmailCount > 0 ? 'success' : 'default'}>
                  {activeGmailCount > 0 ? 'Verified' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Status */}
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Delivery Time</span>
                <Clock className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                    {loading && !data ? (
                      <span className="inline-block w-16 h-6 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    ) : (
                      settings?.report_time || '08:00 AM'
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[120px]">
                    {settings?.timezone || 'Asia/Kolkata'}
                  </p>
                </div>
                <Badge variant="success">Scheduled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Focus Areas & Mailbox Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Priority Focus Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Target Intelligence Focus Areas</CardTitle>
                <CardDescription>
                  Your morning briefing filters and groups your incoming threads into these priority categories:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentProf.categories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center gap-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mailbox Sources */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Authorized Mailbox Sources</CardTitle>
                  <CardDescription>
                    InboxIQ processes up to 2 Gmail accounts concurrently. Tokens are encrypted with AES-256.
                  </CardDescription>
                </div>
                <Link href="/settings">
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Slot 1 */}
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                      #1
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {gmailConnections.find((c) => c.connection_slot === 1)?.account_email || 'Primary Gmail (Not Connected)'}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {gmailConnections.find((c) => c.connection_slot === 1)
                          ? `Status: ${gmailConnections.find((c) => c.connection_slot === 1).status}`
                          : 'Primary mailbox source & report recipient'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    {gmailConnections.find((c) => c.connection_slot === 1 && c.status === 'connected') ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <a href="/api/google/connect?type=gmail&slot=1" className="block w-full sm:w-auto">
                        <Button size="sm" variant="primary" className="w-full sm:w-auto">
                          Connect
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* Slot 2 */}
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                      #2
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {gmailConnections.find((c) => c.connection_slot === 2)?.account_email || 'Secondary Gmail (Not Connected)'}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {gmailConnections.find((c) => c.connection_slot === 2)
                          ? `Status: ${gmailConnections.find((c) => c.connection_slot === 2).status}`
                          : 'Optional second mailbox'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    {gmailConnections.find((c) => c.connection_slot === 2 && c.status === 'connected') ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <a href="/api/google/connect?type=gmail&slot=2" className="block w-full sm:w-auto">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto">
                          Connect Slot 2
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Briefing Schedule Preview */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border-neutral-800">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Next Morning Briefing
                </div>
                <h3 className="text-2xl font-black">Tomorrow @ {settings?.report_time || '08:00 AM'}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  The automation pipeline will aggregate your connected Gmail accounts, identify action items with AI, and deliver the executive briefing directly to your primary inbox.
                </p>
                <div className="pt-2">
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="w-full text-white border-neutral-700 hover:bg-neutral-800">
                      Adjust Schedule
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Architecture Guarantees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Zero Email Storage:</strong> We never warehouse raw email text.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>AES-256 Crypto:</strong> Hardware-backed token encryption.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
