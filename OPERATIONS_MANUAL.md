# S19→S26 Operations Manual

**For:** DevOps/Platform Engineers, SREs
**Status:** Complete & Ready
**Last Updated:** 2026-06-14

---

## Table of Contents

1. [Pre-Deployment](#pre-deployment)
2. [Deployment](#deployment)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Daily Operations](#daily-operations)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)
8. [Incident Response](#incident-response)
9. [Performance Tuning](#performance-tuning)
10. [Security](#security)

---

## Pre-Deployment

### 1. Environment Preparation

#### Database Setup
```bash
# Connect to PostgreSQL server
psql -h postgres-server -U postgres

# Run initialization script
\i deploy/init-database.sql

# Verify
SELECT datname FROM pg_database WHERE datname = 'arxisvr_staging';
```

#### Required Environment Variables
```bash
# Backend
export DATABASE_URL="postgresql://arxisvr:password@localhost/arxisvr_staging"
export JWT_SECRET="your-jwt-secret-here"
export JWT_REFRESH_SECRET="your-refresh-secret-here"
export PORT=3001
export HOST=0.0.0.0
export LOG_LEVEL=info

# Frontend
export VITE_API_URL="https://staging.arxisvr.local/api/v1"
export VITE_APP_URL="https://staging.arxisvr.local"
```

#### System Requirements Check
```bash
# Verify Node.js
node --version  # Should be 18+ or 20+

# Verify PostgreSQL
psql --version  # Should be 13+

# Verify disk space
df -h /var  # Ensure 20GB+ available

# Verify network
ping -c 1 staging.arxisvr.local

# Verify ports available
netstat -tuln | grep -E ':(3001|5432|443|80)'
```

### 2. Pre-Flight Verification

```bash
# Run pre-flight checklist
bash deploy/preflight-checklist.sh

# Expected output:
# ✅ All checks passed
```

---

## Deployment

### 1. Database Initialization

```bash
# Initialize database
psql -h localhost -U postgres -f deploy/init-database.sql

# Verify
psql -h localhost -U arxisvr -d arxisvr_staging -c "SELECT COUNT(*) FROM _migrations;"
# Expected: 0 rows (migrations haven't run yet)
```

### 2. Backend Deployment

```bash
# Set environment
export DATABASE_URL="postgresql://arxisvr:password@localhost/arxisvr_staging"
export JWT_SECRET="your-jwt-secret"

# Navigate to backend
cd backend

# Install dependencies
npm install

# Build
npm run build

# Run (migrations will auto-run)
npm start

# Wait for output:
# ✅ Migration applied: 046_costs_schema.sql
# ✅ Migration applied: 047_sinapi_items.sql
# ✅ Migration applied: 048_cost_calculations.sql
# ✅ Migration applied: 049_billing_cost_snapshots.sql
# Server listening on http://0.0.0.0:3001
```

### 3. Frontend Deployment

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Build
npm run build

# Serve (via nginx or your CDN)
# Copy dist/* to /var/www/arxisvr-frontend/

# Verify
curl -s https://staging.arxisvr.local/app | grep -q "<!DOCTYPE" && echo "✅ Frontend accessible"
```

### 4. Post-Deployment Verification

```bash
# Health check
bash deploy/health-check.sh

# Expected:
# ✅ API health: healthy
# ✅ Routes exist
# ✅ API response time: <200ms
```

---

## Post-Deployment Verification

### 1. Database Verification

```bash
# Check migrations
psql -h localhost -U arxisvr -d arxisvr_staging -c \
  "SELECT filename FROM _migrations WHERE filename LIKE '04%' ORDER BY filename;"

# Expected: 4 rows
# 046_costs_schema.sql
# 047_sinapi_items.sql
# 048_cost_calculations.sql
# 049_billing_cost_snapshots.sql

# Verify tables exist
psql -h localhost -U arxisvr -d arxisvr_staging -c \
  "\dt public.cost_*"

# Expected: 3 tables
# cost_tables
# cost_items
# element_cost_links
```

### 2. API Verification

```bash
# Test health endpoint
curl -s http://localhost:3001/health | jq .

# Test cost routes exist (will 401 without auth, but route exists)
curl -s -H "Authorization: Bearer test" \
  http://localhost:3001/api/v1/scenarios/test/cost-calculation | jq .

# Expected: Either 404 (no scenario) or 401 (auth) — means route exists
```

### 3. Frontend Verification

```bash
# Verify frontend loads
curl -s https://staging.arxisvr.local/app | head -20 | grep -q "<!DOCTYPE"
echo "✅ Frontend loads"

# Verify heatmap component
curl -s https://staging.arxisvr.local/app | grep -q "cost-breakdown-panel"
echo "✅ Cost components present"
```

### 4. Run QA Suite

```bash
# Run automated QA
bash tests/qa/cost-pipeline-qa.sh

# Expected: All tests pass
```

---

## Daily Operations

### Morning Health Check

```bash
#!/bin/bash
# Run at 9 AM daily

echo "=== S19→S26 Morning Health Check ==="

# Check backend
if curl -s http://localhost:3001/health | grep -q "healthy"; then
  echo "✅ Backend: Healthy"
else
  echo "❌ Backend: DOWN - ALERT!"
fi

# Check database
if psql -h localhost -U arxisvr -d arxisvr_staging -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Database: Connected"
else
  echo "❌ Database: DOWN - ALERT!"
fi

# Check disk space
DISK=$(df /var | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK -lt 90 ]; then
  echo "✅ Disk: ${DISK}% used"
else
  echo "⚠️  Disk: ${DISK}% used - may need cleanup"
fi

# Check recent errors
ERRORS=$(tail -100 /var/log/arxisvr-backend.log | grep -c "ERROR")
if [ $ERRORS -eq 0 ]; then
  echo "✅ Errors: None in last hour"
else
  echo "⚠️  Errors: $ERRORS found in logs"
fi

echo "=== End of Check ==="
```

### Log Monitoring

```bash
# Follow backend logs in real-time
tail -f /var/log/arxisvr-backend.log | grep -E "ERROR|WARN|cost"

# Check for specific errors
grep -i "cost" /var/log/arxisvr-backend.log | tail -20

# Database slow queries
tail -100 /var/log/postgresql/postgresql.log | grep "duration: " | sort -k3 -rn | head -10
```

### Performance Metrics

```bash
# Check response times
curl -s -w "Time: %{time_total}s\n" http://localhost:3001/health

# Multiple requests to check consistency
for i in {1..5}; do 
  curl -s -w "Request $i: %{time_total}s\n" http://localhost:3001/health
done

# Should be consistent, under 200ms
```

---

## Monitoring & Alerting

### Recommended Metrics

```
Backend Metrics:
- API Response Time (target: <200ms p99)
- Error Rate (target: <0.1%)
- Request Volume (monitor for anomalies)
- Cache Hit Rate (target: >80%)

Database Metrics:
- Query Response Time (target: <100ms p99)
- Connection Pool Utilization (target: <80%)
- Disk Usage (alert at 85%)
- Replication Lag (if applicable)

Frontend Metrics:
- Page Load Time (target: <3s)
- JavaScript Errors (target: 0)
- CDN Cache Hit Rate (target: >95%)
```

### Alert Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Backend Down | No response for 2min | Page on-call |
| High Error Rate | >1% errors | Investigate logs |
| Database Down | No connection | Page on-call |
| Disk Full | >95% usage | Emergency cleanup |
| High Response Time | p99 > 1000ms | Check queries |
| Cache Miss Rate | >40% | Check cache config |

### Example Prometheus Config

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'arxisvr-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alerting-rules.yml'
```

---

## Backup & Recovery

### Backup Schedule

```bash
#!/bin/bash
# Run every 6 hours

BACKUP_DIR="/var/backups/arxisvr"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/arxisvr_staging_$TIMESTAMP.sql"

# Create backup
pg_dump -h localhost -U arxisvr arxisvr_staging | gzip > "$BACKUP_FILE.gz"

# Verify
if psql -h localhost -U arxisvr -d arxisvr_staging -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Backup successful: $BACKUP_FILE.gz"
  
  # Keep only last 14 days of backups
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete
else
  echo "❌ Backup failed!"
fi
```

### Recovery Procedure

```bash
# 1. Stop backend
sudo systemctl stop arxisvr-backend

# 2. Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE arxisvr_staging;"
psql -h localhost -U postgres -f deploy/init-database.sql

# 3. Restore from backup
gunzip -c /var/backups/arxisvr/arxisvr_staging_20260614_120000.sql.gz | \
  psql -h localhost -U arxisvr -d arxisvr_staging

# 4. Verify
psql -h localhost -U arxisvr -d arxisvr_staging -c "SELECT COUNT(*) FROM _migrations;"

# 5. Start backend
sudo systemctl start arxisvr-backend

# 6. Verify restored
curl -s http://localhost:3001/health | jq .
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
tail -50 /var/log/arxisvr-backend.log

# Common issues:
# 1. DATABASE_URL not set
#    Solution: export DATABASE_URL="..."

# 2. Port already in use
#    Solution: lsof -i :3001 && kill -9 <PID>

# 3. Database not accessible
#    Solution: psql -h localhost -U arxisvr -d arxisvr_staging

# 4. Missing JWT_SECRET
#    Solution: export JWT_SECRET="your-secret"
```

### High API Response Time

```bash
# Check database query performance
psql -h localhost -U arxisvr -d arxisvr_staging -c \
  "EXPLAIN ANALYZE SELECT * FROM cost_calculations LIMIT 10;"

# Check cache hit rate
curl -s http://localhost:3001/metrics | grep cache_hit_ratio

# Check slow queries
tail -50 /var/log/postgresql/postgresql.log | grep "duration:" | sort -rn
```

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U arxisvr -d arxisvr_staging -c "SELECT 1;"

# Check connection pool
psql -h localhost -U postgres -d arxisvr_staging -c \
  "SELECT count(*) used FROM pg_stat_activity WHERE datname = 'arxisvr_staging';"

# If too many: Kill idle connections
psql -h localhost -U postgres -d arxisvr_staging -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE datname = 'arxisvr_staging' AND state = 'idle';"
```

### Migrations Failed

```bash
# Check applied migrations
psql -h localhost -U arxisvr -d arxisvr_staging -c "SELECT * FROM _migrations;"

# Check for partially applied migrations
psql -h localhost -U arxisvr -d arxisvr_staging -c "\d cost_tables"

# Manually apply missing migration
psql -h localhost -U arxisvr -d arxisvr_staging < backend/migrations/046_costs_schema.sql

# Mark as applied
psql -h localhost -U arxisvr -d arxisvr_staging -c \
  "INSERT INTO _migrations (filename) VALUES ('046_costs_schema.sql');"
```

---

## Incident Response

### SEV-1: Complete Outage

```bash
# 1. Alert team (page on-call)
echo "SEV-1: Complete Outage" | mail -s "URGENT" on-call@company.com

# 2. Check status
bash deploy/health-check.sh

# 3. Try restart
sudo systemctl restart arxisvr-backend

# 4. If restart fails, rollback
bash deploy/rollback.sh

# 5. Investigate root cause
tail -200 /var/log/arxisvr-backend.log | grep ERROR

# 6. Update incident tracker
# Create incident ticket with details
```

### SEV-2: Degraded Performance

```bash
# 1. Identify bottleneck
# Database? Check slow queries
# API? Check response times
# Frontend? Check network waterfall

# 2. Gather metrics
curl -s http://localhost:3001/metrics | jq .

# 3. Check resource usage
top -b -n 1
df -h
free -h

# 4. Scale if needed
# Add more backend instances if CPU at 80%+
# Clear cache if hit rate <60%

# 5. Monitor recovery
watch -n 10 'bash deploy/health-check.sh'
```

### SEV-3: Partial Service Degradation

```bash
# 1. Determine affected component
# (cost module? billing? takeoff?)

# 2. Check related logs
grep -i "component-name" /var/log/arxisvr-backend.log

# 3. Restart affected service
# OR: Clear cache: redis-cli FLUSHALL
# OR: Re-run migration

# 4. Verify fix
curl -s http://localhost:3001/api/v1/scenarios/test/cost-calculation

# 5. Schedule fix review
# (post-incident review after 24h)
```

---

## Performance Tuning

### Database Optimization

```sql
-- Analyze tables for statistics
ANALYZE cost_tables;
ANALYZE cost_items;
ANALYZE element_cost_links;
ANALYZE cost_calculations;

-- Reindex if fragmented
REINDEX TABLE cost_calculations;

-- Check index bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Cache Tuning

```bash
# Monitor cache hit rate
watch -n 5 'curl -s http://localhost:3001/metrics | grep cache'

# Increase TTL if hit rate < 60%
export CACHE_TTL_MS=600000  # 10 minutes instead of 5

# Decrease if memory usage > 80%
export CACHE_TTL_MS=60000   # 1 minute
```

### Connection Pool Tuning

```bash
# Check current settings
psql -h localhost -U postgres -c "SHOW max_connections;"

# If needed, increase
psql -h localhost -U postgres -c "ALTER SYSTEM SET max_connections = 200;"
sudo systemctl restart postgresql
```

---

## Security

### Access Control

```bash
# Database user permissions (least privilege)
psql -h localhost -U postgres <<EOF
REVOKE ALL ON DATABASE arxisvr_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE arxisvr_staging TO arxisvr;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO arxisvr;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arxisvr;
EOF
```

### Network Security

```bash
# Firewall rules (ufw)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 22/tcp    # SSH (restrict to known IPs)
sudo ufw deny 3001/tcp   # Backend (localhost only)
sudo ufw deny 5432/tcp   # Database (localhost only)

# Verify
sudo ufw status
```

### SSL/TLS

```bash
# Renew Let's Encrypt certificates (before expiry)
sudo certbot renew --dry-run
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername staging.arxisvr.local \
  -connect staging.arxisvr.local:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Audit Logging

```bash
# Enable database audit logging
psql -h localhost -U postgres -d arxisvr_staging <<EOF
CREATE EXTENSION IF NOT EXISTS pgaudit;

ALTER TABLE cost_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_cost_calculations ON cost_calculations
  FOR ALL USING (true);
EOF

# Review audit logs
tail -100 /var/log/postgresql/postgresql.log | grep pgaudit
```

---

## Runbooks Quick Reference

| Scenario | Command | Time |
|----------|---------|------|
| Deploy | `bash deploy/deploy-to-staging.sh` | 5 min |
| Health Check | `bash deploy/health-check.sh` | 1 min |
| Rollback | `bash deploy/rollback.sh` | 3 min |
| Backup | `pg_dump ... \| gzip` | 2 min |
| Restore | `gunzip \| psql` | 3 min |
| Restart | `systemctl restart arxisvr-backend` | 30 sec |
| Tail Logs | `tail -f /var/log/arxisvr-backend.log` | 0 sec |

---

## Support Contacts

- **On-Call (SEV-1/2):** page on-call@company.com
- **DevOps:** devops@company.com
- **Database:** dba@company.com
- **Slack:** #arxisvr-ops

---

**Last Updated:** 2026-06-14
**Status:** ✅ Production Ready
**Document Version:** 1.0
