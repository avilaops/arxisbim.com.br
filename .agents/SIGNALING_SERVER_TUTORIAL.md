# Signaling Server — Tutorial Completo

## O que é o Signaling Server?

Imagine que você e um arquiteto estão navegando pelo mesmo modelo BIM em 3D ao mesmo tempo.
Você move o cursor laser para um pilar. Ele vê o laser se mover em tempo real na tela dele.
Você muda o material de uma parede. A parede muda na tela dele instantaneamente.
Ele digita uma anotação. Aparece flutuando no modelo para você.

**Quem faz tudo isso acontecer é o Signaling Server.**

Ele é o "roteador de eventos" em tempo real do ArxisVR. Enquanto o backend REST (`api.arxisvr.avilaops.com`) cuida de autenticação, banco de dados e regras de negócio, o Signaling Server cuida de **o que está acontecendo agora** dentro de uma sessão colaborativa.

---

## Onde roda

| Ambiente | Endereço |
|---|---|
| Dev | `ws://localhost:3002` |
| Prod | `wss://api.arxisvr.avilaops.com` (mesma instância do backend) |

> Em produção o Render expõe o WebSocket na mesma URL do backend.
> O frontend se conecta via `VITE_WS_URL`.

---

## Arquitetura em uma linha

```
Browser A ──WebSocket──► Signaling Server ──WebSocket──► Browser B
                               │
                               │ HTTP interno
                               ▼
                         Backend :3001 (persiste eventos no DB)
```

O signaling **não tem banco de dados próprio**. Todo o estado fica em memória (rooms, clients). O que precisa persistir (anotações, chat, movimentos de objeto) ele envia pro backend via HTTP interno com `X-Internal-Key`.

---

## Mensagens disponíveis

### 🔐 Autenticação e Sala

#### `join_room` — Entrar em uma sala
```json
{
  "type": "join_room",
  "roomId": "room_abc123",
  "userId": "user_456",
  "displayName": "Nicolas",
  "accessToken": "<JWT de sessão>"
}
```
- Se `accessToken` for enviado: valida JWT e extrai `role`, `permissions`, `sessionId`
- Se só `userId`: modo simplificado (frontend já autenticou)
- Responde com `room_joined` + lista de quem já está na sala
- Notifica os outros com `user_joined`

#### `leave_room` — Sair
```json
{ "type": "leave_room" }
```
Notifica todos com `user_left`. Sala vazia é removida da memória.

---

### 📡 WebRTC — Negociação de Peer-to-Peer

O signaling não transmite áudio/vídeo diretamente. Ele faz a **troca de envelopes** para que os browsers se conectem diretamente entre si (P2P). É o "carteiro" do WebRTC.

#### `offer` — Browser A propõe conexão para B
```json
{
  "type": "offer",
  "to": "participantId_do_B",
  "offer": { "type": "offer", "sdp": "v=0\r\no=- ..." }
}
```

#### `answer` — Browser B aceita
```json
{
  "type": "answer",
  "to": "participantId_do_A",
  "answer": { "type": "answer", "sdp": "v=0\r\no=- ..." }
}
```

#### `ice_candidate` — Trocar candidatos de rede
```json
{
  "type": "ice_candidate",
  "to": "participantId_alvo",
  "candidate": { "candidate": "candidate:...", "sdpMid": "0" }
}
```

> Após essa troca, os dois browsers se falam **direto** — o signaling sai do caminho.

---

### 🧍 Presença em Tempo Real

#### `position_update` — Onde estou no modelo 3D
```json
{
  "type": "position_update",
  "x": 10.5,
  "y": 0.0,
  "z": -3.2,
  "yaw": 1.57
}
```
Broadcast para toda a sala (exceto quem enviou). **Alta frequência — não persiste no DB.**

#### `avatar_update` — Mudei meu avatar
```json
{
  "type": "avatar_update",
  "avatarConfig": {
    "color": "#FF5733",
    "model": "architect_v2",
    "hardhat": true
  }
}
```

---

### 🏗️ Colaboração no Modelo BIM

Esses eventos **requerem permissão `mutate` ou role `architect`**. Se não tiver, o servidor retorna `error`.

#### `material_changed` — Mudei o material de um objeto
```json
{
  "type": "material_changed",
  "object": "wall_pilar_42",
  "material": {
    "name": "Concreto Aparente",
    "color": "#8B8680",
    "roughness": 0.9
  }
}
```
→ Broadcast + persiste no DB como `material_changed`

#### `object_moved` — Movi/rotacionei um elemento
```json
{
  "type": "object_moved",
  "object": "janela_sala_01",
  "position": { "x": 5.2, "y": 2.1, "z": 0.0 },
  "rotation": { "x": 0, "y": 90, "z": 0 }
}
```
→ Broadcast + persiste no DB

---

### 🖊️ Anotações e Comunicação

#### `laser_pointed` — Ponteiro laser no modelo
```json
{
  "type": "laser_pointed",
  "x": 3.14,
  "y": 1.80,
  "z": -2.0,
  "text": "Aqui precisa de reforço estrutural"
}
```
- Sem `text`: só broadcast visual (não persiste)
- Com `text`: persiste como `annotation_added` no DB

#### `annotation_added` — Nota fixa no espaço 3D
```json
{
  "type": "annotation_added",
  "x": 3.14,
  "y": 1.80,
  "z": -2.0,
  "text": "Verificar tubulação hidráulica neste ponto"
}
```
→ Broadcast + persiste no DB

#### `chat_message` — Chat da sessão
```json
{
  "type": "chat_message",
  "content": "Alguém revisou o memorial descritivo?"
}
```
→ Broadcast + persiste no DB

#### `ping` — Keep-alive manual
```json
{ "type": "ping" }
```
Responde com `{ "type": "pong", "timestamp": 1234567890 }`

---

## Eventos que o servidor ENVIA para o cliente

| Tipo | Quando |
|---|---|
| `room_joined` | Confirmação de entrada na sala |
| `user_joined` | Alguém novo entrou na sua sala |
| `user_left` | Alguém saiu ou caiu |
| `offer` / `answer` / `ice_candidate` | Relay WebRTC |
| `position_update` | Posição de outro participante |
| `avatar_update` | Avatar de outro participante mudou |
| `material_changed` | Alguém mudou um material |
| `object_moved` | Alguém moveu um objeto |
| `laser_pointed` | Ponteiro laser de outro participante |
| `annotation_added` | Nova anotação no modelo |
| `chat_message` | Mensagem no chat da sessão |
| `server_shutdown` | Servidor vai reiniciar (graceful) |
| `error` | Erro (token inválido, sem permissão, etc.) |

---

## Roles e Permissões

| Role | Pode fazer |
|---|---|
| `viewer` | Ver, mover avatar, laser, chat |
| `architect` | Tudo + mover objetos + mudar materiais |
| `admin` | Tudo |

A permissão `mutate` no JWT também libera `material_changed` e `object_moved`.

---

## Exemplo completo: conectar e colaborar

```javascript
const ws = new WebSocket('ws://localhost:3002');

ws.onopen = () => {
  // 1. Entrar na sala
  ws.send(JSON.stringify({
    type: 'join_room',
    roomId: 'room_projeto_residencial',
    userId: 'nicolas',
    displayName: 'Nicolas',
  }));
};

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);

  switch (msg.type) {
    case 'room_joined':
      console.log(`Na sala! Membros: ${msg.members.length}`);

      // 2. Mover no espaço 3D (60fps)
      setInterval(() => {
        ws.send(JSON.stringify({
          type: 'position_update',
          x: Math.random() * 10,
          y: 0,
          z: Math.random() * 10,
          yaw: 0,
        }));
      }, 16);
      break;

    case 'user_joined':
      console.log(`${msg.displayName} entrou!`);
      // Iniciar WebRTC com msg.participantId
      break;

    case 'position_update':
      // Mover avatar do msg.userId no 3D
      updateAvatarPosition(msg.userId, msg.x, msg.y, msg.z, msg.yaw);
      break;

    case 'material_changed':
      // Atualizar material no Three.js
      applyMaterial(msg.object, msg.material);
      break;

    case 'annotation_added':
      // Criar sprite 3D na posição
      addAnnotationSprite(msg.x, msg.y, msg.z, msg.text, msg.userId);
      break;
  }
};

// 3. Mudar material (requer role architect)
function changeMaterial(objectName, material) {
  ws.send(JSON.stringify({
    type: 'material_changed',
    object: objectName,
    material,
  }));
}

// 4. Deixar anotação no espaço
function addAnnotation(x, y, z, text) {
  ws.send(JSON.stringify({
    type: 'annotation_added',
    x, y, z, text,
  }));
}
```

---

## Heartbeat — Detecção de conexões mortas

A cada **30 segundos** o servidor envia um `ping` WebSocket nativo para todos os clientes.
Se o cliente não responder com `pong` no próximo ciclo, é considerado morto e desconectado.
Isso garante que `user_left` é emitido mesmo quando o browser fecha sem avisar.

```
Servidor  ──ping──►  Cliente
Servidor  ◄──pong──  Cliente   ✅ vivo
Servidor  ──ping──►  Cliente
                               (sem resposta)
Servidor  ──terminate──►       ❌ morto → user_left emitido
```

---

## Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/health"
# { status: "ok", rooms: 2, connections: 5, uptime: 3600 }
```

Usado pelo Render para saber se o serviço está vivo.

---

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `SIGNALING_PORT` | `3002` | Porta do servidor |
| `JWT_SECRET` | — | Chave para validar tokens de participante |
| `BACKEND_URL` | `http://localhost:3001` | URL do backend para persistir eventos |
| `INTERNAL_API_KEY` | `internal` | Chave para chamadas internas backend |
| `LOG_VERBOSE` | `false` | Logs detalhados (dev) |

---

## Fluxo completo de uma sessão

```
1. Backend cria sessão → gera JWT com { participantId, role, permissions, sessionId }
2. Frontend recebe JWT → conecta no WS → envia join_room com accessToken
3. Signaling valida JWT → adiciona à sala → notifica todos
4. Participantes trocam offer/answer/ice → estabelecem P2P para áudio/vídeo
5. Durante a sessão: position_update, laser, chat, material_changed fluem pelo signaling
6. Signaling persiste eventos críticos no backend via HTTP interno
7. Ao fechar: leave_room ou heartbeat timeout → user_left emitido → sala pode ser removida
```
