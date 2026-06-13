/**
 * IFC Parser Worker (S07) — roda web-ifc (WASM) em worker thread.
 *
 * Parser WASM é CPU-bound: rodar no event loop bloquearia o servidor inteiro
 * durante um parse de dezenas de MB. Isolado aqui, comunica via worker_threads.
 *
 * Produz o DTO `IFCStructure` (cache do parse). Fonte de verdade = IFC original.
 * Nunca lança p/ fora: erro vira `{ ok:false, errorType, message }` (status failed).
 */
import { parentPort } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import {
  buildStats, mergeBoundingBox,
} from './ifc-structure.builder.js';
import type {
  IFCStructure, IFCElement, SpatialNode, IfcSchema, BoundingBox,
} from './ifc-structure.dto.js';
import { IFC_STRUCTURE_VERSION } from './ifc-structure.dto.js';

// web-ifc node build (WASM). createRequire garante o artefato CJS de node,
// não o de browser (que usa fetch e quebra fora do navegador).
const require = createRequire(import.meta.url);
// require('web-ifc') resolve via condição "require"/"node" → web-ifc-api-node.js
// (build CJS de node). Subpath direto é bloqueado pelo campo exports do pacote.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebIFC = require('web-ifc');

const WASM_DIR = join(dirname(require.resolve('web-ifc')), '/');

const SPATIAL_TYPES = new Set([
  'IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE',
]);

export interface ParseRequest {
  /** Conteúdo bruto do .ifc. */
  buffer: ArrayBuffer;
  modelVersionId: string;
  reqId: string;
}

export type ParseResult =
  | { ok: true; structure: IFCStructure; durationMs: number; fileSizeMb: number }
  | { ok: false; errorType: string; message: string; durationMs: number };

function mapSchema(raw: string): IfcSchema {
  const s = (raw || '').toUpperCase();
  if (s.includes('IFC4X3') || s.includes('IFC4X2') || s.includes('IFC4X1')) return 'IFC4X3';
  if (s.includes('IFC4')) return 'IFC4';
  return 'IFC2X3';
}

function strOf(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'object' && 'value' in v) return v.value == null ? null : String(v.value);
  return String(v);
}

/** Aplica matriz 4x4 column-major (web-ifc/glMatrix) a um ponto. */
function applyMatrix(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

async function parse(req: ParseRequest): Promise<ParseResult> {
  const start = Date.now();
  const fileSizeMb = req.buffer.byteLength / (1024 * 1024);
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(WASM_DIR, true);
  await api.Init();

  let modelID = -1;
  try {
    const data = new Uint8Array(req.buffer);
    modelID = api.OpenModel(data, { COORDINATE_TO_ORIGIN: true });

    const schema = mapSchema(api.GetModelSchema(modelID));

    // ── Árvore espacial + elementos ────────────────────────────────
    const props = new WebIFC.Properties(api);
    const root = await props.getSpatialStructure(modelID, false);

    const elements: IFCElement[] = [];
    const spatialTree: SpatialNode[] = [];

    const lineCache = (id: number) => { try { return api.GetLine(modelID, id); } catch { return null; } };

    function walk(node: any, parentExpressID: number | null, storeyId: number | null): SpatialNode | null {
      const type: string = node.type || '';
      const line = lineCache(node.expressID);
      const globalId = strOf(line?.GlobalId) ?? '';
      const name = strOf(line?.Name);
      const isSpatial = SPATIAL_TYPES.has(type.toUpperCase());
      const nextStorey = type.toUpperCase() === 'IFCBUILDINGSTOREY' ? node.expressID : storeyId;

      if (isSpatial) {
        const sn: SpatialNode = { expressID: node.expressID, globalId, type, name, children: [] };
        for (const child of node.children || []) {
          const childSpatial = walk(child, node.expressID, nextStorey);
          if (childSpatial) sn.children.push(childSpatial);
        }
        return sn;
      }

      // Elemento (não-espacial): registra e segue descendo (agregações).
      elements.push({
        expressID: node.expressID,
        globalId,
        type,
        name,
        storeyId,
        parentExpressID,
        hasGeometry: false, // ajustado na varredura de geometria
      });
      for (const child of node.children || []) {
        walk(child, node.expressID, storeyId);
      }
      return null;
    }

    for (const child of root.children || []) {
      const sn = walk(child, root.expressID, null);
      if (sn) spatialTree.push(sn);
    }
    // A própria raiz (IfcProject) vira o topo da árvore.
    const rootLine = lineCache(root.expressID);
    const tree: SpatialNode[] = [{
      expressID: root.expressID,
      globalId: strOf(rootLine?.GlobalId) ?? '',
      type: root.type,
      name: strOf(rootLine?.Name),
      children: spatialTree,
    }];

    // ── Geometria → bounding box + hasGeometry ─────────────────────
    const withGeometry = new Set<number>();
    let bbox: BoundingBox | null = null;

    api.StreamAllMeshes(modelID, (mesh: any) => {
      const expressID: number = mesh.expressID;
      const geometries = mesh.geometries;
      for (let i = 0; i < geometries.size(); i++) {
        const placed = geometries.get(i);
        const geom = api.GetGeometry(modelID, placed.geometryExpressID);
        const verts: Float32Array = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
        const m = placed.flatTransformation;
        // 6 floats por vértice: posição(3) + normal(3). Só posição importa p/ bbox.
        for (let v = 0; v < verts.length; v += 6) {
          const [x, y, z] = applyMatrix(m, verts[v], verts[v + 1], verts[v + 2]);
          if (!bbox) {
            bbox = { min: [x, y, z], max: [x, y, z] };
          } else {
            bbox = mergeBoundingBox(bbox, { min: [x, y, z], max: [x, y, z] });
          }
        }
        withGeometry.add(expressID);
      }
    });

    for (const el of elements) {
      if (withGeometry.has(el.expressID)) el.hasGeometry = true;
    }

    // bbox OBRIGATÓRIO: sem geometria (modelo só-estrutura) → degenerado na origem.
    const boundingBox: BoundingBox = bbox ?? { min: [0, 0, 0], max: [0, 0, 0] };

    const headerName = (() => {
      try {
        const h = api.GetHeaderLine(modelID, WebIFC.FILE_NAME);
        return strOf(h?.arguments?.[0]) ?? '';
      } catch { return ''; }
    })();

    const structure: IFCStructure = {
      version: IFC_STRUCTURE_VERSION,
      schema,
      projectName: strOf(rootLine?.Name) || headerName || 'Untitled',
      units: { length: 'm', area: 'm2', volume: 'm3' }, // refinado em S13 (UnitAssignment)
      spatialTree: tree,
      elements,
      stats: buildStats(elements, boundingBox),
    };

    return { ok: true, structure, durationMs: Date.now() - start, fileSizeMb };
  } catch (err: any) {
    return {
      ok: false,
      errorType: 'IFC_PARSE_ERROR',
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  } finally {
    if (modelID >= 0) { try { api.CloseModel(modelID); } catch { /* noop */ } }
  }
}

// Entrada do worker (ignora quando importado só p/ tipos).
if (parentPort) {
  parentPort.on('message', async (req: ParseRequest) => {
    const result = await parse(req);
    parentPort!.postMessage(result);
  });
}

export { parse };
