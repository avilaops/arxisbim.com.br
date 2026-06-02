/**
 * Clash Detection Engine
 *
 * Given two arrays of IfcElements (from different IFC models), finds:
 *  - Hard clashes  : AABBs actually intersect
 *  - Soft clashes  : AABBs are within a clearance tolerance but not overlapping
 *
 * All coordinates are in model-space metres (same coordinate system assumed —
 * if models need transformation, apply it before calling this engine).
 */

import type { AABB, IfcElement, Vec3 } from './ifc-aabb.parser.js';

export type ClashType = 'hard' | 'soft';
export type Severity  = 'critical' | 'high' | 'medium' | 'low';

export interface ClashResult {
  element1: IfcElement;
  element2: IfcElement;
  clashType: ClashType;
  severity: Severity;
  /** World-space point of maximum penetration / closest approach */
  location: Vec3;
  /** For hard clashes: the overlapping sub-volume */
  overlap?: { min: Vec3; max: Vec3; volume: number };
  description: string;
}

// ─── AABB tests ──────────────────────────────────────────────────────────────

function intersects(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

function withinClearance(a: AABB, b: AABB, tol: number): boolean {
  const expand = (box: AABB): AABB => ({
    min: { x: box.min.x - tol, y: box.min.y - tol, z: box.min.z - tol },
    max: { x: box.max.x + tol, y: box.max.y + tol, z: box.max.z + tol },
  });
  return intersects(expand(a), expand(b));
}

function overlapVolume(a: AABB, b: AABB): { min: Vec3; max: Vec3; volume: number } | null {
  const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
  if (ox <= 0 || oy <= 0 || oz <= 0) return null;
  return {
    min: { x: Math.max(a.min.x, b.min.x), y: Math.max(a.min.y, b.min.y), z: Math.max(a.min.z, b.min.z) },
    max: { x: Math.min(a.max.x, b.max.x), y: Math.min(a.max.y, b.max.y), z: Math.min(a.max.z, b.max.z) },
    volume: ox * oy * oz,
  };
}

function centroid(aabb: AABB): Vec3 {
  return {
    x: (aabb.min.x + aabb.max.x) / 2,
    y: (aabb.min.y + aabb.max.y) / 2,
    z: (aabb.min.z + aabb.max.z) / 2,
  };
}

// ─── severity scoring ─────────────────────────────────────────────────────────

/**
 * Severity rules (by discipline pair + clash type):
 *
 *  structural × MEP hard   → critical
 *  structural × MEP soft   → high
 *  MEP × MEP   hard        → high
 *  MEP × MEP   soft        → medium
 *  structural × arch hard  → high
 *  anything    soft        → low unless structural involved
 */
function computeSeverity(
  d1: string, d2: string,
  clashType: ClashType,
  overlapVol?: number,
): Severity {
  const isMEP = (d: string) => ['hvac', 'plumbing', 'electrical'].includes(d);
  const isStr = (d: string) => d === 'structural';

  if (clashType === 'hard') {
    if ((isStr(d1) && isMEP(d2)) || (isStr(d2) && isMEP(d1))) return 'critical';
    if (isMEP(d1) && isMEP(d2)) return 'high';
    if (isStr(d1) || isStr(d2)) return 'high';
    if (overlapVol && overlapVol > 0.01) return 'high'; // >10L overlap
    return 'medium';
  }

  // soft
  if ((isStr(d1) && isMEP(d2)) || (isStr(d2) && isMEP(d1))) return 'high';
  if (isMEP(d1) && isMEP(d2)) return 'medium';
  return 'low';
}

function describeClash(e1: IfcElement, e2: IfcElement, type: ClashType, overlap?: number): string {
  const vol = overlap ? ` (volume: ${(overlap * 1000).toFixed(1)} L)` : '';
  if (type === 'hard') {
    return `Hard clash: ${e1.type} "${e1.name}" [${e1.discipline}] intersects ${e2.type} "${e2.name}" [${e2.discipline}]${vol}`;
  }
  return `Soft clash: ${e1.type} "${e1.name}" [${e1.discipline}] is within clearance of ${e2.type} "${e2.name}" [${e2.discipline}]`;
}

// ─── main engine ─────────────────────────────────────────────────────────────

export interface ClashEngineOptions {
  /** Soft-clash clearance in metres (default 0.05 = 5 cm) */
  clearanceTolerance?: number;
  /** Skip clashes between elements of the same discipline (default false) */
  skipSameDiscipline?: boolean;
  /** Max clashes to return (default 10 000) */
  maxResults?: number;
}

export function detectClashes(
  elementsA: IfcElement[],
  elementsB: IfcElement[],
  opts: ClashEngineOptions = {},
): ClashResult[] {
  const tol        = opts.clearanceTolerance  ?? 0.05;
  const skipSame   = opts.skipSameDiscipline  ?? false;
  const maxResults = opts.maxResults          ?? 10_000;

  const results: ClashResult[] = [];

  for (const a of elementsA) {
    for (const b of elementsB) {
      if (results.length >= maxResults) break;
      if (skipSame && a.discipline === b.discipline) continue;

      if (intersects(a.aabb, b.aabb)) {
        const ov  = overlapVolume(a.aabb, b.aabb);
        const sev = computeSeverity(a.discipline, b.discipline, 'hard', ov?.volume);
        results.push({
          element1: a,
          element2: b,
          clashType: 'hard',
          severity: sev,
          location: ov
            ? centroid({ min: ov.min, max: ov.max })
            : centroid(a.aabb),
          overlap: ov ?? undefined,
          description: describeClash(a, b, 'hard', ov?.volume),
        });
      } else if (withinClearance(a.aabb, b.aabb, tol)) {
        const sev = computeSeverity(a.discipline, b.discipline, 'soft');
        results.push({
          element1: a,
          element2: b,
          clashType: 'soft',
          severity: sev,
          location: centroid(a.aabb),
          description: describeClash(a, b, 'soft'),
        });
      }
    }
    if (results.length >= maxResults) break;
  }

  // Sort: critical first, then hard before soft
  results.sort((a, b) => {
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sd = sevOrder[a.severity] - sevOrder[b.severity];
    if (sd !== 0) return sd;
    return a.clashType === 'hard' ? -1 : 1;
  });

  return results;
}
