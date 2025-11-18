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

    // Get or create user in Supabase users table
    const email = session.user.email;
    const name = session.user.name || null;
    const image = session.user.image || null;

    // First, try to find existing user by email
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('✅ Found existing user in database:', existingUser.id);
      return existingUser.id;
    }

    // If not found, create new user
    console.log('📝 Creating new user in database for:', email);
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        name,
        image,
        email_verified: new Date().toISOString(),
      })
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

