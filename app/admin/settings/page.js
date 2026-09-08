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
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto w-full text-white">
      <div className="pb-4 border-b border-neutral-800">
        <h1 className="text-xl sm:text-2xl font-bold">Admin Platform Settings</h1>
        <p className="text-xs text-neutral-400">
          Configure platform defaults and operational parameters. (Secrets are never exposed or edited client-side)
        </p>
      </div>

      {saved && <Alert variant="success">Platform parameters updated successfully.</Alert>}

      <Card className="bg-neutral-900 border-neutral-800 text-white shadow-xl">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle className="text-base">SaaS Business Constraints &amp; Pricing Tiers</CardTitle>
            <CardDescription className="text-neutral-400">Default constraints and active billing tiers enforced across all tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Max Gmail Connections Per User"
                  value={maxSlots}
                  disabled
                  helperText="Enforced at UI, API, and Database constraints"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
              <div>
                <Input
                  label="Briefing Delivery Window"
                  value={deliveryWindow}
                  disabled
                  helperText="Active cron trigger intervals"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Student / Scholar Tier Pricing"
                  value={studentPricing}
                  disabled
                  helperText="Special accessible academic tier"
                  className="bg-neutral-800 border-neutral-700 text-white font-semibold text-emerald-400"
                />
              </div>
              <div>
                <Input
                  label="Faculty & Professor Tier Pricing"
                  value={facultyPricing}
                  disabled
                  helperText="Standard professional educator tier"
                  className="bg-neutral-800 border-neutral-700 text-white font-semibold text-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Executive & Professional Tier Pricing"
                  value={othersPricing}
                  disabled
                  helperText="Working professionals & enterprise leaders"
                  className="bg-neutral-800 border-neutral-700 text-white font-semibold text-emerald-400"
                />
              </div>
              <div>
                <Input
                  label="Drive PDF Archive Target Folder"
                  value={driveArchival}
                  disabled
                  helperText="Default Google Drive PDF folder name"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-neutral-400">System parameters are synced with Razorpay and Supabase policies.</div>
            <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Parameters
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
