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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read cached stats immediately
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem('inboxiq_cached_admin_stats');
        if (cached) {
          setStats(JSON.parse(cached));
          setLoading(false);
        }
      }
    } catch (e) {}
  }, []);

  const fetchStats = async () => {
    if (!stats) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to load admin statistics.');
      }
      const data = await res.json();
      setStats(data.stats);
      try {
        if (typeof window !== 'undefined' && data.stats) {
          sessionStorage.setItem('inboxiq_cached_admin_stats', JSON.stringify(data.stats));
        }
      } catch (e) {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Administrative Overview</h1>
            <Badge variant="danger">Restricted</Badge>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time SaaS platform health, user subscriptions, and automation pipeline metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchStats} loading={loading} className="text-white border-neutral-700 bg-neutral-800">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black">{stats ? stats.totalUsers : '—'}</div>
            <p className="text-[11px] text-neutral-400">
              {stats ? `${stats.activeUsers} Active` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Subscriptions</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black">{stats ? stats.activeSubscriptions : '—'}</div>
            <p className="text-[11px] text-neutral-400">
              {stats ? `₹499/mo (${stats.inactiveSubscriptions} Inactive)` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        {/* Reports Delivered */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Reports Delivered</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black">{stats ? stats.reportsDelivered : '—'}</div>
            <p className="text-[11px] text-neutral-400">
              {stats ? `${stats.reportsArchived} Drive PDFs archived` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        {/* Unresolved Failures */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-bold uppercase tracking-wider">Failures &amp; Errors</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-black text-rose-400">{stats ? stats.unresolvedErrors : '—'}</div>
            <p className="text-[11px] text-neutral-400">
              {stats ? `${stats.workflowFailed} Workflow errors` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/users" className="block group">
          <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all text-white h-full">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Users className="w-6 h-6 text-blue-400" />
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold">User Directory</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Inspect registered users, schedules, timezones, and connected mailboxes without viewing private email text.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/workflows" className="block group">
          <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all text-white h-full">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <GitBranch className="w-6 h-6 text-emerald-400" />
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold">Workflow Telemetry</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Monitor n8n execution status, run durations, email count metrics, and execution correlation IDs.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/system" className="block group">
          <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all text-white h-full">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Activity className="w-6 h-6 text-purple-400" />
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold">Service Health</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Verify configuration and uptime status for Supabase, Clerk, Google OAuth, Razorpay, and n8n boundaries.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
