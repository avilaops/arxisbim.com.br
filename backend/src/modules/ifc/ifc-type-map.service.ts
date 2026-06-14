/**
 * Type map service (S14) — entrega o mapa EFETIVO (default + override do projeto).
 *
 * O viewer/legenda (frontend) e o S10/S20 (consumers) pedem o mapa por projeto;
 * aqui faz o merge. O override vive em projects.project_type_map (JSONB) — mudar
 * a taxonomia é update de dado, sem migração.
 */
import { eq } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { projects } from '../../shared/database/schema/projects.js';
import {
  effectiveTypeMap, resolveTypeInfo, toCategoryResolver,
  type TypeInfo, type ProjectTypeMap, type TypeCategory,
} from './ifc-type-map.js';

export class IfcTypeMapService {
  private async loadOverride(projectId: string, tenantId: string): Promise<ProjectTypeMap | null> {
    const [row] = await db.select({ map: projects.projectTypeMap, version: projects.typeMapVersion })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row?.map) return null;
    // JSONB armazena category como string genérica; o resolver valida/cai em 'other'.
    return { typeMapVersion: row.version ?? 1, map: row.map as ProjectTypeMap['map'] };
  }

  /** Mapa efetivo (default + override) p/ o viewer/legenda. */
  async getEffectiveTypeMap(projectId: string, tenantId: string): Promise<Record<string, TypeInfo>> {
    return effectiveTypeMap(await this.loadOverride(projectId, tenantId));
  }

  /** Resolver tipo→categoria do projeto (consumido pelo VisibilityManager do S10). */
  async getCategoryResolver(projectId: string, tenantId: string): Promise<(ifcType: string) => TypeCategory> {
    return toCategoryResolver(await this.loadOverride(projectId, tenantId));
  }

  /** TypeInfo de um tipo no contexto do projeto. */
  async resolve(projectId: string, tenantId: string, ifcType: string): Promise<TypeInfo> {
    return resolveTypeInfo(ifcType, await this.loadOverride(projectId, tenantId));
  }
}
