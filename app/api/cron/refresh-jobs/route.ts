import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { populateFreshJobs } from '@/lib/jobs/recommendations';
import { hasEnabledProviders } from '@/lib/jobs/providers';
import pLimit from 'p-limit';
import { timingSafeEqual } from 'crypto';

// Weekly cron job to refresh recommended jobs for all users
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/refresh-jobs", "schedule": "0 9 * * 1" }] }
// This runs every Monday at 9 AM UTC

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    console.log('🔄 Cron: Refresh Jobs - Started');

    // Verify cron secret (for security) using constant-time comparison
    const authHeader = request.headers.get('authorization');
    
    if (!CRON_SECRET) {
        console.error('❌ Cron: CRON_SECRET not configured');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Cron: Missing or invalid Authorization header');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Convert both to Buffers for constant-time comparison
    const secretBuffer = Buffer.from(CRON_SECRET, 'utf8');
    const tokenBuffer = Buffer.from(token, 'utf8');
    
    // Check lengths first to avoid timing differences from timingSafeEqual
    if (secretBuffer.length !== tokenBuffer.length) {
        console.error('❌ Cron: Unauthorized request (length mismatch)');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!timingSafeEqual(secretBuffer, tokenBuffer)) {
        console.error('❌ Cron: Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if job providers are enabled
    if (!hasEnabledProviders()) {
        console.log('⚠️ Cron: No job providers enabled, skipping refresh');
        return NextResponse.json({
            success: false,
            message: 'No job providers enabled',
            refreshed: 0,
        });
    }

    try {
        // Get users who have recommended jobs (i.e., have generated at least one resume)
        // Pagination: Query in batches of 1000 to handle datasets larger than Supabase's default limit
        // Uses .range() for efficient pagination, aggregating user_ids across all pages
        const PAGE_SIZE = 1000;
        const userIdSet = new Set<string>();
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const start = page * PAGE_SIZE;
            const end = start + PAGE_SIZE - 1;

            const { data: users, error: usersError } = await supabaseAdmin
                .from('recommended_jobs')
                .select('user_id')
                .order('user_id', { ascending: true })
                .range(start, end);

            if (usersError) {
                console.error(`❌ Cron: Failed to fetch users (page ${page}):`, usersError);
                return NextResponse.json(
                    { error: `Failed to fetch users at page ${page}`, details: usersError.message },
                    { status: 500 }
                );
            }

            // Break if no more results
            if (!users || users.length === 0) {
                hasMore = false;
                break;
            }

            // Aggregate user IDs from this page
            for (const u of users) {
                if (u.user_id) userIdSet.add(u.user_id);
            }

            // If we got fewer results than PAGE_SIZE, we've reached the end
            if (users.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                page++;
            }
        }

        const userIds: string[] = Array.from(userIdSet);
        console.log(`🔄 Cron: Refreshing jobs for ${userIds.length} users`);

        // Process users in parallel with controlled concurrency
        // Limit to 5 concurrent users to avoid overwhelming DB/third-party APIs
        const limit = pLimit(5);
        
        // Create promises for all users with concurrency control
        const userPromises = userIds.map((userId) =>
            limit(async () => {
                try {
                    const result = await populateFreshJobs(userId);
                    if (result.count > 0) {
                        console.log(`✅ Cron: Refreshed ${result.count} jobs for user ${userId.slice(0, 8)}...`);
                        return { success: true, userId, count: result.count };
                    } else {
                        console.log(`⚠️ Cron: No jobs found for user ${userId.slice(0, 8)}...`);
                        return { success: true, userId, count: 0 };
                    }
                } catch (err) {
                    console.error(`❌ Cron: Failed to refresh for user ${userId.slice(0, 8)}...`, err);
                    return { success: false, userId, error: err };
                }
            })
        );

        // Wait for all promises to settle (both success and failure)
        const results = await Promise.allSettled(userPromises);

        // Process results to count successes and failures
        let refreshed = 0;
        let failed = 0;

        for (const result of results) {
            if (result.status === 'fulfilled') {
                const userResult = result.value;
                if (userResult.success && userResult.count !== undefined && userResult.count > 0) {
                    refreshed++;
                } else if (!userResult.success) {
                    failed++;
                }
            } else {
                // Promise itself was rejected (shouldn't happen with our try/catch, but handle it)
                failed++;
                console.error('❌ Cron: Promise rejected:', result.reason);
            }
        }

        console.log(`🔄 Cron: Refresh complete. Success: ${refreshed}, Failed: ${failed}`);

        return NextResponse.json({
            success: true,
            totalUsers: userIds.length,
            refreshed,
            failed,
        });
    } catch (error: unknown) {
        console.error('❌ Cron: Refresh jobs error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
