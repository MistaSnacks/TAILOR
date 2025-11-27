// 🔑 Authentication utilities for API routes (REMOVE IN PRODUCTION)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get or create a user in Supabase users table from NextAuth session
 * @returns Supabase user UUID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('🔐 getUserId check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || 'None',
    });

    if (!session?.user?.email) {
      console.error('❌ No user email in session');
      return null;
    }

    const email = session.user.email;
    const name = session.user.name || null;
    const image = session.user.image || null;

    // Prefer the UUID we stored in the session (set by NextAuth callback)
    const sessionUserId = (session.user as any)?.id || null;

    // 1) Try to find by session user id (fastest, guarantees stable UUID)
    if (sessionUserId) {
      const { data: userById } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (userById?.id) {
        console.log('✅ Found user by session id:', userById.id);
        return userById.id;
      }
    }

    // 2) Fallback: try to find by email (legacy records may not have session id stored)
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userByEmail?.id) {
      console.log('✅ Found user by email:', userByEmail.id);

      // If session is missing id, update session token downstream
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

    console.log('📝 Creating new user in database for:', email, sessionUserId ? `(id=${sessionUserId})` : '');
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert(insertPayload)
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Error creating user:', createError);
      return null;
    }

    console.log('✅ Created new user in database:', newUser.id);
    return newUser.id;
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
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
    
    console.log('🔐 getAuthUser check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email || 'None',
    });

    if (!session?.user) {
      console.error('❌ No user in session');
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

