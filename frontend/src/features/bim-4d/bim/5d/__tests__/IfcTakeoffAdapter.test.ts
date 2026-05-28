import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { meshesToIfcElements } from '../IfcTakeoffAdapter';
import { QuantityExtractor } from '../QuantityExtractor';
import { TakeoffManager } from '../TakeoffManager';

function makeMesh(userData: Record<string, unknown>): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  m.userData = userData;
  return m;
}

describe('IfcTakeoffAdapter', () => {
  it('extracts elements with Qto_WallBaseQuantities pset shape', () => {
    const wall = makeMesh({
      expressID: 100,
      ifcType: 'IfcWall',
      psets: [
        {
          Name: 'Qto_WallBaseQuantities',
          HasProperties: [
            { Name: 'NetVolume', NominalValue: { value: 2.5 } },
            { Name: 'NetArea', NominalValue: { value: 12.5 } },
            { Name: 'Length', NominalValue: { value: 5 } },
          ],
        },
      ],
    });

    const { elements, elementToObject } = meshesToIfcElements([wall]);

    expect(elements).toHaveLength(1);
    expect(elements[0].ifcType).toBe('IfcWall');
    expect(elements[0].expressID).toBe(100);
    expect(elements[0].propertySets?.['Qto_WallBaseQuantities']).toBeDefined();
    expect(elementToObject.get('100')).toBe(wall);
  });

  it('feeds QuantityExtractor: NetVolume / NetArea / Length emitted', () => {
    const wall = makeMesh({
      expressID: 100,
      ifcType: 'IfcWall',
      psets: [
        {
          Name: 'Qto_WallBaseQuantities',
          HasProperties: [
            { Name: 'NetVolume', NominalValue: { value: 2.5 } },
            { Name: 'NetArea', NominalValue: { value: 12.5 } },
          ],
        },
      ],
    });

    const { elements } = meshesToIfcElements([wall]);
    const extractor = new QuantityExtractor();
    const qs = extractor.extract(elements[0]);

    const names = qs.map((q) => q.name).sort();
    expect(names).toEqual(['NetArea', 'NetVolume']);
    expect(qs.find((q) => q.name === 'NetVolume')?.value).toBe(2.5);
    expect(qs.find((q) => q.name === 'NetArea')?.unit).toBe('m2');
  });

  it('keyed-object pset shape is also accepted', () => {
    const slab = makeMesh({
      expressID: 200,
      ifcType: 'IfcSlab',
      psets: {
        Qto_SlabBaseQuantities: {
          NetVolume: 4.2,
          NetArea: 21,
        },
      },
    });

    const { elements } = meshesToIfcElements([slab]);
    const qs = new QuantityExtractor().extract(elements[0]);

    expect(qs.find((q) => q.name === 'NetVolume')?.value).toBe(4.2);
    expect(qs.find((q) => q.name === 'NetArea')?.value).toBe(21);
  });

  it('fallback bbox path triggers when no Qto_ provided', () => {
    const beam = makeMesh({ expressID: 300, ifcType: 'IfcBeam' });
    beam.position.set(0, 0, 0);
    beam.scale.set(2, 0.5, 0.3);
    beam.updateMatrixWorld(true);

    const { elements } = meshesToIfcElements([beam]);
    expect(elements[0].geometry).toBeDefined();

    const qs = new QuantityExtractor().extract(elements[0], { enableGeometryFallback: true });
    expect(qs.length).toBeGreaterThanOrEqual(1);
    expect(qs[0].source).toBe('geometry-fallback');
  });

  it('mesh without ifcType is skipped (requireType default true)', () => {
    const noise = makeMesh({ expressID: 999 });
    const { elements } = meshesToIfcElements([noise]);
    expect(elements).toHaveLength(0);
  });

  it('integrates with TakeoffManager.run end-to-end', async () => {
    const walls = [
      makeMesh({
        expressID: 1,
        ifcType: 'IfcWall',
        psets: [
          {
            Name: 'Qto_WallBaseQuantities',
            HasProperties: [{ Name: 'NetVolume', NominalValue: { value: 1 } }],
          },
        ],
      }),
      makeMesh({
        expressID: 2,
        ifcType: 'IfcWall',
        psets: [
          {
            Name: 'Qto_WallBaseQuantities',
            HasProperties: [{ Name: 'NetVolume', NominalValue: { value: 3 } }],
          },
        ],
      }),
    ];

    const { elements } = meshesToIfcElements(walls);
    const mgr = new TakeoffManager();
    const result = await mgr.run(elements);

    expect(result.quantities.length).toBeGreaterThanOrEqual(2);
    expect(result.byType['IfcWall']?.['NetVolume']?.sum).toBe(4);
    expect(result.byType['IfcWall']?.['NetVolume']?.count).toBe(2);
  });
});
