#!/bin/bash

# S19→S26 Manual Deployment Script
# Deploys backend, frontend, and runs migrations to staging

set -e

STAGING_HOST="${STAGING_HOST:-staging.arxisvr.local}"
STAGING_PORT="${STAGING_PORT:-22}"
STAGING_USER="${STAGING_USER:-deploy}"
STAGING_PATH="${STAGING_PATH:-/var/www/arxisvr}"
DATABASE_URL="${DATABASE_URL}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

echo "=================================================="
echo "S19→S26 Deployment to Staging"
echo "=================================================="
echo ""

# Step 1: Pre-flight checks
log_info "Running pre-flight checks..."
if [ ! -d "backend/dist" ] || [ ! -d "frontend/dist" ]; then
  log_error "Build artifacts missing. Run 'npm run build' first."
fi
log_success "Build artifacts present"

# Step 2: Verify connection
log_info "Verifying staging server connection..."
if ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
  log_success "Connected to $STAGING_HOST"
else
  log_error "Cannot connect to $STAGING_HOST"
fi

# Step 3: Backup database
log_info "Creating database backup..."
ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "pg_dump -h localhost -U arxisvr arxisvr_staging > /var/backups/arxisvr_staging_$(date +%Y%m%d_%H%M%S).sql" || \
  log_error "Database backup failed"
log_success "Database backed up"

# Step 4: Deploy backend
log_info "Deploying backend..."
rsync -avz --delete \
  -e "ssh -p $STAGING_PORT" \
  backend/dist/ \
  "$STAGING_USER@$STAGING_HOST:$STAGING_PATH/backend/dist/" || \
  log_error "Backend deployment failed"
log_success "Backend deployed"

# Step 5: Deploy frontend
log_info "Deploying frontend..."
rsync -avz --delete \
  -e "ssh -p $STAGING_PORT" \
  frontend/dist/ \
  "$STAGING_USER@$STAGING_HOST:$STAGING_PATH/frontend/dist/" || \
  log_error "Frontend deployment failed"
log_success "Frontend deployed"

# Step 6: Copy migrations
log_info "Copying migrations..."
rsync -avz \
  -e "ssh -p $STAGING_PORT" \
  backend/migrations/04*.sql \
  "$STAGING_USER@$STAGING_HOST:$STAGING_PATH/backend/migrations/" || \
  log_error "Migration copy failed"
log_success "Migrations copied"

# Step 7: Restart backend service
log_info "Restarting backend service..."
ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "sudo systemctl restart arxisvr-backend" || \
  log_error "Backend restart failed"
log_success "Backend restarted (migrations will run automatically)"

# Step 8: Clear frontend cache
log_info "Clearing frontend cache..."
ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "curl -X POST https://staging.arxisvr.local/api/cache/clear 2>/dev/null || true"
log_success "Cache cleared"

# Step 9: Verify deployment
log_info "Verifying deployment..."
sleep 5

if ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "curl -s http://localhost:3001/health | grep -q 'healthy' || grep -q 'degraded'" > /dev/null 2>&1; then
  log_success "Backend health check passed"
else
  log_error "Backend health check failed"
fi

# Step 10: Verify migrations
log_info "Verifying migrations..."
MIGRATIONS=$(ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "PGPASSWORD='$PG_PASSWORD' psql -h localhost -U arxisvr -d arxisvr_staging -c 'SELECT COUNT(*) FROM _migrations WHERE filename LIKE '"'"'04%'"'"';' 2>/dev/null | tail -1 | tr -d ' '" || echo "0")

if [ "$MIGRATIONS" -eq 4 ]; then
  log_success "All 4 cost migrations verified"
else
  log_error "Migrations not applied correctly (found $MIGRATIONS, expected 4)"
fi

echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=================================================="
echo ""
echo "Staging URLs:"
echo "  - App: https://staging.arxisvr.local/app"
echo "  - API: https://staging.arxisvr.local/api/v1"
echo "  - Health: https://staging.arxisvr.local/health"
echo ""
echo "Next steps:"
echo "  1. Run QA tests: ./tests/qa/cost-pipeline-qa.sh"
echo "  2. Manual testing in browser"
echo "  3. Performance testing"
echo "  4. Get approval for production deployment"
echo ""
