# Resume Quality Upgrade Plan

## Phase 1 – Ingestion Hardening *(Status: Completed – Nov 21, 2025)*

1. **Document Typing & Filtering** (`app/api/upload/route.ts`, `supabase/schema.sql`)

   - Detect document types (resume, JD, template) at upload.
   - Reject or flag files with placeholder-heavy content ("Company Name", "YYYY-MM").
   - Persist `document_type` + placeholder flags for downstream filtering.

2. **Placeholder Sanitizer** (`lib/parse.ts`, `lib/rag/*`)

   - Strip/convert placeholder strings to `null` before inserting into `documents` or chunk tables.
   - Log sanitized fields for debugging.

## Phase 2 – Canonical Profile Layer

3. Normalize & Merge Experiences (`supabase/schema.sql`, new `lib/profile-canonicalizer.ts`)

   - Create canonical tables or materialized view aggregating experiences by normalized company + overlapping dates.
   - Record title progression and merged bullet pools per company.

4. Bullet & Skill Deduping (`lib/chunking.ts`, new `lib/bullet-dedupe.ts`)

   - Embed bullets to cluster near duplicates; keep strongest phrasing with source counts.
   - Map raw skills to a controlled taxonomy and cap displayed skills per resume.

## Phase 3 – Target-Aware Selection

5. Relevance Scoring Service (`app/api/generate/route.ts`, `lib/rag/selector.ts`)

   - Score canonical experiences against the target JD (semantic + keyword + recency).
   - Select top N experiences; summarize or drop low-signal roles.

6. Validation Ruleset (`lib/resume-content.ts`)

   - Enforce no-placeholder, complete date/company/title before an experience is eligible for rendering.
   - Provide fallback messaging when entries are filtered out.

## Phase 4 – Generation & Critique

7. Prompt Tightening (`lib/gemini.ts` generation helpers)

   - Update writer prompt to reference only canonical data, require chronological order, and forbid placeholders.
   - Inject normalized skills + ATS-friendly sections explicitly.
   - ✅ Atomic generator prompt now enforces canonical-only facts, ATS section contracts, placeholder stripping, and normalized skill ordering (`lib/gemini.ts`).

8. Critic/Rubric Pass (`lib/gemini.ts` or new `lib/resume-critic.ts`)

   - Add post-generation evaluator that scores bullets for A/C/R structure, metrics, duplication.
   - Rewrite or drop bullets that fail the rubric before saving to `resume_versions`.
   - ✅ `runResumeCritic` now captures bullet-level A/C/R scoring metadata and rewrites weak bullets before storage.

Each phase builds on existing chunking + ATS infrastructure. Once this plan is approved we can split execution across agents per phase.

### To-dos

- [x] Add doc typing and placeholder filtering
- [ ] Build canonical experience/skill merge layer
- [ ] Implement JD-aware experience selection
- [x] Tighten prompts and add critic pass

