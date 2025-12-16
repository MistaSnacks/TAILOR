import { supabaseAdmin } from '../supabase';
import { embedText } from '../openai';
import { parseResumeToJSON, ParsedExperience, ParsedEducation, ParsedCertification } from './parser';
import { sanitizeField, sanitizeTextBlock } from '../document-analysis';
import { canonicalizeProfile } from '../profile-canonicalizer';
import type { DocumentAnalysis } from '../document-analysis';
import type { DocumentMetadata } from '../parse';

type IngestDocumentOptions = {
    metadata?: DocumentMetadata;
    analysis?: DocumentAnalysis;
    chunkCount?: number;
    structuredData?: any;
};

type SanitizedExperience = Omit<ParsedExperience, 'company' | 'title' | 'bullets' | 'location' | 'startDate' | 'endDate'> & {
    company: string;
    title: string;
    bullets: string[];
    location?: string;
    startDate?: string;
    endDate?: string;
};

export async function ingestDocument(documentId: string, text: string, userId: string, options?: IngestDocumentOptions) {
    console.log(`🚀 Starting ingestion for document ${documentId} (User: ${userId})`);

    // CRITICAL: Ensure user exists to prevent Foreign Key errors
    // First check if user exists
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

    // Sanitize user object for logging (no sensitive data)
    const sanitizedUser = existingUser ? {
        id: existingUser.id.slice(0, 8) + '...',
        email: existingUser.email ? existingUser.email.split('@')[0] + '@***' : null,
    } : null;

    console.log('🔍 [ingestDocument] User check:', {
        userId: userId.slice(0, 8) + '...',
        found: !!existingUser,
        sanitizedUser,
        error: userCheckError?.message || null,
    });

    if (!existingUser) {
        console.log('📝 [ingestDocument] User not found, creating...');
        const { data: newUser, error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
                id: userId,
                email: `user_${userId.slice(0, 8)}@example.invalid`,
                email_verified: new Date().toISOString()
            })
            .select()
            .single();

        // Sanitize user object before logging
        const sanitizedNewUser = newUser ? {
            id: newUser.id.slice(0, 8) + '...',
            email: newUser.email ? newUser.email.split('@')[0] + '@***' : null,
        } : null;

        console.log('🔍 [ingestDocument] Insert result:', {
            sanitizedNewUser,
            error: insertError ? { code: insertError.code, message: insertError.message, details: insertError.details } : null,
        });

        if (insertError || !newUser) {
            console.error('❌ CRITICAL: Failed to create user:', insertError);
            throw new Error(`User creation failed: ${insertError?.message || 'Unknown error'} (code: ${insertError?.code || 'UNKNOWN'})`);
        }

        // Verify the insert actually worked
        const { data: verifyUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        console.log('🔍 [ingestDocument] Verification:', {
            userId: userId.slice(0, 8) + '...',
            verified: !!verifyUser,
        });

        if (!verifyUser) {
            throw new Error(`User was created but verification failed - transaction issue?`);
        }

        console.log('✅ [ingestDocument] User created and verified:', verifyUser.id.slice(0, 8) + '...');
    } else {
        // Sanitize email in log
        const sanitizedEmail = existingUser.email ? existingUser.email.split('@')[0] + '@***' : 'no email';
        console.log('✅ [ingestDocument] User already exists:', existingUser.id.slice(0, 8) + '...', sanitizedEmail);
    }

    // 1. Parse the document
    const parsedData = await parseResumeToJSON(text);
    const totalBulletsFromParsing = parsedData.experiences.reduce((sum, exp) => sum + (exp.bullets?.length || 0), 0);
    console.log(`✅ Parsed ${parsedData.experiences.length} experiences, ${parsedData.skills.length} skills, ${parsedData.education?.length || 0} education, ${parsedData.certifications?.length || 0} certifications`);
    console.log(`📋 [ingestDocument] Total bullets extracted from parsing: ${totalBulletsFromParsing}`);
    
    // Store for later logging
    const bulletsFromParsing = totalBulletsFromParsing;

    const sanitizedExperiences = sanitizeExperiences(parsedData.experiences, documentId);
    const sanitizedSkills = sanitizeSkills(parsedData.skills, documentId);
    const education = parsedData.education || [];
    const certifications = parsedData.certifications || [];
    const contactInfo = parsedData.contactInfo;
    const summary = parsedData.summary;

    // REMOVE IN PRODUCTION
    const totalBulletsAfterSanitization = sanitizedExperiences.reduce((sum, exp) => sum + (exp.bullets?.length || 0), 0);
    console.log('🧼 Sanitized ingestion payload', {
        documentId,
        experiencesIn: parsedData.experiences.length,
        experiencesOut: sanitizedExperiences.length,
        bulletsIn: bulletsFromParsing,
        bulletsOut: totalBulletsAfterSanitization,
        skillsIn: parsedData.skills.length,
        skillsOut: sanitizedSkills.length,
        education: education.length,
        certifications: certifications.length,
        hasContactInfo: !!contactInfo?.name,
        hasSummary: !!summary,
    });
    
    if (totalBulletsAfterSanitization === 0 && sanitizedExperiences.length > 0) {
        console.warn('⚠️ [ingestDocument] WARNING: No bullets found after sanitization!', {
            documentId,
            experienceCount: sanitizedExperiences.length,
            rawBulletCount: bulletsFromParsing,
            experiences: sanitizedExperiences.map(exp => ({
                company: exp.company,
                title: exp.title,
                rawBullets: parsedData.experiences.find(e => e.company === exp.company && e.title === exp.title)?.bullets?.length || 0,
                sanitizedBullets: exp.bullets.length,
            })),
        });
    }

    // 2. Process Experiences
    let processedExperiences = 0;
    let failedExperiences = 0;
    let totalBulletsProcessed = 0;
    for (const exp of sanitizedExperiences) {
        try {
            const bulletCountBefore = exp.bullets?.length || 0;
            await processExperience(userId, documentId, exp);
            processedExperiences++;
            totalBulletsProcessed += bulletCountBefore;
            console.log(`✅ [ingestDocument] Processed experience: ${exp.company} - ${exp.title} (${bulletCountBefore} bullets)`);
        } catch (error: any) {
            failedExperiences++;
            console.error(`❌ Failed to process experience: ${exp.company} - ${exp.title}`, error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                bulletCount: exp.bullets?.length || 0,
            });
        }
    }
    console.log(`📊 Processed ${processedExperiences}/${sanitizedExperiences.length} experiences (${failedExperiences} failed) with ${totalBulletsProcessed} total bullets`);

    // 3. Process Skills
    let processedSkills = 0;
    let failedSkills = 0;
    for (const skill of sanitizedSkills) {
        try {
            await processSkill(userId, skill);
            processedSkills++;
        } catch (error: any) {
            failedSkills++;
            console.error(`❌ Failed to process skill: ${skill}`, error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
            });
        }
    }
    console.log(`📊 Processed ${processedSkills}/${sanitizedSkills.length} skills (${failedSkills} failed)`);

    // 4. Process Education
    let processedEducation = 0;
    let failedEducation = 0;
    for (const edu of education) {
        try {
            await processEducation(userId, edu);
            processedEducation++;
        } catch (error: any) {
            failedEducation++;
            console.error(`❌ Failed to process education: ${edu.institution}`, error.message);
        }
    }
    if (education.length > 0) {
        console.log(`📊 Processed ${processedEducation}/${education.length} education entries (${failedEducation} failed)`);
    }

    // 5. Process Certifications
    let processedCerts = 0;
    let failedCerts = 0;
    for (const cert of certifications) {
        try {
            await processCertification(userId, cert);
            processedCerts++;
        } catch (error: any) {
            failedCerts++;
            console.error(`❌ Failed to process certification: ${cert.name}`, error.message);
        }
    }
    if (certifications.length > 0) {
        console.log(`📊 Processed ${processedCerts}/${certifications.length} certifications (${failedCerts} failed)`);
    }

    // 6. Update profile with contact info (if available)
    if (contactInfo && (contactInfo.name || contactInfo.email || contactInfo.phone || contactInfo.linkedin || contactInfo.portfolio)) {
        try {
            const profileUpdate: Record<string, string | undefined> = {};

            // Only update fields that have values - don't overwrite existing data with empty values
            if (contactInfo.name) profileUpdate.full_name = contactInfo.name;
            if (contactInfo.phone) profileUpdate.phone_number = contactInfo.phone;
            if (contactInfo.linkedin) profileUpdate.linkedin_url = contactInfo.linkedin;
            if (contactInfo.portfolio) profileUpdate.portfolio_url = contactInfo.portfolio;
            // Note: We intentionally do NOT save address to the profile

            if (Object.keys(profileUpdate).length > 0) {
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdate)
                    .eq('user_id', userId);

                if (profileError) {
                    console.warn('⚠️ Failed to update profile with contact info:', profileError.message);
                } else {
                    console.log('✅ Updated profile with contact info:', Object.keys(profileUpdate).join(', '));
                }
            }
        } catch (error: any) {
            console.warn('⚠️ Error updating profile with contact info:', error.message);
        }
    }

    // 7. Update document status
    const parsedContentPayload: Record<string, unknown> = {
        sanitizedText: text,
        structured: {
            experiences: sanitizedExperiences,
            skills: sanitizedSkills,
            education,
            certifications,
            contactInfo,
            summary,
        },
    };

    if (options?.metadata) {
        parsedContentPayload.metadata = options.metadata;
    }

    if (typeof options?.chunkCount === 'number') {
        parsedContentPayload.chunk_count = options.chunkCount;
    }

    if (options?.analysis) {
        parsedContentPayload.analysis = options.analysis;
    }

    // Always save structured data, even if processing had errors
    const { error: updateError } = await supabaseAdmin
        .from('documents')
        .update({
            parse_status: 'completed',
            parsed_content: parsedContentPayload
        })
        .eq('id', documentId);

    if (updateError) {
        console.error('❌ Failed to update document with structured data:', updateError);
        throw updateError;
    }

    console.log('✅ Saved structured data to document:', {
        experiences: sanitizedExperiences.length,
        skills: sanitizedSkills.length,
    });

    // Canonicalize profile (fail loudly if this breaks)
    await canonicalizeProfile(userId);

    console.log(`✨ Ingestion complete for document ${documentId}`);
}

async function processExperience(userId: string, documentId: string, exp: SanitizedExperience) {
    // Find or create experience
    // We try to match by company and title to avoid duplicates
    // In a real app, we might want more sophisticated matching (e.g. date overlap)
    let experienceId: string;

    const { data: existingExp } = await supabaseAdmin
        .from('experiences')
        .select('id')
        .eq('user_id', userId)
        .ilike('company', exp.company)
        .ilike('title', exp.title)
        .maybeSingle();

    if (existingExp) {
        experienceId = existingExp.id;
    } else {
        const { data: newExp, error } = await supabaseAdmin
            .from('experiences')
            .insert({
                user_id: userId,
                company: exp.company,
                title: exp.title,
                location: exp.location,
                start_date: exp.startDate,
                end_date: exp.endDate,
                is_current: exp.isCurrent,
            })
            .select('id')
            .single();

        if (error) throw error;
        experienceId = newExp.id;
    }

    // Link source (if table exists)
    try {
        await supabaseAdmin
            .from('experience_sources')
            .insert({
                experience_id: experienceId,
                document_id: documentId,
            });
    } catch (e) {
        // Table might not exist in old schema, skip silently
        console.log('⚠️ experience_sources table not found, skipping');
    }

    // Process Bullets
    for (const bulletText of exp.bullets) {
        await processBullet(experienceId, documentId, bulletText);
    }
}

/**
 * Calculate importance score for a bullet based on its content
 * Score is 0-100 based on:
 * - Contains metrics/numbers (up to 40 points)
 * - Contains action verbs (up to 20 points)
 * - Contains specific tools/technologies (up to 20 points)
 * - Bullet length/detail (up to 20 points)
 */
function calculateBulletImportanceScore(bulletText: string): number {
    let score = 0;

    // Check for metrics/numbers (up to 40 points)
    const metricPatterns = [
        /\d+%/,           // Percentages
        /\$[\d,]+/,       // Dollar amounts
        /\d+[xX]\s/,      // Multipliers (e.g., "3x faster")
        /\d+\+?\s*(users?|customers?|clients?|team|employees?|members?)/i, // People counts
        /\d+\s*(million|billion|thousand|k|m|b)/i, // Large numbers
        /increased|decreased|reduced|improved|grew|saved/i, // Impact verbs with implied metrics
    ];

    let metricScore = 0;
    for (const pattern of metricPatterns) {
        if (pattern.test(bulletText)) {
            metricScore += 10;
        }
    }
    score += Math.min(metricScore, 40);

    // Check for strong action verbs (up to 20 points)
    const actionVerbs = /^(led|managed|developed|implemented|designed|created|built|launched|optimized|streamlined|automated|analyzed|delivered|achieved|spearheaded|orchestrated|established|transformed|pioneered)/i;
    if (actionVerbs.test(bulletText.trim())) {
        score += 20;
    }

    // Check for specific tools/technologies (up to 20 points)
    const techPatterns = [
        /\b(python|javascript|typescript|java|sql|react|aws|azure|gcp|kubernetes|docker|tableau|excel|salesforce|jira|confluence)\b/i,
        /\b(api|etl|ci\/cd|ml|ai|machine learning|data pipeline|microservices)\b/i,
    ];
    for (const pattern of techPatterns) {
        if (pattern.test(bulletText)) {
            score += 10;
            break; // Only count once
        }
    }
    if (/\b(compliance|regulatory|audit|risk|security|governance)\b/i.test(bulletText)) {
        score += 10;
    }

    // Bullet length/detail (up to 20 points)
    const wordCount = bulletText.split(/\s+/).length;
    if (wordCount >= 15 && wordCount <= 40) {
        score += 20; // Optimal length
    } else if (wordCount >= 10 && wordCount < 15) {
        score += 15;
    } else if (wordCount >= 8) {
        score += 10;
    }

    return Math.min(score, 100);
}

async function processBullet(experienceId: string, documentId: string, bulletText: string) {
    const embedding = await embedText(bulletText);
    const importanceScore = calculateBulletImportanceScore(bulletText);

    // Check for semantic duplicates within this experience
    const { data: similarBullets } = await supabaseAdmin.rpc('match_experience_bullets', {
        query_embedding: embedding,
        match_threshold: 0.95, // High threshold for de-duplication
        match_count: 1,
        filter_user_id: (await getUserIdFromExperience(experienceId)) // We need user_id for the RPC filter
    });

    let bulletId: string;

    if (similarBullets && similarBullets.length > 0) {
        bulletId = similarBullets[0].id;
        // Increment source count and update importance score if higher
        const newSourceCount = (similarBullets[0].source_count || 1) + 1;
        const existingScore = similarBullets[0].importance_score || 0;
        const { error: updateError } = await supabaseAdmin
            .from('experience_bullets')
            .update({
                source_count: newSourceCount,
                // Keep the higher importance score
                importance_score: Math.max(existingScore, importanceScore)
            })
            .eq('id', bulletId);

        if (updateError) {
            console.warn('⚠️ Failed to update bullet:', updateError.message);
        }
    } else {
        const { data: newBullet, error } = await supabaseAdmin
            .from('experience_bullets')
            .insert({
                experience_id: experienceId,
                content: bulletText,
                embedding: embedding,
                importance_score: importanceScore,
            })
            .select('id')
            .single();

        if (error) throw error;
        bulletId = newBullet.id;
    }

    // Link source
    await supabaseAdmin
        .from('experience_bullet_sources')
        .insert({
            bullet_id: bulletId,
            document_id: documentId,
        });
}

async function processSkill(userId: string, skillName: string) {
    const normalizedName = skillName.trim();

    if (!normalizedName || normalizedName.length === 0) {
        console.warn('⚠️ Skipping empty skill name');
        return;
    }

    try {
        // Check for existing skill
        const { data: existingSkill } = await supabaseAdmin
            .from('skills')
            .select('id, source_count')
            .eq('user_id', userId)
            .ilike('canonical_name', normalizedName)
            .maybeSingle();

        if (existingSkill) {
            // Skill exists, increment source_count if it has the column
            if (typeof existingSkill.source_count === 'number') {
                await supabaseAdmin
                    .from('skills')
                    .update({ source_count: existingSkill.source_count + 1 })
                    .eq('id', existingSkill.id);
            }
        } else {
            // Insert new skill (no embedding column in current schema)
            const { error: insertError } = await supabaseAdmin
                .from('skills')
                .insert({
                    user_id: userId,
                    canonical_name: normalizedName,
                });

            if (insertError) {
                console.error(`❌ Failed to insert skill "${normalizedName}":`, insertError);
                throw insertError;
            }
        }
    } catch (error: any) {
        console.error(`❌ Error processing skill "${skillName}":`, error);
        throw error;
    }
}

async function processEducation(userId: string, edu: ParsedEducation) {
    if (!edu.institution?.trim()) {
        console.warn('⚠️ Skipping education with no institution');
        return;
    }

    // Determine dates - prefer explicit start/end dates, fall back to graduation date
    const startDate = edu.startDate?.trim() || null;
    const endDate = edu.endDate?.trim() || edu.graduationDate?.trim() || null;

    // Check for existing education entry
    const { data: existing } = await supabaseAdmin
        .from('canonical_education')
        .select('id, source_count')
        .eq('user_id', userId)
        .ilike('institution', edu.institution)
        .maybeSingle();

    if (existing) {
        // Update source_count and potentially fill in missing dates
        const updateData: Record<string, unknown> = {
            source_count: (existing.source_count || 1) + 1
        };
        // Update dates if we have them and they're not already set
        if (startDate) updateData.start_date = startDate;
        if (endDate) updateData.end_date = endDate;

        await supabaseAdmin
            .from('canonical_education')
            .update(updateData)
            .eq('id', existing.id);
    } else {
        // Insert new education
        const { error } = await supabaseAdmin
            .from('canonical_education')
            .insert({
                user_id: userId,
                institution: edu.institution.trim(),
                degree: edu.degree?.trim() || null,
                field_of_study: edu.field?.trim() || null,
                start_date: startDate,
                end_date: endDate,
                source_count: 1,
            });

        if (error) {
            console.error(`❌ Failed to insert education "${edu.institution}":`, error);
            throw error;
        }
    }
}

async function processCertification(userId: string, cert: ParsedCertification) {
    if (!cert.name?.trim()) {
        console.warn('⚠️ Skipping certification with no name');
        return;
    }

    // Check for existing certification
    const { data: existing } = await supabaseAdmin
        .from('canonical_certifications')
        .select('id, source_count')
        .eq('user_id', userId)
        .ilike('name', cert.name)
        .maybeSingle();

    if (existing) {
        // Update source_count
        await supabaseAdmin
            .from('canonical_certifications')
            .update({ source_count: (existing.source_count || 1) + 1 })
            .eq('id', existing.id);
    } else {
        // Insert new certification
        const { error } = await supabaseAdmin
            .from('canonical_certifications')
            .insert({
                user_id: userId,
                name: cert.name.trim(),
                issuer: cert.issuer?.trim() || null,
                issue_date: cert.date?.trim() || null,
                expiry_date: cert.expirationDate?.trim() || null,
                source_count: 1,
            });

        if (error) {
            console.error(`❌ Failed to insert certification "${cert.name}":`, error);
            throw error;
        }
    }
}

// Helper to get user_id from experience_id (needed for RPC)
async function getUserIdFromExperience(experienceId: string): Promise<string> {
    const { data } = await supabaseAdmin
        .from('experiences')
        .select('user_id')
        .eq('id', experienceId)
        .single();
    return data?.user_id;
}

function sanitizeExperiences(experiences: ParsedExperience[], documentId: string): SanitizedExperience[] {
    const sanitized: SanitizedExperience[] = [];

    experiences.forEach((experience, index) => {
        const company = sanitizeField(experience.company);
        const title = sanitizeField(experience.title);

        if (!company || !title) {
            // REMOVE IN PRODUCTION
            console.log('🧹 Dropped placeholder experience', {
                documentId,
                index,
                reason: !company ? 'company' : 'title',
            });
            return;
        }

        const location = sanitizeField(experience.location) ?? undefined;
        const startDate = sanitizeField(experience.startDate) ?? undefined;
        const endDate = sanitizeField(experience.endDate) ?? undefined;

        const bullets = (experience.bullets || [])
            .map((bullet, bulletIndex) => {
                const cleaned = sanitizeTextBlock(bullet);
                if (!cleaned) {
                    // REMOVE IN PRODUCTION
                    console.log('🧽 Dropped placeholder bullet', {
                        documentId,
                        experienceIndex: index,
                        bulletIndex,
                    });
                }
                return cleaned;
            })
            .filter((bullet): bullet is string => Boolean(bullet));

        sanitized.push({
            ...experience,
            company,
            title,
            location,
            startDate,
            endDate,
            bullets,
        });
    });

    return sanitized;
}

function sanitizeSkills(skills: string[], documentId: string): string[] {
    const sanitizedSet = new Set<string>();

    skills.forEach((skill, index) => {
        const cleaned = sanitizeField(skill);

        if (!cleaned) {
            // REMOVE IN PRODUCTION
            console.log('🧴 Dropped placeholder skill', {
                documentId,
                index,
            });
            return;
        }

        sanitizedSet.add(cleaned);
    });

    return Array.from(sanitizedSet);
}
