'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    // Return a mock client for build time
    return null as any;
  }
  
  return createClientComponentClient();
};

