import { supabaseAdmin } from '@/lib/supabase';

const FREE_MONTHLY_LIMIT = 5;
const DOCUMENT_LIMIT = 30;

export type GenerationAccessResult =
    | { allowed: true; remaining: number; hasUnlimited: boolean }
    | { allowed: false; reason: string; upgrade: true; monthlyUsed: number; monthlyLimit: number };

export type PremiumAccessResult =
    | { allowed: true; reason: 'legacy' | 'paid' }
    | { allowed: false; reason: string; upgrade: true };

export type DocumentUploadAccessResult =
    | { allowed: true; current: number; limit: number; remaining: number }
    | { allowed: false; reason: string; current: number; limit: number };


/**
 * Check if a user can generate a resume based on their subscription,
 * legacy status, and monthly usage.
 */
export async function checkGenerationAccess(userId: string): Promise<GenerationAccessResult> {
    // Get start of current month for usage calculation
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch user data, subscription, and monthly usage in parallel
    const [userResult, subscriptionResult, monthlyUsageResult] = await Promise.all([
        supabaseAdmin
            .from('users')
            .select('is_legacy, bonus_generations, bonus_generations_expires_at')
            .eq('id', userId)
            .single(),
        supabaseAdmin
            .from('user_subscriptions')
            .select('tier, status')
            .eq('user_id', userId)
            .single(),
        supabaseAdmin
            .from('resume_versions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth.toISOString()),
    ]);

    const userData = userResult.data;
    const subscriptionData = subscriptionResult.data;
    const monthlyUsed = monthlyUsageResult.count || 0;

    // Check for unlimited access (legacy or paid)
    const isLegacy = userData?.is_legacy || false;
    const isPaid = subscriptionData?.tier === 'standard' && subscriptionData?.status === 'active';
    const hasUnlimited = isLegacy || isPaid;

    if (hasUnlimited) {
        return { allowed: true, remaining: Infinity, hasUnlimited: true };
    }

    // Check bonus generations (with expiry)
    let activeBonusGenerations = 0;
    if (userData?.bonus_generations && userData.bonus_generations > 0) {
        if (userData.bonus_generations_expires_at) {
            const expiresAt = new Date(userData.bonus_generations_expires_at);
            if (expiresAt > new Date()) {
                activeBonusGenerations = userData.bonus_generations;
            }
        } else {
            // No expiry set, bonus is active
            activeBonusGenerations = userData.bonus_generations;
        }
    }

    const totalLimit = FREE_MONTHLY_LIMIT + activeBonusGenerations;
    const remaining = Math.max(0, totalLimit - monthlyUsed);

    if (remaining > 0) {
        return { allowed: true, remaining, hasUnlimited: false };
    }

    return {
        allowed: false,
        reason: 'You have reached your monthly generation limit. Upgrade to continue.',
        upgrade: true,
        monthlyUsed,
        monthlyLimit: totalLimit,
    };
}

/**
 * Check if a user has access to premium features (jobs, chat).
 * Premium access requires: legacy status OR active paid subscription.
 */
export async function checkPremiumAccess(userId: string): Promise<PremiumAccessResult> {
    // Fetch user and subscription in parallel
    let userResult, subscriptionResult;
    try {
        [userResult, subscriptionResult] = await Promise.all([
            supabaseAdmin
                .from('users')
                .select('is_legacy')
                .eq('id', userId)
                .single(),
            supabaseAdmin
                .from('user_subscriptions')
                .select('tier, status')
                .eq('user_id', userId)
                .single(),
        ]);
    } catch (error) {
        console.error('[checkPremiumAccess] Error fetching user or subscription:', error);
        throw new Error('Failed to check premium access: database query failed');
    }

    // Validate query results
    if (userResult.error) {
        console.error('[checkPremiumAccess] User query error:', userResult.error);
        throw new Error(`Failed to check premium access: ${userResult.error.message}`);
    }

    if (subscriptionResult.error && subscriptionResult.error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is acceptable for users without subscriptions
        console.error('[checkPremiumAccess] Subscription query error:', subscriptionResult.error);
        throw new Error(`Failed to check premium access: ${subscriptionResult.error.message}`);
    }

    const userData = userResult.data;
    const subscriptionData = subscriptionResult.data;

    // Handle null data cases
    if (!userData) {
        console.error('[checkPremiumAccess] User data is null for userId:', userId);
        throw new Error('Failed to check premium access: user not found');
    }

    // Legacy users have full access
    if (userData?.is_legacy) {
        return { allowed: true, reason: 'legacy' };
    }

    // Paid subscribers have full access
    if (subscriptionData?.tier === 'standard' && subscriptionData?.status === 'active') {
        return { allowed: true, reason: 'paid' };
    }

    return {
        allowed: false,
        reason: 'This feature requires a paid subscription.',
        upgrade: true,
    };
}

/**
 * Check if a user can upload a new document based on their current document count.
 * Limit: 30 documents per user.
 */
export async function checkDocumentUploadAccess(userId: string): Promise<DocumentUploadAccessResult> {
    const { count, error } = await supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error('Error checking document count:', error);
        // Allow upload on error to avoid blocking users due to transient issues
        return { allowed: true, current: 0, limit: DOCUMENT_LIMIT, remaining: DOCUMENT_LIMIT };
    }

    const current = count || 0;

    if (current >= DOCUMENT_LIMIT) {
        return {
            allowed: false,
            reason: `You have reached the maximum of ${DOCUMENT_LIMIT} documents. Delete some to upload more.`,
            current,
            limit: DOCUMENT_LIMIT,
        };
    }

    return {
        allowed: true,
        current,
        limit: DOCUMENT_LIMIT,
        remaining: DOCUMENT_LIMIT - current,
    };
}

