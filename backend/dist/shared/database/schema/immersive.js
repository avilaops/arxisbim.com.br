import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './tenants.js';
// =====================================
// VR_SESSIONS
// =====================================
export const vrSessions = pgTable('vr_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sessionType: varchar('session_type', { length: 50 }).notNull(), // 'walkthrough', 'inspection', 'meeting'
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
    duration: integer('duration'), // seconds
    metadata: jsonb('metadata').$type(),
}, (table) => ({
    projectIdIdx: index('vr_sessions_project_id_idx').on(table.projectId),
    userIdIdx: index('vr_sessions_user_id_idx').on(table.userId),
}));
// =====================================
// AR_MARKERS
// =====================================
export const arMarkers = pgTable('ar_markers', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    markerType: varchar('marker_type', { length: 50 }).notNull(), // 'qr', 'aruco', 'nft'
    markerData: text('marker_data').notNull(), // QR URL, ARuco ID, or NFT image URL
    name: varchar('name', { length: 255 }),
    linkedObjectId: varchar('linked_object_id', { length: 255 }), // IFC element ID
    position: jsonb('position').$type(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    projectIdIdx: index('ar_markers_project_id_idx').on(table.projectId),
}));
// =====================================
// SPATIAL_ANCHORS
// =====================================
export const spatialAnchors = pgTable('spatial_anchors', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    anchorType: varchar('anchor_type', { length: 50 }).notNull(), // 'cloud', 'local', 'geospatial'
    cloudAnchorId: varchar('cloud_anchor_id', { length: 255 }),
    position: jsonb('position').$type(),
    rotation: jsonb('rotation').$type(),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    projectIdIdx: index('spatial_anchors_project_id_idx').on(table.projectId),
}));
// =====================================
// COLLABORATION_SESSIONS
// =====================================
export const collaborationSessions = pgTable('collaboration_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sessionName: varchar('session_name', { length: 255 }),
    participants: jsonb('participants').$type(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
}, (table) => ({
    projectIdIdx: index('collaboration_sessions_project_id_idx').on(table.projectId),
}));
// =====================================
// ANNOTATIONS
// =====================================
export const annotations = pgTable('annotations', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    elementId: varchar('element_id', { length: 255 }), // IFC element ID
    position: jsonb('position').$type(),
    text: text('text'),
    type: varchar('type', { length: 50 }), // 'comment', 'issue', 'measurement'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
}, (table) => ({
    projectIdIdx: index('annotations_project_id_idx').on(table.projectId),
    createdByIdx: index('annotations_created_by_idx').on(table.createdBy),
}));
//# sourceMappingURL=immersive.js.map