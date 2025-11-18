import { NextResponse } from 'next/server';
import { logEnvironmentVariables, validateEnvironmentVariables } from '@/lib/env-logger';

// This route logs environment variables when accessed
// Access it once on startup to verify env vars are loaded
export async function GET() {
  // Log to server console (will show in terminal)
  console.log('\n🔍 ========== API ENV CHECK ROUTE CALLED ==========');
  logEnvironmentVariables();
  const validation = validateEnvironmentVariables();
  
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
  };

  // Log URL format validation
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('✅ Supabase URL format is valid');
    } catch (error) {
      console.error('❌ Supabase URL format is INVALID:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    }
  }

  console.log('================================================\n');
  
  return NextResponse.json({
    message: 'Environment check complete',
    valid: validation.valid,
    missing: validation.missing,
    // Don't expose actual values, just whether they exist
    envStatus,
  });
}

