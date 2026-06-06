/**
 * ArxisVR Signaling Server
 *
 * WebSocket server para coordenação multiplayer em tempo real.
 * - Valida token JWT do participante no join_room
 * - Persiste SessionEvents via HTTP interno (backend :3000)
 * - Gerencia presença (online/offline/reconnecting)
 * - Relay de offer/answer/ice_candidate para WebRTC
 * - Heartbeat para detectar conexões mortas
 */

const WebSocket = require('ws');
const http      = require('http');
const https     = require('https');
const path      = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// ========== CONFIG ==========

const PORT               = process.env.PORT || process.env.SIGNALING_PORT || 3002;
const HEARTBEAT_INTERVAL = 30_000;
const LOG_VERBOSE        = process.env.LOG_VERBOSE === 'true';
const JWT_SECRET         = process.env.JWT_SECRET;
const BACKEND_URL        = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não configurado — tokens de participante não serão validados.');
}

// ========== JWT (sem dep externa: usa backend/node_modules) ==========

let jwt;
try {
  jwt = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));
} catch {
  // fallback: tenta global
  try { jwt = require('jsonwebtoken'); } catch { jwt = null; }
}

function verifyParticipantToken(token) {
  if (!jwt || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ========== ESTADO ==========

// roomId -> Map<socketId, { ws, participantId, userId, role, permissions }>
const rooms = new Map();
// ws -> { participantId, userId, roomId, role, permissions, sessionId }
const clients = new Map();

// ========== HTTP helper para persistir eventos ==========

function persistEvent(sessionId, participantId, type, payload) {
  if (!sessionId) return; // sessão sem backend tracking (modo legado)

  const body = JSON.stringify({ sessionId, actorId: participantId, type, payload });
  const url = new URL(`${BACKEND_URL}/api/v1/sessions/${sessionId}/events/internal`);
  const lib = url.protocol === 'https:' ? https : http;

  const req = lib.request({
    hostname: url.hostname,
    port:     url.port || (url.protocol === 'https:' ? 443 : 80),
    path:     url.pathname,
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal',
    },
  }, (res) => {
    if (res.statusCode >= 400) {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => console.warn(`[Event] persist ${type} → ${res.statusCode}:`, body.slice(0, 200)));
    } else if (LOG_VERBOSE) {
      console.log(`[Event] persisted ${type} → ${res.statusCode}`);
    }
  });

  req.on('error', (e) => {
    console.warn(`[Event] persist failed (${type}):`, e.message);
  });
  req.write(body);
  req.end();
}

function updatePresence(sessionId, participantId, socketId, status) {
  if (!sessionId || !participantId) return;

  const body = JSON.stringify({ participantId, socketId, status });
  const url = new URL(`${BACKEND_URL}/api/v1/sessions/${sessionId}/presence`);
  const lib = url.protocol === 'https:' ? https : http;

  const req = lib.request({
    hostname: url.hostname,
    port:     url.port || 80,
    path:     url.pathname,
    method:   'PUT',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal',
    },
  });
  req.on('error', () => {});
  req.write(body);
  req.end();
}

// ========== UTILS ==========

let _socketCounter = 0;
function newSocketId() { return `ws_${++_socketCounter}_${Date.now()}`; }

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastToRoom(roomId, obj, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(obj);
  room.forEach(({ ws }) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

function getRoomMembers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values()).map(c => ({
    participantId: c.participantId,
    userId:        c.userId,
    displayName:   c.displayName,
    role:          c.role,
  }));
}

function findWsByParticipantId(participantId) {
  for (const [ws, c] of clients.entries()) {
    if (c.participantId === participantId && ws.readyState === WebSocket.OPEN) return ws;
  }
  return null;
}

function cleanupClient(ws) {
  const c = clients.get(ws);
  if (!c) return;

  const { participantId, userId, roomId, sessionId, socketId } = c;

  if (roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socketId);
      broadcastToRoom(roomId, { type: 'user_left', participantId, userId, timestamp: Date.now() });
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[Room] 🗑️  ${roomId} vazia, removida`);
      } else {
        console.log(`[Room] 👋 ${userId || participantId} saiu de ${roomId} (${room.size} restantes)`);
      }
    }
  }

  updatePresence(sessionId, participantId, socketId, 'offline');
  persistEvent(sessionId, participantId, 'participant_left', { userId, roomId });

  clients.delete(ws);
}

// ========== HANDLERS ==========

function handleJoinRoom(ws, msg) {
  const { roomId, userId, accessToken, displayName } = msg;

  // --- Validar token de participante ---
  let participantId = userId; // fallback para modo room_XXX (autenticado via frontend)
  let role          = 'viewer';
  let permissions   = [];
  let sessionId     = null;

  if (accessToken) {
    // Modo backend: validar JWT de sessão
    const payload = verifyParticipantToken(accessToken);
    if (!payload) {
      send(ws, { type: 'error', error: 'Invalid or expired access token' });
      ws.close(4001, 'Unauthorized');
      return;
    }
    participantId = payload.participantId;
    role          = payload.role;
    permissions   = payload.permissions || [];
    sessionId     = payload.sessionId;
  } else if (!userId) {
    // Modo room_XXX: userId obrigatório (frontend exige conta antes do join)
    send(ws, { type: 'error', error: 'Authentication required: provide accessToken or userId' });
    ws.close(4001, 'Unauthorized');
    return;
  }

  if (!roomId) {
    send(ws, { type: 'error', error: 'Missing roomId' });
    return;
  }

  const socketId = ws._arxisSocketId;

  // Criar sala se não existe
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
    console.log(`[Room] 🆕 ${roomId} criada`);
  }

  const room = rooms.get(roomId);

  // Guardar estado do cliente
  const resolvedName = displayName || userId || participantId;
  clients.set(ws, { participantId, userId: userId || participantId, displayName: resolvedName, roomId, sessionId, role, permissions, socketId });
  room.set(socketId, { ws, participantId, userId: userId || participantId, displayName: resolvedName, role, permissions });

  const members = getRoomMembers(roomId).filter(m => m.participantId !== participantId);
  // members already have displayName from room map

  console.log(`[Room] ✅ ${userId || participantId} (${role}) → ${roomId} (total: ${room.size})`);

  // Confirma para quem entrou
  send(ws, {
    type: 'room_joined',
    roomId,
    participantId,
    userId: userId || participantId,
    role,
    permissions,
    members,
    timestamp: Date.now(),
  });

  // Notifica os outros
  broadcastToRoom(roomId, {
    type: 'user_joined',
    participantId,
    userId: userId || participantId,
    displayName: resolvedName,
    role,
    timestamp: Date.now(),
  }, ws);

  // Persistência
  updatePresence(sessionId, participantId, socketId, 'online');
  persistEvent(sessionId, participantId, 'participant_joined', {
    userId: userId || participantId,
    role,
    roomId,
  });

  // Marca first join
  if (sessionId && participantId) {
    const body = JSON.stringify({ participantId });
    const url  = new URL(`${BACKEND_URL}/api/v1/sessions/${sessionId}/participants/${participantId}/joined`);
    const lib  = url.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname: url.hostname, port: url.port || 80, path: url.pathname, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal' },
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  }
}

function handleLeaveRoom(ws) {
  cleanupClient(ws);
  clients.delete(ws);
}

function handleOffer(ws, msg) {
  const { to, offer } = msg;
  const from = clients.get(ws)?.participantId;
  const target = findWsByParticipantId(to);
  if (target) send(target, { type: 'offer', from, offer, timestamp: Date.now() });
}

function handleAnswer(ws, msg) {
  const { to, answer } = msg;
  const from = clients.get(ws)?.participantId;
  const target = findWsByParticipantId(to);
  if (target) send(target, { type: 'answer', from, answer, timestamp: Date.now() });
}

function handleIceCandidate(ws, msg) {
  const { to, candidate } = msg;
  const from = clients.get(ws)?.participantId;
  const target = findWsByParticipantId(to);
  if (target) send(target, { type: 'ice_candidate', from, candidate, timestamp: Date.now() });
}

function handlePositionUpdate(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;
  broadcastToRoom(c.roomId, {
    type: 'position_update',
    participantId: c.participantId,
    userId: c.userId,
    x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw,
    timestamp: Date.now(),
  }, ws);
  // position_update é de alta frequência — não persiste no DB
}

function handleAvatarUpdate(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;
  broadcastToRoom(c.roomId, {
    type: 'avatar_update',
    participantId: c.participantId,
    userId: c.userId,
    avatarConfig: msg.avatarConfig,
    timestamp: Date.now(),
  }, ws);
}

function handleMaterialChanged(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;

  // Verifica permissão de mutação
  if (!c.permissions.includes('mutate') && c.role !== 'architect') {
    send(ws, { type: 'error', error: 'No permission to mutate objects' });
    return;
  }

  broadcastToRoom(c.roomId, {
    type: 'material_changed',
    participantId: c.participantId,
    object: msg.object,
    material: msg.material,
    timestamp: Date.now(),
  }, ws);

  persistEvent(c.sessionId, c.participantId, 'material_changed', {
    object: msg.object,
    material: msg.material,
  });
}

function handleObjectMoved(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;

  if (!c.permissions.includes('mutate') && c.role !== 'architect') {
    send(ws, { type: 'error', error: 'No permission to move objects' });
    return;
  }

  broadcastToRoom(c.roomId, {
    type: 'object_moved',
    participantId: c.participantId,
    object: msg.object,
    position: msg.position,
    rotation: msg.rotation,
    timestamp: Date.now(),
  }, ws);

  persistEvent(c.sessionId, c.participantId, 'object_moved', {
    object: msg.object,
    position: msg.position,
    rotation: msg.rotation,
  });
}

function handleLaserPointed(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;

  broadcastToRoom(c.roomId, {
    type: 'laser_pointed',
    participantId: c.participantId,
    userId: c.userId,
    x: msg.x, y: msg.y, z: msg.z,
    timestamp: Date.now(),
  }, ws);

  // Salva apenas se tiver texto (comentário fixo)
  if (msg.text) {
    persistEvent(c.sessionId, c.participantId, 'annotation_added', {
      x: msg.x, y: msg.y, z: msg.z,
      text: msg.text,
    });
  }
}

function handleAnnotation(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;

  broadcastToRoom(c.roomId, {
    type: 'annotation_added',
    participantId: c.participantId,
    userId: c.userId,
    x: msg.x, y: msg.y, z: msg.z,
    text: msg.text,
    timestamp: Date.now(),
  }, ws);

  persistEvent(c.sessionId, c.participantId, 'annotation_added', {
    x: msg.x, y: msg.y, z: msg.z,
    text: msg.text,
  });
}

function handleChatMessage(ws, msg) {
  const c = clients.get(ws);
  if (!c?.roomId) return;

  broadcastToRoom(c.roomId, {
    type: 'chat_message',
    participantId: c.participantId,
    userId: c.userId,
    content: msg.content,
    timestamp: Date.now(),
  }, ws);

  persistEvent(c.sessionId, c.participantId, 'chat_message', {
    content: msg.content,
  });
}

// ========== DISPATCHER ==========

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':              send(ws, { type: 'pong', timestamp: Date.now() }); break;
    case 'join_room':         handleJoinRoom(ws, msg); break;
    case 'leave_room':        handleLeaveRoom(ws); break;
    case 'offer':             handleOffer(ws, msg); break;
    case 'answer':            handleAnswer(ws, msg); break;
    case 'ice_candidate':     handleIceCandidate(ws, msg); break;
    case 'position_update':   handlePositionUpdate(ws, msg); break;
    case 'avatar_update':     handleAvatarUpdate(ws, msg); break;
    case 'material_changed':  handleMaterialChanged(ws, msg); break;
    case 'object_moved':      handleObjectMoved(ws, msg); break;
    case 'laser_pointed':     handleLaserPointed(ws, msg); break;
    case 'annotation_added':  handleAnnotation(ws, msg); break;
    case 'chat_message':      handleChatMessage(ws, msg); break;
    default:
      if (LOG_VERBOSE) console.warn(`[WS] tipo desconhecido: ${msg.type}`);
  }
}

// ========== SERVIDOR ==========

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      connections: clients.size,
      uptime: process.uptime(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  ws._arxisSocketId = newSocketId();
  const ip = req.socket.remoteAddress;
  console.log(`[WS] ✅ Conexão ${ws._arxisSocketId} de ${ip}`);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    try {
      handleMessage(ws, JSON.parse(data.toString()));
    } catch (e) {
      send(ws, { type: 'error', error: 'Invalid JSON' });
    }
  });

  ws.on('close', () => cleanupClient(ws));
  ws.on('error', (e) => {
    console.error('[WS] error:', e.message);
    cleanupClient(ws);
  });
});

// ========== HEARTBEAT ==========

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      cleanupClient(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => clearInterval(heartbeat));

// ========== START ==========

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 ArxisVR Signaling Server                  ║
║   Port:    ${String(PORT).padEnd(36)}║
║   Backend: ${BACKEND_URL.padEnd(36)}║
║   Auth:    ${JWT_SECRET ? '🔒 JWT ativo' : '⚠️  sem JWT (modo dev)'.padEnd(25)}        ║
╚════════════════════════════════════════════════╝`);
});

// ========== GRACEFUL SHUTDOWN ==========

function gracefulShutdown() {
  console.log('\n[Shutdown] 🛑 Encerrando...');
  wss.clients.forEach((ws) => {
    try { ws.send(JSON.stringify({ type: 'server_shutdown' })); ws.close(1001); } catch {}
  });
  server.close(() => { console.log('[Shutdown] ✅ OK'); process.exit(0); });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT',  gracefulShutdown);
