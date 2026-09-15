'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_errors';

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState(() => {
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
  const [fetchError, setFetchError] = useState(null);

  const fetchErrors = async () => {
    if (errors.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/errors');
      if (!res.ok) {
        if (res.status === 401) {
          try {
            sessionStorage.removeItem('inboxiq_cached_account');
            localStorage.removeItem('inboxiq_cached_account');
          } catch (e) {}
          window.location.href = '/admin/login';
          return;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to load errors (HTTP ${res.status})`);
      }
      const json = await res.json();
      const data = json.errors || [];
      setErrors(data);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
      } catch (e) {}
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Failure & Error Monitoring</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Categorized system failures, OAuth revocations, and automation error codes. (No secrets or tokens exposed)
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchErrors}
          disabled={loading || isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {fetchError && <Alert variant="danger">{fetchError}</Alert>}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Message</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Correlation ID</TableHeaderCell>
            <TableHeaderCell>Timestamp</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {errors.length > 0 ? (
            errors.map((err) => (
              <TableRow key={err.id}>
                <TableCell>
                  <Badge variant="danger">{err.failure_category}</Badge>
                </TableCell>
                <TableCell className="text-slate-900 dark:text-white">{err.users?.email || 'System'}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-rose-600 dark:text-rose-300 font-medium">
                  {err.error_message}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-neutral-400">{err.error_status}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-neutral-500">{err.correlation_id || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-neutral-400">
                    {new Date(err.created_at).toLocaleString()}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-emerald-600 dark:text-emerald-400 font-medium">
                {loading ? (
                  <span className="flex items-center justify-center gap-2 text-slate-500 dark:text-neutral-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    Loading failures...
                  </span>
                ) : (
                  '✓ No system failures logged. All services operating normally.'
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
