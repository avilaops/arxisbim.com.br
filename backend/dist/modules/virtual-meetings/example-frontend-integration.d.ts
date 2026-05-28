/**
 * EXEMPLO DE INTEGRAÇÃO FRONTEND - Virtual Meetings
 *
 * Este arquivo mostra como integrar o módulo de reuniões virtuais
 * em um componente React/Vue/Angular
 */
declare class VirtualMeetingManager {
    private baseUrl;
    private token;
    private socket;
    private roomId;
    private participantId;
    onParticipantJoined?: (participant: any) => void;
    onParticipantLeft?: (participantId: string) => void;
    onAvatarUpdated?: (participantId: string, avatarState: any) => void;
    onMessageReceived?: (message: any) => void;
    onActionCreated?: (action: any) => void;
    constructor(baseUrl: string, token: string);
    /**
     * Conectar ao servidor WebSocket
     */
    connect(): Promise<void>;
    /**
     * Configurar listeners de eventos
     */
    private setupListeners;
    /**
     * Entrar em uma sala
     */
    joinRoom(roomId: string, userName: string): void;
    /**
     * Atualizar posição do avatar
     */
    updateAvatar(position: {
        x: number;
        y: number;
        z: number;
    }, rotation: {
        x: number;
        y: number;
        z: number;
    }, animation?: string): void;
    /**
     * Enviar mensagem
     */
    sendMessage(message: string): void;
    /**
     * Criar ação (laser pointer, etc)
     */
    createAction(actionType: string, actionData: any, targetElementId?: string): void;
    /**
     * Sair da sala
     */
    leaveRoom(): void;
    /**
     * Desconectar
     */
    disconnect(): void;
}
export default VirtualMeetingManager;
//# sourceMappingURL=example-frontend-integration.d.ts.map