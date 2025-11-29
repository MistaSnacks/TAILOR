'use client';

import { useState } from 'react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { motion } from 'framer-motion';
import { Sparkles, Briefcase, Building2, FileText, LayoutTemplate } from 'lucide-react';

export default function GeneratePage() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [template, setTemplate] = useState<'modern' | 'classic' | 'technical'>('modern');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      // Create job record
      const jobResponse = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          company,
          description: jobDescription,
        }),
      });

      if (!jobResponse.ok) {
        const jobError = await jobResponse.json().catch(() => ({}));
        throw new Error(jobError.error || 'Failed to create job');
      }

      const { job } = await jobResponse.json();

      // Generate resume
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          template,
        }),
      });

      if (!generateResponse.ok) {
        const generateError = await generateResponse.json().catch(() => ({}));
        console.error('Generate API error:', generateError);
        throw new Error(generateError.error || 'Failed to generate resume');
      }

      const { resumeVersion } = await generateResponse.json();

      // Redirect to resumes page
      window.location.href = `/dashboard/resumes?id=${resumeVersion.id}`;
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(error.message || 'Failed to generate resume');
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <TailorLoading mode="generate" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold font-display">Generate Resume</h1>
          <p className="text-muted-foreground">
            Create a tailored resume for a specific job application.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column - Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="glass-card p-6 rounded-xl space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="e.g. Google"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Job Description *
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary min-h-[200px] transition-all"
                  placeholder="Paste the full job description here..."
                  required
                />
              </div>
            </div>

            <div className="glass-card p-6 rounded-xl">
              <label className="block text-sm font-medium mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                Select Template
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['modern', 'classic', 'technical'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemplate(t)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${template === t
                      ? 'border-primary bg-primary/10 shadow-md scale-105'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                  >
                    <div className="font-semibold capitalize">{t}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              Generate Tailored Resume
            </button>
          </form>
        </motion.div>

        {/* Right column - Preview/Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl border border-border p-6 h-fit sticky top-8"
        >
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-8 bg-primary rounded-full" />
            AI Analysis Preview
          </h3>
          <div className="text-muted-foreground">
            {jobDescription ? (
              <div className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="text-sm font-medium mb-2 text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Analyzing job requirements...
                  </div>
                  <p className="text-xs leading-relaxed">
                    Our AI is reading the job description to identify key skills, qualifications, and keywords.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="h-2 bg-muted rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-muted rounded-full w-1/2 animate-pulse" />
                  <div className="h-2 bg-muted rounded-full w-5/6 animate-pulse" />
                </div>

                <div className="text-xs text-center pt-4 border-t border-border/50">
                  Ready to tailor your resume for this role.
                </div>
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-foreground mb-1">Waiting for job description</p>
                <p className="text-sm">Paste the job description to see how we analyze it.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

