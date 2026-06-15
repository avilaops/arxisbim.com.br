import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamingOrchestratorService } from '../../src/modules/streaming/streaming-orchestrator.service.js';
import { eksClient } from '../../src/core/aws/eks-client.js';

describe('StreamingOrchestratorService', () => {
  let service: StreamingOrchestratorService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new StreamingOrchestratorService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should allocate a session in mock mode and transition to running', async () => {
    // Force mock mode
    vi.spyOn(eksClient, 'isMockMode').mockReturnValue(true);

    const session = await service.allocateInstance('user-12345678', 'project-abc');
    expect(session.status).toBe('pending');
    expect(session.userId).toBe('user-12345678');
    expect(session.projectId).toBe('project-abc');

    // Run the timer to simulate allocation completion
    vi.advanceTimersByTime(3000);

    const activeSession = await service.getSession(session.id);
    expect(activeSession).toBeDefined();
    expect(activeSession?.status).toBe('running');
    expect(activeSession?.signalingUrl).toBe('ws://localhost:8889/ws');
  });

  it('should terminate an active mock session', async () => {
    vi.spyOn(eksClient, 'isMockMode').mockReturnValue(true);

    const session = await service.allocateInstance('user-12345678', 'project-abc');
    const success = await service.terminateSession(session.id);

    expect(success).toBe(true);
    const terminated = await service.getSession(session.id);
    expect(terminated).toBeNull();
  });

  it('should allocate pod spec and query pod status when inside Kubernetes', async () => {
    // Force k8s mode (isMockMode = false)
    vi.spyOn(eksClient, 'isMockMode').mockReturnValue(false);
    
    const requestSpy = vi.spyOn(eksClient, 'request').mockImplementation(async (method, path, body) => {
      if (method === 'POST' && path === '/api/v1/namespaces/default/pods') {
        return { metadata: { name: body.metadata.name } };
      }
      if (method === 'GET' && path.startsWith('/api/v1/namespaces/default/pods/')) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              status: {
                phase: 'Running',
                podIP: '10.244.1.45',
              },
            });
          }, 50);
        });
      }
      return {};
    });

    const session = await service.allocateInstance('user-55555555', 'project-xyz');
    expect(session.status).toBe('pending');

    // Wait for the async pod status polling to make a request and succeed
    await vi.runOnlyPendingTimersAsync();

    expect(requestSpy).toHaveBeenCalledWith('POST', '/api/v1/namespaces/default/pods', expect.any(Object));
    expect(requestSpy).toHaveBeenCalledWith('GET', `/api/v1/namespaces/default/pods/${session.id}`);

    const activeSession = await service.getSession(session.id);
    expect(activeSession?.status).toBe('running');
    expect(activeSession?.signalingUrl).toBe('ws://10.244.1.45:8889/ws');
  });

  it('should transition to failed status when Kubernetes pod allocation fails', async () => {
    vi.spyOn(eksClient, 'isMockMode').mockReturnValue(false);
    
    vi.spyOn(eksClient, 'request').mockRejectedValue(new Error('Kubernetes connection refused'));

    await expect(service.allocateInstance('user-55555555', 'project-xyz')).rejects.toThrow(
      'Kubernetes cluster GPU allocation failed'
    );
  });
});
