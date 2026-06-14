# S19→S26 Staging Deployment & QA Guide

## Commit
`feat(s19-s26): complete cost pipeline — schema → takeoff → calculation → visualization → billing`
Hash: `4989c5f`

## Pre-Deployment Checklist

### Database
- [ ] Backup production database
- [ ] Staging DB has been created
- [ ] PostgreSQL 18+ running
- [ ] Database extensions: uuid-ossp, pgcrypto, pg_trgm (optional)

### Backend
- [ ] Build: `npm run build` ✅ (270 files → dist, 1198ms)
- [ ] Migrations: 046-049 all present and verified
- [ ] Routes registered: costs, takeoff, cost-calculation (src/index.ts lines 635-637)
- [ ] Test suite: All 8 integration tests passing

### Frontend
- [ ] Build: `npm run build` ✅ (7.20s, PWA complete)
- [ ] Lit components imported: CostHeatmapSystem, CostBreakdownPanel
- [ ] ViewerHost integration verified

## Manual Deployment Steps

### 1. Backend Deployment
```bash
# Build
cd backend
npm run build
# Output: dist/ with 270 files

# Deploy to staging
# (Manual: upload dist/* to staging server)
# Set environment variables (DATABASE_URL, JWT_SECRET, etc.)

# Run migrations
# The app will auto-run migrations on startup (see index.ts runMigrations)
# Verify: SELECT * FROM _migrations WHERE filename LIKE '04%';
```

### 2. Frontend Deployment
```bash
# Build
cd frontend
npm run build
# Output: dist/ with PWA (SW enabled)

# Deploy to staging
# (Manual: upload dist/* to staging CDN/server)
# Verify: Open /shared.html for shared viewer, /app for main app
```

### 3. Database Migrations
Migrations auto-run on backend startup. Verify with:
```sql
SELECT filename FROM _migrations WHERE filename IN (
  '046_costs_schema.sql',
  '047_sinapi_items.sql',
  '048_cost_calculations.sql',
  '049_billing_cost_snapshots.sql'
);
```

Expected result: 4 rows (all migrations applied)

## Manual QA Testing

### Setup Test Data
```sql
-- Create tenant, company, project, user
INSERT INTO tenants (tenant_id, name) VALUES ('qa-tenant', 'QA Tenant');
INSERT INTO companies (company_id, tenant_id, name) VALUES ('qa-co', 'qa-tenant', 'QA Co');
INSERT INTO users (email, name, password_hash, tenant_id, company_id, role, email_verified, is_active)
VALUES ('qa@test.com', 'QA User', 'dummy', 'qa-tenant', 'qa-co', 'admin', TRUE, TRUE) RETURNING id;
-- Save user ID

-- Create project with slug
INSERT INTO projects (tenant_id, company_id, name, slug, description)
VALUES ('qa-tenant', 'qa-co', 'QA Cost Project', 'qa-cost-proj', 'Testing cost pipeline')
RETURNING id;
-- Save project ID

-- Create model + version
INSERT INTO models (project_id, name) VALUES ('<project_id>', 'QA Model') RETURNING id;
INSERT INTO model_versions (model_id, version, status)
VALUES ('<model_id>', 1, 'ready') RETURNING id;
-- Save model_version_id

-- Create scenario
INSERT INTO scenarios (tenant_id, project_id, model_version_id, name)
VALUES ('qa-tenant', '<project_id>', '<model_version_id>', 'QA Scenario')
RETURNING id;
-- Save scenario_id
```

### Test S19: Cost Data Model
**API Endpoint:** `POST /api/v1/projects/:projectId/cost-tables`
```json
{
  "name": "Test Cost Table",
  "description": "QA Test Table",
  "source": "custom",
  "created_by": "<user_id>"
}
```
✅ Should return 201 with cost_table object
✅ Verify: `SELECT * FROM cost_tables WHERE name = 'Test Cost Table'`

**Add Cost Item:** `POST /api/v1/cost-tables/:costTableId/items`
```json
{
  "description": "Concrete m³",
  "unit": "m³",
  "unit_price": 500.00
}
```
✅ Should return 201
✅ Verify: `SELECT * FROM cost_items WHERE cost_table_id = '<table_id>'`

### Test S20: Automatic Takeoff
**Insert Element Properties First:**
```sql
INSERT INTO element_properties (
  model_version_id, express_id, global_id, ifc_type, name,
  storey_id, volume_m3, properties
) VALUES (
  '<model_version_id>', 1, 'beam-guid-001', 'IfcBeam', 'Beam-01',
  0, '2.5000', '{"Qto_BeamBaseQuantities": {"GrossVolume": "2.5"}}'
);
```

**Trigger Takeoff:** `POST /api/v1/scenarios/:scenarioId/takeoff`
✅ Should return 200 with TakeoffResult
✅ Verify quantity extraction: `SELECT * FROM element_cost_links WHERE scenario_id = '<scenario_id>'`

### Test S21: SINAPI (Optional, Pre-populated)
**Verify SINAPI items exist:**
```sql
SELECT COUNT(*) FROM sinapi_items WHERE state_code = 'SP' AND DATE_PART('year', reference_month) = 2026;
```
✅ Should return > 0

### Test S22: Cost Calculation
**Insert Manual Link (for testing):**
```sql
DELETE FROM element_cost_links WHERE scenario_id = '<scenario_id>';
INSERT INTO element_cost_links (
  scenario_id, element_global_id, cost_item_id,
  quantity, quantity_unit, created_by
) VALUES (
  '<scenario_id>', 'beam-guid-001', '<item_id>',
  '10.0000', 'm³', '<user_id>'
);
```

**Calculate Cost:** `POST /api/v1/scenarios/:scenarioId/cost-calculation/recalculate`
✅ Should return 200 with cost result
✅ Verify result: `SELECT total_cost FROM cost_calculations WHERE scenario_id = '<scenario_id>'`
✅ Expected: 5000.00 (10 m³ × 500.00)

**Check History:** `GET /api/v1/scenarios/:scenarioId/cost-calculation`
✅ Should return cost_calculation object with breakdown

### Test S23: Cache Performance
**First Call (no cache):**
```bash
time curl -X POST http://staging/api/v1/scenarios/:id/cost-calculation/recalculate
# Measure time
```

**Second Call (cached):**
```bash
time curl -X POST http://staging/api/v1/scenarios/:id/cost-calculation/recalculate
# Should be ~5-10x faster (cache hit)
```

**Clear Cache & Verify TTL:**
```bash
# Wait 301 seconds (5min + 1s)
# Call again — should be slow again (cache expired)
```

### Test S24: Visualization (Browser)
1. Open staging app: `https://staging.arxisvr.com/app`
2. Open a project with cost data
3. **Cost Panel Toggle:**
   - Click "💰 Custos" in the UI
   - Panel should appear (right side, 380px wide)
4. **Heatmap Coloring:**
   - Elements should color green (cheap) → yellow → red (expensive)
   - Normalized per element type (fair comparison)
5. **Element Selection:**
   - Click on an element in the 3D viewer
   - Cost detail should appear in the panel (total_cost, unit_price, quantity)
6. **Breakdown Tabs:**
   - "Resumo": Summary stats + selected element detail
   - "Por Tipo": Breakdown by IFC type (IfcBeam, IfcColumn, etc.)
   - "Por Pavimento": Breakdown by storey/level
   - "Por Categoria": Breakdown by structure/MEP/architecture/other

### Test S26: Billing Integration
**Verify Billing Snapshots:**
```sql
SELECT id, scenario_id, total_cost, billing_status, created_at
FROM billing_cost_snapshots
WHERE scenario_id = '<scenario_id>'
ORDER BY created_at DESC LIMIT 1;
```
✅ Should show: total_cost = 5000.00, billing_status = 'pending'

**Check Snapshot Timing:**
- Snapshot should be created on `calculateScenarioCost` call
- Timestamp should match calculation timestamp

## Performance Benchmarks (Expected)

- **Takeoff (10k elements):** < 30s
- **Cost Calculation (with 1000+ links):** < 5s (first call), < 10ms (cached)
- **Heatmap Load (5k elements):** < 2s
- **API Responses:** < 200ms (99th percentile)

## Rollback Plan

If deployment fails:
1. Revert to previous main branch commit
2. Database: Migrations are idempotent (CREATE TABLE IF NOT EXISTS)
3. Frontend: CDN cache invalidation
4. Verify: Run integration tests again in staging

## Sign-Off Checklist

- [ ] All 4 migrations applied successfully
- [ ] S19 CRUD endpoints working (POST/GET/PATCH/DELETE cost tables)
- [ ] S20 takeoff extracts quantities correctly
- [ ] S22 cost calculation produces correct results
- [ ] S23 cache performance shows 5-10x speedup
- [ ] S24 heatmap renders and colors correctly
- [ ] S26 billing snapshots recorded with correct status
- [ ] No errors in backend logs
- [ ] No errors in browser console (frontend)
- [ ] Database disk usage reasonable (< 100MB for cost tables)
- [ ] All API response times < 500ms (99th percentile)

## Contact & Support

- Backend Issues: Check logs at `backend/dist/` or runtime logs
- Database Issues: Run migrations manually or check _migrations table
- Frontend Issues: Check browser console (F12) for errors
- Integration Tests: Run `npm test -- cost-full-integration.spec.ts` locally before deployment
