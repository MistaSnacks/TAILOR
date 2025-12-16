/**
 * Training Data Pipeline
 * 
 * Fetches and processes training data from HuggingFace datasets.
 * Supports resume datasets, job description datasets, and creates training pairs.
 */

import {
    type TrainingResume,
    type JobDescription,
    type TrainingPair,
    type HuggingFaceDatasetConfig,
    type LoadOptions,
    type DatasetStats,
    DATASET_SOURCES,
    validateResume,
    validateJobDescription,
} from './dataset-schema';
import { transformResumeText } from './transform-resume';

// ============================================================================
// HuggingFace API Client
// ============================================================================

const HUGGINGFACE_API_BASE = 'https://datasets-server.huggingface.co';

interface HuggingFaceResponse {
    features: Record<string, unknown>;
    rows: Array<{ row: Record<string, unknown> }>;
    num_rows_total: number;
    num_rows_per_page: number;
}

export class HuggingFaceClient {
    private apiToken?: string;

    constructor(apiToken?: string) {
        this.apiToken = apiToken || process.env.HUGGINGFACE_API_TOKEN;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (this.apiToken) {
            headers['Authorization'] = `Bearer ${this.apiToken}`;
        }
        return headers;
    }

    async fetchRows(config: HuggingFaceDatasetConfig): Promise<HuggingFaceResponse> {
        const { datasetId, split = 'train', subset = 'default', limit = 100, offset = 0 } = config;

        const url = new URL(`${HUGGINGFACE_API_BASE}/rows`);
        url.searchParams.set('dataset', datasetId);
        url.searchParams.set('config', subset);
        url.searchParams.set('split', split);
        url.searchParams.set('offset', offset.toString());
        url.searchParams.set('length', Math.min(limit, 100).toString()); // API max is 100

        const response = await fetch(url.toString(), {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async getDatasetInfo(datasetId: string): Promise<{ num_rows: number }> {
        const url = new URL(`${HUGGINGFACE_API_BASE}/info`);
        url.searchParams.set('dataset', datasetId);

        const response = await fetch(url.toString(), {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const defaultSplit = data.dataset_info?.default?.splits?.train;
        return { num_rows: defaultSplit?.num_rows || 0 };
    }
}

// ============================================================================
// Dataset Loaders
// ============================================================================

export class TrainingDataPipeline {
    private client: HuggingFaceClient;
    private cache: Map<string, TrainingResume | JobDescription> = new Map();

    constructor(apiToken?: string) {
        this.client = new HuggingFaceClient(apiToken);
    }

    /**
     * Load resumes from InferencePrince555/Resume-Dataset
     * Format: { instruction, input, Resume_test }
     */
    async *loadInferencePrinceResumes(options: LoadOptions = {}): AsyncGenerator<TrainingResume> {
        const { limit = 1000, offset = 0 } = options;
        const datasetId = 'InferencePrince555/Resume-Dataset';

        let currentOffset = offset;
        let loaded = 0;

        while (loaded < limit) {
            const batchSize = Math.min(100, limit - loaded);

            try {
                const response = await this.client.fetchRows({
                    datasetId,
                    limit: batchSize,
                    offset: currentOffset,
                });

                if (response.rows.length === 0) break;

                for (const { row } of response.rows) {
                    const resumeText = row.Resume_test as string;
                    const instruction = row.instruction as string;

                    // Extract category from instruction (e.g., "Generate a Resume for a Accountant Job")
                    const categoryMatch = instruction?.match(/for\s+(?:a|an)\s+(.+?)\s+Job/i);
                    const category = categoryMatch?.[1];

                    const resume = transformResumeText(resumeText, {
                        category,
                        source: DATASET_SOURCES.RESUME.INFERENCE_PRINCE,
                    });

                    if (resume) {
                        yield resume;
                        loaded++;
                        if (loaded >= limit) break;
                    }
                }

                currentOffset += batchSize;
            } catch (error) {
                console.error(`Error fetching from ${datasetId}:`, error);
                break;
            }
        }

        console.log(`Loaded ${loaded} resumes from InferencePrince555/Resume-Dataset`);
    }

    /**
     * Load job descriptions from lang-uk/recruitment-dataset-job-descriptions-english
     * Format: { Position, Long Description, Company Name, Exp Years, Primary Keyword, English Level }
     */
    async *loadLangUkJobDescriptions(options: LoadOptions = {}): AsyncGenerator<JobDescription> {
        const { limit = 1000, offset = 0, categories } = options;
        const datasetId = 'lang-uk/recruitment-dataset-job-descriptions-english';

        let currentOffset = offset;
        let loaded = 0;

        while (loaded < limit) {
            const batchSize = Math.min(100, limit - loaded);

            try {
                const response = await this.client.fetchRows({
                    datasetId,
                    limit: batchSize,
                    offset: currentOffset,
                });

                if (response.rows.length === 0) break;

                for (const { row } of response.rows) {
                    const jd: JobDescription = {
                        title: row.Position as string || 'Unknown',
                        company: row['Company Name'] as string,
                        description: row['Long Description'] as string || '',
                        experienceYears: row['Exp Years'] as string,
                        domain: row['Primary Keyword'] as string,
                        source: DATASET_SOURCES.JOB_DESCRIPTION.LANG_UK,
                    };

                    // Filter by category if specified
                    if (categories && categories.length > 0) {
                        const domain = jd.domain?.toLowerCase() || '';
                        if (!categories.some(c => domain.includes(c.toLowerCase()))) {
                            continue;
                        }
                    }

                    // Extract skills from description
                    jd.requiredSkills = extractSkillsFromJd(jd.description);

                    const validated = validateJobDescription(jd);
                    if (validated) {
                        yield validated;
                        loaded++;
                        if (loaded >= limit) break;
                    }
                }

                currentOffset += batchSize;
            } catch (error) {
                console.error(`Error fetching from ${datasetId}:`, error);
                break;
            }
        }

        console.log(`Loaded ${loaded} job descriptions from lang-uk dataset`);
    }

    /**
     * Load job descriptions from NxtGenIntern dataset
     * Format: { Job Title, Required Skills, Job Description }
     */
    async *loadNxtGenJobDescriptions(options: LoadOptions = {}): AsyncGenerator<JobDescription> {
        const { limit = 1000, offset = 0 } = options;
        const datasetId = 'NxtGenIntern/job_titles_and_descriptions';

        let currentOffset = offset;
        let loaded = 0;

        while (loaded < limit) {
            const batchSize = Math.min(100, limit - loaded);

            try {
                const response = await this.client.fetchRows({
                    datasetId,
                    limit: batchSize,
                    offset: currentOffset,
                });

                if (response.rows.length === 0) break;

                for (const { row } of response.rows) {
                    const requiredSkillsStr = row['Required Skills'] as string || '';

                    const jd: JobDescription = {
                        title: row['Job Title'] as string || 'Unknown',
                        description: row['Job Description'] as string || '',
                        requiredSkills: requiredSkillsStr.split(',').map(s => s.trim()).filter(Boolean),
                        domain: 'IT', // This dataset is IT-focused
                        source: DATASET_SOURCES.JOB_DESCRIPTION.NXTGEN,
                    };

                    const validated = validateJobDescription(jd);
                    if (validated) {
                        yield validated;
                        loaded++;
                        if (loaded >= limit) break;
                    }
                }

                currentOffset += batchSize;
            } catch (error) {
                console.error(`Error fetching from ${datasetId}:`, error);
                break;
            }
        }

        console.log(`Loaded ${loaded} job descriptions from NxtGenIntern dataset`);
    }

    /**
     * Create training pairs by matching resumes with job descriptions
     */
    async *createTrainingPairs(options: {
        resumeLimit?: number;
        jdLimit?: number;
        pairsPerResume?: number;
    } = {}): AsyncGenerator<TrainingPair> {
        const { resumeLimit = 100, jdLimit = 500, pairsPerResume = 3 } = options;

        // Load job descriptions into memory for matching
        const jobDescriptions: JobDescription[] = [];
        for await (const jd of this.loadLangUkJobDescriptions({ limit: jdLimit })) {
            jobDescriptions.push(jd);
        }

        console.log(`Loaded ${jobDescriptions.length} JDs for pairing`);

        // Create pairs for each resume
        let pairId = 0;
        for await (const resume of this.loadInferencePrinceResumes({ limit: resumeLimit })) {
            // Find matching JDs based on category/skills overlap
            const matchingJds = findMatchingJobDescriptions(resume, jobDescriptions, pairsPerResume);

            for (const jd of matchingJds) {
                const pair: TrainingPair = {
                    id: `pair-${++pairId}`,
                    resume,
                    jobDescription: jd,
                    // These would be computed or labeled separately
                    expectedAtsScore: undefined,
                    matchedKeywords: undefined,
                    missingKeywords: undefined,
                };

                yield pair;
            }
        }

        console.log(`Created ${pairId} training pairs`);
    }

    /**
     * Get statistics about a dataset
     */
    async getResumeDatasetStats(limit = 1000): Promise<DatasetStats> {
        const categoryCounts: Record<string, number> = {};
        let totalRecords = 0;
        let totalQualityScore = 0;

        for await (const resume of this.loadInferencePrinceResumes({ limit })) {
            totalRecords++;
            totalQualityScore += resume.qualityScore || 0;

            const category = resume.category || 'Unknown';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }

        return {
            totalRecords,
            categoryCounts,
            avgQualityScore: totalRecords > 0 ? totalQualityScore / totalRecords : 0,
        };
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractSkillsFromJd(description: string): string[] {
    const skills: string[] = [];
    const seen = new Set<string>();

    // Common skill patterns
    const skillPatterns = [
        /\b(python|java|javascript|typescript|sql|react|angular|vue|node\.?js|aws|azure|gcp|docker|kubernetes)\b/gi,
        /\b(machine learning|deep learning|data science|nlp|computer vision)\b/gi,
        /\b(project management|agile|scrum|kanban|jira|confluence)\b/gi,
        /\b(communication|leadership|problem[ -]solving|analytical|teamwork)\b/gi,
        /\b(excel|powerpoint|word|google sheets|tableau|power bi)\b/gi,
    ];

    for (const pattern of skillPatterns) {
        const matches = description.match(pattern);
        if (matches) {
            for (const match of matches) {
                const normalized = match.toLowerCase();
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    skills.push(match);
                }
            }
        }
    }

    return skills.slice(0, 20);
}

function findMatchingJobDescriptions(
    resume: TrainingResume,
    jobDescriptions: JobDescription[],
    limit: number
): JobDescription[] {
    const resumeSkills = new Set(resume.skills.map(s => s.toLowerCase()));
    const resumeCategory = resume.category?.toLowerCase() || '';

    // Score each JD based on skill overlap
    const scored = jobDescriptions.map(jd => {
        let score = 0;

        // Category match (high weight)
        if (jd.domain?.toLowerCase().includes(resumeCategory) ||
            jd.title?.toLowerCase().includes(resumeCategory)) {
            score += 10;
        }

        // Skill overlap
        const jdSkills = new Set([
            ...(jd.requiredSkills || []).map(s => s.toLowerCase()),
            ...(jd.preferredSkills || []).map(s => s.toLowerCase()),
        ]);

        for (const skill of Array.from(resumeSkills)) {
            if (jdSkills.has(skill)) {
                score += 2;
            }
        }

        return { jd, score };
    });

    // Sort by score and return top matches
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.jd);
}

// ============================================================================
// Export singleton for convenience
// ============================================================================

let defaultPipeline: TrainingDataPipeline | null = null;

export function getTrainingPipeline(apiToken?: string): TrainingDataPipeline {
    if (!defaultPipeline) {
        defaultPipeline = new TrainingDataPipeline(apiToken);
    }
    return defaultPipeline;
}
