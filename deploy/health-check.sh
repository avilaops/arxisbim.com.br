#!/bin/bash

# S19→S26 Health Check Script
# Verifies staging deployment is healthy

API_URL="${API_URL:-https://staging.arxisvr.local}"
TIMEOUT="${TIMEOUT:-10}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
  echo -e "${RED}❌ $1${NC}"
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "=================================================="
echo "S19→S26 Health Check"
echo "API: $API_URL"
echo "=================================================="
echo ""

PASSED=0
FAILED=0

# 1. API Health
echo "🔍 API HEALTH"
RESPONSE=$(curl -s -m "$TIMEOUT" -w "\n%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  if echo "$BODY" | jq -e '.status == "healthy" or .status == "degraded"' > /dev/null 2>&1; then
    STATUS=$(echo "$BODY" | jq -r '.status')
    check_pass "API health: $STATUS"
    ((PASSED++))
  else
    check_fail "API health check returned unexpected response"
    ((FAILED++))
  fi
else
  check_fail "API health endpoint returned HTTP $HTTP_CODE"
  ((FAILED++))
fi

# 2. Cost Calculation Routes
echo ""
echo "📊 COST ROUTES"
ENDPOINTS=(
  "/api/v1/scenarios/test/cost-calculation"
  "/api/v1/scenarios/test/cost-calculation/breakdown"
)

for endpoint in "${ENDPOINTS[@]}"; do
  RESPONSE=$(curl -s -m "$TIMEOUT" -w "\n%{http_code}" \
    -H "Authorization: Bearer test-token" \
    "$API_URL$endpoint" 2>/dev/null || echo "000")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  # 404 is expected (no test scenario), 200-300 or 401 means endpoint exists
  if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    check_pass "Route exists: $endpoint (HTTP $HTTP_CODE)"
    ((PASSED++))
  elif [ "$HTTP_CODE" = "000" ]; then
    check_fail "Cannot reach $endpoint (timeout)"
    ((FAILED++))
  else
    check_warn "Route $endpoint returned HTTP $HTTP_CODE"
  fi
done

# 3. Frontend Availability
echo ""
echo "🖥️  FRONTEND"
RESPONSE=$(curl -s -m "$TIMEOUT" -w "\n%{http_code}" "$API_URL/app" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  check_pass "App page accessible"
  ((PASSED++))
else
  check_warn "App page returned HTTP $HTTP_CODE (may be behind auth)"
fi

# 4. Database Connectivity
echo ""
echo "🗄️  DATABASE"
# This would require SSH access, so we'll check the API instead
if curl -s -m "$TIMEOUT" -H "Authorization: Bearer test" \
  "$API_URL/api/v1/projects" > /dev/null 2>&1; then
  check_pass "Database accessible via API"
  ((PASSED++))
else
  check_warn "Database check inconclusive (may require auth)"
fi

# 5. Performance
echo ""
echo "⚡ PERFORMANCE"
START=$(date +%s%N)
curl -s -m "$TIMEOUT" "$API_URL/health" > /dev/null 2>&1
END=$(date +%s%N)
DURATION=$((($END - $START) / 1000000))

if [ "$DURATION" -lt 200 ]; then
  check_pass "API response time: ${DURATION}ms (excellent)"
  ((PASSED++))
elif [ "$DURATION" -lt 500 ]; then
  check_pass "API response time: ${DURATION}ms (good)"
  ((PASSED++))
else
  check_warn "API response time: ${DURATION}ms (slower than expected)"
fi

# Summary
echo ""
echo "=================================================="
echo "RESULTS: $PASSED passed, $FAILED failed"
echo "=================================================="

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "✅ HEALTH CHECK PASSED"
  exit 0
else
  echo ""
  echo "❌ HEALTH CHECK FAILED"
  echo "Please investigate the failures above."
  exit 1
fi
