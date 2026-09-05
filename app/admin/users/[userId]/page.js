'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User,
  Mail,
  HardDrive,
  CreditCard,
  Clock,
  ArrowLeft,
  Shield,
  FileText,
  GitBranch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params?.userId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUser() {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?userId=${userId}`);
        if (!res.ok) {
          throw new Error('Failed to load user detail.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  if (loading) {
    return <div className="p-10 text-white">Loading user details...</div>;
  }

  if (error || !data?.user) {
    return (
      <div className="p-10 space-y-4 text-white">
        <Alert variant="danger">{error || 'User not found'}</Alert>
        <Link href="/admin/users">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  const { user, settings, gmail_connections, drive_connection, subscription, recent_reports, recent_workflows } = data;

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-6xl mx-auto w-full text-white">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="border-neutral-700 bg-neutral-800 text-white">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">User Operational Detail: {user.email}</h1>
        </div>
        <Badge variant={user.role === 'admin' ? 'danger' : 'default'}>{user.role}</Badge>
      </div>

      {/* User Metadata & Subscription Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-400">User ID:</span> <span className="font-mono">{user.id}</span>
            </div>
            <div>
              <span className="text-neutral-400">Clerk ID:</span> <span className="font-mono">{user.clerk_user_id}</span>
            </div>
            <div>
              <span className="text-neutral-400">Name:</span> <span>{user.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-neutral-400">Created:</span> <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Report Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-400">Delivery Time:</span> <strong>{settings?.report_time || '08:00'}</strong>
            </div>
            <div>
              <span className="text-neutral-400">Timezone:</span> <span>{settings?.timezone || 'Asia/Kolkata'}</span>
            </div>
            <div>
              <span className="text-neutral-400">Onboarding:</span>{' '}
              <Badge variant={settings?.onboarding_completed ? 'success' : 'warning'}>
                {settings?.onboarding_completed ? 'Completed' : 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardHeader>
            <CardTitle className="text-sm">Subscription State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-400">Plan:</span> <strong>{subscription?.plan_name || 'InboxIQ Pro'}</strong>
            </div>
            <div>
              <span className="text-neutral-400">Status:</span>{' '}
              <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                {subscription?.status || 'inactive'}
              </Badge>
            </div>
            <div>
              <span className="text-neutral-400">Razorpay Sub ID:</span>{' '}
              <span className="font-mono text-[11px]">{subscription?.razorpay_subscription_id || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts */}
      <Card className="bg-neutral-900 border-neutral-800 text-white">
        <CardHeader>
          <CardTitle className="text-sm">Connected Google Resources</CardTitle>
          <CardDescription className="text-neutral-400">Tokens are encrypted at rest and never exposed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {gmail_connections.length > 0 ? (
            gmail_connections.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold">{c.account_email}</span>
                    <span className="text-neutral-400 ml-2">(Slot #{c.connection_slot})</span>
                  </div>
                </div>
                <Badge variant={c.status === 'connected' ? 'success' : 'danger'}>{c.status}</Badge>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-400">No Gmail accounts connected.</p>
          )}

          {drive_connection && (
            <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="font-semibold">{drive_connection.account_email}</span>
                  <span className="text-neutral-400 ml-2">(Google Drive Archival)</span>
                </div>
              </div>
              <Badge variant={drive_connection.status === 'connected' ? 'purple' : 'danger'}>
                {drive_connection.status}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Workflow Telemetry */}
      <Card className="bg-neutral-900 border-neutral-800 text-white">
        <CardHeader>
          <CardTitle className="text-sm">Recent Workflow Executions (n8n Engine)</CardTitle>
        </CardHeader>
        <CardContent>
          {recent_workflows.length > 0 ? (
            <div className="space-y-2">
              {recent_workflows.map((w) => (
                <div key={w.id} className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-700/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono text-[11px] text-neutral-300">Exec ID: {w.execution_id}</div>
                    <div className="text-neutral-400 text-[10px]">
                      Correlation: {w.correlation_id} • Processed: {w.emails_processed || 0} emails
                    </div>
                  </div>
                  <Badge variant={w.status === 'completed' ? 'success' : w.status === 'failed' ? 'danger' : 'brand'}>
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">No executions recorded for this user yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
