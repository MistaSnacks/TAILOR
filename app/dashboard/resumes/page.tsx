'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Trash2 } from 'lucide-react';
import { normalizeResumeContent, type ResumeContent } from '@/lib/resume-content';

type ExperienceEntry = NonNullable<ResumeContent['experience']>[number];
type EducationEntry = NonNullable<ResumeContent['education']>[number];
type CertificationEntry = NonNullable<ResumeContent['certifications']>[number];
type ExperienceTextField = Exclude<keyof ExperienceEntry, 'bullets'>;

function ResumesContent() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewingResume, setViewingResume] = useState<any | null>(null);
  const [editedContent, setEditedContent] = useState<ResumeContent | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'keywords'>('preview');
  const [savingResume, setSavingResume] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  useEffect(() => {
    fetchResumes();
  }, []);

  const normalizedViewingContent = useMemo(
    () => (viewingResume ? normalizeResumeContent(viewingResume.content) : null),
    [viewingResume]
  );

  useEffect(() => {
    if (normalizedViewingContent) {
      setEditedContent(normalizedViewingContent);
    } else {
      setEditedContent(null);
    }
  }, [normalizedViewingContent]);

  const keywordSuggestions = useMemo(() => {
    const analysis = viewingResume?.ats_score?.analysis;
    if (!analysis) return [];
    const missing =
      analysis.missingKeywords ||
      analysis.missing_keywords ||
      analysis.missing_terms ||
      [];
    return Array.isArray(missing) ? missing : [];
  }, [viewingResume]);

  const atsAnalysis = useMemo(
    () => viewingResume?.ats_score?.analysis || null,
    [viewingResume]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!normalizedViewingContent || !editedContent) return false;
    return (
      JSON.stringify(normalizedViewingContent) !== JSON.stringify(editedContent)
    );
  }, [normalizedViewingContent, editedContent]);

  const fetchResumes = async () => {
    try {
      setError(null);
      const response = await fetch('/api/resumes');
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
      } else {
        setError('Failed to fetch resumes');
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      setError('Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resumeId: string) => {
    try {
      setDownloading(resumeId);
      setError(null);
      console.log('📥 Downloading resume:', resumeId);

      const response = await fetch(`/api/resumes/${resumeId}/download`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'resume.docx';

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Resume downloaded');
    } catch (error) {
      console.error('❌ Download error:', error);
      setError('Failed to download resume');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (resumeId: string, jobTitle?: string) => {
    const confirmMessage = jobTitle
      ? `Delete resume for "${jobTitle}"? This action cannot be undone.`
      : 'Delete this resume? This action cannot be undone.';

    if (!confirm(confirmMessage)) return;

    try {
      setDeleting(resumeId);
      setError(null);
      console.log('🗑️  Deleting resume:', resumeId);

      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      console.log('✅ Resume deleted successfully');
      // Remove from local state
      setResumes(resumes.filter(r => r.id !== resumeId));
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      setError(error.message || 'Failed to delete resume');
    } finally {
      setDeleting(null);
    }
  };

  const handleView = async (resume: any) => {
    setActiveTab('preview');
    setViewingResume(resume);
    setViewingLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${resume.id}`);
      if (response.ok) {
        const data = await response.json();
        setViewingResume(data.resume);
        setResumes((prev) =>
          prev.map((item) => (item.id === data.resume.id ? data.resume : item))
        );
      }
    } catch (err) {
      console.error('❌ Failed to load resume detail:', err);
    } finally {
      setViewingLoading(false);
    }
  };

  const closeModal = () => {
    setViewingResume(null);
    setEditedContent(null);
    setActiveTab('preview');
    setViewingLoading(false);
    setSuccessMessage(null);
  };

  const resetEdits = () => {
    if (normalizedViewingContent) {
      setEditedContent(normalizedViewingContent);
    }
  };

  const handleExperienceChange = (
    index: number,
    field: ExperienceTextField,
    value: string
  ) => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      const experience = [...(prev.experience || [])];
      experience[index] = {
        ...experience[index],
        [field]: value,
      };
      return { ...prev, experience };
    });
  };

  const handleExperienceBulletsChange = (index: number, value: string) => {
    const bullets = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    setEditedContent((prev) => {
      if (!prev) return prev;
      const experience = [...(prev.experience || [])];
      experience[index] = {
        ...experience[index],
        bullets,
      };
      return { ...prev, experience };
    });
  };

  const addExperience = () => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        experience: [
          ...(prev.experience || []),
          {
            title: '',
            company: '',
            location: '',
            startDate: '',
            endDate: '',
            bullets: [],
          },
        ],
      };
    });
  };

  const removeExperience = (index: number) => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      const experience = [...(prev.experience || [])];
      experience.splice(index, 1);
      return { ...prev, experience };
    });
  };

  const handleEducationChange = (
    index: number,
    field: keyof EducationEntry,
    value: string
  ) => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      const education = [...(prev.education || [])];
      education[index] = {
        ...education[index],
        [field]: value,
      };
      return { ...prev, education };
    });
  };

  const addEducation = () => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        education: [
          ...(prev.education || []),
          {
            degree: '',
            school: '',
            year: '',
            gpa: '',
          },
        ],
      };
    });
  };

  const removeEducation = (index: number) => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      const education = [...(prev.education || [])];
      education.splice(index, 1);
      return { ...prev, education };
    });
  };

  const handleCertificationChange = (
    index: number,
    field: keyof CertificationEntry,
    value: string
  ) => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      const certifications = [...(prev.certifications || [])];
      certifications[index] = {
        ...certifications[index],
        [field]: value,
      };
      return { ...prev, certifications };
    });
  };

  const addCertification = () => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        certifications: [
          ...(prev.certifications || []),
          {
            name: '',
            issuer: '',
            date: '',
          },
        ],
      };
    });
  };

  const removeCertification = (index: number) => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      const certifications = [...(prev.certifications || [])];
      certifications.splice(index, 1);
      return { ...prev, certifications };
    });
  };

  const updateSkillsFromText = (value: string) => {
    const skills = value
      .split(/[,•\n]/)
      .map((skill) => skill.trim())
      .filter(Boolean);
    setEditedContent((prev) => (prev ? { ...prev, skills } : prev));
  };

  const handleKeywordApply = (keyword: string, target: 'summary' | 'skills') => {
    setEditedContent((prev) => {
      if (!prev) return prev;
      if (target === 'summary') {
        const summary = prev.summary || '';
        if (summary.includes(keyword)) return prev;
        return {
          ...prev,
          summary: summary ? `${summary} ${keyword}` : keyword,
        };
      }

      const skillsSet = new Set(prev.skills || []);
      skillsSet.add(keyword);
      return {
        ...prev,
        skills: Array.from(skillsSet),
      };
    });
    setActiveTab('edit');
  };

  const handleSaveEdits = async () => {
    if (!viewingResume || !editedContent) return;
    setSavingResume(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${viewingResume.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedContent,
          recalculateAts: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      const data = await response.json();
      setViewingResume(data.resume);
      setResumes((prev) =>
        prev.map((item) => (item.id === data.resume.id ? data.resume : item))
      );
      setSuccessMessage('Resume updated and ATS rescored.');
      setActiveTab('preview');
    } catch (err: any) {
      console.error('❌ Save error:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSavingResume(false);
    }
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

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
              className={`p-6 rounded-lg bg-card border-2 transition-colors ${highlightId === resume.id
                ? 'border-primary'
                : 'border-border hover:border-primary/50'
                }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-2">
                  <h3 className="font-display text-lg font-semibold">
                    {resume.job?.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {resume.job?.company || 'No company'}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  {resume.ats_score && (
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-primary">
                        {resume.ats_score.score}
                      </div>
                      <div className="text-xs text-muted-foreground">ATS</div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(resume.id, resume.job?.title)}
                    disabled={deleting === resume.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
                <button
                  className="flex-1 px-4 py-2 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm"
                  onClick={() => handleView(resume)}
                >
                  View
                </button>
                <button
                  onClick={() => handleDownload(resume.id)}
                  disabled={downloading === resume.id}
                  className="flex-1 px-4 py-2 bg-secondary/10 text-secondary rounded hover:bg-secondary/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading === resume.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingResume && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {viewingResume.job?.title || 'Resume'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewingResume.job?.company || 'No company'} • {viewingResume.template}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                {(['preview', 'edit', 'keywords'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab
                        ? 'bg-primary text-slate-950'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {tab === 'preview' && 'Preview'}
                    {tab === 'edit' && 'Edit'}
                    {tab === 'keywords' && 'Keywords'}
                  </button>
                ))}
              </div>

              {successMessage && (
                <div className="p-3 rounded border border-emerald-400/40 bg-emerald-500/10 text-sm text-emerald-200">
                  {successMessage}
                </div>
              )}

              {viewingLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading resume details...
                </div>
              ) : (
                <>
                  {activeTab === 'preview' && (
                    <div className="space-y-6">
                      {viewingResume.ats_score && (
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-4">
                          <div className="flex flex-wrap items-center gap-4">
                            <div>
                              <div className="text-3xl font-bold text-primary">
                                {viewingResume.ats_score.score}
                              </div>
                              <div className="text-xs text-muted-foreground">Overall ATS</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-primary">
                                {viewingResume.ats_score.keyword_match}%
                              </div>
                              <div className="text-xs text-muted-foreground">Keyword Match</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-primary">
                                {viewingResume.ats_score.semantic_similarity}%
                              </div>
                              <div className="text-xs text-muted-foreground">Semantic Fit</div>
                            </div>
                          </div>
                          {atsAnalysis?.strengths && (
                            <div className="text-sm">
                              <p className="font-semibold">Strengths</p>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {atsAnalysis.strengths.map((item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {atsAnalysis?.improvements && (
                            <div className="text-sm">
                              <p className="font-semibold">Improvements</p>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {atsAnalysis.improvements.map((item: string, idx: number) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        {editedContent?.contact?.name && (
                          <div>
                            <h3 className="text-xl font-display font-semibold">
                              {editedContent.contact.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {[editedContent.contact.email, editedContent.contact.phone, editedContent.contact.location]
                                .filter(Boolean)
                                .join(' • ')}
                            </p>
                          </div>
                        )}

                        {editedContent?.summary && (
                          <section className="space-y-2">
                            <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                              SUMMARY
                            </h4>
                            <p className="text-sm leading-relaxed">{editedContent.summary}</p>
                          </section>
                        )}

                        {editedContent?.experience && editedContent.experience.length > 0 && (
                          <section className="space-y-3">
                            <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                              EXPERIENCE
                            </h4>
                            {editedContent.experience.map((exp, idx) => (
                              <div key={idx} className="text-sm space-y-1 border-b border-border/50 pb-3 last:border-0">
                                <p className="font-semibold">
                                  {exp.title} • <span className="text-muted-foreground">{exp.company}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {[exp.startDate, exp.endDate].filter(Boolean).join(' - ')} {exp.location && `• ${exp.location}`}
                                </p>
                                {exp.bullets && exp.bullets.length > 0 && (
                                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                    {exp.bullets.map((bullet, bulletIdx) => (
                                      <li key={bulletIdx}>{bullet}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </section>
                        )}

                        {editedContent?.skills && editedContent.skills.length > 0 && (
                          <section className="space-y-2">
                            <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                              SKILLS
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {editedContent.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {editedContent?.education && editedContent.education.length > 0 && (
                          <section className="space-y-2">
                            <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                              EDUCATION
                            </h4>
                            {editedContent.education.map((edu, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-semibold">{edu.degree}</p>
                                <p className="text-muted-foreground">
                                  {edu.school} {edu.year && `• ${edu.year}`} {edu.gpa && `• GPA ${edu.gpa}`}
                                </p>
                              </div>
                            ))}
                          </section>
                        )}

                        {editedContent?.certifications && editedContent.certifications.length > 0 && (
                          <section className="space-y-2">
                            <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                              CERTIFICATIONS
                            </h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {editedContent.certifications.map((cert, idx) => (
                                <li key={idx}>
                                  {[cert.name, cert.issuer, cert.date].filter(Boolean).join(' • ')}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </div>

                      <div className="pt-4 border-t border-border text-xs text-muted-foreground">
                        Last updated: {new Date(viewingResume.updated_at || viewingResume.created_at).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {activeTab === 'edit' && (
                    <div className="space-y-6">
                      {!editedContent ? (
                        <div className="text-sm text-muted-foreground">No resume content available.</div>
                      ) : (
                        <>
                          <section className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-display text-lg font-semibold">Summary</h3>
                              {hasUnsavedChanges && (
                                <span className="text-xs text-primary">Unsaved changes</span>
                              )}
                            </div>
                            <textarea
                              className="w-full rounded border border-border bg-background px-3 py-2 text-sm min-h-[120px]"
                              value={editedContent.summary || ''}
                              onChange={(e) =>
                                setEditedContent((prev) => (prev ? { ...prev, summary: e.target.value } : prev))
                              }
                              placeholder="Professional summary"
                            />
                          </section>

                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-display text-lg font-semibold">Experience</h3>
                              <button
                                onClick={addExperience}
                                className="text-sm px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                              >
                                Add role
                              </button>
                            </div>

                            {(editedContent.experience || []).map((exp, idx) => (
                              <div key={idx} className="space-y-3 rounded-lg border border-border p-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-muted-foreground">Role {idx + 1}</span>
                                  <button
                                    onClick={() => removeExperience(idx)}
                                    className="text-xs text-destructive hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid md:grid-cols-2 gap-3">
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="Job Title"
                                    value={exp.title}
                                    onChange={(e) => handleExperienceChange(idx, 'title', e.target.value)}
                                  />
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="Company"
                                    value={exp.company}
                                    onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)}
                                  />
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="Location"
                                    value={exp.location}
                                    onChange={(e) => handleExperienceChange(idx, 'location', e.target.value)}
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      className="rounded border border-border bg-background px-3 py-2 text-sm"
                                      placeholder="Start"
                                      value={exp.startDate}
                                      onChange={(e) => handleExperienceChange(idx, 'startDate', e.target.value)}
                                    />
                                    <input
                                      className="rounded border border-border bg-background px-3 py-2 text-sm"
                                      placeholder="End"
                                      value={exp.endDate}
                                      onChange={(e) => handleExperienceChange(idx, 'endDate', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <textarea
                                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm min-h-[120px]"
                                  placeholder="One bullet per line"
                                  value={(exp.bullets || []).join('\n')}
                                  onChange={(e) => handleExperienceBulletsChange(idx, e.target.value)}
                                />
                              </div>
                            ))}
                          </section>

                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-display text-lg font-semibold">Skills</h3>
                              <span className="text-xs text-muted-foreground">
                                Separate with commas or new lines
                              </span>
                            </div>
                            <textarea
                              className="w-full rounded border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                              value={(editedContent.skills || []).join(', ')}
                              onChange={(e) => updateSkillsFromText(e.target.value)}
                            />
                          </section>

                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-display text-lg font-semibold">Education</h3>
                              <button
                                onClick={addEducation}
                                className="text-sm px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                              >
                                Add school
                              </button>
                            </div>

                            {(editedContent.education || []).map((edu, idx) => (
                              <div key={idx} className="space-y-3 rounded-lg border border-border p-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-muted-foreground">School {idx + 1}</span>
                                  <button
                                    onClick={() => removeEducation(idx)}
                                    className="text-xs text-destructive hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <input
                                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                                  placeholder="Degree"
                                  value={edu.degree}
                                  onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                                />
                                <input
                                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                                  placeholder="School"
                                  value={edu.school}
                                  onChange={(e) => handleEducationChange(idx, 'school', e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="Year"
                                    value={edu.year}
                                    onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                                  />
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="GPA"
                                    value={edu.gpa}
                                    onChange={(e) => handleEducationChange(idx, 'gpa', e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </section>

                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-display text-lg font-semibold">Certifications</h3>
                              <button
                                onClick={addCertification}
                                className="text-sm px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                              >
                                Add certification
                              </button>
                            </div>

                            {(editedContent.certifications || []).map((cert, idx) => (
                              <div key={idx} className="space-y-3 rounded-lg border border-border p-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-muted-foreground">Certification {idx + 1}</span>
                                  <button
                                    onClick={() => removeCertification(idx)}
                                    className="text-xs text-destructive hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <input
                                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                                  placeholder="Name"
                                  value={cert.name}
                                  onChange={(e) => handleCertificationChange(idx, 'name', e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="Issuer"
                                    value={cert.issuer}
                                    onChange={(e) => handleCertificationChange(idx, 'issuer', e.target.value)}
                                  />
                                  <input
                                    className="rounded border border-border bg-background px-3 py-2 text-sm"
                                    placeholder="Date"
                                    value={cert.date}
                                    onChange={(e) => handleCertificationChange(idx, 'date', e.target.value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </section>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'keywords' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-lg font-semibold mb-2">Keyword Suggestions</h3>
                        <p className="text-sm text-muted-foreground">
                          Click a keyword to add it to your summary or skills section. These suggestions come from the latest ATS analysis.
                        </p>
                      </div>

                      {keywordSuggestions.length === 0 ? (
                        <div className="p-4 rounded border border-border text-sm text-muted-foreground">
                          No missing keywords were detected for this resume. Great job!
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {keywordSuggestions.map((keyword) => (
                            <div
                              key={keyword}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                            >
                              <span className="font-medium">{keyword}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleKeywordApply(keyword, 'summary')}
                                  className="px-3 py-1 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20"
                                >
                                  Add to Summary
                                </button>
                                <button
                                  onClick={() => handleKeywordApply(keyword, 'skills')}
                                  className="px-3 py-1 text-xs rounded bg-secondary/10 text-secondary hover:bg-secondary/20"
                                >
                                  Add to Skills
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {atsAnalysis?.matchedKeywords && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">Already Covered</h4>
                          <div className="flex flex-wrap gap-2">
                            {atsAnalysis.matchedKeywords.map((keyword: string) => (
                              <span key={keyword} className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col gap-3 p-6 border-t border-border">
              <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Created: {new Date(viewingResume.created_at).toLocaleString()}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-primary font-semibold">You have unsaved changes</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {activeTab === 'edit' && (
                  <>
                    <button
                      onClick={resetEdits}
                      disabled={!hasUnsavedChanges || savingResume}
                      className="px-4 py-2 rounded bg-muted text-sm hover:bg-muted/80 disabled:opacity-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSaveEdits}
                      disabled={!hasUnsavedChanges || savingResume}
                      className="px-4 py-2 rounded bg-primary text-slate-950 text-sm font-semibold disabled:opacity-50"
                    >
                      {savingResume ? 'Saving...' : 'Save changes'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDownload(viewingResume.id)}
                  disabled={downloading === viewingResume.id}
                  className="px-4 py-2 rounded bg-secondary/10 text-secondary text-sm hover:bg-secondary/20 transition-colors disabled:opacity-50"
                >
                  {downloading === viewingResume.id ? 'Downloading...' : 'Download'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded bg-muted text-sm hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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

