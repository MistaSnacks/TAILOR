import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// Structured logging helper for production observability
function logOperation(operation: string, userId: string, details?: Record<string, unknown>) {
  console.log(`[Profile API] ${operation}:`, {
    userId: userId.slice(0, 8) + '...',
    timestamp: new Date().toISOString(),
    ...details,
  });
}

function logError(operation: string, userId: string, error: unknown, details?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorName = error instanceof Error ? error.name : 'Error';
  
  console.error(`[Profile API] ${operation} error:`, {
    userId: userId.slice(0, 8) + '...',
    error: errorMessage,
    name: errorName,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

export async function GET(request: NextRequest) {
    try {
        const userId = await requireAuth();
        
        logOperation('GET profile', userId);

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

        // Fetch skills - only needed columns
        const { data: skills, error: skillError } = await supabaseAdmin
            .from('skills')
            .select('id, canonical_name, source_count')
            .eq('user_id', userId);

        if (skillError) {
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

        // Fetch personal info from profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email, phone_number, address, city, state, zip, linkedin_url, portfolio_url, remote_preference')
            .eq('user_id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            return NextResponse.json(
                { error: 'Failed to fetch profile', details: profileError.message },
                { status: 500 }
            );
        }

        logOperation('GET profile success', userId, {
            experienceCount: normalizedExperiences.length,
            skillCount: normalizedSkills.length,
            hasProfile: !!profile,
        });

        return NextResponse.json({
            experiences: normalizedExperiences,
            skills: normalizedSkills,
            personalInfo: profile || null,
        });
    } catch (error: unknown) {
        const userId = 'unknown';
        logError('GET profile', userId, error);
        
        // Proper error type checking instead of fragile string comparison
        const isUnauthorizedError = error instanceof Error && error.message === 'Unauthorized';
        const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
        
        if (isUnauthorizedError) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Please sign in to access your profile' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error', message: errorMessage },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userId = await requireAuth();
        const body = await request.json();
        const { type, action, data } = body;

        logOperation('PUT profile', userId, { type, action });

        if (type === 'experience') {
            if (action === 'create') {
                // Validate required fields
                if (!data.company || !data.title) {
                    return NextResponse.json(
                        { error: 'Company and title are required' },
                        { status: 400 }
                    );
                }

                // Insert the experience
                const { data: newExperience, error: expError } = await supabaseAdmin
                    .from('experiences')
                    .insert({
                        user_id: userId,
                        company: data.company,
                        title: data.title,
                        location: data.location || null,
                        start_date: data.start_date || null,
                        end_date: data.is_current ? null : (data.end_date || null),
                        is_current: data.is_current || false,
                        source_count: 1,
                    })
                    .select()
                    .single();

                if (expError) {
                    logError('PUT experience create', userId, expError);
                    return NextResponse.json(
                        { error: 'Failed to create experience', details: expError.message },
                        { status: 500 }
                    );
                }

                // Insert bullets if provided
                if (data.bullets && Array.isArray(data.bullets) && data.bullets.length > 0) {
                    const bulletsToInsert = data.bullets
                        .filter((b: string) => b && b.trim())
                        .map((content: string) => ({
                            experience_id: newExperience.id,
                            content: content.trim(),
                            source_count: 1,
                            importance_score: 50,
                        }));

                    if (bulletsToInsert.length > 0) {
                        const { error: bulletError } = await supabaseAdmin
                            .from('experience_bullets')
                            .insert(bulletsToInsert);

                        if (bulletError) {
                            logError('PUT experience create bullets', userId, bulletError, { experienceId: newExperience.id });
                            // Experience created but bullets failed - still return success with warning
                            return NextResponse.json({ 
                                success: true, 
                                experience: newExperience,
                                warning: 'Experience created but some bullets failed to save'
                            });
                        }
                    }
                }

                logOperation('PUT experience create success', userId, { experienceId: newExperience.id });
                return NextResponse.json({ success: true, experience: newExperience });

            } else if (action === 'update') {
                const { id, ...updates } = data;
                const { error, data: updatedData } = await supabaseAdmin
                    .from('experiences')
                    .update(updates)
                    .eq('id', id)
                    .eq('user_id', userId)
                    .select();

                if (error) {
                    logError('PUT experience update', userId, error, { experienceId: id });
                    return NextResponse.json(
                        { error: 'Failed to update experience', details: error.message },
                        { status: 500 }
                    );
                }

                if (!updatedData || updatedData.length === 0) {
                    logError('PUT experience update', userId, new Error('No rows updated'), { experienceId: id });
                    return NextResponse.json(
                        { error: 'Experience not found or unauthorized' },
                        { status: 404 }
                    );
                }
            } else if (action === 'delete') {
                const { error, data: deletedData } = await supabaseAdmin
                    .from('experiences')
                    .delete()
                    .eq('id', data.id)
                    .eq('user_id', userId)
                    .select();

                if (error) {
                    logError('PUT experience delete', userId, error, { experienceId: data.id });
                    return NextResponse.json(
                        { error: 'Failed to delete experience', details: error.message },
                        { status: 500 }
                    );
                }

                if (!deletedData || deletedData.length === 0) {
                    logError('PUT experience delete', userId, new Error('No rows deleted'), { experienceId: data.id });
                    return NextResponse.json(
                        { error: 'Experience not found or unauthorized' },
                        { status: 404 }
                    );
                }
            }
        } else if (type === 'skill') {
            if (action === 'create') {
                // Validate required fields
                if (!data.name || !data.name.trim()) {
                    return NextResponse.json(
                        { error: 'Skill name is required' },
                        { status: 400 }
                    );
                }

                const skillName = data.name.trim();

                // Check if skill already exists for this user
                const { data: existingSkill } = await supabaseAdmin
                    .from('skills')
                    .select('id, canonical_name')
                    .eq('user_id', userId)
                    .ilike('canonical_name', skillName)
                    .maybeSingle();

                if (existingSkill) {
                    return NextResponse.json(
                        { error: 'Skill already exists', existing: existingSkill },
                        { status: 409 }
                    );
                }

                // Insert the new skill
                const { data: newSkill, error: skillError } = await supabaseAdmin
                    .from('skills')
                    .insert({
                        user_id: userId,
                        canonical_name: skillName,
                        source_count: 1,
                    })
                    .select()
                    .single();

                if (skillError) {
                    logError('PUT skill create', userId, skillError);
                    return NextResponse.json(
                        { error: 'Failed to create skill', details: skillError.message },
                        { status: 500 }
                    );
                }

                logOperation('PUT skill create success', userId, { skillId: newSkill.id, skillName });
                return NextResponse.json({ success: true, skill: newSkill });

            } else if (action === 'delete') {
                const { error, data: deletedData } = await supabaseAdmin
                    .from('skills')
                    .delete()
                    .eq('id', data.id)
                    .eq('user_id', userId)
                    .select();

                if (error) {
                    logError('PUT skill delete', userId, error, { skillId: data.id });
                    return NextResponse.json(
                        { error: 'Failed to delete skill', details: error.message },
                        { status: 500 }
                    );
                }

                if (!deletedData || deletedData.length === 0) {
                    logError('PUT skill delete', userId, new Error('No rows deleted'), { skillId: data.id });
                    return NextResponse.json(
                        { error: 'Skill not found or unauthorized' },
                        { status: 404 }
                    );
                }
            }
        } else if (type === 'bullet') {
            if (action === 'update') {
                const { id, content } = data;
                const { error, data: updatedData } = await supabaseAdmin
                    .from('experience_bullets')
                    .update({ content })
                    .eq('id', id)
                    .select();

                if (error) {
                    logError('PUT bullet update', userId, error, { bulletId: id });
                    return NextResponse.json(
                        { error: 'Failed to update bullet', details: error.message },
                        { status: 500 }
                    );
                }

                if (!updatedData || updatedData.length === 0) {
                    logError('PUT bullet update', userId, new Error('No rows updated'), { bulletId: id });
                    return NextResponse.json(
                        { error: 'Bullet not found' },
                        { status: 404 }
                    );
                }
            } else if (action === 'delete') {
                const { error, data: deletedData } = await supabaseAdmin
                    .from('experience_bullets')
                    .delete()
                    .eq('id', data.id)
                    .select();

                if (error) {
                    logError('PUT bullet delete', userId, error, { bulletId: data.id });
                    return NextResponse.json(
                        { error: 'Failed to delete bullet', details: error.message },
                        { status: 500 }
                    );
                }

                if (!deletedData || deletedData.length === 0) {
                    logError('PUT bullet delete', userId, new Error('No rows deleted'), { bulletId: data.id });
                    return NextResponse.json(
                        { error: 'Bullet not found' },
                        { status: 404 }
                    );
                }
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
                const { error, data: updatedData } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        full_name: data.full_name,
                        phone_number: data.phone_number || null,
                        address: data.address || null,
                        city: data.city || null,
                        state: data.state || null,
                        zip: data.zip || null,
                        linkedin_url: data.linkedin_url || null,
                        portfolio_url: data.portfolio_url || null,
                        remote_preference: data.remote_preference || 'any',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId)
                    .select();
                profileError = error;
                
                if (error) {
                    logError('PUT profile update', userId, error);
                } else if (!updatedData || updatedData.length === 0) {
                    logError('PUT profile update', userId, new Error('No rows updated'));
                    profileError = { message: 'No rows updated', code: 'NO_ROWS_UPDATED' } as any;
                }
            } else if (existingProfileByEmail && existingProfileByEmail.user_id !== userId) {
                // Profile exists with this email but for a different user - consolidate accounts
                const { error, data: updatedData } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        user_id: userId,
                        full_name: data.full_name,
                        phone_number: data.phone_number || null,
                        address: data.address || null,
                        city: data.city || null,
                        state: data.state || null,
                        zip: data.zip || null,
                        linkedin_url: data.linkedin_url || null,
                        portfolio_url: data.portfolio_url || null,
                        remote_preference: data.remote_preference || 'any',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingProfileByEmail.id)
                    .select();
                profileError = error;
                
                if (error) {
                    logError('PUT profile consolidate', userId, error);
                } else if (!updatedData || updatedData.length === 0) {
                    logError('PUT profile consolidate', userId, new Error('No rows updated'));
                    profileError = { message: 'No rows updated', code: 'NO_ROWS_UPDATED' } as any;
                }
            } else {
                // Insert new profile
                const { error, data: insertedData } = await supabaseAdmin
                    .from('profiles')
                    .insert({
                        user_id: userId,
                        email: userEmail,
                        full_name: data.full_name,
                        phone_number: data.phone_number || null,
                        address: data.address || null,
                        city: data.city || null,
                        state: data.state || null,
                        zip: data.zip || null,
                        linkedin_url: data.linkedin_url || null,
                        portfolio_url: data.portfolio_url || null,
                        remote_preference: data.remote_preference || 'any',
                    })
                    .select();
                profileError = error;
                
                if (error) {
                    logError('PUT profile insert', userId, error);
                } else if (!insertedData || insertedData.length === 0) {
                    logError('PUT profile insert', userId, new Error('No rows inserted'));
                    profileError = { message: 'No rows inserted', code: 'NO_ROWS_INSERTED' } as any;
                }
            }

            if (profileError) {
                return NextResponse.json(
                    { error: 'Failed to save personal info', details: profileError.message },
                    { status: 500 }
                );
            }
        }

        logOperation('PUT profile success', userId, { type, action });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const userId = 'unknown';
        logError('PUT profile', userId, error);
        
        // Proper error type checking instead of fragile string comparison
        const isUnauthorizedError = error instanceof Error && error.message === 'Unauthorized';
        
        if (isUnauthorizedError) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: 'Internal server error', message: errorMessage },
            { status: 500 }
        );
    }
}
