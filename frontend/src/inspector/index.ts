/**
 * Inspector Module - Properties Inspector System
 * 
 * Feature plugável e isolada para inspeção de objetos 3D
 */

export { SelectionService, selectionService } from './SelectionService';
export { RaycastPicker } from './RaycastPicker';
export { PropertyResolver, propertyResolver } from './PropertyResolver';
export { InspectorPanel } from './InspectorPanel';
export { InspectorController, inspectorController, ENABLE_INSPECTOR } from './InspectorController';

export type { SelectionPayload } from './SelectionService';
export type { PropertySection, PropertyItem } from './PropertyResolver';
