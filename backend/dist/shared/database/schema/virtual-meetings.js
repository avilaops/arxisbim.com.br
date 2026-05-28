import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './tenants.js';
// =====================================
// VIRTUAL_MEETING_ROOMS
// =====================================
export const virtualMeetingRooms = pgTable('virtual_meeting_rooms', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    roomUrl: varchar('room_url', { length: 255 }).notNull().unique(), // Unique URL for the meeting
    meetingCode: varchar('meeting_code', { length: 50 }).notNull().unique(), // 6-digit code
    name: varchar('name', { length: 255 }),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    avatarSettings: jsonb('avatar_settings').$type(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
}, (table) => ({
    projectIdIdx: index('virtual_meeting_rooms_project_id_idx').on(table.projectId),
    createdByIdx: index('virtual_meeting_rooms_created_by_idx').on(table.createdBy),
}));
// =====================================
// MEETING_PARTICIPANTS (avatars in room)
// =====================================
export const meetingParticipants = pgTable('meeting_participants', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => virtualMeetingRooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id),
    userName: varchar('user_name', { length: 255 }).notNull(),
    avatarState: jsonb('avatar_state').$type(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
    lastSeenAt: timestamp('last_seen_at'),
    isConnected: boolean('is_connected').default(true),
    isActive: boolean('is_active').default(true),
}, (table) => ({
    roomIdIdx: index('meeting_participants_room_id_idx').on(table.roomId),
    userIdIdx: index('meeting_participants_user_id_idx').on(table.userId),
}));
// =====================================
// MEETING_CHAT_MESSAGES
// =====================================
export const meetingChatMessages = pgTable('meeting_chat_messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => virtualMeetingRooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id),
    userName: varchar('user_name', { length: 255 }).notNull(),
    message: text('message').notNull(),
    messageType: varchar('message_type', { length: 50 }).default('text'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    roomIdIdx: index('meeting_chat_messages_room_id_idx').on(table.roomId),
}));
// =====================================
// MEETING_ACTIONS (laser pointer, annotations)
// =====================================
export const meetingActions = pgTable('meeting_actions', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => virtualMeetingRooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id),
    actionType: varchar('action_type', { length: 50 }).notNull(), // 'laser_pointer', 'annotation', 'highlight'
    actionData: jsonb('action_data').$type(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    roomIdIdx: index('meeting_actions_room_id_idx').on(table.roomId),
}));
// =====================================
// MEETING_RECORDINGS (session recordings)
// =====================================
export const meetingRecordings = pgTable('meeting_recordings', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => virtualMeetingRooms.id, { onDelete: 'cascade' }),
    recordingUrl: text('recording_url'),
    duration: integer('duration'), // seconds
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
}, (table) => ({
    roomIdIdx: index('meeting_recordings_room_id_idx').on(table.roomId),
}));
// =====================================
// MEETING_COLLABORATION_SNAPSHOTS (Yjs/CRDT compact state)
// =====================================
export const meetingCollaborationSnapshots = pgTable('meeting_collaboration_snapshots', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => virtualMeetingRooms.id, { onDelete: 'cascade' }),
    ydocUpdate: jsonb('ydoc_update').$type().notNull(),
    version: integer('version').notNull().default(0),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    roomIdUniqueIdx: uniqueIndex('meeting_collaboration_snapshots_room_id_uidx').on(table.roomId),
    roomIdIdx: index('meeting_collaboration_snapshots_room_id_idx').on(table.roomId),
}));
// =====================================
// MEETING_COLLABORATION_UPDATES (Yjs/CRDT append-only log)
// =====================================
export const meetingCollaborationUpdates = pgTable('meeting_collaboration_updates', {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => virtualMeetingRooms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    participantId: uuid('participant_id').references(() => meetingParticipants.id, { onDelete: 'set null' }),
    origin: varchar('origin', { length: 50 }).notNull().default('snapshot'),
    ydocUpdate: jsonb('ydoc_update').$type().notNull(),
    version: integer('version').notNull(),
    isSnapshot: boolean('is_snapshot').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    roomVersionUniqueIdx: uniqueIndex('meeting_collaboration_updates_room_version_uidx').on(table.roomId, table.version),
    roomIdIdx: index('meeting_collaboration_updates_room_id_idx').on(table.roomId),
    roomVersionIdx: index('meeting_collaboration_updates_room_version_idx').on(table.roomId, table.version),
    createdAtIdx: index('meeting_collaboration_updates_created_at_idx').on(table.createdAt),
}));
//# sourceMappingURL=virtual-meetings.js.map