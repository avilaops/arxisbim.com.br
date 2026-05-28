import { Readable } from 'stream';
export interface UploadOptions {
    onProgress?: (progress: number) => void;
    metadata?: Record<string, any>;
    userId?: string;
    tenantId?: string;
    permissions?: string[];
}
export interface DownloadOptions {
    range?: [number, number];
    userId?: string;
    tenantId?: string;
    permissions?: string[];
}
export interface ListFilesParams {
    prefix?: string;
    limit?: number;
    marker?: string;
    filters?: Record<string, any>;
}
export interface FileInfo {
    name: string;
    url: string;
    size: number;
    lastModified: Date;
    metadata?: Record<string, any>;
}
export interface FileMetadata {
    size: number;
    lastModified: Date;
    contentType: string;
    metadata?: Record<string, any>;
}
export interface FileVersionInfo {
    versionId: string;
    lastModified: Date;
}
export declare class StorageService {
    /**
     * Faz upload de um arquivo para o bucket MinIO.
     * Requer permissão 'models:upload'.
     * Loga auditoria via ObservabilityService.
     * @param file Buffer ou stream do arquivo
     * @param path Caminho destino no bucket
     * @param options Opções de upload, contexto de usuário e tenant
     */
    uploadFile(file: Buffer | Readable, path: string, options?: UploadOptions): Promise<string>;
    /**
     * Faz download de um arquivo do bucket MinIO.
     * Requer permissão 'models:read'.
     * Loga auditoria via ObservabilityService.
     * @param path Caminho do arquivo
     * @param options Opções de download, contexto de usuário e tenant
     */
    downloadFile(path: string, options?: DownloadOptions): Promise<Buffer>;
    /**
     * Lista arquivos do bucket MinIO, com paginação e filtro por prefixo.
     * @param params Parâmetros de listagem
     */
    listFiles(params?: ListFilesParams): Promise<{
        files: FileInfo[];
        nextMarker?: string;
    }>;
    /**
     * Remove um arquivo do bucket MinIO.
     * Requer permissão 'models:delete'.
     * Loga auditoria via ObservabilityService.
     * @param path Caminho do arquivo
     * @param options Contexto de usuário e tenant
     */
    deleteFile(path: string, options?: {
        userId?: string;
        tenantId?: string;
        permissions?: string[];
    }): Promise<void>;
    /**
     * Remove múltiplos arquivos do bucket MinIO.
     * Requer permissão 'models:delete'.
     * Loga auditoria via ObservabilityService.
     * @param paths Lista de caminhos
     * @param options Contexto de usuário e tenant
     */
    deleteFiles(paths: string[], options?: {
        userId?: string;
        tenantId?: string;
        permissions?: string[];
    }): Promise<void[]>;
    /**
     * Gera uma URL assinada temporária para download seguro.
     * @param path Caminho do arquivo
     * @param expiresIn Tempo de expiração em segundos
     */
    getFileUrl(path: string, expiresIn?: number): Promise<string>;
    /**
     * Obtém metadados de um arquivo do bucket MinIO.
     * @param path Caminho do arquivo
     */
    getFileMetadata(path: string): Promise<FileMetadata>;
    /**
     * Lista versões de um arquivo (versionamento habilitado).
     * @param path Caminho do arquivo
     */
    getFileVersions(path: string): Promise<FileVersionInfo[]>;
    /**
     * Restaura uma versão anterior de um arquivo.
     * @param path Caminho do arquivo
     * @param versionId ID da versão a restaurar
     */
    restoreFileVersion(path: string, versionId: string): Promise<void>;
}
//# sourceMappingURL=storage.service.d.ts.map