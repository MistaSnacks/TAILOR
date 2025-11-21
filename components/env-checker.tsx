'use client';

import { useEffect } from 'react';

export function EnvChecker() {
  useEffect(() => {
    // Log client-side environment variables
    console.log('\n🌐 ========== CLIENT ENVIRONMENT CHECK ==========');
    console.log('Public Variables:');
    console.log('  - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('  - Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - App URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ Not set');
    console.log('================================================\n');
    
    // Also check server-side env vars by calling the API
    fetch('/api/env-check')
      .then(res => res.json())
      .then(data => {
        console.log('📊 Server Environment Status:', data);
      })
      .catch(err => {
        console.error('Failed to check server environment:', err);
      });
  }, []);

  return null; // This component doesn't render anything
}


