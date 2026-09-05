import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function PrivacyPage() {
  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">Last updated: September 5, 2026</p>
      </div>

      <Alert variant="info" title="Privacy Standard">
        InboxIQ handles potentially sensitive emails. We strictly adhere to privacy-minimization principles: we do not warehouse raw email bodies in our application database.
      </Alert>

      <Card>
        <CardContent className="p-8 prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700 dark:text-neutral-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">1. Information We Collect</h2>
            <p>
              When you use InboxIQ, we collect:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Identity:</strong> Your name, email address, and authentication ID provided via Clerk.</li>
              <li><strong>Google OAuth Authorization:</strong> Encrypted refresh tokens granting scoped access to Gmail (read/send) and Google Drive (file archival).</li>
              <li><strong>Operational Metadata:</strong> Execution timestamps, report generation statuses, error categories, and schedule preferences.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">2. How We Process Email Content</h2>
            <p>
              During scheduled morning executions, our backend/automation engine queries Gmail API for emails received within your 24-hour reporting window. Email snippets are passed transiently to Google Gemini AI models strictly to classify priority, deadlines, and action items. <strong>Email contents are not permanently stored in our database.</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">3. Security &amp; Token Encryption</h2>
            <p>
              All Google OAuth refresh tokens are encrypted at rest using AES-256-GCM. Decryption keys are stored strictly in server-side environment variables and are never transmitted to client browsers, logs, or third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">4. Data Deletion &amp; Disconnection</h2>
            <p>
              You can disconnect any linked Google account at any time from your account settings. Upon disconnection, the associated encrypted authorization tokens are immediately deleted from our database.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
