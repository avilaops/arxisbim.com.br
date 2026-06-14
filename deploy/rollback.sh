#!/bin/bash

# S19→S26 Rollback Script
# Rolls back staging deployment if something goes wrong

set -e

STAGING_HOST="${STAGING_HOST:-staging.arxisvr.local}"
STAGING_PORT="${STAGING_PORT:-22}"
STAGING_USER="${STAGING_USER:-deploy}"
BACKUP_FILE="${1:-}"

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
echo "S19→S26 Staging Rollback"
echo "=================================================="
echo ""

if [ -z "$BACKUP_FILE" ]; then
  log_info "Finding latest backup..."
  BACKUP_FILE=$(ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
    "ls -t /var/backups/arxisvr_staging_*.sql | head -1")

  if [ -z "$BACKUP_FILE" ]; then
    log_error "No backup files found in /var/backups/"
  fi
fi

log_info "Using backup: $BACKUP_FILE"

# Confirm rollback
echo ""
echo "⚠️  This will restore the database from backup."
echo "Any data changes since the backup will be lost."
echo ""
read -p "Type 'yes' to confirm rollback: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled."
  exit 0
fi

# Stop backend service
log_info "Stopping backend service..."
ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "sudo systemctl stop arxisvr-backend"
log_success "Backend stopped"

# Restore database
log_info "Restoring database from backup..."
ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "PGPASSWORD='$PG_PASSWORD' psql -h localhost -U arxisvr -d arxisvr_staging < $BACKUP_FILE" || \
  log_error "Database restore failed"
log_success "Database restored"

# Start backend service
log_info "Starting backend service..."
ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "sudo systemctl start arxisvr-backend"
log_success "Backend started"

# Verify
sleep 3
log_info "Verifying deployment..."
if ssh -p "$STAGING_PORT" "$STAGING_USER@$STAGING_HOST" \
  "curl -s http://localhost:3001/health | grep -q 'healthy' || grep -q 'degraded'" > /dev/null 2>&1; then
  log_success "Backend health check passed"
else
  log_error "Backend health check failed - manual intervention may be needed"
fi

echo ""
echo "=================================================="
echo "✅ ROLLBACK COMPLETE"
echo "=================================================="
echo ""
echo "The staging environment has been rolled back."
echo "Check the backend logs for any errors:"
echo "  ssh $STAGING_USER@$STAGING_HOST 'tail -f /var/log/arxisvr-backend.log'"
echo ""
