import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescriptionToContext } from '@/lib/rag/parser';
import { requireAuth } from '@/lib/auth-utils';
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limit';

/**
 * Parse Job Description API
 * 
 * POST /api/jobs/parse
 *   - Parses a job description and extracts title, company, and other metadata
 *   - Used by the generation page for real-time JD parsing
 *   - Requires authentication and rate limiting (10 requests per minute per user)
 */
export async function POST(request: NextRequest) {
    console.log('🔍 Jobs Parse API - POST request received');

    try {
        // Require authentication
        const userId = await requireAuth();
        console.log('🔐 Jobs Parse API - User authenticated:', userId ? '✅' : '❌');

        // Rate limiting: 10 requests per minute per user (expensive Gemini API calls)
        const rateLimit = checkRateLimit(userId, 'jobs/parse', RateLimitPresets.STRICT);
        
        if (!rateLimit.allowed) {
            console.warn('⚠️ Jobs Parse API - User rate limited');
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    message: `Too many requests. Please try again after ${new Date(rateLimit.resetAt).toISOString()}`,
                    resetAt: rateLimit.resetAt,
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': rateLimit.limit.toString(),
                        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
                        'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
                    },
                }
            );
        }

        console.log('✅ Jobs Parse API - Rate limit check passed:', {
            remaining: rateLimit.remaining,
            resetAt: new Date(rateLimit.resetAt).toISOString(),
        });

        const body = await request.json();
        const { description } = body;

        if (!description || typeof description !== 'string') {
            return NextResponse.json(
                { error: 'Description is required' },
                { status: 400 }
            );
        }

        // Minimum length check to avoid wasting API calls on incomplete input
        if (description.trim().length < 50) {
            return NextResponse.json(
                { error: 'Description too short to parse' },
                { status: 400 }
            );
        }

        console.log('🔍 Parsing JD, length:', description.length);

        const parsed = await parseJobDescriptionToContext({ description });

        console.log('✅ JD parsed successfully:', {
            title: parsed.normalizedTitle,
            company: parsed.company,
            domain: parsed.domain,
            level: parsed.level,
        });

        return NextResponse.json({
            title: parsed.normalizedTitle,
            company: parsed.company,
            domain: parsed.domain,
            level: parsed.level,
            hardSkills: parsed.hardSkills.slice(0, 10), // Preview of top skills
        }, {
            headers: {
                'X-RateLimit-Limit': rateLimit.limit.toString(),
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            },
        });
    } catch (error: any) {
        console.error('❌ JD parse error:', error);

        // Handle authentication errors
        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to parse job description' },
            { status: 500 }
        );
    }
}
