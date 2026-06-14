import { describe, it, expect } from 'vitest';
import {
  ScenarioSnapshotService, ScenarioStateError, CURRENT_SCENARIO_STATE_VERSION,
} from '../../src/modules/scenario/scenario-snapshot.service.js';

const svc = new ScenarioSnapshotService();

describe('ScenarioSnapshotService', () => {
  it('capture monta envelope v1 com camera+visibility', () => {
    const s = svc.capture({ position: [1, 2, 3] }, { groups: { mep: false } });
    expect(s.stateVersion).toBe(CURRENT_SCENARIO_STATE_VERSION);
    expect(s.camera).toEqual({ position: [1, 2, 3] });
    expect(s.visibility).toEqual({ groups: { mep: false } });
    // serializável
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('empty é envelope v1 sem estado', () => {
    expect(svc.empty()).toEqual({ stateVersion: 1, camera: null, visibility: null });
  });

  it('validate aceita envelope, rejeita lixo', () => {
    expect(svc.validate(svc.empty())).toBe(true);
    expect(svc.validate({ stateVersion: 1, camera: {}, visibility: {} })).toBe(true);
    expect(svc.validate({ camera: {} })).toBe(false);       // sem stateVersion
    expect(svc.validate(null)).toBe(false);
    expect(svc.validate('x')).toBe(false);
  });

  it('migrate normaliza estado legado sem stateVersion', () => {
    const m = svc.migrate({ camera: { fov: 50 } } as any);
    expect(m.stateVersion).toBe(1);
    expect(m.camera).toEqual({ fov: 50 });
    expect(m.visibility).toBeNull();
  });

  it('migrate é idempotente e preserva chaves futuras', () => {
    const future = { stateVersion: 1, camera: {}, visibility: {}, cost: { total: 9 } };
    expect(svc.migrate(future)).toEqual(future);
  });

  it('migrate rejeita estado de versão futura (mais nova que a suportada)', () => {
    expect(() => svc.migrate({ stateVersion: 99, camera: {}, visibility: {} })).toThrow(ScenarioStateError);
  });

  it('restore migra+valida; lança em estado ausente', () => {
    const r = svc.restore({ camera: { x: 1 } });
    expect(r.stateVersion).toBe(1);
    expect(() => svc.restore(null)).toThrow(ScenarioStateError);
  });

  it('clone é deep copy (clonar cenário parte do estado base)', () => {
    const base = svc.capture({ fov: 50 }, { groups: {} });
    const cloned = svc.clone(base);
    (cloned.camera as any).fov = 90;
    expect((base.camera as any).fov).toBe(50); // original intacto
  });
});
