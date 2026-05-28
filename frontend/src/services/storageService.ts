// Interface e implementação base do StorageService
export interface StorageService {
  uploadIFC(file: File): Promise<void>;
  downloadIFC(id: string): Promise<Blob>;
  listFiles(): Promise<any[]>;
}

export const storageService: StorageService = {
  async uploadIFC(file) {
    // TODO: implementar upload real
    return;
  },
  async downloadIFC(id) {
    // TODO: implementar download real
    return new Blob();
  },
  async listFiles() {
    // TODO: implementar listagem real
    return [];
  }
};
