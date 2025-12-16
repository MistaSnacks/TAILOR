#!/usr/bin/env npx tsx
/**
 * Experiment Report Script
 * 
 * Generate and display experiment results.
 * 
 * Usage:
 *   npx tsx scripts/experiment-report.ts [options]
 * 
 * Options:
 *   --id ID         Experiment ID to report on
 *   --list          List all experiments
 *   --create NAME   Create a new experiment from template
 *   --activate ID   Activate an experiment
 *   --complete ID   Mark experiment as completed
 */

import {
    getABTestingManager,
    createSimpleABTest,
    type Experiment,
    type ExperimentResults,
} from '../lib/ab-testing';
import { EXPERIMENT_TEMPLATES, initializeExperiment } from '../lib/experiment-metrics';

// ============================================================================
// CLI Arguments
// ============================================================================

interface Args {
    id?: string;
    list: boolean;
    create?: string;
    activate?: string;
    complete?: string;
}

function parseArgs(): Args {
    const args: Args = {
        list: false,
    };

    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--id':
                args.id = argv[++i];
                break;
            case '--list':
                args.list = true;
                break;
            case '--create':
                args.create = argv[++i];
                break;
            case '--activate':
                args.activate = argv[++i];
                break;
            case '--complete':
                args.complete = argv[++i];
                break;
        }
    }

    return args;
}

// ============================================================================
// Display Functions
// ============================================================================

function displayExperimentList(experiments: Experiment[]): void {
    console.log('\n=== Experiments ===\n');

    if (experiments.length === 0) {
        console.log('No experiments found.');
        console.log('\nAvailable templates:');
        for (const name of Object.keys(EXPERIMENT_TEMPLATES)) {
            console.log(`  - ${name}`);
        }
        console.log('\nCreate one with: npx tsx scripts/experiment-report.ts --create <template-name>');
        return;
    }

    for (const exp of experiments) {
        const statusIcon = {
            draft: '📝',
            active: '🟢',
            paused: '⏸️',
            completed: '✅',
        }[exp.status] || '❓';

        console.log(`${statusIcon} ${exp.id}`);
        console.log(`   Name: ${exp.name}`);
        console.log(`   Status: ${exp.status}`);
        console.log(`   Variants: ${exp.variants.map(v => v.name).join(', ')}`);
        if (exp.startDate) {
            console.log(`   Started: ${exp.startDate}`);
        }
        console.log('');
    }
}

function displayExperimentResults(results: ExperimentResults): void {
    console.log('\n=== Experiment Results ===\n');
    console.log(`Experiment: ${results.experimentName}`);
    console.log(`Status: ${results.status}`);
    console.log('');

    // Display variant stats
    for (const variant of results.variantStats) {
        console.log(`📊 ${variant.variantName} (n=${variant.sampleSize})`);

        if (Object.keys(variant.metrics).length === 0) {
            console.log('   No data collected yet');
        } else {
            for (const [metricName, stats] of Object.entries(variant.metrics)) {
                console.log(`   ${metricName}: mean=${stats.mean.toFixed(3)} ±${stats.stdDev.toFixed(3)} (n=${stats.count})`);
            }
        }
        console.log('');
    }

    // Display winner if determined
    if (results.winner) {
        console.log('🏆 Winner Analysis:');
        console.log(`   Variant: ${results.winner.variantId}`);
        console.log(`   Primary Metric: ${results.winner.primaryMetric}`);
        console.log(`   Lift: ${results.winner.lift > 0 ? '+' : ''}${results.winner.lift.toFixed(2)}%`);
        console.log(`   Confidence: ${(results.winner.confidence * 100).toFixed(1)}%`);
    } else {
        console.log('⏳ No winner determined yet (need more data)');
    }
}

// ============================================================================
// Actions
// ============================================================================

function listExperiments(): void {
    const manager = getABTestingManager();
    const experiments = manager.listExperiments();
    displayExperimentList(experiments);
}

function showExperimentResults(experimentId: string): void {
    const manager = getABTestingManager();
    const results = manager.getExperimentResults(experimentId);

    if (!results) {
        console.error(`Experiment '${experimentId}' not found`);
        process.exit(1);
    }

    displayExperimentResults(results);
}

function createExperiment(templateName: string): void {
    const validTemplates = Object.keys(EXPERIMENT_TEMPLATES);

    if (!validTemplates.includes(templateName)) {
        console.error(`Unknown template: ${templateName}`);
        console.log('\nAvailable templates:');
        for (const name of validTemplates) {
            console.log(`  - ${name}`);
        }
        process.exit(1);
    }

    initializeExperiment(templateName as keyof typeof EXPERIMENT_TEMPLATES);
    console.log(`\n✅ Created experiment from template: ${templateName}`);
    console.log('   Activate with: --activate <experiment-id>');
}

function activateExperiment(experimentId: string): void {
    const manager = getABTestingManager();

    try {
        manager.updateExperimentStatus(experimentId, 'active');
        console.log(`\n✅ Activated experiment: ${experimentId}`);
    } catch (error) {
        console.error(`Failed to activate: ${error}`);
        process.exit(1);
    }
}

function completeExperiment(experimentId: string): void {
    const manager = getABTestingManager();

    try {
        manager.updateExperimentStatus(experimentId, 'completed');
        console.log(`\n✅ Completed experiment: ${experimentId}`);

        // Show final results
        showExperimentResults(experimentId);
    } catch (error) {
        console.error(`Failed to complete: ${error}`);
        process.exit(1);
    }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
    const args = parseArgs();

    if (args.create) {
        createExperiment(args.create);
        return;
    }

    if (args.activate) {
        activateExperiment(args.activate);
        return;
    }

    if (args.complete) {
        completeExperiment(args.complete);
        return;
    }

    if (args.id) {
        showExperimentResults(args.id);
        return;
    }

    // Default: list all experiments
    listExperiments();
}

main();
