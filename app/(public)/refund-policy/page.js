import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'InboxIQ Cancellation & Refund Policy | InboxIQ',
  description: 'Understand subscription cancellation terms, billing cycles, and refund eligibility for InboxIQ SaaS.',
};

export default function RefundPolicyPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <RefreshCw className="w-3.5 h-3.5" /> Billing Policy
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Cancellation &amp; Refund Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: September 6, 2026 • Clear and transparent billing terms for InboxIQ subscriptions.
        </p>
      </div>

      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-6 sm:p-10 space-y-8 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. Subscription Cancellation */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              1. Subscription Cancellation
            </h2>
            <p>
              Users may cancel their recurring InboxIQ subscription at any time through the <strong>Billing &amp; Subscription</strong> section in their account dashboard. Cancellation turns off automatic renewal; no further monthly charge will be attempted after the current paid billing period.
            </p>
          </section>

          {/* 2. Effect of Cancellation */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              2. Effect of Cancellation
            </h2>
            <p>
              Cancelling a subscription stops all subsequent automatic renewals. You will continue to retain full access to all features and scheduled daily email intelligence briefings through the remainder of your currently active, paid billing cycle.
            </p>
          </section>

          {/* 3. Refunds */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              3. Refund Terms
            </h2>
            <p>
              Because InboxIQ provides immediate access to digital SaaS infrastructure, scheduled report processing, and AI synthesis upon activation, subscription payments are generally <strong>non-refundable</strong> once a billing period has commenced. No automatic prorated refunds are provided for unused days within an active billing period.
            </p>
          </section>

          {/* 4. Exceptions */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              4. Exceptions &amp; Billing Disputes
            </h2>
            <p>
              Refund requests may be evaluated on a case-by-case basis under specific circumstances or where mandated by applicable law, such as:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>Duplicate or inadvertent multiple charges for the same billing period caused by payment gateway processing errors.</li>
              <li>Documented technical errors during payment processing where service access was not provisioned.</li>
            </ul>
          </section>

          {/* 5. Support & How to Contact */}
          <section className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              5. Contacting Support for Billing Inquiries
            </h2>
            <p>
              If you believe you experienced an erroneous charge or have questions regarding your subscription status, please reach out to our support team with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>Your registered InboxIQ account email address.</li>
              <li>Your Razorpay payment ID or invoice number.</li>
              <li>A clear description of the issue.</li>
            </ul>
            <div className="pt-2">
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Email: <a href="mailto:sahilrajppm2022@gmail.com" className="hover:underline">sahilrajppm2022@gmail.com</a>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                You can also reach us via our <Link href="/contact" className="text-emerald-600 underline">Contact Support Page</Link>.
              </p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
