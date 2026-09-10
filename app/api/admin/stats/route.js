import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

let cachedStats = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds in-memory server cache

export async function GET(request) {
  const correlationId = generateCorrelationId();
  try {
    await getAuthenticatedAdmin();

    const { searchParams } = new URL(request.url);
    const forceFresh = searchParams.get('fresh') === 'true';

    // Return cached stats if valid and fresh not requested
    if (!forceFresh && cachedStats && Date.now() - lastCacheTime < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        cached: true,
        stats: cachedStats,
      }, {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      });
    }

    // Execute all 12 stats queries in parallel
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: activeSubscriptions },
      { count: inactiveSubscriptions },
      { count: totalGmailConnections },
      { count: totalDriveConnections },
      { count: reportsDelivered },
      { count: reportsArchived },
      { count: reportsFailed },
      { count: workflowFailed },
      { count: workflowProcessing },
      { count: unresolvedErrors },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).neq('status', 'active'),
      supabaseAdmin.from('gmail_connections').select('*', { count: 'exact', head: true }).eq('status', 'connected'),
      supabaseAdmin.from('google_drive_connections').select('*', { count: 'exact', head: true }).eq('status', 'connected'),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('email_delivery_status', 'delivered'),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('drive_upload_status', 'uploaded'),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabaseAdmin.from('workflow_executions').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabaseAdmin.from('workflow_executions').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      supabaseAdmin.from('system_errors').select('*', { count: 'exact', head: true }).eq('error_status', 'unresolved'),
    ]);

    const newStats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      inactiveSubscriptions: inactiveSubscriptions || 0,
      totalGmailConnections: totalGmailConnections || 0,
      totalDriveConnections: totalDriveConnections || 0,
      reportsDelivered: reportsDelivered || 0,
      reportsArchived: reportsArchived || 0,
      reportsFailed: reportsFailed || 0,
      workflowFailed: workflowFailed || 0,
      workflowProcessing: workflowProcessing || 0,
      unresolvedErrors: unresolvedErrors || 0,
    };

    cachedStats = newStats;
    lastCacheTime = Date.now();

    return NextResponse.json({
      success: true,
      cached: false,
      stats: newStats,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
