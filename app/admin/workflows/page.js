'use client';

import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workflows');
      if (res.ok) {
        const json = await res.json();
        setWorkflows(json.workflows || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="p-6 sm:p-10 space-y-6 max-w-7xl mx-auto w-full text-white">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold">n8n Workflow Executions</h1>
          <p className="text-xs text-neutral-400">
            Monitoring boundary for external n8n automation engine processing runs.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchWorkflows} loading={loading} className="text-white border-neutral-700 bg-neutral-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

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
                <TableCell className="font-medium text-white">{w.users?.email || 'N/A'}</TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{w.execution_id}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={w.status === 'completed' ? 'success' : w.status === 'failed' ? 'danger' : 'brand'}>
                    {w.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-neutral-400">
                    {new Date(w.started_at).toLocaleTimeString()}
                  </span>
                </TableCell>
                <TableCell>{w.duration_ms ? `${w.duration_ms}ms` : '—'}</TableCell>
                <TableCell>{w.emails_processed || 0}</TableCell>
                <TableCell>
                  <span className="font-mono text-[10px] text-neutral-500">{w.correlation_id}</span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-neutral-400">
                {loading ? 'Loading workflow logs...' : 'No workflow executions recorded.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
