import { describe, it, expect, vi } from 'vitest';
import { ScenariosService, type ScenarioRepo, type ScenarioRow } from '../../src/modules/scenario/scenarios-v12.service.js';

function row(over: Partial<ScenarioRow> = {}): ScenarioRow {
  return {
    id: 'sc1', projectId: 'p1', tenantId: 't1', modelVersionId: 'mv1', name: 'A',
    isBaseScenario: false, scenarioState: { stateVersion: 1, camera: null, visibility: null },
    stateVersion: 1, parentId: null, sortOrder: 0, ...over,
  };
}

function fakeRepo(over: Partial<ScenarioRepo> = {}): { repo: ScenarioRepo; inserted: any[] } {
  const inserted: any[] = [];
  const repo: ScenarioRepo = {
    countActiveByProject: vi.fn(async () => 0),
    findBaseByModelVersion: vi.fn(async () => null),
    getById: vi.fn(async () => row()),
    insert: vi.fn(async (d) => { inserted.push(d); return row({ id: `new${inserted.length}`, ...d }); }),
    updateState: vi.fn(async () => {}),
    ...over,
  };
  return { repo, inserted };
}

describe('ScenariosService (S12)', () => {
  it('create: cenário base NÃO conta no limite; emite scenario_created', async () => {
    const { repo } = fakeRepo();
    const checkLimit = vi.fn(async () => {});
    const emit = vi.fn();
    const svc = new ScenariosService({ repo, checkLimit, emit });
    await svc.create({ projectId: 'p1', tenantId: 't1', modelVersionId: 'mv1', name: 'Base', isBaseScenario: true });
    expect(checkLimit).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('scenario_created', expect.objectContaining({ is_base: true }));
  });

  it('create: limite do plano aplicado (Starter máx 2 → 3º lança)', async () => {
    const { repo } = fakeRepo({ countActiveByProject: vi.fn(async () => 2) });
    const checkLimit = vi.fn(async (_t, current) => { if (current >= 2) throw new Error('PLAN_LIMIT_REACHED'); });
    const svc = new ScenariosService({ repo, checkLimit });
    await expect(svc.create({ projectId: 'p1', tenantId: 't1', modelVersionId: 'mv1', name: 'C3' }))
      .rejects.toThrow('PLAN_LIMIT_REACHED');
  });

  it('clone: parte do estado do cenário BASE (não do clonado) + parent_id', async () => {
    const baseState = { stateVersion: 1, camera: { fov: 77 }, visibility: { groups: {} } };
    const { repo, inserted } = fakeRepo({
      getById: vi.fn(async () => row({ id: 'scX', scenarioState: { stateVersion: 1, camera: { fov: 11 }, visibility: null } })),
      findBaseByModelVersion: vi.fn(async () => row({ id: 'base', isBaseScenario: true, scenarioState: baseState })),
    });
    const emit = vi.fn();
    const svc = new ScenariosService({ repo, emit });
    await svc.clone({ scenarioId: 'scX', tenantId: 't1', name: 'B' });
    // estado clonado = do BASE (fov 77), não do scX (fov 11)
    expect(inserted[0].scenarioState.camera).toEqual({ fov: 77 });
    expect(inserted[0].parentId).toBe('scX');
    expect(emit).toHaveBeenCalledWith('scenario_cloned', expect.objectContaining({ base_id: 'base' }));
  });

  it('saveState: captura camera+visibility no envelope e persiste; emite scenario_saved', async () => {
    const { repo } = fakeRepo();
    const emit = vi.fn();
    const svc = new ScenariosService({ repo, emit });
    const s = await svc.saveState({ scenarioId: 'sc1', tenantId: 't1', camera: { position: [1, 2, 3] }, visibility: { floors: [9] } });
    expect(s.stateVersion).toBe(1);
    expect(repo.updateState).toHaveBeenCalledWith('sc1', 't1', expect.objectContaining({ camera: { position: [1, 2, 3] } }), 1);
    expect(emit).toHaveBeenCalledWith('scenario_saved', expect.objectContaining({ scenario_id: 'sc1' }));
  });

  it('loadState: restaura (migra+valida) o estado salvo', async () => {
    const { repo } = fakeRepo({ getById: vi.fn(async () => row({ scenarioState: { camera: { x: 1 } } as any })) });
    const svc = new ScenariosService({ repo });
    const s = await svc.loadState({ scenarioId: 'sc1', tenantId: 't1' });
    expect(s.stateVersion).toBe(1); // migrado de legado sem stateVersion
    expect(s.camera).toEqual({ x: 1 });
  });
});
