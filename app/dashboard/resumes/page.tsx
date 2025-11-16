'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResumesContent() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes');
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-6">My Resumes</h1>

      {resumes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="font-display text-xl font-semibold mb-2">
            No resumes yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Generate your first tailored resume
          </p>
          <a
            href="/dashboard/generate"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-secondary text-slate-950 font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Generate Resume
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className={`p-6 rounded-lg bg-card border-2 transition-colors ${
                highlightId === resume.id
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {resume.job?.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {resume.job?.company || 'No company'}
                  </p>
                </div>
                {resume.ats_score && (
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-primary">
                      {resume.ats_score.score}
                    </div>
                    <div className="text-xs text-muted-foreground">ATS</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary">
                  {resume.template}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(resume.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm">
                  View
                </button>
                <button className="flex-1 px-4 py-2 bg-secondary/10 text-secondary rounded hover:bg-secondary/20 transition-colors text-sm">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResumesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="text-muted-foreground">Loading...</div></div>}>
      <ResumesContent />
    </Suspense>
  );
}

