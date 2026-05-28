import * as Y from 'yjs';
import { eventBus, EventType } from '../../../core/EventBus';
import {
  ServerEvents,
  type CollaborationHistoryPayload,
  type CollaborationHistoryRequestPayload,
  type CollaborationUpdatedPayload,
  type CollaborationUpdatePayload,
  type CollaborationUpdateRecord,
  type CreateActionPayload,
} from '../../../api/v1/websocket/meetings-socket';

const REMOTE_UPDATE_ORIGIN = 'arxisvr:remote-collaboration-update';

export const ImmersiveCollaborationEvents = {
  SNAPSHOT_CHANGED: 'virtual-meetings:collaboration:snapshot-changed',
  REMOTE_UPDATE_APPLIED: 'virtual-meetings:collaboration:remote-update-applied',
  HISTORY_APPLIED: 'virtual-meetings:collaboration:history-applied',
} as const;

export type CollaborationOrigin = 'selection' | 'annotation' | 'section' | 'presence' | 'snapshot';

export interface CollaborationObjectRef {
  uuid?: string;
  name?: string;
  type?: string;
  expressID?: number;
  modelID?: number;
  ifcType?: string;
}

export interface CollaborationSelection {
  selected: CollaborationObjectRef | null;
  selectedAt: string;
}

export interface CollaborationAnnotation {
  id: string;
  text: string;
  type?: 'comment' | 'issue' | 'measurement' | string;
  color?: string;
  targetElementId?: string;
  position?: { x: number; y: number; z: number };
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationSection {
  id: string;
  name?: string;
  type?: string;
  axis?: 'x' | 'y' | 'z' | 'custom';
  position?: number;
  normal?: { x: number; y: number; z: number };
  constant?: number;
  enabled?: boolean;
  visible?: boolean;
  updatedAt: string;
}

export interface CollaborationSnapshot {
  selection: CollaborationSelection | null;
  annotations: CollaborationAnnotation[];
  sections: CollaborationSection[];
}

export interface CollaborationSocketTransport {
  sendCollaborationUpdate(payload: CollaborationUpdatePayload): void;
  onCollaborationUpdated(callback: (data: CollaborationUpdatedPayload) => void): void;
  onCollaborationHistory?(callback: (data: CollaborationHistoryPayload) => void): void;
  requestCollaborationHistory?(payload?: CollaborationHistoryRequestPayload): void;
  off(event: ServerEvents, callback: (...args: any[]) => void): void;
  createAction?(payload: CreateActionPayload): void;
}

export interface ImmersiveCollaborationOptions {
  bindLocalEvents?: boolean;
  persistMeetingActions?: boolean;
}

interface EventBinding {
  event: EventType | string;
  handler: (data: any) => void;
}

/**
 * CRDT session for immersive meetings.
 *
 * It keeps shared BIM collaboration state in a Yjs document and transports
 * binary updates through the existing meetings Socket.IO channel. Durable audit
 * can still use the existing meeting actions API when enabled.
 */
export class ImmersiveCollaborationSession {
  private readonly doc = new Y.Doc();
  private readonly selection = this.doc.getMap<CollaborationSelection>('selection');
  private readonly annotations = this.doc.getMap<CollaborationAnnotation>('annotations');
  private readonly sections = this.doc.getMap<CollaborationSection>('sections');
  private readonly eventBindings: EventBinding[] = [];

  constructor(
    private readonly transport: CollaborationSocketTransport,
    private readonly options: ImmersiveCollaborationOptions = {}
  ) {
    this.doc.on('update', this.handleDocUpdate);
    this.transport.onCollaborationUpdated(this.handleRemoteUpdate);
    this.transport.onCollaborationHistory?.(this.handleCollaborationHistory);

    if (options.bindLocalEvents) {
      this.bindLocalEvents();
    }
  }

  publishSelection(selection: CollaborationSelection | null): void {
    this.doc.transact(() => {
      if (selection) {
        this.selection.set('current', {
          ...selection,
          selectedAt: selection.selectedAt || new Date().toISOString(),
        });
      } else {
        this.selection.delete('current');
      }
    }, 'selection');
  }

  clearSelection(): void {
    this.publishSelection(null);
  }

  upsertAnnotation(annotation: Omit<CollaborationAnnotation, 'createdAt' | 'updatedAt'> & Partial<Pick<CollaborationAnnotation, 'createdAt' | 'updatedAt'>>): void {
    const now = new Date().toISOString();
    const current = this.annotations.get(annotation.id);
    const next: CollaborationAnnotation = {
      ...annotation,
      createdAt: annotation.createdAt || current?.createdAt || now,
      updatedAt: now,
    };

    this.doc.transact(() => {
      this.annotations.set(next.id, next);
    }, 'annotation');

    this.persistAction('annotation', next, next.targetElementId);
  }

  removeAnnotation(annotationId: string): void {
    this.doc.transact(() => {
      this.annotations.delete(annotationId);
    }, 'annotation');
  }

  upsertSection(section: Omit<CollaborationSection, 'updatedAt'> & Partial<Pick<CollaborationSection, 'updatedAt'>>): void {
    const next: CollaborationSection = {
      ...section,
      updatedAt: new Date().toISOString(),
    };

    this.doc.transact(() => {
      this.sections.set(next.id, next);
    }, 'section');

    this.persistAction('section', next);
  }

  removeSection(sectionId: string): void {
    this.doc.transact(() => {
      this.sections.delete(sectionId);
    }, 'section');
  }

  clearSections(): void {
    this.doc.transact(() => {
      this.sections.clear();
    }, 'section');
  }

  getSnapshot(): CollaborationSnapshot {
    return {
      selection: this.selection.get('current') ?? null,
      annotations: Array.from(this.annotations.values()),
      sections: Array.from(this.sections.values()),
    };
  }

  encodeSnapshot(): number[] {
    return Array.from(Y.encodeStateAsUpdate(this.doc));
  }

  applySnapshot(update: number[] | Uint8Array): void {
    Y.applyUpdate(this.doc, this.decodeUpdate(update), REMOTE_UPDATE_ORIGIN);
  }

  applyHistory(history: CollaborationHistoryPayload): void {
    if (history.snapshot?.ydocUpdate?.length) {
      this.applySnapshot(history.snapshot.ydocUpdate);
    }

    history.updates
      .slice()
      .sort((a, b) => a.version - b.version)
      .forEach((update) => {
        this.applyPersistedUpdate(update);
      });

    eventBus.emit(ImmersiveCollaborationEvents.HISTORY_APPLIED, history);
    eventBus.emit(ImmersiveCollaborationEvents.SNAPSHOT_CHANGED, this.getSnapshot());
  }

  requestHistory(payload: CollaborationHistoryRequestPayload = {}): void {
    this.transport.requestCollaborationHistory?.(payload);
  }

  bindLocalEvents(): void {
    if (this.eventBindings.length > 0) return;

    this.addEventBinding(EventType.SELECTION_CHANGED, ({ selected }: { selected: any }) => {
      this.publishSelection({
        selected: selected ? this.toObjectRef(selected) : null,
        selectedAt: new Date().toISOString(),
      });
    });

    this.addEventBinding(EventType.SECTION_CREATED, (section: any) => {
      this.upsertSection(this.toSection(section));
    });

    this.addEventBinding(EventType.SECTION_UPDATED, (section: any) => {
      this.upsertSection(this.toSection(section));
    });

    this.addEventBinding(EventType.SECTION_REMOVED, (sectionId: string) => {
      this.removeSection(sectionId);
    });

    this.addEventBinding(EventType.SECTIONS_CLEARED, () => {
      this.clearSections();
    });
  }

  unbindLocalEvents(): void {
    this.eventBindings.forEach(({ event, handler }) => {
      eventBus.off(event, handler);
    });
    this.eventBindings.length = 0;
  }

  destroy(): void {
    this.unbindLocalEvents();
    this.doc.off('update', this.handleDocUpdate);
    this.transport.off(ServerEvents.COLLABORATION_UPDATED, this.handleRemoteUpdate);
    this.transport.off(ServerEvents.COLLABORATION_HISTORY, this.handleCollaborationHistory);
    this.doc.destroy();
  }

  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== REMOTE_UPDATE_ORIGIN) {
      this.transport.sendCollaborationUpdate({
        update: Array.from(update),
        origin: typeof origin === 'string' ? origin : 'snapshot',
      });
    }

    eventBus.emit(ImmersiveCollaborationEvents.SNAPSHOT_CHANGED, this.getSnapshot());
  };

  private readonly handleRemoteUpdate = (payload: CollaborationUpdatedPayload) => {
    Y.applyUpdate(this.doc, this.decodeUpdate(payload.update), REMOTE_UPDATE_ORIGIN);
    eventBus.emit(ImmersiveCollaborationEvents.REMOTE_UPDATE_APPLIED, payload);
  };

  private readonly handleCollaborationHistory = (payload: CollaborationHistoryPayload) => {
    this.applyHistory(payload);
  };

  private applyPersistedUpdate(update: CollaborationUpdateRecord): void {
    if (update.ydocUpdate?.length) {
      Y.applyUpdate(this.doc, this.decodeUpdate(update.ydocUpdate), REMOTE_UPDATE_ORIGIN);
    }
  }

  private decodeUpdate(update: number[] | Uint8Array): Uint8Array {
    return update instanceof Uint8Array ? update : Uint8Array.from(update);
  }

  private addEventBinding(event: EventType | string, handler: (data: any) => void): void {
    eventBus.on(event, handler);
    this.eventBindings.push({ event, handler });
  }

  private toObjectRef(object: any): CollaborationObjectRef {
    return {
      uuid: object.uuid,
      name: object.name,
      type: object.type,
      expressID: object.userData?.expressID,
      modelID: object.userData?.modelID,
      ifcType: object.userData?.ifcType || object.userData?.type,
    };
  }

  private toSection(section: any): CollaborationSection {
    const axis = this.sectionAxisFromType(section?.type);
    const constant = typeof section?.plane?.constant === 'number' ? section.plane.constant : undefined;

    return {
      id: section?.id || `section-${Date.now()}`,
      name: section?.name,
      type: section?.type,
      axis,
      position: typeof section?.position === 'number' ? section.position : constant !== undefined ? -constant : undefined,
      normal: section?.plane?.normal
        ? {
            x: section.plane.normal.x,
            y: section.plane.normal.y,
            z: section.plane.normal.z,
          }
        : undefined,
      constant,
      enabled: section?.enabled,
      visible: section?.visible,
      updatedAt: new Date().toISOString(),
    };
  }

  private sectionAxisFromType(type?: string): 'x' | 'y' | 'z' | 'custom' | undefined {
    if (!type) return undefined;
    if (type.includes('x')) return 'x';
    if (type.includes('y')) return 'y';
    if (type.includes('z')) return 'z';
    if (type.includes('custom')) return 'custom';
    return undefined;
  }

  private persistAction(actionType: 'annotation' | 'section', actionData: Record<string, any>, targetElementId?: string): void {
    if (!this.options.persistMeetingActions || !this.transport.createAction) return;

    this.transport.createAction({
      actionType,
      actionData,
      targetElementId,
    });
  }
}

export function createImmersiveCollaborationSession(
  transport: CollaborationSocketTransport,
  options?: ImmersiveCollaborationOptions
): ImmersiveCollaborationSession {
  return new ImmersiveCollaborationSession(transport, options);
}
