'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ChevronRight, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_users';

export default function AdminUsersPage() {
  const [users, setUsers] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [search, setSearch] = useState('');
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

  const fetchUsers = async () => {
    if (users.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to load users (HTTP ${res.status})`);
      }
      const data = await res.json();
      const userList = data.users || [];
      setUsers(userList);
      // Only cache the full (non-search-filtered) list
      if (!search) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(CACHE_KEY, JSON.stringify(userList));
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(userList));
          }
        } catch (e) {}
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            View registered user accounts, subscription state, and connected mailboxes. (Email bodies are never exposed)
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>User / Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Subscription</TableHeaderCell>
            <TableHeaderCell>Gmail Slots</TableHeaderCell>
            <TableHeaderCell>Google Drive</TableHeaderCell>
            <TableHeaderCell>Schedule</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {users.length > 0 ? (
            users.map((u) => {
              const gmailActive = (u.gmail_connections || []).filter((c) => c.status === 'connected').length;
              const subObj = u.subscription || (Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions);
              const rawStatus = subObj?.status || 'inactive';
              const trialEnd = subObj?.trial_ends_at || subObj?.current_period_end;
              const isTrialEnded = rawStatus === 'trial_ended' || (rawStatus === 'trialing' && trialEnd && new Date(trialEnd) <= new Date());
              const isSubEnded = rawStatus === 'subscription_ended' || rawStatus === 'expired' || (rawStatus === 'cancelled' && subObj?.current_period_end && new Date(subObj.current_period_end) <= new Date());

              let badgeText = rawStatus;
              let badgeVariant = 'default';

              if (rawStatus === 'active') {
                badgeText = 'active';
                badgeVariant = 'success';
              } else if (isTrialEnded) {
                badgeText = 'End Trial';
                badgeVariant = 'danger';
              } else if (isSubEnded) {
                badgeText = 'End Subscription';
                badgeVariant = 'danger';
              } else if (rawStatus === 'trialing') {
                badgeText = 'trialing';
                badgeVariant = 'warning';
              } else if (rawStatus === 'created') {
                badgeText = 'created';
                badgeVariant = 'brand';
              }

              const driveObj = u.drive_connection || (Array.isArray(u.google_drive_connections) ? u.google_drive_connections[0] : u.google_drive_connections);
              const settingsObj = u.user_settings && !Array.isArray(u.user_settings) ? u.user_settings : (u.user_settings?.[0] || null);

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{u.name || 'InboxIQ User'}</div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400">{u.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'danger' : 'default'}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant}>
                      {badgeText}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono">{gmailActive} / 2 Connected</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={driveObj?.status === 'connected' ? 'purple' : 'default'}>
                      {driveObj?.status === 'connected' ? 'Linked' : 'None'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-neutral-300">
                      {settingsObj?.report_time || '08:00'} ({settingsObj?.timezone?.split('/')[1] || 'Kolkata'})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${u.id}`}>
                      <Button size="sm" variant="outline">
                        View Detail <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-neutral-400">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    Loading users...
                  </span>
                ) : (
                  'No users found.'
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
