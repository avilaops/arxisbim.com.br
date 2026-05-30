import { z } from 'zod';
export declare const createMeetingSchema: z.ZodObject<{
    projectId: z.ZodString;
    hostUserId: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        maxParticipants: z.ZodOptional<z.ZodNumber>;
        allowRecording: z.ZodOptional<z.ZodBoolean>;
        allowChat: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    avatarSettings: z.ZodOptional<z.ZodObject<{
        defaultAvatar: z.ZodOptional<z.ZodString>;
        allowCustomAvatars: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const joinMeetingSchema: z.ZodObject<{
    roomId: z.ZodString;
    userId: z.ZodString;
    userName: z.ZodString;
    avatarState: z.ZodOptional<z.ZodObject<{
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>;
        rotation: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>;
        animation: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const updateAvatarSchema: z.ZodObject<{
    position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>>;
    rotation: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodString>;
    scale: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const sendMessageSchema: z.ZodObject<{
    roomId: z.ZodString;
    userId: z.ZodString;
    userName: z.ZodString;
    message: z.ZodString;
    messageType: z.ZodOptional<z.ZodEnum<{
        text: "text";
        system: "system";
        announcement: "announcement";
    }>>;
}, z.core.$strip>;
export declare const createActionSchema: z.ZodObject<{
    roomId: z.ZodString;
    userId: z.ZodString;
    actionType: z.ZodEnum<{
        laser_pointer: "laser_pointer";
        annotation: "annotation";
        highlight: "highlight";
        measure: "measure";
        section: "section";
    }>;
    actionData: z.ZodRecord<z.ZodString, z.ZodAny>;
    targetElementId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const collaborationUpdateSchema: z.ZodObject<{
    update: z.ZodArray<z.ZodNumber>;
    origin: z.ZodOptional<z.ZodUnion<[z.ZodEnum<{
        selection: "selection";
        snapshot: "snapshot";
        annotation: "annotation";
        section: "section";
        presence: "presence";
    }>, z.ZodString]>>;
    isSnapshot: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const collaborationHistoryQuerySchema: z.ZodObject<{
    afterVersion: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateActionInput = z.infer<typeof createActionSchema>;
export type CollaborationUpdateInput = z.infer<typeof collaborationUpdateSchema>;
export type CollaborationHistoryQuery = z.infer<typeof collaborationHistoryQuerySchema>;
//# sourceMappingURL=meetings.schemas.d.ts.map