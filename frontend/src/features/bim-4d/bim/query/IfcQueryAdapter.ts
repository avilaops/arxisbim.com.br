/**
 * IFC → Query adapter.
 *
 * Converts a flat list of Three.js objects (typically loaded by IFCLoader)
 * into the `QueryableElement[]` shape consumed by the Query Engine.
 *
 * Reads element identity from `userData.expressID` / `userData.ifcId` and
 * `userData.ifcType`. Property sets are pulled from `userData.psets`
 * (array shapes from web-ifc or flat objects) plus any flat
 * `userData.properties` map.
 *
 * Pure module — no async, no IFC runtime calls. Caller is expected to have
 * the meshes already populated with the relevant userData fields.
 */

import * as THREE from 'three';
import type { PropertyValue, QueryableElement } from './types';

export interface AdapterOptions {
  /** Skip objects without an `ifcType`. Default true. */
  requireType?: boolean;
  /** Include axis-aligned bbox computed via Box3.setFromObject. Default true. */
  includeBbox?: boolean;
  /** When userData.properties has flat scalars, put them under this pset name. */
  flatPsetName?: string;
}

/** Adapter result: queryable elements + a uuid→Object3D map for back-resolution. */
export interface AdapterResult {
  elements: QueryableElement[];
  /** expressID (string) → Three.js object that produced it. */
  elementToObject: Map<string, THREE.Object3D>;
}

const DEFAULTS: Required<AdapterOptions> = {
  requireType: true,
  includeBbox: true,
  flatPsetName: 'Pset_Common',
};

export function meshesToQueryableElements(
  objects: THREE.Object3D[],
  options: AdapterOptions = {},
): AdapterResult {
  const opts: Required<AdapterOptions> = { ...DEFAULTS, ...options };
  const elements: QueryableElement[] = [];
  const elementToObject = new Map<string, THREE.Object3D>();

  for (const obj of objects) {
    const ud = obj.userData ?? {};
    const ifcType: string | undefined = ud.ifcType ?? ud.type;
    if (opts.requireType && !ifcType) continue;

    const rawId = ud.expressID ?? ud.ifcId ?? obj.uuid;
    const expressID: string | number = typeof rawId === 'number' ? rawId : String(rawId);

    const propertySets = buildPropertySets(ud, opts.flatPsetName);

    let geometry: QueryableElement['geometry'];
    if (opts.includeBbox) {
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        geometry = {
          bboxMin: [box.min.x, box.min.y, box.min.z],
          bboxMax: [box.max.x, box.max.y, box.max.z],
        };
      }
    }

    const el: QueryableElement = {
      expressID,
      ifcType: ifcType ?? 'Unknown',
      ...(propertySets ? { propertySets } : {}),
      ...(geometry ? { geometry } : {}),
    };
    elements.push(el);
    elementToObject.set(String(expressID), obj);
  }

  return { elements, elementToObject };
}

function buildPropertySets(
  ud: Record<string, unknown>,
  flatPsetName: string,
): Record<string, Record<string, PropertyValue>> | undefined {
  const out: Record<string, Record<string, PropertyValue>> = {};

  const psets = ud.psets;
  if (Array.isArray(psets)) {
    for (const raw of psets) {
      if (!raw || typeof raw !== 'object') continue;
      const p = raw as Record<string, unknown>;
      const name = (p.Name ?? p.name ?? 'Unnamed') as string;
      const propsRaw = p.HasProperties ?? p.properties ?? {};
      out[name] = normalizePropsAny(propsRaw);
    }
  } else if (psets && typeof psets === 'object') {
    for (const [name, props] of Object.entries(psets as Record<string, unknown>)) {
      if (props && typeof props === 'object') {
        out[name] = normalizePropsAny(props);
      }
    }
  }

  const flat = ud.properties;
  if (flat && typeof flat === 'object' && !Array.isArray(flat)) {
    const normalized = normalizeProps(flat as Record<string, unknown>);
    if (Object.keys(normalized).length) {
      out[flatPsetName] = { ...(out[flatPsetName] ?? {}), ...normalized };
    }
  }

  return Object.keys(out).length ? out : undefined;
}

function normalizeProps(src: Record<string, unknown>): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = normalizeValue(v);
  }
  return out;
}

/**
 * Accepts either:
 *  - a flat map `{ LoadBearing: true, FireRating: "60min" }`
 *  - the web-ifc `HasProperties` array `[{ Name, NominalValue: { value } }]`
 */
function normalizePropsAny(src: unknown): Record<string, PropertyValue> {
  if (Array.isArray(src)) {
    const out: Record<string, PropertyValue> = {};
    for (const item of src) {
      if (!item || typeof item !== 'object') continue;
      const p = item as Record<string, unknown>;
      const name = (p.Name ?? p.name) as string | undefined;
      if (!name) continue;
      const valueHolder =
        (p.NominalValue as unknown) ??
        (p.nominalValue as unknown) ??
        (p.value as unknown) ??
        p;
      out[name] = normalizeValue(valueHolder);
    }
    return out;
  }
  if (src && typeof src === 'object') {
    return normalizeProps(src as Record<string, unknown>);
  }
  return {};
}

function normalizeValue(v: unknown): PropertyValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    // web-ifc shape: { value, type, unit? }
    if ('value' in obj) {
      const inner = obj.value;
      if (
        typeof inner === 'number' ||
        typeof inner === 'string' ||
        typeof inner === 'boolean'
      ) {
        const wrapped: { value: number | string | boolean; unit?: string; type?: string } = {
          value: inner,
        };
        if (typeof obj.unit === 'string') wrapped.unit = obj.unit;
        if (typeof obj.type === 'string') wrapped.type = obj.type;
        return wrapped;
      }
    }
  }
  return null;
}
