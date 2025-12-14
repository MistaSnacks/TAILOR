'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Lock, Loader2 } from 'lucide-react';

type CallbackType = 'signup' | 'recovery' | 'magiclink' | null;

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [callbackType, setCallbackType] = useState<CallbackType>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  
  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const type = searchParams.get('type') as CallbackType;
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('🔄 Auth Callback:', {
      type,
      error: errorParam,
      errorDescription,
      status,
      hasSession: !!session,
    });

    // Handle errors from Supabase
    if (errorParam) {
      setError(errorDescription || errorParam);
      setIsProcessing(false);
      return;
    }

    setCallbackType(type);

    // Handle different callback types
    const handleCallback = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError('Failed to initialize authentication');
        setIsProcessing(false);
        return;
      }

      try {
        // Get the current session from Supabase (set by the magic link/email confirmation)
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();

        console.log('🔄 Supabase session:', {
          hasSession: !!supabaseSession,
          error: sessionError,
          type,
        });

        if (sessionError) {
          setError(sessionError.message);
          setIsProcessing(false);
          return;
        }

        switch (type) {
          case 'signup':
            // Email confirmed after sign up
            if (supabaseSession) {
              setSuccess('Email verified successfully! Signing you in...');
              // Sign in with NextAuth using the Supabase access token for secure verification
              const result = await signIn('credentials', {
                email: supabaseSession.user.email,
                accessToken: supabaseSession.access_token, // Cryptographically verified server-side
                redirect: false,
              });

              if (result?.ok) {
                setTimeout(() => router.push('/dashboard'), 1500);
              } else {
                // Even if NextAuth fails, the user can sign in manually
                setSuccess('Email verified! Please sign in to continue.');
                setTimeout(() => router.push('/'), 2000);
              }
            } else {
              setSuccess('Email verified! Please sign in to continue.');
              setTimeout(() => router.push('/'), 2000);
            }
            break;

          case 'recovery':
            // Password reset flow
            if (supabaseSession) {
              setShowPasswordForm(true);
              setIsProcessing(false);
            } else {
              setError('Invalid or expired password reset link. Please request a new one.');
              setIsProcessing(false);
            }
            break;

          case 'magiclink':
            // Magic link sign in
            if (supabaseSession) {
              setSuccess('Signed in successfully! Redirecting...');
              const result = await signIn('credentials', {
                email: supabaseSession.user.email,
                accessToken: supabaseSession.access_token, // Cryptographically verified server-side
                redirect: false,
              });

              if (result?.ok) {
                setTimeout(() => router.push('/dashboard'), 1500);
              } else {
                setError('Failed to complete sign in. Please try again.');
              }
            } else {
              setError('Invalid or expired magic link. Please request a new one.');
            }
            setIsProcessing(false);
            break;

          default:
            // Standard OAuth callback (Google)
            if (status === 'authenticated' && session) {
              console.log('✅ Authenticated! Redirecting to dashboard...');
              router.push('/dashboard');
            } else if (status === 'unauthenticated') {
              console.log('❌ Not authenticated, redirecting to home...');
              router.push('/');
            }
            break;
        }
      } catch (err) {
        console.error('❌ Callback error:', err);
        setError('An unexpected error occurred. Please try again.');
        setIsProcessing(false);
      }
    };

    // Only process if we have a type or are waiting for NextAuth
    if (type) {
      handleCallback();
    } else if (status !== 'loading') {
      // Standard OAuth callback
      if (status === 'authenticated' && session) {
        router.push('/dashboard');
      } else if (status === 'unauthenticated') {
        router.push('/');
      }
    }
  }, [status, session, router, searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize authentication');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Password updated successfully! Redirecting to sign in...');
      setShowPasswordForm(false);
      
      // Sign out and redirect to home to sign in with new password
      await supabase.auth.signOut();
      setTimeout(() => router.push('/'), 2000);
    } catch (err: any) {
      console.error('❌ Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Password reset form
  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-display mb-2">Set New Password</h1>
            <p className="text-muted-foreground text-sm">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required
                minLength={8}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-3 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold font-display mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-muted/50 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-display mb-2">Success!</h1>
          <p className="text-muted-foreground">{success}</p>
        </motion.div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {callbackType === 'signup' && 'Verifying your email...'}
          {callbackType === 'recovery' && 'Processing password reset...'}
          {callbackType === 'magiclink' && 'Completing sign in...'}
          {!callbackType && 'Completing sign in...'}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}






