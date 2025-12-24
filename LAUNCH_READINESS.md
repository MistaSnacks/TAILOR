# 🚀 TAILOR Launch Readiness & Scalability Checklist

**Last Updated:** 2025-01-23  
**Status:** Pre-Launch Review

---

## 🔴 CRITICAL: Must Fix Before Launch

### 1. Security: RLS Strategy Decision ⚠️ **HIGH PRIORITY**

**Issue:** RLS is disabled on 27 critical tables. If your Supabase anon key leaks, anyone can read/modify all user data.

**Affected Tables:**
- `users`, `documents`, `profiles`, `jobs`, `resume_versions`
- `experiences`, `experience_bullets`, `skills`, `chat_threads`, `chat_messages`
- `canonical_experiences`, `canonical_skills`, `user_subscriptions`
- `saved_jobs`, `job_preferences`, `referrals`, `scheduled_deletions`
- And 15+ more tables

**Decision Required:**
Since you use NextAuth (not Supabase Auth), RLS policies using `auth.uid()` won't work. Choose one:

**Option A: Disable RLS, rely on API routes** (Current implicit approach)
- ✅ Pros: Simpler, works with NextAuth
- ❌ Cons: If anon key leaks, entire DB is exposed
- **Action:** Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is NEVER used client-side
- **Action:** Audit all client components for direct Supabase calls

**Option B: Enable RLS with custom policies**
- ✅ Pros: Defense in depth, protects even if anon key leaks
- ❌ Cons: More complex, need to create policies for NextAuth
- **Action:** Create RLS policies that check user_id from JWT token
- **Action:** Use service role key for all server-side operations

**Recommendation:** Option A for MVP, migrate to Option B before scale.

- [ ] **Decision made:** [ ] Option A [ ] Option B
- [ ] Audit all client-side code for Supabase anon key usage
- [ ] Document RLS strategy decision
- [ ] If Option B: Create RLS policies for all public tables

---

### 2. Remove Debug Code ⚠️ **MEDIUM PRIORITY**

**Issue:** 11 files contain "REMOVE IN PRODUCTION" comments with debug code.

**Files to Clean:**
- [ ] `lib/supabase.ts` - Environment variable logging
- [ ] `lib/gemini.ts` - Debug logging
- [ ] `lib/openai.ts` - Debug logging
- [ ] `lib/rag/ingest.ts` - Debug logging
- [ ] `lib/rag/selector.ts` - Debug logging
- [ ] `lib/rag/retriever.ts` - Debug logging
- [ ] `app/api/generate/route.ts` - Debug logging
- [ ] `lib/resume-quality-pass.ts` - Debug logging
- [ ] `lib/resume-critic.ts` - Debug logging
- [ ] `scripts/show-selection-trace.ts` - Debug script
- [ ] `docs/rag_quick_reference.md` - Documentation (keep, but review)

**Action Items:**
- [ ] Replace all `console.log` with proper logger (see Quick Wins #1)
- [ ] Remove environment variable logging from startup
- [ ] Remove debug comments
- [ ] Test that production builds don't include debug code

---

### 3. Excessive Console Logging ⚠️ **MEDIUM PRIORITY**

**Issue:** 456 console.log statements across 52 files in `/app` directory.

**Impact:**
- Potentially leaks sensitive information in server logs
- Slows down production performance
- Fills up log storage quickly
- Makes debugging harder (too much noise)

**Action Items:**
- [ ] Create proper logger utility (see Quick Wins #1)
- [ ] Replace all `console.log` with logger.debug/info/warn/error
- [ ] Set log level to `info` in production, `debug` in development
- [ ] Review and remove unnecessary logging
- [ ] Add structured logging for errors (include context, user_id, etc.)

---

### 4. Database Function Security ⚠️ **HIGH PRIORITY**

**Issue:** 6 database functions have mutable search paths, making them vulnerable to SQL injection.

**Affected Functions:**
- [ ] `generate_referral_code`
- [ ] `process_referral_atomic`
- [ ] `match_experience_bullets`
- [ ] `match_skills`
- [ ] `get_or_create_referral_code`
- [ ] `update_updated_at_column`

**Fix Required:**
Add `SET search_path = ''` or `SET search_path = public` to each function.

**Action Items:**
- [ ] Create migration to fix all 6 functions
- [ ] Test functions still work after fix
- [ ] Document security improvement

---

### 5. Leaked Password Protection ⚠️ **LOW PRIORITY**

**Issue:** Supabase Auth has leaked password protection disabled.

**Action Items:**
- [ ] Enable HaveIBeenPwned integration in Supabase Dashboard
- [ ] Settings → Authentication → Password Security
- [ ] Enable "Leaked Password Protection"

---

## 🟡 IMPORTANT: Should Fix Before Scale

### 1. In-Memory Caching Won't Scale ⚠️ **HIGH PRIORITY**

**Issue:** Rate limiting and job search caching use in-memory `Map()` which won't work in serverless.

**Affected Files:**
- `lib/rate-limit.ts` - `rateLimitStore = new Map()`
- `lib/jobs/cache.ts` - `searchCache = new Map()`

**Problem:** 
- Serverless functions are stateless
- Each invocation gets fresh memory
- Rate limiting won't work across instances
- Cache won't persist between requests

**Solution:** Use Redis (Upstash has free tier, works with Vercel)

**Action Items:**
- [ ] Sign up for Upstash Redis (free tier: 10K commands/day)
- [ ] Install `@upstash/redis` package
- [ ] Replace `rate-limit.ts` Map with Redis
- [ ] Replace `jobs/cache.ts` Map with Redis
- [ ] Test rate limiting works across multiple serverless instances
- [ ] Test cache persists between requests

**Migration Example:**
```typescript
// Before: const rateLimitStore = new Map();
// After: import { Redis } from '@upstash/redis';
//        const redis = new Redis({ url: ..., token: ... });
```

---

### 2. Missing Database Indexes ⚠️ **MEDIUM PRIORITY**

**Issue:** 14 foreign keys are unindexed, causing slow queries at scale.

**Missing Indexes:**
- [ ] `experience_bullets.experience_id`
- [ ] `experiences.user_id`
- [ ] `experiences.document_id`
- [ ] `skills.user_id`
- [ ] `skills.document_id`
- [ ] `canonical_experience_bullets.user_id`
- [ ] `chat_threads.job_id`
- [ ] `enriched_bullet_candidates.user_id`
- [ ] `experience_bullet_sources.document_id`
- [ ] `experience_skills.skill_id`
- [ ] `invites.created_by`
- [ ] `invites.used_by`
- [ ] `military_awards.source_document_id`
- [ ] `military_service.source_document_id`

**Action Items:**
- [ ] Create migration with all missing indexes (see Quick Wins #3)
- [ ] Use `CREATE INDEX CONCURRENTLY` to avoid locking
- [ ] Test query performance before/after
- [ ] Monitor index usage in production

---

### 3. RLS Policy Performance Issues ⚠️ **LOW PRIORITY**

**Issue:** 12 RLS policies re-evaluate `auth.uid()` per row instead of once per query.

**Affected Tables:**
- [ ] `accounts` (4 policies)
- [ ] `sessions` (2 policies)
- [ ] `enriched_bullet_candidates` (2 policies)
- [ ] `recommended_jobs` (2 policies)
- [ ] `invites` (2 policies)

**Fix:** Replace `auth.uid()` with `(select auth.uid())` in all policies.

**Action Items:**
- [ ] Create migration to update all 12 policies
- [ ] Test policies still work correctly
- [ ] Benchmark query performance improvement

---

### 4. Single Region Deployment ⚠️ **LOW PRIORITY**

**Issue:** `vercel.json` specifies only `iad1` (US East).

**Impact:** Users outside US will have higher latency.

**Action Items:**
- [ ] Consider multi-region deployment for global users
- [ ] Or: Add edge functions for static assets
- [ ] Monitor user locations and latency
- [ ] Decide if multi-region is needed based on user base

---

## 🟢 Good Practices Already In Place ✅

- ✅ **Access Control** - `checkGenerationAccess()`, `checkPremiumAccess()` patterns
- ✅ **Rate Limit Framework** - Structure exists (just needs Redis)
- ✅ **Auth Middleware** - NextAuth with JWT sessions
- ✅ **Stripe Integration** - Webhook handling, subscription management
- ✅ **Document Upload Limits** - 30 document cap per user
- ✅ **Parallel DB Queries** - Using `Promise.all()` in access control
- ✅ **A/B Testing Framework** - Experiment metrics setup
- ✅ **Error Handling** - Try/catch blocks in API routes
- ✅ **Type Safety** - TypeScript throughout

---

## 📋 Pre-Launch Checklist

### Security (Do Now)
- [ ] **P0:** Decide RLS strategy (Option A or B)
- [ ] **P0:** Fix 6 database functions with mutable search paths
- [ ] **P0:** Enable leaked password protection in Supabase
- [ ] **P0:** Remove all "REMOVE IN PRODUCTION" debug code
- [ ] **P0:** Audit API routes for proper auth checks
- [ ] **P0:** Ensure Supabase anon key never used client-side

### Performance (Do Before Scale)
- [ ] **P1:** Add missing indexes on foreign keys
- [ ] **P1:** Replace in-memory cache with Redis
- [ ] **P1:** Fix RLS policies to use `(select auth.uid())` pattern
- [ ] **P2:** Consider removing 20+ unused indexes (optional)

### Monitoring & Operations (Do Now)
- [ ] **P0:** Add error tracking (Sentry, LogRocket, etc.)
- [ ] **P0:** Set up Vercel Analytics (already in dependencies)
- [ ] **P0:** Create health check endpoint (`/api/health`)
- [ ] **P0:** Set up database alerts in Supabase
- [ ] **P1:** Set up scheduled deletion cron job (`scripts/process-deletions.ts`)
- [ ] **P1:** Configure automated backups (Supabase handles this)
- [ ] **P1:** Set up staging environment
- [ ] **P1:** Create runbook for common issues

### Code Quality
- [ ] **P0:** Replace console.log with proper logger
- [ ] **P1:** Add TypeScript strict mode checks
- [ ] **P1:** Set up ESLint rules for production code
- [ ] **P2:** Add unit tests for critical paths

---

## 🔧 Quick Wins to Implement

### 1. Create Proper Logger

**File:** `lib/logger.ts`

```typescript
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = process.env.NODE_ENV === 'production' 
  ? (process.env.LOG_LEVEL || 'info') 
  : 'debug';

export const logger = {
  debug: (...args: any[]) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};
```

**Action:**
- [ ] Create `lib/logger.ts`
- [ ] Replace all `console.log` with `logger.debug/info/warn/error`
- [ ] Set `LOG_LEVEL=info` in production environment

---

### 2. Health Check Endpoint

**File:** `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Quick DB health check
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      database: error ? 'error' : 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Health check failed' },
      { status: 500 }
    );
  }
}
```

**Action:**
- [ ] Create `app/api/health/route.ts`
- [ ] Test endpoint: `curl https://your-domain.com/api/health`
- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime, etc.)

---

### 3. Add Missing FK Indexes (Migration)

**File:** `supabase/migrations/YYYYMMDD_add_missing_fk_indexes.sql`

```sql
-- Add indexes on foreign keys for better query performance
-- Using CONCURRENTLY to avoid locking tables

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experience_bullets_experience_id 
  ON experience_bullets(experience_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiences_user_id 
  ON experiences(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experiences_document_id 
  ON experiences(document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_user_id 
  ON skills(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_document_id 
  ON skills(document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_canonical_experience_bullets_user_id 
  ON canonical_experience_bullets(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_threads_job_id 
  ON chat_threads(job_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enriched_bullet_candidates_user_id 
  ON enriched_bullet_candidates(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experience_bullet_sources_document_id 
  ON experience_bullet_sources(document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_experience_skills_skill_id 
  ON experience_skills(skill_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_created_by 
  ON invites(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_used_by 
  ON invites(used_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_military_awards_source_document_id 
  ON military_awards(source_document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_military_service_source_document_id 
  ON military_service(source_document_id);
```

**Action:**
- [ ] Create migration file
- [ ] Apply migration via Supabase MCP or dashboard
- [ ] Verify indexes created: `SELECT * FROM pg_indexes WHERE tablename IN (...);`

---

### 4. Fix Database Function Search Paths (Migration)

**File:** `supabase/migrations/YYYYMMDD_fix_function_search_paths.sql`

```sql
-- Fix search_path for all functions to prevent SQL injection

ALTER FUNCTION generate_referral_code SET search_path = public;
ALTER FUNCTION process_referral_atomic SET search_path = public;
ALTER FUNCTION match_experience_bullets SET search_path = public;
ALTER FUNCTION match_skills SET search_path = public;
ALTER FUNCTION get_or_create_referral_code SET search_path = public;
ALTER FUNCTION update_updated_at_column SET search_path = public;
```

**Action:**
- [ ] Create migration file
- [ ] Apply migration
- [ ] Test all functions still work correctly

---

## 📊 Priority Matrix

| Priority | Task | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| 🔴 P0 | Decide & implement RLS strategy | High | Critical | ⬜ Not Started |
| 🔴 P0 | Remove debug code | Low | Security | ⬜ Not Started |
| 🔴 P0 | Add error tracking | Medium | Operations | ⬜ Not Started |
| 🔴 P0 | Fix database function security | Low | Security | ⬜ Not Started |
| 🔴 P0 | Health check endpoint | Low | Operations | ⬜ Not Started |
| 🟡 P1 | Add missing indexes | Low | Performance | ⬜ Not Started |
| 🟡 P1 | Replace in-memory cache | Medium | Scale | ⬜ Not Started |
| 🟡 P1 | Replace console.log with logger | Medium | Code Quality | ⬜ Not Started |
| 🟡 P1 | Set up cron for scheduled deletions | Low | Operations | ⬜ Not Started |
| 🟢 P2 | Multi-region deployment | Low | Global UX | ⬜ Not Started |
| 🟢 P2 | Remove unused indexes | Low | DB Size | ⬜ Not Started |
| 🟢 P2 | Fix RLS policy performance | Low | Performance | ⬜ Not Started |

---

## 📝 Notes

- **RLS Strategy:** Since you use NextAuth, RLS with `auth.uid()` won't work. Current approach (relying on API routes) is acceptable for MVP, but document the decision.

- **Caching:** In-memory caching will break in serverless. Must migrate to Redis before scale.

- **Logging:** 456 console.log statements need to be replaced with proper logger. This is a large refactor but critical for production.

- **Indexes:** Missing indexes won't cause issues at low scale, but will become bottlenecks as data grows. Easy win to add now.

---

## 🎯 Launch Readiness Score

**Current:** 65/100

- ✅ Core functionality works
- ✅ Auth & payments integrated
- ⚠️ Security needs hardening
- ⚠️ Monitoring needs setup
- ⚠️ Scalability needs Redis

**Target:** 90/100 before public launch

---

## 📅 Suggested Timeline

**Week 1 (Critical):**
- RLS strategy decision
- Remove debug code
- Add error tracking
- Health check endpoint
- Fix database function security

**Week 2 (Important):**
- Replace in-memory cache with Redis
- Add missing indexes
- Replace console.log with logger
- Set up monitoring

**Week 3 (Polish):**
- RLS policy performance fixes
- Staging environment
- Runbook creation
- Final security audit

---

**Last Review:** 2025-01-23  
**Next Review:** After P0 items completed

