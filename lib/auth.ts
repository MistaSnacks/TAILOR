import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
// Note: password-utils no longer needed - auth verification uses Supabase access tokens

// Log NextAuth configuration on load (REMOVE IN PRODUCTION)
console.log('\n🔐 ========== NEXTAUTH CONFIG LOADING ==========');
console.log('NextAuth Environment:');
console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Not set');
console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('  - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  - Session Strategy: JWT (no database adapter)');
console.log('  - Providers: Google, Credentials (Email/Password)');
console.log('===============================================\n');

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
        console.log('🔑 CredentialsProvider: Authorizing...', { email: credentials?.email });

        if (!credentials?.email || !credentials?.accessToken) {
          console.error('❌ CredentialsProvider: Missing email or access token');
          return null;
        }

        try {
          // Verify with Supabase
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('❌ CredentialsProvider: Missing Supabase environment variables');
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
            console.error('❌ CredentialsProvider: Invalid or expired access token');
            return null;
          }

          // Verify the token belongs to the claimed email
          if (supabaseUser.email !== credentials.email) {
            console.error('❌ CredentialsProvider: Token email mismatch');
            return null;
          }

          console.log('✅ CredentialsProvider: Supabase token verified for:', supabaseUser.email);

          // Get or create user in public.users table
          let { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name, image')
            .eq('email', credentials.email)
            .single();

          // If user doesn't exist in public.users, create them
          if (userError || !user) {
            console.log('👤 Creating user in public.users for:', credentials.email);
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
              console.error('❌ CredentialsProvider: Failed to create user:', createError);
              return null;
            }
            user = newUser;
          }

          console.log('✅ CredentialsProvider: User authenticated:', user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name || '',
            image: user.image || '',
          };
        } catch (error) {
          console.error('❌ CredentialsProvider: Authorization error:', error);
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
        console.log('🔑 JWT Callback: Initial sign in for', user.email);

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
              console.log('✅ Found existing user:', existingUser.id);
              userId = existingUser.id;
            } else {
              console.log('👤 Creating new user in users table...');
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
                console.log('✅ Created new user:', newUser.id);
                userId = newUser.id;
              } else if (createError) {
                console.error('❌ Error creating user:', createError);
              }
            }

            // 2. Upsert Profile if we have a userId
            if (userId) {
              // IMPORTANT: Use the database UUID as the token ID, not the Google ID
              token.id = userId;
              token.email = user.email;
              token.name = user.name || '';
              token.picture = user.image || '';

              console.log('👤 Upserting profile for user:', userId);
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
                console.error('❌ Error upserting profile:', profileError);
              } else {
                console.log('✅ Profile synced successfully');
              }
            } else {
              // Fallback to Google ID if DB sync failed (not ideal)
              token.id = user.id;
            }
          }
        } catch (err) {
          console.error('❌ Error in JWT callback:', err);
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
  debug: true,
};

