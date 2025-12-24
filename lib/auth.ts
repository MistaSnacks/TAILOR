import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const isDev = process.env.NODE_ENV !== 'production';

// Helper to process invite codes
async function processInviteCode(supabase: any, userId: string) {
  try {
    const cookieStore = await cookies();
    const inviteCode = cookieStore.get('invite_code')?.value;

    if (inviteCode) {
      if (isDev) console.log('🎟️ Found invite code:', inviteCode, 'for user:', userId);

      const { data: invite } = await supabase
        .from('invites')
        .select('*')
        .eq('code', inviteCode)
        .eq('is_used', false)
        .single();

      if (invite) {
        if (isDev) console.log('✅ Valid invite found, applying legacy status...');

        // Update user to legacy
        await supabase.from('users').update({ is_legacy: true }).eq('id', userId);

        // Mark invite as used
        await supabase.from('invites').update({
          is_used: true,
          used_by: userId
        }).eq('id', invite.id);

        return true;
      } else {
        if (isDev) console.log('❌ Invalid or used invite code');
      }
    }
  } catch (err) {
    if (isDev) console.error('⚠️ Error processing invite code:', err);
  }
  return false;
}

// Helper to process referral codes (for bonus generations)
async function processReferralCode(supabase: any, userId: string) {
  try {
    const cookieStore = await cookies();
    const referralCode = cookieStore.get('referral_code')?.value;

    if (isDev) {
      console.log('🎁 [REFERRAL] Checking for referral code cookie...');
      console.log('🎁 [REFERRAL] User ID:', userId);
      console.log('🎁 [REFERRAL] Cookie value:', referralCode || '(none)');
    }

    if (referralCode) {
      if (isDev) console.log('🎁 [REFERRAL] Found referral code:', referralCode, 'for user:', userId);

      // Use the atomic database function to process referral
      if (isDev) console.log('🎁 [REFERRAL] Calling process_referral_atomic RPC...');
      const { data: result, error: rpcError } = await supabase.rpc('process_referral_atomic', {
        p_referral_code: referralCode,
        p_referee_id: userId,
      });

      if (isDev) {
        console.log('🎁 [REFERRAL] RPC result:', JSON.stringify(result));
        console.log('🎁 [REFERRAL] RPC error:', rpcError ? JSON.stringify(rpcError) : '(none)');
      }

      if (rpcError) {
        if (isDev) console.error('❌ [REFERRAL] Error processing referral:', rpcError);
        return false;
      }

      if (result && result.success) {
        if (isDev) console.log('✅ [REFERRAL] Referral processed successfully! Referrer:', result.referrer_id);
        return true;
      } else {
        if (isDev) console.log('⚠️ [REFERRAL] Referral not processed:', result?.error || 'Unknown error');
      }
    } else {
      if (isDev) console.log('🎁 [REFERRAL] No referral code cookie found');
    }
  } catch (err) {
    if (isDev) console.error('⚠️ [REFERRAL] Error processing referral code:', err);
  }
  return false;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        accessToken: { label: 'Access Token', type: 'text' }, // Supabase access token for verification
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        if (isDev) console.log('🔑 CredentialsProvider: Authorizing...', { email: credentials?.email });

        if (!credentials?.email || !credentials?.accessToken) {
          if (isDev) console.error('❌ CredentialsProvider: Missing email or access token');
          return null;
        }

        try {
          // Verify with Supabase
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            if (isDev) console.error('❌ CredentialsProvider: Missing Supabase environment variables');
            return null;
          }

          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );

          // SECURITY: Verify the Supabase access token is valid and belongs to this user
          // This prevents auth bypass - the token must be cryptographically valid
          const { data: { user: supabaseUser }, error: tokenError } = await supabase.auth.getUser(
            credentials.accessToken
          );

          if (tokenError || !supabaseUser) {
            if (isDev) console.error('❌ CredentialsProvider: Invalid or expired access token');
            return null;
          }

          // Verify the token belongs to the claimed email
          if (supabaseUser.email !== credentials.email) {
            if (isDev) console.error('❌ CredentialsProvider: Token email mismatch');
            return null;
          }

          if (isDev) console.log('✅ CredentialsProvider: Supabase token verified for:', supabaseUser.email);

          // Get or create user in public.users table
          let { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name, image')
            .eq('email', credentials.email)
            .single();

          // If user doesn't exist in public.users, create them
          if (userError || !user) {
            if (isDev) console.log('👤 Creating user in public.users for:', credentials.email);
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: supabaseUser.id, // Use the same ID as auth.users
                email: supabaseUser.email,
                name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
                email_verified: new Date().toISOString(),
              })
              .select('id, email, name, image')
              .single();

            if (createError) {
              if (isDev) console.error('❌ CredentialsProvider: Failed to create user:', createError);
              return null;
            }
            user = newUser;

            // Process invite code and referral code for new user
            await processInviteCode(supabase, user.id);
            await processReferralCode(supabase, user.id);
          }

          if (isDev) console.log('✅ CredentialsProvider: User authenticated:', user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name || '',
            image: user.image || '',
          };
        } catch (error) {
          if (isDev) console.error('❌ CredentialsProvider: Authorization error:', error);
          return null;
        }
      },
    }),
  ],

  // JWT session strategy (no database required)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user && user.email) {
        if (isDev) console.log('🔑 JWT Callback: Initial sign in for', user.email);

        // Sync with Supabase to ensure user exists in 'users' table and has a 'profile'
        try {
          if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // 1. Check if user exists in 'users' table (public schema for NextAuth)
            let userId: string | null = null;

            const { data: existingUser, error: fetchError } = await supabase
              .from('users')
              .select('id')
              .eq('email', user.email)
              .single();

            if (existingUser) {
              if (isDev) console.log('🔐 [AUTH] Found EXISTING user:', existingUser.id);
              userId = existingUser.id;
            } else {
              if (isDev) console.log('👤 [AUTH] Creating NEW user in users table...');
              // Create new user
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  email_verified: new Date().toISOString(),
                })
                .select('id')
                .single();

              if (newUser) {
                if (isDev) console.log('✅ [AUTH] Created new user:', newUser.id);
                userId = newUser.id;

                // Process invite code and referral code for new Google user
                await processInviteCode(supabase, newUser.id);
                await processReferralCode(supabase, newUser.id);
              } else if (createError) {
                if (isDev) console.error('❌ [AUTH] Error creating user:', createError);
              }
            }

            // 2. Upsert Profile if we have a userId
            if (userId) {
              // IMPORTANT: Use the database UUID as the token ID, not the Google ID
              token.id = userId;
              token.email = user.email;
              token.name = user.name || '';
              token.picture = user.image || '';

              if (isDev) console.log('👤 Upserting profile for user:', userId);
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  user_id: userId,
                  email: user.email,
                  full_name: user.name,
                  // Don't overwrite other fields if they exist
                }, {
                  onConflict: 'user_id'
                });

              if (profileError) {
                if (isDev) console.error('❌ Error upserting profile:', profileError);
              } else {
                if (isDev) console.log('✅ Profile synced successfully');
              }
            } else {
              // Fallback to Google ID if DB sync failed (not ideal)
              token.id = user.id;
            }
          }
        } catch (err) {
          if (isDev) console.error('❌ Error in JWT callback:', err);
          token.id = user.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Add user info to session from JWT token
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }

      return session;
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: isDev,
};

