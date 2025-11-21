'use client';

import { useState } from 'react';

export type EnrichmentCandidate = {
  text: string;
  sourceIds: string[];
  mergedFrom?: string[];
  resumeId: string;
  createdAt: string;
};

export type EnrichmentCandidatesResponse = {
  experienceId: string;
  company: string;
  title: string;
  candidates: EnrichmentCandidate[];
};

/**
 * Hook for managing profile enrichment (promoting bullets to canonical profile)
 */
export function useProfileEnrichment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch enrichment candidates for a specific canonical experience
   */
  const fetchCandidates = async (
    experienceId: string
  ): Promise<EnrichmentCandidatesResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/profile/enrich?experienceId=${experienceId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch enrichment candidates');
      }

      const data: EnrichmentCandidatesResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Error fetching enrichment candidates:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Promote a bullet to the canonical profile
   */
  const promoteBullet = async (
    canonicalExperienceId: string,
    bullet: {
      text: string;
      sourceIds: string[];
      mergedFrom?: string[];
    }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canonicalExperienceId,
          promotedBullet: bullet,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote bullet');
      }

      const result = await response.json();
      console.log('✅ Bullet promoted:', result);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Error promoting bullet:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchCandidates,
    promoteBullet,
  };
}

