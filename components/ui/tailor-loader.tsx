'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Scissors, FileText, Upload, Sparkles } from 'lucide-react';

export type LoadingMode = 'general' | 'resume' | 'generate' | 'upload';

interface TailorLoadingProps {
    progress?: number;
    mode?: LoadingMode;
    showPercentage?: boolean;
    className?: string;
}

const PHRASES = {
    general: [
        "Stitching your experience...",
        "Measuring for fit...",
        "Selecting the finest fabrics...",
        "Ironing out the details...",
    ],
    resume: [
        "Polishing your profile...",
        "Formatting for success...",
        "Aligning margins...",
        "Structuring your story...",
    ],
    generate: [
        "Drafting your masterpiece...",
        "Weaving keywords...",
        "Tailoring to the job description...",
        "Applying finishing touches...",
    ],
    upload: [
        "Ingesting fabric...",
        "Analyzing patterns...",
        "Sorting threads...",
        "Organizing materials...",
    ],
};

const ICONS = {
    general: Scissors,
    resume: FileText,
    generate: Sparkles,
    upload: Upload,
};

export function TailorLoading({
    progress,
    mode = 'general',
    showPercentage = false,
    className = '',
}: TailorLoadingProps) {
    const [phraseIndex, setPhraseIndex] = useState(0);
    const Icon = ICONS[mode];
    const phrases = PHRASES[mode];

    useEffect(() => {
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [phrases.length]);

    return (
        <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
            <div className="relative mb-6 w-16 h-16">
                {/* Rotating outer ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary absolute inset-0"
                />

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center justify-center"
                    >
                        <Icon className="w-6 h-6 text-primary" />
                    </motion.div>
                </div>
            </div>

            {/* Phrases */}
            <div className="h-8 mb-2 relative w-full max-w-xs text-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={phraseIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm font-medium text-muted-foreground absolute inset-0 flex items-center justify-center"
                    >
                        {phrases[phraseIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            {typeof progress === 'number' && (
                <div className="w-48 mt-2">
                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-primary rounded-full"
                        />
                    </div>
                    {showPercentage && (
                        <p className="text-xs text-center mt-1 text-muted-foreground font-mono">
                            {Math.round(progress)}%
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
