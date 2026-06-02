/**
 * Clash Detection Service
 *
 * Orchestrates a full scan:
 *  1. Load IFC files from storage
 *  2. Parse AABBs for every element in each model
 *  3. Run pairwise clash engine across all model combinations
 *  4. Persist results to clash_detections table
 *  5. Return summary + persisted IDs
 */

import { randomUUID }    from 'crypto';
import { eq, and, inArray, desc, count } from 'drizzle-orm';
import { db }            from '../../shared/database/db.js';
import { ifcModels }     from '../../shared/database/schema/projects.js';
import { clashDetections } from '../../shared/database/schema/projects.js';
import { storage }       from '../../core/storage/index.js';
import { parseIfcElements } from './ifc-aabb.parser.js';
import { detectClashes }    from './clash-detection.engine.js';
import type { ClashEngineOptions } from './clash-detection.engine.js';

// ─── types ────────────────────────────────────────────────────────────────────

export interface ScanOptions extends ClashEngineOptions {
  /** If set, only scan models with these IDs (must belong to the project) */
  modelIds?: string[];
  /** Disciplines to include. Undefined = all */
  disciplines?: string[];
}

export interface ScanSummary {
  scanRunId: string;
  projectId: string;
  modelsScanned: number;
  elementsParsed: number;
  totalClashes: number;
  byType:     { hard: number; soft: number };
  bySeverity: { critical: number; high: number; medium: number; low: number };
  healthScore: number;
  durationMs: number;
}

// ─── service ──────────────────────────────────────────────────────────────────

export class ClashDetectionService {

  /** Run a full scan for a project and persist results */
  async runScan(
    projectId: string,
    tenantId: string,
    opts: ScanOptions = {},
  ): Promise<ScanSummary> {
    const t0 = Date.now();
    const scanRunId = randomUUID();

    // 1. Fetch IFC model records
    let query = db
      .select()
      .from(ifcModels)
      .where(and(eq(ifcModels.projectId, projectId), eq(ifcModels.tenantId, tenantId)));

    const allModels = await query;
    const models = opts.modelIds?.length
      ? allModels.filter(m => opts.modelIds!.includes(m.id))
      : allModels;

    if (models.length < 2) {
      return {
        scanRunId, projectId,
        modelsScanned: models.length,
        elementsParsed: 0, totalClashes: 0,
        byType: { hard: 0, soft: 0 },
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        healthScore: 100,
        durationMs: Date.now() - t0,
      };
    }

    // 2. Parse elements per model (in parallel)
    const parsed = await Promise.all(
      models.map(async m => {
        try {
          const content = await storage.downloadText(m.fileUrl);
          let elements  = parseIfcElements(content);
          if (opts.disciplines?.length) {
            elements = elements.filter(e => opts.disciplines!.includes(e.discipline));
          }
          return { model: m, elements };
        } catch (err) {
          console.warn(`[clash-scan] could not parse model ${m.id}:`, err);
          return { model: m, elements: [] };
        }
      }),
    );

    const totalElementsParsed = parsed.reduce((s, p) => s + p.elements.length, 0);

    // 3. Pairwise clash detection across models
    const allClashRows: (typeof clashDetections.$inferInsert)[] = [];

    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const { model: m1, elements: e1 } = parsed[i];
        const { model: m2, elements: e2 } = parsed[j];

        if (e1.length === 0 || e2.length === 0) continue;

        const clashes = detectClashes(e1, e2, opts);

        for (const c of clashes) {
          allClashRows.push({
            id: randomUUID(),
            projectId,
            tenantId,
            model1Id: m1.id,
            model2Id: m2.id,
            element1GlobalId: c.element1.globalId,
            element1Type:     c.element1.type,
            element1Name:     c.element1.name,
            element2GlobalId: c.element2.globalId,
            element2Type:     c.element2.type,
            element2Name:     c.element2.name,
            discipline1:      c.element1.discipline,
            discipline2:      c.element2.discipline,
            clashType:        c.clashType,
            severity:         c.severity,
            status:           'open',
            location:         c.location,
            overlap:          c.overlap
              ? { min: [c.overlap.min.x, c.overlap.min.y, c.overlap.min.z] as [number,number,number], max: [c.overlap.max.x, c.overlap.max.y, c.overlap.max.z] as [number,number,number], volume: c.overlap.volume }
              : null,
            description:      c.description,
            scanRunId,
          });
        }
      }
    }

    // 4. Persist (batch insert, up to 10k rows)
    if (allClashRows.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < allClashRows.length; i += BATCH) {
        await db.insert(clashDetections).values(allClashRows.slice(i, i + BATCH));
      }
    }

    // 5. Build summary
    const hard     = allClashRows.filter(r => r.clashType === 'hard').length;
    const soft     = allClashRows.filter(r => r.clashType === 'soft').length;
    const critical = allClashRows.filter(r => r.severity  === 'critical').length;
    const high     = allClashRows.filter(r => r.severity  === 'high').length;
    const medium   = allClashRows.filter(r => r.severity  === 'medium').length;
    const low      = allClashRows.filter(r => r.severity  === 'low').length;

    const healthScore = Math.max(0, 100 - (critical * 25 + high * 10 + medium * 4 + low * 1));

    return {
      scanRunId, projectId,
      modelsScanned: models.length,
      elementsParsed: totalElementsParsed,
      totalClashes: allClashRows.length,
      byType:     { hard, soft },
      bySeverity: { critical, high, medium, low },
      healthScore,
      durationMs: Date.now() - t0,
    };
  }

  /** List clash results for a project */
  async listClashes(
    projectId: string,
    tenantId: string,
    filters: {
      status?: string;
      severity?: string;
      clashType?: string;
      discipline?: string;
      scanRunId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const conditions = [
      eq(clashDetections.projectId, projectId),
      eq(clashDetections.tenantId,  tenantId),
    ];
    if (filters.status)    conditions.push(eq(clashDetections.status,    filters.status));
    if (filters.severity)  conditions.push(eq(clashDetections.severity,  filters.severity));
    if (filters.clashType) conditions.push(eq(clashDetections.clashType, filters.clashType));
    if (filters.scanRunId) conditions.push(eq(clashDetections.scanRunId, filters.scanRunId));

    const rows = await db
      .select()
      .from(clashDetections)
      .where(and(...conditions))
      .orderBy(desc(clashDetections.detectedAt))
      .limit(filters.limit  ?? 200)
      .offset(filters.offset ?? 0);

    return rows;
  }

  /** Update clash status / resolution / assignee */
  async updateClash(
    id: string,
    tenantId: string,
    patch: { status?: string; resolution?: string; assigneeId?: string },
  ) {
    const [updated] = await db
      .update(clashDetections)
      .set({
        ...patch,
        updatedAt:  new Date(),
        resolvedAt: patch.status === 'resolved' ? new Date() : undefined,
      })
      .where(and(eq(clashDetections.id, id), eq(clashDetections.tenantId, tenantId)))
      .returning();
    return updated;
  }

  /** Stats for a project (or a specific scan run) */
  async getStats(projectId: string, tenantId: string, scanRunId?: string) {
    const base = [
      eq(clashDetections.projectId, projectId),
      eq(clashDetections.tenantId,  tenantId),
    ];
    if (scanRunId) base.push(eq(clashDetections.scanRunId, scanRunId));

    const rows = await db
      .select()
      .from(clashDetections)
      .where(and(...base));

    const total    = rows.length;
    const open     = rows.filter(r => r.status === 'open').length;
    const resolved = rows.filter(r => r.status === 'resolved').length;
    const accepted = rows.filter(r => r.status === 'accepted').length;
    const hard     = rows.filter(r => r.clashType === 'hard').length;
    const soft     = rows.filter(r => r.clashType === 'soft').length;
    const critical = rows.filter(r => r.severity  === 'critical').length;
    const high     = rows.filter(r => r.severity  === 'high').length;
    const medium   = rows.filter(r => r.severity  === 'medium').length;
    const low      = rows.filter(r => r.severity  === 'low').length;
    const healthScore = total === 0
      ? 100
      : Math.max(0, 100 - (critical * 25 + high * 10 + medium * 4 + low * 1));

    // By discipline pair
    const disciplinePairs: Record<string, number> = {};
    rows.forEach(r => {
      const key = [r.discipline1, r.discipline2].sort().join(' × ');
      disciplinePairs[key] = (disciplinePairs[key] ?? 0) + 1;
    });

    return {
      total, open, resolved, accepted,
      byType:     { hard, soft },
      bySeverity: { critical, high, medium, low },
      byStatus:   { open, review: rows.filter(r => r.status === 'review').length, resolved, accepted },
      disciplinePairs,
      healthScore,
    };
  }

  /** Delete all clashes for a scan run (to allow re-scan) */
  async deleteScanRun(scanRunId: string, tenantId: string) {
    const deleted = await db
      .delete(clashDetections)
      .where(and(eq(clashDetections.scanRunId, scanRunId), eq(clashDetections.tenantId, tenantId)))
      .returning({ id: clashDetections.id });
    return { deleted: deleted.length };
  }
}

export const clashDetectionService = new ClashDetectionService();
