import { collaborationHistoryQuerySchema, collaborationUpdateSchema, createMeetingSchema } from './meetings.schemas.js';
import { MeetingMediaService } from './media.service.js';
export class MeetingsController {
    meetingsService;
    mediaService = new MeetingMediaService();
    constructor(meetingsService) {
        this.meetingsService = meetingsService;
    }
    async createRoom(request, reply) {
        const { tenantId, userId } = request.user;
        const body = createMeetingSchema.parse(request.body);
        // Sobrescrever hostUserId com o usuário autenticado
        const room = await this.meetingsService.createRoom(tenantId, {
            ...body,
            hostUserId: userId
        });
        return reply.code(201).send(room);
    }
    async getRoom(request, reply) {
        const { id } = request.params;
        const room = await this.meetingsService.getRoom(id);
        if (!room) {
            return reply.code(404).send({ error: 'Room not found' });
        }
        return reply.send(room);
    }
    async getRoomByCode(request, reply) {
        const { code } = request.params;
        const room = await this.meetingsService.getRoomByCode(code.toUpperCase());
        if (!room) {
            return reply.code(404).send({ error: 'Room not found' });
        }
        return reply.send(room);
    }
    async listRoomsByProject(request, reply) {
        const { projectId } = request.params;
        const rooms = await this.meetingsService.listRoomsByProject(projectId);
        return reply.send(rooms);
    }
    async getParticipants(request, reply) {
        const { roomId } = request.params;
        const participants = await this.meetingsService.getParticipants(roomId);
        return reply.send(participants);
    }
    async getMessages(request, reply) {
        const { roomId } = request.params;
        const { limit } = request.query;
        const messages = await this.meetingsService.getMessages(roomId, limit ? parseInt(limit) : 50);
        return reply.send(messages);
    }
    async getCollaborationHistory(request, reply) {
        const { roomId } = request.params;
        const query = collaborationHistoryQuerySchema.parse(request.query || {});
        const history = await this.meetingsService.getCollaborationHistory(roomId, query.afterVersion || 0, query.limit || 100);
        return reply.send(history);
    }
    async appendCollaborationUpdate(request, reply) {
        const { roomId } = request.params;
        const { userId } = request.user;
        const body = collaborationUpdateSchema.parse(request.body);
        const room = await this.meetingsService.getRoom(roomId);
        if (!room || !room.isActive) {
            return reply.code(404).send({ error: 'Room not found or inactive' });
        }
        const update = await this.meetingsService.appendCollaborationUpdate({
            roomId,
            userId,
            ...body,
        });
        return reply.code(201).send(update);
    }
    async upsertCollaborationSnapshot(request, reply) {
        const { roomId } = request.params;
        const { userId } = request.user;
        const body = collaborationUpdateSchema.parse({
            ...request.body,
            isSnapshot: true,
        });
        const room = await this.meetingsService.getRoom(roomId);
        if (!room || !room.isActive) {
            return reply.code(404).send({ error: 'Room not found or inactive' });
        }
        const update = await this.meetingsService.appendCollaborationUpdate({
            roomId,
            userId,
            ...body,
            isSnapshot: true,
        });
        return reply.code(201).send(update);
    }
    async getMediaConfig(request, reply) {
        const { roomId } = request.params;
        const { userId, email } = request.user;
        const { userName } = request.query;
        const room = await this.meetingsService.getRoom(roomId);
        if (!room || !room.isActive) {
            return reply.code(404).send({ error: 'Room not found or inactive' });
        }
        const config = await this.mediaService.getMediaConfig({
            roomId,
            userId,
            userName: userName || email,
        });
        return reply.send(config);
    }
    async endRoom(request, reply) {
        const { id } = request.params;
        const { userId } = request.user;
        // Verificar se usuário é o host
        const room = await this.meetingsService.getRoom(id);
        if (!room) {
            return reply.code(404).send({ error: 'Room not found' });
        }
        if (room.createdBy !== userId) {
            return reply.code(403).send({ error: 'Only the host can end the room' });
        }
        await this.meetingsService.endRoom(id);
        return reply.code(204).send();
    }
}
//# sourceMappingURL=meetings.controller.js.map