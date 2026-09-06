'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Mail, Send, CheckCircle2, ShieldCheck, MessageSquare } from 'lucide-react';

export function ContactFormClient() {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error?.message ||
            "We couldn't send your message right now. Please try again or email us directly at sahilrajdurgapur23@gmail.com."
        );
      }

      setSuccessMsg("Your message has been sent successfully. We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setErrorMsg(
        err.message ||
          "We couldn't send your message right now. Please try again or email us directly at sahilrajdurgapur23@gmail.com."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white">
          Contact InboxIQ Support
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          For account, billing, technical or general questions, contact InboxIQ Support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Support Information */}
        <div className="space-y-6 md:col-span-1">
          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <Mail className="w-4 h-4" /> Support Email
            </div>
            <p className="text-xs text-neutral-500">Official customer support &amp; inquiries</p>
            <a
              href="mailto:sahilrajdurgapur23@gmail.com"
              className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline break-all block"
            >
              sahilrajdurgapur23@gmail.com
            </a>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <MessageSquare className="w-4 h-4" /> Support Scope
            </div>
            <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Account setup &amp; authentication</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Google OAuth integration assistance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Razorpay subscription &amp; invoice queries</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>General feedback &amp; feature suggestions</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs text-neutral-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Direct Inbox Delivery
            </div>
            <p className="text-[11px] leading-relaxed">
              Submissions securely route directly to our support inbox. We aim to respond within 24–48 business hours.
            </p>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="md:col-span-2">
          <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader>
              <CardTitle>Send Us a Message</CardTitle>
              <CardDescription>
                Fill in the details below and we will get back to you directly via your email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {successMsg && (
                <div className="mb-6">
                  <Alert variant="success" title="Message Sent">
                    {successMsg}
                  </Alert>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6">
                  <Alert variant="danger" title="Sending Error">
                    {errorMsg}
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  required
                  placeholder="Your Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Subject (Optional)"
                  placeholder="e.g. Question about Google Drive integration"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Describe your inquiry or question in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <Button type="submit" loading={loading} className="w-full text-base py-3 shadow-md">
                  <Send className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
