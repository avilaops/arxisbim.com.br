// StorageController: orquestra lógica de arquivos IFC
import { StorageService } from '../services/storageService';
import { emit } from '../core/eventBus';

export class StorageController {
  constructor(private storageService: StorageService) {}

  async uploadIFC(file: File) {
    const stored = await this.storageService.uploadIFC(file);
    emit('ifc:uploaded', stored);
    return stored;
  }

  async downloadIFC(id: string) {
    const blob = await this.storageService.downloadIFC(id);
    emit('ifc:downloaded', blob);
    return blob;
  }

  async listFiles() {
    const files = await this.storageService.listFiles();
    emit('ifc:files', files);
    return files;
  }
}
