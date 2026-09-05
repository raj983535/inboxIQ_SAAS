'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/errors');
      if (res.ok) {
        const json = await res.json();
        setErrors(json.errors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  return (
    <div className="p-6 sm:p-10 space-y-6 max-w-7xl mx-auto w-full text-white">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold">Centralized Failure &amp; Error Monitoring</h1>
          <p className="text-xs text-neutral-400">
            Categorized system failures, OAuth revocations, and automation error codes with correlation IDs. (No secrets or tokens exposed)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchErrors} loading={loading} className="text-white border-neutral-700 bg-neutral-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

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
                <TableCell className="text-white">{err.users?.email || 'System'}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-rose-300">
                  {err.error_message}
                </TableCell>
                <TableCell>
                  <span className="text-xs text-neutral-400">{err.error_status}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[10px] text-neutral-500">{err.correlation_id || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-neutral-400">
                    {new Date(err.created_at).toLocaleString()}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-neutral-400">
                {loading ? 'Loading failures...' : '✓ No system failures logged. All services operating normally.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
