import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { io, Socket as ClientSocket } from 'socket.io-client';
import postgres from 'postgres';
import { MeetingsService } from './meetings.service';

describe('Virtual Meetings Module', () => {
  let service: MeetingsService;
  let client1: ClientSocket;
  let client2: ClientSocket;
  let testRoomId: string;
  let testProjectId = '550e8400-e29b-41d4-a716-446655440000'; // Mock project ID
  let testToken = 'mock-jwt-token'; // Mock token para testes
  let sql: postgres.Sql;

  beforeAll(async () => {
    sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr_test');
    await sql`
      INSERT INTO tenants (tenant_id, name, is_active)
      VALUES ('default', 'Default Test Tenant', true)
      ON CONFLICT (tenant_id) DO UPDATE SET name = EXCLUDED.name
    `;
    await sql`
      INSERT INTO companies (company_id, tenant_id, name, is_active)
      VALUES ('default-company', 'default', 'Default Test Company', true)
      ON CONFLICT (company_id) DO UPDATE SET name = EXCLUDED.name
    `;
    await sql`
      INSERT INTO users (id, email, name, password_hash, tenant_id, company_id, role, is_active)
      VALUES
        ('123e4567-e89b-12d3-a456-426614174000', 'meeting-host@example.com', 'Meeting Host', 'test-hash', 'default', 'default-company', 'user', true),
        ('123e4567-e89b-12d3-a456-426614174001', 'meeting-participant@example.com', 'Meeting Participant', 'test-hash', 'default', 'default-company', 'user', true)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    `;
    await sql`
      INSERT INTO projects (id, tenant_id, company_id, name, status)
      VALUES (${testProjectId}, 'default', 'default-company', 'Virtual Meeting Test Project', 'active')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;
    service = new MeetingsService();
  });

  afterAll(async () => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    await sql`DELETE FROM virtual_meeting_rooms WHERE project_id = ${testProjectId} OR created_by IN ('123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001')`;
    await sql`DELETE FROM projects WHERE id = ${testProjectId}`;
    await sql.end();
  });

  describe('MeetingsService', () => {
    it('should create a meeting room', async () => {
      const room = await service.createRoom('default', {
        projectId: testProjectId,
        hostUserId: '123e4567-e89b-12d3-a456-426614174000',
        settings: {
          maxParticipants: 10,
          allowChat: true,
          allowRecording: false
        },
        avatarSettings: {
          defaultAvatar: 'engineer',
          allowCustomAvatars: true
        }
      });

      expect(room).toBeDefined();
      expect(room.id).toBeDefined();
      expect(room.projectId).toBe(testProjectId);
      expect(room.meetingCode).toHaveLength(6);
      expect(room.isActive).toBe(true);
      expect(room.roomUrl).toContain(testProjectId);

      testRoomId = room.id;
    });

    it('should get room by ID', async () => {
      const room = await service.getRoom(testRoomId);
      expect(room).toBeDefined();
      expect(room?.id).toBe(testRoomId);
    });

    it('should get room by meeting code', async () => {
      const room = await service.getRoom(testRoomId);
      const foundRoom = await service.getRoomByCode(room!.meetingCode);
      expect(foundRoom).toBeDefined();
      expect(foundRoom?.id).toBe(testRoomId);
    });

    it('should join a room', async () => {
      const participant = await service.joinRoom({
        roomId: testRoomId,
        userId: '123e4567-e89b-12d3-a456-426614174001',
        userName: 'Test User 1',
        avatarState: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          animation: 'idle'
        }
      });

      expect(participant).toBeDefined();
      expect(participant.roomId).toBe(testRoomId);
      expect(participant.userName).toBe('Test User 1');
      expect(participant.isConnected).toBe(true);
    });

    it('should list participants', async () => {
      const participants = await service.getParticipants(testRoomId);
      expect(participants).toBeDefined();
      expect(participants.length).toBeGreaterThan(0);
      expect(participants[0].isConnected).toBe(true);
    });

    it('should send a message', async () => {
      const message = await service.sendMessage({
        roomId: testRoomId,
        userId: '123e4567-e89b-12d3-a456-426614174001',
        userName: 'Test User 1',
        message: 'Hello, world!',
        messageType: 'text'
      });

      expect(message).toBeDefined();
      expect(message.message).toBe('Hello, world!');
      expect(message.roomId).toBe(testRoomId);
    });

    it('should get messages', async () => {
      const messages = await service.getMessages(testRoomId);
      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[messages.length - 1].message).toBe('Hello, world!');
    });

    it('should create an action', async () => {
      const action = await service.createAction({
        roomId: testRoomId,
        userId: '123e4567-e89b-12d3-a456-426614174001',
        actionType: 'laser_pointer',
        actionData: {
          position: { x: 10, y: 5, z: 8 },
          color: '#ff0000'
        },
        targetElementId: 'element-123'
      });

      expect(action).toBeDefined();
      expect(action.actionType).toBe('laser_pointer');
      expect(action.actionData).toHaveProperty('position');
    });

    it('should update avatar state', async () => {
      const participants = await service.getParticipants(testRoomId);
      const participant = participants[0];

      const updated = await service.updateAvatarState(participant.id, {
        position: { x: 10, y: 0, z: 5 },
        rotation: { x: 0, y: 90, z: 0 },
        animation: 'walking'
      });

      expect(updated).toBeDefined();
      expect(updated?.avatarState.position.x).toBe(10);
      expect(updated?.avatarState.animation).toBe('walking');
    });

    it('should end a room', async () => {
      await service.endRoom(testRoomId);
      
      const room = await service.getRoom(testRoomId);
      expect(room?.isActive).toBe(false);
      expect(room?.closedAt).toBeDefined();

      const participants = await service.getParticipants(testRoomId);
      expect(participants.length).toBe(0);
    });
  });

  describe('WebSocket Gateway (Integration)', () => {
    it.skip('should connect to WebSocket server', (done) => {
      // Nota: Este teste requer servidor rodando
      client1 = io('http://localhost:3001', {
        path: '/socket.io/',
        auth: { token: testToken },
        transports: ['websocket']
      });

      client1.on('connect', () => {
        expect(client1.connected).toBe(true);
        done();
      });

      client1.on('connect_error', (error) => {
        // Token inválido é esperado em ambiente de teste
        expect(error.message).toContain('Invalid token');
        done();
      });
    });

    it.skip('should join a room and receive participant list', (done) => {
      // Teste de integração completo (requer servidor)
      client1.on('meeting:joined', (data) => {
        expect(data.participant).toBeDefined();
        expect(data.room).toBeDefined();
        expect(data.participants).toBeInstanceOf(Array);
        done();
      });

      client1.emit('meeting:join', {
        roomId: testRoomId,
        userName: 'Integration Test User'
      });
    });
  });
});
