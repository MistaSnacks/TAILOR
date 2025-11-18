'use client';

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  
  useEffect(() => {
    console.log('🔐 Auth Status:', { status, hasSession: !!session, user: session?.user });
  }, [session, status]);
  
  const signIn = async () => {
    console.log('🚀 Initiating Google sign in...');
    try {
      const result = await nextAuthSignIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true,
      });
      console.log('✅ Sign in result:', result);
    } catch (error) {
      console.error('❌ Sign in error:', error);
    }
  };

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: '/' });
  };

  return {
    user: session?.user || null,
    loading: status === 'loading',
    signIn,
    signOut,
  };
}

