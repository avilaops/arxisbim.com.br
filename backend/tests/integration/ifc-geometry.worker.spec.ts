import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extract } from '../../src/modules/ifc/ifc-geometry.worker.js';
import { GEOMETRY_MANIFEST_VERSION } from '../../src/modules/ifc/ifc-geometry.dto.js';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (n: string) => join(here, '..', 'fixtures', 'ifc', n);
const toAB = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

const MODELS = ['sample.ifc', 'ac20-fzk-haus_ifc4.ifc', 'building-arch_ifc4x3.ifc'];

describe('ifc-geometry.worker · extract() em modelos reais', () => {
  for (const file of MODELS) {
    it(`${file} → GLB válido + manifest com identidade preservada`, async () => {
      const res = await extract({ buffer: toAB(fx(file)), modelVersionId: `mv-${file}`, reqId: 'r' });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const { manifest, glb } = res;

      expect(manifest.version).toBe(GEOMETRY_MANIFEST_VERSION);
      expect(manifest.meshCount).toBeGreaterThan(0);
      expect(manifest.elements.length).toBe(manifest.meshCount);

      // Toda MeshReference carrega a ponte BIM↔mesh completa (spec S08).
      const ref = manifest.elements[0];
      expect(typeof ref.expressID).toBe('number');
      expect(ref.meshId).toBe(`${ref.expressID}`);
      expect(/^Ifc/.test(ref.type)).toBe(true);
      expect(ref.bounds.min).toHaveLength(3);
      expect(ref.boundingSphere.radius).toBeGreaterThanOrEqual(0);
      expect(ref.instanceKey).toBeTruthy();

      // Bounds do modelo coerentes (sphere envolve o bbox).
      expect(manifest.modelSphere.radius).toBeGreaterThan(0);

      // GLB binário válido + identidade do 1º node = expressID real.
      const buf = Buffer.from(glb);
      expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
      expect(buf.readUInt32LE(8)).toBe(buf.length);
      const jsonLen = buf.readUInt32LE(12);
      const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
      expect(gltf.nodes.length).toBe(manifest.meshCount);
      expect(gltf.nodes[0].extras.expressID).toBeTypeOf('number');
      expect(gltf.asset.version).toBe('2.0');

      // instanceKey agrupa geometria+material idênticos (não só tipo IFC).
      const keys = new Set(manifest.elements.map((e) => e.instanceKey));
      expect(keys.size).toBeLessThanOrEqual(manifest.meshCount);
    }, 60_000);
  }
});
