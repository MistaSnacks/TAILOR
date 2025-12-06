# 🔐 Authentication Fix Checklist

## Issue Summary
Your app is using **NextAuth with Google OAuth** + **Supabase Adapter**, but was missing:
1. NextAuth environment variables (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`)
2. NextAuth database tables (users, accounts, sessions)
3. Correct Google OAuth redirect URIs

## ✅ Step-by-Step Fix

### 1. Generate NextAuth Secret
```bash
openssl rand -base64 32
```
Copy the output - you'll need it for step 2.

### 2. Update Your `.env.local` File
Make sure your `.env.local` includes ALL of these:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth (CRITICAL!)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste the secret you generated in step 1>

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Update Google Cloud Console Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services > Credentials
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/api/auth/callback/google`
   - Remove any old Supabase redirect URIs (not needed)
5. Click **Save**

### 4. Update Your Supabase Database Schema

**Option A: Fresh Database (Recommended if no important data)**
1. Go to Supabase SQL Editor
2. Run this to drop old tables:
   ```sql
   DROP TABLE IF EXISTS chat_messages, chat_threads, ats_scores, resume_versions, jobs, documents, profiles CASCADE;
   ```
3. Copy and run the **ENTIRE** `supabase/schema.sql` file

**Option B: Keep Existing Data (More Complex)**
1. Go to Supabase SQL Editor
2. Run just the NextAuth tables section from `supabase/schema.sql` (lines 5-61)
3. You may need to manually update foreign key references

### 5. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### 6. Test Authentication

1. Open http://localhost:3000
2. Click "Sign In"
3. Check the console logs for:
   ```
   🔐 ========== NEXTAUTH CONFIG LOADING ==========
   NextAuth Environment:
     - NEXTAUTH_URL: http://localhost:3000
     - NEXTAUTH_SECRET: ✅ Set
     - GOOGLE_CLIENT_ID: ✅ Set
     - GOOGLE_CLIENT_SECRET: ✅ Set
   ```
4. Try signing in with Google
5. You should be redirected to Google, then back to `/dashboard`

## 🐛 Troubleshooting

### If you see "Missing environment variables"
- Double-check your `.env.local` file exists in the project root
- Restart the dev server after adding/changing env vars
- Make sure you generated `NEXTAUTH_SECRET`

### If Google OAuth fails
- Check Google Cloud Console redirect URIs are correct
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Look for error messages in the browser console and terminal

### If you see database errors
- Check that all NextAuth tables were created (users, accounts, sessions, verification_tokens)
- Run the updated schema.sql file
- Check Supabase logs for detailed error messages

### If sign-in succeeds but user stays null
- Check that the `users`, `accounts`, and `sessions` tables were created
- Look for NextAuth callback logs in the terminal
- Check if a session was created in the `sessions` table

## 📊 What to Look For in Logs

### Good Signs ✅
```
🔐 ========== NEXTAUTH CONFIG LOADING ==========
  - NEXTAUTH_SECRET: ✅ Set
  - GOOGLE_CLIENT_ID: ✅ Set
✅ NextAuth Sign In Event: { userId: '...', provider: 'google' }
🔄 NextAuth Session Event: { hasUser: true }
```

### Bad Signs ❌
```
❌ Missing required environment variable: NEXTAUTH_SECRET
❌ Missing required environment variable: GOOGLE_CLIENT_ID
🔐 Auth Status: { status: 'unauthenticated', hasSession: false }
```

## 📝 Notes

- **NextAuth** handles authentication (Google OAuth)
- **Supabase** stores user data and sessions (via NextAuth adapter)
- **RLS policies are currently disabled** - authorization is handled in API routes
- The app does **NOT** use native Supabase Auth (no need to configure it in Supabase dashboard)

## 🆘 Still Having Issues?

Check these files for detailed logging:
- `lib/auth.ts` - NextAuth configuration
- `lib/env-logger.ts` - Environment variable validation
- `app/api/env-check/route.ts` - Server-side env check
- Browser console (F12) - Client-side logs
- Terminal - Server-side logs

All environment variables are now logged on startup to help debug!






