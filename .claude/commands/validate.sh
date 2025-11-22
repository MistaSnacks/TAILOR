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
echo "  2. Perform manual E2E tests (see validate.md Phase 8)"
echo "  3. Test integrations (see validate.md Phase 9)"
echo "  4. Verify error handling (see validate.md Phase 10)"
echo ""
echo "🎉 Validation script complete!"

