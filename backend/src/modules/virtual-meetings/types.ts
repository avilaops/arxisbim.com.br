// =====================================
// VIRTUAL MEETINGS - Type Definitions
// =====================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AvatarState {
  position: Vector3;
  rotation: Vector3;
  animation?: string;
  scale?: Vector3;
  modelUrl?: string;
}

export interface MeetingSettings {
  maxParticipants?: number;
  allowRecording?: boolean;
  allowChat?: boolean;
  allowAnnotations?: boolean;
  requireApproval?: boolean;
}

export interface AvatarSettings {
  defaultAvatar?: string;
  allowCustomAvatars?: boolean;
  availableAvatars?: string[];
}

export interface VirtualMeetingRoom {
  id: string;
  projectId: string;
  roomUrl: string;
  meetingCode: string;
  hostUserId: string;
  settings: MeetingSettings;
  avatarSettings: AvatarSettings;
  isActive: boolean;
  createdAt: Date;
  endedAt?: Date;
}

export interface MeetingParticipant {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  avatarState: AvatarState;
  isConnected: boolean;
  joinedAt: Date;
  leftAt?: Date;
  lastSeenAt?: Date;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  message: string;
  messageType: 'text' | 'system' | 'announcement';
  timestamp: Date;
}

export interface MeetingAction {
  id: string;
  roomId: string;
  userId: string;
  actionType: 'laser_pointer' | 'annotation' | 'highlight' | 'measure' | 'section';
  actionData: Record<string, any>;
  targetElementId?: string;
  timestamp: Date;
}

// =====================================
// Request/Response Types
// =====================================

export interface CreateRoomRequest {
  projectId: string;
  settings?: MeetingSettings;
  avatarSettings?: AvatarSettings;
}

export interface CreateRoomResponse extends VirtualMeetingRoom {}

export interface JoinRoomRequest {
  roomId: string;
  userName: string;
  avatarState?: AvatarState;
}

export interface JoinRoomResponse {
  participant: MeetingParticipant;
  participants: MeetingParticipant[];
  room: VirtualMeetingRoom;
}

export interface UpdateAvatarRequest {
  position?: Vector3;
  rotation?: Vector3;
  animation?: string;
  scale?: Vector3;
}

export interface SendMessageRequest {
  message: string;
}

export interface CreateActionRequest {
  actionType: 'laser_pointer' | 'annotation' | 'highlight' | 'measure' | 'section';
  actionData: Record<string, any>;
  targetElementId?: string;
}

// =====================================
// WebSocket Event Payloads
// =====================================

export interface ParticipantJoinedPayload {
  participant: MeetingParticipant;
  participants: MeetingParticipant[];
}

export interface ParticipantLeftPayload {
  participantId: string;
}

export interface AvatarUpdatedPayload {
  participantId: string;
  avatarState: AvatarState;
}

export interface MessageReceivedPayload {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export interface ActionCreatedPayload {
  id: string;
  userId: string;
  actionType: string;
  actionData: Record<string, any>;
  targetElementId?: string;
  timestamp: Date;
}

export interface MeetingErrorPayload {
  message: string;
  code?: string;
}
