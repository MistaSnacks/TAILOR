'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => {
  // Validate environment variables before creating client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey,
    });
    return null as any;
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.error('❌ Invalid Supabase URL format:', supabaseUrl);
    return null as any;
  }

  try {
    return createClientComponentClient();
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    return null as any;
  }
};

