'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const CACHE_KEY = 'inboxiq_cached_admin_health';

export default function AdminSystemPage() {
  const [services, setServices] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(!services);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async (forceFresh = false) => {
    if (!services) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Health check failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data?.services) {
        setServices(data.services);
        setLastChecked(new Date().toLocaleTimeString());
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.services));
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.services));
          }
        } catch (e) {}
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusIcon = (status) => {
    if (status === 'Healthy' || status === 'Configured')
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'Degraded')
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    if (status === 'Error' || status === 'Not configured')
      return <XCircle className="w-4 h-4 text-rose-500" />;
    return <Wifi className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'Healthy' || status === 'Configured') return <Badge variant="success">{status}</Badge>;
    if (status === 'Degraded') return <Badge variant="warning">{status}</Badge>;
    if (status === 'Error') return <Badge variant="danger">{status}</Badge>;
    if (status === 'Not configured') return <Badge variant="danger">{status}</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  const serviceEntries = services ? Object.entries(services) : [];
  const healthyCount = serviceEntries.filter(([, s]) => s.status === 'Healthy' || s.status === 'Configured').length;
  const totalCount = serviceEntries.length;

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Platform & Integration Health</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Real configuration status across Control Plane, Database, OAuth, Razorpay, and n8n boundary.
          </p>
          {lastChecked && (
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">
              Last checked: {lastChecked}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {services && (
            <div className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-600 dark:text-neutral-400">
                {healthyCount}/{totalCount} Operational
              </span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchHealth(true)}
            disabled={loading || isRefreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Checking...' : 'Refresh Health'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger">
          <span className="font-semibold">Health Check Error:</span> {error}
        </Alert>
      )}

      {/* Loading skeleton when no cached data */}
      {loading && !services && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-block h-4 w-40 bg-slate-200 dark:bg-neutral-800 animate-pulse rounded" />
                  <span className="inline-block h-5 w-20 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-full" />
                </div>
                <span className="inline-block h-3 w-full bg-slate-100 dark:bg-neutral-800/60 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Service cards */}
      {services && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceEntries.map(([key, svc]) => (
            <Card key={key} className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-white shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(svc.status)}
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{svc.name}</span>
                  </div>
                  {getStatusBadge(svc.status)}
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">{svc.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* If no data and no loading (edge case) */}
      {!loading && !services && !error && (
        <div className="text-center py-12 text-slate-500 dark:text-neutral-400">
          <WifiOff className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-neutral-600" />
          <p className="text-sm font-medium">Unable to load system health data</p>
          <p className="text-xs mt-1">Click Refresh Health to retry.</p>
        </div>
      )}
    </div>
  );
}
