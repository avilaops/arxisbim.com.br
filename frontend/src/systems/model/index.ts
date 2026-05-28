/**
 * Model System - Gerenciamento de modelos federados
 */

export { ModelSession } from './ModelSession';
export type {
  LoadedModel,
  PerformanceBudget,
  LODStrategy,
  SelectionState,
  CameraState
} from './ModelSession';

export { FederatedLoader } from './FederatedLoader';
export type {
  FederatedModel
} from './FederatedLoader';
export { ModelDiscipline, ConstructionPhase } from './FederatedLoader';

export { IFCUploadManager, getIFCUploadManager } from './IFCUploadManager';
export type {
  IFCUploadOptions,
  IFCUploadProgress
} from './IFCUploadManager';

export { IFCProjectPanel } from './IFCProjectPanel';
export type {
  IFCProjectPanelOptions
} from './IFCProjectPanel';
