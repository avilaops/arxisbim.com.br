// storage.controller.ts
// Controller para StorageService com integração HTTP
import { StorageService } from './storage.service.js';
export class StorageController {
    storageService = new StorageService();
    async uploadFile(req, reply) {
        try {
            const data = await req.file();
            if (!data) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }
            const options = {
                userId: req.user.userId,
                tenantId: req.user.tenantId,
                metadata: req.body,
                permissions: ['models:upload'],
            };
            const result = await this.storageService.uploadFile(data.file, data.filename, options);
            return reply.send(result);
        }
        catch (error) {
            return reply.code(500).send({ error: 'Upload failed', message: error.message });
        }
    }
    async downloadFile(req, reply) {
        try {
            const { path } = req.params;
            const options = {
                userId: req.user.userId,
                tenantId: req.user.tenantId,
            };
            const stream = await this.storageService.downloadFile(path, options);
            reply.header('Content-Disposition', `attachment; filename="${path}"`);
            return reply.type('application/octet-stream').send(stream);
        }
        catch (error) {
            return reply.code(404).send({ error: 'File not found', message: error.message });
        }
    }
    async listFiles(req, reply) {
        try {
            const params = req.query;
            const files = await this.storageService.listFiles(params);
            return reply.send(files);
        }
        catch (error) {
            return reply.code(500).send({ error: 'List failed', message: error.message });
        }
    }
    async deleteFile(req, reply) {
        try {
            const { path } = req.params;
            await this.storageService.deleteFile(path);
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.code(500).send({ error: 'Delete failed', message: error.message });
        }
    }
    async deleteFiles(req, reply) {
        try {
            const { paths } = req.body;
            await this.storageService.deleteFiles(paths);
            return reply.send({ success: true, deleted: paths.length });
        }
        catch (error) {
            return reply.code(500).send({ error: 'Batch delete failed', message: error.message });
        }
    }
    async getFileUrl(req, reply) {
        try {
            const { path } = req.params;
            const { expiresIn } = req.query;
            const url = await this.storageService.getFileUrl(path, expiresIn);
            return reply.send({ url });
        }
        catch (error) {
            return reply.code(500).send({ error: 'URL generation failed', message: error.message });
        }
    }
    async getFileMetadata(req, reply) {
        try {
            const { path } = req.params;
            const metadata = await this.storageService.getFileMetadata(path);
            return reply.send(metadata);
        }
        catch (error) {
            return reply.code(404).send({ error: 'File not found', message: error.message });
        }
    }
    async getFileVersions(req, reply) {
        try {
            const { path } = req.params;
            const versions = await this.storageService.getFileVersions(path);
            return reply.send(versions);
        }
        catch (error) {
            return reply.code(500).send({ error: 'Version list failed', message: error.message });
        }
    }
    async restoreFileVersion(req, reply) {
        try {
            const { path, versionId } = req.params;
            await this.storageService.restoreFileVersion(path, versionId);
            return reply.send({ success: true });
        }
        catch (error) {
            return reply.code(500).send({ error: 'Restore failed', message: error.message });
        }
    }
}
//# sourceMappingURL=storage.controller.js.map