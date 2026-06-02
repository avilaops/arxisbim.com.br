# Multiplayer Realtime - Implementação Básica

## 🌐 Overview

Sistema de colaboração em tempo real para múltiplos usuários com sincronização de ações, chat, avatares e gerenciamento de salas via WebSocket.

**Nota:** Esta é uma implementação básica focada em sincronização de estado e chat. Features avançadas como WebRTC (áudio/vídeo) e avatares 3D serão implementadas em fases futuras.

---

## 🎯 Features Implementadas

### Frontend
- ✅ Gerenciamento de salas (criar, entrar, sair)
- ✅ Lista de participantes
- ✅ Chat de texto com menções e replies
- ✅ Sincronização de ações (navegação, seleção, anotações)
- ✅ Estado de avatar (posição, rotação)
- ✅ Sistema de eventos (join, leave, message, action)
- ✅ Gerenciamento de conexão (connect, disconnect, reconnect)
- ✅ Monitoramento de qualidade de conexão
- ✅ WebSocket client

### Pendente (Futuro)
- ⏳ WebRTC para áudio/vídeo
- ⏳ Screen sharing
- ⏳ Avatares 3D renderizados
- ⏳ CRDT para resolução de conflitos (Yjs)
- ⏳ Histórico e replay de ações
- ⏳ Backend WebSocket server completo

---

## 💻 Usage

### Criar e Entrar em Sala

```typescript
import { MultiplayerRealtimeService } from './features/multiplayer-realtime';

// Criar nova sala
const roomId = await MultiplayerRealtimeService.createRoom({
  name: 'Revisão Projeto ABC',
  projectId: 'proj-123',
  modelId: 'model-456',
  maxParticipants: 20,
  enableChat: true
});

console.log('Room created:', roomId);

// Entrar na sala
await MultiplayerRealtimeService.joinRoom(roomId, {
  userId: 'user-123',
  name: 'João Silva',
  email: 'joao@empresa.com',
  avatar: 'https://example.com/avatar.png',
  role: 'editor'
});

console.log('Joined room successfully');
```

### Sincronizar Navegação

```typescript
import type { NavigationAction } from './features/multiplayer-realtime';

// Sincronizar posição da câmera
MultiplayerRealtimeService.syncAction({
  type: 'navigation',
  userId: 'user-123',
  data: {
    position: [10, 5, 20],
    target: [0, 0, 0],
    fov: 75
  }
});
```

### Sincronizar Seleção

```typescript
import type { SelectionAction } from './features/multiplayer-realtime';

// Sincronizar elementos selecionados
MultiplayerRealtimeService.syncAction({
  type: 'selection',
  userId: 'user-123',
  data: {
    expressIds: [1234, 5678, 9012],
    mode: 'set'
  }
});
```

### Chat de Texto

```typescript
// Enviar mensagem simples
MultiplayerRealtimeService.sendChatMessage('Olá pessoal!');

// Enviar mensagem com menção
MultiplayerRealtimeService.sendChatMessage(
  '@João veja isso aqui',
  ['user-456'], // mentioned user IDs
);

// Responder mensagem
MultiplayerRealtimeService.sendChatMessage(
  'Entendi, obrigado!',
  undefined, // no mentions
  'msg-789'  // reply to message ID
);
```

### Atualizar Avatar

```typescript
// Atualizar posição do avatar
MultiplayerRealtimeService.updateAvatar({
  position: [15, 0, 10],
  rotation: [0, Math.PI / 2, 0],
  animation: 'walk',
  color: '#FF5733'
});
```

### Lista de Participantes

```typescript
// Obter todos os participantes
const participants = MultiplayerRealtimeService.getParticipants();

participants.forEach(p => {
  console.log(`${p.user.name} (${p.user.role})`);
  console.log(`  Connected: ${p.connectionState}`);
  console.log(`  Joined: ${p.joinedAt}`);
});

// Obter participante atual
const currentUser = MultiplayerRealtimeService.getCurrentParticipant();
console.log('Current user:', currentUser?.user.name);
```

### Estado da Sala

```typescript
// Obter estado completo da sala
const roomState = MultiplayerRealtimeService.getRoomState();

if (roomState) {
  console.log('Room ID:', roomState.roomId);
  console.log('Room Name:', roomState.options.name);
  console.log('Participants:', roomState.participants.length);
  console.log('Messages:', roomState.messages.length);
  console.log('Connection:', roomState.connectionState);
}
```

### Eventos de Participantes

```typescript
// Participante entrou
const unsubJoined = MultiplayerRealtimeService.onParticipantJoined((participant) => {
  console.log(`${participant.user.name} entrou na sala`);
  
  // Exibir notificação na UI
  showNotification(`${participant.user.name} entrou`, 'success');
});

// Participante saiu
const unsubLeft = MultiplayerRealtimeService.onParticipantLeft((participantId) => {
  console.log(`Participante ${participantId} saiu da sala`);
  
  // Atualizar lista de participantes na UI
  updateParticipantsList();
});

// Cleanup
unsubJoined();
unsubLeft();
```

### Eventos de Chat

```typescript
// Receber mensagens
const unsubChat = MultiplayerRealtimeService.onChatMessage((message) => {
  console.log(`${message.userName}: ${message.content}`);
  
  // Adicionar à UI de chat
  addMessageToChat({
    author: message.userName,
    content: message.content,
    timestamp: message.timestamp,
    mentions: message.mentions,
    replyTo: message.replyTo
  });
  
  // Notificar se foi mencionado
  const currentUser = MultiplayerRealtimeService.getCurrentParticipant();
  if (message.mentions?.includes(currentUser?.user.userId || '')) {
    playNotificationSound();
  }
});

// Cleanup
unsubChat();
```

### Eventos de Ações

```typescript
// Receber ações sincronizadas
const unsubAction = MultiplayerRealtimeService.onAction((action) => {
  console.log('Action received:', action.type, action.data);
  
  switch (action.type) {
    case 'navigation':
      // Atualizar visualização da câmera de outro usuário
      const navData = action.data;
      showRemoteCamera(action.userId, navData.position, navData.target);
      break;
    
    case 'selection':
      // Highlight elementos selecionados por outro usuário
      const selData = action.data;
      highlightRemoteSelection(action.userId, selData.expressIds);
      break;
    
    case 'annotation':
      // Mostrar anotação de outro usuário
      showRemoteAnnotation(action.data);
      break;
  }
});

// Cleanup
unsubAction();
```

### Eventos de Avatar

```typescript
// Avatar atualizado
const unsubAvatar = MultiplayerRealtimeService.onAvatarUpdated((participantId, state) => {
  console.log(`Avatar updated for ${participantId}:`, state);
  
  // Atualizar posição do avatar 3D na cena
  updateAvatarPosition(participantId, state.position, state.rotation);
  
  // Atualizar animação
  if (state.animation) {
    playAvatarAnimation(participantId, state.animation);
  }
});

// Cleanup
unsubAvatar();
```

### Eventos de Conexão

```typescript
// Monitorar estado de conexão
const unsubConnection = MultiplayerRealtimeService.onConnectionStateChange((state) => {
  console.log('Connection state:', state);
  
  switch (state) {
    case 'connecting':
      showConnectionStatus('Conectando...', 'info');
      break;
    
    case 'connected':
      showConnectionStatus('Conectado', 'success');
      break;
    
    case 'reconnecting':
      showConnectionStatus('Reconectando...', 'warning');
      break;
    
    case 'disconnected':
      showConnectionStatus('Desconectado', 'error');
      break;
  }
});

// Cleanup
unsubConnection();
```

### Sair da Sala

```typescript
// Sair e limpar conexão
MultiplayerRealtimeService.leaveRoom();

console.log('Left room and disconnected');
```

### Qualidade de Conexão

```typescript
// Obter métricas de conexão
const quality = MultiplayerRealtimeService.getConnectionQuality();

console.log(`Latência: ${quality.latency}ms`);
console.log(`Perda de pacotes: ${(quality.packetLoss * 100).toFixed(2)}%`);
console.log(`Largura de banda: ${quality.bandwidth}kbps`);
console.log(`Qualidade: ${quality.quality}/5`);

// Exibir indicador na UI
if (quality.quality < 3) {
  showConnectionWarning('Conexão instável detectada');
}
```

### Integração com SelectionService

```typescript
import { SelectionService } from './selection.service';

// Sincronizar seleção local
SelectionService.onSelectionChange((selection) => {
  MultiplayerRealtimeService.syncAction({
    type: 'selection',
    userId: getCurrentUserId(),
    data: {
      expressIds: selection.expressIds,
      mode: 'set'
    }
  });
});

// Aplicar seleção remota
MultiplayerRealtimeService.onAction((action) => {
  if (action.type === 'selection' && action.userId !== getCurrentUserId()) {
    // Highlight elementos selecionados por outro usuário
    highlightRemoteSelection(action.userId, action.data.expressIds);
  }
});
```

### Integração com NavigationService

```typescript
import { NavigationService } from './navigation.service';

// Sincronizar navegação local
NavigationService.onCameraChange((camera) => {
  MultiplayerRealtimeService.syncAction({
    type: 'navigation',
    userId: getCurrentUserId(),
    data: {
      position: camera.position.toArray(),
      target: camera.target.toArray(),
      fov: camera.fov
    }
  });
});

// Exibir câmeras de outros usuários
MultiplayerRealtimeService.onAction((action) => {
  if (action.type === 'navigation' && action.userId !== getCurrentUserId()) {
    showRemoteCamera(action.userId, action.data.position, action.data.target);
  }
});
```

---

## 🔧 Tipos de Ação

| Tipo | Descrição | Data |
|------|-----------|------|
| `navigation` | Navegação da câmera | `{ position, target, fov }` |
| `selection` | Seleção de elementos | `{ expressIds, mode }` |
| `annotation` | Anotação/marcação | Custom data |
| `camera` | Estado da câmera | Custom data |
| `property_edit` | Edição de propriedade | Custom data |
| `custom` | Ação customizada | Custom data |

---

## 👥 Roles de Participante

| Role | Permissões |
|------|-----------|
| `owner` | Controle total da sala |
| `admin` | Gerenciar participantes |
| `editor` | Editar e sincronizar |
| `viewer` | Apenas visualizar |

---

## 🔌 Estados de Conexão

| Estado | Descrição |
|--------|-----------|
| `connecting` | Estabelecendo conexão |
| `connected` | Conectado à sala |
| `reconnecting` | Tentando reconectar |
| `disconnected` | Desconectado |

---

## 🧪 Testing

```typescript
// Unit test
describe('MultiplayerRealtimeService', () => {
  beforeEach(() => {
    MultiplayerRealtimeService.leaveRoom();
  });

  test('createRoom generates roomId', async () => {
    const roomId = await MultiplayerRealtimeService.createRoom({
      name: 'Test Room'
    });
    
    expect(roomId).toBeDefined();
    expect(roomId).toContain('room_');
  });

  test('syncAction sends action', () => {
    // Mock WebSocket
    const mockSend = jest.fn();
    // ... setup mock

    MultiplayerRealtimeService.syncAction({
      type: 'selection',
      userId: 'user-1',
      data: { expressIds: [123] }
    });

    expect(mockSend).toHaveBeenCalled();
  });

  test('onChatMessage triggers callback', () => {
    const callback = jest.fn();
    const unsub = MultiplayerRealtimeService.onChatMessage(callback);

    // ... simulate message

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.any(String),
      userId: expect.any(String)
    }));

    unsub();
  });
});
```

---

## 🚀 Próximos Passos

### Backend
- [ ] WebSocket server completo (Socket.io ou WS)
- [ ] Room persistence (DB)
- [ ] Authentication e authorization
- [ ] Rate limiting e abuse prevention
- [ ] Metrics e monitoring

### Frontend Avançado
- [ ] WebRTC para áudio/vídeo P2P
- [ ] Screen sharing
- [ ] Avatares 3D renderizados no viewer
- [ ] CRDT (Yjs) para resolução de conflitos
- [ ] Cursor compartilhado (SharedCursor)
- [ ] Desenho colaborativo (Canvas sync)
- [ ] Histórico de ações e replay
- [ ] Late join otimizado
- [ ] Sincronização de propriedades IFC

### UI
- [ ] Chat panel completo
- [ ] Participants list com avatares
- [ ] Video grid para chamadas
- [ ] Screen share viewer
- [ ] Connection quality indicator
- [ ] Notification system

---

## 📚 References

- [Frontend Types](../frontend/src/features/multiplayer-realtime/multiplayer-realtime.types.ts)
- [Frontend Service](../frontend/src/features/multiplayer-realtime/multiplayer-realtime.service.ts)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Socket.io](https://socket.io/)
- [WebRTC](https://webrtc.org/)
- [Yjs CRDT](https://yjs.dev/)
