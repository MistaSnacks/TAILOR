'use client';

import { motion } from 'framer-motion';
import {
    Building2,
    MapPin,
    Clock,
    DollarSign,
    Bookmark,
    BookmarkCheck,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { NormalizedJob } from '@/lib/jobs/types';

interface JobCardProps {
    job: NormalizedJob;
    isSaved?: boolean;
    onToggleSave?: (job: NormalizedJob) => void;
    showSave?: boolean;
    className?: string; // Allow passing classes for layout adjustments
    index?: number;
}

export function JobCard({
    job,
    isSaved = false,
    onToggleSave,
    showSave = true,
    className = "",
    index = 0
}: JobCardProps) {
    const prefersReducedMotion = useReducedMotion();
    const router = useRouter();

    const handleGenerate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Store the full job description in sessionStorage to avoid URL length limits
        if (job.description) {
            try {
                sessionStorage.setItem('pendingJobDescription', job.description);
            } catch (error) {
                console.error('Failed to store job description:', error);
                // Continue navigation anyway - the generate page should handle missing description
            }
        }

        // Navigate to generation page
        router.push('/dashboard/generate');
    };

    const formatRelativeTime = (date: Date | string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 14) return '1w ago';
        return `${Math.floor(diffDays / 7)}w ago`;
    };

    return (
        <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-card p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all group ${className}`}
        >
            <div className="flex items-start justify-between gap-3">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {job.companyLogo ? (
                                <img
                                    src={job.companyLogo}
                                    alt={job.company}
                                    className="w-6 h-6 rounded object-cover"
                                />
                            ) : (
                                <Building2 className="w-5 h-5 text-primary" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.isRemote ? 'Remote' : (job.location?.split(',')[0] || 'Location N/A')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(job.postedAt)}
                        </span>
                        {job.salary && (job.salary.min || job.salary.max) && (
                            <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {job.salary.min && job.salary.max
                                    ? `$${(job.salary.min / 1000).toFixed(0)}k-$${(job.salary.max / 1000).toFixed(0)}k`
                                    : 'Salary listed'}
                            </span>
                        )}
                        {job.employmentType && (
                            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] uppercase tracking-wide">
                                {job.employmentType.replace('_', '-')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={handleGenerate}
                        className="p-2 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 hover:border-primary/20 transition-all group/gen"
                        title="Generate Resume from this Job"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>

                    {showSave && onToggleSave && (
                        <button
                            onClick={() => onToggleSave(job)}
                            className={`p-2 rounded-lg transition-colors ${isSaved
                                ? 'text-primary bg-primary/5'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            title={isSaved ? 'Unsave' : 'Save job'}
                        >
                            {isSaved ? (
                                <BookmarkCheck className="w-4 h-4" />
                            ) : (
                                <Bookmark className="w-4 h-4" />
                            )}
                        </button>
                    )}

                    <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Apply on Company Site"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </motion.div>
    );
}
