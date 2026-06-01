// StorageService — IFC file upload/download/listing.
// Backend routes live under /api/v1/ifc-models (see backend/src/routes/v1/ifc-models.ts).
// Previously a stub; now delegates to the shared ApiClient so the IFC pipeline
// (StorageController → IFCService) actually round-trips to the server.
import { api } from '../api/client';

export interface StoredIFCFile {
  id: string;
  name: string;
  size?: number;
  createdAt?: string;
  url?: string;
}

export interface StorageService {
  uploadIFC(file: File, onProgress?: (progress: number) => void): Promise<StoredIFCFile>;
  downloadIFC(id: string): Promise<Blob>;
  listFiles(): Promise<StoredIFCFile[]>;
}

const IFC_BASE = '/v1/ifc-models';

export const storageService: StorageService = {
  async uploadIFC(file, onProgress) {
    const url = await api.uploadFile(`${IFC_BASE}/upload`, file, onProgress);
    return {
      id: typeof url === 'string' ? url : '',
      name: file.name,
      size: file.size,
      url: typeof url === 'string' ? url : undefined,
    };
  },

  async downloadIFC(id) {
    return api.downloadFile(`${IFC_BASE}/${encodeURIComponent(id)}/download`);
  },

  async listFiles() {
    const data = await api.get<{ items?: StoredIFCFile[] } | StoredIFCFile[]>(IFC_BASE);
    if (Array.isArray(data)) return data;
    return data?.items ?? [];
  },
};
