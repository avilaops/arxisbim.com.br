/**
 * IFC Geometry Worker (S08) — extrai geometria real via web-ifc e serializa GLB.
 *
 * Roda em worker_threads (CPU-bound, não bloqueia event loop — mesmo motivo do S07).
 * Para cada IfcProduct: vértices+índices do web-ifc → posições world (metros) →
 * GLB (cache de render) + MeshReference (ponte expressID↔mesh). Identidade do
 * elemento preservada nos `extras` de cada node GLB (base do clique→expressID, S09).
 *
 * Nunca lança p/ fora: erro → `{ ok:false, errorType, message }`.
 */
import { parentPort } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { writeGlb, sphereFromBounds, instanceKey, type GlbMeshInput } from './ifc-geometry.builder.js';
import { createBBoxAccumulator } from './ifc-structure.builder.js';
import { GEOMETRY_MANIFEST_VERSION } from './ifc-geometry.dto.js';
import type { GeometryManifest, MeshReference, InstancedGroup } from './ifc-geometry.dto.js';
import type { BoundingBox } from './ifc-structure.dto.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebIFC = require('web-ifc');
const WASM_DIR = join(dirname(require.resolve('web-ifc')), '/');

export interface GeometryRequest {
  buffer: ArrayBuffer;
  modelVersionId: string;
  reqId: string;
}

export type GeometryResult =
  | { ok: true; manifest: GeometryManifest; glb: ArrayBuffer; durationMs: number; fileSizeMb: number }
  | { ok: false; errorType: string; message: string; durationMs: number };

function strOf(v: any): string | null {
  if (v == null) return null;
  if (typeof v === 'object' && 'value' in v) return v.value == null ? null : String(v.value);
  return String(v);
}

function applyMatrix(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

interface Accum {
  positions: number[];
  indices: number[];
  color: { x: number; y: number; z: number; w: number };
  instanceKey: string;
  bbox: ReturnType<typeof createBBoxAccumulator>;
}

async function extract(req: GeometryRequest): Promise<GeometryResult> {
  const start = Date.now();
  const fileSizeMb = req.buffer.byteLength / (1024 * 1024);
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(WASM_DIR, true);
  await api.Init();

  let modelID = -1;
  try {
    modelID = api.OpenModel(new Uint8Array(req.buffer), { COORDINATE_TO_ORIGIN: true });

    // Acumula geometria por elemento (um elemento pode ter várias placedGeometries).
    const byElement = new Map<number, Accum>();

    api.StreamAllMeshes(modelID, (mesh: any) => {
      const expressID: number = mesh.expressID;
      const geometries = mesh.geometries;
      for (let i = 0; i < geometries.size(); i++) {
        const placed = geometries.get(i);
        const geom = api.GetGeometry(modelID, placed.geometryExpressID);
        const verts: Float32Array = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
        const idx: Uint32Array = api.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize());
        const m = placed.flatTransformation;
        const color = placed.color || { x: 0.6, y: 0.6, z: 0.6, w: 1 };

        let acc = byElement.get(expressID);
        if (!acc) {
          acc = {
            positions: [], indices: [], color,
            instanceKey: instanceKey(placed.geometryExpressID, color),
            bbox: createBBoxAccumulator(),
          };
          byElement.set(expressID, acc);
        }
        const base = acc.positions.length / 3;
        // 6 floats por vértice (pos+normal): só posição vai pro GLB.
        for (let v = 0; v < verts.length; v += 6) {
          const [x, y, z] = applyMatrix(m, verts[v], verts[v + 1], verts[v + 2]);
          acc.positions.push(x, y, z);
          acc.bbox.expand(x, y, z);
        }
        for (let k = 0; k < idx.length; k++) acc.indices.push(base + idx[k]);
      }
    });

    // Monta meshes do GLB + MeshReferences + bounds do modelo.
    const glbMeshes: GlbMeshInput[] = [];
    const elements: MeshReference[] = [];
    const modelBox = createBBoxAccumulator();
    const groupMap = new Map<string, InstancedGroup>();

    for (const [expressID, acc] of byElement) {
      if (acc.positions.length === 0 || acc.indices.length === 0) continue;
      const line = (() => { try { return api.GetLine(modelID, expressID); } catch { return null; } })();
      const type = line?.constructor?.name && /^Ifc/i.test(line.constructor.name) ? line.constructor.name : 'IfcProduct';
      const globalId = strOf(line?.GlobalId) ?? '';
      const bounds: BoundingBox = acc.bbox.result();

      const positions = new Float32Array(acc.positions);
      const indices = new Uint32Array(acc.indices);
      glbMeshes.push({ expressID, globalId, type, positions, indices, color: acc.color });

      elements.push({
        expressID, globalId, meshId: `${expressID}`, type,
        bounds, boundingSphere: sphereFromBounds(bounds),
        instanceKey: acc.instanceKey, hasGeometry: true,
      });

      for (let j = 0; j < positions.length; j += 3) modelBox.expand(positions[j], positions[j + 1], positions[j + 2]);

      let g = groupMap.get(acc.instanceKey);
      if (!g) { g = { instanceKey: acc.instanceKey, type, count: 0, expressIDs: [] }; groupMap.set(acc.instanceKey, g); }
      g.count++; g.expressIDs.push(expressID);
    }

    const glb = writeGlb(glbMeshes);
    const modelBounds = modelBox.result();
    // InstancedMesh só vale a pena com geometria+material idênticos repetidos.
    const instancedGroups = [...groupMap.values()].filter((g) => g.count > 1);

    const manifest: GeometryManifest = {
      version: GEOMETRY_MANIFEST_VERSION,
      modelVersionId: req.modelVersionId,
      glbKey: null, // preenchido pelo service ao salvar no storage
      meshCount: glbMeshes.length,
      instancedGroups,
      modelBounds,
      modelSphere: sphereFromBounds(modelBounds),
      elements,
    };

    // GLB num ArrayBuffer próprio (transferível de volta ao service).
    const out = new Uint8Array(glb.byteLength);
    out.set(glb);
    return { ok: true, manifest, glb: out.buffer, durationMs: Date.now() - start, fileSizeMb };
  } catch (err: any) {
    return {
      ok: false,
      errorType: 'IFC_GEOMETRY_ERROR',
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  } finally {
    if (modelID >= 0) { try { api.CloseModel(modelID); } catch { /* noop */ } }
  }
}

if (parentPort) {
  parentPort.on('message', async (req: GeometryRequest) => {
    const result = await extract(req);
    const transfer = result.ok ? [result.glb] : [];
    parentPort!.postMessage(result, transfer);
  });
}

export { extract };
