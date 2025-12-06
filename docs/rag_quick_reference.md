# RAG Pipeline Quick Reference

## Pipeline Flow

```
1. INGEST
   ↓
2. CANONICALIZE (dedupe, filter placeholders, budget bullets)
   ↓
3. PARSE JD (extract structured context)
   ↓
4. RETRIEVE (get canonical profile)
   ↓
5. SELECT (multi-query scoring, dynamic budgets)
   ↓
6. GENERATE (writer agent with structured input)
   ↓
7. CRITIQUE (structured feedback)
   ↓
8. ENRICH (optional: promote bullets back)
```

---

## Key Functions

### Canonicalization
```typescript
// lib/profile-canonicalizer.ts
buildCanonicalProfile(userId: string): Promise<void>
  └─> buildCanonicalExperiences()
      └─> dedupeBullets() // lib/bullet-dedupe.ts
          └─> analyzeBulletContent()
          └─> computeCandidateScore()
```

### JD Parsing
```typescript
// lib/rag/parser.ts
parseJobDescriptionToContext(job: JobParsingInput): Promise<ParsedJobDescription>
  └─> Returns: { normalizedTitle, level, domain, responsibilities, hardSkills, softSkills, queries }
```

### Selection
```typescript
// lib/rag/selector.ts
selectTargetAwareProfile(profile, job, signals, options): TargetAwareProfile
  └─> scoreBullets(bullets, signals)
      └─> computeSemanticSimilarity()
      └─> matchHardSkills()
  └─> determineBulletBudget(orderIndex, experience)
  └─> buildWriterContext(experience, bulletBudget, bulletPool)
```

### Generation
```typescript
// lib/gemini.ts
generateTailoredResumeAtomic(jobDescription, template, profile): Promise<string>
  └─> prepareWriterProfile(profile)
  └─> Gemini API call with structured prompt
  └─> Returns: JSON with bullets containing source_ids
```

### Critique
```typescript
// lib/resume-critic.ts
runResumeCritic({ resumeDraft, jobDescription, parsedJob }): Promise<ResumeCriticResult>
  └─> Returns: { revisedResume, critique: { score, issues } }
```

### Enrichment
```typescript
// app/api/profile/enrich/route.ts
POST /api/profile/enrich
  └─> Promotes bullet to canonical profile with provenance

GET /api/profile/enrich?experienceId=xxx
  └─> Fetches enrichment candidates
```

---

## Key Types

### JD Context
```typescript
type ParsedJobDescription = {
  normalizedTitle: string;
  level: 'IC' | 'Senior IC' | 'Manager' | 'Director' | 'VP' | 'Executive' | 'Unknown';
  domain: string;
  responsibilities: string[];
  hardSkills: string[];
  softSkills: string[];
  queries: string[];
};
```

### Selection
```typescript
type TargetedBullet = {
  id: string;
  experienceId: string;
  text: string;
  score: number;
  similarity: number;
  hasMetric: boolean;
  toolMatches: string[];
  sourceIds: string[];
};

type WriterExperience = {
  experience_id: string;
  title: string;
  company: string;
  location?: string;
  start?: string;
  end?: string | null;
  is_current?: boolean;
  bullet_budget: number;
  bullet_candidates: WriterBulletCandidate[];
};
```

### Critique
```typescript
type CriticIssue = {
  experience_id: string;
  bullet_index: number;
  issueType: 'too_generic' | 'missing_metric' | 'jd_gap' | 'redundant' | 'format';
  explanation: string;
  suggested_rewrite?: string;
};

type CriticScorecard = {
  overall: number;
  keywordCoverage: number;
  semanticFit: number;
  metricDensity: number;
};
```

---

## Configuration

### Canonicalization (`lib/chunking.ts`)
```typescript
MAX_CANONICAL_BULLETS = 6
MAX_CANONICAL_SKILLS = 12
BULLET_SIMILARITY_THRESHOLD = 0.88
```

### Selection (`lib/rag/selector.ts`)
```typescript
// Bullet scoring weights
similarity * 0.65 + toolBoost (0.2) + metricBoost (0.15)

// Experience scoring weights
bulletScore * 0.55 + keywordScore * 0.2 + recencyScore * 0.2 + metricDensity * 0.05

// Bullet budgets
Top 2 experiences: 6 bullets
Experiences 3-4: 4 bullets
Older experiences: 2-3 bullets (based on tenure)
```

### Generation (`lib/gemini.ts`)
```typescript
MAX_EXPERIENCES_FOR_PROMPT = 5
MAX_BULLET_CONTEXT_PER_ROLE = 6
MAX_SKILLS_FOR_PROMPT = 12
```

---

## Common Patterns

### Adding a New Scoring Factor
```typescript
// 1. Update TargetedBullet type in lib/rag/selection-types.ts
type TargetedBullet = {
  // ... existing fields
  newFactor: number;
};

// 2. Calculate in scoreBullets() in lib/rag/selector.ts
const newFactor = calculateNewFactor(bullet);
const newBoost = newFactor ? 0.1 : 0;
const score = clamp(similarity * 0.65 + toolBoost + metricBoost + newBoost);

return {
  // ... existing fields
  newFactor,
};

// 3. Update experience scoring if needed
const score = clamp(
  bulletScore * 0.5 + keywordScore * 0.2 + recencyScore * 0.2 + metricDensity * 0.05 + newFactorScore * 0.05
);
```

### Adding a New Placeholder Pattern
```typescript
// lib/profile-canonicalizer.ts
const NEW_PLACEHOLDER_PATTERNS = [
  /pattern1/i,
  /pattern2/i,
];

function shouldSkipExperience(experience: ExperienceRow): boolean {
  if (matchesPattern(experience.someField, NEW_PLACEHOLDER_PATTERNS)) {
    return true;
  }
  // ... rest of logic
}
```

### Adding a New Enrichment Feature
```typescript
// 1. Add endpoint in app/api/profile/enrich/route.ts
export async function PATCH(request: NextRequest) {
  // New enrichment operation
}

// 2. Add method to hook in hooks/use-profile-enrichment.ts
const newOperation = async (params) => {
  const response = await fetch('/api/profile/enrich', {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
  // ... handle response
};

return { newOperation };

// 3. Use in component
const { newOperation } = useProfileEnrichment();
await newOperation(params);
```

---

## Debugging

### Enable Verbose Logging
All debug logs are marked with `// REMOVE IN PRODUCTION`

Search for these emojis in logs:
- 🔑 Environment variables
- 🔐 API route entry
- 📊 Data analysis
- ✅ Success
- ⚠️ Warning
- ❌ Error

### Check Bullet Flow
```typescript
// 1. Retriever (lib/rag/retriever.ts)
console.log('📊 Bullet embeddings: X/Y bullets have embeddings');

// 2. Selector (lib/rag/selector.ts)
console.log('📊 Bullet scoring: X bullets, top score: Y, bottom score: Z');
console.log('📊 Selection bullet analysis: { withBullets, withoutBullets }');

// 3. Generator (lib/gemini.ts)
console.log('🧱 Atomic generator context: { experiencesUsed, bulletPool }');
```

### Trace Provenance
```typescript
// In generated resume JSON
{
  "bullets": [
    {
      "text": "...",
      "source_ids": ["canonical-bullet-id"],
      "merged_from": ["candidate-id-1", "candidate-id-2"]
    }
  ]
}

// Query canonical_bullets
SELECT * FROM canonical_bullets WHERE id = ANY(source_ids);

// Query source bullets
SELECT * FROM bullets WHERE id = ANY(source_bullet_ids);
```

---

## Testing Checklist

### Canonicalization
- [ ] Metric-rich bullets are preserved
- [ ] Placeholder experiences are filtered
- [ ] Bullet budgets are applied correctly
- [ ] Source IDs are tracked

### JD Parsing
- [ ] Structured context is extracted
- [ ] Fallback queries work when parsing fails
- [ ] Normalized title is reasonable

### Selection
- [ ] Bullets are scored correctly
- [ ] Multi-query scoring works
- [ ] Tool/metric bonuses are applied
- [ ] Bullet budgets are dynamic

### Generation
- [ ] Writer receives structured input
- [ ] Bullet budgets are respected
- [ ] Source IDs are preserved in output
- [ ] No hallucinated content

### Critique
- [ ] Structured feedback is provided
- [ ] Issues reference correct bullets
- [ ] Suggested rewrites are safe
- [ ] Scores are reasonable

### Enrichment
- [ ] Candidates are fetched correctly
- [ ] Promotion preserves provenance
- [ ] Duplicates are filtered
- [ ] Ownership is verified

---

## Performance Tips

### Reduce LLM Calls
- Cache parsed JD for same job description
- Reuse embeddings when possible
- Batch bullet scoring

### Optimize Database Queries
- Use indexes on `user_id`, `canonical_experience_id`
- Fetch only needed fields
- Use `select()` to limit columns

### Improve Embedding Speed
- Generate embeddings in parallel
- Use batch embedding API if available
- Cache embeddings in Redis (future)

---

## Troubleshooting

### "No canonical experiences available"
1. Check if canonical profile exists: `SELECT * FROM canonical_experiences WHERE user_id = ?`
2. Check if experiences have bullets: `SELECT * FROM canonical_bullets WHERE canonical_experience_id = ?`
3. Check logs for filtering reasons

### "All selected experiences have no bullet candidates"
1. Check if bullets have embeddings: Look for "X/Y bullets have embeddings" log
2. Check bullet scores: Look for "Bullet scoring: top score: X" log
3. Verify JD embedding was generated

### "TypeError: job.description.substring is not a function"
1. Check if `job.description` is null/undefined
2. Verify `jobDescriptionSeed` fallback is working
3. Check logs for "Generation error" traceback

---

## Quick Commands

### Run Generation
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"jobId": "uuid", "template": "modern"}'
```

### Check Canonical Profile
```sql
SELECT 
  ce.display_company,
  ce.primary_title,
  COUNT(cb.id) as bullet_count
FROM canonical_experiences ce
LEFT JOIN canonical_bullets cb ON cb.canonical_experience_id = ce.id
WHERE ce.user_id = 'uuid'
GROUP BY ce.id;
```

### View Enrichment Candidates
```bash
curl http://localhost:3000/api/profile/enrich?experienceId=uuid
```

---

## Resources

- Full implementation: `docs/rag_implementation_summary.md`
- Enrichment guide: `docs/profile_enrichment.md`
- Original plan: `tailor_rag_plan.md`
- Development status: `DEVELOPMENT_STATUS.md`





