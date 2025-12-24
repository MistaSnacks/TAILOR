import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Log environment variables on middleware load (server-side, shows in terminal)
console.log('\n🔐 ========== MIDDLEWARE LOADED ==========');
console.log('NextAuth URL:', process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing');
console.log('NextAuth Secret:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('==========================================\n');


export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();

    // Capture invite code for legacy user invites
    const inviteCode = req.nextUrl.searchParams.get('invite');
    if (inviteCode) {
      response.cookies.set('invite_code', inviteCode, {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Capture referral code for bonus generations
    const refCode = req.nextUrl.searchParams.get('ref');
    if (refCode) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🎁 [MIDDLEWARE] Captured referral code:', refCode);
      }
      response.cookies.set('referral_code', refCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: false, // Allow client-side access for localStorage sync
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    return response;
  },

  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to home page
        if (!req.nextUrl.pathname.startsWith('/dashboard')) {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: '/',
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/'],
};
