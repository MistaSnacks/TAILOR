import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Log NextAuth configuration on load (REMOVE IN PRODUCTION)
console.log('\n🔐 ========== NEXTAUTH CONFIG LOADING ==========');
console.log('NextAuth Environment:');
console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Not set');
console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('  - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  - Session Strategy: JWT (no database adapter)');
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
  ],
  
  // JWT session strategy (no database required)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log('🔑 JWT Callback:', { 
        hasToken: !!token, 
        hasUser: !!user, 
        hasAccount: !!account 
      });
      
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email ?? '';
        token.name = user.name ?? '';
        token.picture = user.image ?? '';
      }
      
      return token;
    },
    
    async session({ session, token }) {
      console.log('🔄 Session Callback:', { 
        hasSession: !!session, 
        hasToken: !!token,
        tokenId: token.id 
      });
      
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
  
  events: {
    async signIn({ user, account, profile }) {
      console.log('✅ NextAuth Sign In Event:', { 
        userId: user.id, 
        email: user.email,
        provider: account?.provider 
      });
      
      // Optional: Save user to Supabase profiles table
      try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          
          // Upsert user profile
          const { error } = await supabase.from('profiles').upsert({
            email: user.email,
            full_name: user.name,
          }, {
            onConflict: 'email'
          });
          
          if (error) {
            console.error('❌ Failed to save user profile:', error);
          } else {
            console.log('✅ User profile saved to Supabase');
          }
        }
      } catch (error) {
        console.error('❌ Error saving user profile:', error);
      }
    },
    
    async signOut({ token }) {
      console.log('👋 NextAuth Sign Out Event:', { userId: token?.id });
    },
  },
};

