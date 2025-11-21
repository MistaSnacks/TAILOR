import { supabaseAdmin } from '../supabase';
import { embedText } from '../gemini';
import {
    canonicalizeProfile,
    getCanonicalProfile,
    type CanonicalProfile,
} from '../profile-canonicalizer';

export type RetrievedBullet = {
    id: string;
    experienceId: string;
    text: string;
    embedding?: number[] | null;
    sourceIds: string[];
    representativeId?: string;
    supportingIds: string[];
    averageSimilarity?: number;
};

export type RetrievedExperience = {
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent: boolean;
    titleProgression: string[];
    locations: string[];
    sourceExperienceIds: string[];
    tenureMonths: number;
    bullets: RetrievedBullet[];
};

export type RetrievedSkill = {
    id: string;
    canonicalName: string;
    weight: number;
    category: string;
    sourceSkillIds: string[];
};

export type RetrievedProfile = {
    experiences: RetrievedExperience[];
    skills: RetrievedSkill[];
};

export async function retrieveProfileForJob(
    userId: string,
    jobDescription = ''
): Promise<RetrievedProfile> {
    console.log('🔍 Retrieving canonical profile for job...');

    let canonicalProfile = await getCanonicalProfile(userId);

    if (!canonicalProfile.experiences.length) {
        try {
            canonicalProfile = await canonicalizeProfile(userId);
        } catch (error) {
            console.error('❌ Failed to build canonical profile on-demand:', error);
        }
    }

    if (!canonicalProfile.experiences.length) {
        console.warn('⚠️ Falling back to legacy retrieval - no canonical data yet');
        return legacyRetrieveProfile(userId, jobDescription);
    }

    const experiences: RetrievedExperience[] = canonicalProfile.experiences.map((experience) => {
        const bullets = experience.bullets.map((bullet) => ({
            id: bullet.id,
            experienceId: experience.id,
            text: bullet.content,
            embedding: bullet.embedding,
            sourceIds: Array.isArray(bullet.sourceIds)
                ? bullet.sourceIds
                : buildSourceIds(bullet.representativeBulletId, bullet.supportingBulletIds),
            representativeId: bullet.representativeBulletId,
            supportingIds: bullet.supportingBulletIds,
            averageSimilarity: bullet.averageSimilarity,
        }));
        
        return {
            id: experience.id,
            title: experience.primaryTitle,
            company: experience.displayCompany,
            location: experience.primaryLocation,
            startDate: experience.startDate,
            endDate: experience.endDate,
            isCurrent: experience.isCurrent,
            titleProgression: experience.titleProgression,
            locations: experience.locations,
            sourceExperienceIds: experience.sourceExperienceIds,
            tenureMonths: estimateTenureMonths(experience),
            bullets,
        };
    });

    // 🔍 Check bullet embeddings (REMOVE IN PRODUCTION)
    const totalBullets = experiences.reduce((sum, exp) => sum + exp.bullets.length, 0);
    const bulletsWithEmbeddings = experiences.reduce(
        (sum, exp) => sum + exp.bullets.filter((b) => b.embedding && Array.isArray(b.embedding) && b.embedding.length > 0).length,
        0
    );
    console.log(`📊 Bullet embeddings: ${bulletsWithEmbeddings}/${totalBullets} bullets have embeddings`);

    // 🔍 Debug logging (REMOVE IN PRODUCTION)
    const experiencesWithBullets = experiences.filter((exp) => exp.bullets.length > 0);
    const experiencesWithoutBullets = experiences.filter((exp) => exp.bullets.length === 0);
    
    if (experiencesWithoutBullets.length > 0) {
        console.warn('⚠️ Some canonical experiences have no bullets:', {
            totalExperiences: experiences.length,
            withBullets: experiencesWithBullets.length,
            withoutBullets: experiencesWithoutBullets.length,
            emptyExperiences: experiencesWithoutBullets.map((exp) => ({
                id: exp.id,
                company: exp.company,
                title: exp.title,
            })),
        });
    }

    const skills: RetrievedSkill[] = canonicalProfile.skills.map((skill) => ({
        id: skill.id,
        canonicalName: skill.label,
        weight: skill.weight,
        category: skill.category,
        sourceSkillIds: skill.sourceSkillIds,
    }));

    console.log(`✅ Retrieved canonical profile: ${experiences.length} experiences (${experiencesWithBullets.length} with bullets), ${skills.length} skills`);

    return {
        experiences,
        skills,
    };
}

async function legacyRetrieveProfile(userId: string, jobDescription: string): Promise<RetrievedProfile> {
    const embedding = await embedText(jobDescription.substring(0, 8000));

    const { data: experiences } = await supabaseAdmin
        .from('experiences')
        .select('*')
        .eq('user_id', userId)
        .order('is_current', { ascending: false })
        .order('end_date', { ascending: false, nullsFirst: true });

    return {
        experiences: (experiences || []).map((experience: any) => ({
            id: experience.id,
            title: experience.title,
            company: experience.company,
            location: experience.location,
            startDate: experience.start_date,
            endDate: experience.end_date,
            isCurrent: !!experience.is_current,
            titleProgression: [],
            locations: [],
            sourceExperienceIds: [],
            tenureMonths: estimateTenureFromStrings(experience.start_date, experience.end_date, !!experience.is_current),
            bullets: [],
        })),
        skills: [],
    };
}

function estimateTenureMonths(experience: CanonicalProfile['experiences'][number]): number {
    return estimateTenureFromStrings(experience.startDate, experience.endDate, experience.isCurrent);
}

function estimateTenureFromStrings(
    startDate?: string | null,
    endDate?: string | null,
    isCurrent?: boolean
): number {
    const start = parseDate(startDate);
    const end = isCurrent ? new Date() : parseDate(endDate) || undefined;

    if (!start) {
        return 12;
    }

    const effectiveEnd = end ?? new Date();
    return Math.max(1, monthsBetween(start, effectiveEnd));
}

function parseDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    if (value.toLowerCase() === 'present') {
        return new Date();
    }

    const normalized =
        value.length === 4
            ? `${value}-01-01`
            : value.length === 7
            ? `${value}-01`
            : value;

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthsBetween(start: Date, end: Date): number {
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const days = end.getDate() - start.getDate();
    let total = years * 12 + months;
    if (days < 0) {
        total -= 1;
    }
    return Math.max(1, total + 1);
}

function buildSourceIds(
    representativeId?: string,
    supportingIds: string[] = []
): string[] {
    const combined = [
        representativeId,
        ...supportingIds,
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(combined));
}
