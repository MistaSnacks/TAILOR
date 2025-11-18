'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log('🔄 Auth Callback - Status:', status);
    console.log('🔄 Auth Callback - Session:', session);
    console.log('🔄 Auth Callback - Search Params:', Object.fromEntries(searchParams.entries()));

    if (status === 'authenticated' && session) {
      console.log('✅ Authenticated! Redirecting to dashboard...');
      router.push('/dashboard');
    } else if (status === 'unauthenticated') {
      console.log('❌ Not authenticated, redirecting to home...');
      router.push('/');
    }
  }, [status, session, router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}

