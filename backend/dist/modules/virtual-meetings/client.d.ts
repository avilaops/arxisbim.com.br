import type { JoinRoomRequest, UpdateAvatarRequest, CreateActionRequest } from './types.js';
export declare class VirtualMeetingsClient {
    private socket;
    private token;
    private baseUrl;
    private eventHandlers;
    constructor(baseUrl: string, token: string);
    /**
     * Conectar ao servidor WebSocket
     */
    connect(): Promise<void>;
    /**
     * Desconectar do servidor
     */
    disconnect(): void;
    /**
     * Entrar em uma sala de reunião
     */
    joinRoom(request: JoinRoomRequest): void;
    /**
     * Sair da sala de reunião
     */
    leaveRoom(): void;
    /**
     * Atualizar estado do avatar
     */
    updateAvatar(avatarState: UpdateAvatarRequest): void;
    /**
     * Enviar mensagem de chat
     */
    sendMessage(message: string): void;
    /**
     * Criar ação (laser pointer, annotation, etc)
     */
    createAction(action: CreateActionRequest): void;
    /**
     * Configurar listeners para eventos do servidor
     */
    private setupEventListeners;
    /**
     * Registrar handler para evento
     */
    on(event: string, handler: Function): void;
    /**
     * Remover handler de evento
     */
    off(event: string, handler: Function): void;
    /**
     * Emitir evento local
     */
    private emit;
    /**
     * Verificar se está conectado
     */
    isConnected(): boolean;
}
/**
 * Criar cliente de reuniões virtuais
 */
export declare function createMeetingsClient(baseUrl: string, token: string): VirtualMeetingsClient;
//# sourceMappingURL=client.d.ts.map