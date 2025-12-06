import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { 
  createSavedSearch, 
  getSavedSearches, 
  deleteSavedSearch,
} from '@/lib/jobs/service';
import type { JobSearchParams } from '@/lib/jobs/types';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('🔖 Saved Searches API loaded');

// GET - List saved searches
export async function GET(request: NextRequest) {
  console.log('🔖 Saved Searches API - GET request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Searches API - User authenticated:', userId ? '✅' : '❌');
    
    const savedSearches = await getSavedSearches(userId);
    
    return NextResponse.json({
      searches: savedSearches,
      count: savedSearches.length,
    });
  } catch (error: any) {
    console.error('❌ Saved Searches API GET error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create saved search
export async function POST(request: NextRequest) {
  console.log('🔖 Saved Searches API - POST request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Searches API - User authenticated:', userId ? '✅' : '❌');
    
    const body = await request.json();
    const { name, params, notifyEmail } = body as { 
      name: string; 
      params: JobSearchParams; 
      notifyEmail?: boolean;
    };
    
    if (!name || !params) {
      return NextResponse.json({ 
        error: 'Name and search params are required' 
      }, { status: 400 });
    }
    
    const savedSearch = await createSavedSearch(userId, name, params, notifyEmail);
    
    return NextResponse.json({ savedSearch });
  } catch (error: any) {
    console.error('❌ Saved Searches API POST error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove saved search
export async function DELETE(request: NextRequest) {
  console.log('🔖 Saved Searches API - DELETE request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Searches API - User authenticated:', userId ? '✅' : '❌');
    
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('id');
    
    if (!searchId) {
      return NextResponse.json({ error: 'Search ID is required' }, { status: 400 });
    }
    
    await deleteSavedSearch(userId, searchId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Saved Searches API DELETE error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

