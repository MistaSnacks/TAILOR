LLM thoughtsGPT 5.1Findings (ordered by impact)
* app/api/generate/route.ts (lines 609-689) vs app/api/resumes/[id]/route.ts (lines 170-230) use two different ATS engines. Generate path scores with Gemini calculateAtsScore (LLM prompt, score/keywordMatch/semanticSimilarity), while the resume update path uses runAtsScore from lib/ats-scorer.ts (deterministic + embeddings). The same columns (score, semantic_similarity) end up meaning different things depending on the route, so users see incompatible numbers and “semantic” labels aren’t comparable.
* Selection intentionally backfills low-alignment experiences, then the generator reorders them: lib/rag/selector.ts (lines 209-233) pulls below-threshold or even misaligned experiences to hit a quota, and lib/gemini.ts (lines 288-295) re-sorts the writer set by end date. Bullet budgets were computed from the original canonical order (determineBulletBudget), so budgets and alignment rationale no longer match the final ordering the model sees—leading to irrelevant roles and overlong bullet sets in the draft.
* Bullet-count and rewrite directives conflict across passes. The generator contract warns “never exceed bullet_budget” (lib/gemini.ts (lines 561-568)) but the downstream quality pass applies a flat maxBulletsPerExperience (default 6) and explicitly allows replacing/adding bullets up to that cap regardless of the per-role budget (lib/resume-quality-pass.ts (lines 309-333)). When the merged pass fails and Critic+Validator run, bullets can be rewritten a third time with yet another rubric. This stack of divergent instructions dilutes tone and risks drifting from the selected evidence.
* Skills/keyword truth guards are inconsistent. The generator says skills must be a subset of the normalized pool (lib/gemini.ts (lines 561-568)) but also encourages JD phrase inference (lib/gemini.ts (lines 606-615)) without checking the candidate_skill universe. The quality pass then tries to “gap-fill” skills using candidateSkillUniverse (only canonical skills) while also injecting JD phrases if “supported” (lib/resume-quality-pass.ts (lines 294-333)). Validator adds another prioritized-missing keyword injection path (lib/resume-validator.ts:25-76, 205-240). These overlapping, differently-scoped truth rules cause oscillation: skills added in one stage can be removed or reordered in the next, and JD phrases can slip in without explicit candidate backing.
* Traceability is lost after generation. The generator requires bullet objects with source_ids (lib/gemini.ts (lines 639-643)), but normalizeResumeContent collapses them to plain strings and quality/validator passes operate on strings only; merged output no longer carries the provenance, so later critiques/edits can’t know which canonical bullets were actually used.
Quick Fix Directions
1. Pick one ATS scorer (deterministic or LLM) and use it everywhere; if both must coexist, rename fields to reflect the source and expose which engine produced the score.
2. Stop backfilling misaligned experiences and honor per-role bullet budgets end-to-end (don’t re-sort after budgeting).
3. Unify the editing contract: one aggressive rewrite pass with a single bullet-count rule; turn off Critic/Validator fallback when the merged pass succeeds.
4. Apply a single skill/JD truth guard (candidate_skill_universe or resume coverage) and reuse it across generator, quality pass, and validator; prohibit adding JD phrases not in that universe.
5. Preserve source_ids through normalization and downstream passes so we can attribute and audit edits.
be sure to look at the systemp prompts as well

System/Prompt Contradictions
* Dual generators with divergent directives: lib/gemini.ts (lines 560-666) (Gemini atomic) vs lib/openai.ts (lines 120-666) (OpenAI atomic). Both present “ATS Output Contract” and “rewrite 60-80%” language, but the OpenAI version is harsher (“60-80% MUST be rewritten”; domain-level inference strongly encouraged) while the Gemini version is softer and adds “only when supported by highlights.” Output ordering differs (skills after experience in one, before in the other). Running both pathways produces different tone and risk of invention.
* Bullet count vs rewrite rules conflict: Generator contract says “never exceed bullet_budget” (lib/gemini.ts (lines 561-567), lib/openai.ts (lines 562-568)), but merged quality pass later uses a flat maxBulletsPerExperience and invites adding/replacing bullets (lib/resume-quality-pass.ts (lines 309-333)). Critic prompt also enforces max bullets but with different thresholds (lib/resume-critic.ts (lines 79-116)). The system stack can overrun budgets or re-edit with different rubrics.
* Skill/keyword truth guards differ per prompt: Generator requires skills subset of normalized pool (lib/gemini.ts (lines 561-568)) yet encourages JD phrase inference (lib/gemini.ts (lines 606-615)). Quality pass allows JD phrase inclusion when “supported” but uses candidateSkillUniverse to gate (lib/resume-quality-pass.ts (lines 294-333)). Validator uses yet another truth guard based on candidateSkillUniverse or existing coverage (lib/resume-validator.ts (lines 25-76)). Net effect: skills/phrases can be added/removed across stages with no single rule.
* Semantic alignment vs fallback selection: Selector backfills low-alignment experiences to fill slots (lib/rag/selector.ts (lines 209-233)), then generator re-sorts by date (lib/gemini.ts (lines 288-295)), breaking the rationale behind bullet budgets and alignment scores that were computed earlier. System prompts talk about “reverse chronological order, do NOT reorder” but we’ve already reordered.
* ATS prompts diverge: Gemini ATS prompt (lib/gemini.ts (lines 892-960)) vs OpenAI ATS prompt (lib/openai.ts (lines 820-980)) vs deterministic scorer (lib/ats-scorer.ts). Each defines categories/weights differently; “semantic_match” in deterministic is embeddings-based, but in API routes we store whatever scorer was used under the same columns. System messaging to the user is inconsistent/misleading.
* Provenance loss vs contract: Generator requires bullets with source_ids (lib/gemini.ts (lines 639-643), lib/openai.ts (lines 639-643)), but normalizeResumeContent collapses bullets to strings and downstream passes operate on strings—violates the system contract and removes traceability.
* Placeholder stripping instructions vary: Generator and critic prompts demand aggressive placeholder removal (lib/gemini.ts (lines 606-615), lib/resume-critic.ts (lines 79-116)), but removeGhostData runs only at the very end and selector validation may have already dropped experiences. The prompts promise omission, but the pipeline can still pass placeholders into generation.
System-Prompt Cleanups to Consider
1. Pick one generation prompt (Gemini or OpenAI) and align tone/budget rules; if both stay, make directives identical (rewrite expectations, budget enforcement, JD inference rules, skill guard).
2. Enforce a single bullet-budget rule end-to-end; remove re-sorting after budgeting or recompute budgets after sort.
3. Standardize skill/keyword truth guard (one definition of “allowed JD phrase”) and reuse in generator, quality pass, and validator.
4. Preserve source_ids through normalization and later passes so the contract is honored.
5. Choose one ATS scorer or clearly label which engine produced a score; align prompts/weights and the “semantic” label.
6. GROK Resume Generation Flow Inconsistencies Analysis
* You were absolutely right - there are multiple contradictory approaches throughout the resume generation flow that are diluting resume quality. The RESUME_GENERATION_INCONSISTENCIES.md file you have is spot-on and I've verified all the issues. Here's my comprehensive review:
* 🔴 CRITICAL ISSUES CONFIRMED
* 1. Summary Metrics Contradiction
* Training Rules: Require "2-3 verified quantified achievements with specific metrics"
* Gemini Generator: Says "metrics are optional, only include them if they are genuinely compelling"
* Critic: Expects "2-3 specific metrics from canonical experiences"
* Quality Pass: Same as generator - "metrics optional"
* Impact: Generator creates weak summaries without metrics, critic tries to add them later, resulting in inconsistent output.
* 2. Bullet Rewriting Philosophy Split
* Gemini Generator: "You may infer JD-aligned keywords ONLY when they are obviously supported" (very conservative)
* OpenAI Generator (unused): "YOU MUST ACTIVELY REWRITE AND ENHANCE BULLETS... At least 60-80% of bullets should be REWRITTEN"
* Quality Pass: Moderate approach - "only if it clearly improves JD match"
* Impact: Generator is too conservative → generic bullets that miss ATS keywords.
* 3. Domain-Level Inference Missing
* OpenAI Generator (unused): "Domain-Level Inference (MANDATORY - Use liberally)" with examples like "Fraud Analyst" → "Fraud Risk Management"
* Gemini Generator: No explicit domain inference guidance
* Impact: Misses obvious domain connections that should be ATS keywords.
* 4. JD Phrase Matching Missing
* OpenAI Generator (unused): Explicit "JD Phrase Matching Rule" - prefer exact JD phrases over generic equivalents
* Gemini Generator: No such rule
* Impact: Uses generic terms instead of JD's exact phrases, reducing ATS matching.
* 5. Bullet Budget Inconsistencies
* Selector: Tiered approach (6, 5, 4, 2-4 bullets based on experience age)
* Quality Pass: Uses single MAX_BULLETS_PER_ROLE = 6 for ALL experiences
* Impact: Allows too many bullets for older experiences, doesn't match training standards.
* 6. Unused Code Confusion
* Complete OpenAI generator exists but is never used
* Route imports from gemini.ts, not openai.ts
* Creates code confusion and maintenance burden
* 🟡 VERIFIED COMPONENT ANALYSIS
* ✅ Parser (lib/rag/parser.ts)
* Well-structured and consistent
* Good job description parsing with ATS-focused keywords
* ✅ Selector (lib/rag/selector.ts)
* Good bullet budget logic matching training rules
* Proper scoring and selection logic
* ⚠️ Gemini Generator (lib/gemini.ts)
* Line 614: Says "metrics are optional" (contradicts training rules)
* Line 615: Too restrictive on inference ("ONLY when obviously supported")
* Missing JD phrase matching rule
* Missing domain-level inference guidance
* ⚠️ Quality Pass (lib/resume-quality-pass.ts)
* Uses single bullet limit instead of selector's tiered budgets
* Tries to fix generator's shortcomings but may be too late
* ⚠️ Critic (lib/resume-critic.ts)
* Line 131: Correctly expects "2-3 specific metrics"
* Good at catching issues but has to work around generator weaknesses
* 📊 FLOW IMPACT ANALYSIS
* Current Flow Problems:
* Generator creates weak bullets (too conservative)
* Quality pass tries to enhance but can't fix all cases
* Critic catches issues but generator creates them
* Result: Diluted resumes that don't maximize ATS potential
* The core issue: The Gemini generator is designed to be "safe" but ends up being too conservative, missing opportunities for legitimate keyword alignment that would improve ATS scores.
* 🎯 RECOMMENDED FIXES (Priority Order)
* High Priority (Resume Quality):
* Add domain-level inference to Gemini generator
* Add JD phrase matching rule to Gemini generator
* Unify all components to require 2-3 metrics in summaries
* Enforce exact 4-sentence summary structure
* Medium Priority (Code Quality):
* Remove/archive unused OpenAI generator
* Fix quality pass to respect selector's bullet budgets
* Update documentation mismatch
* Low Priority (Testing):
* Test improvements with sample resumes
* The inconsistencies are causing your resumes to be watered down - they miss legitimate keyword opportunities and don't follow the gold standard patterns established in your training rules. Fixing these will significantly improve ATS compatibility and resume quality. 🚨🚨🚨
ComposerReviewing the Resume Generation flow for inconsistencies and contradictions. Searching for all related components.

Reading key files to understand the full flow:

Checking which generator is used and reviewing additional system prompts:

Checking a few more details:

Creating a report documenting inconsistencies and contradictions:

RESUME_GENERATION_INCONSISTENCIES.md(new)
+247
-1




















# Resume Generation Flow - Inconsistencies & Contradictions Report

**Date**: Generated during comprehensive review  
**Status**: Critical issues identified that dilute resume quality



Critical issues found
1. Summary metrics conflict
* Training rules require "2-3 verified quantified achievements with specific metrics"
* Gemini generator says "metrics are optional"
* Critic requires "2-3 specific metrics"
* Result: Generator creates summaries without metrics, then Critic tries to add them → inconsistent output
2. Bullet rewriting philosophy mismatch
* Gemini generator: Very conservative — "ONLY when obviously supported"
* OpenAI generator (unused): Aggressive — "60-80% should be REWRITTEN"
* Quality pass: Moderate — "only if it clearly improves JD match"
* Result: Bullets stay too generic, missing obvious enhancements
3. Domain inference missing
* Gemini generator: No domain-level inference guidance
* OpenAI (unused): Has "MANDATORY - Use liberally" domain inference
* Result: Misses obvious connections like "Fraud Analyst" → "Fraud Risk Management"
4. JD phrase matching missing
* OpenAI generator (unused): Has explicit "prefer JD exact phrases" rule
* Gemini generator: No such instruction
* Result: Uses generic terms instead of JD exact phrases → lower ATS scores
5. Unused code causing confusion
* Complete OpenAI generator exists in lib/openai.ts but is never used
* Route imports from gemini.ts only
* Result: Contradictory prompts in codebase, maintenance burden
6. Documentation mismatch
* Docs say MAX_SKILLS_FOR_PROMPT = 12
* Code uses MAX_SKILLS_FOR_PROMPT = 40
* Training rules say "30-40 skills"
* Result: Misleading documentation
Impact
These inconsistencies dilute resume quality by:
1. Creating summaries without required metrics
2. Missing obvious domain connections and JD phrase matching
3. Keeping bullets too generic
4. Producing inconsistent outputs across passes
Full report
Created RESUME_GENERATION_INCONSISTENCIES.md with:
* Detailed analysis of each issue
* Line-by-line references
* Specific recommendations
* Priority levels
Recommended fixes
1. Update Gemini generator prompt to:
* Require 2-3 metrics in summary (when available)
* Add domain-level inference guidance
* Add JD phrase matching rule
* Enforce 4-sentence structure
1. Remove/archive lib/openai.ts (unused code)
2. Update documentation to match code (40 skills)
Should I implement these fixes?

GEMINI 3 Refine Resume Generation Logic to Prevent Dilution
Goal
Address inconsistencies in the resume generation flow where "too many different things are driving" leading to diluted output. Specifically, we will:
1. Fix Rigid Budgeting: Update selector.ts to allocate bullet budgets based on relevance, not just recency.
2. Handle Low-Relevance Roles: Explicitly tag experiences as "Primary" vs "Context" in selector.ts.
3. Update Writer Prompt: Modify openai.ts to treat "Context" roles differently (summarize/minimize) rather than trying to optimize/expand them, which causes dilution.
4. Align Quality Pass: Ensure the Quality Pass (resume-quality-pass.ts) respects the per-role bullet counts targeted by the Writer.
User Review Required
IMPORTANT
Logic Change: We are changing the "Bullet Budget" logic. Previously, the most recent job always got 6 bullets. Now, a recent but irrelevant job might get fewer bullets, while a highly relevant older job gets more. This might change the "shape" of the resume significantly for users with pivots in their career.
Proposed Changes
[Selector Logic]
[MODIFY] 

selector.ts
* Update determineBulletBudget to accept relevanceScore.
* Logic:
    * High Relevance (>0.7): High budget (5-6)
    * Mid Relevance (0.4-0.7): Mid budget (3-4)
    * Low Relevance (<0.4): Low budget (1-2)
* Add roleType ('primary' | 'context') to WriterExperience based on alignment score.
[Writer Prompt]
[MODIFY] 

openai.ts
* Update prepareWriterProfile (or the prompt construction logic) to expose roleType.
* Update the System Prompt to:
    * Primary Roles: "Optimize heavily, expand on JD connection."
    * Context Roles: "Keep concise, focus on transferrable skills, do not fluff."
* Tune the "Inference" instruction to be stricter about evidence-based inference to prevent hallucination.
[Quality Pass]
[MODIFY] 

resume-quality-pass.ts
* Accept bulletConstraints (map of expIndex -> maxBullets) instead of a flat maxBulletsPerExperience.
* In the prompt, list specific max bullet counts per role index.
[MODIFY] 

route.ts
* Extract the per-experience bullet budgets from targetedProfile / selection.
* Pass these constraints to runQualityPass.
Verification Plan
Automated Tests
* We will rely on manual verification as the logic changes are qualitative.
Manual Verification
1. Run Generation: Use a "difficult" profile (career switcher) against a specific JD.
2. Inspect Logs: Check route.ts logs for "Bullet Logic" outputs (relevance scores vs assigned budgets).
3. Inspect Output: Verify that:
    * Relevant roles have detailed bullets.
    * Irrelevant/Old roles are concise.
    * Quality Pass didn't arbitrarily cut relevant bullets or expand irrelevant ones.


OPUSResume Generation Flow - Inconsistency Analysis
This document identifies contradictions and inconsistencies in the Resume Generation pipeline that are diluting resume quality.

Executive Summary
After reviewing all components in the Resume Generation flow, I found 12 critical inconsistencies across 8 major files. The core problems are:
1. Mixed AI Providers - OpenAI and Gemini compete with different philosophies
2. Conflicting Aggressiveness - Generator says "rewrite 60-80%", quality pass says "be conservative"
3. Duplicate Inference Logic - Same concept implemented differently in 3+ places
4. Contradictory Bullet Budgets - Selector, Generator, and Training Rules disagree on limits

Inconsistency Breakdown
1. 🔴 CRITICAL: Mixed AI Provider Strategy
Component	AI Provider	Notes
route.ts	Gemini (imported)	Uses 

generateTailoredResumeAtomic from gemini.ts
parser.ts	Gemini	Job description parsing
resume-quality-pass.ts	Gemini	Quality refinement (Merged)
resume-critic.ts	Gemini	Fallback Critic (ACR Rubric)
resume-validator.ts	Gemini	Fallback Validator (Keyword Match)
ats-scorer.ts	OpenAI	Score calculation
openai.ts	OpenAI	Full implementation exists but NOT used
Problem: The API route imports from 

gemini.ts
 
but
 

openai.ts
 
has a complete, more aggressive implementation that isn't being used. The OpenAI version has extensive rewriting directives that the Gemini version lacks. Even the fallback paths (Critic/Validator) are purely Gemini-based.


2. 🔴 CRITICAL: Conflicting Rewriting Aggressiveness
OpenAI Writer (

openai.ts:271-281):

MANDATORY Edit Philosophy:
- **EXPECTED**: At least 60-80% of bullets should be REWRITTEN or significantly enhanced
- If you're keeping most bullets unchanged, you are FAILING at your job
Gemini Writer (

gemini.ts:571-616):

Quality Guardrails:
- Use ONLY the canonical experiences and skills supplied above
- You may infer JD-aligned keywords... ONLY when they are obviously supported
Quality Pass / Critic / Validator (

resume-quality-pass.ts,
 

resume-critic.ts,
 

resume-validator.ts): All three use Gemini and enforce conservative rules:

* Quality Pass: "Rewrite... only if it clearly improves JD match"
* Critic: "Keep or rewrite a bullet only if it can reach >=3 in all dimensions using existing facts"
* Validator: "only inject keywords... if they are already supported by the candidate's verified history"
Contradiction:
* OpenAI says "rewrite 60-80%, failure if you copy"
* Gemini says "use only canonical, be conservative"
* All Quality/Validation layers say "only if supported by verified history"
This creates a tug-of-war where aggressive changes (if they happened) would likely be flagged or undone by the conservative validation layers.

3. 🟡 IMPORTANT: Bullet Budget Conflicts
Source	Most Recent	Second	Third/Fourth	Older
selector.ts:405-429	6	5	4	2-4
TRAINING_RULES.md:110-115	5-6	4-5	3-4	2-3
openai.ts:22	6 (MAX_BULLETS_PER_ROLE)	—	—	—
resume-quality-pass.ts:311	6 (maxBulletsPerExperience)	—	—	—
Problem: Selector allocates 6/5/4/4 but Training Rules say 5-6/4-5/3-4/2-3. This creates inconsistency between what gets selected and what the training data shows.

4. 🟡 IMPORTANT: Duplicate MAX Constants
The same concept is defined in multiple places:
Constant	openai.ts	gemini.ts	resume-quality-pass.ts	route.ts
MAX_EXPERIENCES	8	5	—	—
MAX_BULLETS_PER_ROLE	6	6	6	6
MAX_SKILLS	40	40	—	—
MAX_INFERENCE_LINES	20	12	—	12
Problem: MAX_EXPERIENCES_FOR_PROMPT is 8 in openai.ts but 5 in gemini.ts. This means OpenAI would include more experiences if ever used.

5. 🟡 IMPORTANT: Inference Guidance Contradictions
OpenAI (

openai.ts:236-238):

Domain-level inferences are encouraged (e.g., "Fraud Analyst" → "Fraud Risk Management")
Reframe bullets to emphasize JD-relevant aspects while staying truthful
Use JD terminology when it accurately describes the candidate's experience
Gemini (

gemini.ts:538-540):

Derive new JD-aligned bullets only when the idea is clearly supported by the canonical highlights
Reference the supporting company or highlight inside the bullet
Quality Pass (

resume-quality-pass.ts:329-331):

Incorporate JD keywords naturally when they are already supported
If alignment is weak or would require invention, do not force it
Contradiction: OpenAI actively encourages domain-level inference. Gemini requires "clear support". Quality pass requires "already supported". The progression gets MORE conservative, potentially undoing improvements.

6. 🟡 IMPORTANT: Skills Limit Inconsistency
Location	Limit	Note
openai.ts:80	40	MAX_SKILLS_FOR_PROMPT
gemini.ts:78	40	MAX_SKILLS_FOR_PROMPT
selector.ts:682	40	prioritizeSkills return
TRAINING_RULES.md:69	30-40	"Include 30-40 skills total"
Minor: These are mostly aligned now, but TRAINING_RULES says "30-40" while code says "40". Could cause slight over-inclusion.

7. 🟡 IMPORTANT: Summary Requirements Mismatch
All Generators say:
* 3-4 sentences, minimum 350 characters
* Open with years of experience
But OpenAI (

openai.ts:327) adds:

Focus on telling a compelling career narrative rather than metric-stuffing
AVOID generic metrics like "Analyzed 100+ reports"
Quality Pass (

resume-quality-pass.ts:323) adds:

AVOID: Generic metric-stuffing like "Analyzed 100+ reports" - focus on real impact
Gemini doesn't have this anti-metric-stuffing guidance, so it may produce generic metrics that the quality pass then has to clean up.

8. 🟢 MINOR: Placeholder Detection Differences
openai.ts (

lines 33-62):

const PLACEHOLDER_EXACT = new Set([
  'company name', 'job title', 'title', 'position', 'role',
  'your role', 'your company', 'insert title', 'insert company',
  'sample company', 'sample title', 'example company', 'example title',
  'lorem ipsum', 'placeholder', 'city, state', 'mm/yyyy', 'month year',
  'yyyy', 'yyyy-yyyy', '20xx', 'tbd', 'n/a', 'not provided', 'not available',
  'to be determined'
]);
gemini.ts (

lines 42-71):

const PLACEHOLDER_EXACT = new Set([
  'company name', 'job title', 'title', 'position', 'role',
  'your role', 'your company', 'your name', 'full name',  // ← extra
  'city, state', 'city', 'state', 'location',             // ← extra
  'not provided', 'not specified', 'n/a', 'na', 'tbd',
  'insert company', 'insert title', 'insert location',   // ← extra
  'placeholder', 'sample company', 'sample title', 'lorem ipsum',
  'example company'
]);
Problem: Gemini has more comprehensive placeholder detection. If OpenAI were used, it would miss some placeholders.

9. 🟢 MINOR: Date Formatting Inconsistency
TRAINING_RULES.md says: "Month Year" format (e.g., "Jan 2022 - Mar 2024")
Both 

openai.ts
 
and
 

gemini.ts
 
have
 

formatDateLabel()
 
functions that produce
 
"Nov 2024"
 
format.

This is aligned - no issue here.

10. 🔴 CRITICAL: Unused OpenAI Implementation


openai.ts
 
contains a fully functional
 

generateTailoredResumeAtomic()
 
with more aggressive rewriting directives, but
 

route.ts line 3
 
imports from
 

gemini.ts:

import { calculateAtsScore, generateTailoredResumeAtomic, embedText } from '@/lib/gemini';
This is the root cause of diluted resumes - the aggressive OpenAI prompts are never used.

11. 🟡 IMPORTANT: ATS Scorer Uses OpenAI


route.ts line 3
 
imports
 

calculateAtsScore
 
from
 
gemini.ts
, but
 

ats-scorer.ts
 
uses
 
OpenAI
 
for semantic matching:

import { openai, embedText } from './openai';
This means:
* Resume generation: Gemini
* JD parsing: Gemini
* Quality pass: Gemini
* ATS scoring: OpenAI (via ats-scorer.ts)
The ATS scorer is evaluating resumes against criteria that the Gemini generator wasn't optimized for.

12. 🟡 IMPORTANT: Selector Score Weights vs. Training Philosophy


selector.ts:168-169:

const score = clamp(
  bulletScore * 0.55 + keywordScore * 0.2 + recencyScore * 0.2 + metricDensity * 0.05
);
Weights:
* Bullet semantic similarity: 55%
* Keyword match: 20%
* Recency: 20%
* Metric density: 5%
TRAINING_RULES.md Section 4 says:
* Include experiences with bullets that semantically align ✓
* Include experiences with domain-relevant keywords ✓
* Include most recent roles ✓
* Roles with strong metrics relevant to target role
Problem: Metric density is only 5% weight but Training Rules emphasize "strong metrics that ARE relevant to the target role". This may under-weight metric-rich bullets.

Root Cause Summary




Currently
Unused



User Uploads Resume
Parser - Gemini
Canonicalizer
Selector
Generator
Gemini - Conservative
OpenAI - Aggressive
Quality Pass - Conservative
ATS Scorer - OpenAI
Final Resume
The core issue: Your most aggressive rewriting logic (OpenAI) is never used. The system uses the conservative Gemini generator, then applies an even more conservative Quality Pass, resulting in minimal changes from the original bullets.

Recommended Fixes
IMPORTANT
This is an analysis document. I'm presenting findings and recommendations for your review before making any changes.
Priority 1: Unify AI Provider Strategy
Option A: Use OpenAI for generation (more aggressive rewriting)
* Change import in route.ts from gemini to openai
* Verify temperature settings (currently 0.5 for OpenAI, 0.4 for Gemini)
Option B: Enhance Gemini prompts with OpenAI's aggressive directives
* Add the "60-80% rewrite" mandate to gemini.ts
* Add the domain-level inference examples
Priority 2: Align Quality Pass Aggressiveness
Current quality pass undermines generator changes. Options:
* Make quality pass focus only on validation (detecting errors) not rewriting
* Or make quality pass equally aggressive as the generator
Priority 3: Consolidate Constants
Create a single config.ts or constants.ts for:
* MAX_EXPERIENCES_FOR_PROMPT
* MAX_BULLETS_PER_ROLE
* MAX_SKILLS_FOR_PROMPT
* MAX_INFERENCE_CONTEXT_LINES
Priority 4: Verify Semantic Matching Alignment
The ATS scorer uses OpenAI embeddings while generation uses Gemini embeddings. Consider:
* Using the same embedding model throughout
* Or calibrating thresholds to account for differences

Questions for You
1. Which AI provider strategy do you prefer?
    * A) Switch to OpenAI for generation (more aggressive)
    * B) Keep Gemini but make prompts more aggressive
    * C) Something else?
2. Should the Quality Pass be more aggressive or just validate?
    * Currently it tries to "improve" bullets but conservatively
    * Could change it to only flag errors, not rewrite
3. Are the current bullet budgets correct?
    * Selector: 6/5/4/4
    * Training Rules: 5-6/4-5/3-4/2-3
    * Which should be the source of truth?












