/**
 * BIM Query module — declarative queries against IFC element data.
 */

export * from './types';
export { QueryEngine } from './QueryEngine';
export { QueryBuilder, q } from './QueryBuilder';
export { QueryParser } from './QueryParser';
export { meshesToQueryableElements } from './IfcQueryAdapter';
export type { AdapterOptions, AdapterResult } from './IfcQueryAdapter';
