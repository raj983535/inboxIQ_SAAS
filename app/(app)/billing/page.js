'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { CreditCard, CheckCircle2, ShieldCheck, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { AppTopbar } from '@/components/layout/app-topbar';
import { getPlanForProfession, CURRENCIES } from '@/lib/pricing';

export default function BillingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'

  const loadSubscription = async () => {
    try {
      const res = await fetch('/api/account');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.user?.country && json.user.country !== 'India') {
          setCurrency('USD');
        }
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const user = data?.user;
  const profession = user?.profession || 'professor_teacher';
  const planInfo = getPlanForProfession(profession, currency);
  const subscription = data?.subscription;
  const isSubscribed = subscription?.status === 'active';

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setErrorMsg(null);

    try {
      // 1. Request server to create Razorpay subscription/order with profession plan
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planInfo.id,
          amount: planInfo.activePricing.amount,
          currency: currency,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to initialize subscription checkout.');
      }

      const { subscriptionId, amount, currency: serverCurrency, keyId } = await res.json();

      // 2. Open Razorpay Modal
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK is still loading. Please try again in a few seconds.');
      }

      const options = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: 'InboxIQ SaaS',
        description: `${planInfo.name} (${planInfo.activePricing.formatted}${planInfo.activePricing.period})`,
        currency: serverCurrency || currency,
        handler: async function (response) {
          setSuccessMsg('Payment received! Your subscription will be activated automatically via server verification.');
          setTimeout(() => loadSubscription(), 2500);
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <AppTopbar title="Subscription &amp; Billing" subtitle="Manage your active plan and payment history" />

      <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        {successMsg && <Alert variant="success">{successMsg}</Alert>}
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {/* Currency Switcher */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Billing Territory</h4>
            <p className="text-xs text-neutral-500">Select currency for your invoice and payment processing</p>
          </div>
          <div className="inline-flex items-center p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currency === 'INR'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currency === 'USD'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              🌐 USD ($)
            </button>
          </div>
        </div>

        {/* Current Plan Card (Profession Adaptive) */}
        <Card className="border-emerald-500/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{planInfo.name}</CardTitle>
              <CardDescription>{planInfo.target}</CardDescription>
            </div>
            <Badge variant={isSubscribed ? 'success' : 'warning'}>
              {subscription?.status ? subscription.status.toUpperCase() : 'INACTIVE'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{planInfo.name}</h3>
                <p className="text-xs text-neutral-500">{planInfo.target}</p>
                {subscription?.current_period_end && (
                  <p className="text-[11px] text-neutral-400">
                    Next renewal: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {planInfo.activePricing.formatted}
                </span>
                <span className="text-xs text-neutral-400"> {planInfo.activePricing.period}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
              {planInfo.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Payments verified securely server-side via Razorpay webhook.</span>
            </div>
            {!isSubscribed ? (
              <Button size="md" variant="primary" loading={checkoutLoading} onClick={handleSubscribe}>
                Subscribe for {planInfo.activePricing.formatted}/mo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700">
                Cancel Subscription
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
