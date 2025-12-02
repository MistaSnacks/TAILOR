'use client';

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

const isDev = process.env.NODE_ENV !== 'production';

export function useAuth() {
  const { data: session, status } = useSession();
  
  const signIn = async () => {
    if (isDev) console.log('🚀 Initiating Google sign in...');
    try {
      await nextAuthSignIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true,
      });
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

