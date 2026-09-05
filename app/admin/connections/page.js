'use client';

import React, { useState, useEffect } from 'react';
import { Mail, HardDrive, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminConnectionsPage() {
  const [data, setData] = useState({ gmail_connections: [], drive_connections: [] });
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/connections');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full text-white">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold">Google Connections Health</h1>
          <p className="text-xs text-neutral-400">
            Operational status of linked Gmail mailboxes and Google Drive archival targets. (Refresh tokens are encrypted and never shown)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchConnections} loading={loading} className="text-white border-neutral-700 bg-neutral-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Gmail Connections Table */}
      <div className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-400" /> Gmail Inboxes
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
                  <TableCell className="font-semibold text-white">{c.account_email}</TableCell>
                  <TableCell>Slot #{c.connection_slot}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'connected' ? 'success' : 'danger'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-neutral-400">
                      {c.last_connected_at ? new Date(c.last_connected_at).toLocaleString() : 'N/A'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-neutral-400">
                  {loading ? 'Loading...' : 'No Gmail connections found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Drive Connections Table */}
      <div className="space-y-3 pt-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-400" /> Google Drive Archival Folders
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
                  <TableCell className="font-semibold text-white">{d.account_email}</TableCell>
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
                <TableCell colSpan={4} className="text-center py-6 text-neutral-400">
                  {loading ? 'Loading...' : 'No Google Drive connections found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
