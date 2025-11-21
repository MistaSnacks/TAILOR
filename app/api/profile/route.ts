import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
    try {
        const userId = await requireAuth();

        // Fetch experiences with their bullets
        const { data: experiences, error: expError } = await supabaseAdmin
            .from('experiences')
            .select(`
        *,
        experience_bullets(*)
      `)
            .eq('user_id', userId)
            .order('is_current', { ascending: false })
            .order('end_date', { ascending: false, nullsFirst: true });

        if (expError) {
            console.error('Error fetching experiences:', expError);
            return NextResponse.json(
                { error: 'Failed to fetch experiences' },
                { status: 500 }
            );
        }

        // Fetch skills
        const { data: skills, error: skillError } = await supabaseAdmin
            .from('skills')
            .select('*')
            .eq('user_id', userId)
            .order('source_count', { ascending: false });

        if (skillError) {
            console.error('Error fetching skills:', skillError);
            return NextResponse.json(
                { error: 'Failed to fetch skills' },
                { status: 500 }
            );
        }

        // Fetch personal info from profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email, phone_number, address, linkedin_url, portfolio_url')
            .eq('user_id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('❌ Error fetching profile:', profileError);
            console.error('Profile error details:', JSON.stringify(profileError, null, 2));
            return NextResponse.json(
                { error: 'Failed to fetch profile', details: profileError.message },
                { status: 500 }
            );
        }

        console.log('✅ Profile data fetched:', profile);

        return NextResponse.json({
            experiences: experiences || [],
            skills: skills || [],
            personalInfo: profile || null,
        });
    } catch (error: any) {
        console.error('Profile fetch error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userId = await requireAuth();
        const body = await request.json();
        const { type, action, data } = body;

        if (type === 'experience') {
            if (action === 'update') {
                const { id, ...updates } = data;
                await supabaseAdmin
                    .from('experiences')
                    .update(updates)
                    .eq('id', id)
                    .eq('user_id', userId);
            } else if (action === 'delete') {
                await supabaseAdmin
                    .from('experiences')
                    .delete()
                    .eq('id', data.id)
                    .eq('user_id', userId);
            }
        } else if (type === 'skill') {
            if (action === 'delete') {
                await supabaseAdmin
                    .from('skills')
                    .delete()
                    .eq('id', data.id)
                    .eq('user_id', userId);
            }
        } else if (type === 'bullet') {
            if (action === 'update') {
                const { id, content } = data;
                await supabaseAdmin
                    .from('experience_bullets')
                    .update({ content })
                    .eq('id', id);
            } else if (action === 'delete') {
                await supabaseAdmin
                    .from('experience_bullets')
                    .delete()
                    .eq('id', data.id);
            }
        } else if (type === 'personal_info') {
            // Validate URLs if provided
            if (data.linkedin_url && data.linkedin_url.trim() !== '') {
                const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/.*/;
                if (!linkedinRegex.test(data.linkedin_url)) {
                    return NextResponse.json(
                        { error: 'Invalid LinkedIn URL format' },
                        { status: 400 }
                    );
                }
            }

            if (data.portfolio_url && data.portfolio_url.trim() !== '') {
                const urlRegex = /^https?:\/\/.+/;
                if (!urlRegex.test(data.portfolio_url)) {
                    return NextResponse.json(
                        { error: 'Invalid Portfolio URL format' },
                        { status: 400 }
                    );
                }
            }

            // Update personal info in profiles table
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    full_name: data.full_name,
                    phone_number: data.phone_number || null,
                    address: data.address || null,
                    linkedin_url: data.linkedin_url || null,
                    portfolio_url: data.portfolio_url || null,
                })
                .eq('user_id', userId);

            if (updateError) {
                console.error('Error updating personal info:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update personal info' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Profile update error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
