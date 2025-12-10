import { supabaseAdmin } from '../supabase';
import { embedText } from '../openai';
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

export type RetrievedEducation = {
    id: string;
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
};

export type RetrievedCertification = {
    id: string;
    name: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
};

export type RetrievedContactInfo = {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    portfolio?: string;
    // Note: address is intentionally excluded - never include in resume
};

export type RetrievedProfile = {
    experiences: RetrievedExperience[];
    skills: RetrievedSkill[];
    education: RetrievedEducation[];
    certifications: RetrievedCertification[];
    contactInfo?: RetrievedContactInfo;
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

    // Fetch education and certifications (always from canonical tables)
    const { data: educationData } = await supabaseAdmin
        .from('canonical_education')
        .select('*')
        .eq('user_id', userId)
        .order('end_date', { ascending: false, nullsFirst: true });

    const { data: certificationsData } = await supabaseAdmin
        .from('canonical_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false, nullsFirst: true });

    const education: RetrievedEducation[] = (educationData || []).map((edu: any) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.field_of_study,
        startDate: edu.start_date,
        endDate: edu.end_date,
        location: edu.location,
    }));

    const certifications: RetrievedCertification[] = (certificationsData || []).map((cert: any) => ({
        id: cert.id,
        name: cert.name,
        issuer: cert.issuer,
        issueDate: cert.issue_date,
        expiryDate: cert.expiry_date,
    }));

    // Fetch contact info from profiles table
    const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, phone_number, linkedin_url, portfolio_url')
        .eq('user_id', userId)
        .single();

    const contactInfo: RetrievedContactInfo | undefined = profileData ? {
        name: profileData.full_name || undefined,
        email: profileData.email || undefined,
        phone: profileData.phone_number || undefined,
        linkedin: profileData.linkedin_url || undefined,
        portfolio: profileData.portfolio_url || undefined,
        // Note: address is intentionally excluded - never include in resume
    } : undefined;

    console.log(`✅ Retrieved canonical profile: ${experiences.length} experiences (${experiencesWithBullets.length} with bullets), ${skills.length} skills, ${education.length} education, ${certifications.length} certifications, contact: ${contactInfo?.name || 'none'}`);

    return {
        experiences,
        skills,
        education,
        certifications,
        contactInfo,
    };
}

async function legacyRetrieveProfile(userId: string, jobDescription: string): Promise<RetrievedProfile> {
    console.log('📦 Using legacy profile retrieval (no canonical data)');

    // Fetch experiences with their bullets
    const { data: experiences } = await supabaseAdmin
        .from('experiences')
        .select(`
            *,
            experience_bullets (
                id,
                content,
                embedding,
                source_count
            )
        `)
        .eq('user_id', userId)
        .order('is_current', { ascending: false })
        .order('end_date', { ascending: false, nullsFirst: true });

    // Fetch skills
    const { data: skills } = await supabaseAdmin
        .from('skills')
        .select('*')
        .eq('user_id', userId);

    // Fetch education
    const { data: educationData } = await supabaseAdmin
        .from('canonical_education')
        .select('*')
        .eq('user_id', userId)
        .order('end_date', { ascending: false, nullsFirst: true });

    // Fetch certifications
    const { data: certificationsData } = await supabaseAdmin
        .from('canonical_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false, nullsFirst: true });

    // Fetch contact info from profiles table
    const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, phone_number, linkedin_url, portfolio_url')
        .eq('user_id', userId)
        .single();

    console.log(`📦 Legacy retrieval: ${experiences?.length || 0} experiences, ${skills?.length || 0} skills, ${educationData?.length || 0} education, ${certificationsData?.length || 0} certifications, contact: ${profileData?.full_name || 'none'}`);

    return {
        experiences: (experiences || []).map((experience: any) => {
            const bullets: RetrievedBullet[] = (experience.experience_bullets || []).map((bullet: any) => ({
                id: bullet.id,
                experienceId: experience.id,
                text: bullet.content,
                embedding: bullet.embedding,
                sourceIds: [bullet.id],
                representativeId: bullet.id,
                supportingIds: [],
                averageSimilarity: 1.0,
            }));

            return {
                id: experience.id,
                title: experience.title,
                company: experience.company,
                location: experience.location,
                startDate: experience.start_date,
                endDate: experience.end_date,
                isCurrent: !!experience.is_current,
                titleProgression: [],
                locations: [],
                sourceExperienceIds: [experience.id],
                tenureMonths: estimateTenureFromStrings(experience.start_date, experience.end_date, !!experience.is_current),
                bullets,
            };
        }),
        skills: (skills || []).map((skill: any) => ({
            id: skill.id,
            canonicalName: skill.name || skill.canonical_name,
            weight: skill.frequency || 1,
            category: skill.category || 'Other',
            sourceSkillIds: [skill.id],
        })),
        education: (educationData || []).map((edu: any) => ({
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.field_of_study,
            endDate: edu.end_date,
            location: edu.location,
        })),
        certifications: (certificationsData || []).map((cert: any) => ({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer,
            issueDate: cert.issue_date,
            expiryDate: cert.expiry_date,
        })),
        contactInfo: profileData ? {
            name: profileData.full_name || undefined,
            email: profileData.email || undefined,
            phone: profileData.phone_number || undefined,
            linkedin: profileData.linkedin_url || undefined,
            portfolio: profileData.portfolio_url || undefined,
        } : undefined,
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
