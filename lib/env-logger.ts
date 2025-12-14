/**
 * Environment Variable Logger
 * 
 * Logs all environment variables on startup to help debug configuration issues.
 * Automatically disabled in production.
 */

const isDev = process.env.NODE_ENV !== 'production';

export function logEnvironmentVariables() {
  if (!isDev) return;
  
  if (typeof window === 'undefined') {
    // Server-side logging
    console.log('\n🔑 ========== SERVER ENVIRONMENT CHECK ==========');
    console.log('Supabase:');
    console.log('  - URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('  - Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - Service Role:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    
    console.log('\nNextAuth:');
    console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing');
    console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
    
    console.log('\nGoogle OAuth:');
    console.log('  - Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('  - Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    
    console.log('\nGoogle Gemini AI:');
    console.log('  - API Key:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
    
    console.log('\nApp Config:');
    console.log('  - App URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ Not set');
    console.log('===============================================\n');
  } else {
    // Client-side logging
    console.log('\n🌐 ========== CLIENT ENVIRONMENT CHECK ==========');
    console.log('Public Variables:');
    console.log('  - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('  - Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - App URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ Not set');
    console.log('================================================\n');
  }
}

/**
 * Log when a specific secret is being used
 */
export function logSecretUsage(secretName: string, exists: boolean) {
  if (!isDev) return;
  console.log(`🔐 Using ${secretName}:`, exists ? '✅ Available' : '❌ Missing');
}

/**
 * Validate all required environment variables
 */
export function validateEnvironmentVariables(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_API_KEY',
  ];

  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
      console.error(`❌ Missing required environment variable: ${varName}`);
    }
  }

  const valid = missing.length === 0;
  
  if (isDev) {
    if (valid) {
      console.log('✅ All required environment variables are set');
    } else {
      console.error(`❌ Missing ${missing.length} required environment variable(s)`);
    }
  }

  return { valid, missing };
}

