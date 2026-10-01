import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, asc, desc, gt, sql } from 'drizzle-orm';
import { 
  virtualMeetingRooms, 
  meetingParticipants,
  meetingChatMessages,
  meetingActions,
  meetingCollaborationSnapshots,
  meetingCollaborationUpdates
} from '../../shared/database/schema/virtual-meetings.js';
import { projects } from '../../shared/database/schema/projects.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { MeetingEvents, MeetingEventsService } from './meeting-events.service.js';
import type { 
  CreateMeetingInput, 
  JoinMeetingInput,
  UpdateAvatarInput,
  SendMessageInput,
  CreateActionInput,
  CollaborationUpdateInput
} from './meetings.schemas.js';

interface AppendCollaborationUpdateInput extends CollaborationUpdateInput {
  roomId: string;
  userId: string;
  participantId?: string;
}

export class MeetingsService {
  private db;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';
    const client = postgres(connectionString, { max: 3 });
    this.db = drizzle(client, { 
      schema: { 
        virtualMeetingRooms, 
        meetingParticipants,
        meetingChatMessages,
        meetingActions,
        meetingCollaborationSnapshots,
        meetingCollaborationUpdates
      } 
    });
  }

  async createRoom(tenantId: string, input: CreateMeetingInput) {
    const roomUrl = `${input.projectId}-${Date.now()}`;
    const meetingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const [room] = await this.db
      .insert(virtualMeetingRooms)
      .values({
        projectId: input.projectId,
        roomUrl,
        meetingCode,
        createdBy: input.hostUserId,
        avatarSettings: input.avatarSettings || {},
        isActive: true,
      } as any)
      .returning();

    // Send notification to host
    if (input.hostUserId) {
      NotificationService.create({
        userId: input.hostUserId,
        tenantId,
        type: 'meeting_scheduled',
        title: 'Reunião Virtual Criada',
        message: `Reunião criada com código: ${meetingCode}`,
        priority: 'medium',
        actionUrl: `/meetings/${room.id}`,
        metadata: {
          roomId: room.id,
          meetingCode,
          projectId: input.projectId,
        },
      }).catch((err: Error) =>
        console.error('Failed to send meeting notification:', err)
      );
    }

    MeetingEventsService.emitDetached(MeetingEvents.ROOM_CREATED, room.id, tenantId, {
      meetingCode,
      roomUrl,
      projectId: input.projectId,
      hostUserId: input.hostUserId ?? null,
    });

    return room;
  }

  /**
   * Tenant dono da sala, via projeto.
   *
   * Só `createRoom` recebe o tenant de quem chamou; entrar, sair e encerrar
   * vêm do gateway ou de um id de participante e não têm essa informação.
   * Sem resolver aqui, o evento sairia com `tenantId` vazio e a contagem de
   * minutos não saberia de quem cobrar.
   */
  private async tenantDaSala(roomId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ tenantId: projects.tenantId })
      .from(virtualMeetingRooms)
      .innerJoin(projects, eq(projects.id, virtualMeetingRooms.projectId))
      .where(eq(virtualMeetingRooms.id, roomId))
      .limit(1);

    return row?.tenantId ?? null;
  }

  async getRoom(roomId: string) {
    const [room] = await this.db
      .select()
      .from(virtualMeetingRooms)
      .where(eq(virtualMeetingRooms.id, roomId))
      .limit(1);

    return room;
  }

  async getRoomByCode(meetingCode: string) {
    const [room] = await this.db
      .select()
      .from(virtualMeetingRooms)
      .where(eq(virtualMeetingRooms.meetingCode, meetingCode))
      .limit(1);

    return room;
  }

  async listRoomsByProject(projectId: string) {
    return await this.db
      .select()
      .from(virtualMeetingRooms)
      .where(eq(virtualMeetingRooms.projectId, projectId));
  }

  async joinRoom(input: JoinMeetingInput) {
    const [participant] = await this.db
      .insert(meetingParticipants)
      .values({
        roomId: input.roomId,
        userId: input.userId,
        userName: input.userName,
        avatarState: input.avatarState || {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          animation: 'idle'
        },
        isConnected: true,
      })
      .returning();

    MeetingEventsService.emitDetached(
      MeetingEvents.PARTICIPANT_JOINED,
      input.roomId,
      await this.tenantDaSala(input.roomId),
      {
        participantId: participant.id,
        userId: input.userId,
        userName: input.userName,
      },
    );

    return participant;
  }

  async updateAvatarState(participantId: string, avatarState: UpdateAvatarInput) {
    const [participant] = await this.db
      .update(meetingParticipants)
      .set({ 
        avatarState: {
          position: avatarState.position || { x: 0, y: 0, z: 0 },
          rotation: avatarState.rotation || { x: 0, y: 0, z: 0 },
          animation: avatarState.animation,
          customization: avatarState.scale ? { color: undefined, accessories: [] } : undefined
        },
        lastSeenAt: new Date()
      })
      .where(eq(meetingParticipants.id, participantId))
      .returning();

    return participant;
  }

  async leaveRoom(participantId: string) {
    // `returning()` em vez de update cego: o evento precisa da sala e de quem
    // saiu, e essa é a única chance de saber (o registro some da lista de
    // conectados logo em seguida).
    const [participant] = await this.db
      .update(meetingParticipants)
      .set({
        isConnected: false,
        leftAt: new Date()
      })
      .where(eq(meetingParticipants.id, participantId))
      .returning();

    if (!participant) return;

    MeetingEventsService.emitDetached(MeetingEvents.PARTICIPANT_LEFT, participant.roomId, await this.tenantDaSala(participant.roomId), {
      participantId,
      userId: participant.userId,
      userName: participant.userName,
      joinedAt: participant.joinedAt?.toISOString() ?? null,
      leftAt: participant.leftAt?.toISOString() ?? null,
      duracaoSegundos: participant.joinedAt && participant.leftAt
        ? Math.max(0, Math.round((participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000))
        : null,
    });
  }

  async getParticipants(roomId: string) {
    return await this.db
      .select()
      .from(meetingParticipants)
      .where(and(
        eq(meetingParticipants.roomId, roomId),
        eq(meetingParticipants.isConnected, true)
      ));
  }

  async sendMessage(input: SendMessageInput) {
    const [message] = await this.db
      .insert(meetingChatMessages)
      .values({
        roomId: input.roomId,
        userId: input.userId,
        userName: input.userName,
        message: input.message,
        messageType: input.messageType || 'text',
      })
      .returning();

    return message;
  }

  async getMessages(roomId: string, limit = 50) {
    return await this.db
      .select()
      .from(meetingChatMessages)
      .where(eq(meetingChatMessages.roomId, roomId))
      .orderBy(desc(meetingChatMessages.timestamp))
      .limit(limit);
  }

  async createAction(input: CreateActionInput) {
    const [action] = await this.db
      .insert(meetingActions)
      .values({
        roomId: input.roomId,
        userId: input.userId,
        actionType: input.actionType,
        actionData: input.actionData,
      })
      .returning();

    return action;
  }

  async appendCollaborationUpdate(input: AppendCollaborationUpdateInput) {
    const [versionRow] = await this.db
      .select({
        nextVersion: sql<number>`COALESCE(MAX(${meetingCollaborationUpdates.version}), 0) + 1`,
      })
      .from(meetingCollaborationUpdates)
      .where(eq(meetingCollaborationUpdates.roomId, input.roomId));

    const nextVersion = Number(versionRow?.nextVersion ?? 1);

    const [update] = await this.db
      .insert(meetingCollaborationUpdates)
      .values({
        roomId: input.roomId,
        userId: input.userId,
        participantId: input.participantId,
        origin: input.origin || 'snapshot',
        ydocUpdate: input.update,
        version: nextVersion,
        isSnapshot: input.isSnapshot || false,
      })
      .returning();

    if (input.isSnapshot) {
      await this.upsertCollaborationSnapshot({
        roomId: input.roomId,
        userId: input.userId,
        update: input.update,
        version: nextVersion,
      });
    }

    return update;
  }

  async upsertCollaborationSnapshot(input: {
    roomId: string;
    userId: string;
    update: number[];
    version?: number;
  }) {
    const version = input.version ?? (await this.getNextCollaborationVersion(input.roomId));

    const [snapshot] = await this.db
      .insert(meetingCollaborationSnapshots)
      .values({
        roomId: input.roomId,
        ydocUpdate: input.update,
        version,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: meetingCollaborationSnapshots.roomId,
        set: {
          ydocUpdate: input.update,
          version,
          updatedBy: input.userId,
          updatedAt: new Date(),
        },
      })
      .returning();

    return snapshot;
  }

  async getCollaborationSnapshot(roomId: string) {
    const [snapshot] = await this.db
      .select()
      .from(meetingCollaborationSnapshots)
      .where(eq(meetingCollaborationSnapshots.roomId, roomId))
      .limit(1);

    return snapshot || null;
  }

  async getCollaborationUpdates(roomId: string, afterVersion = 0, limit = 100) {
    return await this.db
      .select()
      .from(meetingCollaborationUpdates)
      .where(and(
        eq(meetingCollaborationUpdates.roomId, roomId),
        gt(meetingCollaborationUpdates.version, afterVersion)
      ))
      .orderBy(asc(meetingCollaborationUpdates.version))
      .limit(limit);
  }

  async getCollaborationHistory(roomId: string, afterVersion = 0, limit = 100) {
    const snapshot = await this.getCollaborationSnapshot(roomId);
    const updates = await this.getCollaborationUpdates(roomId, afterVersion, limit);

    return {
      roomId,
      snapshot,
      updates,
    };
  }

  private async getNextCollaborationVersion(roomId: string) {
    const [versionRow] = await this.db
      .select({
        nextVersion: sql<number>`COALESCE(MAX(${meetingCollaborationUpdates.version}), 0) + 1`,
      })
      .from(meetingCollaborationUpdates)
      .where(eq(meetingCollaborationUpdates.roomId, roomId));

    return Number(versionRow?.nextVersion ?? 1);
  }

  async endRoom(roomId: string) {
    await this.db
      .update(virtualMeetingRooms)
      .set({ 
        isActive: false,
        closedAt: new Date()
      })
      .where(eq(virtualMeetingRooms.id, roomId));

    // Desconectar todos os participantes
    await this.db
      .update(meetingParticipants)
      .set({ 
        isConnected: false,
        leftAt: new Date()
      })
      .where(eq(meetingParticipants.roomId, roomId));

    // Fechamento é o evento que interessa ao n8n: é aqui que dá para mandar o
    // resumo, registrar no CRM e contar minutos. Por isso ele carrega quem
    // participou e quanto tempo a sala durou, em vez de só o id.
    const [room] = await this.db
      .select()
      .from(virtualMeetingRooms)
      .where(eq(virtualMeetingRooms.id, roomId))
      .limit(1);

    const participantes = await this.db
      .select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.roomId, roomId));

    const inicio = room?.createdAt ?? null;
    const fim = room?.closedAt ?? new Date();

    MeetingEventsService.emitDetached(MeetingEvents.ROOM_ENDED, roomId, await this.tenantDaSala(roomId), {
      meetingCode: room?.meetingCode ?? null,
      projectId: room?.projectId ?? null,
      criadaEm: inicio?.toISOString() ?? null,
      encerradaEm: fim.toISOString(),
      duracaoSegundos: inicio ? Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 1000)) : null,
      totalParticipantes: participantes.length,
      participantes: participantes.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        joinedAt: p.joinedAt?.toISOString() ?? null,
        leftAt: p.leftAt?.toISOString() ?? null,
      })),
    });
  }
}
