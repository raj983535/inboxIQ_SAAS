'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PLANS, CURRENCIES } from '@/lib/pricing';

export function PricingViewClient() {
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'

  const facultyPlan = PLANS.faculty.pricing[currency];
  const studentPlan = PLANS.student.pricing[currency];
  const othersPlan = PLANS.others.pricing[currency];

  return (
    <div className="py-12 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="brand">Simple SaaS Pricing</Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Invest in your daily focus
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-lg">
          Reclaim hours of triage time each week with an automated morning executive briefing tailored for your role.
        </p>

        {/* Currency Switcher */}
        <div className="pt-2 flex justify-center">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-full max-w-xs">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                currency === 'INR'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                currency === 'USD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🌐 USD ($)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Faculty / Professional Plan */}
        <Card className="border-2 border-emerald-500 shadow-2xl relative bg-white dark:bg-neutral-900 flex flex-col justify-between">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-max">
            <span className="bg-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow whitespace-nowrap inline-block">
              Faculty &amp; Professional
            </span>
          </div>

          <CardContent className="p-5 sm:p-8 space-y-6 pt-8 sm:pt-10">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">InboxIQ Pro</h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Ideal for professors, teachers, researchers, leaders, and working professionals.
              </p>
              <div className="pt-2 sm:pt-4 flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black text-neutral-900 dark:text-white">{facultyPlan.formatted}</span>
                <span className="text-neutral-500 text-sm font-semibold">{facultyPlan.period}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {currency === 'INR' ? 'Billed monthly in Indian Rupees (INR) via Razorpay' : 'Billed monthly in USD via Razorpay'}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200">
                Included Features:
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                {PLANS.faculty.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <div className="p-5 sm:p-8 pt-0 space-y-3">
            <Link href="/sign-up" className="block">
              <Button size="lg" className="w-full text-sm sm:text-base py-3 sm:py-3.5 shadow-lg shadow-emerald-600/25">
                Subscribe for {facultyPlan.formatted}/mo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Monthly recurring subscription via Razorpay. Cancel anytime.</span>
            </div>
          </div>
        </Card>

        {/* Student Plan */}
        <Card className="border border-amber-300 dark:border-amber-800 shadow-xl relative bg-white dark:bg-neutral-900 flex flex-col justify-between">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-max">
            <span className="bg-amber-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow whitespace-nowrap inline-block">
              Student Special
            </span>
          </div>

          <CardContent className="p-5 sm:p-8 space-y-6 pt-8 sm:pt-10">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">InboxIQ Student</h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Special accessible tier for college students, scholars, and interns.
              </p>
              <div className="pt-2 sm:pt-4 flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black text-neutral-900 dark:text-white">{studentPlan.formatted}</span>
                <span className="text-neutral-500 text-sm font-semibold">{studentPlan.period}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {currency === 'INR' ? 'Billed monthly in Indian Rupees (INR) via Razorpay' : 'Billed monthly in USD via Razorpay'}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200">
                Included Features:
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                {PLANS.student.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <div className="p-5 sm:p-8 pt-0 space-y-3">
            <Link href="/sign-up" className="block">
              <Button size="lg" variant="secondary" className="w-full text-sm sm:text-base py-3 sm:py-3.5 border border-neutral-300 dark:border-neutral-700">
                Subscribe for {studentPlan.formatted}/mo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Cancel anytime with 1-click in account dashboard.</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
