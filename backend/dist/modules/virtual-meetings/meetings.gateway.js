import { Server as SocketIOServer } from 'socket.io';
import { MeetingsService } from './meetings.service.js';
import { ClientEvents, ServerEvents } from './events.js';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'arxis-super-secret-2026';
export class MeetingsGateway {
    io;
    meetingsService;
    // Map para rastrear participantes por sala
    roomParticipants = new Map();
    constructor(httpServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: ['http://localhost:5173', 'http://localhost:3000'],
                methods: ['GET', 'POST'],
                credentials: true
            },
            path: '/socket.io/',
        });
        this.meetingsService = new MeetingsService();
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Autenticação via JWT
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const decoded = jwt.verify(token, JWT_SECRET);
                socket.userId = decoded.userId;
                socket.tenantId = decoded.tenantId;
                next();
            }
            catch (error) {
                next(new Error('Invalid token'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`✅ User connected: ${socket.userId} (${socket.id})`);
            // JOIN ROOM
            socket.on(ClientEvents.JOIN_ROOM, async (data) => {
                try {
                    const { roomId, userName, avatarState } = data;
                    // Verificar se sala existe
                    const room = await this.meetingsService.getRoom(roomId);
                    if (!room || !room.isActive) {
                        socket.emit(ServerEvents.ERROR, { message: 'Room not found or inactive' });
                        return;
                    }
                    // Adicionar participante ao banco
                    const participant = await this.meetingsService.joinRoom({
                        roomId,
                        userId: socket.userId,
                        userName,
                        avatarState: avatarState || {
                            position: { x: 0, y: 0, z: 0 },
                            rotation: { x: 0, y: 0, z: 0 },
                            animation: 'idle'
                        }
                    });
                    socket.participantId = participant.id;
                    socket.roomId = roomId;
                    // Juntar sala do Socket.IO
                    await socket.join(roomId);
                    // Rastrear participante
                    if (!this.roomParticipants.has(roomId)) {
                        this.roomParticipants.set(roomId, new Set());
                    }
                    this.roomParticipants.get(roomId).add(socket.id);
                    // Obter lista atualizada de participantes
                    const participants = await this.meetingsService.getParticipants(roomId);
                    // Notificar todos na sala
                    this.io.to(roomId).emit(ServerEvents.PARTICIPANT_JOINED, {
                        participant: {
                            id: participant.id,
                            userId: participant.userId,
                            userName: participant.userName,
                            avatarState: participant.avatarState,
                        },
                        participants: participants.map(p => ({
                            id: p.id,
                            userId: p.userId,
                            userName: p.userName,
                            avatarState: p.avatarState,
                        }))
                    });
                    // Confirmar join ao usuário
                    socket.emit(ServerEvents.JOINED, {
                        participant,
                        participants: participants.map(p => ({
                            id: p.id,
                            userId: p.userId,
                            userName: p.userName,
                            avatarState: p.avatarState,
                        })),
                        room
                    });
                    const history = await this.meetingsService.getCollaborationHistory(roomId, 0, 200);
                    socket.emit(ServerEvents.COLLABORATION_HISTORY, history);
                    console.log(`👤 User ${userName} joined room ${roomId}`);
                }
                catch (error) {
                    console.error('Error joining room:', error);
                    socket.emit(ServerEvents.ERROR, { message: 'Failed to join room' });
                }
            });
            // UPDATE AVATAR
            socket.on(ClientEvents.UPDATE_AVATAR, async (avatarState) => {
                try {
                    if (!socket.participantId || !socket.roomId) {
                        return;
                    }
                    await this.meetingsService.updateAvatarState(socket.participantId, avatarState);
                    // Broadcast para outros na sala
                    socket.to(socket.roomId).emit(ServerEvents.AVATAR_UPDATED, {
                        participantId: socket.participantId,
                        avatarState
                    });
                }
                catch (error) {
                    console.error('Error updating avatar:', error);
                }
            });
            // SEND MESSAGE
            socket.on(ClientEvents.SEND_MESSAGE, async (data) => {
                try {
                    if (!socket.roomId || !socket.userId) {
                        return;
                    }
                    const participants = await this.meetingsService.getParticipants(socket.roomId);
                    const participant = participants.find(p => p.id === socket.participantId);
                    if (!participant) {
                        return;
                    }
                    const message = await this.meetingsService.sendMessage({
                        roomId: socket.roomId,
                        userId: socket.userId,
                        userName: participant.userName,
                        message: data.message,
                        messageType: 'text'
                    });
                    // Broadcast mensagem para todos na sala
                    this.io.to(socket.roomId).emit(ServerEvents.MESSAGE_RECEIVED, {
                        id: message.id,
                        userId: message.userId,
                        userName: message.userName,
                        message: message.message,
                        timestamp: message.timestamp
                    });
                }
                catch (error) {
                    console.error('Error sending message:', error);
                }
            });
            // CREATE ACTION (laser pointer, highlight, etc)
            socket.on(ClientEvents.CREATE_ACTION, async (data) => {
                try {
                    if (!socket.roomId || !socket.userId) {
                        return;
                    }
                    const action = await this.meetingsService.createAction({
                        roomId: socket.roomId,
                        userId: socket.userId,
                        actionType: data.actionType,
                        actionData: data.actionData,
                        targetElementId: data.targetElementId
                    });
                    // Broadcast ação para todos na sala
                    socket.to(socket.roomId).emit(ServerEvents.ACTION_CREATED, {
                        id: action.id,
                        userId: action.userId,
                        actionType: action.actionType,
                        actionData: action.actionData,
                        targetElementId: action.targetElementId,
                        timestamp: action.timestamp
                    });
                }
                catch (error) {
                    console.error('Error creating action:', error);
                }
            });
            // COLLABORATION UPDATE (Yjs/CRDT updates for selection, annotations and sections)
            socket.on(ClientEvents.COLLABORATION_UPDATE, async (data) => {
                try {
                    if (!socket.roomId || !socket.userId || !socket.participantId) {
                        return;
                    }
                    if (!Array.isArray(data.update) || data.update.length === 0) {
                        socket.emit(ServerEvents.ERROR, {
                            message: 'Invalid collaboration update payload',
                            code: 'INVALID_COLLABORATION_UPDATE'
                        });
                        return;
                    }
                    const persistedUpdate = await this.meetingsService.appendCollaborationUpdate({
                        roomId: socket.roomId,
                        userId: socket.userId,
                        participantId: socket.participantId,
                        update: data.update,
                        origin: data.origin,
                        isSnapshot: data.isSnapshot,
                    });
                    socket.to(socket.roomId).emit(ServerEvents.COLLABORATION_UPDATED, {
                        fromUserId: socket.userId,
                        fromParticipantId: socket.participantId,
                        update: data.update,
                        origin: data.origin,
                        version: persistedUpdate.version,
                        isSnapshot: persistedUpdate.isSnapshot,
                        timestamp: persistedUpdate.createdAt
                    });
                }
                catch (error) {
                    console.error('Error broadcasting collaboration update:', error);
                    socket.emit(ServerEvents.ERROR, { message: 'Failed to sync collaboration update' });
                }
            });
            // COLLABORATION HISTORY (late join/reconnect recovery)
            socket.on(ClientEvents.COLLABORATION_HISTORY_REQUEST, async (data = {}) => {
                try {
                    if (!socket.roomId) {
                        return;
                    }
                    const history = await this.meetingsService.getCollaborationHistory(socket.roomId, data.afterVersion || 0, data.limit || 200);
                    socket.emit(ServerEvents.COLLABORATION_HISTORY, history);
                }
                catch (error) {
                    console.error('Error loading collaboration history:', error);
                    socket.emit(ServerEvents.ERROR, { message: 'Failed to load collaboration history' });
                }
            });
            // LEAVE ROOM
            socket.on(ClientEvents.LEAVE_ROOM, async () => {
                await this.handleDisconnect(socket);
            });
            // DISCONNECT
            socket.on('disconnect', async () => {
                await this.handleDisconnect(socket);
                console.log(`❌ User disconnected: ${socket.userId} (${socket.id})`);
            });
        });
    }
    async handleDisconnect(socket) {
        if (socket.participantId && socket.roomId) {
            try {
                await this.meetingsService.leaveRoom(socket.participantId);
                // Remover do rastreamento
                const participants = this.roomParticipants.get(socket.roomId);
                if (participants) {
                    participants.delete(socket.id);
                    if (participants.size === 0) {
                        this.roomParticipants.delete(socket.roomId);
                    }
                }
                // Notificar outros participantes
                socket.to(socket.roomId).emit(ServerEvents.PARTICIPANT_LEFT, {
                    participantId: socket.participantId
                });
                socket.leave(socket.roomId);
            }
            catch (error) {
                console.error('Error handling disconnect:', error);
            }
        }
    }
    getIO() {
        return this.io;
    }
}
//# sourceMappingURL=meetings.gateway.js.map