/**
 * IFC → Takeoff adapter.
 *
 * Thin wrapper over `meshesToQueryableElements` (Sprint 5) that re-types
 * the result as `IfcElementSource[]` so the 5D pipeline (QuantityExtractor /
 * TakeoffManager) can consume scene meshes directly.
 *
 * The two element shapes (`QueryableElement` and `IfcElementSource`) are
 * structurally identical for the fields the 5D engine reads
 * (`expressID`, `ifcType`, `propertySets`, `geometry.bboxMin/Max`),
 * so a cast is safe — `null` property values that exist in
 * `QueryableElement.PropertyValue` are filtered out before they reach
 * `QuantityExtractor.toNumber` which already guards against non-numerics.
 */

import type { Object3D } from 'three';
import { meshesToQueryableElements, type AdapterOptions } from '../query/IfcQueryAdapter';
import type { IfcElementSource } from './types';

export interface TakeoffAdapterResult {
  elements: IfcElementSource[];
  /** expressID (string) → Three.js object that produced it. */
  elementToObject: Map<string, Object3D>;
}

export function meshesToIfcElements(
  meshes: Object3D[],
  options: AdapterOptions = {},
): TakeoffAdapterResult {
  const { elements, elementToObject } = meshesToQueryableElements(meshes, options);
  return {
    elements: elements as unknown as IfcElementSource[],
    elementToObject,
  };
}
