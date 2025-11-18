# TAILOR - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key from Settings > API
3. Go to Settings > API and copy your service_role key (keep it secret!)
4. **IMPORTANT**: Go to SQL Editor and run the **ENTIRE** `supabase/schema.sql` file
   - This creates NextAuth tables (users, accounts, sessions)
   - This creates application tables (profiles, documents, jobs, etc.)
   - If you already ran an old version, you may need to drop old tables first
5. ⚠️ **Skip** Authentication > Providers - we use NextAuth, not Supabase Auth

### 3. Get Google Credentials

**For OAuth (NextAuth with Google):**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local development)
   - `https://your-domain.com/api/auth/callback/google` (for production)
6. Copy Client ID and Client Secret

**For Gemini AI:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### 4. Configure Environment

Create `.env.local` in the project root:

```bash
# Supabase (from step 2)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NextAuth (REQUIRED for authentication)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here  # Generate with: openssl rand -base64 32

# Google OAuth (from step 3 - for NextAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Gemini AI (from step 3)
GEMINI_API_KEY=your_gemini_api_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output and use it as your `NEXTAUTH_SECRET`.

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 First Steps

1. **Sign In** - Click "Sign In with Google" on the landing page
2. **Upload Documents** - Go to Documents and upload your resume (PDF or DOCX)
3. **Generate Resume** - Go to Generate, paste a job description, and click Generate
4. **View Results** - Check My Resumes to see your tailored resume with ATS score
5. **Chat** - Try the Chat feature to refine your resume

## 🐛 Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Supabase Connection Issues
- Check your environment variables are correct
- Verify the Supabase project is not paused
- Check the redirect URLs match exactly

### Google OAuth Not Working
- Verify all NextAuth environment variables are set (NEXTAUTH_URL, NEXTAUTH_SECRET)
- Check Google Cloud Console redirect URIs match: `http://localhost:3000/api/auth/callback/google`
- Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check browser console and server logs for detailed error messages

### NextAuth Environment Variables Missing
If you see auth errors, check:
```bash
# Generate a NextAuth secret
openssl rand -base64 32

# Add to .env.local:
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste the generated secret here>
```

### Database Schema Issues
If tables are missing:
1. Go to Supabase SQL Editor
2. Drop existing tables if needed (be careful!):
   ```sql
   DROP TABLE IF EXISTS chat_messages, chat_threads, ats_scores, resume_versions, jobs, documents, profiles CASCADE;
   ```
3. Run the entire `supabase/schema.sql` file again

## 📚 Learn More

- [Full Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing](./CONTRIBUTING.md)
- [Project Summary](./PROJECT_SUMMARY.md)

## 💡 Tips

- Use Chrome/Edge for best compatibility
- Upload multiple versions of your resume for better results
- Be specific in job descriptions for better tailoring
- Check the ATS score and follow the suggestions

## 🆘 Need Help?

- Check the [Issues](https://github.com/MistaSnacks/TAILOR/issues)
- Read the documentation files
- Review the code comments

Happy tailoring! ✨

