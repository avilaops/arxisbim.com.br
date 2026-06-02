# Clash Detection Engine — Architecture

## Overview

The ARXIS Clash Detection Engine finds geometric conflicts between building elements
across multiple IFC discipline models (structural, MEP, architecture) **without** a
native BIM kernel. It runs entirely in Node.js using text-based IFC STEP parsing.

---

## Pipeline

```
IFC files (storage)
        │
        ▼
┌──────────────────────┐
│  ifc-aabb.parser.ts  │  Parse STEP text → per-element AABB (bounding box)
└──────────┬───────────┘
           │  IfcElement[]  per model
           ▼
┌───────────────────────────┐
│  clash-detection.engine   │  Pairwise AABB intersection tests
│                           │  → hard clash | soft clash | clearance
└──────────┬────────────────┘
           │  ClashResult[]
           ▼
┌──────────────────────────────┐
│  clash-detection.service     │  Persist to PostgreSQL (clash_detections)
│                              │  Build summary + health score
└──────────┬───────────────────┘
           │
           ▼
    REST API  /api/v1/clash-detection
```

---

## AABB Extraction Strategy

Because parsing full IFC geometry requires a native kernel (web-ifc, IfcOpenShell),
we use a **static approximation**:

### 1 — Reference map
Build `Map<expressId, rawLine>` from the IFC STEP DATA section.

### 2 — Placement chain resolution
For each element:
```
IFCLOCALPLACEMENT(#parentPlacementRef, #axis2PlacementRef)
  └─ IFCAXIS2PLACEMENT3D(#locationRef, ...)
       └─ IFCCARTESIANPOINT((x, y, z))
```
Walk the chain recursively (max depth 20) to get absolute world-space origin.

### 3 — Half-extents from extrusion
Try to resolve:
```
IFCEXTRUDEDAREASOLID(#profileRef, ..., depth)
  └─ IFCRECTANGLEPROFILEDEF(..., xDim, yDim)   → halfX=xDim/2, halfY=yDim/2
     IFCCIRCLEPROFILEDEF(..., radius)           → halfX=halfY=radius
```
Fall back to **discipline-based defaults** when profile can't be resolved:

| Discipline   | halfX (m) | halfY (m) | halfZ (m) |
|--------------|-----------|-----------|-----------|
| structural   | 0.20      | 0.20      | 3.00      |
| hvac         | 0.15      | 0.15      | 2.00      |
| plumbing     | 0.08      | 0.08      | 2.00      |
| electrical   | 0.06      | 0.06      | 1.50      |
| architecture | 0.20      | 2.80      | 0.20      |
| other        | 0.15      | 0.15      | 1.00      |

### 4 — AABB
```
AABB.min = origin − halfExtents
AABB.max = origin + halfExtents
```

**Accuracy: ±10–20 cm** on typical models. Sufficient to detect hard clashes (full
overlap) and flag soft-clash candidates. False-negative rate increases for heavily
transformed geometry (rotated elements).

---

## Clash Classification

### Hard Clash
Two AABBs intersect: `minA ≤ maxB && maxA ≥ minB` on all three axes.

Reports:
- **overlap volume** (m³): `Δx × Δy × Δz`
- **location**: centroid of the overlap volume

### Soft Clash
AABBs are within a configurable clearance tolerance (default **5 cm**) but not
overlapping. Each AABB is expanded by `tol` before running the hard-clash test.

### Severity Matrix

| Discipline Pair          | Hard      | Soft   |
|--------------------------|-----------|--------|
| structural × MEP         | critical  | high   |
| MEP × MEP                | high      | medium |
| structural × architecture| high      | medium |
| architecture × MEP       | medium    | low    |
| anything else            | medium    | low    |

Volume modifier: overlap > 10 L (0.01 m³) → promote to `high` minimum.

### Health Score
```
score = max(0, 100 − (critical×25 + high×10 + medium×4 + low×1))
```

---

## Database Schema

Table: **`clash_detections`**

| Column             | Type        | Notes                              |
|--------------------|-------------|------------------------------------|
| id                 | UUID PK     |                                    |
| project_id         | UUID FK     | → projects                         |
| tenant_id          | VARCHAR FK  | → tenants (row-level isolation)    |
| federation_id      | UUID FK?    | → federated_models (optional)      |
| model1_id          | UUID FK     | → ifc_models                       |
| model2_id          | UUID FK     | → ifc_models                       |
| element1_global_id | VARCHAR(50) | IFC GlobalId of element 1          |
| element1_type      | VARCHAR     | e.g. IFCBEAM                       |
| element1_name      | VARCHAR     |                                    |
| element2_*         | same        |                                    |
| discipline1/2      | VARCHAR     | structural / hvac / plumbing / ... |
| clash_type         | VARCHAR     | hard / soft / clearance            |
| severity           | VARCHAR     | critical / high / medium / low     |
| status             | VARCHAR     | open / review / resolved / accepted|
| assignee_id        | UUID FK?    | → users                            |
| location           | JSONB       | `{ x, y, z }` world centroid       |
| overlap            | JSONB       | `{ min, max, volume }`             |
| description        | TEXT        | Human-readable summary             |
| resolution         | TEXT        | Resolution note                    |
| scan_run_id        | UUID        | Groups clashes from one scan       |
| detected_at        | TIMESTAMPTZ |                                    |
| resolved_at        | TIMESTAMPTZ |                                    |

---

## API Endpoints

Base path: `/api/v1/clash-detection`

### POST `/project/:projectId/scan`
Trigger a full scan. Reads IFC files from storage, parses AABBs, runs engine,
persists results.

**Body (all optional):**
```json
{
  "modelIds": ["uuid", "..."],
  "disciplines": ["structural", "hvac"],
  "clearanceTolerance": 0.05,
  "skipSameDiscipline": false,
  "maxResults": 10000
}
```

**Response `200`:**
```json
{
  "scanRunId": "uuid",
  "projectId": "uuid",
  "modelsScanned": 3,
  "elementsParsed": 842,
  "totalClashes": 27,
  "byType":     { "hard": 12, "soft": 15 },
  "bySeverity": { "critical": 2, "high": 5, "medium": 12, "low": 8 },
  "healthScore": 67,
  "durationMs": 1240
}
```

---

### GET `/project/:projectId`
List clash results with optional filters.

**Query params:** `status`, `severity`, `clashType`, `scanRunId`, `limit`, `offset`

---

### GET `/project/:projectId/stats`
Aggregate KPIs for a project (or a single `scanRunId`).

**Response `200`:**
```json
{
  "total": 27,
  "open": 15,
  "resolved": 8,
  "accepted": 4,
  "byType":     { "hard": 12, "soft": 15 },
  "bySeverity": { "critical": 2, "high": 5, "medium": 12, "low": 8 },
  "byStatus":   { "open": 15, "review": 4, "resolved": 6, "accepted": 2 },
  "disciplinePairs": { "structural × hvac": 8, "hvac × plumbing": 5 },
  "healthScore": 67
}
```

---

### PATCH `/:id`
Update status, resolution note, or assignee.

```json
{ "status": "resolved", "resolution": "Rota do duto alterada para z+0.4m" }
```

---

### DELETE `/scan-run/:scanRunId`
Delete all results of a scan run, allowing a clean re-scan.

---

## Limitations & Roadmap

| Limitation | Workaround now | Future fix |
|------------|---------------|-----------|
| No rotation support | Elements assumed axis-aligned | OBB (Oriented BB) via matrix decomposition |
| No shared coordinate system validation | Models must share same origin | Coordinate system alignment pre-step |
| Text-based parsing (slow on >50 MB) | Limit to 500 k chars sample | web-ifc integration for full fidelity |
| No duplicate-scan dedup | Use `deleteScanRun` before re-scan | Idempotent scan via content hash |
| No real-time progress | Poll `/stats` | WebSocket progress events |
