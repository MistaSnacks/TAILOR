# Resume Quality Review & Gap Analysis

## 1. Structural / Content Issues Observed

- **Duplicate roles & titles**
  - Multiple `Operations Manager` entries with missing metadata (“Not provided”).
  - Finance roles repeated (“Back Office Lead Operations Analyst”, “Back Office LeadBack Office Lead”).
  - Self Financial roles split awkwardly (“Fraud Operations Manager” vs “Fraud Operations Lead”) with overlapping dates.
- **Placeholder leakage**
  - Companies labeled “Company Name”.
  - Locations / dates left as “N/A”, “Not provided”, “YYYY-MM - YYYY-MM”.
- **Inconsistent date formatting**
  - Mix of `YYYY-MM`, `YYYY`, `2019 - 2021`, `YYYY-MM - Present`.
  - Overlapping ranges that obscure career progression.
- **Mixed target profile**
  - Summary tuned to a specific JD (Formation mission) while experience lists every past role regardless of relevance.
- **Redundant / generic bullets**
  - Near-duplicate bullets (e.g., “Led and managed development processes…” repeated).
  - Generic phrases with no metrics (“Developed and maintained operational workflows…”).
- **Bloated skills section**
  - Long comma-separated synonym soup (“Operations • Business Operations • Operational Efficiency…”).

> These are issues OpenResume / Jobscan solve via strict structure, curated templates, and aggressive validation.

## 2. Probable Pipeline Root Causes

- **Missing canonicalization layer**
  - Current pipeline still behaves like “RAG over raw docs”; placeholder strings survive ingestion, and duplicate experiences remain.
- **Document misclassification**
  - Templates, job descriptions, and notes are parsed as if they were real resumes.
- **No dedupe / merge step**
  - Experiences with same company + overlapping dates are treated as unique entries.
- **Lack of validation**
  - Placeholder values and incomplete experiences are never rejected before rendering.
- **Unconstrained generation**
  - LLM is allowed to echo noisy inputs, retain generic bullets, and omit metrics.
- **Ungrouped skills**
  - Skills are concatenated from every source without normalization or limits.

## 3. What “Good” Looks Like (OpenResume / Jobscan Benchmarks)

### Stage 1 – Ingest
- Classify documents (`resume`, `job_description`, `template`, etc.) and only mine trusted sources.
- Strip placeholders (`Company Name`, `City, State`, `YYYY-MM`) before storing structured data.

### Stage 2 – Canonicalize
- Merge experiences by normalized company + overlapping/adjacent dates; track title progression.
- Embed bullets to cluster and deduplicate similar statements; retain strongest phrasing.
- Normalize skills into a curated taxonomy and cap visible items (8–12 grouped entries).

### Stage 3 – Select (per target JD)
- Score each experience on relevance (semantic similarity, keywords, recency) and keep only the top set.
- Apply hard rules: no placeholders, no empty company/title/dates, drop irrelevant or outdated roles.

### Stage 4 – Generate
- Use canonical data only; forbid fabricated companies/titles/dates.
- Enforce Action–Context–Result bullets with metrics where possible.
- Run a critic/rubric pass to reject weak or duplicate bullets before final output.
- Maintain consistent formatting: reverse chronological order, unified date format, standard section headings.

## 4. Prioritized Action Items

1. **Block placeholders at ingestion** – treat “Company Name”, “Not provided”, “YYYY-MM” as nulls.
2. **Document classification** – only build experience/skills from resume-type uploads.
3. **Experience merge + bullet dedupe** – merge by company/date; embed + cluster bullets to drop near duplicates.
4. **JD-aware selection** – relevance scoring to keep top 3–5 experiences for the target role.
5. **Prompt tightening** – enforce no placeholders, no generic bullets, chronological order, and ATS-friendly sections.
6. **Critic/rubric pass** – score bullets and rewrite/drop generic or duplicate statements.

## 5. Comparison vs Current Implementation

| Capability | Current State (TAILOR) | Gap / Needed Work |
|------------|------------------------|-------------------|
| Doc classification | Upload API logs & stores `document_type` + placeholder flags | Gate downstream flows + surface warnings in UI |
| Placeholder stripping | Sanitizer removes template tokens before chunking/RAG | Extend enforcement to generation prompts & QA |
| Experience merge | None (each parsed chunk stored separately) | Build canonical layer & merge logic |
| Bullet quality | LLM echoes parsed text; no dedupe | Add clustering + critic pass |
| Skills normalization | Simple list of parsed values | Map to taxonomy + limit output list |
| JD relevance | Generation uses all parsed docs | Implement relevance scoring & selection |

Focusing on these steps will close the quality gap and bring generated resumes in line with opinionated systems like OpenResume and Jobscan. 


