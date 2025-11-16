# TAILOR - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key from Settings > API
3. Go to SQL Editor and run the entire `supabase/schema.sql` file
4. Go to Authentication > Providers and enable Google OAuth
5. Add redirect URL: `http://localhost:3000/dashboard`

### 3. Get Google AI API Key

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

# Google AI (from step 3)
GOOGLE_API_KEY=your_google_api_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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
- Ensure Google OAuth is enabled in Supabase
- Check redirect URLs include your domain
- Verify API key is valid

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

