'use client';

import { useState } from 'react';

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
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-6">Generate Resume</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column - Form */}
        <div>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Senior Software Engineer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Google"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Job Description *
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary min-h-[300px]"
                placeholder="Paste the full job description here..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Template
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['modern', 'classic', 'technical'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemplate(t)}
                    className={`p-4 rounded-lg border-2 transition-colors ${template === t
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
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
              className="w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-slate-950 font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Resume'}
            </button>
          </form>
        </div>

        {/* Right column - Preview */}
        <div className="rounded-lg bg-card border border-border p-6">
          <h3 className="font-display text-xl font-semibold mb-4">Preview</h3>
          <div className="text-muted-foreground">
            {jobDescription ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-1">Analyzing job description...</div>
                  <div className="text-xs">
                    We&apos;ll extract key requirements and match them with your experience
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                Enter a job description to see analysis
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

