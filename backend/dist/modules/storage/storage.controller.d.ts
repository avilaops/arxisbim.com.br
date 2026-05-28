import type { FastifyRequest, FastifyReply } from 'fastify';
type AuthenticatedRequest = FastifyRequest & {
    user: {
        userId: string;
        tenantId: string;
        role?: string;
    };
};
export declare class StorageController {
    private storageService;
    uploadFile(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    downloadFile(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    listFiles(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    deleteFile(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    deleteFiles(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getFileUrl(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getFileMetadata(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    getFileVersions(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
    restoreFileVersion(req: AuthenticatedRequest, reply: FastifyReply): Promise<never>;
}
export {};
//# sourceMappingURL=storage.controller.d.ts.map