// StorageService.ts
// Implementação inicial do StorageService conforme especificação da etapa 10


import { Readable } from 'stream';
import { minioClient } from './minio.client';
const BUCKET = process.env.MINIO_BUCKET || 'arxisvr-files';

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

export class StorageService {
  // Métodos principais (assinaturas)
  /**
   * Faz upload de um arquivo para o bucket MinIO.
   * Requer permissão 'models:upload'.
   * Loga auditoria via ObservabilityService.
   * @param file Buffer ou stream do arquivo
   * @param path Caminho destino no bucket
   * @param options Opções de upload, contexto de usuário e tenant
   */
  async uploadFile(file: Buffer | Readable, path: string, options?: UploadOptions): Promise<string> {
    // Permissão: models:upload
    if (!options?.permissions?.includes('models:upload')) {
      throw new Error('Permission denied: models:upload');
    }

    // Cria bucket se não existir
    const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1');
    }

    // Upload simples (multi-part pode ser adicionado depois)
    const meta = options?.metadata || {};
    await minioClient.putObject(BUCKET, path, file, undefined, meta);

    // Log de auditoria
    if (options?.tenantId && options?.userId) {
      const { observabilityService } = await import('../../core/observability/service');
      await observabilityService.logAudit({
        tenantId: options.tenantId,
        userId: options.userId,
        action: 'upload',
        resource: 'storage.file',
        resourceId: path,
        metadata: meta,
      });
    }

    // Callback de progresso (mock, pois MinIO SDK não expõe progresso nativo)
    if (options?.onProgress) options.onProgress(100);

    // Retorna URL do arquivo (não assinada)
    return `${BUCKET}/${path}`;
  }

  /**
   * Faz download de um arquivo do bucket MinIO.
   * Requer permissão 'models:read'.
   * Loga auditoria via ObservabilityService.
   * @param path Caminho do arquivo
   * @param options Opções de download, contexto de usuário e tenant
   */
  async downloadFile(path: string, options?: DownloadOptions): Promise<Buffer> {
    // Permissão: models:read
    if (!options?.permissions?.includes('models:read')) {
      throw new Error('Permission denied: models:read');
    }
    // Download do arquivo do MinIO
    // Suporte a range pode ser adicionado depois
    const stream = await minioClient.getObject(BUCKET, path);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    // Log de auditoria
    if (options?.tenantId && options?.userId) {
      const { observabilityService } = await import('../../core/observability/service');
      await observabilityService.logAudit({
        tenantId: options.tenantId,
        userId: options.userId,
        action: 'download',
        resource: 'storage.file',
        resourceId: path,
      });
    }
    return Buffer.concat(chunks);
  }

  /**
   * Lista arquivos do bucket MinIO, com paginação e filtro por prefixo.
   * @param params Parâmetros de listagem
   */
  async listFiles(params?: ListFilesParams): Promise<{ files: FileInfo[]; nextMarker?: string }> {
    // Listagem paginada e filtrada
    const prefix = params?.prefix || '';
    const limit = params?.limit || 100;
    const marker = params?.marker;
    const files: FileInfo[] = [];
    let nextMarker: string | undefined = undefined;
    let count = 0;
    const stream = minioClient.listObjectsV2(BUCKET, prefix, false, marker);
    for await (const obj of stream) {
      if (count >= limit) {
        nextMarker = obj.name;
        break;
      }
      files.push({
        name: obj.name,
        url: `${BUCKET}/${obj.name}`,
        size: obj.size,
        lastModified: obj.lastModified,
      });
      count++;
    }
    return { files, nextMarker };
  }

  /**
   * Remove um arquivo do bucket MinIO.
   * Requer permissão 'models:delete'.
   * Loga auditoria via ObservabilityService.
   * @param path Caminho do arquivo
   * @param options Contexto de usuário e tenant
   */
  async deleteFile(path: string, options?: { userId?: string; tenantId?: string; permissions?: string[] }): Promise<void> {
    // Permissão: models:delete
    if (!options?.permissions?.includes('models:delete')) {
      throw new Error('Permission denied: models:delete');
    }
    await minioClient.removeObject(BUCKET, path);
    // Log de auditoria
    if (options?.tenantId && options?.userId) {
      const { observabilityService } = await import('../../core/observability/service');
      await observabilityService.logAudit({
        tenantId: options.tenantId,
        userId: options.userId,
        action: 'delete',
        resource: 'storage.file',
        resourceId: path,
      });
    }
  }

  /**
   * Remove múltiplos arquivos do bucket MinIO.
   * Requer permissão 'models:delete'.
   * Loga auditoria via ObservabilityService.
   * @param paths Lista de caminhos
   * @param options Contexto de usuário e tenant
   */
  async deleteFiles(paths: string[], options?: { userId?: string; tenantId?: string; permissions?: string[] }): Promise<void[]> {
    // Permissão: models:delete
    if (!options?.permissions?.includes('models:delete')) {
      throw new Error('Permission denied: models:delete');
    }
    return Promise.all(paths.map((p) => this.deleteFile(p, options)));
  }

  /**
   * Gera uma URL assinada temporária para download seguro.
   * @param path Caminho do arquivo
   * @param expiresIn Tempo de expiração em segundos
   */
  async getFileUrl(path: string, expiresIn?: number): Promise<string> {
    // Gera URL assinada temporária
    const expiry = expiresIn || 60 * 60; // 1h padrão
    return minioClient.presignedGetObject(BUCKET, path, expiry);
  }

  /**
   * Obtém metadados de um arquivo do bucket MinIO.
   * @param path Caminho do arquivo
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    // TODO: Implementar obtenção de metadados
    throw new Error('Not implemented');
  }


  /**
   * Lista versões de um arquivo (versionamento habilitado).
   * @param path Caminho do arquivo
   */
  async getFileVersions(path: string): Promise<FileVersionInfo[]> {
    // Listar versões do arquivo (MinIO/S3 API compatível)
    // MinIO precisa estar com versionamento habilitado no bucket
    const versions: FileVersionInfo[] = [];
    const stream = minioClient.listObjectVersions(BUCKET, path);
    for await (const obj of stream) {
      if (obj.name === path && obj.versionId) {
        versions.push({
          versionId: obj.versionId,
          lastModified: obj.lastModified,
        });
      }
    }
    return versions;
  }


  /**
   * Restaura uma versão anterior de um arquivo.
   * @param path Caminho do arquivo
   * @param versionId ID da versão a restaurar
   */
  async restoreFileVersion(path: string, versionId: string): Promise<void> {
    // Restaura uma versão antiga copiando-a para a versão atual
    // MinIO/S3: copyObject com versionId de origem
    await minioClient.copyObject(
      BUCKET,
      path,
      `/${BUCKET}/${path}?versionId=${versionId}`
    );
  }
}
