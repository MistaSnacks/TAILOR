import { supabaseAdmin } from '../supabase';
import { embedText } from '../gemini';
import { parseResumeToJSON, ParsedExperience } from './parser';
import { sanitizeField, sanitizeTextBlock } from '../document-analysis';
import { canonicalizeProfile } from '../profile-canonicalizer';
import type { DocumentAnalysis } from '../document-analysis';
import type { DocumentMetadata } from '../parse';

type IngestDocumentOptions = {
    metadata?: DocumentMetadata;
    analysis?: DocumentAnalysis;
    chunkCount?: number;
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
    console.log(`🚀 Starting ingestion for document ${documentId}`);

    // 1. Parse the document
    const parsedData = await parseResumeToJSON(text);
    console.log(`✅ Parsed ${parsedData.experiences.length} experiences and ${parsedData.skills.length} skills`);

    const sanitizedExperiences = sanitizeExperiences(parsedData.experiences, documentId);
    const sanitizedSkills = sanitizeSkills(parsedData.skills, documentId);

    // REMOVE IN PRODUCTION
    console.log('🧼 Sanitized ingestion payload', {
        documentId,
        experiencesIn: parsedData.experiences.length,
        experiencesOut: sanitizedExperiences.length,
        skillsIn: parsedData.skills.length,
        skillsOut: sanitizedSkills.length,
    });

    // 2. Process Experiences
    for (const exp of sanitizedExperiences) {
        await processExperience(userId, documentId, exp);
    }

    // 3. Process Skills
    for (const skill of sanitizedSkills) {
        await processSkill(userId, skill);
    }

    // 4. Update document status
    const parsedContentPayload: Record<string, unknown> = {
        sanitizedText: text,
        structured: {
            experiences: sanitizedExperiences,
            skills: sanitizedSkills,
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

    await supabaseAdmin
        .from('documents')
        .update({
            parse_status: 'completed',
            parsed_content: parsedContentPayload
        })
        .eq('id', documentId);

    try {
        await canonicalizeProfile(userId);
    } catch (error) {
        console.error('❌ Canonicalization error:', error);
    }

    console.log(`✨ Ingestion complete for document ${documentId}`);
}

async function processExperience(userId: string, documentId: string, exp: SanitizedExperience) {
    // Find or create experience
    // We try to match by company and title to avoid duplicates
    // In a real app, we might want more sophisticated matching (e.g. date overlap)
    let experienceId: string;

    const { data: existingExp } = await supabaseAdmin
        .from('experiences')
        .select('id, source_count')
        .eq('user_id', userId)
        .ilike('company', exp.company)
        .ilike('title', exp.title)
        .single();

    if (existingExp) {
        experienceId = existingExp.id;
        // Increment source count
        await supabaseAdmin
            .from('experiences')
            .update({ source_count: existingExp.source_count + 1 })
            .eq('id', experienceId);
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

    // Link source
    await supabaseAdmin
        .from('experience_sources')
        .insert({
            experience_id: experienceId,
            document_id: documentId,
        });

    // Process Bullets
    for (const bulletText of exp.bullets) {
        await processBullet(experienceId, documentId, bulletText);
    }
}

async function processBullet(experienceId: string, documentId: string, bulletText: string) {
    const embedding = await embedText(bulletText);

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
        // Increment source count/importance
        await supabaseAdmin.rpc('increment_bullet_source_count', { bullet_id: bulletId });
    } else {
        const { data: newBullet, error } = await supabaseAdmin
            .from('experience_bullets')
            .insert({
                experience_id: experienceId,
                content: bulletText,
                embedding: embedding,
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
    const normalizedName = skillName.trim(); // In real app, use LLM to normalize to canonical name
    const embedding = await embedText(normalizedName);

    // Check for existing skill
    const { data: existingSkill } = await supabaseAdmin
        .from('skills')
        .select('id, source_count')
        .eq('user_id', userId)
        .ilike('canonical_name', normalizedName)
        .single();

    if (existingSkill) {
        await supabaseAdmin
            .from('skills')
            .update({ source_count: existingSkill.source_count + 1 })
            .eq('id', existingSkill.id);
    } else {
        await supabaseAdmin
            .from('skills')
            .insert({
                user_id: userId,
                canonical_name: normalizedName,
                embedding: embedding,
            });
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
