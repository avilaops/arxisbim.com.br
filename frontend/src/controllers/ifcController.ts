// IfcController: orquestra lógica de manipulação IFC
import { IfcService } from '../services/ifcService';
import { emit } from '../core/eventBus';

export class IfcController {
  constructor(private ifcService: IfcService) {}

  async parseIFC(file: File) {
    const model = await this.ifcService.parseIFC(file);
    emit('ifc:parsed', model);
    return model;
  }

  async getProperties(modelId: string) {
    const props = await this.ifcService.getProperties(modelId);
    emit('ifc:properties', props);
    return props;
  }

  async exportGLB(modelId: string) {
    const blob = await this.ifcService.exportGLB(modelId);
    emit('ifc:exported', blob);
    return blob;
  }
}
