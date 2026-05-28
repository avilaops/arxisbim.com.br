import { eventBus } from '../core';
import { NetworkEventType, PlayerData } from '../network/events/NetworkEvents';
import { networkManager } from '../network';

export type CollaborationEvent =
  | 'presence'
  | 'chat'
  | 'cursor'
  | 'measurements'
  | 'measurements_cleared';

export type MeasurementType = 'distance' | 'area' | 'volume' | 'angle';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  status: PresenceStatus;
  avatar?: string;
  isLocal?: boolean;
  lastActive: number;
  currentView?: string;
}

export interface CollaborationChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface CursorUpdate {
  userId: string;
  userName: string;
  color: string;
  screenX: number;
  screenY: number;
  normalizedX?: number;
  normalizedY?: number;
  worldPosition?: { x: number; y: number; z: number };
  timestamp: number;
}

export interface SharedMeasurement {
  id: string;
  authorId: string;
  authorName: string;
  points: Array<{ x: number; y: number; z: number }>;
  distance: number;
  unit: string;
  label?: string;
  timestamp: number;
  measurementType: MeasurementType;
}

interface CollaborationBroadcast {
  channel?: string;
  action: string;
  payload: any;
}

type Listener<T> = (payload: T) => void;

const COLOR_PALETTE = [
  '#00d4ff',
  '#7b2ff7',
  '#ffaa00',
  '#ff4d6d',
  '#4caf50',
  '#ff7ee2',
  '#00b894',
  '#0984e3',
  '#fdcb6e',
  '#636e72'
];

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

export class CollaborationManager {
  private static instance: CollaborationManager;

  private listeners: Map<CollaborationEvent, Set<Listener<any>>> = new Map();
  private users: Map<string, CollaborationUser> = new Map();
  private chatMessages: CollaborationChatMessage[] = [];
  private cursors: Map<string, CursorUpdate> = new Map();
  private measurements: SharedMeasurement[] = [];

  private localUserId: string | null = null;
  private colorIndex = 0;

  private constructor() {
    this.registerEventListeners();
  }

  public static getInstance(): CollaborationManager {
    if (!CollaborationManager.instance) {
      CollaborationManager.instance = new CollaborationManager();
    }
    return CollaborationManager.instance;
  }

  public on<T extends CollaborationEvent>(event: T, callback: Listener<any>): () => void {
    let listeners = this.listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }
    listeners.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  public off<T extends CollaborationEvent>(event: T, callback: Listener<any>): void {
    const listeners = this.listeners.get(event);
    listeners?.delete(callback);
    if (listeners && listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  public getUsers(): CollaborationUser[] {
    return Array.from(this.users.values());
  }

  public getLocalUser(): CollaborationUser | undefined {
    if (!this.localUserId) return undefined;
    return this.users.get(this.localUserId);
  }

  public getChatMessages(): CollaborationChatMessage[] {
    return [...this.chatMessages];
  }

  public getCursorStates(): CursorUpdate[] {
    return Array.from(this.cursors.values());
  }

  public getMeasurements(): SharedMeasurement[] {
    return [...this.measurements];
  }

  public sendChatMessage(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) return;

    const user = this.getLocalUser();
    if (!user) {
      console.warn('CollaborationManager: No local user to send chat message');
      return;
    }

    const chatMessage: CollaborationChatMessage = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      message: trimmed,
      timestamp: Date.now(),
      type: 'text'
    };

    this.chatMessages.push(chatMessage);
    this.emit('chat', chatMessage);

    networkManager.broadcastCollaboration('chat_message', chatMessage);
  }

  public addSystemMessage(message: string): void {
    const chatMessage: CollaborationChatMessage = {
      id: generateId(),
      userId: 'system',
      userName: 'Sistema',
      message,
      timestamp: Date.now(),
      type: 'system'
    };

    this.chatMessages.push(chatMessage);
    this.emit('chat', chatMessage);
  }

  public sendCursorUpdate(update: Omit<CursorUpdate, 'userId' | 'userName' | 'color' | 'timestamp'>): void {
    const user = this.getLocalUser();
    if (!user) {
      return;
    }

    const payload: CursorUpdate = {
      userId: user.id,
      userName: user.name,
      color: user.color,
      screenX: update.screenX,
      screenY: update.screenY,
      normalizedX: update.normalizedX,
      normalizedY: update.normalizedY,
      worldPosition: update.worldPosition,
      timestamp: Date.now()
    };

    this.cursors.set(user.id, payload);
    this.emit('cursor', payload);

    networkManager.broadcastCollaboration('cursor_update', payload);
  }

  public publishMeasurement(measurement: {
    points: Array<{ x: number; y: number; z: number }>;
    distance: number;
    unit?: string;
    label?: string;
    measurementType?: MeasurementType;
  }): SharedMeasurement | null {
    const user = this.getLocalUser();
    if (!user) {
      console.warn('CollaborationManager: Cannot publish measurement without local user');
      return null;
    }

    const sharedMeasurement: SharedMeasurement = {
      id: generateId(),
      authorId: user.id,
      authorName: user.name,
      points: measurement.points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      distance: measurement.distance,
      unit: measurement.unit ?? 'm',
      label: measurement.label,
      timestamp: Date.now(),
      measurementType: measurement.measurementType ?? 'distance'
    };

    this.measurements.push(sharedMeasurement);
    this.emit('measurements', [...this.measurements]);

    networkManager.broadcastCollaboration('measurement_added', sharedMeasurement);

    return sharedMeasurement;
  }

  public clearMeasurements(fromUser?: boolean): void {
    this.measurements = [];
    this.emit('measurements_cleared', undefined);
    this.emit('measurements', []);

    if (fromUser) {
      networkManager.broadcastCollaboration('measurements_cleared', {});
    }
  }

  public removeMeasurement(id: string, broadcast: boolean = true): void {
    const before = this.measurements.length;
    this.measurements = this.measurements.filter((measurement) => measurement.id !== id);

    if (this.measurements.length !== before) {
      this.emit('measurements', [...this.measurements]);

      if (broadcast) {
        networkManager.broadcastCollaboration('measurement_removed', { id });
      }
    }
  }

  private registerEventListeners(): void {
    eventBus.on(NetworkEventType.CONNECTED, ({ playerId }) => {
      this.handleConnected(playerId);
    });

    eventBus.on(NetworkEventType.DISCONNECTED, () => {
      this.reset();
    });

    eventBus.on(NetworkEventType.PLAYER_JOINED, ({ playerData }) => {
      this.upsertUser(playerData, false);
    });

    eventBus.on(NetworkEventType.PLAYER_UPDATED, ({ data }) => {
      this.upsertUser(data, false);
    });

    eventBus.on(NetworkEventType.PLAYER_LEFT, ({ playerId }) => {
      this.removeUser(playerId);
    });

    eventBus.on(NetworkEventType.STATE_SYNC, ({ state }) => {
      this.applyStateSync(state);
    });

    eventBus.on(NetworkEventType.BROADCAST_RECEIVED, ({ from, message }) => {
      this.handleBroadcast(from, message);
    });

    eventBus.on('COLLAB_BROADCAST', ({ from, message }: { from: string; message: CollaborationBroadcast }) => {
      this.handleBroadcast(from, message);
    });
  }

  private handleConnected(playerId: string): void {
    this.localUserId = playerId;

    const name = networkManager.getPlayerName();
    const existing = this.users.get(playerId);

    const user: CollaborationUser = {
      id: playerId,
      name: name || `Usuário ${playerId.substring(0, 4)}`,
      color: existing?.color ?? this.assignColor(playerId),
      status: 'online',
      isLocal: true,
      lastActive: Date.now()
    };

    this.users.set(playerId, user);
    this.emit('presence', this.getUsers());
  }

  private upsertUser(playerData: PlayerData, markLocal: boolean): void {
    if (!playerData || !playerData.id) return;

    const existing = this.users.get(playerData.id);

    const user: CollaborationUser = {
      id: playerData.id,
      name: playerData.name || existing?.name || `Usuário ${playerData.id.substring(0, 4)}`,
      color: existing?.color ?? this.assignColor(playerData.id),
      status: 'online',
      lastActive: Date.now(),
      currentView: playerData.isVR ? 'Modo VR' : existing?.currentView
    };

    if (markLocal) {
      user.isLocal = true;
      this.localUserId = playerData.id;
    } else if (existing?.isLocal) {
      user.isLocal = true;
    }

    this.users.set(playerData.id, { ...existing, ...user });
    this.emit('presence', this.getUsers());
  }

  private removeUser(playerId: string): void {
    if (!playerId) return;
    if (this.users.has(playerId)) {
      this.users.delete(playerId);
      this.cursors.delete(playerId);
      this.emit('presence', this.getUsers());
    }
  }

  private applyStateSync(state: any): void {
    if (!state) return;

    if (Array.isArray(state.players)) {
      state.players.forEach((player: PlayerData) => {
        this.upsertUser(player, player.id === this.localUserId);
      });
    }

    if (Array.isArray(state.measurements)) {
      this.measurements = state.measurements.map((m: SharedMeasurement) => ({
        ...m,
        measurementType: m.measurementType ?? 'distance'
      }));
      this.emit('measurements', [...this.measurements]);
    }
  }

  private handleBroadcast(from: string, message: CollaborationBroadcast): void {
    if (!message || (message.channel && message.channel !== 'collaboration')) {
      return;
    }

    if (from) {
      const sender = this.users.get(from);
      if (sender) {
        sender.lastActive = Date.now();
        this.users.set(from, { ...sender });
        this.emit('presence', this.getUsers());
      }
    }

    const action = message.action;
    const payload = message.payload ?? {};

    switch (action) {
      case 'chat_message': {
        if (payload.userId === this.localUserId) {
          // Já tratamos localmente
          return;
        }
        this.chatMessages.push(payload);
        this.emit('chat', payload);
        break;
      }
      case 'cursor_update': {
        if (payload.userId === this.localUserId) {
          return;
        }
        const cursor: CursorUpdate = {
          ...payload,
          timestamp: Date.now()
        };
        this.cursors.set(cursor.userId, cursor);
        this.emit('cursor', cursor);
        break;
      }
      case 'measurement_added': {
        if (!payload || !payload.id) return;
        const exists = this.measurements.find((m) => m.id === payload.id);
        if (exists) return;
        this.measurements.push({
          ...payload,
          measurementType: payload.measurementType ?? 'distance'
        });
        this.emit('measurements', [...this.measurements]);
        break;
      }
      case 'measurement_removed': {
        if (!payload?.id) return;
        this.removeMeasurement(payload.id, false);
        break;
      }
      case 'measurements_cleared': {
        this.measurements = [];
        this.emit('measurements_cleared', undefined);
        this.emit('measurements', []);
        break;
      }
      default:
        break;
    }
  }

  private assignColor(userId: string): string {
    if (this.users.has(userId)) {
      return this.users.get(userId)!.color;
    }
    const color = COLOR_PALETTE[this.colorIndex % COLOR_PALETTE.length];
    this.colorIndex++;
    return color;
  }

  private emit<T extends CollaborationEvent>(event: T, payload: any): void {
    const listeners = this.listeners.get(event);
    listeners?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error('CollaborationManager listener failed', error);
      }
    });
  }

  private reset(): void {
    this.users.clear();
    this.chatMessages = [];
    this.cursors.clear();
    this.measurements = [];
    this.localUserId = null;

    this.emit('presence', []);
    this.emit('measurements', []);
    this.emit('measurements_cleared', undefined);
  }
}

export const collaborationManager = CollaborationManager.getInstance();
