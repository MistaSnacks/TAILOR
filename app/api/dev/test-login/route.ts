/**
 * DEV ONLY: Test User Login API
 * 
 * This endpoint allows switching to test profiles without OAuth.
 * ONLY works in development mode.
 * 
 * Usage: GET /api/dev/test-login?profile=principal-engineer
 * 
 * Available profiles:
 *   - principal-engineer (Marcus Chen)
 *   - retail-worker (Jessica Martinez)
 *   - teacher-tech (David Thompson)
 *   - warehouse-operator (Robert Jackson)
 *   - government-employee (Patricia Williams)
 */

import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

const TEST_PROFILES: Record<string, string> = {
  'principal-engineer': 'principal.engineer@test.tailor.dev',
  'retail-worker': 'retail.worker@test.tailor.dev',
  'teacher-tech': 'teacher.to.tech@test.tailor.dev',
  'warehouse-operator': 'warehouse.operator@test.tailor.dev',
  'government-employee': 'government.employee@test.tailor.dev',
};

export async function GET(request: NextRequest) {
  // ONLY allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  const profile = request.nextUrl.searchParams.get('profile');
  
  if (!profile) {
    return NextResponse.json({
      error: 'Missing profile parameter',
      available: Object.keys(TEST_PROFILES),
      usage: '/api/dev/test-login?profile=principal-engineer',
    }, { status: 400 });
  }

  const email = TEST_PROFILES[profile];
  if (!email) {
    return NextResponse.json({
      error: `Unknown profile: ${profile}`,
      available: Object.keys(TEST_PROFILES),
    }, { status: 400 });
  }

  try {
    // Find the user in database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, image')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({
        error: `Test user not found: ${email}. Run seed-test-profiles.sql first.`,
        details: error?.message,
      }, { status: 404 });
    }

    // Create JWT token
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Set the session cookie
    response.cookies.set({
      name: 'next-auth.session-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV?.toString() === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log(`✅ [DEV] Logged in as test user: ${user.name} (${user.email})`);

    return response;
  } catch (err) {
    console.error('❌ [DEV] Test login error:', err);
    return NextResponse.json({
      error: 'Failed to create test session',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}


