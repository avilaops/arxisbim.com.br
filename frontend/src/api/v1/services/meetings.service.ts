/**
 * Virtual Meetings Service - API v1
 * Gerencia salas de reunião virtual
 */

import { getAPIClient } from '../client';

export interface MeetingRoom {
  id: string;
  projectId: string;
  roomUrl: string;
  meetingCode: string;
  name?: string;
  createdBy: string;
  avatarSettings?: {
    enableAvatars?: boolean;
    defaultAvatarStyle?: string;
    allowCustomAvatars?: boolean;
  };
  isActive: boolean;
  createdAt: string;
  closedAt?: string;
}

export interface CreateMeetingData {
  projectId: string;
  settings?: {
    maxParticipants?: number;
    allowRecording?: boolean;
    allowChat?: boolean;
    allowAnnotations?: boolean;
  };
  avatarSettings?: {
    defaultAvatar?: string;
    allowCustomAvatars?: boolean;
  };
}

export interface MeetingParticipant {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  avatarState?: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    animation?: string;
  };
  joinedAt: string;
  leftAt?: string;
  isConnected: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  message: string;
  messageType: 'text' | 'system' | 'announcement';
  timestamp: string;
}

export interface CollaborationUpdateData {
  update: number[];
  origin?: 'selection' | 'annotation' | 'section' | 'presence' | 'snapshot' | string;
  isSnapshot?: boolean;
}

export interface CollaborationUpdateRecord {
  id: string;
  roomId: string;
  userId?: string | null;
  participantId?: string | null;
  origin: string;
  ydocUpdate: number[];
  version: number;
  isSnapshot: boolean;
  createdAt: string;
}

export interface CollaborationSnapshotRecord {
  id: string;
  roomId: string;
  ydocUpdate: number[];
  version: number;
  updatedBy?: string | null;
  updatedAt: string;
}

export interface CollaborationHistory {
  roomId: string;
  snapshot: CollaborationSnapshotRecord | null;
  updates: CollaborationUpdateRecord[];
}

export interface MeetingMediaConfig {
  provider: 'livekit' | 'p2p';
  roomName: string;
  livekit?: {
    url: string;
    token: string;
    participantIdentity: string;
  };
  p2p?: {
    signalingUrl: string;
  };
}

export class MeetingsService {
  private readonly endpoint = '/api/v1/meetings';

  /**
   * Cria nova sala de reunião
   */
  async createRoom(data: CreateMeetingData): Promise<MeetingRoom> {
    const client = getAPIClient();
    const response = await client.post<MeetingRoom>(this.endpoint, data);
    return response.data;
  }

  /**
   * Obtém sala por ID
   */
  async getRoom(roomId: string): Promise<MeetingRoom> {
    const client = getAPIClient();
    const response = await client.get<MeetingRoom>(`${this.endpoint}/${roomId}`);
    return response.data;
  }

  /**
   * Obtém sala por código
   */
  async getRoomByCode(code: string): Promise<MeetingRoom> {
    const client = getAPIClient();
    const response = await client.get<MeetingRoom>(`${this.endpoint}/code/${code}`);
    return response.data;
  }

  /**
   * Lista salas de um projeto
   */
  async listProjectRooms(projectId: string): Promise<MeetingRoom[]> {
    const client = getAPIClient();
    const response = await client.get<MeetingRoom[]>(`${this.endpoint}/project/${projectId}`);
    return response.data;
  }

  /**
   * Lista participantes de uma sala
   */
  async getParticipants(roomId: string): Promise<MeetingParticipant[]> {
    const client = getAPIClient();
    const response = await client.get<MeetingParticipant[]>(`${this.endpoint}/${roomId}/participants`);
    return response.data;
  }

  /**
   * Obtém mensagens do chat
   */
  async getMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
    const client = getAPIClient();
    const response = await client.get<ChatMessage[]>(`${this.endpoint}/${roomId}/messages`, {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Obtém snapshot + updates CRDT/Yjs para late join/reconnect
   */
  async getCollaborationHistory(roomId: string, afterVersion = 0, limit = 100): Promise<CollaborationHistory> {
    const client = getAPIClient();
    const response = await client.get<CollaborationHistory>(`${this.endpoint}/${roomId}/collaboration`, {
      params: { afterVersion, limit },
    });
    return response.data;
  }

  /**
   * Persiste update CRDT/Yjs via HTTP fallback
   */
  async appendCollaborationUpdate(roomId: string, data: CollaborationUpdateData): Promise<CollaborationUpdateRecord> {
    const client = getAPIClient();
    const response = await client.post<CollaborationUpdateRecord>(`${this.endpoint}/${roomId}/collaboration/updates`, data);
    return response.data;
  }

  /**
   * Persiste snapshot compacto do documento Yjs
   */
  async upsertCollaborationSnapshot(roomId: string, data: CollaborationUpdateData): Promise<CollaborationUpdateRecord> {
    const client = getAPIClient();
    const response = await client.put<CollaborationUpdateRecord>(`${this.endpoint}/${roomId}/collaboration/snapshot`, {
      ...data,
      isSnapshot: true,
    });
    return response.data;
  }

  /**
   * Obtém config de mídia: LiveKit quando configurado, P2P como fallback
   */
  async getMediaConfig(roomId: string, userName?: string): Promise<MeetingMediaConfig> {
    const client = getAPIClient();
    const response = await client.get<MeetingMediaConfig>(`${this.endpoint}/${roomId}/media-config`, {
      params: userName ? { userName } : undefined,
    });
    return response.data;
  }

  /**
   * Encerra reunião (host only)
   */
  async endRoom(roomId: string): Promise<void> {
    const client = getAPIClient();
    await client.delete(`${this.endpoint}/${roomId}`);
  }
}

// Singleton
let meetingsServiceInstance: MeetingsService | null = null;

export function getMeetingsService(): MeetingsService {
  if (!meetingsServiceInstance) {
    meetingsServiceInstance = new MeetingsService();
  }
  return meetingsServiceInstance;
}
