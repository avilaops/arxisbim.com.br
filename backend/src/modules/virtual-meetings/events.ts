// =====================================
// VIRTUAL MEETINGS - WebSocket Events
// =====================================

/**
 * Eventos que o CLIENT envia para o SERVER
 */
export enum ClientEvents {
  // Room Management
  JOIN_ROOM = 'meeting:join',
  LEAVE_ROOM = 'meeting:leave',
  
  // Avatar Updates
  UPDATE_AVATAR = 'meeting:update-avatar',
  
  // Chat
  SEND_MESSAGE = 'meeting:send-message',
  
  // Actions (laser pointer, annotations, etc)
  CREATE_ACTION = 'meeting:create-action',

  // CRDT state sync (selection, annotations, section cuts)
  COLLABORATION_UPDATE = 'meeting:collaboration-update',
  COLLABORATION_HISTORY_REQUEST = 'meeting:collaboration-history-request',
  
  // Voice/Video (future)
  TOGGLE_AUDIO = 'meeting:toggle-audio',
  TOGGLE_VIDEO = 'meeting:toggle-video',
}

/**
 * Eventos que o SERVER envia para o CLIENT
 */
export enum ServerEvents {
  // Connection
  JOINED = 'meeting:joined',
  ERROR = 'meeting:error',
  
  // Participants
  PARTICIPANT_JOINED = 'meeting:participant-joined',
  PARTICIPANT_LEFT = 'meeting:participant-left',
  
  // Avatar Updates
  AVATAR_UPDATED = 'meeting:avatar-updated',
  
  // Chat
  MESSAGE_RECEIVED = 'meeting:message-received',
  
  // Actions
  ACTION_CREATED = 'meeting:action-created',

  // CRDT state sync
  COLLABORATION_UPDATED = 'meeting:collaboration-updated',
  COLLABORATION_HISTORY = 'meeting:collaboration-history',
  
  // Room Status
  ROOM_ENDED = 'meeting:room-ended',
  HOST_CHANGED = 'meeting:host-changed',
}

/**
 * Mapeamento de eventos para tipos de payload
 */
export interface ClientEventMap {
  [ClientEvents.JOIN_ROOM]: {
    roomId: string;
    userName: string;
    avatarState?: any;
  };
  [ClientEvents.LEAVE_ROOM]: void;
  [ClientEvents.UPDATE_AVATAR]: any;
  [ClientEvents.SEND_MESSAGE]: {
    message: string;
  };
  [ClientEvents.CREATE_ACTION]: {
    actionType: string;
    actionData: any;
    targetElementId?: string;
  };
  [ClientEvents.COLLABORATION_UPDATE]: {
    update: number[];
    origin?: 'selection' | 'annotation' | 'section' | 'presence' | 'snapshot' | string;
    isSnapshot?: boolean;
  };
  [ClientEvents.COLLABORATION_HISTORY_REQUEST]: {
    afterVersion?: number;
    limit?: number;
  };
}

export interface ServerEventMap {
  [ServerEvents.JOINED]: {
    participant: any;
    participants: any[];
    room: any;
  };
  [ServerEvents.ERROR]: {
    message: string;
    code?: string;
  };
  [ServerEvents.PARTICIPANT_JOINED]: {
    participant: any;
    participants: any[];
  };
  [ServerEvents.PARTICIPANT_LEFT]: {
    participantId: string;
  };
  [ServerEvents.AVATAR_UPDATED]: {
    participantId: string;
    avatarState: any;
  };
  [ServerEvents.MESSAGE_RECEIVED]: {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: Date;
  };
  [ServerEvents.ACTION_CREATED]: {
    id: string;
    userId: string;
    actionType: string;
    actionData: any;
    targetElementId?: string;
    timestamp: Date;
  };
  [ServerEvents.COLLABORATION_UPDATED]: {
    fromUserId: string;
    fromParticipantId: string;
    update: number[];
    origin?: string;
    version: number;
    isSnapshot: boolean;
    timestamp: Date;
  };
  [ServerEvents.COLLABORATION_HISTORY]: {
    roomId: string;
    snapshot: any | null;
    updates: any[];
  };
  [ServerEvents.ROOM_ENDED]: void;
}
