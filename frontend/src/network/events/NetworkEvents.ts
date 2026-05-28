/**
 * NetworkEvents - Eventos do sistema de rede
 * WebSocket/WebRTC communication
 */

export enum NetworkEventType {
  // Connection Events
  CONNECTED = 'NETWORK_CONNECTED',
  DISCONNECTED = 'NETWORK_DISCONNECTED',
  CONNECTION_ERROR = 'NETWORK_CONNECTION_ERROR',
  RECONNECTING = 'NETWORK_RECONNECTING',
  
  // Player Events
  PLAYER_JOINED = 'NETWORK_PLAYER_JOINED',
  PLAYER_LEFT = 'NETWORK_PLAYER_LEFT',
  PLAYER_UPDATED = 'NETWORK_PLAYER_UPDATED',
  
  // State Sync Events
  STATE_SYNC = 'NETWORK_STATE_SYNC',
  OBJECT_CREATED = 'NETWORK_OBJECT_CREATED',
  OBJECT_UPDATED = 'NETWORK_OBJECT_UPDATED',
  OBJECT_DELETED = 'NETWORK_OBJECT_DELETED',
  
  // Message Events
  MESSAGE_RECEIVED = 'NETWORK_MESSAGE_RECEIVED',
  MESSAGE_SENT = 'NETWORK_MESSAGE_SENT',
  BROADCAST_RECEIVED = 'NETWORK_BROADCAST_RECEIVED',
  
  // VoIP Events
  VOICE_STARTED = 'NETWORK_VOICE_STARTED',
  VOICE_STOPPED = 'NETWORK_VOICE_STOPPED',
  VOICE_DATA = 'NETWORK_VOICE_DATA',
  
  // Room Events
  ROOM_CREATED = 'NETWORK_ROOM_CREATED',
  ROOM_JOINED = 'NETWORK_ROOM_JOINED',
  ROOM_LEFT = 'NETWORK_ROOM_LEFT',
  ROOM_UPDATED = 'NETWORK_ROOM_UPDATED'
}

export interface NetworkEventData {
  [NetworkEventType.CONNECTED]: { playerId: string; timestamp: number };
  [NetworkEventType.DISCONNECTED]: { reason: string };
  [NetworkEventType.CONNECTION_ERROR]: { error: Error };
  [NetworkEventType.RECONNECTING]: { attempt: number };
  
  [NetworkEventType.PLAYER_JOINED]: { playerId: string; playerData: any };
  [NetworkEventType.PLAYER_LEFT]: { playerId: string };
  [NetworkEventType.PLAYER_UPDATED]: { playerId: string; data: any };
  
  [NetworkEventType.STATE_SYNC]: { state: any };
  [NetworkEventType.OBJECT_CREATED]: { objectId: string; data: any };
  [NetworkEventType.OBJECT_UPDATED]: { objectId: string; data: any };
  [NetworkEventType.OBJECT_DELETED]: { objectId: string };
  
  [NetworkEventType.MESSAGE_RECEIVED]: { from: string; message: any };
  [NetworkEventType.MESSAGE_SENT]: { to: string; message: any };
  [NetworkEventType.BROADCAST_RECEIVED]: { from: string; message: any };
  
  [NetworkEventType.VOICE_STARTED]: { playerId: string };
  [NetworkEventType.VOICE_STOPPED]: { playerId: string };
  [NetworkEventType.VOICE_DATA]: { playerId: string; data: ArrayBuffer };
  
  [NetworkEventType.ROOM_CREATED]: { roomId: string; roomData: any };
  [NetworkEventType.ROOM_JOINED]: { roomId: string };
  [NetworkEventType.ROOM_LEFT]: { roomId: string };
  [NetworkEventType.ROOM_UPDATED]: { roomId: string; data: any };
}

/**
 * Player data structure
 */
export interface PlayerData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  avatar?: string;
  isVR: boolean;
  timestamp: number;
}

/**
 * Network message structure
 */
export interface NetworkMessage {
  type: string;
  from: string;
  to?: string;
  data: any;
  timestamp: number;
}
