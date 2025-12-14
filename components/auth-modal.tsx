'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { createClient } from '@/lib/supabase-client';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
} from 'lucide-react';

type AuthView = 'signin' | 'signup' | 'forgot-password' | 'check-email' | 'reset-sent';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('signin');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setError(null);
        setSuccess(null);
        setShowPassword(false);
      }, 300);
    }
  }, [isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🚀 Initiating Google sign in...');
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      console.error('❌ Google sign in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log('[AuthModal] Email sign in attempt:', { email, rememberMe });

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Supabase sign in error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else {
          setError(signInError.message);
        }
        setIsLoading(false);
        return;
      }

      console.log('✅ Supabase sign in successful:', data.user?.email);

      // Now sign in with NextAuth using the Supabase access token for secure verification
      // The server will verify this token cryptographically - no bypass possible
      const result = await signIn('credentials', {
        email,
        accessToken: data.session?.access_token,
        rememberMe: rememberMe.toString(),
        redirect: false,
      });

      if (result?.error) {
        console.error('❌ NextAuth sign in error:', result.error);
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('✅ NextAuth sign in successful');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('❌ Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log('[AuthModal] Email sign up attempt:', { email, fullName });

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        console.error('❌ Supabase sign up error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Try signing in instead.');
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      console.log('✅ Supabase sign up response:', data);

      // Check if user already exists (Supabase returns user with empty identities to prevent email enumeration)
      // This happens when:
      // 1. User already exists and is confirmed
      // 2. User exists but hasn't confirmed yet (they'll get a new confirmation email)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.log('⚠️ User already exists (empty identities)');
        setError('This email is already registered. Try signing in instead, or use "Forgot Password" if you need to reset your password.');
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is required - new user or resending confirmation
        setView('check-email');
      } else if (data.session) {
        // Auto-confirmed (if email confirmation is disabled in Supabase)
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('❌ Sign up error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log('[AuthModal] Password reset request:', { email });

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
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      console.log('✅ Password reset email sent');
      setView('reset-sent');
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderGoogleButton = () => (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl border border-gray-200 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </button>
  );

  const renderDivider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-card px-4 text-muted-foreground">or continue with email</span>
      </div>
    </div>
  );

  const renderInput = (
    id: string,
    type: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    autoComplete?: string
  ) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </div>
      <input
        id={id}
        type={type === 'password' && showPassword ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
        required
      />
      {type === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  const renderSignInView = () => (
    <motion.div
      key="signin"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display mb-2">Welcome back</h2>
        <p className="text-muted-foreground text-sm">Sign in to continue tailoring your resume</p>
      </div>

      {renderGoogleButton()}
      {renderDivider()}

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        {renderInput('email', 'email', email, setEmail, 'Email address', <Mail className="w-4 h-4" />, 'email')}
        {renderInput('password', 'password', password, setPassword, 'Password', <Lock className="w-4 h-4" />, 'current-password')}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border-2 border-border rounded bg-muted/50 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                {rememberMe && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </div>
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Remember me
            </span>
          </label>

          <button
            type="button"
            onClick={() => setView('forgot-password')}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </button>
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
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{' '}
        <button
          onClick={() => setView('signup')}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </motion.div>
  );

  const renderSignUpView = () => (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display mb-2">Create account</h2>
        <p className="text-muted-foreground text-sm">Start tailoring your resume to every job</p>
      </div>

      {renderGoogleButton()}
      {renderDivider()}

      <form onSubmit={handleEmailSignUp} className="space-y-4">
        {renderInput('fullName', 'text', fullName, setFullName, 'Full name', <User className="w-4 h-4" />, 'name')}
        {renderInput('signupEmail', 'email', email, setEmail, 'Email address', <Mail className="w-4 h-4" />, 'email')}
        {renderInput('signupPassword', 'password', password, setPassword, 'Password (min. 8 characters)', <Lock className="w-4 h-4" />, 'new-password')}
        {renderInput('confirmPassword', 'password', confirmPassword, setConfirmPassword, 'Confirm password', <Lock className="w-4 h-4" />, 'new-password')}

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
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <button
          onClick={() => setView('signin')}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );

  const renderForgotPasswordView = () => (
    <motion.div
      key="forgot-password"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={() => setView('signin')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </button>

      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">Forgot password?</h2>
        <p className="text-muted-foreground text-sm">
          No worries, we'll send you reset instructions.
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-4">
        {renderInput('resetEmail', 'email', email, setEmail, 'Enter your email', <Mail className="w-4 h-4" />, 'email')}

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
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </motion.div>
  );

  const renderCheckEmailView = () => (
    <motion.div
      key="check-email"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-2">Check your email</h2>
      <p className="text-muted-foreground text-sm mb-4">
        We've sent a verification link to<br />
        <span className="text-foreground font-medium">{email}</span>
      </p>
      
      {/* Spam folder warning */}
      <div className="flex items-start gap-3 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="text-amber-500 font-medium mb-1">Can't find the email?</p>
          <p className="text-muted-foreground">
            Check your <span className="text-foreground font-medium">spam or junk folder</span>. 
            Sometimes verification emails end up there. Mark it as "not spam" to receive future emails.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Click the link in the email to verify your account and start tailoring your resume.
      </p>

      <button
        onClick={() => setView('signin')}
        className="w-full py-3 bg-muted/50 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
      >
        Back to Sign In
      </button>
    </motion.div>
  );

  const renderResetSentView = () => (
    <motion.div
      key="reset-sent"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="text-center"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-2">Check your email</h2>
      <p className="text-muted-foreground text-sm mb-4">
        We've sent a password reset link to<br />
        <span className="text-foreground font-medium">{email}</span>
      </p>
      
      {/* Spam folder warning */}
      <div className="flex items-start gap-3 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="text-amber-500 font-medium mb-1">Can't find the email?</p>
          <p className="text-muted-foreground">
            Check your <span className="text-foreground font-medium">spam or junk folder</span>.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Click the link in the email to reset your password. The link will expire in 1 hour.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => setView('signin')}
          className="w-full py-3 bg-muted/50 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
        >
          Back to Sign In
        </button>
        <button
          onClick={() => {
            setError(null);
            handleForgotPassword({ preventDefault: () => {} } as React.FormEvent);
          }}
          disabled={isLoading}
          className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : "Didn't receive the email? Resend"}
        </button>
      </div>
    </motion.div>
  );

  const renderCurrentView = () => {
    switch (view) {
      case 'signin':
        return renderSignInView();
      case 'signup':
        return renderSignUpView();
      case 'forgot-password':
        return renderForgotPasswordView();
      case 'check-email':
        return renderCheckEmailView();
      case 'reset-sent':
        return renderResetSentView();
      default:
        return renderSignInView();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6 pt-10">
              <AnimatePresence mode="wait">
                {renderCurrentView()}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
