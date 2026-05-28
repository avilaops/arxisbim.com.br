// ViewerController: orquestra lógica entre UI e serviços do viewer
import { ViewerHost } from '../viewer/ViewerHost';
import { IfcService } from '../services/ifcService';

export class ViewerController {
  constructor(private viewer: ViewerHost, private ifcService: IfcService) {}

  async loadIFC(file: File) {
    console.log('[ViewerController] upload IFC iniciado', { fileName: file.name });
    try {
      const model = await this.ifcService.parseIFC(file);
      this.viewer.addModel(model);
      console.log('[ViewerController] IFC carregado com sucesso', { fileName: file.name });
      // Evento de sucesso de upload IFC
      import('../core/eventBus.simple').then(({ emit }) => {
        emit('event:log', { type: 'ifc_upload_success', fileName: file.name, timestamp: Date.now() });
      });
    } catch (err) {
      console.error('[ViewerController] Erro ao carregar IFC', { fileName: file.name, error: err });
      import('../core/eventBus.simple').then(({ emit }) => {
        emit('event:log', { type: 'ifc_upload_error', fileName: file.name, error: String(err), timestamp: Date.now() });
      });
      throw err;
    }
  }
}
