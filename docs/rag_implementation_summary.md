# RAG Pipeline Implementation Summary

## Overview

This document summarizes the complete implementation of the RAG (Retrieval-Augmented Generation) pipeline improvements outlined in `tailor_rag_plan.md`. All sections (3-6) have been implemented with full provenance tracking and enhanced quality controls.

## Implementation Status: ✅ COMPLETE

All planned improvements have been implemented:
- ✅ Section 3: Canonicalization Improvements
- ✅ Section 4: JD-Aware Retrieval & Selection
- ✅ Section 5: Writer Agent Improvements
- ✅ Section 6: Critic Agent Improvements
- ✅ Bonus: Profile Enrichment System

---

## Section 3: Canonicalization Improvements

### Safer Bullet Deduplication (`lib/bullet-dedupe.ts`)

**Changes:**
- Added content analysis to detect metrics, tools, and regulations
- Implemented `computeCandidateScore()` to prioritize metric-rich bullets
- Added `shouldMergeCandidates()` to prevent merging metric-rich with non-metric bullets
- Lowered similarity threshold from 0.92 to 0.88 for better grouping
- Added `sourceIds` field to track provenance

**Key Functions:**
- `analyzeBulletContent()`: Detects metrics, tools, regulations
- `computeCandidateScore()`: Scores bullets based on content quality
- `computeClusterPriority()`: Ranks bullet clusters
- `shouldMergeCandidates()`: Prevents inappropriate merges

### Stronger Placeholder Guards (`lib/profile-canonicalizer.ts`)

**Changes:**
- Added experience-level filtering for placeholder content
- Implemented `shouldSkipExperience()` to filter out incomplete experiences
- Added `hasPlaceholderDates()` to detect date placeholders
- Created pattern lists for company, location, and date placeholders

**Key Functions:**
- `shouldSkipExperience()`: Filters experiences with placeholder content
- `hasPlaceholderDates()`: Detects YYYY-MM, not provided, etc.
- `matchesPattern()`: Generic pattern matching utility

### Dynamic Bullet Budgeting (`lib/profile-canonicalizer.ts`)

**Changes:**
- Implemented `calculateBulletBudget()` for per-experience bullet limits
- Budget based on experience duration (tenure months)
- Longer tenures get more bullets (up to 6)
- Shorter tenures get fewer bullets (2-3)

**Budget Rules:**
- 0-12 months: 2 bullets
- 12-24 months: 3 bullets
- 24-48 months: 4 bullets
- 48+ months: 6 bullets

---

## Section 4: JD-Aware Retrieval & Selection

### JD Understanding Agent (`lib/rag/parser.ts`)

**New Feature:**
- Created `parseJobDescriptionToContext()` function
- Extracts structured context from job descriptions using Gemini
- Returns `ParsedJobDescription` with:
  - `normalizedTitle`: Standardized job title
  - `level`: IC, Senior IC, Manager, Director, VP, Executive
  - `domain`: Industry/domain (e.g., fintech, healthcare)
  - `responsibilities`: Key responsibilities
  - `hardSkills`: Technical skills, tools, frameworks
  - `softSkills`: Communication, leadership, etc.
  - `queries`: 3-5 semantic search queries

**Fallback Logic:**
- If parsing fails, derives queries from title + description
- Ensures at least one query is always available

### Multi-Query Bullet Scoring (`lib/rag/selector.ts`)

**Changes:**
- Implemented `scoreBullets()` for multi-query semantic scoring
- Each bullet scored against all JD-derived queries
- Takes maximum similarity across all queries
- Adds bonuses for:
  - Tool/skill matches: +0.2
  - Metric presence: +0.15

**Scoring Formula:**
```
score = clamp(similarity * 0.65 + toolBoost + metricBoost)
```

### Per-Experience Bullet Budgets (`lib/rag/selector.ts`)

**Changes:**
- Implemented `determineBulletBudget()` for dynamic limits
- Budget based on:
  - Experience order (most recent gets more)
  - Tenure months (longer tenure gets more)

**Budget Rules:**
- Top 2 experiences: 6 bullets
- Experiences 3-4: 4 bullets
- Older experiences: 2-3 bullets (based on tenure)

### Enhanced Selection Types (`lib/rag/selection-types.ts`)

**New Types:**
- `ParsedJobDescription`: Structured JD context
- `JobSelectionSignals`: Embeddings + parsed JD
- `TargetedBullet`: Scored bullet with provenance
- `TargetedExperience`: Experience with bullet candidates
- `WriterExperience`: Structured input for writer agent
- `WriterBulletCandidate`: Bullet with score + metadata
- `TargetAwareProfile`: Complete selection result

---

## Section 5: Writer Agent Improvements

### Structured Input (`lib/gemini.ts`)

**Changes:**
- Renamed `prepareAtomicProfile()` to `prepareWriterProfile()`
- Accepts `TargetedProfilePayload` with:
  - `experiences`: Array of `WriterExperience` objects
  - `topSkills`: Prioritized skills
  - `parsedJD`: Structured job context
- Each `WriterExperience` includes:
  - `bullet_budget`: Dynamic limit per experience
  - `bullet_candidates`: Scored bullets with provenance

### Enhanced Prompt (`lib/gemini.ts`)

**Changes:**
- Added "Parsed JD Summary" section with structured context
- Included bullet budget per experience in prompt
- Added quality guardrails:
  - Respect bullet budgets
  - Never fabricate content
  - Preserve metrics and tools
  - Log provenance in `source_ids` and `merged_from`

### Structured Output (`lib/gemini.ts`)

**Changes:**
- Updated JSON schema to require:
  - `bullets`: Array of objects (not strings)
  - Each bullet has `text` and `source_ids`
  - Optional `merged_from` for merged bullets
- Added validation in `lib/resume-content.ts`:
  - `validateExperienceRecord()` parses `source_ids`
  - Stores in `bulletSources` field

---

## Section 6: Critic Agent Improvements

### Structured Critique (`lib/resume-critic.ts`)

**Changes:**
- Updated output to `CritiquePayload` with:
  - `score`: `CriticScorecard` with 4 dimensions
  - `issues`: Array of `CriticIssue` objects
- Each issue includes:
  - `experience_id`: Which experience
  - `bullet_index`: Which bullet (1-based)
  - `issueType`: Category (too_generic, missing_metric, jd_gap, etc.)
  - `explanation`: Why it's an issue
  - `suggested_rewrite`: Optional safe rewrite

### Enhanced Rubric (`lib/resume-critic.ts`)

**Changes:**
- Added "Parsed JD Context" to prompt
- Critic evaluates:
  - Keyword coverage
  - Semantic fit
  - Metric density
  - Overall quality
- Provides structured feedback per bullet

### Safe Rewrites (`lib/resume-critic.ts`)

**Changes:**
- Critic only suggests rewrites that:
  - Reuse verified facts (same companies, tools, metrics)
  - Rephrase for clarity
  - Never fabricate new information
- Rewrites are optional and user-reviewable

---

## Bonus: Profile Enrichment System

### API Endpoints (`app/api/profile/enrich/route.ts`)

**New Endpoints:**
- `POST /api/profile/enrich`: Promote bullet to canonical profile
- `GET /api/profile/enrich?experienceId=xxx`: Fetch enrichment candidates

**Features:**
- Full provenance tracking with `source_ids` and `merged_from`
- Ownership verification (users can only enrich their own profiles)
- Deduplication (don't show bullets already in canonical profile)
- Embedding generation for promoted bullets

### React Hook (`hooks/use-profile-enrichment.ts`)

**New Hook: `useProfileEnrichment()`**
- `fetchCandidates()`: Get enrichment candidates
- `promoteBullet()`: Promote bullet to canonical profile
- Loading and error states

### UI Component (`components/profile-enrichment-panel.tsx`)

**New Component: `ProfileEnrichmentPanel`**
- Displays enrichment candidates
- Shows provenance (source count, merged from)
- One-click promotion
- Visual feedback for promoted bullets

---

## Data Flow

### 1. Ingestion → Canonicalization
```
Raw Resume → Parse → Experiences + Bullets
  ↓
Canonicalize → Group similar experiences
  ↓
Dedupe bullets → Preserve metrics, track provenance
  ↓
Store in canonical_experiences + canonical_bullets
```

### 2. JD-Aware Selection
```
Job Description → Parse → ParsedJobDescription
  ↓
Generate embeddings → jobEmbedding + queryEmbeddings
  ↓
Retrieve canonical profile
  ↓
Score bullets → Multi-query + tool/metric bonuses
  ↓
Select top experiences → Dynamic bullet budgets
  ↓
Build WriterExperience objects → Structured input
```

### 3. Generation
```
WriterExperience[] + ParsedJD → Writer Agent
  ↓
Generate resume → Respect budgets, preserve facts
  ↓
Output with provenance → source_ids + merged_from
  ↓
Critic Agent → Structured feedback
  ↓
Final resume → Store in resume_versions
```

### 4. Enrichment (Optional)
```
Generated resume → Extract bullets with provenance
  ↓
User reviews candidates → ProfileEnrichmentPanel
  ↓
Promote bullet → POST /api/profile/enrich
  ↓
Add to canonical_bullets → With full provenance
  ↓
Available for future generations
```

---

## Key Metrics & Thresholds

### Canonicalization
- Bullet similarity threshold: 0.88 (lowered from 0.92)
- Max canonical bullets per experience: 6
- Max canonical skills: 12

### Selection
- Min relevance score: 0.1
- Max experiences in prompt: 5
- Max bullet candidates per experience: 6-12 (dynamic)
- Bullet scoring weights:
  - Semantic similarity: 65%
  - Tool/skill matches: 20%
  - Metric presence: 15%

### Experience Scoring
- Bullet score: 55%
- Keyword score: 20%
- Recency score: 20%
- Metric density: 5%

---

## Database Schema Updates

### `canonical_bullets` Table
- `source_bullet_ids`: Array of source bullet IDs (provenance)
- `representative_bullet_id`: NULL for promoted bullets
- `avg_similarity`: 1.0 for user-approved bullets
- `embedding`: Vector for semantic search

### `resume_versions` Table
- `content`: JSON with structured bullets
- Each bullet has:
  - `text`: Bullet content
  - `source_ids`: Canonical bullet IDs
  - `merged_from`: Optional merged bullet IDs

---

## Testing & Debugging

### Logging Added

**Retriever (`lib/rag/retriever.ts`):**
- Logs experiences with/without bullets
- Logs bullet embedding status

**Selector (`lib/rag/selector.ts`):**
- Logs bullet scoring results
- Logs experiences without bullet candidates
- Logs selection summary

**Generator (`lib/gemini.ts`):**
- Logs writer profile preparation
- Logs experiences used vs. dropped
- Logs bullet pool size

**API Route (`app/api/generate/route.ts`):**
- Logs parsed JD title
- Logs selection summary
- Validates writer experiences

### Common Issues & Fixes

**Issue 1: "No canonical experiences available for generation"**
- **Cause**: `prepareWriterProfile()` was expecting old structure
- **Fix**: Updated to process `WriterExperience[]` correctly

**Issue 2: "All selected experiences have no bullet candidates"**
- **Cause**: Bullets missing embeddings or very low similarity scores
- **Fix**: Added logging to trace bullet scoring and filtering

**Issue 3: `TypeError: job.description.substring is not a function`**
- **Cause**: `job.description` was null/undefined
- **Fix**: Introduced `jobDescriptionSeed` with safe fallbacks

---

## Performance Considerations

### Embedding Generation
- JD embedding: 1 call per generation
- Query embeddings: Up to 5 calls per generation
- Bullet embeddings: Generated once during canonicalization

### Database Queries
- Canonical profile: 1 query per generation
- Resume versions: 1 query per enrichment fetch
- Bullet promotion: 2 queries (verify + insert)

### LLM Calls
- JD parsing: 1 call per generation (Gemini 2.0 Flash)
- Resume generation: 1 call per generation (Gemini 2.0 Flash)
- Resume critique: 1 call per generation (Gemini 2.0 Flash)

**Total per generation: 3 LLM calls + 6-7 embedding calls**

---

## Future Enhancements

### Short Term
- [ ] Auto-suggest high-quality enrichment candidates
- [ ] Bulk bullet promotion
- [ ] Undo promoted bullets
- [ ] A/B test different scoring weights

### Medium Term
- [ ] Track which merges users prefer (analytics)
- [ ] Collaborative filtering for enrichment suggestions
- [ ] Multi-language support for JD parsing
- [ ] Custom bullet budgets per user

### Long Term
- [ ] Fine-tune embedding model on user data
- [ ] Personalized scoring based on user preferences
- [ ] Automated canonicalization improvements
- [ ] Real-time resume preview during generation

---

## Documentation

### New Files Created
- `docs/profile_enrichment.md`: Complete enrichment guide
- `docs/rag_implementation_summary.md`: This file
- `lib/rag/job-types.ts`: JD parsing types
- `lib/rag/selection-types.ts`: Selection types
- `app/api/profile/enrich/route.ts`: Enrichment API
- `hooks/use-profile-enrichment.ts`: Enrichment hook
- `components/profile-enrichment-panel.tsx`: Enrichment UI

### Updated Files
- `lib/bullet-dedupe.ts`: Enhanced deduplication
- `lib/profile-canonicalizer.ts`: Placeholder guards + budgeting
- `lib/rag/parser.ts`: JD parsing agent
- `lib/rag/retriever.ts`: Provenance tracking
- `lib/rag/selector.ts`: Multi-query scoring + budgeting
- `lib/resume-content.ts`: Bullet provenance
- `lib/gemini.ts`: Structured input/output
- `lib/resume-critic.ts`: Structured critique
- `app/api/generate/route.ts`: JD parsing integration
- `DEVELOPMENT_STATUS.md`: Feature status

---

## Conclusion

All planned RAG improvements have been successfully implemented with:
- ✅ Full provenance tracking throughout the pipeline
- ✅ Enhanced quality controls (metrics, tools, regulations)
- ✅ JD-aware selection with multi-query scoring
- ✅ Structured input/output for writer and critic agents
- ✅ Profile enrichment system for continuous improvement
- ✅ Comprehensive logging and error handling
- ✅ Type-safe TypeScript throughout

The system is now ready for testing. The next step is to:
1. Run a complete generation workflow
2. Verify bullet provenance is tracked correctly
3. Test profile enrichment feature
4. Monitor logs for any issues
5. Gather user feedback on quality improvements

