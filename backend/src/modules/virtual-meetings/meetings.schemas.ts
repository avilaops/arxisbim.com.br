import { z } from 'zod';

export const createMeetingSchema = z.object({
  projectId: z.string().uuid(),
  hostUserId: z.string().uuid().optional(), // Optional - extracted from JWT
  settings: z.object({
    maxParticipants: z.number().optional(),
    allowRecording: z.boolean().optional(),
    allowChat: z.boolean().optional(),
  }).optional(),
  avatarSettings: z.object({
    defaultAvatar: z.string().optional(),
    allowCustomAvatars: z.boolean().optional(),
  }).optional(),
});

export const joinMeetingSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  avatarState: z.object({
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    rotation: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    animation: z.string().optional(),
  }).optional(),
});

export const updateAvatarSchema = z.object({
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  rotation: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  animation: z.string().optional(),
  scale: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
});

export const sendMessageSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  message: z.string().min(1).max(1000),
  messageType: z.enum(['text', 'system', 'announcement']).optional(),
});

export const createActionSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  actionType: z.enum(['laser_pointer', 'annotation', 'highlight', 'measure', 'section']),
  actionData: z.record(z.any()),
  targetElementId: z.string().optional(),
});

const yjsUpdateSchema = z.array(z.number().int().min(0).max(255)).min(1);

export const collaborationUpdateSchema = z.object({
  update: yjsUpdateSchema,
  origin: z.enum(['selection', 'annotation', 'section', 'presence', 'snapshot']).or(z.string().min(1).max(50)).optional(),
  isSnapshot: z.boolean().optional(),
});

export const collaborationHistoryQuerySchema = z.object({
  afterVersion: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateActionInput = z.infer<typeof createActionSchema>;
export type CollaborationUpdateInput = z.infer<typeof collaborationUpdateSchema>;
export type CollaborationHistoryQuery = z.infer<typeof collaborationHistoryQuerySchema>;
