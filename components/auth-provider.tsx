'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

const isDev = process.env.NODE_ENV !== 'production';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Log client-side Supabase status (dev only)
    if (isDev) {
      console.log('🔐 Auth Provider - Supabase client:', supabase ? '✅ Initialized' : '❌ Not initialized');
      console.log('🔐 Auth Provider - Env check:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌',
      });
    }
    
    if (!supabase) {
      if (isDev) console.error('❌ Cannot initialize Supabase client - check environment variables');
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) console.error('Sign in error:', error);
  };

  const signOut = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out error:', error);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

