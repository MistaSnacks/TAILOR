/**
 * Training Dataset Schema
 * 
 * TypeScript types and Zod schemas for training data that matches
 * the existing gold-output.json structure in /training/
 */

import { z } from 'zod';

// ============================================================================
// Base Resume Schema (matches gold-output.json)
// ============================================================================

export const ExperienceBulletSchema = z.string().min(10);

export const ExperienceSchema = z.object({
    company: z.string(),
    title: z.string(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    bullets: z.array(ExperienceBulletSchema).min(1),
});

export const EducationSchema = z.object({
    institution: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
});

export const CertificationSchema = z.object({
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
});

export const TrainingResumeSchema = z.object({
    // Core resume content
    summary: z.string().min(50).optional(),
    experience: z.array(ExperienceSchema),
    skills: z.array(z.string()),
    education: z.array(EducationSchema).optional(),
    certifications: z.array(CertificationSchema).optional(),

    // Metadata
    source: z.string().optional(),  // Dataset source identifier
    category: z.string().optional(), // Job category (e.g., "Accountant", "Engineer")
    qualityScore: z.number().min(0).max(1).optional(), // Quality assessment
});

export type TrainingResume = z.infer<typeof TrainingResumeSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Certification = z.infer<typeof CertificationSchema>;

// ============================================================================
// Job Description Schema
// ============================================================================

export const JobDescriptionSchema = z.object({
    // Core JD content
    title: z.string(),
    company: z.string().optional(),
    description: z.string().min(50),

    // Extracted requirements
    requiredSkills: z.array(z.string()).optional(),
    preferredSkills: z.array(z.string()).optional(),
    experienceYears: z.string().optional(),
    educationLevel: z.string().optional(),

    // Classification
    domain: z.string().optional(), // e.g., "FinTech", "Healthcare", "Tech"
    level: z.string().optional(),  // e.g., "Entry", "Mid", "Senior", "Executive"

    // Metadata
    source: z.string().optional(),
    publishedDate: z.string().optional(),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;

// ============================================================================
// Training Pair Schema (Resume + JD + Expected Score)
// ============================================================================

export const TrainingPairSchema = z.object({
    id: z.string(),
    resume: TrainingResumeSchema,
    jobDescription: JobDescriptionSchema,

    // Ground truth for training
    expectedAtsScore: z.number().min(0).max(100).optional(),
    humanRating: z.number().min(1).max(5).optional(),

    // Keyword matching ground truth
    matchedKeywords: z.array(z.string()).optional(),
    missingKeywords: z.array(z.string()).optional(),

    // Quality flags
    isGoodMatch: z.boolean().optional(),
    notes: z.string().optional(),
});

export type TrainingPair = z.infer<typeof TrainingPairSchema>;

// ============================================================================
// HuggingFace Dataset Response Types
// ============================================================================

export interface HuggingFaceDatasetInfo {
    id: string;
    downloads: number;
    likes: number;
    tags: string[];
    description?: string;
}

export interface HuggingFaceRow {
    [key: string]: unknown;
}

export interface HuggingFaceDatasetConfig {
    datasetId: string;
    split?: string;
    subset?: string;
    limit?: number;
    offset?: number;
}

// ============================================================================
// Dataset Loading Options
// ============================================================================

export interface LoadOptions {
    limit?: number;
    offset?: number;
    categories?: string[];
    minQualityScore?: number;
    shuffle?: boolean;
    seed?: number;
}

export interface DatasetStats {
    totalRecords: number;
    categoryCounts: Record<string, number>;
    avgQualityScore: number;
    dateRange?: { earliest: string; latest: string };
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateResume(data: unknown): TrainingResume | null {
    const result = TrainingResumeSchema.safeParse(data);
    return result.success ? result.data : null;
}

export function validateJobDescription(data: unknown): JobDescription | null {
    const result = JobDescriptionSchema.safeParse(data);
    return result.success ? result.data : null;
}

export function validateTrainingPair(data: unknown): TrainingPair | null {
    const result = TrainingPairSchema.safeParse(data);
    return result.success ? result.data : null;
}

// ============================================================================
// Dataset Source Identifiers
// ============================================================================

export const DATASET_SOURCES = {
    RESUME: {
        INFERENCE_PRINCE: 'huggingface:InferencePrince555/Resume-Dataset',
        MIKE_PFUNK: 'huggingface:MikePfunk28/resume-training-dataset',
        DATASETMASTER: 'huggingface:datasetmaster/resumes',
    },
    JOB_DESCRIPTION: {
        LANG_UK: 'huggingface:lang-uk/recruitment-dataset-job-descriptions-english',
        NXTGEN: 'huggingface:NxtGenIntern/job_titles_and_descriptions',
        JOB_SKILL_SET: 'huggingface:batuhanmtl/job-skill-set',
    },
} as const;

export type ResumeDatasetSource = typeof DATASET_SOURCES.RESUME[keyof typeof DATASET_SOURCES.RESUME];
export type JobDescriptionDatasetSource = typeof DATASET_SOURCES.JOB_DESCRIPTION[keyof typeof DATASET_SOURCES.JOB_DESCRIPTION];
