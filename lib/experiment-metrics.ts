/**
 * Experiment Metrics
 * 
 * Metric definitions and collection utilities for A/B testing.
 * Integrates with the resume generation pipeline.
 */

import { getABTestingManager, type MetricDefinition, type VariantConfig } from './ab-testing';

// ============================================================================
// Predefined Metric Sets
// ============================================================================

export const RESUME_GENERATION_METRICS: MetricDefinition[] = [
    // Quality Metrics
    { name: 'atsScore', type: 'continuous', description: 'ATS compatibility score (0-100)', higherIsBetter: true },
    { name: 'keywordCoverageScore', type: 'continuous', description: 'Keyword coverage (0-1)', higherIsBetter: true },
    { name: 'semanticFitScore', type: 'continuous', description: 'Semantic fit with JD (0-1)', higherIsBetter: true },
    { name: 'metricDensity', type: 'continuous', description: 'Density of quantified achievements', higherIsBetter: true },

    // AI Changes Metrics
    { name: 'bulletsRewritten', type: 'count', description: 'Number of bullets rewritten', higherIsBetter: true },
    { name: 'jdKeywordsAdded', type: 'count', description: 'JD keywords added to resume', higherIsBetter: true },
    { name: 'summaryChanged', type: 'binary', description: 'Summary was modified', higherIsBetter: true },
    { name: 'skillsChanged', type: 'binary', description: 'Skills were modified', higherIsBetter: true },

    // Performance Metrics
    { name: 'generationTimeMs', type: 'continuous', description: 'Total generation time (ms)', higherIsBetter: false },
    { name: 'qualityPassTimeMs', type: 'continuous', description: 'Quality pass time (ms)', higherIsBetter: false },
    { name: 'tokenCount', type: 'count', description: 'Total tokens used', higherIsBetter: false },

    // User Engagement (post-hoc)
    { name: 'downloadCount', type: 'count', description: 'Times user downloaded resume', higherIsBetter: true },
    { name: 'editCount', type: 'count', description: 'Manual edits by user', higherIsBetter: false },
];

// ============================================================================
// Metric Collector
// ============================================================================

export interface GenerationMetrics {
    // From ATS scorer
    atsScore: number;
    keywordCoverageScore: number;
    semanticFitScore: number;
    metricDensity: number;

    // From quality pass
    bulletsRewritten: number;
    jdKeywordsAdded: number;
    summaryChanged: boolean;
    skillsChanged: boolean;

    // Performance
    generationTimeMs: number;
    qualityPassTimeMs?: number;
    tokenCount?: number;
}

export class MetricCollector {
    private experimentId: string;
    private variantId: string;
    private userId?: string;
    private resumeVersionId?: string;
    private startTime: number;
    private metrics: Partial<GenerationMetrics> = {};

    constructor(
        experimentId: string,
        variantId: string,
        options?: { userId?: string; resumeVersionId?: string }
    ) {
        this.experimentId = experimentId;
        this.variantId = variantId;
        this.userId = options?.userId;
        this.resumeVersionId = options?.resumeVersionId;
        this.startTime = Date.now();
    }

    /**
     * Record a single metric
     */
    record<K extends keyof GenerationMetrics>(name: K, value: GenerationMetrics[K]): void {
        this.metrics[name] = value;
    }

    /**
     * Record multiple metrics at once
     */
    recordAll(metrics: Partial<GenerationMetrics>): void {
        Object.assign(this.metrics, metrics);
    }

    /**
     * Finalize and submit all collected metrics
     */
    submit(): void {
        // Calculate total time if not set
        if (!this.metrics.generationTimeMs) {
            this.metrics.generationTimeMs = Date.now() - this.startTime;
        }

        const manager = getABTestingManager();

        // Convert metrics to numeric values
        const numericMetrics: Record<string, number> = {};

        for (const [key, value] of Object.entries(this.metrics)) {
            if (typeof value === 'number') {
                numericMetrics[key] = value;
            } else if (typeof value === 'boolean') {
                numericMetrics[key] = value ? 1 : 0;
            }
        }

        manager.recordMetrics(this.experimentId, this.variantId, numericMetrics, {
            userId: this.userId,
            resumeVersionId: this.resumeVersionId,
        });
    }
}

// ============================================================================
// Experiment Helpers
// ============================================================================

/**
 * Get the active experiment config for a user
 */
export function getActiveExperimentConfig(
    userId: string,
    defaultConfig: VariantConfig = {}
): { experimentId: string | null; variantId: string | null; config: VariantConfig } {
    const manager = getABTestingManager();
    const activeExperiments = manager.listExperiments('active');

    // For now, only support one active experiment at a time
    const experiment = activeExperiments[0];
    if (!experiment) {
        return { experimentId: null, variantId: null, config: defaultConfig };
    }

    const variant = manager.getVariantForUser(userId, experiment.id);
    if (!variant) {
        return { experimentId: null, variantId: null, config: defaultConfig };
    }

    // Merge default config with variant config
    const mergedConfig = { ...defaultConfig, ...variant.config };

    return {
        experimentId: experiment.id,
        variantId: variant.id,
        config: mergedConfig,
    };
}

/**
 * Create a metric collector for the current generation
 */
export function createMetricCollector(
    experimentId: string | null,
    variantId: string | null,
    options?: { userId?: string; resumeVersionId?: string }
): MetricCollector | null {
    if (!experimentId || !variantId) {
        return null;
    }
    return new MetricCollector(experimentId, variantId, options);
}

// ============================================================================
// Pre-configured Experiments
// ============================================================================

export const EXPERIMENT_TEMPLATES = {
    /**
     * Test different keyword injection limits
     */
    keywordInjectionLimit: (baseConfig: VariantConfig = {}) => ({
        id: 'exp-keyword-injection-limit',
        name: 'Keyword Injection Limit Experiment',
        description: 'Test optimal number of JD keywords to inject',
        variants: [
            { id: 'low', name: 'Low (6 keywords)', weight: 0.33, config: { ...baseConfig, keywordInjectionLimit: 6 } },
            { id: 'medium', name: 'Medium (12 keywords)', weight: 0.34, config: { ...baseConfig, keywordInjectionLimit: 12 } },
            { id: 'high', name: 'High (18 keywords)', weight: 0.33, config: { ...baseConfig, keywordInjectionLimit: 18 } },
        ],
        metrics: RESUME_GENERATION_METRICS,
        status: 'draft' as const,
    }),

    /**
     * Test quality pass enabled vs disabled
     */
    qualityPassToggle: (baseConfig: VariantConfig = {}) => ({
        id: 'exp-quality-pass-toggle',
        name: 'Quality Pass Toggle Experiment',
        description: 'Measure impact of AI quality pass on resume quality',
        variants: [
            { id: 'without', name: 'Without Quality Pass', weight: 0.5, config: { ...baseConfig, qualityPassEnabled: false } },
            { id: 'with', name: 'With Quality Pass', weight: 0.5, config: { ...baseConfig, qualityPassEnabled: true } },
        ],
        metrics: RESUME_GENERATION_METRICS,
        status: 'draft' as const,
    }),

    /**
     * Test different model options
     */
    modelComparison: (baseConfig: VariantConfig = {}) => ({
        id: 'exp-model-comparison',
        name: 'Model Comparison Experiment',
        description: 'Compare GPT-4o vs GPT-4o-mini for quality/cost trade-off',
        variants: [
            { id: 'gpt4o', name: 'GPT-4o', weight: 0.5, config: { ...baseConfig, modelName: 'gpt-4o' } },
            { id: 'gpt4o-mini', name: 'GPT-4o-mini', weight: 0.5, config: { ...baseConfig, modelName: 'gpt-4o-mini' } },
        ],
        metrics: RESUME_GENERATION_METRICS,
        status: 'draft' as const,
    }),

    /**
     * Test semantic threshold tuning
     */
    semanticThreshold: (baseConfig: VariantConfig = {}) => ({
        id: 'exp-semantic-threshold',
        name: 'Semantic Threshold Experiment',
        description: 'Find optimal semantic similarity threshold for bullet selection',
        variants: [
            { id: 'loose', name: 'Loose (0.25)', weight: 0.33, config: { ...baseConfig, semanticThreshold: 0.25 } },
            { id: 'moderate', name: 'Moderate (0.30)', weight: 0.34, config: { ...baseConfig, semanticThreshold: 0.30 } },
            { id: 'strict', name: 'Strict (0.35)', weight: 0.33, config: { ...baseConfig, semanticThreshold: 0.35 } },
        ],
        metrics: RESUME_GENERATION_METRICS,
        status: 'draft' as const,
    }),
};

// ============================================================================
// Bootstrap Function
// ============================================================================

/**
 * Initialize an experiment from a template
 */
export function initializeExperiment(
    templateName: keyof typeof EXPERIMENT_TEMPLATES,
    baseConfig: VariantConfig = {}
): void {
    const manager = getABTestingManager();
    const template = EXPERIMENT_TEMPLATES[templateName](baseConfig);
    manager.createExperiment(template);
    console.log(`Initialized experiment: ${template.name}`);
}
