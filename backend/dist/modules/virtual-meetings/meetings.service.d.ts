import type { CreateMeetingInput, JoinMeetingInput, UpdateAvatarInput, SendMessageInput, CreateActionInput, CollaborationUpdateInput } from './meetings.schemas.js';
interface AppendCollaborationUpdateInput extends CollaborationUpdateInput {
    roomId: string;
    userId: string;
    participantId?: string;
}
export declare class MeetingsService {
    private db;
    constructor();
    createRoom(tenantId: string, input: CreateMeetingInput): Promise<{
        id: string;
        name: string | null;
        isActive: boolean | null;
        createdAt: Date;
        projectId: string;
        createdBy: string;
        roomUrl: string;
        meetingCode: string;
        avatarSettings: {
            enableAvatars: boolean;
            defaultAvatarStyle?: string;
            allowCustomAvatars?: boolean;
        } | null;
        closedAt: Date | null;
    }>;
    getRoom(roomId: string): Promise<{
        id: string;
        projectId: string;
        roomUrl: string;
        meetingCode: string;
        name: string | null;
        createdBy: string;
        avatarSettings: {
            enableAvatars: boolean;
            defaultAvatarStyle?: string;
            allowCustomAvatars?: boolean;
        } | null;
        isActive: boolean | null;
        createdAt: Date;
        closedAt: Date | null;
    }>;
    getRoomByCode(meetingCode: string): Promise<{
        id: string;
        projectId: string;
        roomUrl: string;
        meetingCode: string;
        name: string | null;
        createdBy: string;
        avatarSettings: {
            enableAvatars: boolean;
            defaultAvatarStyle?: string;
            allowCustomAvatars?: boolean;
        } | null;
        isActive: boolean | null;
        createdAt: Date;
        closedAt: Date | null;
    }>;
    listRoomsByProject(projectId: string): Promise<{
        id: string;
        projectId: string;
        roomUrl: string;
        meetingCode: string;
        name: string | null;
        createdBy: string;
        avatarSettings: {
            enableAvatars: boolean;
            defaultAvatarStyle?: string;
            allowCustomAvatars?: boolean;
        } | null;
        isActive: boolean | null;
        createdAt: Date;
        closedAt: Date | null;
    }[]>;
    joinRoom(input: JoinMeetingInput): Promise<{
        id: string;
        isActive: boolean | null;
        userId: string;
        roomId: string;
        userName: string;
        avatarState: {
            position: {
                x: number;
                y: number;
                z: number;
            };
            rotation: {
                x: number;
                y: number;
                z: number;
            };
            animation?: string;
            customization?: {
                color?: string;
                accessories?: string[];
            };
        } | null;
        joinedAt: Date;
        leftAt: Date | null;
        lastSeenAt: Date | null;
        isConnected: boolean | null;
    }>;
    updateAvatarState(participantId: string, avatarState: UpdateAvatarInput): Promise<{
        id: string;
        roomId: string;
        userId: string;
        userName: string;
        avatarState: {
            position: {
                x: number;
                y: number;
                z: number;
            };
            rotation: {
                x: number;
                y: number;
                z: number;
            };
            animation?: string;
            customization?: {
                color?: string;
                accessories?: string[];
            };
        } | null;
        joinedAt: Date;
        leftAt: Date | null;
        lastSeenAt: Date | null;
        isConnected: boolean | null;
        isActive: boolean | null;
    }>;
    leaveRoom(participantId: string): Promise<void>;
    getParticipants(roomId: string): Promise<{
        id: string;
        roomId: string;
        userId: string;
        userName: string;
        avatarState: {
            position: {
                x: number;
                y: number;
                z: number;
            };
            rotation: {
                x: number;
                y: number;
                z: number;
            };
            animation?: string;
            customization?: {
                color?: string;
                accessories?: string[];
            };
        } | null;
        joinedAt: Date;
        leftAt: Date | null;
        lastSeenAt: Date | null;
        isConnected: boolean | null;
        isActive: boolean | null;
    }[]>;
    sendMessage(input: SendMessageInput): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        timestamp: Date;
        roomId: string;
        userName: string;
        messageType: string | null;
    }>;
    getMessages(roomId: string, limit?: number): Promise<{
        id: string;
        roomId: string;
        userId: string;
        userName: string;
        message: string;
        messageType: string | null;
        timestamp: Date;
        createdAt: Date;
    }[]>;
    createAction(input: CreateActionInput): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        roomId: string;
        actionType: string;
        actionData: {
            position?: {
                x: number;
                y: number;
                z: number;
            };
            targetElementId?: string;
            text?: string;
            color?: string;
        } | null;
    }>;
    appendCollaborationUpdate(input: AppendCollaborationUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        origin: string;
        userId: string | null;
        roomId: string;
        ydocUpdate: number[];
        participantId: string | null;
        isSnapshot: boolean;
    }>;
    upsertCollaborationSnapshot(input: {
        roomId: string;
        userId: string;
        update: number[];
        version?: number;
    }): Promise<{
        id: string;
        updatedAt: Date;
        version: number;
        roomId: string;
        ydocUpdate: number[];
        updatedBy: string | null;
    }>;
    getCollaborationSnapshot(roomId: string): Promise<{
        id: string;
        roomId: string;
        ydocUpdate: number[];
        version: number;
        updatedBy: string | null;
        updatedAt: Date;
    }>;
    getCollaborationUpdates(roomId: string, afterVersion?: number, limit?: number): Promise<{
        id: string;
        roomId: string;
        userId: string | null;
        participantId: string | null;
        origin: string;
        ydocUpdate: number[];
        version: number;
        isSnapshot: boolean;
        createdAt: Date;
    }[]>;
    getCollaborationHistory(roomId: string, afterVersion?: number, limit?: number): Promise<{
        roomId: string;
        snapshot: {
            id: string;
            roomId: string;
            ydocUpdate: number[];
            version: number;
            updatedBy: string | null;
            updatedAt: Date;
        };
        updates: {
            id: string;
            roomId: string;
            userId: string | null;
            participantId: string | null;
            origin: string;
            ydocUpdate: number[];
            version: number;
            isSnapshot: boolean;
            createdAt: Date;
        }[];
    }>;
    private getNextCollaborationVersion;
    endRoom(roomId: string): Promise<void>;
}
export {};
//# sourceMappingURL=meetings.service.d.ts.map