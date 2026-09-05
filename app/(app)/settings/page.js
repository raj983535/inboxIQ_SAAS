'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  HardDrive,
  Clock,
  User,
  Shield,
  Trash2,
  Lock,
  Edit2,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { IANA_TIMEZONES } from '@/lib/utils';
import { AppTopbar } from '@/components/layout/app-topbar';

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Editable Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Editable Schedule fields
  const [reportTime, setReportTime] = useState('08:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Disconnect modal state
  const [disconnectModal, setDisconnectModal] = useState({ open: false, type: null, id: null, email: '' });

  const loadData = async () => {
    try {
      const res = await fetch('/api/account');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.user) {
          setName(json.user.name || '');
          setEmail(json.user.email || '');
        }
        if (json.settings) {
          setReportTime(json.settings.report_time || '08:00');
          setTimezone(json.settings.timezone || 'Asia/Kolkata');
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to update profile.');
      }

      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/update-report-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportTime, timezone }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to update schedule settings.');
      }

      setSuccessMsg('Report schedule and timezone updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    const { type, id } = disconnectModal;
    try {
      const endpoint = type === 'gmail' ? '/api/gmail/disconnect' : '/api/drive/disconnect';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to disconnect resource.');
      }

      setDisconnectModal({ open: false, type: null, id: null, email: '' });
      await loadData();
      setSuccessMsg(`Account disconnected successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const gmailConnections = data?.gmail_connections || [];
  const driveConnection = data?.drive_connection;
  const user = data?.user;

  const professionLabels = {
    professor_teacher: 'Professor / Teacher',
    student: 'Student',
    others: 'Others / Professional',
  };

  const genderLabels = {
    male: 'Male',
    female: 'Female',
    non_binary: 'Non-Binary',
    prefer_not_to_say: 'Prefer not to say',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar title="Account &amp; Pipeline Settings" subtitle="Manage profile, schedule, and connected Google accounts" />

      <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        {successMsg && <Alert variant="success">{successMsg}</Alert>}
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {/* 1. Account Profile (With Locked & Editable Fields) */}
        <Card>
          <form onSubmit={handleSaveProfile}>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Registration metadata. Permanent fields (Profession, Country, Gender) are locked at the database level.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name (Editable)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prof. Sahil Sharma"
                />
                <Input
                  label="Email Address (Editable)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sharma@university.edu"
                />
              </div>

              {/* Locked One-Time Registration Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {/* Profession (Locked) */}
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Profession</span>
                    <Badge variant="default" className="text-[10px] gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {professionLabels[user?.profession] || user?.profession || 'Professor / Teacher'}
                  </div>
                  <p className="text-[10px] text-neutral-400">Permanent registration data</p>
                </div>

                {/* Country (Locked) */}
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Country</span>
                    <Badge variant="default" className="text-[10px] gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {user?.country || 'India'}
                  </div>
                  <p className="text-[10px] text-neutral-400">Permanent billing territory</p>
                </div>

                {/* Gender (Locked) */}
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Gender</span>
                    <Badge variant="default" className="text-[10px] gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {genderLabels[user?.gender] || user?.gender || 'Male'}
                  </div>
                  <p className="text-[10px] text-neutral-400">Permanent demographic data</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-neutral-400">Permanent fields cannot be edited after registration.</div>
              <Button type="submit" loading={savingProfile} variant="primary" size="sm">
                <Save className="w-3.5 h-3.5 mr-1" /> Save Profile
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 2. Schedule & Timezone */}
        <Card>
          <form onSubmit={handleSaveSchedule}>
            <CardHeader>
              <CardTitle>Daily Briefing Schedule</CardTitle>
              <CardDescription>
                Define when your morning intelligence report is generated and delivered in your local timezone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-2">
                    Delivery Time (Editable)
                  </label>
                  <select
                    value={reportTime}
                    onChange={(e) => setReportTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="06:00">06:00 AM</option>
                    <option value="07:00">07:00 AM</option>
                    <option value="08:00">08:00 AM (Recommended)</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-2">
                    IANA Timezone (Editable)
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {IANA_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-neutral-400">Timezone ensures accurate 24-hour date boundary calculation.</div>
              <Button type="submit" loading={savingSchedule} variant="primary" size="sm">
                <Save className="w-3.5 h-3.5 mr-1" /> Save Schedule
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 3. Gmail Mailbox Connections */}
        <Card>
          <CardHeader>
            <CardTitle>Gmail Connections (Max 2)</CardTitle>
            <CardDescription>
              Manage your connected Gmail accounts. You can reconnect or revoke authorization at any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Slot 1 */}
            {(() => {
              const conn1 = gmailConnections.find((c) => c.connection_slot === 1);
              return (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      #1
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {conn1?.account_email || 'Primary Gmail (Not Connected)'}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {conn1
                          ? `Status: ${conn1.status} • Last checked: ${conn1.last_connected_at ? new Date(conn1.last_connected_at).toLocaleDateString() : 'N/A'}`
                          : 'Primary inbox source & report recipient'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn1 && conn1.status === 'connected' ? (
                      <>
                        <Badge variant="success">Connected</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDisconnectModal({ open: true, type: 'gmail', id: conn1.id, email: conn1.account_email })}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                        </Button>
                      </>
                    ) : (
                      <a href="/api/google/connect?type=gmail&slot=1">
                        <Button size="sm" variant="primary">
                          Connect Primary Gmail
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Slot 2 */}
            {(() => {
              const conn2 = gmailConnections.find((c) => c.connection_slot === 2);
              return (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                      #2
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {conn2?.account_email || 'Secondary Gmail (Not Connected)'}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {conn2
                          ? `Status: ${conn2.status} • Last checked: ${conn2.last_connected_at ? new Date(conn2.last_connected_at).toLocaleDateString() : 'N/A'}`
                          : 'Optional second mailbox'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn2 && conn2.status === 'connected' ? (
                      <>
                        <Badge variant="success">Connected</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDisconnectModal({ open: true, type: 'gmail', id: conn2.id, email: conn2.account_email })}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                        </Button>
                      </>
                    ) : (
                      <a href="/api/google/connect?type=gmail&slot=2">
                        <Button size="sm" variant="outline">
                          + Connect Slot 2
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* 4. Google Drive Archival */}
        <Card>
          <CardHeader>
            <CardTitle>Google Drive Archival Connection</CardTitle>
            <CardDescription>
              Stores generated PDF executive reports directly into <code>My Drive &gt; InboxIQ &gt; Daily Reports</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {driveConnection?.account_email || 'Google Drive (Not Connected)'}
                  </div>
                  <p className="text-xs text-neutral-400">
                    {driveConnection ? `Status: ${driveConnection.status}` : 'PDF reports will not be archived until connected'}
                  </p>
                </div>
              </div>
              <div>
                {driveConnection && driveConnection.status === 'connected' ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="purple">Linked</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisconnectModal({ open: true, type: 'drive', id: driveConnection.id, email: driveConnection.account_email })}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                    </Button>
                  </div>
                ) : (
                  <a href="/api/google/connect?type=drive">
                    <Button size="sm" variant="primary">
                      Connect Google Drive
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disconnection Confirmation Modal */}
      <Modal
        isOpen={disconnectModal.open}
        onClose={() => setDisconnectModal({ open: false, type: null, id: null, email: '' })}
        title="Confirm Disconnection"
        description="Are you sure you want to disconnect this Google account?"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Disconnecting <strong>{disconnectModal.email}</strong> will immediately delete stored authorization tokens and halt automated email processing for this account.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <Button variant="outline" size="sm" onClick={() => setDisconnectModal({ open: false, type: null, id: null, email: '' })}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDisconnect}>
              Yes, Disconnect
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
