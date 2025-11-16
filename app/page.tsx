'use client';

import { useAuth } from '@/components/auth-provider';

export default function Home() {
  const { user, signIn } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <h1 className="font-display text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            T-AI-LOR
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
            Tailor your resume to every job in minutes — powered by AI
          </p>
          <div className="flex gap-4">
            {user ? (
              <a
                href="/dashboard"
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-slate-950 font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
              </a>
            ) : (
              <button
                onClick={signIn}
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-slate-950 font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign In with Google
              </button>
            )}
            <a
              href="#features"
              className="px-8 py-4 border border-primary/50 text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        <div id="features" className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="font-display text-xl font-semibold mb-2">Upload Documents</h3>
            <p className="text-muted-foreground">
              Upload your resume, LinkedIn profile, and career documents. We&apos;ll parse and index everything.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-display text-xl font-semibold mb-2">AI-Powered Tailoring</h3>
            <p className="text-muted-foreground">
              Paste a job description and let our AI generate an ATS-optimized resume tailored to the role.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-display text-xl font-semibold mb-2">Chat & Refine</h3>
            <p className="text-muted-foreground">
              Chat with your documents to refine bullets, get insights, and perfect your resume.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

