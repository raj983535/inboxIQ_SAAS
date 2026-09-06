import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PackageX, CheckCircle2, Zap, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'InboxIQ Shipping Policy | InboxIQ',
  description: 'Shipping and digital service delivery policy for InboxIQ Software-as-a-Service.',
};

export default function ShippingPolicyPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Zap className="w-3.5 h-3.5" /> Digital Delivery
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Shipping &amp; Delivery Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: September 6, 2026 • Digital delivery terms for online Software-as-a-Service (SaaS).
        </p>
      </div>

      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-6 sm:p-10 space-y-8 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. Digital Service Nature */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              1. Digital Service Delivery
            </h2>
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200 font-medium">
              Because InboxIQ is a digital SaaS service, there is no physical shipping or delivery.
            </div>
            <p className="pt-2">
              All services, intelligence features, and briefings provided by InboxIQ are entirely electronic and cloud-based. No tangible goods or hardware are shipped, and no physical courier services are utilized.
            </p>
          </section>

          {/* 2. Instant Provisioning */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              2. Service Provisioning &amp; Activation
            </h2>
            <p>
              Upon successful registration and completion of your subscription payment via Razorpay:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>Your account access and paid subscription tier features are activated immediately on the InboxIQ web platform.</li>
              <li>You can immediately connect your authorized Gmail and Google Drive accounts.</li>
              <li>Your automated daily email intelligence briefings will commence at your selected morning schedule and timezone.</li>
            </ul>
          </section>

          {/* 3. Electronic Delivery Channels */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              3. Electronic Delivery Channels
            </h2>
            <p>
              InboxIQ delivers its reports and outputs digitally through the following integrated channels:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li><strong>Gmail:</strong> Structured daily executive email briefing sent directly to your connected primary inbox.</li>
              <li><strong>Google Drive:</strong> Automatic daily PDF report archives saved to your designated <code>InboxIQ / Daily Reports</code> folder.</li>
              <li><strong>Web Dashboard:</strong> Live report status, execution history, and connection controls available 24/7 at <a href="https://inboxiq.online/dashboard" className="text-emerald-600 underline">https://inboxiq.online/dashboard</a>.</li>
            </ul>
          </section>

          {/* 4. Delivery Issues */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              4. Service Inquiries &amp; Delivery Support
            </h2>
            <p>
              If you experience any delay in account provisioning or report generation, please verify that your Google OAuth permissions remain active in your Account Settings or contact our support team:
            </p>
            <div className="pt-2">
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                Email: <a href="mailto:sahilrajdurgapur23@gmail.com" className="hover:underline">sahilrajdurgapur23@gmail.com</a>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Website: <a href="https://inboxiq.online" className="text-emerald-600 underline">https://inboxiq.online</a>
              </p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
