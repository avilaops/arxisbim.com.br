/**
 * Multiplayer Realtime Types
 * 
 * Types para colaboração em tempo real multi-usuário
 */

export type CollaborationActionType = 
  | 'navigation' 
  | 'selection' 
  | 'annotation' 
  | 'camera' 
  | 'property_edit'
  | 'custom';

export type ParticipantRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface RoomOptions {
  /** Room name */
  name: string;
  
  /** Project ID */
  projectId?: string;
  
  /** Model ID */
  modelId?: string;
  
  /** Password protection */
  password?: string;
  
  /** Max participants */
  maxParticipants?: number;
  
  /** Enable audio */
  enableAudio?: boolean;
  
  /** Enable video */
  enableVideo?: boolean;
  
  /** Enable chat */
  enableChat?: boolean;
}

export interface UserSession {
  /** User ID */
  userId: string;
  
  /** User name */
  name: string;
  
  /** User email */
  email?: string;
  
  /** Avatar URL */
  avatar?: string;
  
  /** User role */
  role?: ParticipantRole;
}

export interface Participant {
  /** Participant ID */
  id: string;
  
  /** User session */
  user: UserSession;
  
  /** Avatar state */
  avatar?: AvatarState;
  
  /** Connection state */
  connectionState: ConnectionState;
  
  /** Joined at */
  joinedAt: Date;
  
  /** Audio enabled */
  audioEnabled?: boolean;
  
  /** Video enabled */
  videoEnabled?: boolean;
}

export interface AvatarState {
  /** Position [x, y, z] */
  position: [number, number, number];
  
  /** Rotation [x, y, z] (euler angles) */
  rotation: [number, number, number];
  
  /** Animation state */
  animation?: 'idle' | 'walk' | 'run' | 'gesture' | 'point';
  
  /** Color/material */
  color?: string;
}

export interface CollaborationAction {
  /** Action ID */
  id?: string;
  
  /** Action type */
  type: CollaborationActionType;
  
  /** User ID who triggered the action */
  userId: string;
  
  /** Timestamp */
  timestamp?: Date;
  
  /** Action data */
  data: any;
}

export interface NavigationAction extends CollaborationAction {
  type: 'navigation';
  data: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
}

export interface SelectionAction extends CollaborationAction {
  type: 'selection';
  data: {
    expressIds: number[];
    mode?: 'set' | 'add' | 'remove';
  };
}

export interface ChatMessage {
  /** Message ID */
  id: string;
  
  /** Sender user ID */
  userId: string;
  
  /** Sender name */
  userName: string;
  
  /** Message content */
  content: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Mention user IDs */
  mentions?: string[];
  
  /** Reply to message ID */
  replyTo?: string;
}

export interface RoomState {
  /** Room ID */
  roomId: string;
  
  /** Room options */
  options: RoomOptions;
  
  /** Participants */
  participants: Participant[];
  
  /** Chat messages */
  messages: ChatMessage[];
  
  /** Current user */
  currentUser?: Participant;
  
  /** Connection state */
  connectionState: ConnectionState;
  
  /** Created at */
  createdAt: Date;
}

export interface ConnectionQuality {
  /** Latency (ms) */
  latency: number;
  
  /** Packet loss (0.0 - 1.0) */
  packetLoss: number;
  
  /** Bandwidth (kbps) */
  bandwidth: number;
  
  /** Quality rating (0-5) */
  quality: number;
}

export type ParticipantJoinedCallback = (participant: Participant) => void;
export type ParticipantLeftCallback = (participantId: string) => void;
export type AvatarUpdatedCallback = (participantId: string, state: AvatarState) => void;
export type ChatMessageCallback = (message: ChatMessage) => void;
export type ActionCallback = (action: CollaborationAction) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;
export type UnsubscribeFn = () => void;

export const DEFAULT_ROOM_OPTIONS: Partial<RoomOptions> = {
  maxParticipants: 50,
  enableAudio: false,
  enableVideo: false,
  enableChat: true,
};
