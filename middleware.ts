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
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/',
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*'],
};
