import type { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare class MeetingsGateway {
    private io;
    private meetingsService;
    private roomParticipants;
    constructor(httpServer: HTTPServer);
    private setupMiddleware;
    private setupEventHandlers;
    private handleDisconnect;
    getIO(): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
}
//# sourceMappingURL=meetings.gateway.d.ts.map