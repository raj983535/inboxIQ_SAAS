import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function RefundPolicyPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">Last updated: September 5, 2026</p>
      </div>

      <Alert variant="warning" title="Refund Processing Window Placeholder">
        Refunds, where applicable, are processed within <strong>5–7 business days</strong> to the original payment source via Razorpay.
      </Alert>

      <Card>
        <CardContent className="p-8 prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-neutral-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">1. Subscription Cancellations</h2>
            <p>
              You may cancel your InboxIQ monthly subscription at any time directly through the Billing section of your dashboard. Upon cancellation, your access to daily reports will remain active through the conclusion of your paid billing period, and you will not be billed again.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">2. Refund Eligibility</h2>
            <p>
              If you experience technical issues that prevent the delivery of your daily briefings, and our support team is unable to resolve the issue within 48 hours of notification, you are eligible for a full refund for that billing cycle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">3. How to Request a Refund</h2>
            <p>
              To request a refund, please reach out through our <a href="/contact" className="text-emerald-600 underline">Contact Support</a> page or email <strong>billing@inboxiq.in</strong> with your registered email and Razorpay payment ID.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">4. Processing Time</h2>
            <p>
              Approved refunds are credited back to your original payment method (Credit/Debit Card, UPI, Netbanking) within <strong>5–7 business days</strong>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
