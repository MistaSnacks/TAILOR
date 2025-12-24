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
    private readonly apiToken?: string;

    constructor(apiToken?: string) {
        this.apiToken = apiToken;
        this.pipeline = getTrainingPipeline(apiToken);
    }

    /**
     * Get the API token used by this loader instance
     */
    getApiToken(): string | undefined {
        return this.apiToken;
    }

    /**
     * Load resumes from all available sources
     */
    async *loadResumes(options: LoadOptions = {}): AsyncGenerator<TrainingResume> {
        const { limit = 1000, categories, minQualityScore = 0, shuffle = false, seed } = options;

        // If shuffle is enabled, collect into array first
        if (shuffle) {
            const resumes: TrainingResume[] = [];
            
            // Load from InferencePrince dataset (primary source)
            for await (const resume of this.pipeline.loadInferencePrinceResumes({ limit: limit * 2 })) {
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

                resumes.push(resume);
                if (resumes.length >= limit * 2) break; // Collect extra for shuffling
            }

            // Shuffle the collected resumes
            const shuffled = this.shuffleArray(resumes, seed);
            
            // Yield up to limit
            for (let i = 0; i < Math.min(shuffled.length, limit); i++) {
                yield shuffled[i];
            }
        } else {
            // Stream without shuffling (original behavior)
            let loaded = 0;

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
    }

    /**
     * Shuffle an array using Fisher-Yates algorithm
     * Supports optional seed for deterministic shuffling
     */
    private shuffleArray<T>(array: T[], seed?: number): T[] {
        const shuffled = [...array];
        const n = shuffled.length;

        if (seed !== undefined) {
            // Seeded PRNG using Linear Congruential Generator
            let rng = seed;
            const lcg = () => {
                rng = (rng * 1664525 + 1013904223) % 2**32;
                return rng / 2**32;
            };

            // Fisher-Yates with seeded PRNG
            for (let i = n - 1; i > 0; i--) {
                const j = Math.floor(lcg() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
        } else {
            // Fisher-Yates with Math.random()
            for (let i = n - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
        }

        return shuffled;
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

        // Use Fisher-Yates shuffle for uniform distribution
        const shuffledResumes = this.shuffleArray([...this.resumeCache]);
        const shuffledJds = this.shuffleArray([...this.jdCache]);

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
    // Recreate if token changes (including from defined to undefined)
    if (!defaultLoader || defaultLoader.getApiToken() !== apiToken) {
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
