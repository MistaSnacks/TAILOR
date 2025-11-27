import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
    try {
        console.log('📋 Profile API - GET request received');
        const userId = await requireAuth();
        console.log('✅ Profile API - User authenticated:', userId);

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
            console.error('❌ Error fetching experiences:', expError);
            return NextResponse.json(
                { error: 'Failed to fetch experiences', details: expError.message },
                { status: 500 }
            );
        }

        const normalizedExperiences = (experiences || []).map((exp: any) => ({
            ...exp,
            experience_bullets: (exp.experience_bullets || []).map((bullet: any) => ({
                ...bullet,
                content: bullet.content || bullet.text || '',
            })),
        }));

        console.log('✅ Profile API - Experiences fetched:', normalizedExperiences.length);

        // Fetch skills (schema may vary)
        const { data: skills, error: skillError } = await supabaseAdmin
            .from('skills')
            .select('*')
            .eq('user_id', userId);

        if (skillError) {
            console.error('❌ Error fetching skills:', skillError);
            return NextResponse.json(
                { error: 'Failed to fetch skills', details: skillError.message },
                { status: 500 }
            );
        }

        const normalizedSkills = (skills || []).map((skill: any) => ({
            ...skill,
            canonical_name: skill.canonical_name || skill.name || '',
        }));

        if (normalizedSkills.length > 0 && 'source_count' in normalizedSkills[0]) {
            normalizedSkills.sort((a: any, b: any) => (b.source_count || 0) - (a.source_count || 0));
        } else {
            normalizedSkills.sort((a: any, b: any) =>
                (a.canonical_name || '').localeCompare(b.canonical_name || '')
            );
        }

        console.log('✅ Profile API - Skills fetched:', normalizedSkills.length);

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

        console.log('✅ Profile API - Profile data fetched:', profile ? 'Found' : 'Not found (OK)');

        const response = {
            experiences: normalizedExperiences,
            skills: normalizedSkills,
            personalInfo: profile || null,
        };

        console.log('✅ Profile API - Returning response:', {
            experienceCount: response.experiences.length,
            skillCount: response.skills.length,
            hasPersonalInfo: !!response.personalInfo,
        });

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('❌ Profile API - Error:', error);
        console.error('Error stack:', error.stack);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Please sign in to access your profile' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error', message: error.message || 'Unexpected error' },
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

            // Get user email from users table for the profile
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            const userEmail = userData?.email || data.email;
            
            if (!userEmail) {
                console.error('❌ No email found for user:', userId);
                return NextResponse.json(
                    { error: 'Email is required to save profile' },
                    { status: 400 }
                );
            }

            // Check if profile already exists for this user
            const { data: existingProfileForUser } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            // Also check if a profile exists with this email (for a different user)
            const { data: existingProfileByEmail } = await supabaseAdmin
                .from('profiles')
                .select('id, user_id')
                .eq('email', userEmail)
                .maybeSingle();

            let profileError;

            if (existingProfileForUser) {
                // Update existing profile for this user
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        full_name: data.full_name,
                        phone_number: data.phone_number || null,
                        address: data.address || null,
                        linkedin_url: data.linkedin_url || null,
                        portfolio_url: data.portfolio_url || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);
                profileError = error;
            } else if (existingProfileByEmail && existingProfileByEmail.user_id !== userId) {
                // Profile exists with this email but for a different user
                // Update the existing profile to point to the current user (consolidate accounts)
                console.log('🔄 Consolidating profile: reassigning from', existingProfileByEmail.user_id, 'to', userId);
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        user_id: userId,
                        full_name: data.full_name,
                        phone_number: data.phone_number || null,
                        address: data.address || null,
                        linkedin_url: data.linkedin_url || null,
                        portfolio_url: data.portfolio_url || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingProfileByEmail.id);
                profileError = error;
            } else {
                // Insert new profile
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .insert({
                        user_id: userId,
                        email: userEmail,
                        full_name: data.full_name,
                        phone_number: data.phone_number || null,
                        address: data.address || null,
                        linkedin_url: data.linkedin_url || null,
                        portfolio_url: data.portfolio_url || null,
                    });
                profileError = error;
            }

            if (profileError) {
                console.error('❌ Error saving personal info:', profileError);
                return NextResponse.json(
                    { error: 'Failed to save personal info', details: profileError.message },
                    { status: 500 }
                );
            }
            
            console.log('✅ Personal info saved successfully for user:', userId);
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
