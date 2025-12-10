import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescriptionToContext } from '@/lib/rag/parser';

/**
 * Parse Job Description API
 * 
 * POST /api/jobs/parse
 *   - Parses a job description and extracts title, company, and other metadata
 *   - Used by the generation page for real-time JD parsing
 */
export async function POST(request: NextRequest) {
    console.log('🔍 Jobs Parse API - POST request received');

    try {
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
        });
    } catch (error: any) {
        console.error('❌ JD parse error:', error);

        return NextResponse.json(
            { error: 'Failed to parse job description' },
            { status: 500 }
        );
    }
}
