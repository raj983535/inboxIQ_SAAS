'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_subscriptions';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
        if (cached) return false;
      } catch (e) {}
    }
    return true;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscriptions = async () => {
    if (subscriptions.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to load subscriptions (HTTP ${res.status})`);
      }
      const data = await res.json();
      const subList = data.subscriptions || [];
      setSubscriptions(subList);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify(subList));
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(subList));
        }
      } catch (e) {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Subscription Monitoring</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Real-time Razorpay subscription states, active plans, and billing periods.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchSubscriptions}
          disabled={loading || isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Plan</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Razorpay Sub ID</TableHeaderCell>
            <TableHeaderCell>Billing Period End</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {subscriptions.length > 0 ? (
            subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900 dark:text-white">{sub.users?.email || 'N/A'}</div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400">{sub.users?.name || ''}</div>
                </TableCell>
                <TableCell>{sub.plan_name}</TableCell>
                <TableCell>₹{sub.amount} {sub.currency}</TableCell>
                <TableCell>
                  <Badge variant={sub.status === 'active' ? 'success' : sub.status === 'created' ? 'brand' : 'warning'}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.razorpay_subscription_id ? (
                    <div>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{sub.razorpay_subscription_id}</span>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-500">Subscription ID</div>
                    </div>
                  ) : sub.razorpay_order_id ? (
                    <div>
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{sub.razorpay_order_id}</span>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-500">Order ID</div>
                    </div>
                  ) : sub.razorpay_payment_id ? (
                    <div>
                      <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{sub.razorpay_payment_id}</span>
                      <div className="text-[10px] text-slate-500 dark:text-neutral-500">Payment ID</div>
                    </div>
                  ) : (
                    <div>
                      <span className="font-mono text-xs text-slate-600 dark:text-neutral-400">sub_{sub.id?.substring(0, 8)}</span>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400">System / Admin Tier</div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-neutral-400">
                    {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-neutral-400">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    Loading subscriptions...
                  </span>
                ) : (
                  'No subscriptions recorded.'
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
