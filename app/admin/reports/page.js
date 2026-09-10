'use client';

import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_reports';

export default function AdminReportsPage() {
  const [reports, setReports] = useState(() => {
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

  const fetchReports = async () => {
    if (reports.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to load reports (HTTP ${res.status})`);
      }
      const json = await res.json();
      const data = json.reports || [];
      setReports(data);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
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
    fetchReports();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Report Execution Metadata</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Delivery confirmation to Gmail and PDF upload status to Google Drive. (Raw email text is not stored)
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchReports}
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
            <TableHeaderCell>Report Date</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Gmail Delivery</TableHeaderCell>
            <TableHeaderCell>Drive Upload</TableHeaderCell>
            <TableHeaderCell>Generated At</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {reports.length > 0 ? (
            reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold text-slate-900 dark:text-white">{r.users?.email || 'N/A'}</TableCell>
                <TableCell>{r.report_date}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'delivered' ? 'success' : r.status === 'failed' ? 'danger' : 'brand'}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={r.email_delivery_status === 'delivered' ? 'success' : 'warning'}>
                    {r.email_delivery_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={r.drive_upload_status === 'uploaded' ? 'purple' : 'warning'}>
                    {r.drive_upload_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-neutral-400">
                    {r.generated_at ? new Date(r.generated_at).toLocaleString() : 'N/A'}
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
                    Loading reports...
                  </span>
                ) : (
                  'No reports generated yet.'
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
