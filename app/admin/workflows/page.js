'use client';

import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, Zap, CheckCircle2, WifiOff } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_workflows';

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState(() => {
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
  const [triggering, setTriggering] = useState(false);
  const [triggerNotice, setTriggerNotice] = useState(null);

  const fetchWorkflows = async () => {
    if (workflows.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/admin/workflows');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to load workflows (HTTP ${res.status})`);
      }
      const json = await res.json();
      const data = json.workflows || [];
      setWorkflows(data);
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

  const handleRunTestWorkflow = async () => {
    setTriggering(true);
    setTriggerNotice(null);
    try {
      const res = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTriggerNotice(`✓ Test workflow queued! Execution ID: ${data.execution_id}`);
        fetchWorkflows();
      } else {
        setTriggerNotice(`Error: ${data.error?.message || 'Failed to queue test workflow'}`);
      }
    } catch (err) {
      setTriggerNotice(`Network error: ${err.message}`);
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerNotice(null), 6000);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">n8n Workflow Executions</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Monitoring boundary for external n8n automation engine processing runs.
          </p>
          {triggerNotice && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 animate-in fade-in">
              {triggerNotice}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="primary"
            onClick={handleRunTestWorkflow}
            loading={triggering}
            className="w-full sm:w-auto text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Zap className="w-3.5 h-3.5 mr-1" /> Run Test Workflow
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchWorkflows}
            disabled={loading || isRefreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Execution ID</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Started</TableHeaderCell>
            <TableHeaderCell>Duration</TableHeaderCell>
            <TableHeaderCell>Emails Processed</TableHeaderCell>
            <TableHeaderCell>Correlation ID</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {workflows.length > 0 ? (
            workflows.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium text-slate-900 dark:text-white">{w.users?.email || 'N/A'}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{w.execution_id}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={w.status === 'completed' ? 'success' : w.status === 'failed' ? 'danger' : 'brand'}>
                    {w.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 dark:text-neutral-400">
                    {new Date(w.started_at).toLocaleTimeString()}
                  </span>
                </TableCell>
                <TableCell>{w.duration_ms ? `${w.duration_ms}ms` : '—'}</TableCell>
                <TableCell>{w.emails_processed || 0}</TableCell>
                <TableCell>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-neutral-500">{w.correlation_id}</span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-neutral-400">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    Loading workflow logs...
                  </span>
                ) : (
                  'No workflow executions recorded yet.'
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
