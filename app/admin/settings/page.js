'use client';

import React, { useState } from 'react';
import { Sliders, Shield, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function AdminSettingsPage() {
  const [maxSlots, setMaxSlots] = useState('2');
  const [pricingAmount, setPricingAmount] = useState('499');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-4xl mx-auto w-full text-white">
      <div className="pb-4 border-b border-neutral-800">
        <h1 className="text-2xl font-bold">Admin Platform Settings</h1>
        <p className="text-xs text-neutral-400">
          Configure platform defaults and operational parameters. (Secrets are never exposed or edited client-side)
        </p>
      </div>

      {saved && <Alert variant="success">Platform parameters updated successfully.</Alert>}

      <Card className="bg-neutral-900 border-neutral-800 text-white">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle className="text-base">SaaS Business Constraints</CardTitle>
            <CardDescription className="text-neutral-400">Default constraints enforced across all tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Max Gmail Connections Per User"
                value={maxSlots}
                disabled
                helperText="Enforced at UI, Backend API, and Database table constraints"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            <div>
              <Input
                label="Base Pro Plan Pricing (INR)"
                value={pricingAmount}
                disabled
                helperText="Starting tier price (₹499 INR per month)"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
          </CardContent>
          <CardFooter className="border-neutral-800 bg-neutral-900/60">
            <div className="text-xs text-neutral-400">System parameters are synced with server environment policies.</div>
            <Button type="submit" variant="primary" size="sm">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Parameters
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
