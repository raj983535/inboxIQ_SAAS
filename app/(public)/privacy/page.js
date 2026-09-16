import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Eye, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'InboxIQ Privacy Policy | InboxIQ',
  description: 'Learn how InboxIQ collects, processes, and protects your personal data and authorized Google integration credentials.',
};

export default function PrivacyPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <Shield className="w-3.5 h-3.5" /> Privacy &amp; Data Protection
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: September 6, 2026 • We respect your privacy and protect your authorized mailbox credentials.
        </p>
      </div>

      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-6 sm:p-10 space-y-8 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed">
          
          {/* 1. Information We Collect */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              1. Information We Collect
            </h2>
            <p>
              To provide the InboxIQ service, we collect and process the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li><strong>Registration &amp; Profile Data:</strong> Full name, email address, gender, profession, country, timezone, and preferred morning report delivery time.</li>
              <li><strong>Authentication Data:</strong> User identifiers and session information provided through our authentication system.</li>
              <li><strong>Subscription &amp; Billing Metadata:</strong> Active subscription tier, payment status, currency, and renewal dates.</li>
              <li><strong>Connected Google Account Metadata:</strong> Account email addresses, connection slots, and connection timestamps.</li>
              <li><strong>Encrypted OAuth Tokens:</strong> Scoped OAuth refresh tokens required to access authorized Gmail services.</li>
              <li><strong>Operational &amp; Report Metadata:</strong> Timestamps of report generation, delivery logs, executive summary metadata, and error logs.</li>
              <li><strong>Support Inquiries:</strong> Communications and details submitted through our contact form.</li>
            </ul>
          </section>

          {/* 2. Gmail Data */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              2. Gmail Data Access &amp; Permissions
            </h2>
            <p>
              When you connect a Gmail account to InboxIQ, access is granted strictly through Google OAuth with least-privilege scopes. We never ask for, collect, or store your Gmail account passwords. InboxIQ accesses only email messages received within your active 24-hour reporting window to generate your daily briefing.
            </p>
          </section>

          {/* Google API Limited Use Disclosure */}
          <section className="space-y-3 p-4 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
            <h2 className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-200">
              Google API Limited Use Disclosure
            </h2>
            <p className="text-blue-800 dark:text-blue-300">
              InboxIQ&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline text-blue-900 dark:text-blue-200 hover:text-blue-700"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-blue-800/90 dark:text-blue-300/90">
              <li>We only use Google user data to provide and improve the user-facing email intelligence briefings prominently visible in the InboxIQ interface.</li>
              <li>We do not transfer or disclose Google user data to third parties unless strictly necessary to provide or improve the service, comply with applicable law, or as part of an asset acquisition.</li>
              <li>We never use or transfer Google user data to serve personalized, re-targeted, or interest-based advertising.</li>
              <li>We never allow humans to read user email data unless we have obtained your affirmative consent for specific messages, it is strictly necessary for security purposes (such as investigating abuse), or to comply with applicable law.</li>
            </ul>
          </section>

          {/* 3. Email Processing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              3. Purpose of Email Processing
            </h2>
            <p>
              Authorized email data is processed exclusively to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>Identify relevant messages and filter out automated clutter or noise.</li>
              <li>Classify messages according to urgency and your configured profession (e.g. faculty, student, professional).</li>
              <li>Detect upcoming deadlines, tasks, and pending replies.</li>
              <li>Generate structured executive email intelligence briefings.</li>
            </ul>
          </section>

          {/* 4. AI Processing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              4. AI Models &amp; Processing Services
            </h2>
            <p>
              InboxIQ uses modern AI models and processing services to synthesize email information into structured reports. Relevant email snippets are transmitted securely to AI processing infrastructure during scheduled report runs. Data processed by AI models is transient and used solely for generating your output—it is not used to train public models.
            </p>
          </section>

          {/* 5. Data Storage */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              5. Data Storage &amp; Minimization
            </h2>
            <p>
              InboxIQ follows strict data minimization principles. We do not permanently store or warehouse raw email message bodies in our application database. We retain only the operational metadata, summary reports, and account settings necessary to run the platform.
            </p>
          </section>

          {/* 6. OAuth Token Security */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              6. OAuth Token Encryption &amp; Security
            </h2>
            <p>
              All Google OAuth refresh tokens are encrypted at rest on our servers using authenticated AES-256-GCM encryption. Encryption keys are managed securely on backend infrastructure and are never exposed to browser clients, frontends, or public logs.
            </p>
          </section>

          {/* 7. Report Delivery */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              7. Report Delivery &amp; Retention
            </h2>
            <p>
              Generated daily briefing summaries are delivered as responsive HTML emails directly to your primary authorized Gmail inbox. We do not store full raw email archives or full email bodies in our application database.
            </p>
          </section>

          {/* 8. Payment Data */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              8. Payment Information
            </h2>
            <p>
              Payment transactions are processed directly by our PCI-DSS compliant payment gateway partner (Razorpay). InboxIQ does not collect, store, or process full credit/debit card numbers or bank credentials on its servers.
            </p>
          </section>

          {/* 9. Contact Form Data */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              9. Contact &amp; Support Data
            </h2>
            <p>
              When you submit a message through our Contact page, the information (name, email, subject, and message) is used strictly to investigate, respond to, and resolve your support request.
            </p>
          </section>

          {/* 10. Data Sharing */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              10. Information Sharing &amp; Third Parties
            </h2>
            <p>
              InboxIQ never sells, rents, or monetizes your personal data or email content. We share data with third-party service providers strictly to the extent necessary to deliver the service, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li>Authentication and identity infrastructure.</li>
              <li>Cloud hosting and database infrastructure.</li>
              <li>Payment processing services (Razorpay).</li>
              <li>AI processing infrastructure for report generation.</li>
              <li>Email delivery and notification services.</li>
            </ul>
          </section>

          {/* 11. User Controls */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              11. User Controls &amp; Data Rights
            </h2>
            <p>
              You maintain full control over your connected accounts and personal information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-300">
              <li><strong>Disconnect Accounts:</strong> You can disconnect your Gmail accounts at any time from Settings, immediately removing stored OAuth tokens.</li>
              <li><strong>Update Settings:</strong> You can adjust report schedules, timezones, and contact details in Account Settings.</li>
              <li><strong>Cancel Subscriptions:</strong> You can manage or cancel your active subscription plan via the billing dashboard.</li>
              <li><strong>Support Requests:</strong> You can reach out to our support team for data deletion requests.</li>
            </ul>
          </section>

          {/* 12. Security */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              12. Security Measures
            </h2>
            <p>
              We implement industry-standard administrative, physical, and technical safeguards—including TLS encryption in transit, AES-256 encryption at rest for secrets, strict server-side authorization checks, and row-level data isolation—to protect against unauthorized access or alteration.
            </p>
          </section>

          {/* 13. Data Retention */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              13. Data Retention
            </h2>
            <p>
              We retain information for as long as reasonably necessary to provide the service, maintain security, meet operational requirements, and comply with applicable legal obligations. When an integration is disconnected, associated encrypted tokens are deleted.
            </p>
          </section>

          {/* 14. Changes to Privacy Policy */}
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              14. Changes to this Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be published on <a href="https://www.inboxiq.online/privacy" className="text-emerald-600 underline">https://www.inboxiq.online/privacy</a> with an updated effective date.
            </p>
          </section>

          {/* 15. Contact */}
          <section className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              15. Contact Us
            </h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy or your data, please contact our support team:
            </p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Email: <a href="mailto:sahilrajdurgapur23@gmail.com" className="hover:underline">sahilrajdurgapur23@gmail.com</a>
            </p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
