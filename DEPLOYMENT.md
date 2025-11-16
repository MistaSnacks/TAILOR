# Deployment Guide

## Prerequisites

1. **Supabase Project**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase/schema.sql` in the SQL Editor
   - Enable Google OAuth in Authentication > Providers
   - Configure redirect URLs:
     - `http://localhost:3000/dashboard` (development)
     - `https://your-domain.vercel.app/dashboard` (production)

2. **Google AI API Key**
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Enable Gemini API access

3. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)

## Environment Variables

Create `.env.local` for local development:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini
GOOGLE_API_KEY=your_google_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Vercel Deployment

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Import repository in Vercel dashboard
3. Configure environment variables in project settings
4. Deploy

### Environment Variables in Vercel

Add all variables from `.env.local` to Vercel project settings:
- Settings > Environment Variables
- Add each variable for Production, Preview, and Development

## Post-Deployment

1. **Update Supabase Redirect URLs**
   - Add production URL to allowed redirect URLs
   - Format: `https://your-domain.vercel.app/dashboard`

2. **Test Authentication**
   - Sign in with Google
   - Verify profile creation

3. **Test File Upload**
   - Upload a test document
   - Check Supabase Storage bucket

4. **Test Resume Generation**
   - Create a job description
   - Generate a resume
   - Verify ATS scoring

## Monitoring

- **Vercel Analytics**: Automatically enabled
- **Supabase Logs**: Check in Supabase dashboard
- **Error Tracking**: Monitor Vercel function logs

## Troubleshooting

### Authentication Issues
- Verify Google OAuth is enabled in Supabase
- Check redirect URLs match exactly
- Ensure environment variables are set correctly

### File Upload Issues
- Verify storage bucket exists
- Check RLS policies are configured
- Ensure service role key has proper permissions

### Gemini API Issues
- Verify API key is valid
- Check API quota limits
- Review Gemini API error messages in logs

## Security Checklist

- [ ] Environment variables set in Vercel
- [ ] RLS policies enabled on all tables
- [ ] Storage policies configured correctly
- [ ] Service role key kept secret
- [ ] CORS configured if needed
- [ ] Rate limiting considered for API routes

