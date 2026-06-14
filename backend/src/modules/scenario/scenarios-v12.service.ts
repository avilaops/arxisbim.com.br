/**
 * ScenariosService (S12) — create / clone / saveState do Scenario central.
 *
 * O Scenario referencia ModelVersion (não Project direto) — simplifica comparação
 * (S18) e branching (S29). Estado vai em `scenario_state` (envelope do
 * ScenarioSnapshotService). Repo/limite/telemetria são INJETADOS → testável sem DB.
 */
import { ScenarioSnapshotService, type ScenarioState } from './scenario-snapshot.service.js';

export interface ScenarioRow {
  id: string;
  projectId: string;
  tenantId: string;
  modelVersionId: string | null;
  name: string;
  isBaseScenario: boolean;
  scenarioState: Record<string, unknown>;
  stateVersion: number;
  parentId: string | null;
  sortOrder: number;
}

export interface NewScenario {
  projectId: string;
  tenantId: string;
  modelVersionId: string;
  name: string;
  createdBy?: string;
  isBaseScenario?: boolean;
  parentId?: string | null;
  scenarioState: Record<string, unknown>;
  stateVersion: number;
  sortOrder?: number;
}

export interface ScenarioRepo {
  countActiveByProject(projectId: string, tenantId: string): Promise<number>;
  findBaseByModelVersion(modelVersionId: string, tenantId: string): Promise<ScenarioRow | null>;
  getById(id: string, tenantId: string): Promise<ScenarioRow | null>;
  insert(data: NewScenario): Promise<ScenarioRow>;
  updateState(id: string, tenantId: string, scenarioState: Record<string, unknown>, stateVersion: number): Promise<void>;
}

/** Lança se o limite do plano for excedido (ex.: Starter: 2). Do S04. */
export type ScenarioLimitChecker = (tenantId: string, currentCount: number) => Promise<void>;

/** Telemetria de produto (scenario_created/cloned/saved/switched). */
export type ScenarioEmit = (event: string, props: Record<string, unknown>) => void;

export interface ScenariosServiceDeps {
  repo: ScenarioRepo;
  checkLimit?: ScenarioLimitChecker;
  emit?: ScenarioEmit;
  snapshot?: ScenarioSnapshotService;
}

export class ScenariosService {
  private repo: ScenarioRepo;
  private checkLimit?: ScenarioLimitChecker;
  private emit: ScenarioEmit;
  private snapshot: ScenarioSnapshotService;

  constructor(deps: ScenariosServiceDeps) {
    this.repo = deps.repo;
    this.checkLimit = deps.checkLimit;
    this.emit = deps.emit ?? (() => {});
    this.snapshot = deps.snapshot ?? new ScenarioSnapshotService();
  }

  /**
   * Cria um cenário. O cenário base (is_base) não conta no limite (sempre há um
   * ponto de referência). Demais cenários passam pelo checkLimit do plano.
   */
  async create(input: {
    projectId: string; tenantId: string; modelVersionId: string;
    name: string; createdBy?: string; isBaseScenario?: boolean;
  }): Promise<ScenarioRow> {
    const isBase = input.isBaseScenario ?? false;
    if (!isBase && this.checkLimit) {
      const current = await this.repo.countActiveByProject(input.projectId, input.tenantId);
      await this.checkLimit(input.tenantId, current); // lança se exceder
    }
    const state = this.snapshot.empty();
    const row = await this.repo.insert({
      projectId: input.projectId, tenantId: input.tenantId, modelVersionId: input.modelVersionId,
      name: input.name, createdBy: input.createdBy, isBaseScenario: isBase,
      scenarioState: state as Record<string, unknown>, stateVersion: state.stateVersion,
    });
    this.emit('scenario_created', { tenant_id: input.tenantId, project_id: input.projectId, scenario_id: row.id, is_base: isBase });
    return row;
  }

  /**
   * Clona partindo do estado do cenário BASE do mesmo modelo (spec: do base, não
   * do último). Conta no limite do plano. `parent_id` aponta p/ o cenário clonado.
   */
  async clone(input: { scenarioId: string; tenantId: string; name: string; createdBy?: string }): Promise<ScenarioRow> {
    const source = await this.repo.getById(input.scenarioId, input.tenantId);
    if (!source) throw new Error('Scenario not found');
    if (!source.modelVersionId) throw new Error('Scenario has no model version');

    const base = await this.repo.findBaseByModelVersion(source.modelVersionId, input.tenantId);
    const baseState: ScenarioState = base
      ? this.snapshot.restore(base.scenarioState)
      : this.snapshot.empty();

    if (this.checkLimit) {
      const current = await this.repo.countActiveByProject(source.projectId, input.tenantId);
      await this.checkLimit(input.tenantId, current);
    }

    const cloned = this.snapshot.clone(baseState);
    const row = await this.repo.insert({
      projectId: source.projectId, tenantId: input.tenantId, modelVersionId: source.modelVersionId,
      name: input.name, createdBy: input.createdBy, isBaseScenario: false,
      parentId: input.scenarioId,
      scenarioState: cloned as Record<string, unknown>, stateVersion: cloned.stateVersion,
    });
    this.emit('scenario_cloned', { tenant_id: input.tenantId, project_id: source.projectId, scenario_id: row.id, cloned_from: input.scenarioId, base_id: base?.id ?? null });
    return row;
  }

  /** Salva o estado capturado pelo viewer (camera + visibility). */
  async saveState(input: {
    scenarioId: string; tenantId: string;
    camera: Record<string, unknown> | null; visibility: Record<string, unknown> | null;
  }): Promise<ScenarioState> {
    const state = this.snapshot.capture(input.camera, input.visibility);
    await this.repo.updateState(input.scenarioId, input.tenantId, state as Record<string, unknown>, state.stateVersion);
    this.emit('scenario_saved', { tenant_id: input.tenantId, scenario_id: input.scenarioId, state_version: state.stateVersion });
    return state;
  }

  /** Restaura o estado p/ o viewer (migra+valida). Emite scenario_loaded. */
  async loadState(input: { scenarioId: string; tenantId: string }): Promise<ScenarioState> {
    const row = await this.repo.getById(input.scenarioId, input.tenantId);
    if (!row) throw new Error('Scenario not found');
    const state = this.snapshot.restore(row.scenarioState);
    this.emit('scenario_loaded', { tenant_id: input.tenantId, scenario_id: input.scenarioId });
    return state;
  }
}
