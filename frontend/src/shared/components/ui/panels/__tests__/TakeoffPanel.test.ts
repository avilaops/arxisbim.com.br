import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { TakeoffPanel, takeoffResultToCsv } from '../TakeoffPanel';
import type { TakeoffResult } from '../../../../../features/bim-4d/bim/5d';

function makeWall(id: number, volume: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  m.userData = {
    expressID: id,
    ifcType: 'IfcWall',
    psets: [
      {
        Name: 'Qto_WallBaseQuantities',
        HasProperties: [{ Name: 'NetVolume', NominalValue: { value: volume } }],
      },
    ],
  };
  return m;
}

describe('TakeoffPanel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders empty state when no run yet', () => {
    new TakeoffPanel(container, { getObjects: () => [] });
    expect(container.querySelector('.takeoff-panel__status--muted')).not.toBeNull();
    expect(container.querySelector<HTMLButtonElement>('#takeoff-export')?.disabled).toBe(true);
  });

  it('run() populates table with aggregated quantities by IFC type', async () => {
    const panel = new TakeoffPanel(container, {
      getObjects: () => [makeWall(1, 2), makeWall(2, 3)],
    });
    await panel.run();

    const table = container.querySelector('.takeoff-panel__table');
    expect(table).not.toBeNull();
    expect(table!.textContent).toMatch(/IfcWall/);
    expect(table!.textContent).toMatch(/NetVolume/);
    expect(table!.textContent).toMatch(/5\.00/);
  });

  it('run() enables export button once a result is available', async () => {
    const panel = new TakeoffPanel(container, {
      getObjects: () => [makeWall(1, 1)],
    });
    expect(container.querySelector<HTMLButtonElement>('#takeoff-export')?.disabled).toBe(true);
    await panel.run();
    expect(container.querySelector<HTMLButtonElement>('#takeoff-export')?.disabled).toBe(false);
  });

  it('exportCsv() forwards a CSV payload to the downloader', async () => {
    const calls: Array<{ filename: string; csv: string }> = [];
    const panel = new TakeoffPanel(container, {
      getObjects: () => [makeWall(1, 4)],
      downloader: (filename, csv) => calls.push({ filename, csv }),
    });
    await panel.run();
    panel.exportCsv();

    expect(calls).toHaveLength(1);
    expect(calls[0].filename).toMatch(/^takeoff-.*\.csv$/);
    expect(calls[0].csv).toMatch(/ifc_type,quantity_name,sum,unit,element_count/);
    expect(calls[0].csv).toMatch(/IfcWall,NetVolume,4/);
  });

  it('exportCsv() is a no-op when no result is available', () => {
    const calls: Array<{ filename: string; csv: string }> = [];
    const panel = new TakeoffPanel(container, {
      getObjects: () => [],
      downloader: (filename, csv) => calls.push({ filename, csv }),
    });
    panel.exportCsv();
    expect(calls).toHaveLength(0);
  });

  it('errors from the manager surface as error status', async () => {
    const panel = new TakeoffPanel(container, {
      getObjects: () => {
        throw new Error('scene empty');
      },
    });
    await panel.run();
    const err = container.querySelector('.takeoff-panel__status--error');
    expect(err?.textContent).toMatch(/scene empty/);
  });
});

describe('takeoffResultToCsv', () => {
  it('serializes a sorted byType structure to CSV', () => {
    const result: TakeoffResult = {
      quantities: [],
      byType: {
        IfcWall: { NetVolume: { sum: 10, unit: 'm3', count: 2 } },
        IfcSlab: { NetArea: { sum: 50, unit: 'm2', count: 1 } },
      },
      skippedElementIds: [],
      durationMs: 0,
    };
    const csv = takeoffResultToCsv(result);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('ifc_type,quantity_name,sum,unit,element_count');
    // IfcSlab comes before IfcWall alphabetically
    expect(lines[1]).toBe('IfcSlab,NetArea,50,m2,1');
    expect(lines[2]).toBe('IfcWall,NetVolume,10,m3,2');
  });
});
