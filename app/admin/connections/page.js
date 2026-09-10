'use client';

import React, { useState, useEffect } from 'react';
import { Mail, HardDrive, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_connections';

export default function AdminConnectionsPage() {
  const [data, setData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return { gmail_connections: [], drive_connections: [] };
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

  const fetchConnections = async () => {
    if (data.gmail_connections.length === 0 && data.drive_connections.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/admin/connections');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Failed to load connections (HTTP ${res.status})`);
      }
      const json = await res.json();
      setData(json);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify(json));
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(json));
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
    fetchConnections();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Google Connections Health</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Operational status of linked Gmail mailboxes and Google Drive archival targets. (Refresh tokens are encrypted and never shown)
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchConnections}
          disabled={loading || isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Gmail Connections Table */}
      <div className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Gmail Inboxes
        </h2>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>InboxIQ User</TableHeaderCell>
              <TableHeaderCell>Connected Email</TableHeaderCell>
              <TableHeaderCell>Slot</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Last Connected / Checked</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {data.gmail_connections.length > 0 ? (
              data.gmail_connections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.users?.email || 'N/A'}</TableCell>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">{c.account_email}</TableCell>
                  <TableCell>Slot #{c.connection_slot}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'connected' ? 'success' : 'danger'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600 dark:text-neutral-400">
                      {c.last_connected_at ? new Date(c.last_connected_at).toLocaleString() : 'N/A'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-slate-500 dark:text-neutral-400">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      Loading...
                    </span>
                  ) : (
                    'No Gmail connections found.'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Drive Connections Table */}
      <div className="space-y-3 pt-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-500 dark:text-purple-400" /> Google Drive Archival Folders
        </h2>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>InboxIQ User</TableHeaderCell>
              <TableHeaderCell>Drive Account</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Reports Folder ID</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {data.drive_connections.length > 0 ? (
              data.drive_connections.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.users?.email || 'N/A'}</TableCell>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">{d.account_email}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'connected' ? 'purple' : 'danger'}>{d.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{d.reports_folder_id || 'Auto-created'}</span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-slate-500 dark:text-neutral-400">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      Loading...
                    </span>
                  ) : (
                    'No Google Drive connections found.'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
