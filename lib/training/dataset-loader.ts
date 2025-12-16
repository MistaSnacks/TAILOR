/**
 * Dataset Loader
 * 
 * Unified interface for loading training data from multiple sources.
 * Provides caching, filtering, and transformation capabilities.
 */

import {
    type TrainingResume,
    type JobDescription,
    type TrainingPair,
    type LoadOptions,
    type DatasetStats,
    DATASET_SOURCES,
} from './dataset-schema';
import { TrainingDataPipeline, getTrainingPipeline } from './training-data-pipeline';

// ============================================================================
// Dataset Loader Interface
// ============================================================================

export interface DatasetLoader {
    loadResumes(options?: LoadOptions): AsyncGenerator<TrainingResume>;
    loadJobDescriptions(options?: LoadOptions): AsyncGenerator<JobDescription>;
    loadTrainingPairs(options?: LoadOptions): AsyncGenerator<TrainingPair>;
    getStats(): Promise<DatasetStats>;
}

// ============================================================================
// Unified Dataset Loader Implementation
// ============================================================================

export class UnifiedDatasetLoader implements DatasetLoader {
    private pipeline: TrainingDataPipeline;
    private resumeCache: TrainingResume[] = [];
    private jdCache: JobDescription[] = [];
    private cacheLoaded = false;

    constructor(apiToken?: string) {
        this.pipeline = getTrainingPipeline(apiToken);
    }

    /**
     * Load resumes from all available sources
     */
    async *loadResumes(options: LoadOptions = {}): AsyncGenerator<TrainingResume> {
        const { limit = 1000, categories, minQualityScore = 0, shuffle = false, seed } = options;
        let loaded = 0;

        // Load from InferencePrince dataset (primary source)
        for await (const resume of this.pipeline.loadInferencePrinceResumes({ limit })) {
            // Apply filters
            if (minQualityScore > 0 && (resume.qualityScore || 0) < minQualityScore) {
                continue;
            }

            if (categories && categories.length > 0) {
                const category = resume.category?.toLowerCase() || '';
                if (!categories.some(c => category.includes(c.toLowerCase()))) {
                    continue;
                }
            }

            yield resume;
            loaded++;

            if (loaded >= limit) break;
        }
    }

    /**
     * Load job descriptions from all available sources
     */
    async *loadJobDescriptions(options: LoadOptions = {}): AsyncGenerator<JobDescription> {
        const { limit = 1000, categories } = options;
        let loaded = 0;

        // Load from lang-uk dataset (primary source - 142k records)
        const langUkLimit = Math.min(limit, 1000);
        for await (const jd of this.pipeline.loadLangUkJobDescriptions({ limit: langUkLimit, categories })) {
            yield jd;
            loaded++;
            if (loaded >= limit) break;
        }

        // Supplement with NxtGenIntern dataset if needed
        if (loaded < limit) {
            const remaining = limit - loaded;
            for await (const jd of this.pipeline.loadNxtGenJobDescriptions({ limit: remaining })) {
                yield jd;
                loaded++;
                if (loaded >= limit) break;
            }
        }
    }

    /**
     * Load pre-paired training data
     */
    async *loadTrainingPairs(options: LoadOptions = {}): AsyncGenerator<TrainingPair> {
        const { limit = 500 } = options;

        // Create pairs from loaded data
        yield* this.pipeline.createTrainingPairs({
            resumeLimit: Math.ceil(limit / 3),
            jdLimit: limit * 2,
            pairsPerResume: 3,
        });
    }

    /**
     * Get statistics about the loaded data
     */
    async getStats(): Promise<DatasetStats> {
        return this.pipeline.getResumeDatasetStats(500);
    }

    /**
     * Preload data into cache for faster access
     */
    async preloadCache(options: { resumeLimit?: number; jdLimit?: number } = {}): Promise<void> {
        const { resumeLimit = 500, jdLimit = 1000 } = options;

        console.log('Preloading cache...');

        // Load resumes
        this.resumeCache = [];
        for await (const resume of this.loadResumes({ limit: resumeLimit })) {
            this.resumeCache.push(resume);
        }
        console.log(`Cached ${this.resumeCache.length} resumes`);

        // Load job descriptions
        this.jdCache = [];
        for await (const jd of this.loadJobDescriptions({ limit: jdLimit })) {
            this.jdCache.push(jd);
        }
        console.log(`Cached ${this.jdCache.length} job descriptions`);

        this.cacheLoaded = true;
    }

    /**
     * Get cached resumes (must call preloadCache first)
     */
    getCachedResumes(): TrainingResume[] {
        if (!this.cacheLoaded) {
            throw new Error('Cache not loaded. Call preloadCache() first.');
        }
        return this.resumeCache;
    }

    /**
     * Get cached job descriptions (must call preloadCache first)
     */
    getCachedJobDescriptions(): JobDescription[] {
        if (!this.cacheLoaded) {
            throw new Error('Cache not loaded. Call preloadCache() first.');
        }
        return this.jdCache;
    }

    /**
     * Get a random sample from cached data
     */
    getRandomSample(count: number): { resumes: TrainingResume[]; jobDescriptions: JobDescription[] } {
        if (!this.cacheLoaded) {
            throw new Error('Cache not loaded. Call preloadCache() first.');
        }

        const shuffledResumes = [...this.resumeCache].sort(() => Math.random() - 0.5);
        const shuffledJds = [...this.jdCache].sort(() => Math.random() - 0.5);

        return {
            resumes: shuffledResumes.slice(0, count),
            jobDescriptions: shuffledJds.slice(0, count),
        };
    }
}

// ============================================================================
// Convenience Functions
// ============================================================================

let defaultLoader: UnifiedDatasetLoader | null = null;

export function getDatasetLoader(apiToken?: string): UnifiedDatasetLoader {
    if (!defaultLoader) {
        defaultLoader = new UnifiedDatasetLoader(apiToken);
    }
    return defaultLoader;
}

/**
 * Quick function to load N resumes
 */
export async function loadResumes(limit = 100, apiToken?: string): Promise<TrainingResume[]> {
    const loader = getDatasetLoader(apiToken);
    const resumes: TrainingResume[] = [];

    for await (const resume of loader.loadResumes({ limit })) {
        resumes.push(resume);
    }

    return resumes;
}

/**
 * Quick function to load N job descriptions
 */
export async function loadJobDescriptions(limit = 100, apiToken?: string): Promise<JobDescription[]> {
    const loader = getDatasetLoader(apiToken);
    const jds: JobDescription[] = [];

    for await (const jd of loader.loadJobDescriptions({ limit })) {
        jds.push(jd);
    }

    return jds;
}

// ============================================================================
// Export Types
// ============================================================================

export type { TrainingResume, JobDescription, TrainingPair, LoadOptions, DatasetStats };
export { DATASET_SOURCES };
