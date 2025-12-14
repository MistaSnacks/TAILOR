import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getSearchHistory } from '@/lib/jobs/service';

const isDev = process.env.NODE_ENV !== 'production';

// GET - List search history
export async function GET(request: NextRequest) {
  if (isDev) console.log('📜 Search History API - GET request received');
  
  try {
    const userId = await requireAuth();
    if (isDev) console.log('🔐 Search History API - User authenticated:', userId ? '✅' : '❌');
    
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    
    const history = await getSearchHistory(userId, limit);
    
    return NextResponse.json({
      history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('❌ Search History API error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



