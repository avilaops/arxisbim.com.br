# 33- MultiplayerRealtime

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo MultiplayerRealtime, responsável por gerenciar colaboração em tempo real, avatares, áudio/vídeo e sincronização de estado em sessões BIM/IFC multi-usuário.

## Responsabilidades Detalhadas
- Gerenciar sessões colaborativas em tempo real (multi-usuário, multi-tenant)
- Sincronizar estado de navegação, seleção, anotações e ações entre participantes
- Controlar avatares (posição, rotação, animação, gestos)
- Gerenciar áudio/vídeo (WebRTC, screen share, chat)
- Expor API para criação de salas, join/leave, comunicação e sincronização
- Integrar com NavigationService, SelectionService, SceneSystem, UI, controllers, plugins e backend
- Suportar múltiplos modos de colaboração (XR, desktop, mobile)
- Emitir eventos de join, leave, atualização, mensagem e erro
- Permitir extensões/plugins para novos tipos de colaboração e integrações
- Suportar histórico de colaboração, late join e replay
- Gerenciar performance, latência e qualidade de conexão

## APIs/Contratos
- Métodos principais:
  - `createRoom(options: RoomOptions): Promise<string>` — Criar sala
  - `joinRoom(roomId: string, user: UserSession): Promise<void>` — Entrar na sala
  - `leaveRoom(): void` — Sair da sala
  - `getParticipants(): Participant[]` — Lista de participantes
  - `sendChatMessage(message: string): void` — Enviar mensagem
  - `updateAvatar(state: AvatarState): void` — Atualizar avatar
  - `syncAction(action: CollaborationAction): void` — Sincronizar ação
  - `onParticipantJoined(callback: (participant: Participant) => void): UnsubscribeFn` — Evento
  - `onParticipantLeft(callback: (participantId: string) => void): UnsubscribeFn` — Evento
  - `onAvatarUpdated(callback: (participantId: string, state: AvatarState) => void): UnsubscribeFn` — Evento
  - `onChatMessage(callback: (message: ChatMessage) => void): UnsubscribeFn` — Evento
  - `onAction(callback: (action: CollaborationAction) => void): UnsubscribeFn` — Evento
  - `startAudio(): Promise<void>` — Iniciar áudio
  - `stopAudio(): void` — Parar áudio
  - `startVideo(): Promise<void>` — Iniciar vídeo
  - `stopVideo(): void` — Parar vídeo
  - `shareScreen(): Promise<void>` — Compartilhar tela
  - `stopScreenShare(): void` — Parar compartilhamento
- Suporte a integração com WebSocket, WebRTC, backend, UI, plugins

## Fluxos Detalhados
### Criação e Join de Sala
1. Usuário cria sala ou entra em sala existente
2. Conexão estabelecida via WebSocket
3. Autenticação e validação de permissões
4. Estado inicial sincronizado
5. Emissão de eventos para UI e controllers

### Sincronização de Estado
1. Usuário navega, seleciona ou executa ação
2. Estado capturado e enviado via WebSocket
3. Broadcast para todos os participantes
4. Atualização local e remota
5. Suporte a CRDT (Yjs) para conflitos

### Avatares e Navegação
1. Posição e rotação do avatar atualizadas em tempo real
2. Interpolação suave de movimento
3. Suporte a animações (idle, walk, gesture)
4. Integração com NavigationService e SceneSystem

### Chat e Comunicação
1. Envio de mensagens de texto
2. Broadcast para todos os participantes
3. Histórico de mensagens
4. Suporte a menções e reações

### Áudio/Vídeo (WebRTC)
1. Estabelecimento de conexões P2P via WebRTC
2. Captura de microfone e câmera
3. Streaming de áudio/vídeo
4. Screen share e apresentações
5. Integração com signaling server

### Late Join e Replay
1. Novos participantes recebem histórico completo
2. Replay de ações e estado
3. Sincronização de contexto
4. Integração com CRDT e backend

### Performance e Qualidade
1. Monitoramento de latência e qualidade de conexão
2. Adaptação de qualidade (bitrate, resolução)
3. Fallback para conexões instáveis
4. Logs de erro e reconexão

## Exemplos de Uso Avançados
```typescript
// Criar e entrar em sala
const roomId = await multiplayerRealtime.createRoom({ name: 'Revisão Projeto X' });
await multiplayerRealtime.joinRoom(roomId, { name: 'João', avatar: 'avatar1.glb' });

// Sincronizar seleção
multiplayerRealtime.syncAction({
  type: 'selection',
  expressIds: [1234, 5678],
  userId: 'user-1'
});

// Atualizar avatar
multiplayerRealtime.updateAvatar({
  position: [10, 0, 5],
  rotation: [0, 1.5, 0],
  animation: 'walk'
});

// Iniciar áudio/vídeo
await multiplayerRealtime.startAudio();
await multiplayerRealtime.startVideo();

// Ouvir eventos
multiplayerRealtime.onParticipantJoined((p) => showNotification(`${p.name} entrou`));
multiplayerRealtime.onChatMessage((msg) => displayMessage(msg));
```

## Pontos de Integração Detalhados
- **NavigationService:** Sincronização de navegação e câmera
- **SelectionService:** Sincronização de seleção e highlight
- **SceneSystem:** Renderização de avatares e estado compartilhado
- **UI:** Painéis de chat, participantes, áudio/vídeo
- **Controllers:** Orquestração de colaboração, workflows
- **Backend:** WebSocket, signaling, persistência de histórico
- **WebRTC:** Áudio/vídeo P2P, screen share
- **Plugins/Extensões:** Novos tipos de colaboração, integrações

## Critérios de Qualidade
- Sincronização em tempo real com baixa latência
- Suporte a múltiplos participantes e modos de colaboração
- Performance otimizada para áudio/vídeo e estado
- Testes unitários e de integração para todos os fluxos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos tipos de colaboração
- Monitoramento de latência, qualidade e reconexão

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo MultiplayerRealtime do frontend, cobrindo colaboração avançada em tempo real, avatares, áudio/vídeo, sincronização, WebRTC e critérios de qualidade.
