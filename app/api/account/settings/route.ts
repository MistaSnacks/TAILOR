import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/account/settings - Fetch user preferences
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: preferences, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned
            console.error('Error fetching preferences:', error);
            return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
        }

        // Return defaults if no preferences exist
        const defaultPreferences = {
            email_product_updates: true,
            email_job_digest: true,
            email_resume_tips: true,
            email_marketing: false,
        };

        return NextResponse.json({
            preferences: preferences || defaultPreferences,
        });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/account/settings - Update user preferences
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Validate preference keys
        const validKeys = ['email_product_updates', 'email_job_digest', 'email_resume_tips', 'email_marketing'];
        const updates: Record<string, boolean> = {};

        for (const key of validKeys) {
            if (typeof body[key] === 'boolean') {
                updates[key] = body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 });
        }

        // Upsert preferences
        const { error } = await supabase
            .from('user_preferences')
            .upsert(
                {
                    user_id: session.user.id,
                    ...updates,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('Error updating preferences:', error);
            return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
