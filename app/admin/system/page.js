'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminSystemPage() {
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'Healthy' || status === 'Configured') return <Badge variant="success">{status}</Badge>;
    if (status === 'Degraded') return <Badge variant="warning">{status}</Badge>;
    if (status === 'Error') return <Badge variant="danger">{status}</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full text-white">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold">Platform &amp; Integration Health</h1>
          <p className="text-xs text-neutral-400">
            Real configuration status across Control Plane, Database, OAuth, Razorpay, and n8n boundary.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchHealth} loading={loading} className="text-white border-neutral-700 bg-neutral-800">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Health
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(services).map(([key, svc]) => (
          <Card key={key} className="bg-neutral-900 border-neutral-800 text-white">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{svc.name}</span>
                {getStatusBadge(svc.status)}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">{svc.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
