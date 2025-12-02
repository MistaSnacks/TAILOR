'use client';

import { useState, useEffect, useMemo } from 'react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { motion } from 'framer-motion';
import { Sparkles, Briefcase, Building2, FileText, LayoutTemplate, Check, Eye } from 'lucide-react';
import { 
  TemplatePreview, 
  TEMPLATE_CONFIGS, 
  SAMPLE_RESUME_CONTENT,
  type TemplateType 
} from '@/components/resume-templates';
import type { ResumeContent } from '@/lib/resume-content';

// Mini preview card component for template selection
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-7xl"
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

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left column - Form (3 cols) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className={`glass-card p-6 rounded-xl space-y-6 transition-opacity ${generating ? 'opacity-60' : ''}`}>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g. Senior Software Engineer"
                  required
                  disabled={generating}
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
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g. Google"
                  disabled={generating}
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
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary min-h-[180px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Paste the full job description here..."
                  required
                  disabled={generating}
                />
              </div>
            </div>

            {/* Template Selection with Previews */}
            <div className={`glass-card p-6 rounded-xl transition-opacity ${generating ? 'opacity-60 pointer-events-none' : ''}`}>
              <label className="block text-sm font-medium mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                Select Template
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['modern', 'classic', 'technical'] as const).map((t) => (
                  <TemplateCard
                    key={t}
                    type={t}
                    selected={template === t}
                    onClick={() => !generating && setTemplate(t)}
                  />
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

        {/* Right column - Live Preview (2 cols) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <div className={`glass-card rounded-xl border overflow-hidden sticky top-8 transition-all duration-300 ${
            generating ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
          }`}>
            {/* Preview Header */}
            <div className={`p-4 border-b flex items-center justify-between transition-colors ${
              generating ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
            }`}>
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                {generating ? (
                  <>
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-primary">Generating Resume...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-primary" />
                    Template Preview
                  </>
                )}
              </h3>
              {!generating && (
                <button
                  type="button"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    showLivePreview 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {showLivePreview ? 'Your Data' : 'Sample Data'}
                </button>
              )}
            </div>

            {/* Preview Content */}
            <div className="p-4 bg-muted/10 relative">
              {generating ? (
                /* Generating State - Show loader overlay on top of dimmed preview */
                <div className="relative">
                  {/* Dimmed template preview in background */}
                  <div 
                    className="bg-white rounded-lg shadow-lg overflow-hidden opacity-30"
                    style={{ height: '500px', position: 'relative' }}
                  >
                    <div 
                      className="absolute inset-0 overflow-auto"
                      style={{ 
                        transform: 'scale(0.45)', 
                        transformOrigin: 'top left',
                        width: '222%',
                        height: '222%',
                      }}
                    >
                      <TemplatePreview 
                        template={template} 
                        content={showLivePreview ? previewContent : SAMPLE_RESUME_CONTENT} 
                        scale={1}
                      />
                    </div>
                  </div>
                  
                  {/* Generating overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-primary/20 max-w-xs">
                      <TailorLoading mode="generate" />
                      <div className="text-center mt-4 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Tailoring for {jobTitle || 'your role'}
                        </p>
                        {company && (
                          <p className="text-xs text-muted-foreground">at {company}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : loadingProfile && showLivePreview ? (
                <div className="h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your profile...</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                  style={{ height: '500px', position: 'relative' }}
                >
                  <div 
                    className="absolute inset-0 overflow-auto"
                    style={{ 
                      transform: 'scale(0.45)', 
                      transformOrigin: 'top left',
                      width: '222%',
                      height: '222%',
                    }}
                  >
                    <TemplatePreview 
                      template={template} 
                      content={showLivePreview ? previewContent : SAMPLE_RESUME_CONTENT} 
                      scale={1}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className={`p-4 border-t transition-colors ${
              generating ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
            }`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TEMPLATE_CONFIGS[template].accentColor }}
                />
                <span className="font-medium">{TEMPLATE_CONFIGS[template].name}</span>
                <span>•</span>
                <span>{TEMPLATE_CONFIGS[template].description}</span>
              </div>
              {generating ? (
                <p className="text-[10px] text-primary mt-2 font-medium">
                  AI is analyzing job requirements and tailoring your experience...
                </p>
              ) : showLivePreview && userProfile ? (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Showing preview with your profile data. Final resume will be AI-tailored to the job description.
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
