/**
 * Helpers puros de geometria (S08) — sem web-ifc, sem Three.js, sem I/O.
 *
 * Lógica testável: bounding sphere, chave de instancing, escrita de GLB binário.
 * O worker alimenta estes helpers com vértices/índices crus do web-ifc.
 */
import type { BoundingBox } from './ifc-structure.dto.js';
import type { BoundingSphere } from './ifc-geometry.dto.js';

/**
 * Bounding sphere de uma nuvem de pontos: centro no meio do bbox, raio = maior
 * distância real a um vértice (não a meia-diagonal — evita esfera folgada).
 */
export function boundingSphereFromPoints(points: ReadonlyArray<[number, number, number]>): BoundingSphere {
  if (points.length === 0) return { center: [0, 0, 0], radius: 0 };
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2,
  ];
  let r2 = 0;
  for (const p of points) {
    const dx = p[0] - center[0], dy = p[1] - center[1], dz = p[2] - center[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > r2) r2 = d2;
  }
  return { center, radius: Math.sqrt(r2) };
}

/** Sphere a partir de um bbox já calculado (centro + meia-diagonal). */
export function sphereFromBounds(b: BoundingBox): BoundingSphere {
  const center: [number, number, number] = [
    (b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2,
  ];
  const dx = b.max[0] - center[0], dy = b.max[1] - center[1], dz = b.max[2] - center[2];
  return { center, radius: Math.sqrt(dx * dx + dy * dy + dz * dz) };
}

/**
 * Chave de instancing. Spec S08: instancing SÓ com geometria + material idênticos
 * — tipo IFC igual NÃO basta (duas IfcWall podem ter material/fase/custo diferentes).
 * Chave = hash da geometria (web-ifc dá geometryExpressID estável por geom única)
 * + cor do material. Mesma chave ⇒ pode virar InstancedMesh.
 */
export function instanceKey(geometryId: number | string, color: { x: number; y: number; z: number; w: number }): string {
  const c = `${round(color.x)},${round(color.y)},${round(color.z)},${round(color.w)}`;
  return `g${geometryId}|${c}`;
}

function round(n: number): number { return Math.round(n * 1000) / 1000; }

// ── GLB writer (glTF 2.0 binário) ────────────────────────────────────────────
// glTF é JSON + buffer binário. Escrevemos à mão (sem dep): controle total +
// testável. Um node por elemento (preserva identidade), expressID/globalId em
// `extras`. Material por cor. Geometria não-indexada (POSITION só) — suficiente
// p/ S08; normais/índices entram quando o viewer exigir.

export interface GlbMeshInput {
  expressID: number;
  globalId: string;
  type: string;
  /** Posições XYZ intercaladas (já em metros, já transformadas p/ world). */
  positions: Float32Array;
  /** Índices de triângulos (uint32). */
  indices: Uint32Array;
  color: { x: number; y: number; z: number; w: number };
}

const GLB_MAGIC = 0x46546c67;     // 'glTF'
const GLB_VERSION = 2;
const CHUNK_JSON = 0x4e4f534a;    // 'JSON'
const CHUNK_BIN = 0x004e4942;     // 'BIN\0'
const CT_ARRAY_BUFFER = 34962;
const CT_ELEMENT_ARRAY = 34963;
const COMP_FLOAT = 5126;
const COMP_UINT = 5125;

function pad4(n: number): number { return (n + 3) & ~3; }

/**
 * Serializa meshes p/ um Buffer GLB válido. Um node por mesh com extras
 * {expressID, globalId, ifcType} — é isto que mantém a identidade do elemento
 * sobrevivendo à serialização (clique→expressID no S09).
 */
export function writeGlb(meshes: ReadonlyArray<GlbMeshInput>): Buffer {
  const bufferViews: any[] = [];
  const accessors: any[] = [];
  const meshDefs: any[] = [];
  const nodes: any[] = [];
  const materials: any[] = [];
  const matKey = new Map<string, number>();
  const binChunks: Buffer[] = [];
  let byteOffset = 0;

  const pushView = (data: Buffer, target: number): number => {
    const padded = pad4(data.length);
    const buf = padded === data.length ? data : Buffer.concat([data, Buffer.alloc(padded - data.length)]);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: data.length, target });
    binChunks.push(buf);
    byteOffset += padded;
    return bufferViews.length - 1;
  };

  for (const m of meshes) {
    if (m.positions.length === 0 || m.indices.length === 0) continue;

    // POSITION accessor
    const posView = pushView(Buffer.from(m.positions.buffer, m.positions.byteOffset, m.positions.byteLength), CT_ARRAY_BUFFER);
    const { min, max } = posMinMax(m.positions);
    const posAccessor = accessors.length;
    accessors.push({
      bufferView: posView, componentType: COMP_FLOAT, count: m.positions.length / 3,
      type: 'VEC3', min, max,
    });

    // INDEX accessor
    const idxView = pushView(Buffer.from(m.indices.buffer, m.indices.byteOffset, m.indices.byteLength), CT_ELEMENT_ARRAY);
    const idxAccessor = accessors.length;
    accessors.push({
      bufferView: idxView, componentType: COMP_UINT, count: m.indices.length, type: 'SCALAR',
    });

    // material por cor (dedup)
    const ck = `${m.color.x},${m.color.y},${m.color.z},${m.color.w}`;
    let matIndex = matKey.get(ck);
    if (matIndex === undefined) {
      matIndex = materials.length;
      materials.push({
        pbrMetallicRoughness: {
          baseColorFactor: [m.color.x, m.color.y, m.color.z, m.color.w || 1],
          metallicFactor: 0.1, roughnessFactor: 0.8,
        },
      });
      matKey.set(ck, matIndex);
    }

    const meshIndex = meshDefs.length;
    meshDefs.push({
      name: `mesh_${m.expressID}`,
      primitives: [{ attributes: { POSITION: posAccessor }, indices: idxAccessor, material: matIndex }],
    });
    nodes.push({
      name: `${m.expressID}`,
      mesh: meshIndex,
      // Identidade BIM preservada na serialização — base do clique→expressID.
      extras: { expressID: m.expressID, globalId: m.globalId, ifcType: m.type },
    });
  }

  const bin = Buffer.concat(binChunks);
  const gltf = {
    asset: { version: '2.0', generator: 'arxisvr-s08' },
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    scene: 0,
    nodes,
    meshes: meshDefs,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  let jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
  if (jsonBuf.length % 4 !== 0) {
    jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20)]); // pad com espaço
  }
  const binPadded = bin.length % 4 === 0 ? bin : Buffer.concat([bin, Buffer.alloc(pad4(bin.length) - bin.length)]);

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(GLB_VERSION, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(CHUNK_JSON, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(CHUNK_BIN, 4);

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binPadded]);
}

function posMinMax(pos: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = pos[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max };
}
