'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Trash2, FileText, Download, Edit, CheckCircle, FolderPlus, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Sparkles, ArrowRight } from 'lucide-react';
import { normalizeResumeContent, type ResumeContent } from '@/lib/resume-content';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { TemplatePreview } from '@/components/resume-templates';
import type { TemplateType } from '@/components/resume-templates';
import { motion, AnimatePresence } from 'framer-motion';

type ExperienceEntry = NonNullable<ResumeContent['experience']>[number];
type EducationEntry = NonNullable<ResumeContent['education']>[number];
type CertificationEntry = NonNullable<ResumeContent['certifications']>[number];
type ExperienceTextField = Exclude<keyof ExperienceEntry, 'bullets'>;
type DownloadFormat = 'docx' | 'pdf';

// Download dropdown component
function DownloadDropdown({ 
  resumeId, 
  downloading, 
  onDownload,
  variant = 'icon'
}: { 
  resumeId: string;
  downloading: string | null;
  onDownload: (id: string, format: DownloadFormat) => void;
  variant?: 'icon' | 'button';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isDownloading = downloading === resumeId;

  if (variant === 'icon') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isDownloading}
          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors flex items-center gap-0.5"
          title="Download"
        >
          {isDownloading ? (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden min-w-[120px]"
            >
              <button
                onClick={() => {
                  onDownload(resumeId, 'docx');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                DOCX
              </button>
              <button
                onClick={() => {
                  onDownload(resumeId, 'pdf');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-red-500" />
                PDF
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
        className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors flex items-center gap-2"
      >
        {isDownloading ? (
          <>
            <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="hidden sm:inline">Downloading...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 bottom-full mb-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]"
          >
            <button
              onClick={() => {
                onDownload(resumeId, 'docx');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              Download DOCX
            </button>
            <button
              onClick={() => {
                onDownload(resumeId, 'pdf');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Download PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Small progress bar component for individual ATS metrics
function AtsMetricBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-muted-foreground truncate">{label}</span>
          <span className={`text-xs font-medium ${getTextColor(value)}`}>{value}%</span>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${getColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground/60 w-8 text-right">{weight}%</span>
    </div>
  );
}


function ResumesContent() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [addingToDocs, setAddingToDocs] = useState<string | null>(null);
  const [viewingResume, setViewingResume] = useState<any | null>(null);
  const [editedContent, setEditedContent] = useState<ResumeContent | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'keywords' | 'ai-changes'>('preview');
  const [savingResume, setSavingResume] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mobileModalView, setMobileModalView] = useState<'preview' | 'details'>('preview');
  const [previewScale, setPreviewScale] = useState(0.72);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');
  const isMountedRef = useRef(true);
  const activePollsRef = useRef<Map<string, AbortController>>(new Map());

  // Zoom controls
  const zoomIn = () => setPreviewScale(s => Math.min(s + 0.1, 1.0));
  const zoomOut = () => setPreviewScale(s => Math.max(s - 0.1, 0.3));
  const resetZoom = () => setPreviewScale(0.72);

  useEffect(() => {
    fetchResumes();
    return () => {
      isMountedRef.current = false;
      activePollsRef.current.forEach((controller) => controller.abort());
      activePollsRef.current.clear();
    };
  }, []);

  const normalizedViewingContent = useMemo(
    () => (viewingResume ? normalizeResumeContent(viewingResume.content) : null),
    [viewingResume]
  );

  useEffect(() => {
    console.log('[DEBUG] Viewing resume state update (NO $):', {
      hasViewingResume: !!viewingResume,
      hasContent: !!viewingResume?.content,
      hasNormalizedContent: !!normalizedViewingContent,
      viewingResumeId: viewingResume?.id,
    });
    
    if (normalizedViewingContent) {
      setEditedContent(normalizedViewingContent);
      console.log('[DEBUG] Set editedContent from normalizedViewingContent (NO $)');
    } else {
      setEditedContent(null);
      console.log('[DEBUG] Cleared editedContent - normalizedViewingContent is null (NO $)');
    }
  }, [normalizedViewingContent, viewingResume]);

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

  // Extract AI changes from quality pass metadata
  const aiChanges = useMemo(() => {
    const qualityPass = viewingResume?.content?.qualityPass;
    if (!qualityPass?.aiChanges) return [];
    return qualityPass.aiChanges;
  }, [viewingResume]);

  const aiChangesStats = useMemo(() => {
    const qualityPass = viewingResume?.content?.qualityPass;
    return {
      bulletsRewritten: qualityPass?.bulletsRewritten || 0,
      summaryChanged: qualityPass?.summaryChanged || false,
      skillsChanged: qualityPass?.skillsChanged || false,
      keywordsAdded: qualityPass?.jdKeywordsAdded?.length || 0,
    };
  }, [viewingResume]);

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
    } catch (error: unknown) {
      setError('Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resumeId: string, format: DownloadFormat = 'docx') => {
    try {
      setDownloading(resumeId);
      setError(null);

      const url = format === 'pdf' 
        ? `/api/resumes/${resumeId}/download/pdf`
        : `/api/resumes/${resumeId}/download`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `resume.${format}`;

      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error: unknown) {
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

      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      // Remove from local state
      setResumes(resumes.filter(r => r.id !== resumeId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete resume';
      setError(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleAddToDocs = async (resumeId: string, jobTitle?: string) => {
    try {
      setAddingToDocs(resumeId);
      setError(null);

      const response = await fetch(`/api/resumes/${resumeId}/add-to-docs`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setSuccessMessage('This resume is already in your documents.');
          return;
        }
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : (data.error || 'Failed to add to documents');
        throw new Error(errorMsg);
      }

      setSuccessMessage(`"${jobTitle || 'Resume'}" added to your documents and ingested into your career profile!`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add resume to documents';
      setError(errorMessage);
    } finally {
      setAddingToDocs(null);
    }
  };

  // Poll for ATS score if pending
  const pollForAtsScore = async (resumeId: string) => {
    // Avoid multiple concurrent polls per resume
    if (activePollsRef.current.has(resumeId)) {
      console.log('[DEBUG] ATS polling already active (NO $):', { resumeId });
      return;
    }

    const controller = new AbortController();
    activePollsRef.current.set(resumeId, controller);

    const maxAttempts = 20; // Poll for up to ~60 seconds
    const pollInterval = 3000; // 3 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

       // Stop if unmounted or canceled
       if (!isMountedRef.current || controller.signal.aborted) {
         console.log('[DEBUG] ATS polling stopped (NO $):', { resumeId, reason: 'unmounted_or_aborted' });
         break;
       }
      
      try {
        const response = await fetch(`/api/resumes/${resumeId}/ats-score`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (data.atsScore && !data.pending) {
            console.log('[DEBUG] ATS score received via polling (IS $):', data.atsScore.score);
            
            // Update the viewing resume with the new ATS score
            setViewingResume((prev: any) => {
              if (prev?.id === resumeId) {
                return { ...prev, ats_score: data.atsScore };
              }
              return prev;
            });
            
            // Update in the resumes list too
            setResumes((prev) =>
              prev.map((item) => 
                item.id === resumeId 
                  ? { ...item, ats_score: data.atsScore }
                  : item
              )
            );
            
            activePollsRef.current.delete(resumeId);
            return; // Stop polling
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          console.log('[DEBUG] ATS polling aborted (NO $):', { resumeId });
          break;
        }
        console.error('[DEBUG] ATS polling error (IS $):', err);
      }
    }
    console.log('[DEBUG] ATS polling timed out for resume:', resumeId);
    activePollsRef.current.delete(resumeId);
  };

  const handleView = async (resume: any) => {
    setActiveTab('preview');
    setMobileModalView('preview');
    setViewingLoading(true);
    setError(null);

    console.log('[DEBUG] Opening view modal (IS $):', {
      resumeId: resume.id,
      hasContent: !!resume.content,
      hasAtsScore: !!resume.ats_score,
      contentType: typeof resume.content,
    });

    // Set initial state to open modal immediately
    setViewingResume(resume);

    try {
      const response = await fetch(`/api/resumes/${resume.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] API response received (IS $):', {
          resumeId: data.resume?.id,
          hasContent: !!data.resume?.content,
          hasAtsScore: !!data.resume?.ats_score,
          contentType: typeof data.resume?.content,
        });
        
        // Always update with fresh data from API - this will trigger normalizedViewingContent to recompute
        setViewingResume(data.resume);
        
        // Explicitly update editedContent when API response arrives to ensure modal populates
        const normalized = normalizeResumeContent(data.resume.content);
        setEditedContent(normalized);
        console.log('[DEBUG] Explicitly set editedContent from API response (NO $):', {
          hasNormalized: !!normalized,
          hasSummary: !!normalized.summary,
          experienceCount: normalized.experience?.length || 0,
        });
        
        setResumes((prev) =>
          prev.map((item) => (item.id === data.resume.id ? data.resume : item))
        );

        // 🚀 OPTIMIZATION: If no ATS score yet, start polling in background
        if (!data.resume?.ats_score) {
          console.log('[DEBUG] No ATS score yet, starting background poll (NO $)');
          pollForAtsScore(data.resume.id);
        }
      } else {
        console.error('[DEBUG] API response not ok (IS $):', response.status);
      }
    } catch (err: unknown) {
      console.error('[DEBUG] Failed to load resume details (IS $):', err);
      setError('Failed to load resume details');
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
    setMobileModalView('preview');
    setPreviewScale(0.72);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (viewingResume) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewingResume]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <TailorLoading mode="resume" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold font-display mb-1 md:mb-2">My Resumes</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your tailored resumes.
          </p>
        </div>
        <a
          href="/dashboard/generate"
          className="px-4 py-2.5 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <FileText className="w-4 h-4" />
          New Resume
        </a>
      </div>

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-center gap-2 text-sm">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && !viewingResume && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-2">{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:bg-green-500/10 rounded flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {resumes.length === 0 ? (
        <div className="text-center py-12 md:py-16 glass-card rounded-xl border border-dashed border-border">
          <FileText className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-semibold mb-2">No resumes yet</h3>
          <p className="text-sm text-muted-foreground mb-4 md:mb-6 px-4">
            Create your first tailored resume to get started.
          </p>
          <a
            href="/dashboard/generate"
            className="px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all inline-flex items-center gap-2 text-sm md:text-base"
          >
            Create Resume
          </a>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {resumes.map((resume) => (
            <motion.div
              key={resume.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className={`glass-card p-4 md:p-6 rounded-xl border transition-all duration-200 hover:border-primary/50 hover:shadow-lg group ${highlightId === resume.id ? 'ring-2 ring-primary' : 'border-border'
                }`}
            >
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-base md:text-lg truncate" title={resume.job?.title}>
                    {resume.job?.title || 'Untitled Resume'}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate" title={resume.job?.company}>
                    {resume.job?.company || 'No Company'}
                  </p>
                </div>
                {/* Action buttons - always visible on mobile */}
                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAddToDocs(resume.id, resume.job?.title)}
                    disabled={addingToDocs === resume.id}
                    className="p-2 hover:bg-secondary/10 text-secondary rounded-lg transition-colors"
                    title="Add to Documents"
                  >
                    {addingToDocs === resume.id ? (
                      <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                    ) : (
                      <FolderPlus className="w-4 h-4" />
                    )}
                  </button>
                  <DownloadDropdown 
                    resumeId={resume.id}
                    downloading={downloading}
                    onDownload={handleDownload}
                    variant="icon"
                  />
                  <button
                    onClick={() => handleDelete(resume.id, resume.job?.title)}
                    disabled={deleting === resume.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                    title="Delete"
                  >
                    {deleting === resume.id ? (
                      <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* View Button */}
              <button
                onClick={() => handleView(resume)}
                className="w-full px-4 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Resume
              </button>

              <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  {new Date(resume.created_at).toLocaleDateString()}
                </div>
                              {resume.ats_score?.score != null ? (
                                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${resume.ats_score.score >= 80 ? 'bg-green-500/10 text-green-500' :
                                    resume.ats_score.score >= 60 ? 'bg-yellow-500/10 text-yellow-500' :
                                      'bg-red-500/10 text-red-500'
                                    }`}>
                                    ATS: {resume.ats_score.score}%
                                  </div>
                                ) : (
                                  <div className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                                    <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                                    Scoring...
                                  </div>
                                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Resume View/Edit Modal - Full screen on mobile */}
      <AnimatePresence>
        {viewingResume && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background w-full h-full md:max-w-7xl md:h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-0 md:border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-3 md:p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold font-display truncate">
                    {viewingResume.job?.title || 'Untitled Resume'}
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                    {viewingResume.job?.company || 'No Company'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleSaveEdits}
                      disabled={savingResume}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2"
                    >
                      {savingResume ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="hidden sm:inline">Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Save</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile View Toggle */}
              <div className="md:hidden flex border-b border-border">
                <button
                  onClick={() => setMobileModalView('preview')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    mobileModalView === 'preview' 
                      ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setMobileModalView('details')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    mobileModalView === 'details' 
                      ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  Analysis & Edit
                </button>
              </div>

              {/* Modal Content - Split Panel on Desktop, Single on Mobile */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Panel - Resume Preview */}
                <div className={`${mobileModalView === 'preview' ? 'flex' : 'hidden'} md:flex md:w-1/2 flex-col flex-1 overflow-hidden bg-muted/10 md:border-r border-border`}>
                  {/* Zoom Controls */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(previewScale * 100)}%
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={zoomOut}
                        disabled={previewScale <= 0.3}
                        className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Zoom out (min 30%)"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={resetZoom}
                        className="px-2 py-1 text-xs rounded hover:bg-muted transition-colors"
                        title="Reset zoom to fit"
                      >
                        Fit
                      </button>
                      <button
                        onClick={zoomIn}
                        disabled={previewScale >= 1.0}
                        className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Zoom in (max 100%)"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <button
                        onClick={() => setPreviewScale(1.0)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View at 100%"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Scrollable Preview Area */}
                  <div className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="flex justify-center">
                      <div 
                        className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200"
                        style={{ 
                          width: `calc(210mm * ${previewScale})`,
                        }}
                      >
                        <TemplatePreview 
                          template={(viewingResume.template || 'modern') as TemplateType} 
                          content={editedContent || normalizedViewingContent || {}} 
                          scale={previewScale}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Tabbed Content */}
                <div className={`${mobileModalView === 'details' ? 'flex' : 'hidden'} md:flex md:w-1/2 flex-col flex-1 overflow-hidden`}>
                  {/* Right Panel Tabs */}
                  <div className="p-2 md:p-3 border-b border-border bg-muted/20">
                    <div className="flex bg-muted rounded-lg p-1">
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'preview'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Analysis
                      </button>
                      <button
                        onClick={() => setActiveTab('ai-changes')}
                        className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'ai-changes'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="hidden sm:inline">AI</span>
                        {aiChanges.length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full">
                            {aiChanges.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('keywords')}
                        className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'keywords'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Keywords
                      </button>
                      <button
                        onClick={() => setActiveTab('edit')}
                        className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'edit'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Right Panel Content */}
                  <div className="flex-1 overflow-y-auto p-3 md:p-4">
                    {/* Analysis Tab */}
                    {activeTab === 'preview' && (
                      <div className="space-y-3 md:space-y-4">
                        {/* ATS Score */}
                        {viewingResume.ats_score?.score != null ? (
                          <div className="glass-card p-3 md:p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-sm md:text-base">Overall Score</h3>
                              <div className={`text-xl md:text-2xl font-bold ${viewingResume.ats_score.score >= 80 ? 'text-green-500' : viewingResume.ats_score.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {viewingResume.ats_score.score}%
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mb-4">
                              <div
                                className={`h-2 rounded-full transition-all ${viewingResume.ats_score.score >= 80 ? 'bg-green-500' : viewingResume.ats_score.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${viewingResume.ats_score.score}%` }}
                              />
                            </div>

                            {/* Detailed ATS Metrics */}
                            {atsAnalysis?.metrics && (
                              <div className="space-y-2.5 pt-3 border-t border-muted">
                                <AtsMetricBar 
                                  label="Hard Skills" 
                                  value={atsAnalysis.metrics.hardSkills ?? 0} 
                                  weight={35}
                                />
                                <AtsMetricBar 
                                  label="Keywords" 
                                  value={atsAnalysis.metrics.keywords ?? 0} 
                                  weight={25}
                                />
                                <AtsMetricBar 
                                  label="Semantic Match" 
                                  value={atsAnalysis.metrics.semanticMatch ?? 0} 
                                  weight={20}
                                />
                                <AtsMetricBar 
                                  label="Soft Skills" 
                                  value={atsAnalysis.metrics.softSkills ?? 0} 
                                  weight={10}
                                />
                                <AtsMetricBar 
                                  label="Searchability" 
                                  value={atsAnalysis.metrics.searchability ?? 0} 
                                  weight={10}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="glass-card p-3 md:p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-sm md:text-base">ATS Score</h3>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Calculating...</span>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mb-4">
                              <div className="h-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ width: '60%' }} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Your ATS compatibility score is being calculated. This usually takes 10-30 seconds.
                            </p>
                          </div>
                        )}

                        {/* Strengths */}
                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <h3 className="font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                            Strengths
                          </h3>
                          <ul className="space-y-1.5 md:space-y-2">
                            {atsAnalysis?.strengths && atsAnalysis.strengths.length > 0 ? (
                              atsAnalysis.strengths.map((strength: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs md:text-sm">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span>{strength}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs md:text-sm text-muted-foreground">No strengths analysis available</li>
                            )}
                          </ul>
                        </div>

                        {/* Areas for Improvement */}
                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <h3 className="font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                            <Edit className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                            Areas for Improvement
                          </h3>
                          <ul className="space-y-1.5 md:space-y-2">
                            {atsAnalysis?.improvements && atsAnalysis.improvements.length > 0 ? (
                              atsAnalysis.improvements.map((improvement: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs md:text-sm">
                                  <span className="text-yellow-500 mt-0.5">→</span>
                                  <span>{improvement}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs md:text-sm text-muted-foreground">No improvement suggestions available</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* AI Changes Tab */}
                    {activeTab === 'ai-changes' && (
                      <div className="space-y-3 md:space-y-4">
                        {/* AI Summary Stats */}
                        <div className="glass-card p-3 md:p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20">
                          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm md:text-base">
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                            AI Enhancements
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-background/50">
                              <div className="text-lg md:text-xl font-bold text-primary">{aiChangesStats.bulletsRewritten}</div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">Bullets Rewritten</div>
                            </div>
                            <div className="p-2 rounded-lg bg-background/50">
                              <div className="text-lg md:text-xl font-bold text-secondary">{aiChangesStats.keywordsAdded}</div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">Keywords Added</div>
                            </div>
                            {aiChangesStats.summaryChanged && (
                              <div className="col-span-2 p-2 rounded-lg bg-primary/10 text-xs flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-primary" />
                                <span>Summary enhanced for JD alignment</span>
                              </div>
                            )}
                            {aiChangesStats.skillsChanged && (
                              <div className="col-span-2 p-2 rounded-lg bg-secondary/10 text-xs flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-secondary" />
                                <span>Skills optimized and reordered</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Changes List */}
                        {aiChanges.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                              Change Details
                            </h4>
                            {aiChanges.map((change: any, index: number) => (
                              <div 
                                key={index} 
                                className="glass-card p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                    change.type === 'bullet_rewritten' ? 'bg-primary/10 text-primary' :
                                    change.type === 'summary_enhanced' ? 'bg-blue-500/10 text-blue-500' :
                                    change.type === 'skill_added' ? 'bg-green-500/10 text-green-500' :
                                    change.type === 'keyword_injected' ? 'bg-secondary/10 text-secondary' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {change.type?.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {change.section}
                                    {change.experienceIndex !== undefined && ` • Experience ${change.experienceIndex + 1}`}
                                  </span>
                                </div>
                                
                                {change.description && (
                                  <p className="text-xs text-muted-foreground mb-2">{change.description}</p>
                                )}
                                
                                {change.original && change.revised && (
                                  <div className="space-y-1.5">
                                    <div className="p-2 rounded bg-red-500/5 border-l-2 border-red-500/50">
                                      <div className="text-[10px] text-red-500/70 font-medium mb-0.5">ORIGINAL</div>
                                      <p className="text-xs text-muted-foreground line-through">{change.original}</p>
                                    </div>
                                    <div className="flex justify-center">
                                      <ArrowRight className="w-3 h-3 text-primary" />
                                    </div>
                                    <div className="p-2 rounded bg-primary/5 border-l-2 border-primary">
                                      <div className="text-[10px] text-primary font-medium mb-0.5">AI ENHANCED</div>
                                      <p className="text-xs">{change.revised}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {change.keywords && change.keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {change.keywords.map((kw: string, ki: number) => (
                                      <span key={ki} className="px-2 py-0.5 text-[10px] bg-secondary/10 text-secondary rounded-full">
                                        +{kw}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="glass-card p-4 rounded-xl text-center">
                            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No AI changes recorded for this resume.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              This may be an older resume generated before change tracking was added.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Keywords Tab */}
                    {activeTab === 'keywords' && (
                      <div className="space-y-3 md:space-y-4">
                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <h3 className="font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                            Matched Keywords ({atsAnalysis?.matchedKeywords?.length || 0})
                          </h3>
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {atsAnalysis?.matchedKeywords && atsAnalysis.matchedKeywords.length > 0 ? (
                              atsAnalysis.matchedKeywords.map((keyword: string, i: number) => (
                                <span key={i} className="px-2 md:px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs md:text-sm border border-green-500/20">
                                  {keyword}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs md:text-sm text-muted-foreground">No matched keywords</span>
                            )}
                          </div>
                        </div>

                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <h3 className="font-semibold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                            <X className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                            Missing Keywords ({keywordSuggestions.length})
                          </h3>
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {keywordSuggestions.length > 0 ? keywordSuggestions.map((keyword: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => {
                                  const newSkills = [...(editedContent?.skills || []), keyword];
                                  setEditedContent({ ...editedContent!, skills: newSkills });
                                }}
                                className="px-2 md:px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-xs md:text-sm border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1 group"
                              >
                                {keyword}
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">+</span>
                              </button>
                            )) : (
                              <span className="text-xs md:text-sm text-muted-foreground">Great job! No missing keywords detected.</span>
                            )}
                          </div>
                          {keywordSuggestions.length > 0 && (
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-2 md:mt-3">
                              Click a keyword to add it to your skills.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Edit Tab */}
                    {activeTab === 'edit' && (
                      <div className="space-y-3 md:space-y-4">
                        {/* Edit Summary */}
                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Professional Summary</h3>
                          <textarea
                            value={editedContent?.summary || ''}
                            onChange={(e) => {
                              setEditedContent((prev) => {
                                if (!prev) return prev;
                                return { ...prev, summary: e.target.value };
                              });
                            }}
                            className="w-full h-20 md:h-24 p-2 md:p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:outline-none text-xs md:text-sm"
                          />
                        </div>

                        {/* Edit Skills */}
                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">Skills</h3>
                          <textarea
                            value={(editedContent?.skills || []).join(', ')}
                            onChange={(e) => {
                              const skills = e.target.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                              setEditedContent((prev) => prev ? { ...prev, skills } : prev);
                            }}
                            placeholder="Separate skills with commas"
                            className="w-full h-16 md:h-20 p-2 md:p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:outline-none text-xs md:text-sm"
                          />
                        </div>

                        {/* Edit Experience */}
                        <div className="glass-card p-3 md:p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-2 md:mb-3">
                            <h3 className="font-semibold text-sm md:text-base">Experience</h3>
                            <button
                              onClick={addExperience}
                              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-3 md:space-y-4">
                            {editedContent?.experience?.map((exp: ExperienceEntry, i: number) => (
                              <div key={i} className="p-2 md:p-3 border border-border rounded-lg bg-background/50">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground">{exp.company || `Role ${i + 1}`}</span>
                                  <button
                                    onClick={() => removeExperience(i)}
                                    className="text-[10px] md:text-xs text-destructive hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <input
                                    value={exp.company}
                                    onChange={(e) => handleExperienceChange(i, 'company', e.target.value)}
                                    className="p-2 rounded border border-border bg-background text-xs md:text-sm"
                                    placeholder="Company"
                                  />
                                  <input
                                    value={exp.title}
                                    onChange={(e) => handleExperienceChange(i, 'title', e.target.value)}
                                    className="p-2 rounded border border-border bg-background text-xs md:text-sm"
                                    placeholder="Title"
                                  />
                                </div>
                                <textarea
                                  className="w-full rounded border border-border bg-background px-2 md:px-3 py-2 text-[10px] md:text-xs min-h-[60px] md:min-h-[80px]"
                                  placeholder="One bullet per line"
                                  value={(exp.bullets || []).join('\n')}
                                  onChange={(e) => handleExperienceBulletsChange(i, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 border-t border-border bg-muted/30">
                {successMessage && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-green-600 bg-green-500/10 px-3 py-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="line-clamp-1">{successMessage}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3">
                  <div className="text-[10px] md:text-xs text-muted-foreground">
                    {new Date(viewingResume.created_at).toLocaleDateString()} • {viewingResume.template}
                    {viewingResume.ats_score?.score != null && (
                      <span className={`ml-2 ${viewingResume.ats_score.score >= 80 ? 'text-green-500' : viewingResume.ats_score.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                        • ATS: {viewingResume.ats_score.score}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {activeTab === 'edit' && hasUnsavedChanges && (
                      <button
                        onClick={resetEdits}
                        disabled={savingResume}
                        className="px-3 md:px-4 py-2 rounded-lg bg-muted text-xs md:text-sm hover:bg-muted/80 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <DownloadDropdown 
                      resumeId={viewingResume.id}
                      downloading={downloading}
                      onDownload={handleDownload}
                      variant="button"
                    />
                    <button
                      onClick={closeModal}
                      className="px-3 md:px-4 py-2 rounded-lg bg-muted text-xs md:text-sm hover:bg-muted/80 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResumesPage() {
  return (
    <Suspense fallback={<TailorLoading mode="resume" />}>
      <ResumesContent />
    </Suspense>
  );
}
