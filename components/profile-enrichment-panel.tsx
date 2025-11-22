'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProfileEnrichment, type EnrichmentCandidate } from '@/hooks/use-profile-enrichment';

type ProfileEnrichmentPanelProps = {
  canonicalExperienceId: string;
  company: string;
  title: string;
  onBulletPromoted?: () => void;
};

/**
 * Panel for reviewing and promoting bullets from generated resumes
 * back into the canonical profile.
 * 
 * This allows users to enrich their canonical profile over time by
 * approving high-quality merged bullets.
 */
export function ProfileEnrichmentPanel({
  canonicalExperienceId,
  company,
  title,
  onBulletPromoted,
}: ProfileEnrichmentPanelProps) {
  const { loading, error, fetchCandidates, promoteBullet } = useProfileEnrichment();
  const [candidates, setCandidates] = useState<EnrichmentCandidate[]>([]);
  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());

  const loadCandidates = useCallback(async () => {
    const result = await fetchCandidates(canonicalExperienceId);
    if (result) {
      setCandidates(result.candidates);
    }
  }, [canonicalExperienceId, fetchCandidates]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handlePromote = async (candidate: EnrichmentCandidate) => {
    const success = await promoteBullet(canonicalExperienceId, {
      text: candidate.text,
      sourceIds: candidate.sourceIds,
      mergedFrom: candidate.mergedFrom,
    });

    if (success) {
      setPromotedIds((prev) => new Set(prev).add(candidate.text));
      onBulletPromoted?.();
    }
  };

  if (loading && candidates.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading enrichment candidates...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No enrichment candidates available. Generate more resumes to see suggestions here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{company}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Review bullets from your generated resumes and promote them to your canonical profile.
        </p>
      </div>

      <div className="space-y-3">
        {candidates.map((candidate, index) => {
          const isPromoted = promotedIds.has(candidate.text);

          return (
            <div
              key={index}
              className={`p-3 border rounded-lg ${
                isPromoted
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm">{candidate.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {candidate.sourceIds.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                        {candidate.sourceIds.length} source{candidate.sourceIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {candidate.mergedFrom && candidate.mergedFrom.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                        Merged from {candidate.mergedFrom.length} bullet{candidate.mergedFrom.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handlePromote(candidate)}
                  disabled={loading || isPromoted}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isPromoted
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                  }`}
                >
                  {isPromoted ? '✓ Promoted' : 'Promote'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



