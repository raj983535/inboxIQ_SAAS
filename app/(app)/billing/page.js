'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { CreditCard, CheckCircle2, ShieldCheck, AlertCircle, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { AppTopbar } from '@/components/layout/app-topbar';
import { useAccount } from '@/context/account-context';
import { getPlanForProfession, CURRENCIES } from '@/lib/pricing';

export default function BillingPage() {
  const { data, loading, refreshAccount } = useAccount();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'

  useEffect(() => {
    if (data?.user?.country && data.user.country !== 'India') {
      setCurrency('USD');
    }
  }, [data]);

  const user = data?.user;
  const profession = user?.profession || 'professor_teacher';
  const planInfo = getPlanForProfession(profession, currency);
  const subscription = data?.subscription;
  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing' && subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();
  const isTrialExpired = subscription?.status === 'trialing' && subscription?.current_period_end && new Date(subscription.current_period_end) <= new Date();
  const isSubscribed = isActive || isTrialing;

  // Calculate trial hours remaining
  const trialHoursRemaining = isTrialing
    ? Math.max(0, Math.round((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60) * 10) / 10)
    : 0;

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. First attempt to create recurring subscription, fall back to standard order
      let subData = null;
      let orderData = null;

      const subRes = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      });

      if (subRes.ok) {
        subData = await subRes.json();
      } else {
        const orderRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: planInfo.id,
            amount: planInfo.activePricing.amount,
            currency: currency,
          }),
        });
        if (!orderRes.ok) {
          const json = await orderRes.json();
          throw new Error(json.error?.message || 'Failed to initialize payment.');
        }
        orderData = await orderRes.json();
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK is still loading. Please try again in a few seconds.');
      }

      const activeKey = subData?.keyId || orderData?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const activeCurrency = subData?.currency || orderData?.currency || currency;

      const options = {
        key: activeKey,
        name: 'InboxIQ SaaS',
        description: `${planInfo.name} (${planInfo.activePricing.formatted}${planInfo.activePricing.period})`,
        handler: async function (response) {
          try {
            setCheckoutLoading(true);
            // 2. Verify payment signature on backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_subscription_id: response.razorpay_subscription_id || subData?.subscriptionId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: planInfo.id,
                currency: activeCurrency,
              }),
            });

            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyJson.error?.message || 'Payment signature verification failed.');
            }

            setSuccessMsg('Payment verified successfully! Your recurring monthly subscription is now active.');
            await refreshAccount();
          } catch (verr) {
            setErrorMsg(verr.message);
          } finally {
            setCheckoutLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setCheckoutLoading(false);
          },
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#10b981',
        },
      };

      if (subData?.subscriptionId) {
        options.subscription_id = subData.subscriptionId;
      } else if (orderData?.order_id) {
        options.order_id = orderData.order_id;
        options.amount = orderData.amount;
        options.currency = activeCurrency;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setErrorMsg(`Payment failed: ${response.error?.description || 'Transaction declined.'}`);
        setCheckoutLoading(false);
      });
      rzp.open();
    } catch (err) {
      setErrorMsg(err.message);
      setCheckoutLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel automatic renewal? You will keep access until the end of the current paid billing period.')) return;
    setCheckoutLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/cancel-subscription', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Unable to cancel the subscription.');
      setSuccessMsg(json.message);
      await refreshAccount();
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

      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6 sm:space-y-8">
        {successMsg && <Alert variant="success">{successMsg}</Alert>}
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {/* Trial Status Banners */}
        {isTrialing && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Free Trial Active ({trialHoursRemaining}h remaining)
                </h4>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80">
                  Your briefings are fully operational until {new Date(subscription.current_period_end).toLocaleString()}. Upgrade now to prevent service interruption.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              loading={checkoutLoading}
              onClick={handleSubscribe}
              className="shrink-0 w-full sm:w-auto shadow-sm"
            >
              Activate Paid Plan <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}

        {isTrialExpired && (
          <Alert variant="danger" className="border-rose-200 dark:border-rose-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div>
                <strong className="block text-sm font-bold">Your 3-Day Free Trial Has Ended</strong>
                <span className="text-xs">
                  Automated briefings are paused. Subscribe below to re-activate your daily inbox intelligence.
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                loading={checkoutLoading}
                onClick={handleSubscribe}
                className="shrink-0"
              >
                Subscribe Now
              </Button>
            </div>
          </Alert>
        )}

        {/* Currency Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Billing Currency</h4>
            <p className="text-xs text-neutral-500">Select currency for your invoice and payment processing</p>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-full sm:w-auto">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all text-center ${
                currency === 'INR'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              🇮🇳 INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all text-center ${
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
        <Card className="border-emerald-500/40 shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>{planInfo.name}</CardTitle>
              <CardDescription>{planInfo.target}</CardDescription>
            </div>
            {loading && !data ? (
              <span className="inline-block w-16 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
            ) : (
              <Badge
                variant={isActive ? 'success' : isTrialing ? 'warning' : 'danger'}
                className="self-start sm:self-auto"
              >
                {isTrialing ? 'TRIALING' : isTrialExpired ? 'TRIAL EXPIRED' : subscription?.status ? subscription.status.toUpperCase() : 'INACTIVE'}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">{planInfo.name}</h3>
                <p className="text-xs text-neutral-500">{planInfo.target}</p>
                {subscription?.current_period_end && (
                  <p className="text-[11px] text-neutral-400">
                    {isTrialing ? 'Trial ends: ' : 'Next renewal: '}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-200 dark:border-neutral-800">
                <span className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white">
                  {planInfo.activePricing.formatted}
                </span>
                <span className="text-xs text-neutral-500 font-semibold">{planInfo.activePricing.period}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
              {planInfo.features.map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Monthly recurring payments managed securely by Razorpay.</span>
            </div>
            {loading && !data ? (
              <span className="inline-block w-32 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ) : !isActive ? (
              <Button size="md" variant="primary" loading={checkoutLoading} onClick={handleSubscribe} className="w-full sm:w-auto">
                {isTrialing ? 'Upgrade to Paid Plan' : `Subscribe for ${planInfo.activePricing.formatted}/mo`} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" loading={checkoutLoading} onClick={handleCancel} className="w-full sm:w-auto text-rose-600 hover:text-rose-700">
                Cancel automatic renewal
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
