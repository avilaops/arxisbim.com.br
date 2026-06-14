#!/bin/bash

# S19→S26 Pre-Flight Deployment Checklist
# Run before any staging/production deployment

set -e

CHECKS_PASSED=0
CHECKS_FAILED=0

# Use git.exe under WSL to prevent DrvFs performance issues/hangs
if grep -qi microsoft /proc/version 2>/dev/null; then
  git() {
    git.exe "$@"
  }
fi

check_pass() {
  echo -e "✅ $1"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_fail() {
  echo -e "❌ $1"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

echo "=================================================="
echo "S19→S26 Pre-Flight Deployment Checklist"
echo "=================================================="
echo ""

# 1. Git checks
echo "📋 GIT CHECKS"
if git rev-parse HEAD > /dev/null 2>&1; then
  COMMIT=$(git rev-parse --short HEAD)
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  check_pass "Git repository valid (branch: $BRANCH, commit: $COMMIT)"
else
  check_fail "Git repository not found"
fi

CHANGES=$(git status --porcelain)
if [ -n "$CHANGES" ]; then
  check_fail "Uncommitted changes detected"
else
  check_pass "Working directory clean"
fi

# 2. Build artifacts
echo ""
echo "🏗️ BUILD ARTIFACTS"
if [ -d "backend/dist" ]; then
  BACKEND_FILES=$(find backend/dist -type f | wc -l)
  check_pass "Backend dist exists ($BACKEND_FILES files)"
else
  check_fail "Backend dist missing"
fi

if [ -d "frontend/dist" ]; then
  FRONTEND_FILES=$(find frontend/dist -type f | wc -l)
  check_pass "Frontend dist exists ($FRONTEND_FILES files)"
else
  check_fail "Frontend dist missing"
fi

# 3. Required files
echo ""
echo "📁 REQUIRED FILES"
REQUIRED_FILES=(
  "backend/migrations/046_costs_schema.sql"
  "backend/migrations/047_sinapi_items.sql"
  "backend/migrations/048_cost_calculations.sql"
  "backend/migrations/049_billing_cost_snapshots.sql"
  "backend/src/modules/costs/cost-calculator.service.ts"
  "backend/src/modules/costs/takeoff.service.ts"
  "frontend/src/viewer/CostHeatmapSystem.ts"
  "frontend/src/viewer/CostBreakdownPanel.ts"
  "IMPLEMENTATION_SUMMARY.md"
  "STAGING_DEPLOYMENT_GUIDE.md"
  "FINAL_STATUS.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$file"
  else
    check_fail "$file MISSING"
  fi
done

# 4. Environment
echo ""
echo "⚙️ ENVIRONMENT"
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set (will need to be set at deployment)"
else
  check_pass "DATABASE_URL configured"
fi

if [ -z "$JWT_SECRET" ]; then
  echo "⚠️  JWT_SECRET not set (will need to be set at deployment)"
else
  check_pass "JWT_SECRET configured"
fi

# 5. Migrations
echo ""
echo "🗄️ MIGRATIONS"
MIGRATIONS_COUNT=$(find backend/migrations -name "04[6-9]*.sql" | wc -l)
if [ "$MIGRATIONS_COUNT" -eq 4 ]; then
  check_pass "All 4 cost migrations present"
else
  check_fail "Missing migrations (found $MIGRATIONS_COUNT, expected 4)"
fi

# 6. Node modules
echo ""
echo "📦 DEPENDENCIES"
if [ -d "backend/node_modules" ]; then
  check_pass "Backend node_modules installed"
else
  echo "⚠️  Backend node_modules missing (will run npm install at deployment)"
fi

if [ -d "frontend/node_modules" ]; then
  check_pass "Frontend node_modules installed"
else
  echo "⚠️  Frontend node_modules missing (will run npm install at deployment)"
fi

# 7. Documentation
echo ""
echo "📚 DOCUMENTATION"
DOCS=(
  "IMPLEMENTATION_SUMMARY.md"
  "STAGING_DEPLOYMENT_GUIDE.md"
  "FINAL_STATUS.md"
  "SESSION_COMPLETION_REPORT.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    SIZE=$(wc -l < "$doc")
    check_pass "$doc ($SIZE lines)"
  else
    check_fail "$doc missing"
  fi
done

# Summary
echo ""
echo "=================================================="
echo "RESULTS: $CHECKS_PASSED passed, $CHECKS_FAILED failed"
echo "=================================================="

if [ $CHECKS_FAILED -eq 0 ]; then
  echo ""
  echo "✅ ALL CHECKS PASSED"
  echo "Ready for deployment!"
  exit 0
else
  echo ""
  echo "❌ $CHECKS_FAILED CHECK(S) FAILED"
  echo "Please fix issues before deployment"
  exit 1
fi
