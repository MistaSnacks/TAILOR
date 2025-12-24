import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Persistence
// ============================================================================

const EXPERIMENTS_FILE = path.join(process.cwd(), 'training', 'cache', 'experiments.json');
const METRICS_FILE = path.join(process.cwd(), 'training', 'cache', 'experiment-metrics.json');

interface PersistedData {
    experiments: Experiment[];
    assignments: Record<string, Record<string, ExperimentAssignment>>;
}

function loadPersistedData(): PersistedData | null {
    try {
        if (fs.existsSync(EXPERIMENTS_FILE)) {
            const data = JSON.parse(fs.readFileSync(EXPERIMENTS_FILE, 'utf-8'));
            return data;
        }
    } catch (e) {
        console.warn('Failed to load persisted experiments:', e);
    }
    return null;
}

function savePersistedData(data: PersistedData): void {
    try {
        const dir = path.dirname(EXPERIMENTS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.warn('Failed to save experiments:', e);
    }
}

function loadMetrics(): MetricEvent[] {
    try {
        if (fs.existsSync(METRICS_FILE)) {
            return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
        }
    } catch (e) {
        console.warn('Failed to load metrics:', e);
    }
    return [];
}

function saveMetrics(metrics: MetricEvent[]): void {
    try {
        const dir = path.dirname(METRICS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
    } catch (e) {
        console.warn('Failed to save metrics:', e);
    }
}

// ============================================================================
// Types
// ============================================================================

export type ExperimentStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface VariantConfig {
    // Prompt/Model Config
    promptVersion?: string;
    modelName?: string;  // e.g., 'gpt-4o', 'gpt-4o-mini'

    // Quality Pass Config
    qualityPassEnabled?: boolean;
    keywordInjectionLimit?: number;
    maxBulletsPerExperience?: number;

    // Scoring Config
    semanticThreshold?: number;
    keywordThreshold?: number;

    // Custom parameters
    [key: string]: unknown;
}

export interface Variant {
    id: string;
    name: string;
    description?: string;
    weight: number;  // Traffic allocation (0-1)
    config: VariantConfig;
}

export interface MetricDefinition {
    name: string;
    type: 'continuous' | 'binary' | 'count' | 'ordinal';
    description?: string;
    higherIsBetter: boolean;
}

export interface Experiment {
    id: string;
    name: string;
    description?: string;
    hypothesis?: string;
    variants: Variant[]; // Must have at least one variant (enforced at creation)
    metrics: MetricDefinition[];
    status: ExperimentStatus;
    startDate?: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExperimentAssignment {
    experimentId: string;
    variantId: string;
    assignedAt: string;
}

export interface MetricEvent {
    experimentId: string;
    variantId: string;
    userId?: string;
    resumeVersionId?: string;
    metricName: string;
    metricValue: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface VariantStats {
    variantId: string;
    variantName: string;
    sampleSize: number;
    metrics: Record<string, {
        mean: number;
        stdDev: number;
        min: number;
        max: number;
        count: number;
    }>;
}

export interface ExperimentResults {
    experimentId: string;
    experimentName: string;
    status: ExperimentStatus;
    variantStats: VariantStats[];
    winner?: {
        variantId: string;
        confidence: number;
        lift: number;
        primaryMetric: string;
    };
}

// ============================================================================
// Default Metrics
// ============================================================================

export const DEFAULT_METRICS: MetricDefinition[] = [
    { name: 'atsScore', type: 'continuous', description: 'ATS compatibility score (0-100)', higherIsBetter: true },
    { name: 'generationTimeMs', type: 'continuous', description: 'Time to generate resume in ms', higherIsBetter: false },
    { name: 'bulletsRewritten', type: 'count', description: 'Number of bullets rewritten by AI', higherIsBetter: true },
    { name: 'keywordsAdded', type: 'count', description: 'Number of JD keywords added', higherIsBetter: true },
    { name: 'qualityScore', type: 'continuous', description: 'Overall quality score (0-1)', higherIsBetter: true },
];

// ============================================================================
// A/B Testing Manager
// ============================================================================

export class ABTestingManager {
    private experiments: Map<string, Experiment> = new Map();
    private assignments: Map<string, Map<string, ExperimentAssignment>> = new Map(); // userId -> experimentId -> assignment
    private metrics: MetricEvent[] = [];

    constructor() {
        // Load persisted experiments
        const persisted = loadPersistedData();
        if (persisted) {
            for (const exp of persisted.experiments) {
                // Validate loaded experiments have at least one variant
                if (!exp.variants || exp.variants.length === 0) {
                    console.warn(`Skipping invalid experiment ${exp.id}: has no variants`);
                    continue;
                }
                this.experiments.set(exp.id, exp);
            }
            for (const [userId, expAssignments] of Object.entries(persisted.assignments)) {
                const userMap = new Map<string, ExperimentAssignment>();
                for (const [expId, assignment] of Object.entries(expAssignments)) {
                    userMap.set(expId, assignment);
                }
                this.assignments.set(userId, userMap);
            }
            console.log(`Loaded ${this.experiments.size} experiments from disk`);
        }

        // Load metrics
        this.metrics = loadMetrics();
        if (this.metrics.length > 0) {
            console.log(`Loaded ${this.metrics.length} metric events from disk`);
        }
    }

    private persist(): void {
        const experiments = Array.from(this.experiments.values());
        const assignments: Record<string, Record<string, ExperimentAssignment>> = {};
        for (const [userId, expMap] of Array.from(this.assignments.entries())) {
            assignments[userId] = Object.fromEntries(expMap);
        }
        savePersistedData({ experiments, assignments });
    }

    private persistMetrics(): void {
        saveMetrics(this.metrics);
    }

    // --------------------------------
    // Experiment Management
    // --------------------------------

    createExperiment(experiment: Omit<Experiment, 'createdAt' | 'updatedAt'>): Experiment {
        // Validate that at least one variant is provided
        if (!experiment.variants || experiment.variants.length === 0) {
            throw new Error(`Experiment must have at least one variant, got ${experiment.variants?.length ?? 0} variants`);
        }

        const now = new Date().toISOString();
        const fullExperiment: Experiment = {
            ...experiment,
            createdAt: now,
            updatedAt: now,
        };

        // Validate variant weights sum to 1
        const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
        if (Math.abs(totalWeight - 1) > 0.001) {
            throw new Error(`Variant weights must sum to 1, got ${totalWeight}`);
        }

        this.experiments.set(experiment.id, fullExperiment);
        this.persist();
        return fullExperiment;
    }

    getExperiment(experimentId: string): Experiment | undefined {
        return this.experiments.get(experimentId);
    }

    listExperiments(status?: ExperimentStatus): Experiment[] {
        const all = Array.from(this.experiments.values());
        if (status) {
            return all.filter(e => e.status === status);
        }
        return all;
    }

    updateExperimentStatus(experimentId: string, status: ExperimentStatus): void {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new Error(`Experiment ${experimentId} not found`);
        }

        experiment.status = status;
        experiment.updatedAt = new Date().toISOString();

        if (status === 'active' && !experiment.startDate) {
            experiment.startDate = new Date().toISOString();
        }
        if (status === 'completed' && !experiment.endDate) {
            experiment.endDate = new Date().toISOString();
        }
        this.persist();
    }

    // --------------------------------
    // Variant Assignment
    // --------------------------------

    /**
     * Get the variant for a user in an experiment.
     * Uses deterministic hashing for consistent assignment.
     */
    getVariantForUser(userId: string, experimentId: string): Variant | null {
        const experiment = this.experiments.get(experimentId);
        if (!experiment || experiment.status !== 'active') {
            return null;
        }

        // Check if already assigned
        const userAssignments = this.assignments.get(userId);
        if (userAssignments?.has(experimentId)) {
            const assignment = userAssignments.get(experimentId)!;
            return experiment.variants.find(v => v.id === assignment.variantId) || null;
        }

        // Deterministic assignment using hash
        const variant = this.assignVariant(userId, experiment);

        // Store assignment
        if (!this.assignments.has(userId)) {
            this.assignments.set(userId, new Map());
        }
        this.assignments.get(userId)!.set(experimentId, {
            experimentId,
            variantId: variant.id,
            assignedAt: new Date().toISOString(),
        });
        this.persist();
        return variant;
    }

    private assignVariant(userId: string, experiment: Experiment): Variant {
        // Defensive check: variants should never be empty due to validation in createExperiment
        if (!experiment.variants || experiment.variants.length === 0) {
            throw new Error(`Experiment ${experiment.id} has no variants. This should never happen - experiments must have at least one variant.`);
        }

        // Create deterministic hash from userId + experimentId
        const hash = createHash('sha256')
            .update(`${userId}:${experiment.id}`)
            .digest('hex');

        // Convert first 8 hex chars to a number between 0-1
        const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

        // Select variant based on weights
        let cumulative = 0;
        for (const variant of experiment.variants) {
            cumulative += variant.weight;
            if (hashValue < cumulative) {
                return variant;
            }
        }

        // Fallback to last variant (shouldn't happen if weights sum to 1, but safe due to check above)
        return experiment.variants[experiment.variants.length - 1];
    }

    /**
     * Get the variant config for use in generation
     */
    getVariantConfig(userId: string, experimentId: string): VariantConfig | null {
        const variant = this.getVariantForUser(userId, experimentId);
        return variant?.config || null;
    }

    // --------------------------------
    // Metric Collection
    // --------------------------------

    /**
     * Add a metric to the array without persisting (internal use)
     */
    private addMetric(event: Omit<MetricEvent, 'createdAt'>): void {
        this.metrics.push({
            ...event,
            createdAt: new Date().toISOString(),
        });
    }

    /**
     * Record a metric value for an experiment
     */
    recordMetric(event: Omit<MetricEvent, 'createdAt'>): void {
        this.addMetric(event);
        this.persistMetrics();
    }

    /**
     * Record multiple metrics at once (convenience method)
     * Batches persistence for efficiency
     */
    recordMetrics(
        experimentId: string,
        variantId: string,
        metrics: Record<string, number>,
        context?: { userId?: string; resumeVersionId?: string; metadata?: Record<string, unknown> }
    ): void {
        for (const [name, value] of Object.entries(metrics)) {
            this.addMetric({
                experimentId,
                variantId,
                metricName: name,
                metricValue: value,
                userId: context?.userId,
                resumeVersionId: context?.resumeVersionId,
                metadata: context?.metadata,
            });
        }
        // Persist once after batching all metrics
        this.persistMetrics();
    }

    // --------------------------------
    // Analysis
    // --------------------------------

    /**
     * Get results for an experiment
     */
    getExperimentResults(experimentId: string): ExperimentResults | null {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            return null;
        }

        const experimentMetrics = this.metrics.filter(m => m.experimentId === experimentId);
        if (experimentMetrics.length === 0) {
            return {
                experimentId,
                experimentName: experiment.name,
                status: experiment.status,
                variantStats: experiment.variants.map(v => ({
                    variantId: v.id,
                    variantName: v.name,
                    sampleSize: 0,
                    metrics: {},
                })),
            };
        }

        // Group metrics by variant
        const variantMetrics = new Map<string, MetricEvent[]>();
        for (const variant of experiment.variants) {
            variantMetrics.set(variant.id, []);
        }
        for (const metric of experimentMetrics) {
            variantMetrics.get(metric.variantId)?.push(metric);
        }

        // Calculate stats for each variant
        const variantStats: VariantStats[] = experiment.variants.map(variant => {
            const metrics = variantMetrics.get(variant.id) || [];
            const uniqueUsers = new Set(metrics.map(m => m.userId || m.resumeVersionId)).size;

            // Group by metric name
            const metricsByName = new Map<string, number[]>();
            for (const m of metrics) {
                if (!metricsByName.has(m.metricName)) {
                    metricsByName.set(m.metricName, []);
                }
                metricsByName.get(m.metricName)!.push(m.metricValue);
            }

            // Calculate stats for each metric
            const metricStats: VariantStats['metrics'] = {};
            for (const entry of Array.from(metricsByName.entries())) {
                const [name, values] = entry;
                metricStats[name] = {
                    mean: mean(values),
                    stdDev: stdDev(values),
                    min: values.length > 0 ? Math.min(...values) : 0,
                    max: values.length > 0 ? Math.max(...values) : 0,
                    count: values.length,
                };
            }

            return {
                variantId: variant.id,
                variantName: variant.name,
                sampleSize: uniqueUsers,
                metrics: metricStats,
            };
        });

        // Determine winner (simple comparison for now)
        const primaryMetric = experiment.metrics[0]?.name || 'atsScore';
        const winner = this.determineWinner(variantStats, primaryMetric, experiment.metrics[0]?.higherIsBetter ?? true);

        return {
            experimentId,
            experimentName: experiment.name,
            status: experiment.status,
            variantStats,
            winner,
        };
    }

    private determineWinner(
        variantStats: VariantStats[],
        primaryMetric: string,
        higherIsBetter: boolean
    ): ExperimentResults['winner'] | undefined {
        // Need at least 2 variants with data
        const withData = variantStats.filter(v => v.metrics[primaryMetric]?.count >= 10);
        if (withData.length < 2) {
            return undefined;
        }

        // Sort by primary metric
        const sorted = [...withData].sort((a, b) => {
            const aVal = a.metrics[primaryMetric]?.mean || 0;
            const bVal = b.metrics[primaryMetric]?.mean || 0;
            return higherIsBetter ? bVal - aVal : aVal - bVal;
        });

        const best = sorted[0];
        const control = sorted[sorted.length - 1];

        if (!best.metrics[primaryMetric] || !control.metrics[primaryMetric]) {
            return undefined;
        }

        const bestMean = best.metrics[primaryMetric].mean;
        const controlMean = control.metrics[primaryMetric].mean;
        
        // Avoid division by zero
        if (controlMean === 0) {
            return undefined;
        }
        
        const lift = ((bestMean - controlMean) / controlMean) * 100;

        // Simple confidence calculation (would use proper t-test in production)
        const confidence = Math.min(0.99, 0.5 + (best.sampleSize / 1000));

        return {
            variantId: best.variantId,
            confidence,
            lift,
            primaryMetric,
        };
    }
}

// ============================================================================
// Statistical Helpers
// ============================================================================

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultManager: ABTestingManager | null = null;

export function getABTestingManager(): ABTestingManager {
    if (!defaultManager) {
        defaultManager = new ABTestingManager();
    }
    return defaultManager;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a simple 50/50 A/B test
 */
export function createSimpleABTest(
    id: string,
    name: string,
    controlConfig: VariantConfig,
    treatmentConfig: VariantConfig,
    metrics: MetricDefinition[] = DEFAULT_METRICS
): Experiment {
    return getABTestingManager().createExperiment({
        id,
        name,
        status: 'draft',
        variants: [
            { id: 'control', name: 'Control', weight: 0.5, config: controlConfig },
            { id: 'treatment', name: 'Treatment', weight: 0.5, config: treatmentConfig },
        ],
        metrics,
    });
}

/**
 * Quick check if a user should see the treatment variant
 */
export function isInTreatment(userId: string, experimentId: string): boolean {
    const variant = getABTestingManager().getVariantForUser(userId, experimentId);
    return variant?.id === 'treatment';
}
