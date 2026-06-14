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
  buildStats, createBBoxAccumulator,
} from './ifc-structure.builder.js';
import type {
  IFCStructure, IFCElement, SpatialNode, IfcSchema,
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

/** Fallback 'IFCWALL' → 'IfcWall' (usado só se line.constructor.name faltar). */
function pascalIfcType(typeName: string): string {
  const rest = typeName.slice(3).toLowerCase();
  return 'Ifc' + (rest.charAt(0).toUpperCase() + rest.slice(1));
}

function strOf(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'object' && 'value' in v) return v.value == null ? null : String(v.value);
  return String(v);
}

/**
 * Tipos de produto IFC enumerados explicitamente (cobre as disciplinas + comuns).
 * A árvore espacial só devolve o que está em containment espacial; elementos via
 * IfcRelAggregates ou soltos seriam perdidos. Enumerar por tipo garante byType
 * completo (critério S07). Constantes inexistentes no schema são puladas.
 */
const PRODUCT_TYPE_NAMES = [
  // architecture
  'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCDOOR', 'IFCWINDOW', 'IFCROOF', 'IFCSTAIR',
  'IFCSTAIRFLIGHT', 'IFCRAMP', 'IFCRAILING', 'IFCCOVERING', 'IFCCURTAINWALL', 'IFCFURNISHINGELEMENT',
  // structure
  'IFCBEAM', 'IFCCOLUMN', 'IFCSLAB', 'IFCMEMBER', 'IFCPLATE', 'IFCFOOTING', 'IFCPILE', 'IFCREINFORCINGBAR',
  // mep
  'IFCDUCTSEGMENT', 'IFCPIPESEGMENT', 'IFCCABLECARRIERSEGMENT', 'IFCCABLESEGMENT',
  'IFCFLOWSEGMENT', 'IFCFLOWFITTING', 'IFCFLOWTERMINAL', 'IFCFLOWCONTROLLER',
  // generic / outros
  'IFCBUILDINGELEMENTPROXY', 'IFCFURNITURE', 'IFCSYSTEMFURNITUREELEMENT',
];

/** Aplica matriz 4x4 column-major (web-ifc/glMatrix) a um ponto. */
function applyMatrix(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/**
 * Lê a unidade de comprimento do IfcUnitAssignment. Modelo em mm reportar 'm'
 * faria o bbox sair 1000× errado. Default 'm' se não encontrar.
 */
function readLengthUnit(api: any, modelID: number): { length: string; area: string; volume: string } {
  try {
    const ids = api.GetLineIDsWithType(modelID, WebIFC.IFCUNITASSIGNMENT);
    for (let i = 0; i < ids.size(); i++) {
      const ua = api.GetLine(modelID, ids.get(i));
      const units = ua?.Units || [];
      for (const ref of units) {
        const unit = api.GetLine(modelID, ref.value ?? ref);
        if ((strOf(unit?.UnitType) || '').toUpperCase().includes('LENGTHUNIT')) {
          const name = (strOf(unit?.Name) || 'METRE').toUpperCase();
          const prefix = (strOf(unit?.Prefix) || '').toUpperCase();
          if (name.includes('METRE')) {
            const len = prefix === 'MILLI' ? 'mm' : prefix === 'CENTI' ? 'cm' : prefix === 'KILO' ? 'km' : 'm';
            return { length: len, area: `${len}2`, volume: `${len}3` };
          }
        }
      }
    }
  } catch { /* cai no default */ }
  return { length: 'm', area: 'm2', volume: 'm3' };
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
    const headerSnippet = new TextDecoder('utf-8').decode(data.slice(0, 500));
    if (!headerSnippet.includes('ISO-10303-21') && !headerSnippet.includes('HEADER;')) {
      return {
        ok: false,
        errorType: 'INVALID_IFC_FORMAT',
        message: 'Invalid IFC file signature (missing ISO-10303-21 or HEADER)',
        durationMs: Date.now() - start,
      };
    }
    modelID = api.OpenModel(data, { COORDINATE_TO_ORIGIN: true });

    const schema = mapSchema(api.GetModelSchema(modelID));

    // ── Árvore espacial: monta tree + mapa expressID → {parent, storey} ─────
    const props = new WebIFC.Properties(api);
    const root = await props.getSpatialStructure(modelID, false);

    const spatialTree: SpatialNode[] = [];
    // Containment de cada elemento descoberto pela árvore (autoridade p/ parent/storey).
    const placement = new Map<number, { parent: number | null; storey: number | null }>();

    const lineCache = (id: number) => { try { return api.GetLine(modelID, id); } catch { return null; } };

    function walk(node: any, parentExpressID: number | null, storeyId: number | null): SpatialNode | null {
      const type: string = node.type || '';
      const isSpatial = SPATIAL_TYPES.has(type.toUpperCase());
      const nextStorey = type.toUpperCase() === 'IFCBUILDINGSTOREY' ? node.expressID : storeyId;

      if (isSpatial) {
        const line = lineCache(node.expressID);
        const sn: SpatialNode = {
          expressID: node.expressID,
          globalId: strOf(line?.GlobalId) ?? '',
          type,
          name: strOf(line?.Name),
          children: [],
        };
        for (const child of node.children || []) {
          const childSpatial = walk(child, node.expressID, nextStorey);
          if (childSpatial) sn.children.push(childSpatial);
        }
        return sn;
      }

      // Elemento: registra containment; segue descendo (agregações aninhadas).
      placement.set(node.expressID, { parent: parentExpressID, storey: storeyId });
      for (const child of node.children || []) {
        walk(child, node.expressID, storeyId);
      }
      return null;
    }

    for (const child of root.children || []) {
      const sn = walk(child, root.expressID, null);
      if (sn) spatialTree.push(sn);
    }
    const rootLine = lineCache(root.expressID);
    const tree: SpatialNode[] = [{
      expressID: root.expressID,
      globalId: strOf(rootLine?.GlobalId) ?? '',
      type: root.type,
      name: strOf(rootLine?.Name),
      children: spatialTree,
    }];

    // ── Enumeração COMPLETA de elementos por tipo (não só a árvore) ─────────
    const elements: IFCElement[] = [];
    const seenExpress = new Set<number>();
    const seenGlobalIds = new Set<string>();
    let duplicateGlobalIds = 0;

    for (const typeName of PRODUCT_TYPE_NAMES) {
      const typeId = WebIFC[typeName];
      if (typeId == null) continue; // tipo não existe neste schema
      let ids: any;
      try { ids = api.GetLineIDsWithType(modelID, typeId); } catch { continue; }
      for (let i = 0; i < ids.size(); i++) {
        const expressID: number = ids.get(i);
        if (seenExpress.has(expressID)) continue;
        seenExpress.add(expressID);

        const line = lineCache(expressID);
        let globalId = strOf(line?.GlobalId) ?? '';
        if (globalId) {
          if (seenGlobalIds.has(globalId)) {
            // GlobalId duplicado (modelo mal-exportado): expressID é a autoridade.
            duplicateGlobalIds++;
            globalId = '';
          } else {
            seenGlobalIds.add(globalId);
          }
        }
        const place = placement.get(expressID);
        elements.push({
          expressID,
          globalId,
          // typeName é 'IFCWALL' → normaliza p/ 'IfcWall' (PascalCase do schema).
          type: line?.constructor?.name && /^Ifc/i.test(line.constructor.name)
            ? line.constructor.name
            : pascalIfcType(typeName),
          name: strOf(line?.Name),
          storeyId: place?.storey ?? null,
          parentExpressID: place?.parent ?? null,
          hasGeometry: false, // ajustado na varredura de geometria
        });
      }
    }

    if (duplicateGlobalIds > 0) {
      console.warn(JSON.stringify({
        level: 'warn', message: 'IFC GlobalId duplicates',
        model_version_id: req.modelVersionId, req_id: req.reqId,
        duplicate_count: duplicateGlobalIds, timestamp: new Date().toISOString(),
      }));
    }

    // ── Geometria → bounding box (in-place) + hasGeometry ──────────────────
    const elementByExpress = new Map<number, IFCElement>();
    for (const el of elements) elementByExpress.set(el.expressID, el);
    const bb = createBBoxAccumulator();

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
          bb.expand(x, y, z);
        }
      }
      const el = elementByExpress.get(expressID);
      if (el) el.hasGeometry = true;
    });

    const boundingBox = bb.result(); // OBRIGATÓRIO; degenerado na origem se sem geometria

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
      units: readLengthUnit(api, modelID),
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
