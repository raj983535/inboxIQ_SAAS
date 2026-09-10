'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Mail,
  HardDrive,
  FileText,
  AlertTriangle,
  GitBranch,
  Activity,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

// Module-level in-memory cache to guarantee zero-millisecond render across tab navigation
let inMemoryStatsCache = null;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(() => {
    if (inMemoryStatsCache) return inMemoryStatsCache;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('inboxiq_cached_admin_stats') || sessionStorage.getItem('inboxiq_cached_admin_stats');
        if (stored) {
          const parsed = JSON.parse(stored);
          inMemoryStatsCache = parsed;
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [loading, setLoading] = useState(() => !stats && !inMemoryStatsCache);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async (forceFresh = false) => {
    if (!stats && !inMemoryStatsCache) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const url = forceFresh ? '/api/admin/stats?fresh=true' : '/api/admin/stats';
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to load admin statistics.');
      }
      const data = await res.json();
      if (data?.stats) {
        inMemoryStatsCache = data.stats;
        setStats(data.stats);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('inboxiq_cached_admin_stats', JSON.stringify(data.stats));
            sessionStorage.setItem('inboxiq_cached_admin_stats', JSON.stringify(data.stats));
          }
        } catch (e) {}
      }
    } catch (err) {
      // If we already had stats on screen, don't wipe them on background fetch error
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(false);
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Administrative Overview</h1>
            <Badge variant="danger">Restricted</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Real-time SaaS platform health, user subscriptions, and automation pipeline metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStats(true)}
            disabled={loading || isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-rose-500' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {stats ? (
                stats.totalUsers.toLocaleString()
              ) : (
                <span className="inline-block h-8 w-16 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded mt-1" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 min-h-[16px]">
              {stats ? (
                `${stats.activeUsers} Active`
              ) : (
                <span className="inline-block h-3.5 w-20 bg-slate-100 dark:bg-neutral-800/60 animate-pulse rounded" />
              )}
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Subscriptions</span>
              <CreditCard className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {stats ? (
                stats.activeSubscriptions.toLocaleString()
              ) : (
                <span className="inline-block h-8 w-16 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded mt-1" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 min-h-[16px]">
              {stats ? (
                `₹499/mo (${stats.inactiveSubscriptions} Inactive)`
              ) : (
                <span className="inline-block h-3.5 w-28 bg-slate-100 dark:bg-neutral-800/60 animate-pulse rounded" />
              )}
            </p>
          </CardContent>
        </Card>

        {/* Reports Delivered */}
        <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Reports Delivered</span>
              <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {stats ? (
                stats.reportsDelivered.toLocaleString()
              ) : (
                <span className="inline-block h-8 w-16 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded mt-1" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 min-h-[16px]">
              {stats ? (
                `${stats.reportsArchived} Drive PDFs archived`
              ) : (
                <span className="inline-block h-3.5 w-32 bg-slate-100 dark:bg-neutral-800/60 animate-pulse rounded" />
              )}
            </p>
          </CardContent>
        </Card>

        {/* Unresolved Failures */}
        <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Failures &amp; Errors</span>
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats ? (
                stats.unresolvedErrors.toLocaleString()
              ) : (
                <span className="inline-block h-8 w-16 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded mt-1" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 min-h-[16px]">
              {stats ? (
                `${stats.workflowFailed} Workflow errors`
              ) : (
                <span className="inline-block h-3.5 w-28 bg-slate-100 dark:bg-neutral-800/60 animate-pulse rounded" />
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/users" className="block group">
          <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-slate-900 dark:text-white h-full shadow-sm">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Users className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold">User Directory</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                Inspect registered users, schedules, timezones, and connected mailboxes without viewing private email text.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/workflows" className="block group">
          <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-slate-900 dark:text-white h-full shadow-sm">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <GitBranch className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold">Workflow Telemetry</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                Monitor n8n execution status, run durations, email count metrics, and execution correlation IDs.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/system" className="block group">
          <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-slate-900 dark:text-white h-full shadow-sm">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Activity className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold">Service Health</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                Verify configuration and uptime status for Supabase, Clerk, Google OAuth, Razorpay, and n8n boundaries.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
