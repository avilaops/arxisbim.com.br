import { describe, it, expect, beforeEach } from 'vitest';
import { StreamingOrchestratorService } from '../../src/modules/streaming/streaming-orchestrator.service.js';

// Em ambiente de teste não há service-account do Kubernetes, então o eksClient
// roda em MOCK mode e allocateInstance resolve sem chamar a API real.

describe('StreamingOrchestratorService (S33)', () => {
  let svc: StreamingOrchestratorService;

  beforeEach(() => {
    svc = new StreamingOrchestratorService();
  });

  it('aloca uma sessão em estado pending', async () => {
    const session = await svc.allocateInstance('user-1234-abcd', 'proj-1');
    expect(session.status).toBe('pending');
    expect(session.userId).toBe('user-1234-abcd');
    expect(session.id).toMatch(/^stream-/);
  });

  it('previne alocação duplicada de GPU por usuário (dedup)', async () => {
    const a = await svc.allocateInstance('user-dup-0001', 'proj-1');
    const b = await svc.allocateInstance('user-dup-0001', 'proj-2');
    expect(b.id).toBe(a.id); // reusa a sessão ativa existente
    expect(svc.findActiveSessionByUser('user-dup-0001')?.id).toBe(a.id);
  });

  it('recupera sessões ociosas além da janela IDLE_RECLAIM_MS', async () => {
    const session = await svc.allocateInstance('user-idle-0001', 'proj-1');
    // Força updatedAt para o passado, além da janela de reclamação.
    session.updatedAt = new Date(Date.now() - svc.IDLE_RECLAIM_MS - 1000);

    const reclaimed = await svc.reclaimIdleSessions();
    expect(reclaimed).toContain(session.id);
    expect(await svc.getSession(session.id)).toBeNull();
  });

  it('não recupera sessões recentes/ativas', async () => {
    const session = await svc.allocateInstance('user-fresh-0001', 'proj-1');
    const reclaimed = await svc.reclaimIdleSessions();
    expect(reclaimed).not.toContain(session.id);
    expect(await svc.getSession(session.id)).not.toBeNull();
  });

  it('touchSession adia a reclamação por ociosidade', async () => {
    const session = await svc.allocateInstance('user-touch-0001', 'proj-1');
    session.updatedAt = new Date(Date.now() - svc.IDLE_RECLAIM_MS - 1000);
    svc.touchSession(session.id); // marca atividade agora
    const reclaimed = await svc.reclaimIdleSessions();
    expect(reclaimed).not.toContain(session.id);
  });

  it('termina sessão e remove do pool', async () => {
    const session = await svc.allocateInstance('user-term-0001', 'proj-1');
    const ok = await svc.terminateSession(session.id);
    expect(ok).toBe(true);
    expect(await svc.getSession(session.id)).toBeNull();
  });

  it('libera o usuário para nova sessão após terminar a anterior', async () => {
    const a = await svc.allocateInstance('user-cycle-0001', 'proj-1');
    await svc.terminateSession(a.id);
    const b = await svc.allocateInstance('user-cycle-0001', 'proj-2');
    expect(b.id).not.toBe(a.id);
  });
});
