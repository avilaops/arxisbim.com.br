/**
 * ArxisVR Signaling Server
 * WebSocket server para coordenação WebRTC (signaling)
 * 
 * Suporta:
 * - Gerenciamento de salas
 * - Troca de SDP (offer/answer)
 * - ICE candidate exchange
 * - Avatar/position sync
 * - Auto-cleanup de usuários desconectados
 * - Heartbeat para detectar conexões mortas
 */

const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// ========== CONFIGURAÇÃO ==========

const PORT = process.env.SIGNALING_PORT || process.env.PORT || 8080;
const HEARTBEAT_INTERVAL = 30000; // 30 segundos
const LOG_VERBOSE = process.env.LOG_VERBOSE === 'true';

// ========== ESTADO DO SERVIDOR ==========

const rooms = new Map(); // roomId -> Set<WebSocket>
const users = new Map(); // WebSocket -> { userId, roomId }

// ========== SERVIDOR HTTP + WEBSOCKET ==========

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      connections: users.size,
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

// ========== FUNÇÕES AUXILIARES ==========

/**
 * Broadcast mensagem para todos na sala (exceto sender)
 */
function broadcastToRoom(roomId, message, excludeSocket = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  const data = JSON.stringify(message);
  
  room.forEach((client) => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });

  if (LOG_VERBOSE) {
    console.log(`[Broadcast] Room ${roomId}: ${message.type}`);
  }
}

/**
 * Encontra socket do usuário pelo userId
 */
function findUserSocket(targetUserId) {
  for (const [socket, user] of users.entries()) {
    if (user.userId === targetUserId && socket.readyState === WebSocket.OPEN) {
      return socket;
    }
  }
  return null;
}

/**
 * Pega lista de userIds na sala
 */
function getRoomUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];

  return Array.from(room)
    .map(socket => users.get(socket)?.userId)
    .filter(Boolean);
}

/**
 * Limpa usuário desconectado
 */
function cleanupUser(ws) {
  const user = users.get(ws);
  if (!user) return;

  const { userId, roomId } = user;

  // Remove da sala
  if (roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.delete(ws);
      
      // Notifica outros usuários
      broadcastToRoom(roomId, {
        type: 'user_left',
        userId,
        timestamp: Date.now()
      });

      // Remove sala se vazia
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[Room] 🗑️  Sala vazia deletada: ${roomId}`);
      } else {
        console.log(`[Room] 👋 User ${userId} saiu (${room.size} restantes)`);
      }
    }
  }

  users.delete(ws);
  console.log(`[Connection] ❌ Desconectado: ${userId}`);
}

// ========== HANDLERS DE MENSAGENS ==========

function handleJoinRoom(ws, message) {
  const { roomId, userId } = message;

  if (!roomId || !userId) {
    ws.send(JSON.stringify({
      type: 'error',
      error: 'Missing roomId or userId'
    }));
    return;
  }

  // Criar sala se não existe
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
    console.log(`[Room] 🆕 Nova sala criada: ${roomId}`);
  }

  // Adicionar user
  users.set(ws, { userId, roomId });
  const room = rooms.get(roomId);
  room.add(ws);

  // Get existing users
  const existingUsers = getRoomUsers(roomId).filter(id => id !== userId);

  console.log(`[Room] ✅ User ${userId} entrou em ${roomId} (total: ${room.size})`);

  // Confirmar para user
  ws.send(JSON.stringify({
    type: 'room_joined',
    roomId,
    userId,
    users: existingUsers,
    timestamp: Date.now()
  }));

  // Notificar outros users
  broadcastToRoom(roomId, {
    type: 'user_joined',
    userId,
    timestamp: Date.now()
  }, ws);
}

function handleLeaveRoom(ws, message) {
  const user = users.get(ws);
  if (!user) return;

  const { userId, roomId } = user;

  if (roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.delete(ws);
      
      // Notifica outros
      broadcastToRoom(roomId, {
        type: 'user_left',
        userId,
        timestamp: Date.now()
      });

      // Remove sala se vazia
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[Room] 🗑️  Sala vazia deletada: ${roomId}`);
      }
    }
  }

  // Atualizar user (remover roomId mas manter conexão)
  users.set(ws, { userId, roomId: null });

  ws.send(JSON.stringify({
    type: 'room_left',
    roomId,
    timestamp: Date.now()
  }));

  console.log(`[Room] 👋 User ${userId} saiu de ${roomId}`);
}

function handleOffer(ws, message) {
  const { to, from, offer } = message;

  if (!to || !from || !offer) {
    console.warn('[WebRTC] ⚠️  Offer inválido: campos faltando');
    return;
  }

  const targetSocket = findUserSocket(to);
  if (targetSocket) {
    targetSocket.send(JSON.stringify({
      type: 'offer',
      from,
      offer,
      timestamp: Date.now()
    }));
    
    if (LOG_VERBOSE) {
      console.log(`[WebRTC] 📤 Offer: ${from} → ${to}`);
    }
  } else {
    console.warn(`[WebRTC] ⚠️  User ${to} não encontrado para offer`);
  }
}

function handleAnswer(ws, message) {
  const { to, from, answer } = message;

  if (!to || !from || !answer) {
    console.warn('[WebRTC] ⚠️  Answer inválido: campos faltando');
    return;
  }

  const targetSocket = findUserSocket(to);
  if (targetSocket) {
    targetSocket.send(JSON.stringify({
      type: 'answer',
      from,
      answer,
      timestamp: Date.now()
    }));
    
    if (LOG_VERBOSE) {
      console.log(`[WebRTC] 📥 Answer: ${from} → ${to}`);
    }
  } else {
    console.warn(`[WebRTC] ⚠️  User ${to} não encontrado para answer`);
  }
}

function handleIceCandidate(ws, message) {
  const { to, from, candidate } = message;

  if (!to || !from || !candidate) {
    return; // Silencioso - muito verbose
  }

  const targetSocket = findUserSocket(to);
  if (targetSocket) {
    targetSocket.send(JSON.stringify({
      type: 'ice_candidate',
      from,
      candidate,
      timestamp: Date.now()
    }));
    
    // Não loga - muito verbose
  }
}

function handleAvatarUpdate(ws, message) {
  const user = users.get(ws);
  if (!user || !user.roomId) return;

  const { roomId, userId } = user;
  const { avatarConfig } = message;

  broadcastToRoom(roomId, {
    type: 'avatar_update',
    userId,
    avatarConfig,
    timestamp: Date.now()
  }, ws);

  if (LOG_VERBOSE) {
    console.log(`[Avatar] 👤 Update: ${userId}`);
  }
}

function handlePositionUpdate(ws, message) {
  const user = users.get(ws);
  if (!user || !user.roomId) return;

  const { roomId, userId } = user;
  const { x, y, z, yaw } = message;

  broadcastToRoom(roomId, {
    type: 'position_update',
    userId,
    x, y, z, yaw,
    timestamp: Date.now()
  }, ws);

  // Não loga - muito frequent
}

function handleMessage(ws, message) {
  const { type } = message;

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'join_room':
      handleJoinRoom(ws, message);
      break;

    case 'leave_room':
      handleLeaveRoom(ws, message);
      break;

    case 'offer':
      handleOffer(ws, message);
      break;

    case 'answer':
      handleAnswer(ws, message);
      break;

    case 'ice_candidate':
      handleIceCandidate(ws, message);
      break;

    case 'avatar_update':
      handleAvatarUpdate(ws, message);
      break;

    case 'position_update':
      handlePositionUpdate(ws, message);
      break;

    default:
      console.warn(`[Warning] ⚠️  Tipo de mensagem desconhecido: ${type}`);
  }
}

// ========== CONEXÃO WEBSOCKET ==========

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[Connection] ✅ Nova conexão de ${clientIp}`);

  // Heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Mensagens
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      console.error('[Error] ❌ JSON inválido:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid JSON'
      }));
    }
  });

  // Desconexão
  ws.on('close', () => {
    cleanupUser(ws);
  });

  // Erro
  ws.on('error', (error) => {
    console.error('[Error] ❌ WebSocket error:', error.message);
    cleanupUser(ws);
  });
});

// ========== HEARTBEAT ==========

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[Heartbeat] 💀 Client timeout, terminando conexão');
      cleanupUser(ws);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Cleanup on server close
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ========== STATS LOG (opcional) ==========

if (LOG_VERBOSE) {
  setInterval(() => {
    if (rooms.size > 0 || users.size > 0) {
      console.log(`\n[Stats] 📊 Salas: ${rooms.size} | Conexões: ${users.size}`);
      rooms.forEach((room, roomId) => {
        console.log(`  └─ ${roomId}: ${room.size} usuários`);
      });
    }
  }, 60000); // A cada minuto
}

// ========== INICIALIZAÇÃO ==========

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 ArxisVR Signaling Server                  ║
║                                                ║
║   Port:       ${PORT.toString().padEnd(33)} ║
║   WebSocket:  ws://localhost:${PORT.toString().padEnd(21)} ║
║   Health:     http://localhost:${PORT}/health${' '.repeat(12)} ║
║                                                ║
║   Status:     🟢 ONLINE                        ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
  console.log('Aguardando conexões...\n');
});

// ========== GRACEFUL SHUTDOWN ==========

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('\n[Shutdown] 🛑 Desligando servidor...');
  
  // Notifica todos os clientes
  wss.clients.forEach((ws) => {
    try {
      ws.send(JSON.stringify({
        type: 'server_shutdown',
        message: 'Server is shutting down'
      }));
      ws.close(1001, 'Server shutdown');
    } catch (err) {
      // Ignora erros ao fechar
    }
  });

  // Fecha servidor
  server.close(() => {
    console.log('[Shutdown] ✅ Servidor fechado com sucesso');
    process.exit(0);
  });

  // Força saída após 5s
  setTimeout(() => {
    console.error('[Shutdown] ⚠️  Forçando saída...');
    process.exit(1);
  }, 5000);
}
