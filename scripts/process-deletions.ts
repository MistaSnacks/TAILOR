#!/usr/bin/env tsx
/**
 * Process Scheduled Deletions Script
 * 
 * Executes account deletions that have reached their scheduled deletion date.
 * Should be run periodically (e.g., daily via cron job).
 * 
 * Usage:
 *   npx tsx scripts/process-deletions.ts           # Execute pending deletions
 *   npx tsx scripts/process-deletions.ts --dry-run # Preview what would be deleted
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

// Stripe API version constant - update when Stripe releases new API versions
// Using const assertion for type safety without 'as any' cast
const STRIPE_API_VERSION = '2025-12-15.clover' as const;

const stripe = stripeKey ? new Stripe(stripeKey, {
    apiVersion: STRIPE_API_VERSION,
}) : null;

interface ScheduledDeletion {
    id: string;
    user_id: string;
    scheduled_for: string;
    status: string;
}

interface User {
    id: string;
    email: string | null;
    name: string | null;
}

interface Subscription {
    stripe_customer_id: string | null;
}

async function getPendingDeletions(): Promise<(ScheduledDeletion & { user: User | null })[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('scheduled_deletions')
        .select(`
            id,
            user_id,
            scheduled_for,
            status,
            user:users(id, email, name)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', now);

    if (error) {
        console.error('❌ Error fetching scheduled deletions:', error);
        return [];
    }

    return (data || []).map(d => ({
        ...d,
        user: Array.isArray(d.user) ? d.user[0] : d.user
    }));
}

async function cancelStripeSubscriptions(customerId: string): Promise<void> {
    if (!stripe) {
        console.log('   ⚠️  Stripe not configured, skipping subscription cancellation');
        return;
    }

    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
        });

        for (const subscription of subscriptions.data) {
            await stripe.subscriptions.cancel(subscription.id);
            console.log(`   ✅ Cancelled Stripe subscription: ${subscription.id}`);
        }

        await stripe.customers.del(customerId);
        console.log(`   ✅ Deleted Stripe customer: ${customerId}`);
    } catch (error: any) {
        if (error.code !== 'resource_missing') {
            console.error(`   ⚠️  Stripe error:`, error.message);
        }
    }
}

async function deleteUser(deletion: ScheduledDeletion & { user: User | null }): Promise<boolean> {
    if (!deletion.user) {
        console.log(`   ⚠️  User not found for deletion ${deletion.id}, marking as completed`);
        await supabaseAdmin
            .from('scheduled_deletions')
            .update({ status: 'completed' })
            .eq('id', deletion.id);
        return true;
    }

    try {
        // Check for Stripe subscription
        const { data: subscription } = await supabaseAdmin
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', deletion.user_id)
            .maybeSingle() as { data: Subscription | null };

        if (subscription?.stripe_customer_id) {
            await cancelStripeSubscriptions(subscription.stripe_customer_id);
        }

        // Delete user (CASCADE handles all related data)
        const { error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', deletion.user_id);

        if (deleteError) {
            console.error(`   ❌ Error deleting user:`, deleteError);
            return false;
        }

        // Update deletion record (if it still exists after CASCADE)
        await supabaseAdmin
            .from('scheduled_deletions')
            .update({ status: 'completed' })
            .eq('id', deletion.id);

        console.log(`   ✅ User deleted successfully`);
        return true;
    } catch (error) {
        console.error(`   ❌ Error during deletion:`, error);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('🔍 Checking for scheduled deletions...\n');

    const pendingDeletions = await getPendingDeletions();

    if (pendingDeletions.length === 0) {
        console.log('✅ No pending deletions found');
        return;
    }

    console.log(`📋 Found ${pendingDeletions.length} deletion(s) ready to process:\n`);

    for (const deletion of pendingDeletions) {
        const userName = deletion.user?.name || 'Unknown';
        const userEmail = deletion.user?.email || 'Unknown';
        const scheduledDate = new Date(deletion.scheduled_for).toLocaleDateString();

        console.log(`👤 ${userName} (${userEmail})`);
        console.log(`   Scheduled for: ${scheduledDate}`);
        console.log(`   User ID: ${deletion.user_id}`);

        if (isDryRun) {
            console.log(`   ⏭️  DRY RUN - Would delete this user\n`);
        } else {
            const success = await deleteUser(deletion);
            console.log(success ? '' : '   ❌ Deletion failed\n');
        }
    }

    if (isDryRun) {
        console.log('\n⚠️  This was a DRY RUN - no data was deleted');
    } else {
        console.log(`\n✅ Processed ${pendingDeletions.length} scheduled deletion(s)`);
    }
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
