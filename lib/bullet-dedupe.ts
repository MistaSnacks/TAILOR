import { randomUUID } from 'crypto';
import { embedText } from './openai';
import {
  BULLET_SIMILARITY_THRESHOLD,
  MAX_CANONICAL_BULLETS,
} from './chunking';

export type BulletCandidate = {
  id?: string;
  content: string;
  sourceCount?: number | null;
  importanceScore?: number | null;
  embedding?: number[] | string | null;
};

export type DedupedBullet = {
  id: string;
  content: string;
  representativeBulletId?: string;
  supportingBulletIds: string[];
  sourceIds: string[];
  sourceCount: number;
  averageSimilarity: number;
  embedding?: number[] | null;
};

export type BulletDedupeOptions = {
  similarityThreshold?: number;
  maxBullets?: number;
};

type NormalizedCandidate = {
  id?: string;
  content: string;
  sourceCount: number;
  importance: number;
  embedding: number[] | null;
  contentBoost: number;
  hasMetric: boolean;
  toolHits: string[];
  regulatoryHits: string[];
  numericTokens: string[];
};

type BulletCluster = {
  id: string;
  representative: NormalizedCandidate;
  members: NormalizedCandidate[];
  totalSourceCount: number;
  averageSimilarity: number;
};

const METRIC_REGEX =
  /(?:\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(?:\s?(?:%|percent|pts?|x|k|m|b|mm|bn|\$|k\+|m\+|b\+))|\b(?:double[sd]?|tripled|quadrupled)\b/i;

const TOOL_KEYWORDS = [
  'sql',
  'python',
  'tableau',
  'lookml',
  'snowflake',
  'dbt',
  'bigquery',
  'airflow',
  'looker',
  'superset',
  'power bi',
  'excel',
  'jira',
  'asana',
  'sap',
  'salesforce',
  'netsuite',
  'segment',
  'mixpanel',
  'redshift',
  'fraud',
  'aml',
  'kpi',
  'okr',
  'api',
  'rest',
  'graphql',
];

const REGULATORY_KEYWORDS = [
  'fcra',
  'reg z',
  'regulation z',
  'reg e',
  'nacha',
  'bsa',
  'aml',
  'kyc',
  'ofac',
  'sox',
  'gdpr',
  'ccpa',
];

/**
 * Deduplicate bullets by clustering embeddings and selecting the strongest phrasing.
 */
export async function dedupeBullets(
  bullets: BulletCandidate[],
  options: BulletDedupeOptions = {}
): Promise<DedupedBullet[]> {
  if (!bullets || bullets.length === 0) {
    return [];
  }

  const similarityThreshold =
    options.similarityThreshold ?? BULLET_SIMILARITY_THRESHOLD;
  const maxBullets = options.maxBullets ?? MAX_CANONICAL_BULLETS;

  const normalized = await normalizeCandidates(bullets);
  const filtered = normalized.filter(
    (candidate) => candidate.content.trim().length > 0
  );

  if (filtered.length === 0) {
    return [];
  }

  const sorted = filtered.sort(
    (a, b) => computeCandidateScore(b) - computeCandidateScore(a)
  );

  const clusters: BulletCluster[] = [];

  for (const candidate of sorted) {
    const targetEmbedding = candidate.embedding;

    if (!targetEmbedding) {
      clusters.push(createCluster(candidate, 1));
      continue;
    }

    let matchedCluster: BulletCluster | null = null;
    let bestSimilarity = 0;

    for (const cluster of clusters) {
      if (!cluster.representative.embedding) {
        continue;
      }
      const similarity = cosineSimilarity(
        targetEmbedding,
        cluster.representative.embedding
      );
      if (
        similarity > bestSimilarity &&
        similarity >= similarityThreshold &&
        shouldMergeCandidates(cluster.representative, candidate)
      ) {
        matchedCluster = cluster;
        bestSimilarity = similarity;
      }
    }

    if (!matchedCluster) {
      clusters.push(createCluster(candidate, 1));
    } else {
      matchedCluster.members.push(candidate);
      matchedCluster.totalSourceCount += candidate.sourceCount;
      // Incremental average similarity for reporting
      const memberCount = matchedCluster.members.length;
      matchedCluster.averageSimilarity =
        (matchedCluster.averageSimilarity * (memberCount - 1) +
          bestSimilarity) /
        memberCount;

      // Replace representative if this candidate scores higher
      const repScore = computeCandidateScore(matchedCluster.representative);
      const candidateScore = computeCandidateScore(candidate);

      if (candidateScore > repScore) {
        matchedCluster.representative = candidate;
      }
    }
  }

  const prioritizedClusters = clusters
    .sort(
      (a, b) => computeClusterPriority(b) - computeClusterPriority(a)
    )
    .slice(0, Math.max(1, Math.min(maxBullets, clusters.length)));

  return prioritizedClusters.map((cluster) => ({
    id: cluster.id,
    content: cluster.representative.content.trim(),
    representativeBulletId: cluster.representative.id,
    supportingBulletIds: cluster.members
      .map((member) => member.id)
      .filter((memberId): memberId is string => !!memberId),
    sourceIds: Array.from(
      new Set(
        [cluster.representative.id, ...cluster.members.map((member) => member.id)].filter(
          (value): value is string => Boolean(value)
        )
      )
    ),
    sourceCount: cluster.totalSourceCount,
    averageSimilarity: Number(cluster.averageSimilarity.toFixed(3)),
    embedding: cluster.representative.embedding,
  }));
}

async function normalizeCandidates(
  bullets: BulletCandidate[]
): Promise<NormalizedCandidate[]> {
  return Promise.all(
    bullets.map(async (bullet) => {
      const embedding = await ensureEmbedding(bullet);
      const analysis = analyzeBulletContent(bullet.content || '');
      return {
        id: bullet.id,
        content: bullet.content || '',
        sourceCount: Math.max(1, bullet.sourceCount ?? 1),
        importance: bullet.importanceScore ?? 0,
        embedding,
        contentBoost: analysis.boost,
        hasMetric: analysis.hasMetric,
        toolHits: analysis.toolHits,
        regulatoryHits: analysis.regHits,
        numericTokens: analysis.numericTokens,
      };
    })
  );
}

async function ensureEmbedding(
  bullet: BulletCandidate
): Promise<number[] | null> {
  if (Array.isArray(bullet.embedding)) {
    return bullet.embedding;
  }

  if (typeof bullet.embedding === 'string') {
    const parsed = parseVectorString(bullet.embedding);
    if (parsed.length) {
      return parsed;
    }
  }

  if (!bullet.content) {
    return null;
  }

  try {
    return await embedText(bullet.content);
  } catch (error) {
    console.error('❌ Failed to embed bullet during dedupe:', error);
    return null;
  }
}

function parseVectorString(value: string): number[] {
  if (!value) return [];
  const sanitized = value.replace(/[{}\[\]\(\)]/g, '');
  return sanitized
    .split(',')
    .map((segment) => Number.parseFloat(segment.trim()))
    .filter((num) => !Number.isNaN(num));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (!magA || !magB) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function createCluster(
  representative: NormalizedCandidate,
  similarity: number
): BulletCluster {
  return {
    id: randomUUID(),
    representative,
    members: [representative],
    totalSourceCount: representative.sourceCount,
    averageSimilarity: similarity,
  };
}

function computeCandidateScore(candidate: NormalizedCandidate): number {
  const baseScore = candidate.sourceCount * 2 + candidate.importance;
  const metricBonus = candidate.hasMetric ? 4 : 0;
  const toolBonus = Math.min(3, candidate.toolHits.length);
  const regBonus = Math.min(2, candidate.regulatoryHits.length);
  return baseScore + candidate.contentBoost + metricBonus + toolBonus + regBonus;
}

function computeClusterPriority(cluster: BulletCluster): number {
  const representativeScore = computeCandidateScore(cluster.representative);
  const densityScore =
    cluster.totalSourceCount + cluster.averageSimilarity * 5;
  return representativeScore + densityScore;
}

function analyzeBulletContent(content: string): {
  boost: number;
  hasMetric: boolean;
  toolHits: string[];
  regHits: string[];
  numericTokens: string[];
} {
  if (!content) {
    return { boost: 0, hasMetric: false, toolHits: [], regHits: [], numericTokens: [] };
  }

  const normalized = content.toLowerCase();
  const hasMetric = METRIC_REGEX.test(content);
  const toolHits = collectKeywordHits(normalized, TOOL_KEYWORDS);
  const regHits = collectKeywordHits(normalized, REGULATORY_KEYWORDS);

  const metricBoost = hasMetric ? 5 : 0;
  const toolBoost = Math.min(3, toolHits.length);
  const regBoost = Math.min(2, regHits.length);

  return {
    boost: metricBoost + toolBoost + regBoost,
    hasMetric,
    toolHits,
    regHits,
    numericTokens: extractNumericTokens(content),
  };
}

function collectKeywordHits(content: string, keywords: string[]): string[] {
  const hits: string[] = [];
  keywords.forEach((keyword) => {
    if (!keyword) {
      return;
    }
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    if (pattern.test(content)) {
      hits.push(keyword);
    }
  });
  return hits;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldMergeCandidates(
  representative: NormalizedCandidate,
  candidate: NormalizedCandidate
): boolean {
  if (representative.hasMetric && !candidate.hasMetric) {
    return false;
  }

  if (representative.hasMetric && candidate.hasMetric) {
    if (
      representative.numericTokens.length &&
      candidate.numericTokens.length &&
      !representative.numericTokens.some((token) => candidate.numericTokens.includes(token))
    ) {
      return false;
    }
  }

  return true;
}

function extractNumericTokens(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/[\$]?\d[\d,]*(?:\.\d+)?%?/gi);
  if (!matches) return [];
  return matches.map((token) => token.replace(/[,\s]/g, '').toLowerCase());
}

