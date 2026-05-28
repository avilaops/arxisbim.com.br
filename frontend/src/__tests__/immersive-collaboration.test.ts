import { describe, expect, it } from 'vitest';
import {
  ImmersiveCollaborationSession,
  type CollaborationSocketTransport,
} from '../features/virtual-meetings/collaboration';
import {
  ServerEvents,
  type CollaborationHistoryPayload,
  type CollaborationHistoryRequestPayload,
  type CollaborationUpdatedPayload,
  type CollaborationUpdatePayload,
  type CreateActionPayload,
} from '../api/v1/websocket/meetings-socket';

class FakeCollaborationTransport implements CollaborationSocketTransport {
  peer?: FakeCollaborationTransport;
  sentUpdates: CollaborationUpdatePayload[] = [];
  historyRequests: CollaborationHistoryRequestPayload[] = [];
  persistedActions: CreateActionPayload[] = [];
  private readonly handlers = new Set<(data: CollaborationUpdatedPayload) => void>();
  private readonly historyHandlers = new Set<(data: CollaborationHistoryPayload) => void>();

  sendCollaborationUpdate(payload: CollaborationUpdatePayload): void {
    this.sentUpdates.push(payload);
    this.peer?.emitRemoteUpdate({
      fromUserId: 'user-a',
      fromParticipantId: 'participant-a',
      update: payload.update,
      origin: payload.origin,
      version: 1,
      isSnapshot: payload.isSnapshot || false,
      timestamp: new Date().toISOString(),
    });
  }

  onCollaborationUpdated(callback: (data: CollaborationUpdatedPayload) => void): void {
    this.handlers.add(callback);
  }

  onCollaborationHistory(callback: (data: CollaborationHistoryPayload) => void): void {
    this.historyHandlers.add(callback);
  }

  requestCollaborationHistory(payload: CollaborationHistoryRequestPayload = {}): void {
    this.historyRequests.push(payload);
  }

  off(event: ServerEvents, callback: (...args: any[]) => void): void {
    if (event === ServerEvents.COLLABORATION_UPDATED) {
      this.handlers.delete(callback as (data: CollaborationUpdatedPayload) => void);
    }

    if (event === ServerEvents.COLLABORATION_HISTORY) {
      this.historyHandlers.delete(callback as (data: CollaborationHistoryPayload) => void);
    }
  }

  createAction(payload: CreateActionPayload): void {
    this.persistedActions.push(payload);
  }

  emitRemoteUpdate(payload: CollaborationUpdatedPayload): void {
    this.handlers.forEach((handler) => handler(payload));
  }

  emitHistory(payload: CollaborationHistoryPayload): void {
    this.historyHandlers.forEach((handler) => handler(payload));
  }
}

describe('ImmersiveCollaborationSession', () => {
  it('syncs selection CRDT updates between meeting participants', () => {
    const transportA = new FakeCollaborationTransport();
    const transportB = new FakeCollaborationTransport();
    transportA.peer = transportB;

    const sessionA = new ImmersiveCollaborationSession(transportA);
    const sessionB = new ImmersiveCollaborationSession(transportB);

    sessionA.publishSelection({
      selected: {
        uuid: 'mesh-1',
        expressID: 42,
        ifcType: 'IfcWall',
      },
      selectedAt: '2026-05-11T10:00:00.000Z',
    });

    expect(transportA.sentUpdates).toHaveLength(1);
    expect(sessionB.getSnapshot().selection?.selected?.expressID).toBe(42);
    expect(sessionB.getSnapshot().selection?.selected?.ifcType).toBe('IfcWall');

    sessionA.destroy();
    sessionB.destroy();
  });

  it('stores annotations in the shared Yjs document', () => {
    const transport = new FakeCollaborationTransport();
    const session = new ImmersiveCollaborationSession(transport, {
      persistMeetingActions: true,
    });

    session.upsertAnnotation({
      id: 'annotation-1',
      text: 'Verificar interferência com viga',
      type: 'issue',
      targetElementId: 'ifc-42',
      position: { x: 1, y: 2, z: 3 },
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.annotations).toHaveLength(1);
    expect(snapshot.annotations[0].text).toBe('Verificar interferência com viga');
    expect(transport.persistedActions).toEqual([
      expect.objectContaining({
        actionType: 'annotation',
        targetElementId: 'ifc-42',
      }),
    ]);

    session.destroy();
  });

  it('exports and applies full snapshots for late joiners', () => {
    const sessionA = new ImmersiveCollaborationSession(new FakeCollaborationTransport());
    const sessionB = new ImmersiveCollaborationSession(new FakeCollaborationTransport());

    sessionA.upsertSection({
      id: 'section-x',
      axis: 'x',
      position: 12,
      enabled: true,
    });

    sessionB.applySnapshot(sessionA.encodeSnapshot());

    expect(sessionB.getSnapshot().sections).toEqual([
      expect.objectContaining({
        id: 'section-x',
        axis: 'x',
        position: 12,
        enabled: true,
      }),
    ]);

    sessionA.destroy();
    sessionB.destroy();
  });

  it('applies persisted collaboration history from backend', () => {
    const transportA = new FakeCollaborationTransport();
    const transportB = new FakeCollaborationTransport();
    const sessionA = new ImmersiveCollaborationSession(transportA);
    const sessionB = new ImmersiveCollaborationSession(transportB);

    sessionA.upsertAnnotation({
      id: 'backend-history-annotation',
      text: 'Sincronizado via histórico persistido',
      type: 'comment',
    });

    transportB.emitHistory({
      roomId: 'room-1',
      snapshot: null,
      updates: [
        {
          id: 'update-1',
          roomId: 'room-1',
          userId: 'user-a',
          participantId: 'participant-a',
          origin: 'annotation',
          ydocUpdate: transportA.sentUpdates[0].update,
          version: 1,
          isSnapshot: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(sessionB.getSnapshot().annotations).toEqual([
      expect.objectContaining({
        id: 'backend-history-annotation',
        text: 'Sincronizado via histórico persistido',
      }),
    ]);

    sessionA.destroy();
    sessionB.destroy();
  });

  it('requests collaboration history for reconnect recovery', () => {
    const transport = new FakeCollaborationTransport();
    const session = new ImmersiveCollaborationSession(transport);

    session.requestHistory({ afterVersion: 7, limit: 50 });

    expect(transport.historyRequests).toEqual([{ afterVersion: 7, limit: 50 }]);

    session.destroy();
  });
});
