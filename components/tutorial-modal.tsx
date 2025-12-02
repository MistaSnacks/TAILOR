'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  Sparkles,
  FileText,
  GraduationCap,
  FolderPlus,
  Download,
  Edit,
  Eye,
  MessageCircle,
  Target,
  CheckCircle,
  User,
  Plus,
  Briefcase,
} from 'lucide-react';

const STORAGE_KEY = 'tailor_tutorial_completed';

type TutorialStep = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  points: { icon: React.ReactNode; text: string }[];
  illustration: React.ReactNode;
};

const tutorialSteps: TutorialStep[] = [
  {
    id: 'profile',
    icon: <User className="w-6 h-6" />,
    title: 'Build Your Profile',
    description: 'Add your skills and work experience directly, or upload documents to extract them automatically.',
    points: [
      { icon: <Edit className="w-4 h-4" />, text: 'Edit your personal information' },
      { icon: <Plus className="w-4 h-4" />, text: 'Add skills (bulk paste supported)' },
      { icon: <Briefcase className="w-4 h-4" />, text: 'Add work experience with bullets' },
    ],
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="w-52 bg-card border border-border rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold">John Doe</div>
              <div className="text-[10px] text-muted-foreground">john@email.com</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <motion.span
              className="px-2 py-0.5 text-[8px] bg-primary/10 text-primary rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              React
            </motion.span>
            <motion.span
              className="px-2 py-0.5 text-[8px] bg-primary/10 text-primary rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              TypeScript
            </motion.span>
            <motion.span
              className="px-2 py-0.5 text-[8px] bg-primary/10 text-primary rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              Node.js
            </motion.span>
          </div>
          <motion.div
            className="flex items-center gap-1 text-[9px] text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Briefcase className="w-3 h-3" />
            <span>3 work experiences</span>
          </motion.div>
        </div>
      </div>
    ),
  },
  {
    id: 'documents',
    icon: <UploadCloud className="w-6 h-6" />,
    title: 'Upload Documents',
    description: 'Have existing resumes? Upload them and our AI will extract your skills and experience automatically.',
    points: [
      { icon: <FileText className="w-4 h-4" />, text: 'Drag & drop PDF or DOCX files' },
      { icon: <Sparkles className="w-4 h-4" />, text: 'AI extracts skills & experience' },
      { icon: <CheckCircle className="w-4 h-4" />, text: 'Data merges into your Profile' },
    ],
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <motion.div
          className="w-40 h-24 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 flex flex-col items-center justify-center gap-2"
          animate={{ scale: [1, 1.02, 1], borderColor: ['hsl(var(--primary) / 0.5)', 'hsl(var(--primary))', 'hsl(var(--primary) / 0.5)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <UploadCloud className="w-8 h-8 text-primary" />
          <span className="text-xs text-muted-foreground">Drop files here</span>
        </motion.div>
        <motion.div
          className="absolute -top-2 -right-4 w-12 h-14 bg-card border border-border rounded-lg shadow-lg flex items-center justify-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <FileText className="w-6 h-6 text-primary" />
        </motion.div>
      </div>
    ),
  },
  {
    id: 'generate',
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Generate Tailored Resumes',
    description: 'Paste any job description and let AI create a perfectly matched resume from your profile.',
    points: [
      { icon: <FileText className="w-4 h-4" />, text: 'Paste the job description' },
      { icon: <Sparkles className="w-4 h-4" />, text: 'AI matches your experience' },
      { icon: <Target className="w-4 h-4" />, text: 'Get instant ATS score' },
    ],
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center gap-4">
        <div className="w-28 h-24 rounded-lg bg-card border border-border p-2 text-[8px] text-muted-foreground/60 leading-tight overflow-hidden">
          <div className="font-bold text-foreground text-[10px] mb-1">Job Description</div>
          <div className="space-y-0.5">
            <div className="h-1.5 bg-muted rounded w-full" />
            <div className="h-1.5 bg-muted rounded w-4/5" />
            <div className="h-1.5 bg-muted rounded w-3/4" />
            <div className="h-1.5 bg-primary/30 rounded w-full" />
            <div className="h-1.5 bg-muted rounded w-2/3" />
          </div>
        </div>
        <motion.div
          animate={{ x: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronRight className="w-6 h-6 text-primary" />
        </motion.div>
        <div className="w-28 h-24 rounded-lg bg-card border border-primary/50 p-2 shadow-lg shadow-primary/10">
          <div className="text-center border-b border-border pb-1 mb-1">
            <div className="text-[8px] font-bold">YOUR NAME</div>
          </div>
          <div className="space-y-0.5">
            <div className="h-1 bg-muted rounded w-full" />
            <div className="h-1 bg-muted rounded w-4/5" />
            <div className="h-1 bg-primary/40 rounded w-full" />
            <div className="h-1 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'manage',
    icon: <FileText className="w-6 h-6" />,
    title: 'Manage Your Resumes',
    description: 'View, edit, download, or add generated resumes back to your document library.',
    points: [
      { icon: <Eye className="w-4 h-4" />, text: 'View full preview + ATS analysis' },
      { icon: <Download className="w-4 h-4" />, text: 'Download as DOCX file' },
      { icon: <FolderPlus className="w-4 h-4" />, text: 'Add to Docs for future tailoring' },
      { icon: <Edit className="w-4 h-4" />, text: 'Edit & recalculate ATS score' },
    ],
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="w-48 h-28 rounded-xl bg-card border border-border p-3 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs font-bold">Software Engineer</div>
              <div className="text-[10px] text-muted-foreground">Google</div>
            </div>
            <div className="flex gap-1">
              <motion.div
                className="w-5 h-5 rounded bg-secondary/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <FolderPlus className="w-3 h-3 text-secondary" />
              </motion.div>
              <motion.div
                className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <Download className="w-3 h-3 text-primary" />
              </motion.div>
            </div>
          </div>
          <div className="w-full h-6 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] text-primary font-medium">View Resume</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[8px] text-muted-foreground">Dec 2, 2025</span>
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-500">ATS: 85%</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'coach',
    icon: <GraduationCap className="w-6 h-6" />,
    title: 'Get Career Coaching',
    description: 'Chat with your AI career coach who knows your entire work history and can help you succeed.',
    points: [
      { icon: <MessageCircle className="w-4 h-4" />, text: 'Ask anything about your career' },
      { icon: <Target className="w-4 h-4" />, text: 'Get interview prep & strategy' },
      { icon: <Sparkles className="w-4 h-4" />, text: 'AI knows your full history' },
    ],
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="w-52 space-y-2">
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-1.5 text-[10px] max-w-[140px]">
              What are my strongest skills?
            </div>
          </motion.div>
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-[10px] text-white">T</span>
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-1.5 text-[10px] max-w-[160px]">
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

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function TutorialModal({ isOpen, onClose, onComplete }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard navigation and accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSkip, handleBack, handleNext]);

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            aria-describedby="tutorial-description"
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors z-10"
              aria-label="Close tutorial"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary">
                  {step.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Step {currentStep + 1} of {tutorialSteps.length}
                  </p>
                  <h2 id="tutorial-title" className="text-xl font-bold font-display">{step.title}</h2>
                </div>
              </div>
            </div>

            {/* Content - Fixed height container for seamless transitions */}
            <div className="px-6 pb-6 overflow-hidden min-h-[400px] flex flex-col">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="flex-1 flex flex-col"
                >
                  {/* Illustration */}
                  <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50 flex-shrink-0">
                    {step.illustration}
                  </div>

                  {/* Description */}
                  <p id="tutorial-description" className="text-muted-foreground text-sm mb-4 leading-relaxed flex-shrink-0">
                    {step.description}
                  </p>

                  {/* Key Points */}
                  <ul className="space-y-2 flex-1">
                    {step.points.map((point, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0" aria-hidden="true">
                          {point.icon}
                        </span>
                        <span>{point.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-4">
                {tutorialSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > currentStep ? 1 : -1);
                      setCurrentStep(i);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep
                        ? 'w-6 bg-primary'
                        : i < currentStep
                        ? 'bg-primary/50'
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3">
                {currentStep > 0 ? (
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <button
                    onClick={handleSkip}
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors font-medium text-sm"
                    aria-label="Skip tutorial"
                  >
                    Skip Tutorial
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  aria-label={isLastStep ? 'Complete tutorial' : 'Next step'}
                >
                  {isLastStep ? (
                    <>
                      Get Started
                      <Sparkles className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing tutorial state
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setShowTutorial(true);
    }
    setHasCheckedStorage(true);
  }, []);

  const completeTutorial = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowTutorial(false);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const openTutorial = () => {
    setShowTutorial(true);
  };

  const resetTutorial = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowTutorial(true);
  };

  return {
    showTutorial,
    hasCheckedStorage,
    completeTutorial,
    closeTutorial,
    openTutorial,
    resetTutorial,
  };
}

