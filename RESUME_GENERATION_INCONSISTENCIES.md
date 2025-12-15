# Resume Generation Flow - Inconsistencies & Contradictions Report

**Date**: Generated during comprehensive review  
**Status**: Critical issues identified that dilute resume quality

---

## 🚨 CRITICAL INCONSISTENCIES

### 1. **Summary Metrics Instructions - CONFLICTING**

**Problem**: Multiple systems give contradictory guidance on summary metrics.

| Component | Instruction | Status |
|-----------|------------|--------|
| **Training Rules** (`training/TRAINING_RULES.md`) | "Sentence 2: **2-3 verified quantified achievements with specific metrics**" | ⚠️ Requires metrics |
| **Gemini Generator** (`lib/gemini.ts:614`) | "highlight **1-2 key achievements** that demonstrate meaningful impact - **metrics are optional**, only include them if they are genuinely compelling" | ⚠️ Metrics optional |
| **Critic** (`lib/resume-critic.ts:131`) | "include **2-3 specific metrics** from canonical experiences" | ⚠️ Requires metrics |
| **Quality Pass** (`lib/resume-quality-pass.ts:320`) | "highlight **1-2 key achievements** that demonstrate impact (**metrics optional**, only if compelling)" | ⚠️ Metrics optional |
| **Validator** (`lib/resume-validator.ts:260-264`) | "Ensure it mentions 2-3 of the most important hard skills" (no metric requirement) | ✅ No conflict |

**Impact**: 
- Generator creates summaries without metrics
- Critic then tries to add metrics
- Results in inconsistent summaries that don't match training standards
- Dilutes resume quality by not following gold standard pattern

**Recommendation**: 
- **Unify to**: "Highlight 2-3 verified quantified achievements with specific metrics when available. If compelling metrics aren't available, focus on impact and domain expertise."

---

### 2. **Bullet Rewriting Philosophy - COMPETING APPROACHES**

**Problem**: Two different generators exist with opposite philosophies, and the quality pass has yet another approach.

| Component | Philosophy | Status |
|-----------|-----------|--------|
| **Gemini Generator** (`lib/gemini.ts:615`) | "You may infer JD-aligned keywords or new bullet framings **ONLY when they are obviously supported** by the Global Canonical Highlights" | ⚠️ Very conservative |
| **OpenAI Generator** (`lib/openai.ts:273-281`) | "**YOU MUST ACTIVELY REWRITE AND ENHANCE BULLETS**... **EXPECTED: At least 60-80% of bullets should be REWRITTEN**" | ❌ Unused but exists |
| **Quality Pass** (`lib/resume-quality-pass.ts:329-331`) | "Consider rewriting or replacing a bullet... **only if** it clearly improves JD match while staying 100% truthful. **If alignment is weak or would require invention, do not force it.**" | ⚠️ Moderate |

**Impact**:
- Gemini generator is too conservative → bullets stay generic
- Quality pass tries to fix but may be too late
- OpenAI version exists but isn't used → code confusion
- No clear directive on when/how to enhance bullets

**Recommendation**:
- **Remove OpenAI generator** (it's not used - line 3 of `route.ts` imports from `gemini.ts`)
- **Unify Gemini + Quality Pass** to: "Enhance bullets for JD alignment when supported by verified achievements. Rewrite weak bullets using ACR rubric. Aim for 40-60% enhancement rate when natural connections exist."

---

### 3. **Inference Guidance - EXTREME DIVERGENCE**

**Problem**: Generator and quality pass have opposite approaches to domain-level inference.

| Component | Inference Guidance | Status |
|-----------|-------------------|--------|
| **Gemini Generator** (`lib/gemini.ts:615`) | "You may infer JD-aligned keywords... **ONLY when they are obviously supported**... If no supporting highlight exists, **omit the inference**" | ⚠️ Very restrictive |
| **OpenAI Generator** (`lib/openai.ts:333-340`) | "**Domain-Level Inference (MANDATORY - Use liberally)**... You **MUST infer** domain-level connections... Examples: 'Fraud Analyst' → 'Fraud Risk Management'" | ❌ Unused |
| **Quality Pass** (`lib/resume-quality-pass.ts:330`) | "Incorporate JD keywords naturally when they are **already supported** by the candidate's verified achievements" | ⚠️ Moderate |

**Impact**:
- Generator misses obvious domain connections (e.g., "Fraud Analyst" → "Fraud Risk Management")
- Quality pass tries to fix but may not catch all cases
- Resumes miss ATS keyword matches that should be obvious

**Recommendation**:
- **Add to Gemini generator**: "Domain-level inference is encouraged when logically implied (e.g., 'Fraud Analyst' → can infer 'Fraud Risk Management', 'Fraud Detection'). Use JD terminology when it accurately describes verified work."

---

### 4. **Skills Limit Documentation vs Code - MISMATCH**

**Problem**: Documentation says 12 skills, code uses 40, training rules say 30-40.

| Source | Skills Limit | Status |
|--------|-------------|--------|
| **Documentation** (`docs/rag_quick_reference.md:171`) | `MAX_SKILLS_FOR_PROMPT = 12` | ❌ Outdated |
| **Code** (`lib/gemini.ts:78`, `lib/openai.ts:80`) | `MAX_SKILLS_FOR_PROMPT = 40` | ✅ Current |
| **Training Rules** (`training/TRAINING_RULES.md:69`) | "Include **30-40 skills total**" | ✅ Matches code |
| **Selector** (`lib/rag/selector.ts:682,705`) | Returns up to **40 skills** | ✅ Matches code |

**Impact**:
- Documentation is misleading
- Could cause confusion for developers

**Recommendation**:
- **Update documentation** to reflect 40 skills limit

---

### 5. **Summary Structure - INCOMPLETE GUIDANCE**

**Problem**: Training rules specify 4-sentence structure, but prompts only say "3-4 sentences" without structure.

| Source | Summary Structure | Status |
|--------|------------------|--------|
| **Training Rules** (`training/TRAINING_RULES.md:32-35`) | **4 sentences**: (1) Years + domain, (2) 2-3 metrics, (3) Tools/skills, (4) Connection to role | ✅ Clear structure |
| **Gemini Generator** (`lib/gemini.ts:614`) | "3-4 impactful sentences... (1) years + domain, (2) 1-2 achievements, (3) tools/skills, (4) connection" | ⚠️ Structure matches but metrics optional |
| **Quality Pass** (`lib/resume-quality-pass.ts:318-323`) | "3-4 sentences... (1) years + domain, (2) 1-2 achievements, (3) tools/skills, (4) connection" | ⚠️ Structure matches but metrics optional |
| **Critic** (`lib/resume-critic.ts:131`) | "(1) years + domain, (2) 2-3 metrics, (3) tools/skills, (4) connection" | ✅ Matches training |

**Impact**:
- Generator may produce 3-sentence summaries missing the connection
- Inconsistent with training gold standards

**Recommendation**:
- **Enforce 4-sentence structure** in all prompts to match training rules

---

### 6. **JD Phrase Matching - MISSING IN GEMINI**

**Problem**: OpenAI generator has explicit JD phrase matching rule, Gemini doesn't.

| Component | JD Phrase Matching | Status |
|-----------|-------------------|--------|
| **OpenAI Generator** (`lib/openai.ts:301-302`) | "**JD Phrase Matching Rule**: When JD uses specific phrases (e.g., 'fraud risk management'), prefer these exact phrases over generic equivalents" | ❌ Unused |
| **Gemini Generator** (`lib/gemini.ts`) | No explicit JD phrase matching instruction | ⚠️ Missing |
| **Validator** (`lib/resume-validator.ts:264`) | "Use exact JD terminology when possible" | ✅ Has it |

**Impact**:
- Gemini generator may use generic terms instead of JD exact phrases
- Reduces ATS keyword matching
- Validator tries to fix but may miss cases

**Recommendation**:
- **Add to Gemini generator**: "When JD uses specific phrases (e.g., 'fraud risk management', 'digital payments operations'), prefer these exact phrases over generic equivalents when both accurately describe the candidate's experience. This improves ATS keyword matching."

---

### 7. **Unused Code - OPENAI GENERATOR**

**Problem**: Complete OpenAI generator implementation exists but is never used.

| File | Function | Status |
|------|----------|--------|
| `lib/openai.ts` | `generateTailoredResumeAtomic()` | ❌ Not imported/used |
| `app/api/generate/route.ts:3` | Imports from `gemini.ts`, not `openai.ts` | ✅ Uses Gemini |

**Impact**:
- Code confusion
- Maintenance burden
- Contradictory prompts exist in codebase
- Could accidentally switch to OpenAI version

**Recommendation**:
- **Delete `lib/openai.ts`** or clearly mark as "LEGACY/UNUSED"
- If keeping for future use, add comment: `// LEGACY: Not currently used. Gemini generator is active.`

---

### 8. **Bullet Budget Inconsistencies**

**Problem**: Selector and quality pass use different max bullet limits.

| Component | Max Bullets | Status |
|-----------|------------|--------|
| **Selector** (`lib/rag/selector.ts:410-428`) | Most recent: **6**, Second: **5**, Third/Fourth: **4**, Older: **2-4** | ✅ Matches training |
| **Quality Pass** (`lib/resume-quality-pass.ts:215`) | Uses `MAX_BULLETS_PER_ROLE = 6` | ⚠️ Single limit |
| **Training Rules** (`training/TRAINING_RULES.md:110-114`) | Most recent: **5-6**, Second: **4-5**, Third/Fourth: **3-4**, Older: **2-3** | ✅ Clear guidance |

**Impact**:
- Quality pass may allow too many bullets for older roles
- Doesn't match training standards

**Recommendation**:
- **Quality pass should respect selector's bullet budgets** per experience, not use a single max

---

### 9. **Keyword Injection Limit - INCONSISTENT**

**Problem**: Different components use different keyword injection limits.

| Component | Keyword Limit | Status |
|-----------|--------------|--------|
| **Generate Route** (`app/api/generate/route.ts:479`) | `keywordInjectionLimit: 12` | ✅ Used |
| **Validator** (`lib/resume-validator.ts:10`) | `DEFAULT_KEYWORD_INJECTION_LIMIT = 12` | ✅ Matches |
| **Quality Pass** (`lib/resume-quality-pass.ts:33`) | `DEFAULT_KEYWORD_INJECTION_LIMIT = 12` | ✅ Matches |

**Status**: ✅ Actually consistent - no issue here.

---

## 📋 SUMMARY OF RECOMMENDATIONS

### High Priority (Diluting Resume Quality)

1. **Unify Summary Metrics**: All components should require "2-3 verified quantified achievements with specific metrics when available"
2. **Add Domain-Level Inference**: Gemini generator needs explicit domain inference guidance
3. **Add JD Phrase Matching**: Gemini generator needs explicit JD phrase preference rule
4. **Enforce 4-Sentence Summary**: All prompts should require the exact 4-sentence structure

### Medium Priority (Code Quality)

5. **Remove/Archive OpenAI Generator**: Delete unused `lib/openai.ts` or clearly mark as legacy
6. **Update Documentation**: Fix `MAX_SKILLS_FOR_PROMPT` documentation mismatch
7. **Respect Bullet Budgets**: Quality pass should use selector's per-experience budgets

### Low Priority (Clarification)

8. **Clarify Bullet Rewriting**: Unify Gemini + Quality Pass on enhancement approach (40-60% when natural)

---

## 🔍 FLOW ANALYSIS

### Current Flow (with issues):

```
1. Parse JD → ✅ Consistent
2. Retrieve Profile → ✅ Consistent  
3. Select Experiences → ✅ Consistent (bullet budgets good)
4. Generate Resume (Gemini) → ⚠️ Too conservative, missing inference/phrase matching
5. Quality Pass → ⚠️ Tries to fix but may be too late
6. Final Cleanup → ✅ Consistent
```

### Issues in Flow:

- **Step 4 (Generator)**: Too conservative, creates weak bullets
- **Step 5 (Quality Pass)**: Tries to enhance but may not catch all cases
- **Result**: Diluted resumes that don't maximize ATS matching

---

## ✅ WHAT'S WORKING WELL

1. **Parser** (`lib/rag/parser.ts`): Consistent, well-structured
2. **Selector** (`lib/rag/selector.ts`): Good bullet budgets, scoring logic
3. **Retriever**: Consistent profile retrieval
4. **Validator**: Good keyword injection logic
5. **Training Rules**: Clear gold standards (but not always followed)

---

## 🎯 NEXT STEPS

1. Fix Gemini generator prompts (add inference, JD phrase matching, enforce metrics)
2. Remove/archive OpenAI generator
3. Update documentation
4. Test with sample resumes to verify improvements


