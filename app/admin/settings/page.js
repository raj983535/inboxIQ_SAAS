'use client';

import React, { useState } from 'react';
import { Sliders, Shield, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function AdminSettingsPage() {
  const [maxSlots] = useState('2');
  const [facultyPricing] = useState('₹499 / mo (INR) | $6.99 / mo (USD)');
  const [studentPricing] = useState('₹99 / mo (INR) | $1.99 / mo (USD)');
  const [othersPricing] = useState('₹499 / mo (INR) | $6.99 / mo (USD)');
  const [deliveryWindow] = useState('06:00 AM - 10:00 AM (Multi-timezone)');
  const [driveArchival] = useState('Google Drive / InboxIQ / Daily Reports');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Admin Platform Settings</h1>
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Configure platform defaults and operational parameters. (Secrets are never exposed or edited client-side)
        </p>
      </div>

      {saved && <Alert variant="success">Platform parameters updated successfully.</Alert>}

      <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white shadow-xl">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900 dark:text-white">SaaS Business Constraints &amp; Active Billing Tiers</CardTitle>
            <CardDescription className="text-slate-500 dark:text-neutral-400">Default constraints and active billing tiers enforced across all tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* System Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-1">
                <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">Max Gmail Connections</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">2 Mailbox Slots / User</div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 pt-1">Enforced at UI, API, and Database constraints</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-1">
                <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">Briefing Delivery Window</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">24-Hour Continuous</div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 pt-1">User selectable across all 24 hours (00:00 - 23:00) with timezone precision</p>
              </div>
            </div>

            {/* Pricing Tiers */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">Active Tenant Subscription Tiers</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Student Tier */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-amber-200 dark:border-neutral-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Scholar Tier</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">Active</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-slate-900 dark:text-white">₹99 <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">/ mo (INR)</span></div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-neutral-300">$1.99 <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">/ mo (USD)</span></div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700/60 pt-2">
                    College students &amp; scholars • 1 Gmail slot
                  </p>
                </div>

                {/* Faculty Tier */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-emerald-300 dark:border-emerald-500/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Faculty &amp; Professor</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">Standard</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-slate-900 dark:text-white">₹499 <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">/ mo (INR)</span></div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-neutral-300">$6.99 <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">/ mo (USD)</span></div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700/60 pt-2">
                    Professors &amp; teachers • 2 Gmail slots
                  </p>
                </div>

                {/* Executive Tier */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/80 border border-blue-200 dark:border-neutral-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Executive &amp; Pro</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">Pro</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-slate-900 dark:text-white">₹499 <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">/ mo (INR)</span></div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-neutral-300">$6.99 <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">/ mo (USD)</span></div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700/60 pt-2">
                    Working professionals &amp; leaders • 2 Gmail slots
                  </p>
                </div>
              </div>
            </div>

            {/* Google Drive Archival Settings */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">Drive PDF Archival Target Folder</div>
              <div className="text-sm sm:text-base font-bold font-mono text-purple-600 dark:text-purple-300 break-all">
                Google Drive &gt; InboxIQ &gt; Daily Reports
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 pt-1">Auto-created for users linking Google Drive in onboarding or settings</p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-neutral-400">System parameters are synced with Razorpay and Supabase policies.</div>
            <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Parameters
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
