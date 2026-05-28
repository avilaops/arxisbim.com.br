import { z } from 'zod';
export declare const companyBrandingSchema: z.ZodObject<{
    primaryColor: z.ZodOptional<z.ZodString>;
    secondaryColor: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createCompanySchema: z.ZodObject<{
    companyId: z.ZodString;
    name: z.ZodString;
    branding: z.ZodOptional<z.ZodObject<{
        primaryColor: z.ZodOptional<z.ZodString>;
        secondaryColor: z.ZodOptional<z.ZodString>;
        logo: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const updateCompanySchema: z.ZodObject<{
    companyId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    branding: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        primaryColor: z.ZodOptional<z.ZodString>;
        secondaryColor: z.ZodOptional<z.ZodString>;
        logo: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const companyResponseSchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    name: z.ZodString;
    branding: z.ZodNullable<z.ZodObject<{
        primaryColor: z.ZodOptional<z.ZodString>;
        secondaryColor: z.ZodOptional<z.ZodString>;
        logo: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    password: z.ZodString;
    companyId: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodEnum<{
        user: "user";
        admin: "admin";
        viewer: "viewer";
    }>>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const userResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    companyId: z.ZodNullable<z.ZodString>;
    role: z.ZodString;
    createdAt: z.ZodDate;
    lastLoginAt: z.ZodNullable<z.ZodDate>;
}, z.core.$strip>;
export declare const createProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    location: z.ZodDefault<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<{
        draft: "draft";
        archived: "archived";
        completed: "completed";
        in_progress: "in_progress";
        under_review: "under_review";
    }>>;
    owner: z.ZodString;
    companyId: z.ZodString;
}, z.core.$strip>;
export declare const updateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    location: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        draft: "draft";
        archived: "archived";
        completed: "completed";
        in_progress: "in_progress";
        under_review: "under_review";
    }>>>;
    owner: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const projectResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    location: z.ZodString;
    status: z.ZodString;
    modelPath: z.ZodNullable<z.ZodString>;
    owner: z.ZodString;
    companyId: z.ZodString;
    elementCount: z.ZodNumber;
    progress: z.ZodNumber;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export declare const uploadModelSchema: z.ZodObject<{
    projectId: z.ZodString;
    companyId: z.ZodString;
    uploadedBy: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const modelStatusSchema: z.ZodEnum<{
    completed: "completed";
    processing: "processing";
    failed: "failed";
    queued: "queued";
}>;
export declare const projectModelResponseSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    companyId: z.ZodString;
    modelPath: z.ZodString;
    fileName: z.ZodString;
    fileSize: z.ZodNumber;
    contentType: z.ZodString;
    storageUrl: z.ZodNullable<z.ZodString>;
    processingStatus: z.ZodEnum<{
        completed: "completed";
        processing: "processing";
        failed: "failed";
        queued: "queued";
    }>;
    processingError: z.ZodNullable<z.ZodString>;
    uploadedBy: z.ZodNullable<z.ZodString>;
    uploadedAt: z.ZodDate;
    processedAt: z.ZodNullable<z.ZodDate>;
}, z.core.$strip>;
export declare const createWebhookSchema: z.ZodObject<{
    companyId: z.ZodString;
    eventType: z.ZodEnum<{
        "model.uploaded": "model.uploaded";
        "model.processed": "model.processed";
        "model.failed": "model.failed";
        "project.created": "project.created";
        "project.updated": "project.updated";
    }>;
    url: z.ZodString;
    secret: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const webhookResponseSchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    eventType: z.ZodString;
    url: z.ZodString;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    lastAttemptAt: z.ZodNullable<z.ZodDate>;
    lastSuccessfulAt: z.ZodNullable<z.ZodDate>;
    lastError: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    sort: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
}, z.core.$strip>;
export declare const paginatedResponseSchema: <T extends z.ZodType>(itemSchema: T) => z.ZodObject<{
    data: z.ZodArray<T>;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const errorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
    statusCode: z.ZodNumber;
    timestamp: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type CompanyBranding = z.infer<typeof companyBrandingSchema>;
export type CreateCompany = z.infer<typeof createCompanySchema>;
export type UpdateCompany = z.infer<typeof updateCompanySchema>;
export type CompanyResponse = z.infer<typeof companyResponseSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type UploadModel = z.infer<typeof uploadModelSchema>;
export type ModelStatus = z.infer<typeof modelStatusSchema>;
export type ProjectModelResponse = z.infer<typeof projectModelResponseSchema>;
export type CreateWebhook = z.infer<typeof createWebhookSchema>;
export type WebhookResponse = z.infer<typeof webhookResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
//# sourceMappingURL=index.d.ts.map