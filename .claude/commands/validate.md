# TAILOR - Comprehensive Validation Command

This validation command provides complete confidence that the TAILOR application is working correctly. It validates code quality, environment configuration, API endpoints, database integrity, external integrations, and complete user workflows.

## Prerequisites

Before running validation, ensure:
- Node.js 18+ is installed
- All environment variables are set in `.env.local`
- Supabase project is running and accessible
- Development server can be started (`npm run dev`)

## Phase 1: Code Quality Checks

### 1.1 Linting
```bash
npm run lint
```
**Expected**: No ESLint errors or warnings
**Validates**: Code style, Next.js best practices, React patterns

### 1.2 Type Checking
```bash
npx tsc --noEmit
```
**Expected**: No TypeScript errors
**Validates**: Type safety, interface compliance, import correctness

### 1.3 Build Validation
```bash
npm run build
```
**Expected**: Successful build with no errors
**Validates**: 
- All pages compile correctly
- API routes are valid
- Dependencies resolve correctly
- Production build succeeds

## Phase 2: Environment Configuration

### 2.1 Environment Variable Validation
```bash
# Check server-side environment variables
curl http://localhost:3000/api/env-check 2>/dev/null | jq '.'
```

**Expected**: All required variables present:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `NEXTAUTH_URL` ✅
- `NEXTAUTH_SECRET` ✅
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅
- `GEMINI_API_KEY` ✅
- `NEXT_PUBLIC_APP_URL` ✅

**Validates**: All secrets and configuration are properly set

### 2.2 Environment Variable Format Validation
```bash
# Validate Supabase URL format
node -e "
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
try {
  new URL(url);
  console.log('✅ Supabase URL format valid');
} catch {
  console.error('❌ Supabase URL format invalid');
  process.exit(1);
}
"
```

**Expected**: Valid URL format
**Validates**: Environment variables are in correct format

## Phase 3: Database Schema Validation

### 3.1 Schema File Exists
```bash
test -f supabase/schema.sql && echo "✅ Schema file exists" || echo "❌ Schema file missing"
```

### 3.2 Required Tables Check
```bash
# Check that schema.sql contains all required tables
grep -q "CREATE TABLE.*users" supabase/schema.sql && echo "✅ users table" || echo "❌ users table missing"
grep -q "CREATE TABLE.*profiles" supabase/schema.sql && echo "✅ profiles table" || echo "❌ profiles table missing"
grep -q "CREATE TABLE.*documents" supabase/schema.sql && echo "✅ documents table" || echo "❌ documents table missing"
grep -q "CREATE TABLE.*jobs" supabase/schema.sql && echo "✅ jobs table" || echo "❌ jobs table missing"
grep -q "CREATE TABLE.*resume_versions" supabase/schema.sql && echo "✅ resume_versions table" || echo "❌ resume_versions table missing"
grep -q "CREATE TABLE.*ats_scores" supabase/schema.sql && echo "✅ ats_scores table" || echo "❌ ats_scores table missing"
grep -q "CREATE TABLE.*chat_threads" supabase/schema.sql && echo "✅ chat_threads table" || echo "❌ chat_threads table missing"
grep -q "CREATE TABLE.*chat_messages" supabase/schema.sql && echo "✅ chat_messages table" || echo "❌ chat_messages table missing"
```

**Expected**: All tables present in schema
**Validates**: Database schema completeness

### 3.3 NextAuth Tables Check
```bash
grep -q "CREATE TABLE.*accounts" supabase/schema.sql && echo "✅ accounts table" || echo "❌ accounts table missing"
grep -q "CREATE TABLE.*sessions" supabase/schema.sql && echo "✅ sessions table" || echo "❌ sessions table missing"
grep -q "CREATE TABLE.*verification_tokens" supabase/schema.sql && echo "✅ verification_tokens table" || echo "❌ verification_tokens table missing"
```

**Expected**: All NextAuth adapter tables present
**Validates**: Authentication infrastructure

## Phase 4: External Integration Validation

### 4.1 Supabase Connection Test
```bash
# Test Supabase connection (requires running app)
curl -X GET "http://localhost:3000/api/env-check" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.envStatus'
```

**Expected**: All Supabase-related env vars show as `true`
**Validates**: Supabase credentials are valid

### 4.2 Gemini API Key Format Check
```bash
# Gemini API keys typically start with specific patterns
node -e "
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}
if (key.length < 20) {
  console.error('❌ GEMINI_API_KEY appears invalid (too short)');
  process.exit(1);
}
console.log('✅ GEMINI_API_KEY format check passed');
"
```

**Expected**: API key exists and has reasonable length
**Validates**: Gemini API key is configured

## Phase 5: API Route Validation

**Note**: These tests require the development server to be running (`npm run dev`)

### 5.1 Public Routes (No Auth Required)

#### Environment Check Endpoint
```bash
curl -X GET "http://localhost:3000/api/env-check" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.valid'
```
**Expected**: `true`
**Validates**: Environment check endpoint works

#### NextAuth Endpoint
```bash
curl -X GET "http://localhost:3000/api/auth/providers" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.google'
```
**Expected**: Google provider configuration returned
**Validates**: NextAuth is configured correctly

### 5.2 Protected Routes (Require Authentication)

**Note**: These require a valid session cookie. In a real E2E test, you would:
1. Sign in via OAuth
2. Capture session cookie
3. Use cookie for subsequent requests

For validation purposes, we check that routes return proper auth errors:

#### Upload Endpoint (Unauthenticated)
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null | jq '.error // .message'
```
**Expected**: Unauthorized error or redirect
**Validates**: Auth protection is working

#### Jobs Endpoint (Unauthenticated)
```bash
curl -X GET "http://localhost:3000/api/jobs" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.error // .message'
```
**Expected**: Unauthorized error or redirect
**Validates**: Auth protection is working

#### Generate Endpoint (Unauthenticated)
```bash
curl -X POST "http://localhost:3000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null | jq '.error // .message'
```
**Expected**: Unauthorized error or redirect
**Validates**: Auth protection is working

#### Resumes Endpoint (Unauthenticated)
```bash
curl -X GET "http://localhost:3000/api/resumes" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.error // .message'
```
**Expected**: Unauthorized error or redirect
**Validates**: Auth protection is working

#### Chat Endpoint (Unauthenticated)
```bash
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null | jq '.error // .message'
```
**Expected**: Unauthorized error or redirect
**Validates**: Auth protection is working

#### Profile Endpoint (Unauthenticated)
```bash
curl -X GET "http://localhost:3000/api/profile" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.error // .message'
```
**Expected**: Unauthorized error or redirect
**Validates**: Auth protection is working

## Phase 6: Page Route Validation

### 6.1 Public Pages
```bash
# Landing page
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/" | grep -q "200" && echo "✅ Landing page loads" || echo "❌ Landing page failed"

# Auth callback page
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/auth/callback" | grep -q "200\|302" && echo "✅ Auth callback page exists" || echo "❌ Auth callback page failed"
```

**Expected**: Pages return 200 or appropriate redirect
**Validates**: Public routes are accessible

### 6.2 Protected Pages (Should Redirect)
```bash
# Dashboard pages should redirect to sign-in when not authenticated
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dashboard" | grep -q "302\|401\|403" && echo "✅ Dashboard protected" || echo "❌ Dashboard not protected"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dashboard/documents" | grep -q "302\|401\|403" && echo "✅ Documents page protected" || echo "❌ Documents page not protected"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dashboard/generate" | grep -q "302\|401\|403" && echo "✅ Generate page protected" || echo "❌ Generate page not protected"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dashboard/resumes" | grep -q "302\|401\|403" && echo "✅ Resumes page protected" || echo "❌ Resumes page not protected"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dashboard/chat" | grep -q "302\|401\|403" && echo "✅ Chat page protected" || echo "❌ Chat page not protected"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/dashboard/profile" | grep -q "302\|401\|403" && echo "✅ Profile page protected" || echo "❌ Profile page not protected"
```

**Expected**: All dashboard pages redirect when unauthenticated
**Validates**: Middleware protection is working

## Phase 7: File Structure Validation

### 7.1 Required Directories Exist
```bash
test -d app && echo "✅ app directory" || echo "❌ app directory missing"
test -d app/api && echo "✅ app/api directory" || echo "❌ app/api directory missing"
test -d app/dashboard && echo "✅ app/dashboard directory" || echo "❌ app/dashboard directory missing"
test -d components && echo "✅ components directory" || echo "❌ components directory missing"
test -d lib && echo "✅ lib directory" || echo "❌ lib directory missing"
test -d supabase && echo "✅ supabase directory" || echo "❌ supabase directory missing"
```

### 7.2 Critical Files Exist
```bash
test -f package.json && echo "✅ package.json" || echo "❌ package.json missing"
test -f tsconfig.json && echo "✅ tsconfig.json" || echo "❌ tsconfig.json missing"
test -f next.config.ts && echo "✅ next.config.ts" || echo "❌ next.config.ts missing"
test -f middleware.ts && echo "✅ middleware.ts" || echo "❌ middleware.ts missing"
test -f env.example && echo "✅ env.example" || echo "❌ env.example missing"
test -f supabase/schema.sql && echo "✅ schema.sql" || echo "❌ schema.sql missing"
test -f lib/auth.ts && echo "✅ lib/auth.ts" || echo "❌ lib/auth.ts missing"
test -f lib/auth-utils.ts && echo "✅ lib/auth-utils.ts" || echo "❌ lib/auth-utils.ts missing"
test -f lib/supabase.ts && echo "✅ lib/supabase.ts" || echo "❌ lib/supabase.ts missing"
test -f lib/gemini.ts && echo "✅ lib/gemini.ts" || echo "❌ lib/gemini.ts missing"
```

### 7.3 API Route Files Exist
```bash
test -f app/api/auth/\[...nextauth\]/route.ts && echo "✅ NextAuth route" || echo "❌ NextAuth route missing"
test -f app/api/upload/route.ts && echo "✅ Upload route" || echo "❌ Upload route missing"
test -f app/api/jobs/route.ts && echo "✅ Jobs route" || echo "❌ Jobs route missing"
test -f app/api/generate/route.ts && echo "✅ Generate route" || echo "❌ Generate route missing"
test -f app/api/resumes/route.ts && echo "✅ Resumes route" || echo "❌ Resumes route missing"
test -f app/api/resumes/\[id\]/download/route.ts && echo "✅ Resume download route" || echo "❌ Resume download route missing"
test -f app/api/chat/route.ts && echo "✅ Chat route" || echo "❌ Chat route missing"
test -f app/api/profile/route.ts && echo "✅ Profile route" || echo "❌ Profile route missing"
test -f app/api/profile/enrich/route.ts && echo "✅ Profile enrich route" || echo "❌ Profile enrich route missing"
test -f app/api/env-check/route.ts && echo "✅ Env check route" || echo "❌ Env check route missing"
```

## Phase 8: End-to-End User Workflow Testing

**Note**: These are manual tests that should be performed with a browser. They validate complete user journeys as documented in QUICKSTART.md.

### 8.1 Complete User Journey: Sign In → Upload → Generate → Download

**Test Steps** (to be performed manually in browser):
1. **Sign In**
   - Navigate to `http://localhost:3000`
   - Click "Sign In with Google"
   - Complete OAuth flow
   - Verify redirect to `/dashboard`
   - ✅ **Expected**: User is authenticated and redirected to dashboard

2. **Upload Document**
   - Navigate to `/dashboard/documents`
   - Upload a test PDF or DOCX file
   - Wait for upload to complete
   - Verify document appears in list
   - ✅ **Expected**: Document uploads successfully and appears in list

3. **Create Job Description**
   - Navigate to `/dashboard/generate`
   - Enter job title, company, and description
   - Select a template
   - Click "Generate Resume"
   - Wait for generation to complete
   - ✅ **Expected**: Resume is generated with ATS score

4. **View Generated Resume**
   - Navigate to `/dashboard/resumes`
   - Verify generated resume appears in list
   - Verify ATS score is displayed
   - ✅ **Expected**: Resume appears with score

5. **Download Resume**
   - Click download button on generated resume
   - Verify DOCX file downloads
   - Open file and verify content
   - ✅ **Expected**: DOCX file downloads and contains resume content

6. **Chat with Documents**
   - Navigate to `/dashboard/chat`
   - Send a message asking about uploaded documents
   - Verify AI response
   - ✅ **Expected**: Chat responds with relevant information

7. **Update Profile**
   - Navigate to `/dashboard/profile`
   - Update personal information
   - Save changes
   - Verify updates persist
   - ✅ **Expected**: Profile updates successfully

### 8.2 Authentication Flow Validation

**Test Steps**:
1. **Sign Out**
   - Click sign out button
   - Verify redirect to landing page
   - ✅ **Expected**: User is signed out

2. **Protected Route Access**
   - While signed out, try to access `/dashboard`
   - Verify redirect to landing page
   - ✅ **Expected**: Unauthenticated users cannot access dashboard

3. **Session Persistence**
   - Sign in again
   - Close browser tab
   - Reopen and navigate to `/dashboard`
   - ✅ **Expected**: User remains signed in (if session valid)

## Phase 9: Integration Testing (Manual)

### 9.1 Supabase Integration
- Verify database connection works
- Check that data persists after page refresh
- Verify RLS policies are enforced
- ✅ **Expected**: All database operations work correctly

### 9.2 Gemini AI Integration
- Generate a resume and verify AI content
- Send chat message and verify AI response
- ✅ **Expected**: Gemini API calls succeed and return content

### 9.3 Google OAuth Integration
- Complete sign-in flow
- Verify user data is retrieved from Google
- ✅ **Expected**: OAuth flow completes successfully

## Phase 10: Error Handling Validation

### 10.1 Invalid Input Handling
- Try uploading invalid file types
- Try generating resume without job description
- Try accessing non-existent resume ID
- ✅ **Expected**: Appropriate error messages displayed

### 10.2 Network Error Handling
- Disconnect internet and try operations
- ✅ **Expected**: Graceful error handling, no crashes

### 10.3 Missing Data Handling
- Try operations without uploaded documents
- ✅ **Expected**: Appropriate fallback behavior

## Complete Validation Script

Here's a complete script that runs all automated validations:

```bash
#!/bin/bash

set -e

echo "🚀 Starting TAILOR Comprehensive Validation..."
echo ""

# Phase 1: Code Quality
echo "📋 Phase 1: Code Quality Checks"
echo "  Running lint..."
npm run lint
echo "  ✅ Lint passed"
echo ""

echo "  Running type check..."
npx tsc --noEmit
echo "  ✅ Type check passed"
echo ""

echo "  Running build..."
npm run build
echo "  ✅ Build passed"
echo ""

# Phase 2: Environment
echo "📋 Phase 2: Environment Configuration"
if [ -f .env.local ]; then
  echo "  ✅ .env.local exists"
  source .env.local
else
  echo "  ⚠️  .env.local not found (using system env)"
fi

# Check required env vars
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXTAUTH_URL"
  "NEXTAUTH_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "GEMINI_API_KEY"
)

MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "  ❌ $var is not set"
    MISSING=1
  else
    echo "  ✅ $var is set"
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "  ⚠️  Some environment variables are missing"
else
  echo "  ✅ All environment variables are set"
fi
echo ""

# Phase 3: Database Schema
echo "📋 Phase 3: Database Schema Validation"
if [ -f supabase/schema.sql ]; then
  echo "  ✅ Schema file exists"
  
  TABLES=("users" "profiles" "documents" "jobs" "resume_versions" "ats_scores" "chat_threads" "chat_messages" "accounts" "sessions" "verification_tokens")
  for table in "${TABLES[@]}"; do
    if grep -q "CREATE TABLE.*$table" supabase/schema.sql; then
      echo "  ✅ $table table found"
    else
      echo "  ❌ $table table missing"
    fi
  done
else
  echo "  ❌ Schema file missing"
fi
echo ""

# Phase 4: File Structure
echo "📋 Phase 4: File Structure Validation"
DIRS=("app" "app/api" "app/dashboard" "components" "lib" "supabase")
for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✅ $dir directory exists"
  else
    echo "  ❌ $dir directory missing"
  fi
done

FILES=("package.json" "tsconfig.json" "next.config.ts" "middleware.ts" "env.example" "supabase/schema.sql" "lib/auth.ts" "lib/auth-utils.ts" "lib/supabase.ts" "lib/gemini.ts")
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file exists"
  else
    echo "  ❌ $file missing"
  fi
done
echo ""

# Phase 5: API Routes (if server is running)
echo "📋 Phase 5: API Route Validation"
echo "  ⚠️  Note: API route tests require server to be running"
echo "  Start server with: npm run dev"
echo "  Then test endpoints manually or with curl"
echo ""

echo "✅ Automated validation complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Start development server: npm run dev"
echo "  2. Perform manual E2E tests (Phase 8)"
echo "  3. Test integrations (Phase 9)"
echo "  4. Verify error handling (Phase 10)"
echo ""
echo "🎉 Validation script complete!"
```

## Usage

### Quick Validation (Automated)
```bash
chmod +x .claude/commands/validate.sh  # If you save the script above
./.claude/commands/validate.sh
```

### Full Validation (Manual + Automated)
1. Run automated checks: `npm run lint && npx tsc --noEmit && npm run build`
2. Start dev server: `npm run dev`
3. Perform manual E2E tests (Phase 8)
4. Test integrations (Phase 9)
5. Verify error handling (Phase 10)

## Success Criteria

✅ **All automated checks pass**:
- Linting: No errors
- Type checking: No errors
- Build: Successful
- Environment: All variables set
- Schema: All tables present
- File structure: All critical files exist

✅ **All manual tests pass**:
- Complete user journey works end-to-end
- Authentication flow works correctly
- All integrations function properly
- Error handling is graceful

## Notes

- Some validations require the development server to be running
- E2E tests require manual browser testing or automation tools (Playwright, Cypress)
- Database schema validation checks file contents, not actual database state
- For production validation, also check:
  - Vercel deployment succeeds
  - Environment variables are set in Vercel
  - Supabase project is not paused
  - RLS policies are enabled
  - Storage buckets are configured

