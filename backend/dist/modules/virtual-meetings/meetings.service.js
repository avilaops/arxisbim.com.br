import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, asc, desc, gt, sql } from 'drizzle-orm';
import { virtualMeetingRooms, meetingParticipants, meetingChatMessages, meetingActions, meetingCollaborationSnapshots, meetingCollaborationUpdates } from '../../shared/database/schema/virtual-meetings.js';
import { NotificationService } from '../notifications/notifications.service.js';
export class MeetingsService {
    db;
    constructor() {
        const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';
        const client = postgres(connectionString);
        this.db = drizzle(client, {
            schema: {
                virtualMeetingRooms,
                meetingParticipants,
                meetingChatMessages,
                meetingActions,
                meetingCollaborationSnapshots,
                meetingCollaborationUpdates
            }
        });
    }
    async createRoom(tenantId, input) {
        const roomUrl = `${input.projectId}-${Date.now()}`;
        const meetingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const [room] = await this.db
            .insert(virtualMeetingRooms)
            .values({
            projectId: input.projectId,
            roomUrl,
            meetingCode,
            createdBy: input.hostUserId, // Map hostUserId to createdBy
            avatarSettings: input.avatarSettings || {},
            isActive: true,
        })
            .returning();
        // Send notification to host
        if (input.hostUserId) {
            NotificationService.create({
                userId: input.hostUserId,
                tenantId,
                type: 'meeting_scheduled',
                title: 'Reunião Virtual Criada',
                message: `Reunião criada com código: ${meetingCode}`,
                priority: 'medium',
                actionUrl: `/meetings/${room.id}`,
                metadata: {
                    roomId: room.id,
                    meetingCode,
                    projectId: input.projectId,
                },
            }).catch((err) => console.error('Failed to send meeting notification:', err));
        }
        return room;
    }
    async getRoom(roomId) {
        const [room] = await this.db
            .select()
            .from(virtualMeetingRooms)
            .where(eq(virtualMeetingRooms.id, roomId))
            .limit(1);
        return room;
    }
    async getRoomByCode(meetingCode) {
        const [room] = await this.db
            .select()
            .from(virtualMeetingRooms)
            .where(eq(virtualMeetingRooms.meetingCode, meetingCode))
            .limit(1);
        return room;
    }
    async listRoomsByProject(projectId) {
        return await this.db
            .select()
            .from(virtualMeetingRooms)
            .where(eq(virtualMeetingRooms.projectId, projectId));
    }
    async joinRoom(input) {
        const [participant] = await this.db
            .insert(meetingParticipants)
            .values({
            roomId: input.roomId,
            userId: input.userId,
            userName: input.userName,
            avatarState: input.avatarState || {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                animation: 'idle'
            },
            isConnected: true,
        })
            .returning();
        return participant;
    }
    async updateAvatarState(participantId, avatarState) {
        const [participant] = await this.db
            .update(meetingParticipants)
            .set({
            avatarState,
            lastSeenAt: new Date()
        })
            .where(eq(meetingParticipants.id, participantId))
            .returning();
        return participant;
    }
    async leaveRoom(participantId) {
        await this.db
            .update(meetingParticipants)
            .set({
            isConnected: false,
            leftAt: new Date()
        })
            .where(eq(meetingParticipants.id, participantId));
    }
    async getParticipants(roomId) {
        return await this.db
            .select()
            .from(meetingParticipants)
            .where(and(eq(meetingParticipants.roomId, roomId), eq(meetingParticipants.isConnected, true)));
    }
    async sendMessage(input) {
        const [message] = await this.db
            .insert(meetingChatMessages)
            .values({
            roomId: input.roomId,
            userId: input.userId,
            userName: input.userName,
            message: input.message,
            messageType: input.messageType || 'text',
        })
            .returning();
        return message;
    }
    async getMessages(roomId, limit = 50) {
        return await this.db
            .select()
            .from(meetingChatMessages)
            .where(eq(meetingChatMessages.roomId, roomId))
            .orderBy(desc(meetingChatMessages.timestamp))
            .limit(limit);
    }
    async createAction(input) {
        const [action] = await this.db
            .insert(meetingActions)
            .values({
            roomId: input.roomId,
            userId: input.userId,
            actionType: input.actionType,
            actionData: input.actionData,
        })
            .returning();
        return action;
    }
    async appendCollaborationUpdate(input) {
        const [versionRow] = await this.db
            .select({
            nextVersion: sql `COALESCE(MAX(${meetingCollaborationUpdates.version}), 0) + 1`,
        })
            .from(meetingCollaborationUpdates)
            .where(eq(meetingCollaborationUpdates.roomId, input.roomId));
        const nextVersion = Number(versionRow?.nextVersion ?? 1);
        const [update] = await this.db
            .insert(meetingCollaborationUpdates)
            .values({
            roomId: input.roomId,
            userId: input.userId,
            participantId: input.participantId,
            origin: input.origin || 'snapshot',
            ydocUpdate: input.update,
            version: nextVersion,
            isSnapshot: input.isSnapshot || false,
        })
            .returning();
        if (input.isSnapshot) {
            await this.upsertCollaborationSnapshot({
                roomId: input.roomId,
                userId: input.userId,
                update: input.update,
                version: nextVersion,
            });
        }
        return update;
    }
    async upsertCollaborationSnapshot(input) {
        const version = input.version ?? (await this.getNextCollaborationVersion(input.roomId));
        const [snapshot] = await this.db
            .insert(meetingCollaborationSnapshots)
            .values({
            roomId: input.roomId,
            ydocUpdate: input.update,
            version,
            updatedBy: input.userId,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: meetingCollaborationSnapshots.roomId,
            set: {
                ydocUpdate: input.update,
                version,
                updatedBy: input.userId,
                updatedAt: new Date(),
            },
        })
            .returning();
        return snapshot;
    }
    async getCollaborationSnapshot(roomId) {
        const [snapshot] = await this.db
            .select()
            .from(meetingCollaborationSnapshots)
            .where(eq(meetingCollaborationSnapshots.roomId, roomId))
            .limit(1);
        return snapshot || null;
    }
    async getCollaborationUpdates(roomId, afterVersion = 0, limit = 100) {
        return await this.db
            .select()
            .from(meetingCollaborationUpdates)
            .where(and(eq(meetingCollaborationUpdates.roomId, roomId), gt(meetingCollaborationUpdates.version, afterVersion)))
            .orderBy(asc(meetingCollaborationUpdates.version))
            .limit(limit);
    }
    async getCollaborationHistory(roomId, afterVersion = 0, limit = 100) {
        const snapshot = await this.getCollaborationSnapshot(roomId);
        const updates = await this.getCollaborationUpdates(roomId, afterVersion, limit);
        return {
            roomId,
            snapshot,
            updates,
        };
    }
    async getNextCollaborationVersion(roomId) {
        const [versionRow] = await this.db
            .select({
            nextVersion: sql `COALESCE(MAX(${meetingCollaborationUpdates.version}), 0) + 1`,
        })
            .from(meetingCollaborationUpdates)
            .where(eq(meetingCollaborationUpdates.roomId, roomId));
        return Number(versionRow?.nextVersion ?? 1);
    }
    async endRoom(roomId) {
        await this.db
            .update(virtualMeetingRooms)
            .set({
            isActive: false,
            closedAt: new Date()
        })
            .where(eq(virtualMeetingRooms.id, roomId));
        // Desconectar todos os participantes
        await this.db
            .update(meetingParticipants)
            .set({
            isConnected: false,
            leftAt: new Date()
        })
            .where(eq(meetingParticipants.roomId, roomId));
    }
}
//# sourceMappingURL=meetings.service.js.map