import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function TermsPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white">
          Terms & Conditions
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">Last updated: September 5, 2026</p>
      </div>

      <Alert variant="info" title="Legal Notice Placeholder">
        The following terms constitute a template agreement for InboxIQ SaaS operations. Final legal terms are subject to formal business counsel verification.
      </Alert>

      <Card>
        <CardContent className="p-8 prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-neutral-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By signing up for or using InboxIQ (&quot;the Service&quot;), provided by InboxIQ Technologies (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">2. Description of Service</h2>
            <p>
              InboxIQ provides an AI-powered email intelligence and reporting SaaS platform. The Service integrates with Google APIs to retrieve email headers and text on a scheduled basis, process them using Gemini AI models to generate structured summaries, and deliver daily reports to the user&apos;s Gmail inbox and archive them to Google Drive.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">3. User Accounts &amp; Multi-Tenancy</h2>
            <p>
              You must authenticate via Clerk to create an InboxIQ account. You are responsible for maintaining the confidentiality of your credentials. Each user account is strictly isolated. You may connect a maximum of two (2) authorized Gmail accounts per subscription plan.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">4. Subscriptions &amp; Payments</h2>
            <p>
              InboxIQ Pro is offered on a monthly subscription basis at ₹499 INR per month (or other advertised tier rates). Payments are processed securely through Razorpay. Subscriptions automatically renew at the end of each billing period unless cancelled by the user prior to renewal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">5. Intellectual Property &amp; User Data</h2>
            <p>
              You retain all ownership rights in your emails and data. We do not claim any ownership over email content processed through the pipeline. We do not sell your personal data or email content to third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">6. Termination &amp; Disconnection</h2>
            <p>
              You may disconnect your Gmail and Google Drive accounts at any time from your account settings. Upon disconnection, stored OAuth authorization tokens are immediately deleted or invalidated.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
