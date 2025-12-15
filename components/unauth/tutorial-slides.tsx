'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Sparkles,
  FileText,
  GraduationCap,
  FolderPlus,
  Download,
  Eye,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  User,
  Edit,
  Plus,
} from 'lucide-react';

type TutorialSlide = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  illustration: React.ReactNode;
};

const tutorialSlides: TutorialSlide[] = [
  {
    id: 'profile',
    icon: <User className="w-5 h-5" />,
    title: 'Build Your Profile',
    description: 'Add your skills and work experience directly, or upload documents to extract them automatically.',
    illustration: (
      <div className="relative w-full h-32 md:h-40 flex items-center justify-center">
        <div className="w-52 md:w-60 bg-card border border-border rounded-xl p-3 md:p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 md:w-5 h-4 md:h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs md:text-sm font-bold">John Doe</div>
              <div className="text-[10px] md:text-[11px] text-muted-foreground">john@email.com</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <motion.span
              className="px-2 py-0.5 text-[8px] md:text-[9px] bg-primary/10 text-primary rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              React
            </motion.span>
            <motion.span
              className="px-2 py-0.5 text-[8px] md:text-[9px] bg-primary/10 text-primary rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              TypeScript
            </motion.span>
            <motion.span
              className="px-2 py-0.5 text-[8px] md:text-[9px] bg-primary/10 text-primary rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              Node.js
            </motion.span>
          </div>
          <motion.div
            className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Briefcase className="w-3 md:w-3.5 h-3 md:h-3.5" />
            <span>3 work experiences</span>
          </motion.div>
        </div>
      </div>
    ),
  },
  {
    id: 'documents',
    icon: <UploadCloud className="w-5 h-5" />,
    title: 'Upload Documents',
    description: 'Upload your existing resumes and our AI extracts your skills and experience automatically.',
    illustration: (
      <div className="relative w-full h-32 md:h-40 flex items-center justify-center">
        <motion.div
          className="w-36 md:w-44 h-24 md:h-28 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 flex flex-col items-center justify-center gap-1.5 md:gap-2"
          animate={{ scale: [1, 1.02, 1], borderColor: ['hsl(var(--primary) / 0.5)', 'hsl(var(--primary))', 'hsl(var(--primary) / 0.5)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <UploadCloud className="w-8 md:w-10 h-8 md:h-10 text-primary" />
          <span className="text-xs md:text-sm text-muted-foreground">Drop files here</span>
        </motion.div>
        <motion.div
          className="absolute -top-1 md:-top-2 -right-1 md:-right-2 w-10 md:w-14 h-12 md:h-16 bg-card border border-border rounded-lg shadow-lg flex items-center justify-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <FileText className="w-5 md:w-7 h-5 md:h-7 text-primary" />
        </motion.div>
      </div>
    ),
  },
  {
    id: 'generate',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Generate Resume',
    description: 'Paste any job description and let AI create a perfectly matched resume in seconds.',
    illustration: (
      <div className="relative w-full h-32 md:h-40 flex items-center justify-center gap-2 md:gap-4">
        {/* Job Description - responsive sizing */}
        <div className="w-24 md:w-32 h-20 md:h-28 rounded-lg bg-card border border-border p-2 md:p-3 text-[8px] md:text-[9px] text-muted-foreground/60 leading-tight overflow-hidden">
          <div className="font-bold text-foreground text-[9px] md:text-[11px] mb-1 md:mb-2">Job Desc</div>
          <div className="space-y-0.5 md:space-y-1">
            <div className="h-1.5 md:h-2 bg-muted rounded w-full" />
            <div className="h-1.5 md:h-2 bg-muted rounded w-4/5" />
            <div className="h-1.5 md:h-2 bg-muted rounded w-3/4" />
            <div className="h-1.5 md:h-2 bg-primary/30 rounded w-full" />
            <div className="h-1.5 md:h-2 bg-muted rounded w-2/3" />
          </div>
        </div>
        <motion.div
          animate={{ x: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronRight className="w-5 md:w-7 h-5 md:h-7 text-primary" />
        </motion.div>
        {/* Resume - responsive sizing */}
        <div className="w-24 md:w-32 h-20 md:h-28 rounded-lg bg-card border border-primary/50 p-2 md:p-3 shadow-lg shadow-primary/10">
          <div className="text-center border-b border-border pb-0.5 md:pb-1 mb-1 md:mb-2">
            <div className="text-[8px] md:text-[9px] font-bold">YOUR NAME</div>
          </div>
          <div className="space-y-0.5 md:space-y-1">
            <div className="h-1 md:h-1.5 bg-muted rounded w-full" />
            <div className="h-1 md:h-1.5 bg-muted rounded w-4/5" />
            <div className="h-1 md:h-1.5 bg-primary/40 rounded w-full" />
            <div className="h-1 md:h-1.5 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'manage',
    icon: <FileText className="w-5 h-5" />,
    title: 'Manage Resumes',
    description: 'View, edit, and download your tailored resumes. See your ATS match score instantly.',
    illustration: (
      <div className="relative w-full h-32 md:h-40 flex items-center justify-center">
        <div className="w-48 md:w-56 h-28 md:h-32 rounded-xl bg-card border border-border p-3 md:p-4 shadow-lg">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div>
              <div className="text-xs md:text-sm font-bold">Software Engineer</div>
              <div className="text-[10px] md:text-[11px] text-muted-foreground">Stripe</div>
            </div>
            <div className="flex gap-1 md:gap-1.5">
              <motion.div
                className="w-5 md:w-6 h-5 md:h-6 rounded bg-secondary/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <FolderPlus className="w-3 md:w-3.5 h-3 md:h-3.5 text-secondary" />
              </motion.div>
              <motion.div
                className="w-5 md:w-6 h-5 md:h-6 rounded bg-primary/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <Download className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
              </motion.div>
            </div>
          </div>
          <div className="w-full h-6 md:h-7 rounded bg-primary/10 flex items-center justify-center mb-2 md:mb-3">
            <Eye className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary mr-1 md:mr-1.5" />
            <span className="text-[10px] md:text-[11px] text-primary font-medium">View Resume</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[8px] md:text-[9px] text-muted-foreground">Dec 2, 2025</span>
            <span className="text-[8px] md:text-[9px] font-medium px-1.5 md:px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">ATS: 92%</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'jobs',
    icon: <Briefcase className="w-5 h-5" />,
    title: 'Smart Job Search',
    description: 'Find tailored jobs based on your career profile and preferences. Our AI scans top job boards to bring you the best matches.',
    illustration: (
      <div className="relative w-full h-32 md:h-40 flex items-center justify-center gap-4 md:gap-8">
        {/* Profile Source */}
        <div className="relative">
          <div className="w-12 md:w-14 h-16 md:h-20 bg-card border border-border rounded-lg p-1.5 flex flex-col gap-1.5 shadow-sm z-10 relative">
            <div className="w-full h-1.5 bg-primary/20 rounded-full" />
            <div className="w-3/4 h-1.5 bg-muted rounded-full" />
            <div className="w-1/2 h-1.5 bg-muted rounded-full" />
            <div className="mt-auto w-full h-1.5 bg-muted/50 rounded-full" />
          </div>
          {/* Ripples */}
          <motion.div
            className="absolute inset-0 border border-primary/30 rounded-lg"
            animate={{ scale: [1, 1.4], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Arrow/Connection */}
        <div className="text-muted-foreground/30">
          <ChevronRight className="w-5 h-5" />
        </div>

        {/* Job Card */}
        <motion.div
          className="w-32 md:w-40 h-14 md:h-16 bg-card border border-primary/30 rounded-xl p-2 flex items-center gap-2.5 shadow-lg relative overflow-hidden"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="w-3/4 h-1.5 bg-primary/20 rounded-full" />
            <div className="w-1/2 h-1.5 bg-muted rounded-full" />
          </div>

          {/* Match Badge Animation */}
          <motion.div
            className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] px-1.5 py-0.5 rounded-bl-lg font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
          >
            98% MATCH
          </motion.div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'coach',
    icon: <GraduationCap className="w-5 h-5" />,
    title: 'Career Coach',
    description: 'Chat with your AI career coach who knows your entire work history and helps you succeed.',
    illustration: (
      <div className="relative w-full h-32 md:h-40 flex items-center justify-center">
        <div className="w-52 md:w-60 space-y-2 md:space-y-3">
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] max-w-[140px] md:max-w-[160px]">
              What are my strongest skills?
            </div>
          </motion.div>
          <motion.div
            className="flex items-start gap-1.5 md:gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-6 md:w-7 h-6 md:h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-[10px] md:text-[11px] text-white">T</span>
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] max-w-[160px] md:max-w-[180px]">
              Based on your profile, your top skills are...
              <motion.span
                className="inline-flex gap-0.5 ml-1"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="w-1 h-1 rounded-full bg-violet-500" />
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
              </motion.span>
            </div>
          </motion.div>
        </div>
      </div>
    ),
  },
];

const AUTO_SCROLL_INTERVAL = 4000;

export function TutorialSlides() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % tutorialSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + tutorialSlides.length) % tutorialSlides.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(nextSlide, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const slide = tutorialSlides[currentSlide];
  const progress = ((currentSlide + 1) / tutorialSlides.length) * 100;

  return (
    <div
      className="relative w-full max-w-sm md:max-w-md mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-card/80 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary">
              {slide.icon}
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground font-medium">
                Step {currentSlide + 1} of {tutorialSlides.length}
              </p>
              <h3 className="text-base md:text-lg font-bold font-display">{slide.title}</h3>
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div className="px-4 md:px-6 py-4 md:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl bg-muted/30 border border-border/50 p-3 md:p-4"
            >
              {slide.illustration}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Description */}
        <div className="px-4 md:px-6 pb-3 md:pb-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={slide.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground text-xs md:text-sm leading-relaxed"
            >
              {slide.description}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <div className="flex justify-between items-center mb-1.5 md:mb-2">
            <span className="text-[10px] md:text-xs text-muted-foreground">Progress</span>
            <span className="text-xs md:text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 md:h-2 w-full bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <button
              onClick={prevSlide}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted active:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1.5 md:gap-2">
              {tutorialSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentSlide
                    ? 'w-5 md:w-6 bg-primary'
                    : i < currentSlide
                      ? 'bg-primary/50'
                      : 'bg-muted-foreground/30'
                    }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted active:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
