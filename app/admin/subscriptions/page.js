'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Subscription Monitoring</h1>
          <p className="text-xs text-neutral-400">
            Real-time Razorpay subscription states, active plans, and billing periods.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchSubscriptions} loading={loading} className="w-full sm:w-auto text-white border-neutral-700 bg-neutral-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

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
                  <div className="font-semibold text-white">{sub.users?.email || 'N/A'}</div>
                  <div className="text-[11px] text-neutral-400">{sub.users?.name || ''}</div>
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
                      <span className="font-mono text-xs text-emerald-400">{sub.razorpay_subscription_id}</span>
                      <div className="text-[10px] text-neutral-500">Subscription ID</div>
                    </div>
                  ) : sub.razorpay_order_id ? (
                    <div>
                      <span className="font-mono text-xs text-blue-400">{sub.razorpay_order_id}</span>
                      <div className="text-[10px] text-neutral-500">Order ID</div>
                    </div>
                  ) : sub.razorpay_payment_id ? (
                    <div>
                      <span className="font-mono text-xs text-amber-400">{sub.razorpay_payment_id}</span>
                      <div className="text-[10px] text-neutral-500">Payment ID</div>
                    </div>
                  ) : (
                    <div>
                      <span className="font-mono text-xs text-neutral-400">sub_{sub.id?.substring(0, 8)}</span>
                      <div className="text-[10px] text-purple-400">System / Admin Tier</div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-neutral-400">
                    {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-neutral-400">
                {loading ? 'Loading subscriptions...' : 'No subscriptions recorded.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
