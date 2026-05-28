import type { FastifyRequest, FastifyReply } from 'fastify';
import { MeetingsService } from './meetings.service.js';
export declare class MeetingsController {
    private meetingsService;
    private mediaService;
    constructor(meetingsService: MeetingsService);
    createRoom(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getRoom(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getRoomByCode(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    listRoomsByProject(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getParticipants(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getMessages(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getCollaborationHistory(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    appendCollaborationUpdate(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    upsertCollaborationSnapshot(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    getMediaConfig(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    endRoom(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=meetings.controller.d.ts.map