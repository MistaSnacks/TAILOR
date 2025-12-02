// 🔑 Authentication utilities for API routes
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get or create a user in Supabase users table from NextAuth session
 * @returns Supabase user UUID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  try {
    if (process.env.DEBUG_USER_ID) {
      console.warn('⚠️ DEBUG_USER_ID override active');
      return process.env.DEBUG_USER_ID;
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.log('[Auth] No session or email');
      return null;
    }

    const email = session.user.email;
    const name = session.user.name || null;
    const image = session.user.image || null;
    const sessionUserId = (session.user as any)?.id || null;

    // Helper function to sanitize email for logging (production safety)
    const sanitizeEmail = (email: string | null | undefined): string | null => {
      return email ? email.split('@')[0] + '@***' : null;
    };

    const sanitizedEmail = sanitizeEmail(email);
    console.log('[Auth] Session info:', { 
      email: sanitizedEmail, 
      sessionUserId: sessionUserId ? sessionUserId.slice(0, 8) + '...' : 'not set'
    });

    // 1) Try to find by session user id (fastest, guarantees stable UUID)
    if (sessionUserId) {
      const { data: userById } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (userById?.id) {
        console.log('[Auth] Found user by session ID:', userById.id.slice(0, 8) + '...');
        return userById.id;
      }
    }

    // 2) Fallback: try to find by email (THIS IS THE KEY FIX)
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userByEmail?.id) {
      console.log('[Auth] Found user by email:', userByEmail.id.slice(0, 8) + '...', '(email:', sanitizedEmail, ')');
      return userByEmail.id;
    }

    // 3) Create user, preserving session UUID if we have one
    const insertPayload: Record<string, any> = {
      email,
      name,
      image,
      email_verified: new Date().toISOString(),
    };

    if (sessionUserId) {
      insertPayload.id = sessionUserId;
    }

    // Structured logging for user creation (production-ready)
    console.log('[Auth] Creating new user:', {
      email: sanitizedEmail,
      hasSessionId: !!sessionUserId,
      timestamp: new Date().toISOString(),
    });

    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert(insertPayload)
      .select('id')
      .single();

    if (createError) {
      console.error('[Auth] Error creating user:', {
        error: createError.message,
        code: createError.code,
        email: sanitizedEmail,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    console.log('[Auth] Created new user:', {
      userId: newUser.id.slice(0, 8) + '...',
      email: sanitizedEmail,
      timestamp: new Date().toISOString(),
    });
    return newUser.id;
  } catch (error) {
    console.error('[Auth] Error getting user ID:', error);
    return null;
  }
}

/**
 * Get the authenticated user from the session
 * @returns User object or null if not authenticated
 */
export async function getAuthUser() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('❌ Error getting auth user:', error);
    return null;
  }
}

/**
 * Require authentication for an API route
 * Throws an error with status code if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getUserId();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  return userId;
}

