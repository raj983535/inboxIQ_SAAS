'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, ChevronRight, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-xs text-neutral-400">
            View registered user accounts, subscription state, and connected mailboxes. (Email bodies are never exposed)
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-neutral-900 border-neutral-800 text-white"
          />
        </div>
      </div>

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
              const isSubscribed = subObj?.status === 'active';
              const driveObj = u.drive_connection || (Array.isArray(u.google_drive_connections) ? u.google_drive_connections[0] : u.google_drive_connections);
              const settingsObj = u.user_settings && !Array.isArray(u.user_settings) ? u.user_settings : (u.user_settings?.[0] || null);

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <div className="font-semibold text-white">{u.name || 'InboxIQ User'}</div>
                      <div className="text-xs text-neutral-400">{u.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'danger' : 'default'}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isSubscribed ? 'success' : 'warning'}>
                      {subObj?.status || 'inactive'}
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
                    <span className="text-xs text-neutral-300">
                      {settingsObj?.report_time || '08:00'} ({settingsObj?.timezone?.split('/')[1] || 'Kolkata'})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/users/${u.id}`}>
                      <Button size="sm" variant="outline" className="text-white border-neutral-700 bg-neutral-800">
                        View Detail <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-neutral-400">
                {loading ? 'Loading users...' : 'No users found.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
