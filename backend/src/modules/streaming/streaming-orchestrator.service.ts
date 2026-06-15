import { eksClient } from '../../core/aws/eks-client.js';

export interface StreamingSession {
  id: string;
  userId: string;
  projectId: string;
  status: 'pending' | 'running' | 'failed' | 'terminated';
  signalingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StreamingOrchestratorService {
  private sessions: Map<string, StreamingSession> = new Map();

  public async allocateInstance(userId: string, projectId: string): Promise<StreamingSession> {
    const sessionId = `stream-${userId.substring(0, 8)}-${Date.now()}`;
    
    const session: StreamingSession = {
      id: sessionId,
      userId,
      projectId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.sessions.set(sessionId, session);

    if (eksClient.isMockMode()) {
      // Simula a alocação de um Pod localmente
      setTimeout(() => {
        const activeSession = this.sessions.get(sessionId);
        if (activeSession && activeSession.status === 'pending') {
          activeSession.status = 'running';
          activeSession.signalingUrl = `ws://localhost:8889/ws`; // URL de sinalização local simulada
          activeSession.updatedAt = new Date();
          console.log(`[StreamingOrchestrator] Session ${sessionId} is now RUNNING (MOCK)`);
        }
      }, 3000); // 3 segundos para simular inicialização
      
      return session;
    }

    try {
      // Define a especificação do Pod Kubernetes com suporte a GPU
      const podSpec = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: sessionId,
          labels: {
            app: 'unreal-pixel-streaming',
            'session-id': sessionId,
            'project-id': projectId,
          },
        },
        spec: {
          restartPolicy: 'Never',
          containers: [
            {
              name: 'unreal-app',
              image: 'avilaops/arxisvr-unreal:latest', // Imagem contendo o executável Unreal
              resources: {
                limits: {
                  'nvidia.com/gpu': '1',
                  cpu: '4',
                  memory: '16Gi',
                },
              },
              ports: [
                { containerPort: 8889, name: 'signaling' },
              ],
              env: [
                { name: 'PROJECT_ID', value: projectId },
                { name: 'SESSION_ID', value: sessionId },
              ],
            },
          ],
        },
      };

      // Dispara a criação do Pod no cluster Kubernetes
      await eksClient.request('POST', '/api/v1/namespaces/default/pods', podSpec);
      
      // Monitora o pod de forma assíncrona até obter o IP de rede interna
      this.monitorPodStatus(sessionId);

      return session;
    } catch (err) {
      console.error(`[StreamingOrchestrator] Failed to allocate pod:`, err);
      session.status = 'failed';
      session.updatedAt = new Date();
      throw new Error('Kubernetes cluster GPU allocation failed');
    }
  }

  private async monitorPodStatus(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let retries = 30;
    while (retries > 0) {
      try {
        const pod = await eksClient.request('GET', `/api/v1/namespaces/default/pods/${sessionId}`);
        const status = pod.status?.phase;

        if (status === 'Running') {
          const podIp = pod.status?.podIP;
          if (podIp) {
            session.status = 'running';
            session.signalingUrl = `ws://${podIp}:8889/ws`;
            session.updatedAt = new Date();
            console.log(`[StreamingOrchestrator] Pod ${sessionId} is active at ${session.signalingUrl}`);
            return;
          }
        } else if (status === 'Failed') {
          session.status = 'failed';
          session.updatedAt = new Date();
          console.error(`[StreamingOrchestrator] Pod ${sessionId} failed to start`);
          return;
        }
      } catch (err) {
        console.error(`[StreamingOrchestrator] Error reading pod status:`, err);
      }

      retries--;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    session.status = 'failed';
    session.updatedAt = new Date();
    console.error(`[StreamingOrchestrator] Pod ${sessionId} allocation timed out`);
  }

  public async getSession(sessionId: string): Promise<StreamingSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  public async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'terminated';
    session.updatedAt = new Date();

    if (eksClient.isMockMode()) {
      this.sessions.delete(sessionId);
      return true;
    }

    try {
      await eksClient.request('DELETE', `/api/v1/namespaces/default/pods/${sessionId}`);
      this.sessions.delete(sessionId);
      return true;
    } catch (err) {
      console.error(`[StreamingOrchestrator] Failed to delete pod ${sessionId}:`, err);
      return false;
    }
  }
}

export const streamingOrchestrator = new StreamingOrchestratorService();
