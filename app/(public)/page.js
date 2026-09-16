'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  Calendar,
  Clock,
  FileText,
  Zap,
  GraduationCap,
  BookOpen,
  Briefcase,
  Layers,
  ChevronDown,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PLANS, CURRENCIES } from '@/lib/pricing';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does InboxIQ process my emails without compromising my privacy?',
      a: 'InboxIQ uses official Google OAuth authorization with least-privilege permissions. Your credentials and refresh tokens are encrypted at rest using industry-standard AES-256-GCM. We never store full email bodies in our application database—only transient intelligence metadata and report execution status are retained.',
    },
    {
      q: 'Can I connect multiple Gmail accounts?',
      a: 'Yes! InboxIQ supports up to two active Gmail accounts (e.g. your institutional faculty/college email and personal research/work email). Both inboxes are combined into one unified, de-duplicated morning intelligence briefing.',
    },
    {
      q: 'How does InboxIQ adapt to Professors, Students, and other Professionals?',
      a: 'During registration, you select your profession. The AI engine and dashboard adapt your daily executive report to prioritize what matters to you—such as student queries and committee deadlines for professors, or exam notices, project deadlines, and placement circulars for students.',
    },
    {
      q: 'Where do I receive the daily intelligence briefing?',
      a: 'The daily report is delivered directly to your primary Gmail inbox every morning at your configured time (e.g. 08:00 AM in your chosen timezone) as a beautifully formatted, actionable executive briefing.',
    },
    {
      q: 'Can I customize the delivery time and timezone?',
      a: 'Absolutely. You can choose any morning delivery time (e.g., 7:00 AM, 8:00 AM, 9:00 AM) and configure your specific IANA timezone (e.g. Asia/Kolkata, America/New_York, Europe/London).',
    },
    {
      q: 'How does billing work for Indian and International customers?',
      a: 'For faculty and working professionals, pricing is ₹499/month in India or $8/month internationally. For students, pricing is ₹99/month in India or $4/month internationally. Billing is securely managed via Razorpay, and you can cancel anytime with a single click.',
    },
  ];

  const facultyPlan = PLANS.faculty.pricing[currency];
  const studentPlan = PLANS.student.pricing[currency];

  return (
    <div className="flex flex-col space-y-24 md:space-y-32 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Faculty-First Email Intelligence • Also built for Students &amp; Professionals</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-[1.12]">
          Turn busy Gmail inboxes into{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
            actionable daily intelligence.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          InboxIQ aggregates your work and personal Gmail accounts, filters out noise, classifies deadlines and urgent requests, and delivers a concise executive report directly to your inbox every morning.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 py-3.5 shadow-lg shadow-emerald-600/25">
              Start 3-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-3.5">
              See How It Works
            </Button>
          </a>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 2 Gmail Accounts Supported
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Instant Executive Gmail Briefing
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Tailored for Faculty, Students &amp; Professionals
          </span>
        </div>
      </section>

      {/* 2. THE PROBLEM */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="danger" className="mb-3">The Inefficiency Problem</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Professionals spend hours every morning triaging fragmented emails
          </h2>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-sm sm:text-base">
            Faculty, students, and knowledge workers juggle circulars, urgent queries, administrative deadlines, research opportunities, and routine spam across disconnected accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-rose-200/60 dark:border-rose-950/40 bg-gradient-to-b from-rose-50/20 to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                01
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Inbox Overwhelm</h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Critical deadlines and urgent inquiries get buried under hundreds of automated alerts, newsletters, and irrelevant CCs.
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/60 dark:border-amber-950/40 bg-gradient-to-b from-amber-50/20 to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                02
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Fragmented Mailboxes</h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Constantly switching between institutional Google accounts and personal email leads to missed responses and disjointed schedules.
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200/60 dark:border-blue-950/40 bg-gradient-to-b from-blue-50/20 to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                03
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">No Archival Trail</h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Daily decisions and pending items lack a clean chronological record, creating audit anxiety during performance evaluations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. THE SOLUTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-6">
            <Badge variant="success" className="bg-emerald-800/80 text-emerald-200 border-emerald-700">
              The InboxIQ Solution
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              EMAIL → AI INTELLIGENCE → ACTIONABLE REPORT
            </h2>
            <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
              Instead of forcing you into yet another dashboard you forget to open, InboxIQ works in the background. It reads your 24-hour window, groups emails by urgency and context, structures next steps, and emails a clean briefing straight to you every morning.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-emerald-100 font-medium">
                  Zero email warehousing: your email data remains private and ephemeral.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-emerald-100 font-medium">
                  Structured AI intelligence verified before morning delivery.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW INBOXIQ WORKS */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="brand" className="mb-3">Simple 4-Step Process</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            How InboxIQ Works
          </h2>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-sm sm:text-base">
            Set up once in 2 minutes, and receive structured clarity every morning.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Connect Accounts',
              desc: 'Authenticate up to 2 Gmail accounts securely with Google OAuth.',
              icon: <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            },
            {
              step: '02',
              title: 'Set Your Schedule',
              desc: 'Choose your desired morning briefing time (e.g. 8:00 AM) and local timezone.',
              icon: <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
            },
            {
              step: '03',
              title: 'AI Processing Engine',
              desc: 'Our external pipeline normalizes, deduplicates, and classifies priority items with AI.',
              icon: <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
            },
            {
              step: '04',
              title: 'Morning Executive Delivery',
              desc: 'Get your structured, actionable executive HTML briefing delivered straight to Gmail.',
              icon: <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
            },
          ].map((item, idx) => (
            <Card key={idx} className="relative group hover:border-emerald-500/50 transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-2xl font-black text-neutral-300 dark:text-neutral-700">{item.step}</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{item.title}</h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. KEY FEATURES */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="purple" className="mb-3">Engineered for Precision</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Key Features Built for High-Impact Individuals
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Multi-Inbox Synthesis</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Consolidates work and personal Gmail accounts into one unified dataset with smart deduplication and thread tracking.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Timezone-Aware Scheduling</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Calculates rolling 24-hour windows matching your exact IANA timezone, ensuring no daylight savings discrepancies.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">AES-256 Security</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              All OAuth refresh tokens are encrypted at rest with AES-256-GCM and never exposed to the client or public logs.
            </p>
          </div>
        </div>
      </section>

      {/* 6. EXAMPLE DAILY REPORT (Interactive Mockup) */}
      <section id="sample-report" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="success" className="mb-3">Live Briefing Format</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            What your morning report looks like
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm">
            Clean, structured, and easy to review in under 3 minutes inside Gmail.
          </p>
        </div>

        <Card className="border-emerald-500/30 shadow-2xl overflow-hidden bg-white dark:bg-[#0c121e]">
          {/* Email mockup header */}
          <div className="bg-neutral-100 dark:bg-neutral-800/80 px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                IQ
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  InboxIQ Daily Intelligence Briefing
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  To: Prof. Sharma &lt;sharma@university.edu&gt; • Window: Past 24 Hours
                </div>
              </div>
            </div>
            <Badge variant="brand">Delivered 08:00 AM IST</Badge>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-sm text-neutral-800 dark:text-neutral-200">
            {/* Executive Summary */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1">
                Executive Summary
              </h4>
              <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed">
                You received <strong>42 emails</strong> across 2 mailboxes. <strong>3 items require your urgent response</strong>, 2 academic committee deadlines occur before Friday, and 1 research grant proposal review request was logged.
              </p>
            </div>

            {/* Action Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Action Required &amp; Urgent Replies (3)
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white">Dean of Academic Affairs</span>
                    <p className="text-xs text-neutral-500">Subject: End-Sem Exam Question Paper Submission by 4 PM</p>
                  </div>
                  <Badge variant="danger">Deadline: Today 4:00 PM</Badge>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white">Sahil Raj (Student Roll #121)</span>
                    <p className="text-xs text-neutral-500">Subject: Request for M.Tech Thesis Recommendation Letter</p>
                  </div>
                  <Badge variant="warning">Pending Reply</Badge>
                </div>
              </div>
            </div>

            {/* Academic / Research Updates */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Academic &amp; Research Highlights
              </h4>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                • IEEE Transactions Manuscript #IT-2026-091 status updated: Reviews returned (Minor Revisions required by Sep 20).
                <br />
                • Department Faculty Meeting scheduled for Thursday at 11:30 AM in Conference Hall B.
              </div>
            </div>

            {/* Delivery Confirmation */}
            <div className="text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-4 flex items-center justify-between">
              <span>Format: Responsive HTML Executive Briefing</span>
              <span className="text-emerald-500 font-medium">✓ Delivered Straight to Gmail</span>
            </div>
          </div>
        </Card>
      </section>

      {/* 7. BENEFITS FOR PROFESSIONALS & STUDENTS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="brand" className="mb-3">Tangible ROI</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Why High Performers Rely on InboxIQ
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Save 10+ Hours Every Week</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Eliminate mindless morning scrolling. Start your day with a verified summary of things that actually require action.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Zero Missed Deadlines</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every submission date, exam timetable, or contract follow-up is extracted with strict factual adherence.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">No New App to Learn</h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Experience the briefing inside your existing Gmail app on mobile or desktop without opening a separate dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 8. PROFESSION-BASED USE CASES: FACULTY, STUDENTS & PROFESSIONALS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="purple" className="mb-3">Personalized For You</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Dedicated Experiences Across Every Role
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm">
            Faculty-first email intelligence, with dedicated experiences for students and other working professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Faculty Box */}
          <div className="p-6 sm:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <GraduationCap className="w-4 h-4" /> Professor / Teacher
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Academic &amp; Faculty Leadership
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Student inquiries, attendance &amp; thesis letters.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Department circulars &amp; academic committee meetings.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Research grants, FDPs &amp; peer-review invitations.</span>
              </li>
            </ul>
          </div>

          {/* Student Box */}
          <div className="p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-xs font-bold text-amber-800 dark:text-amber-300">
              <BookOpen className="w-4 h-4" /> Student
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Academic &amp; Career Focus
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Assignment deadlines, exam timetables &amp; grades.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Internship offers, campus placements &amp; scholarships.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>College notices, hackathons &amp; club activities.</span>
              </li>
            </ul>
          </div>

          {/* Others Box */}
          <div className="p-6 sm:p-8 rounded-3xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-bold text-blue-800 dark:text-blue-300">
              <Briefcase className="w-4 h-4" /> Others / Professionals
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Corporate &amp; Knowledge Workers
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Client requests, pending contract signatures &amp; updates.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Meeting action items &amp; escalation threads.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>PDF archives for audit &amp; executive records.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 10. PRICING SECTION (WITH INR / USD SWITCHER & STUDENT PLAN) */}
      <section id="pricing" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="success" className="mb-3">Transparent SaaS Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Accessible Pricing for Every Role
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm sm:text-base">
            Select your preferred billing currency: India (INR) or International (USD).
          </p>

          {/* Currency Switcher */}
          <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                currency === 'INR'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🇮🇳 INR (₹) — India
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🌐 USD ($) — International
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-4">
          {/* Faculty / Professional Plan */}
          <Card className="border-2 border-emerald-500/80 shadow-2xl relative bg-white dark:bg-neutral-900 flex flex-col justify-between !overflow-visible mt-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-max z-20">
              <span className="bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap inline-block">
                Faculty &amp; Professional
              </span>
            </div>

            <CardContent className="p-8 sm:p-10 space-y-6 pt-10">
              <div className="text-center">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">InboxIQ Pro</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">For Professors, Teachers &amp; Professionals</p>
                <div className="py-4 border-y border-neutral-100 dark:border-neutral-800 mt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white">
                      {facultyPlan.formatted}
                    </span>
                    <span className="text-sm font-semibold text-neutral-500">{facultyPlan.period}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Billed monthly via Razorpay</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                {PLANS.faculty.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <div className="p-8 pt-0">
              <Link href="/sign-up" className="block">
                <Button size="lg" className="w-full text-base py-3 shadow-md">
                  Get Started as Faculty/Pro <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Student Plan */}
          <Card className="border border-amber-300 dark:border-amber-800 shadow-xl relative bg-white dark:bg-neutral-900 flex flex-col justify-between !overflow-visible mt-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-max z-20">
              <span className="bg-amber-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap inline-block">
                Student Special
              </span>
            </div>

            <CardContent className="p-8 sm:p-10 space-y-6 pt-10">
              <div className="text-center">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">InboxIQ Student</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">For College Students &amp; Researchers</p>
                <div className="py-4 border-y border-neutral-100 dark:border-neutral-800 mt-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white">
                      {studentPlan.formatted}
                    </span>
                    <span className="text-sm font-semibold text-neutral-500">{studentPlan.period}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Affordable student tier billed monthly</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                {PLANS.student.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <div className="p-8 pt-0">
              <Link href="/sign-up" className="block">
                <Button size="lg" variant="secondary" className="w-full text-base py-3 border border-neutral-300 dark:border-neutral-700">
                  Get Started as Student <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 11. FAQ SECTION */}
      <section id="faq" className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-3">Questions &amp; Answers</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/60 overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between font-semibold text-sm sm:text-base text-neutral-900 dark:text-neutral-100"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                    activeFaq === idx ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/60">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 12. CALL TO ACTION */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 sm:p-16 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to reclaim your mornings from inbox chaos?
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto">
            Join professors, students, and professionals who start every day with structured AI email clarity.
          </p>
          <div className="pt-2">
            <Link href="/sign-up">
              <Button size="lg" className="bg-white text-neutral-900 hover:bg-neutral-100 text-base px-8 py-3.5 shadow-xl font-bold">
                Start 3-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
