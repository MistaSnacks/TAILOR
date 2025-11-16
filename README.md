# TAILOR - AI-Powered Resume Tailoring

Tailor your resume to every job in minutes — powered by AI.

## Features

- 📄 **Document Upload**: Upload resumes, LinkedIn exports, and career documents
- 🎯 **AI-Powered Tailoring**: Generate ATS-optimized resumes tailored to job descriptions
- 💬 **Chat Interface**: Conversational refinement of resume content
- 📊 **ATS Scoring**: Real-time compatibility scoring with job descriptions
- ✏️ **Inline Editing**: AI-assisted bullet point rewriting

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS
- **Backend**: Vercel Server Actions, API Routes
- **Database**: Supabase (Postgres + pgvector)
- **Storage**: Supabase Storage
- **AI**: Google Gemini 2.0 Flash with File Search
- **Parsing**: mammoth (DOCX), pdf-parse (PDF), Tesseract (OCR)
- **Auth**: Supabase Auth (Google OAuth)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MistaSnacks/TAILOR.git
cd TAILOR
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Fill in your Supabase and Google AI credentials in `.env.local`.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
/app
  /page.tsx                 → Landing page
  /layout.tsx               → Root layout
  /globals.css              → Global styles
  /dashboard
    /profile/page.tsx       → User profile
    /documents/page.tsx     → Document management
    /generate/page.tsx      → Resume generation
    /resumes/page.tsx       → Resume versions
    /chat/page.tsx          → Chat interface
  /api
    /upload/route.ts        → File upload handler
    /jobs/route.ts          → Job description CRUD
    /generate/route.ts      → Resume generation
    /chat/route.ts          → Chat API

/lib
  /supabase.ts              → Supabase client & types
  /gemini.ts                → Gemini AI utilities
  /parse.ts                 → Document parsing
  /templates                → Resume templates
```

## Database Schema

See `supabase/schema.sql` for the complete database schema including:
- `profiles` - User profiles with Gemini store references
- `documents` - Uploaded documents with parsing status
- `jobs` - Job descriptions
- `resume_versions` - Generated resume versions
- `ats_scores` - ATS compatibility scores
- `chat_threads` & `chat_messages` - Conversation history

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Make sure to set all environment variables in your Vercel project settings.

## License

MIT

