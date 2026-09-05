'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Mail, MessageSquare, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white">
          Contact InboxIQ Support
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          Have questions about your subscription, Google OAuth integration, or institutional deployments? We are here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6 md:col-span-1">
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
              <Mail className="w-4 h-4" /> Email Us
            </div>
            <p className="text-xs text-neutral-500">For general and technical inquiries</p>
            <p className="text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200">support@inboxiq.in</p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
              <MessageSquare className="w-4 h-4" /> Billing &amp; Refunds
            </div>
            <p className="text-xs text-neutral-500">For invoice &amp; Razorpay inquiries</p>
            <p className="text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200">billing@inboxiq.in</p>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
            <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
              <MapPin className="w-4 h-4" /> Office
            </div>
            <p className="text-xs text-neutral-500">InboxIQ SaaS Technologies</p>
            <p className="text-xs text-neutral-800 dark:text-neutral-200">Bangalore, Karnataka, India</p>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>We typically respond within 24 business hours.</CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <Alert variant="success" title="Message Received">
                  Thank you for reaching out. Our support team has received your message and will respond shortly.
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Full Name"
                    required
                    placeholder="Prof. Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    placeholder="sharma@university.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                      Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="How can we assist you?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <Button type="submit" loading={loading} className="w-full">
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
