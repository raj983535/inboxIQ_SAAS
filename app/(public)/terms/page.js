import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'InboxIQ Terms & Conditions | InboxIQ',
  description: 'Terms and Conditions governing the use of InboxIQ email intelligence platform and services.',
};

export default function TermsPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <FileText className="w-3.5 h-3.5" /> Legal &amp; Compliance
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: September 6, 2026 • Effective immediately upon account registration or platform usage.
        </p>
      </div>

      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-6 sm:p-10 space-y-8 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. Acceptance of Terms */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or creating an account on InboxIQ (&quot;InboxIQ&quot;, &quot;the Service&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) accessible via <a href="https://inboxiq.online" className="text-emerald-600 dark:text-emerald-400 hover:underline">https://inboxiq.online</a>, you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, you must not access or use the Service.
            </p>
          </section>

          {/* 2. About InboxIQ */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              2. About InboxIQ
            </h2>
            <p>
              InboxIQ is an AI-powered email intelligence Software-as-a-Service (SaaS) platform. The platform connects to supported, user-authorized third-party services—such as Gmail—to process email metadata and content on a scheduled basis and generate structured, actionable executive intelligence reports delivered directly to your inbox.
            </p>
          </section>

          {/* 3. User Accounts */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              3. User Accounts &amp; Registration
            </h2>
            <p>
              To access the Service, users must complete the registration flow and provide accurate, current, and complete registration information (including Name, Email, Profession, Country, Gender, Preferred Report Time, and Timezone). Authentication is managed securely through our designated authentication infrastructure. You are responsible for safeguarding your login credentials and maintaining control over the email address associated with your account.
            </p>
          </section>

          {/* 4. Google Account Connections */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              4. Google Account Connections &amp; Authorization
            </h2>
            <p>
              InboxIQ allows users to connect supported Google accounts (Gmail) through standard Google OAuth authorization flows.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>InboxIQ never requests, stores, or has access to your Google or Gmail account passwords.</li>
              <li>You explicitly authorize specific, least-privilege scopes during Google OAuth consent.</li>
              <li>Users may connect up to two (2) Gmail accounts concurrently, depending on the active subscription tier.</li>
              <li>You may disconnect any connected Google account at any time from your Account Settings, which immediately invalidates and removes associated authorization credentials.</li>
            </ul>
          </section>

          {/* 5. AI Processing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              5. AI Processing &amp; Intelligence Generation
            </h2>
            <p>
              InboxIQ utilizes advanced AI models and third-party AI processing services where required to provide the service. These models analyze authorized email messages within your configured 24-hour reporting window to extract priority tasks, upcoming deadlines, pending replies, and categorized summaries. Email content processed by AI models is handled transiently to construct your report and is not used to train public machine learning models.
            </p>
          </section>

          {/* 6. Email Reports */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              6. Scheduled Email Intelligence Reports
            </h2>
            <p>
              InboxIQ generates scheduled email intelligence reports based on authorized email data and delivers those reports directly to your primary connected Gmail account at your configured morning delivery schedule and selected IANA timezone.
            </p>
          </section>

          {/* 7. Briefing Format & Delivery */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              7. Briefing Format &amp; Delivery
            </h2>
            <p>
              Daily intelligence summaries are compiled into structured, responsive HTML executive briefings delivered directly to your primary authorized Gmail inbox. Users can review, pin, or organize these briefings within their email application.
            </p>
          </section>

          {/* 8. Subscriptions & Pricing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              8. Subscriptions &amp; Pricing
            </h2>
            <p>
              InboxIQ provides monthly subscription-based plans tailored by user profession. Our advertised pricing schedule is:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
                <div className="font-bold text-neutral-900 dark:text-white text-xs">Professor / Teacher</div>
                <div className="text-emerald-600 font-extrabold text-sm mt-1">₹499 / mo (India)</div>
                <div className="text-neutral-500 text-xs">$8 / mo (International)</div>
              </div>
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
                <div className="font-bold text-neutral-900 dark:text-white text-xs">Student</div>
                <div className="text-amber-600 font-extrabold text-sm mt-1">₹99 / mo (India)</div>
                <div className="text-neutral-500 text-xs">$4 / mo (International)</div>
              </div>
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
                <div className="font-bold text-neutral-900 dark:text-white text-xs">Others / Professional</div>
                <div className="text-blue-600 font-extrabold text-sm mt-1">₹499 / mo (India)</div>
                <div className="text-neutral-500 text-xs">$8 / mo (International)</div>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              All prices are transparently displayed on our <Link href="/pricing" className="text-emerald-600 underline">Pricing page</Link> and reflect your selected currency.
            </p>
          </section>

          {/* 9. Payments */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              9. Payment Processing
            </h2>
            <p>
              Payments for InboxIQ subscriptions are processed securely through Razorpay. By subscribing, you authorize Razorpay to charge the applicable subscription fee automatically every month until you cancel. Razorpay may send payment and renewal notifications using the contact details associated with your payment method.
            </p>
          </section>

          {/* 10. Cancellation */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              10. Subscription Cancellation
            </h2>
            <p>
              Users may cancel their active subscription at any time through the Billing &amp; Subscription management controls in their dashboard. Cancellation prevents subsequent recurring renewals. You will continue to retain access to your paid features through the conclusion of your current paid billing period.
            </p>
          </section>

          {/* 11. Intellectual Property */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              11. Intellectual Property Rights
            </h2>
            <p>
              All rights, title, and interest in and to the InboxIQ platform—including software code, designs, branding, logos, documentation, and user interfaces—are and remain the exclusive property of InboxIQ and its respective licensors. Users retain full and exclusive rights to their own data, documents, and email content.
            </p>
          </section>

          {/* 12. User Data Ownership */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              12. User Data &amp; Content Ownership
            </h2>
            <p>
              InboxIQ does not claim ownership over any emails, documents, attachments, or data retrieved or processed on your behalf. We process your information strictly to generate the requested reports and provide the services you authorize.
            </p>
          </section>

          {/* 13. Service Availability */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              13. Service Availability &amp; Maintenance
            </h2>
            <p>
              InboxIQ is provided on an ongoing basis with high-availability cloud infrastructure. However, uninterrupted or error-free availability cannot be guaranteed. Scheduled maintenance, third-party API rate limits (e.g. Google APIs), or upstream outages may temporarily affect report generation or delivery.
            </p>
          </section>

          {/* 14. AI Limitations */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              14. AI Limitations &amp; Decision Verification
            </h2>
            <p>
              While InboxIQ leverages advanced AI models for synthesis and task extraction, AI-generated summaries may occasionally contain inaccuracies, omissions, or misinterpretations. You are solely responsible for reviewing and verifying all critical dates, deadlines, and action items against original emails. InboxIQ does not make legal, financial, academic, medical, or other critical decisions on behalf of users.
            </p>
          </section>

          {/* 15. Prohibited Use */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              15. Prohibited Uses
            </h2>
            <p>You agree not to use the Service for any unlawful purpose or to:</p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>Violate applicable local, national, or international laws or regulations.</li>
              <li>Connect Google accounts without proper ownership or authorization from the account holder.</li>
              <li>Attempt to reverse engineer, decompile, probe, or compromise the platform infrastructure or security.</li>
              <li>Abuse, overload, or disrupt the Service or third-party service integrations.</li>
            </ul>
          </section>

          {/* 16. Termination */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              16. Termination &amp; Suspension
            </h2>
            <p>
              We reserve the right to suspend or terminate account access for users who violate these Terms &amp; Conditions, engage in abusive or unauthorized behavior, or compromise platform integrity.
            </p>
          </section>

          {/* 17. Changes to Terms */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              17. Changes to Terms &amp; Conditions
            </h2>
            <p>
              We may update these Terms &amp; Conditions from time to time to reflect product enhancements, legal requirements, or operational changes. The latest version will always be published on <a href="https://inboxiq.online/terms" className="text-emerald-600 underline">https://inboxiq.online/terms</a> with an updated effective date.
            </p>
          </section>

          {/* 18. Contact Information */}
          <section className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              18. Contact Information
            </h2>
            <p>
              For inquiries, legal notices, or questions regarding these Terms &amp; Conditions, please contact us at:
            </p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Email: <a href="mailto:sahilrajppm2022@gmail.com" className="hover:underline">sahilrajppm2022@gmail.com</a>
            </p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
