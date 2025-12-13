import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { 
  getCircuitStatus, 
  getQuotaUsage, 
  getProviderStats,
  getRecentLogs,
} from '@/lib/jobs/observability';
import { getCacheStats } from '@/lib/jobs/cache';
import { getEnabledProviders, hasEnabledProviders } from '@/lib/jobs/providers';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('📊 Jobs Stats API loaded');

// GET - Get job provider stats (admin/debug)
export async function GET(request: NextRequest) {
  console.log('📊 Jobs Stats API - GET request received');
  
  try {
    await requireAuth();
    
    const enabledProviders = getEnabledProviders();
    
    const providerStats = enabledProviders.map(p => ({
      name: p.name,
      enabled: p.enabled,
      circuit: getCircuitStatus(p.name),
      quota: getQuotaUsage(p.name),
      stats: getProviderStats(p.name, 3600000), // Last hour
    }));
    
    const cacheStats = getCacheStats();
    const recentLogs = getRecentLogs(20);
    
    return NextResponse.json({
      hasProviders: hasEnabledProviders(),
      providers: providerStats,
      cache: cacheStats,
      recentLogs,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        linkedInEnabled: process.env.LINKEDIN_RAPID_ENABLED === 'true',
      },
    });
  } catch (error: any) {
    console.error('❌ Jobs Stats API error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



