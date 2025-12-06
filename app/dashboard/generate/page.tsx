'use client';

import { useState, useEffect, useMemo } from 'react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { motion } from 'framer-motion';
import { Sparkles, Briefcase, Building2, FileText, LayoutTemplate, Check, Eye, ChevronDown } from 'lucide-react';
import { 
  TemplatePreview, 
  TEMPLATE_CONFIGS, 
  SAMPLE_RESUME_CONTENT,
  type TemplateType 
} from '@/components/resume-templates';
import type { ResumeContent } from '@/lib/resume-content';

// Mobile template selector button
function MobileTemplateSelector({
  selected,
  onChange,
  disabled,
}: {
  selected: TemplateType;
  onChange: (t: TemplateType) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const config = TEMPLATE_CONFIGS[selected];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg bg-background border border-border flex items-center justify-between transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <span 
            className="w-4 h-4 rounded-md"
            style={{ backgroundColor: config.accentColor }}
          />
          <span className="font-medium">{config.name}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {(['modern', 'classic', 'technical'] as const).map((t) => {
            const tConfig = TEMPLATE_CONFIGS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                  selected === t ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                <span 
                  className="w-4 h-4 rounded-md"
                  style={{ backgroundColor: tConfig.accentColor }}
                />
                <div className="flex-1">
                  <div className="font-medium">{tConfig.name}</div>
                  <div className="text-xs text-muted-foreground">{tConfig.description}</div>
                </div>
                {selected === t && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// Mini preview card component for template selection (desktop)
function TemplateCard({ 
  type, 
  selected, 
  onClick 
}: { 
  type: TemplateType; 
  selected: boolean; 
  onClick: () => void;
}) {
  const config = TEMPLATE_CONFIGS[type];
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-3 rounded-xl border-2 transition-all duration-300 text-left group overflow-hidden ${
        selected
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      }`}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
      
      {/* Mini preview */}
      <div 
        className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-white border border-border/50 shadow-sm"
        style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
      >
        <div className="w-full h-full overflow-hidden" style={{ transform: 'scale(0.15)', transformOrigin: 'top left', width: '666%', height: '666%' }}>
          <TemplatePreview template={type} content={SAMPLE_RESUME_CONTENT} scale={1} />
        </div>
      </div>
      
      {/* Template info */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: config.accentColor }}
          />
          <span className="font-semibold text-sm">{config.name}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          {config.description}
        </p>
      </div>
    </button>
  );
}

export default function GeneratePage() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<ResumeContent | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Fetch user profile for live preview
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          // Convert profile data to ResumeContent format
          if (data.profile) {
            setUserProfile({
              contact: {
                name: data.profile.full_name || data.profile.name || '',
                email: data.profile.email || '',
                phone: data.profile.phone || '',
                location: data.profile.location || '',
                linkedin: data.profile.linkedin || '',
                portfolio: data.profile.portfolio || '',
              },
              summary: data.profile.summary || '',
              skills: data.profile.skills || [],
              experience: (data.profile.experiences || []).map((exp: any) => ({
                title: exp.title || '',
                company: exp.company || '',
                location: exp.location || '',
                startDate: exp.start_date || exp.startDate || '',
                endDate: exp.end_date || exp.endDate || '',
                isCurrent: exp.is_current || exp.isCurrent || false,
                bullets: exp.bullets || [],
              })),
              education: (data.profile.education || []).map((edu: any) => ({
                degree: edu.degree || '',
                school: edu.institution || edu.school || '',
                field: edu.field_of_study || edu.field || '',
                startDate: edu.start_date || edu.startDate || '',
                endDate: edu.end_date || edu.endDate || '',
                year: edu.graduation_date || edu.year || '',
                gpa: edu.gpa || '',
              })),
              certifications: (data.profile.certifications || []).map((cert: any) => ({
                name: cert.name || '',
                issuer: cert.issuer || '',
                date: cert.issue_date || cert.date || '',
              })),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  // Preview content: use user profile if available, otherwise sample
  const previewContent = useMemo(() => {
    if (!userProfile) return SAMPLE_RESUME_CONTENT;
    
    // Merge user profile with sample data for any missing fields
    return {
      contact: {
        name: userProfile.contact?.name || SAMPLE_RESUME_CONTENT.contact?.name,
        email: userProfile.contact?.email || SAMPLE_RESUME_CONTENT.contact?.email,
        phone: userProfile.contact?.phone || SAMPLE_RESUME_CONTENT.contact?.phone,
        location: userProfile.contact?.location || SAMPLE_RESUME_CONTENT.contact?.location,
        linkedin: userProfile.contact?.linkedin || SAMPLE_RESUME_CONTENT.contact?.linkedin,
        portfolio: userProfile.contact?.portfolio || '',
      },
      summary: userProfile.summary || SAMPLE_RESUME_CONTENT.summary,
      experience: userProfile.experience?.length ? userProfile.experience : SAMPLE_RESUME_CONTENT.experience,
      education: userProfile.education?.length ? userProfile.education : SAMPLE_RESUME_CONTENT.education,
      skills: userProfile.skills?.length ? userProfile.skills : SAMPLE_RESUME_CONTENT.skills,
      certifications: userProfile.certifications?.length ? userProfile.certifications : SAMPLE_RESUME_CONTENT.certifications,
    };
  }, [userProfile]);

  // Timer for generation progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (generating) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [generating]);

  // Progress steps that match API logging
  const progressSteps = [
    { step: 1, label: 'Fetching job details', emoji: '📋' },
    { step: 2, label: 'Loading your documents', emoji: '📄' },
    { step: 3, label: 'Analyzing job description', emoji: '🔍' },
    { step: 4, label: 'Generating embeddings', emoji: '🧮' },
    { step: 5, label: 'Selecting relevant experiences', emoji: '👤' },
    { step: 6, label: 'Generating tailored resume', emoji: '✍️' },
    { step: 7, label: 'Running quality checks', emoji: '🔍' },
    { step: 8, label: 'Finalizing and scoring', emoji: '💾' },
  ];

  // Estimate current step based on elapsed time (rough estimates)
  const estimatedStep = Math.min(
    Math.floor(elapsedTime / 8) + 1,
    progressSteps.length
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setElapsedTime(0);
    setCurrentStep('');

    try {
      setCurrentStep('Creating job record...');
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

      setCurrentStep('Generating resume...');
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
      setCurrentStep('');
      setElapsedTime(0);
    }
  };

  // Full-screen generating state on mobile
  if (generating) {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    const showTimeoutWarning = elapsedTime > 90; // Show warning after 90 seconds
    const currentStepInfo = progressSteps[estimatedStep - 1] || progressSteps[progressSteps.length - 1];

    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <TailorLoading mode="generate" />
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-lg font-medium text-foreground">
                Tailoring for {jobTitle || 'your role'}
              </p>
              {company && (
                <p className="text-sm text-muted-foreground">at {company}</p>
              )}
            </div>

            {/* Progress indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{currentStepInfo.emoji}</span>
                <span>{currentStepInfo.label}...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(estimatedStep / progressSteps.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Step {estimatedStep} of {progressSteps.length}
              </p>
            </div>

            {/* Time elapsed */}
            <div className="text-xs text-muted-foreground">
              Elapsed time: <span className="font-medium">{timeString}</span>
            </div>

            {/* Timeout warning */}
            {showTimeoutWarning && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-600">
                  ⏱️ Generation is taking longer than usual. This is normal for complex resumes. Please wait...
                </p>
              </div>
            )}

            {currentStep && (
              <p className="text-xs text-primary mt-2">
                {currentStep}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-4 md:py-8 max-w-7xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-4xl font-bold font-display">Generate Resume</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Create a tailored resume for your job application.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
        {/* Form Column - Full width on mobile, 3 cols on desktop */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <form onSubmit={handleGenerate} className="space-y-4 md:space-y-6">
            <div className="glass-card p-4 md:p-6 rounded-xl space-y-4 md:space-y-6">
              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-base"
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-base"
                  placeholder="e.g. Google"
                />
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Job Description *
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary min-h-[140px] md:min-h-[180px] transition-all text-base"
                  placeholder="Paste the full job description here..."
                  required
                />
              </div>
            </div>

            {/* Template Selection - Mobile dropdown / Desktop cards */}
            <div className="glass-card p-4 md:p-6 rounded-xl">
              <label className="block text-sm font-medium mb-3 md:mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                Select Template
              </label>
              
              {/* Mobile: Dropdown selector */}
              <div className="md:hidden">
                <MobileTemplateSelector
                  selected={template}
                  onChange={setTemplate}
                  disabled={generating}
                />
              </div>

              {/* Desktop: Card grid with previews */}
              <div className="hidden md:grid grid-cols-3 gap-4">
                {(['modern', 'classic', 'technical'] as const).map((t) => (
                  <TemplateCard
                    key={t}
                    type={t}
                    selected={template === t}
                    onClick={() => setTemplate(t)}
                  />
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={generating}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-base md:text-lg"
            >
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              Generate Tailored Resume
            </button>
          </form>
        </motion.div>

        {/* Right column - Live Preview (Desktop only) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:block lg:col-span-2"
        >
          <div className="glass-card rounded-xl border border-border overflow-hidden sticky top-8">
            {/* Preview Header */}
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Template Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all mt-2 ${
                  showLivePreview 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {showLivePreview ? 'Your Data' : 'Sample Data'}
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-4 bg-muted/10 relative">
              {loadingProfile && showLivePreview ? (
                <div className="h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your profile...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="max-h-[500px] overflow-auto flex justify-center p-4">
                    <div style={{ width: 'calc(210mm * 0.5)' }}>
                      <TemplatePreview 
                        template={template} 
                        content={showLivePreview ? previewContent : SAMPLE_RESUME_CONTENT} 
                        scale={0.5}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TEMPLATE_CONFIGS[template].accentColor }}
                />
                <span className="font-medium">{TEMPLATE_CONFIGS[template].name}</span>
                <span>•</span>
                <span>{TEMPLATE_CONFIGS[template].description}</span>
              </div>
              {showLivePreview && userProfile && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Showing preview with your profile data. Final resume will be AI-tailored to the job description.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
