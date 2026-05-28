import type { CreateMeetingInput, JoinMeetingInput, UpdateAvatarInput, SendMessageInput, CreateActionInput, CollaborationUpdateInput } from './meetings.schemas.js';
interface AppendCollaborationUpdateInput extends CollaborationUpdateInput {
    roomId: string;
    userId: string;
    participantId?: string;
}
export declare class MeetingsService {
    private db;
    constructor();
    createRoom(tenantId: string, input: CreateMeetingInput): Promise<any>;
    getRoom(roomId: string): Promise<any>;
    getRoomByCode(meetingCode: string): Promise<any>;
    listRoomsByProject(projectId: string): Promise<any>;
    joinRoom(input: JoinMeetingInput): Promise<any>;
    updateAvatarState(participantId: string, avatarState: UpdateAvatarInput): Promise<any>;
    leaveRoom(participantId: string): Promise<void>;
    getParticipants(roomId: string): Promise<any>;
    sendMessage(input: SendMessageInput): Promise<any>;
    getMessages(roomId: string, limit?: number): Promise<any>;
    createAction(input: CreateActionInput): Promise<any>;
    appendCollaborationUpdate(input: AppendCollaborationUpdateInput): Promise<any>;
    upsertCollaborationSnapshot(input: {
        roomId: string;
        userId: string;
        update: number[];
        version?: number;
    }): Promise<any>;
    getCollaborationSnapshot(roomId: string): Promise<any>;
    getCollaborationUpdates(roomId: string, afterVersion?: number, limit?: number): Promise<any>;
    getCollaborationHistory(roomId: string, afterVersion?: number, limit?: number): Promise<{
        roomId: string;
        snapshot: any;
        updates: any;
    }>;
    private getNextCollaborationVersion;
    endRoom(roomId: string): Promise<void>;
}
export {};
//# sourceMappingURL=meetings.service.d.ts.map