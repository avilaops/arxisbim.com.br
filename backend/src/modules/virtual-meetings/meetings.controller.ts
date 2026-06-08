import type { FastifyRequest, FastifyReply } from 'fastify';
import { MeetingsService } from './meetings.service.js';
import { collaborationHistoryQuerySchema, collaborationUpdateSchema, createMeetingSchema } from './meetings.schemas.js';
import { MeetingMediaService } from './media.service.js';

export class MeetingsController {
  private mediaService = new MeetingMediaService();

  constructor(private meetingsService: MeetingsService) {}

  async createRoom(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId, userId } = request.user as any;
    const body = createMeetingSchema.parse(request.body);

    try {
      // Sobrescrever hostUserId com o usuário autenticado
      const room = await this.meetingsService.createRoom(tenantId, {
        ...body,
        hostUserId: userId
      });
      return reply.code(201).send(room);
    } catch (err: any) {
      // FK inválido (ex.: projeto inexistente / projeto de demonstração) → 400 limpo, não 500.
      const msg = String(err?.message || '');
      if (err?.code === '23503' || /foreign key|violates|not present/i.test(msg)) {
        return reply.code(400).send({ error: 'Projeto inválido para criar uma reunião. Selecione um projeto real.' });
      }
      throw err;
    }
  }

  async getRoom(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const room = await this.meetingsService.getRoom(id);
    
    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }
    
    return reply.send(room);
  }

  async getRoomByCode(request: FastifyRequest, reply: FastifyReply) {
    const { code } = request.params as { code: string };
    const room = await this.meetingsService.getRoomByCode(code.toUpperCase());
    
    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }
    
    return reply.send(room);
  }

  async listRoomsByProject(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const rooms = await this.meetingsService.listRoomsByProject(projectId);
    return reply.send(rooms);
  }

  async getParticipants(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params as { roomId: string };
    const participants = await this.meetingsService.getParticipants(roomId);
    return reply.send(participants);
  }

  async getMessages(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params as { roomId: string };
    const { limit } = request.query as { limit?: string };
    
    const messages = await this.meetingsService.getMessages(
      roomId, 
      limit ? parseInt(limit) : 50
    );
    
    return reply.send(messages);
  }

  async getCollaborationHistory(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params as { roomId: string };
    const query = collaborationHistoryQuerySchema.parse(request.query || {});

    const history = await this.meetingsService.getCollaborationHistory(
      roomId,
      query.afterVersion || 0,
      query.limit || 100
    );

    return reply.send(history);
  }

  async appendCollaborationUpdate(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params as { roomId: string };
    const { userId } = request.user as any;
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

  async upsertCollaborationSnapshot(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params as { roomId: string };
    const { userId } = request.user as any;
    const body = collaborationUpdateSchema.parse({
      ...(request.body as object),
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

  async getMediaConfig(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params as { roomId: string };
    const { userId, email } = request.user as any;
    const { userName } = request.query as { userName?: string };

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

  async endRoom(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { userId } = request.user as any;
    
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
