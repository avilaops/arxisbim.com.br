/**
 * ScenarioSnapshotService (S12) — captura/restaura/valida/migra o `scenario_state`.
 *
 * O banco enxerga `scenario_state` como JSONB OPACO + `state_version`. Esta é a
 * única abstração que entende o formato — o viewer NUNCA persiste direto, e
 * S18/S24/S28/S30 reusam capture/restore. Migrar `state_version` aqui permite
 * o formato crescer (custo, cronograma, comparação) sem migration de schema.
 *
 * `camera`/`visibility` são tratados como blobs opacos (DTOs do S09/S10 vivem no
 * frontend); o backend valida só o ENVELOPE e versiona.
 */

export const CURRENT_SCENARIO_STATE_VERSION = 1 as const;

/** Envelope serializável do estado do cenário (cresce sem migration). */
export interface ScenarioState {
  stateVersion: number;
  camera: Record<string, unknown> | null;
  visibility: Record<string, unknown> | null;
  // chaves futuras (state_version > 1): comparison, cost, schedule, presentation
  [k: string]: unknown;
}

export class ScenarioStateError extends Error {
  constructor(message: string) { super(message); this.name = 'ScenarioStateError'; }
}

export class ScenarioSnapshotService {
  /** Monta o envelope a partir do que o viewer capturou (camera + visibility). */
  capture(camera: Record<string, unknown> | null, visibility: Record<string, unknown> | null): ScenarioState {
    return { stateVersion: CURRENT_SCENARIO_STATE_VERSION, camera: camera ?? null, visibility: visibility ?? null };
  }

  /** Envelope vazio (cenário base recém-criado, sem ajuste ainda). */
  empty(): ScenarioState {
    return { stateVersion: CURRENT_SCENARIO_STATE_VERSION, camera: null, visibility: null };
  }

  /** Valida o envelope (não o conteúdo opaco de camera/visibility). */
  validate(state: unknown): state is ScenarioState {
    if (!state || typeof state !== 'object') return false;
    const s = state as Record<string, unknown>;
    return typeof s.stateVersion === 'number' && 'camera' in s && 'visibility' in s;
  }

  /**
   * Migra um estado antigo para o formato atual. Idempotente. Hoje só há v1;
   * a estrutura já suporta upgrades futuros (v1→v2 adiciona chaves, preserva).
   */
  migrate(state: Record<string, unknown>): ScenarioState {
    const s: Record<string, unknown> = { ...state };

    // Estado legado sem stateVersion → assume envelope v1.
    if (typeof s.stateVersion !== 'number') s.stateVersion = 1;

    // (placeholder de migrações futuras)
    // while (s.stateVersion < CURRENT_SCENARIO_STATE_VERSION) { ...; s.stateVersion++ }

    if ((s.stateVersion as number) > CURRENT_SCENARIO_STATE_VERSION) {
      throw new ScenarioStateError(
        `scenario_state v${s.stateVersion} é mais novo que o suportado (v${CURRENT_SCENARIO_STATE_VERSION})`,
      );
    }
    if (!('camera' in s)) s.camera = null;
    if (!('visibility' in s)) s.visibility = null;
    return s as ScenarioState;
  }

  /** Migra + valida e devolve o estado pronto p/ o viewer restaurar. */
  restore(state: unknown): ScenarioState {
    if (!state || typeof state !== 'object') throw new ScenarioStateError('scenario_state ausente ou inválido');
    const migrated = this.migrate(state as Record<string, unknown>);
    if (!this.validate(migrated)) throw new ScenarioStateError('scenario_state inválido após migração');
    return migrated;
  }

  /** Clona um estado (deep copy) — base de "clonar cenário" (parte do estado base). */
  clone(state: ScenarioState): ScenarioState {
    return JSON.parse(JSON.stringify(state));
  }
}
