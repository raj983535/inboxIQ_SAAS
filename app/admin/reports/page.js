'use client';

import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Report Execution Metadata</h1>
          <p className="text-xs text-neutral-400">
            Delivery confirmation to Gmail and PDF upload status to Google Drive. (Raw email text is not stored)
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchReports} loading={loading} className="w-full sm:w-auto text-white border-neutral-700 bg-neutral-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

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
                <TableCell className="font-semibold text-white">{r.users?.email || 'N/A'}</TableCell>
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
                  <span className="text-xs text-neutral-400">
                    {r.generated_at ? new Date(r.generated_at).toLocaleString() : 'N/A'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-neutral-400">
                {loading ? 'Loading reports...' : 'No reports generated yet.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
