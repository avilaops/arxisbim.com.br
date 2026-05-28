import { z } from 'zod';
// =====================================
// COMPANY SCHEMAS
// =====================================
export const companyBrandingSchema = z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    logo: z.string().url().optional(),
});
export const createCompanySchema = z.object({
    companyId: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
    name: z.string().min(3).max(255),
    branding: companyBrandingSchema.optional(),
});
export const updateCompanySchema = createCompanySchema.partial();
export const companyResponseSchema = z.object({
    id: z.string().uuid(),
    companyId: z.string(),
    name: z.string(),
    branding: companyBrandingSchema.nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// =====================================
// USER SCHEMAS
// =====================================
export const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(3).max(255),
    password: z.string().min(8).max(100),
    companyId: z.string().optional(),
    role: z.enum(['admin', 'user', 'viewer']).default('user'),
});
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});
export const userResponseSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    companyId: z.string().nullable(),
    role: z.string(),
    createdAt: z.date(),
    lastLoginAt: z.date().nullable(),
});
// =====================================
// PROJECT SCHEMAS
// =====================================
export const createProjectSchema = z.object({
    name: z.string().min(3).max(255),
    description: z.string().max(1000).default(''),
    location: z.string().max(255).default(''),
    status: z.enum(['draft', 'in_progress', 'under_review', 'completed', 'archived']).default('draft'),
    owner: z.string().min(3).max(255),
    companyId: z.string(),
});
export const updateProjectSchema = createProjectSchema.partial();
export const projectResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
    status: z.string(),
    modelPath: z.string().nullable(),
    owner: z.string(),
    companyId: z.string(),
    elementCount: z.number().int(),
    progress: z.number().min(0).max(1),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// =====================================
// PROJECT MODEL SCHEMAS
// =====================================
export const uploadModelSchema = z.object({
    projectId: z.string().uuid(),
    companyId: z.string(),
    uploadedBy: z.string().optional(),
});
export const modelStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed']);
export const projectModelResponseSchema = z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    companyId: z.string(),
    modelPath: z.string(),
    fileName: z.string(),
    fileSize: z.number().int(),
    contentType: z.string(),
    storageUrl: z.string().nullable(),
    processingStatus: modelStatusSchema,
    processingError: z.string().nullable(),
    uploadedBy: z.string().nullable(),
    uploadedAt: z.date(),
    processedAt: z.date().nullable(),
});
// =====================================
// WEBHOOK SCHEMAS
// =====================================
export const createWebhookSchema = z.object({
    companyId: z.string(),
    eventType: z.enum(['model.uploaded', 'model.processed', 'model.failed', 'project.created', 'project.updated']),
    url: z.string().url(),
    secret: z.string().min(16).optional(),
});
export const webhookResponseSchema = z.object({
    id: z.string().uuid(),
    companyId: z.string(),
    eventType: z.string(),
    url: z.string(),
    isActive: z.boolean(),
    createdAt: z.date(),
    lastAttemptAt: z.date().nullable(),
    lastSuccessfulAt: z.date().nullable(),
    lastError: z.string().nullable(),
});
// =====================================
// PAGINATION SCHEMAS
// =====================================
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
});
export const paginatedResponseSchema = (itemSchema) => z.object({
    data: z.array(itemSchema),
    pagination: z.object({
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
        totalPages: z.number().int(),
    }),
});
// =====================================
// ERROR SCHEMAS
// =====================================
export const errorResponseSchema = z.object({
    error: z.string(),
    message: z.string(),
    statusCode: z.number().int(),
    timestamp: z.string(),
    path: z.string().optional(),
    details: z.record(z.string(), z.any()).optional(),
});
//# sourceMappingURL=index.js.map