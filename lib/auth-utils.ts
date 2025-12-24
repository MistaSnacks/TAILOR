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
    // DEBUG_USER_ID override only works in non-production environments
    if (process.env.DEBUG_USER_ID) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ DEBUG_USER_ID override active (non-production environment)');
        return process.env.DEBUG_USER_ID;
      } else {
        console.warn('⚠️ DEBUG_USER_ID is set but ignored in production environment');
        // Continue with normal authentication flow
      }
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
      sessionUserId: sessionUserId ? sessionUserId.slice(0, 8) + '...' : null
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

    // 3) Atomic upsert: Create user or get existing on conflict
    // This handles race conditions when concurrent requests try to create the same user
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
    console.log('[Auth] Upserting user:', {
      email: sanitizedEmail,
      hasSessionId: !!sessionUserId,
      timestamp: new Date().toISOString(),
    });

    // Use upsert with ON CONFLICT to handle concurrent inserts atomically
    // If sessionUserId is provided, upsert uses primary key (id) for conflict resolution
    // If sessionUserId is not provided, specify email as conflict column
    // Note: This requires users.email to have a UNIQUE constraint (verified in schema.sql)
    const upsertOptions = sessionUserId
      ? { ignoreDuplicates: false } // Use primary key (id) for conflict resolution
      : { onConflict: 'email', ignoreDuplicates: false }; // Use email for conflict resolution

    const { data: upsertedUser, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(insertPayload, upsertOptions)
      .select('id')
      .single();

    if (upsertError) {
      // Handle 42P10 error (unique constraint violation) - fallback to find-or-create pattern
      // This can occur if the UNIQUE constraint on email doesn't exist or if there's a race condition
      const isUniqueConstraintError = upsertError.code === '42P10' || 
                                      upsertError.code === '23505' || 
                                      upsertError.message?.includes('unique constraint') ||
                                      upsertError.message?.includes('duplicate key');

      if (isUniqueConstraintError && !sessionUserId) {
        // Fallback: use transactional find-or-create pattern
        console.warn('[Auth] Unique constraint error on upsert, using find-or-create fallback:', {
          error: upsertError.message,
          code: upsertError.code,
          email: sanitizedEmail,
        });

        // Try to fetch existing user by email
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingUser?.id) {
          console.log('[Auth] Found existing user via fallback:', {
            userId: existingUser.id.slice(0, 8) + '...',
            email: sanitizedEmail,
          });
          return existingUser.id;
        }

        // If not found, try to insert (may still fail due to race condition, but we'll catch it)
        const { data: insertedUser, error: insertError } = await supabaseAdmin
          .from('users')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insertError && insertError.code === '23505') {
          // Still a duplicate - fetch the existing one
          const { data: raceConditionUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (raceConditionUser?.id) {
            console.log('[Auth] Resolved race condition via fallback:', {
              userId: raceConditionUser.id.slice(0, 8) + '...',
              email: sanitizedEmail,
            });
            return raceConditionUser.id;
          }
        } else if (insertedUser?.id) {
          console.log('[Auth] Created user via fallback:', {
            userId: insertedUser.id.slice(0, 8) + '...',
            email: sanitizedEmail,
          });
          return insertedUser.id;
        }
      }

      // If upsert fails for other reasons, try to fetch existing user by email as fallback
      // This handles edge cases like id conflicts when sessionUserId is provided
      // but the existing user has a different structure
      console.warn('[Auth] Upsert failed, fetching existing user:', {
        error: upsertError.message,
        code: upsertError.code,
        email: sanitizedEmail,
      });

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser?.id) {
        console.log('[Auth] Retrieved existing user after upsert conflict:', {
          userId: existingUser.id.slice(0, 8) + '...',
          email: sanitizedEmail,
        });
        return existingUser.id;
      }

      // If sessionUserId was provided, also try fetching by id
      if (sessionUserId) {
        const { data: existingUserById } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', sessionUserId)
          .maybeSingle();

        if (existingUserById?.id) {
          console.log('[Auth] Retrieved existing user by id after upsert conflict:', {
            userId: existingUserById.id.slice(0, 8) + '...',
            email: sanitizedEmail,
          });
          return existingUserById.id;
        }
      }

      console.error('[Auth] Error upserting user and no existing user found:', {
        error: upsertError.message,
        code: upsertError.code,
        email: sanitizedEmail,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    console.log('[Auth] Upserted user (created or updated):', {
      userId: upsertedUser.id.slice(0, 8) + '...',
      email: sanitizedEmail,
      timestamp: new Date().toISOString(),
    });
    return upsertedUser.id;
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

