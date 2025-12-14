'use client';

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { createClient } from '@/lib/supabase-client';

const isDev = process.env.NODE_ENV !== 'production';

export function useAuth() {
  const { data: session, status } = useSession();
  
  // Google sign in
  const signInWithGoogle = async () => {
    if (isDev) console.log('🚀 Initiating Google sign in...');
    try {
      await nextAuthSignIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true,
      });
    } catch (error) {
      console.error('❌ Google sign in error:', error);
      throw error;
    }
  };

  // Email/password sign in
  const signInWithEmail = async (email: string, password: string, rememberMe: boolean = true) => {
    if (isDev) console.log('🚀 Initiating email sign in...', { email, rememberMe });
    
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      // First authenticate with Supabase
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (supabaseError) {
        console.error('❌ Supabase sign in error:', supabaseError);
        throw supabaseError;
      }

      if (isDev) console.log('✅ Supabase sign in successful:', data.user?.email);

      // Then sign in with NextAuth using the Supabase access token for secure verification
      // The server will verify this token cryptographically - no bypass possible
      const result = await nextAuthSignIn('credentials', {
        email,
        accessToken: data.session?.access_token,
        rememberMe: rememberMe.toString(),
        redirect: false,
      });

      if (result?.error) {
        console.error('❌ NextAuth sign in error:', result.error);
        throw new Error(result.error);
      }

      if (isDev) console.log('✅ NextAuth sign in successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Email sign in error:', error);
      throw error;
    }
  };

  // Email/password sign up
  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    if (isDev) console.log('🚀 Initiating email sign up...', { email, fullName });
    
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      const { data, error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (supabaseError) {
        console.error('❌ Supabase sign up error:', supabaseError);
        throw supabaseError;
      }

      if (isDev) console.log('✅ Supabase sign up response:', data);

      // Check if user already exists (Supabase returns user with empty identities to prevent email enumeration)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.log('⚠️ User already exists (empty identities)');
        throw new Error('This email is already registered. Try signing in instead.');
      }

      // Return whether email confirmation is required
      return {
        success: true,
        needsEmailConfirmation: data.user && !data.session,
        user: data.user,
      };
    } catch (error) {
      console.error('❌ Email sign up error:', error);
      throw error;
    }
  };

  // Password reset request
  const resetPassword = async (email: string) => {
    if (isDev) console.log('🚀 Requesting password reset...', { email });
    
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (resetError) {
        console.error('❌ Password reset error:', resetError);
        throw resetError;
      }

      if (isDev) console.log('✅ Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  };

  // Update password (after reset)
  const updatePassword = async (newPassword: string) => {
    if (isDev) console.log('🚀 Updating password...');
    
    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        throw updateError;
      }

      if (isDev) console.log('✅ Password updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Password update error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    // Sign out from Supabase
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Sign out from NextAuth
    await nextAuthSignOut({ callbackUrl: '/' });
  };

  // Legacy alias for backwards compatibility
  const signIn = signInWithGoogle;

  return {
    user: session?.user || null,
    loading: status === 'loading',
    signIn,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updatePassword,
    signOut,
  };
}

