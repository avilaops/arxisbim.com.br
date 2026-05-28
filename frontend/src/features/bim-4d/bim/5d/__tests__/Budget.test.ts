import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetManager } from '../BudgetManager';
import { BudgetCalculator } from '../BudgetCalculator';
import { BudgetExporter } from '../BudgetExporter';
import type { TakeoffResult } from '../types';

describe('BudgetManager', () => {
  let mgr: BudgetManager;
  beforeEach(() => {
    mgr = new BudgetManager();
  });

  it('creates a budget with computed totals', () => {
    const b = mgr.create({
      name: 'Obra X',
      items: [
        { description: 'Concreto', quantity: 10, unit: 'm3', unitPrice: 500 },
        { description: 'Aço', quantity: 200, unit: 'kg', unitPrice: 8 },
      ],
    });
    expect(b.items).toHaveLength(2);
    expect(b.items[0].totalPrice).toBe(5000);
    expect(b.items[1].totalPrice).toBe(1600);
    expect(b.totalCost).toBe(6600);
  });

  it('add / update / remove cost items recomputes totals', () => {
    const b = mgr.create({ name: 'X' });
    const item = mgr.addItem(b.id, {
      description: 'Concreto',
      quantity: 10,
      unit: 'm3',
      unitPrice: 500,
    });
    expect(mgr.get(b.id)!.totalCost).toBe(5000);

    mgr.updateItem(b.id, item.id, { quantity: 12 });
    expect(mgr.get(b.id)!.totalCost).toBe(6000);

    mgr.removeItem(b.id, item.id);
    expect(mgr.get(b.id)!.totalCost).toBe(0);
  });

  it('rejects duplicate budget id', () => {
    mgr.create({ id: 'b1', name: 'A' });
    expect(() => mgr.create({ id: 'b1', name: 'B' })).toThrow(/already exists/);
  });

  it('rename updates timestamp', async () => {
    const b = mgr.create({ name: 'A' });
    const t1 = b.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    mgr.rename(b.id, 'A2');
    expect(mgr.get(b.id)!.name).toBe('A2');
    expect(mgr.get(b.id)!.updatedAt).not.toBe(t1);
  });

  it('linkElements deduplicates', () => {
    const b = mgr.create({ name: 'X' });
    const it = mgr.addItem(b.id, { description: 'C', quantity: 1, unit: 'm3', unitPrice: 1 });
    mgr.linkElements(b.id, it.id, [1, 2]);
    mgr.linkElements(b.id, it.id, [2, 3]);
    expect(mgr.get(b.id)!.items[0].linkedElements.sort()).toEqual([1, 2, 3]);
  });

  it('round-trips via toJSON / loadJSON', () => {
    const b1 = mgr.create({
      name: 'X',
      items: [{ description: 'C', quantity: 10, unit: 'm3', unitPrice: 500 }],
    });
    const json = mgr.toJSON();
    const mgr2 = new BudgetManager();
    mgr2.loadJSON(json);
    const b2 = mgr2.get(b1.id)!;
    expect(b2.name).toBe('X');
    expect(b2.items[0].totalPrice).toBe(5000);
    expect(b2.totalCost).toBe(5000);
  });

  it('updateItem / removeItem / linkElements throw when budget missing', () => {
    expect(() => mgr.addItem('nope', { description: 'x', quantity: 1, unit: 'm', unitPrice: 1 })).toThrow(/not found/);
    expect(() => mgr.rename('nope', 'X')).toThrow(/not found/);
  });
});

describe('BudgetCalculator', () => {
  it('compares budgeted vs actual quantities for linked items', () => {
    const mgr = new BudgetManager();
    const b = mgr.create({
      name: 'X',
      items: [
        { description: 'Concreto', quantity: 10, unit: 'm3', unitPrice: 500, linkedElements: [1, 2] },
        { description: 'Alvenaria', quantity: 50, unit: 'm2', unitPrice: 80 }, // unlinked
      ],
    });
    const takeoff: TakeoffResult = {
      quantities: [
        { elementId: 1, ifcType: 'IfcSlab', name: 'NetVolume', value: 4, unit: 'm3', source: 'ifc-quantity-volume' },
        { elementId: 2, ifcType: 'IfcSlab', name: 'NetVolume', value: 7, unit: 'm3', source: 'ifc-quantity-volume' },
        { elementId: 99, ifcType: 'IfcWall', name: 'GrossArea', value: 200, unit: 'm2', source: 'ifc-quantity-area' },
      ],
      byType: {},
      skippedElementIds: [],
      durationMs: 0,
    };

    const report = new BudgetCalculator().calculate(b, takeoff);
    const concreto = report.items.find((i) => i.description === 'Concreto')!;
    expect(concreto.actualQuantity).toBe(11);
    expect(concreto.quantityDelta).toBe(1);
    expect(concreto.actualCost).toBe(5500);
    expect(concreto.costDelta).toBe(500);
    expect(concreto.unlinked).toBe(false);

    const alvenaria = report.items.find((i) => i.description === 'Alvenaria')!;
    expect(alvenaria.unlinked).toBe(true);
    expect(alvenaria.actualQuantity).toBe(0);

    expect(report.unlinkedItemCount).toBe(1);
    expect(report.totalBudgeted).toBe(5000 + 4000);
    expect(report.totalActual).toBe(5500);
    expect(report.totalDelta).toBe(5500 - 9000);
  });

  it('matchByName filters takeoff quantities by description', () => {
    const mgr = new BudgetManager();
    const b = mgr.create({
      name: 'X',
      items: [
        { description: 'NetVolume', quantity: 5, unit: 'm3', unitPrice: 100, linkedElements: [1] },
      ],
    });
    const takeoff: TakeoffResult = {
      quantities: [
        { elementId: 1, ifcType: 'IfcSlab', name: 'NetVolume', value: 4, unit: 'm3', source: 'ifc-quantity-volume' },
        { elementId: 1, ifcType: 'IfcSlab', name: 'GrossArea', value: 999, unit: 'm2', source: 'ifc-quantity-area' },
      ],
      byType: {},
      skippedElementIds: [],
      durationMs: 0,
    };
    const report = new BudgetCalculator().calculate(b, takeoff, { matchByName: true });
    expect(report.items[0].actualQuantity).toBe(4);
  });
});

describe('BudgetExporter', () => {
  it('exports a budget to CSV with header + rows', () => {
    const mgr = new BudgetManager();
    const b = mgr.create({
      id: 'b1',
      name: 'X',
      items: [
        { id: 'i1', description: 'Concreto', quantity: 10, unit: 'm3', unitPrice: 500, linkedElements: [1, 2] },
      ],
    });
    const csv = new BudgetExporter().toCsv(b);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('item_id,description,unit,quantity,unit_price,total_price,linked_elements');
    expect(lines[1]).toBe('i1,Concreto,m3,10,500,5000,1|2');
  });

  it('escapes commas and quotes correctly', () => {
    const mgr = new BudgetManager();
    const b = mgr.create({
      id: 'b1',
      name: 'X',
      items: [
        { id: 'i1', description: 'Aço, CA-50, "tipo A"', quantity: 1, unit: 'kg', unitPrice: 1 },
      ],
    });
    const csv = new BudgetExporter().toCsv(b);
    expect(csv).toContain('"Aço, CA-50, ""tipo A"""');
  });

  it('exports a budget report to CSV', () => {
    const mgr = new BudgetManager();
    const b = mgr.create({
      id: 'b1',
      name: 'X',
      items: [
        { id: 'i1', description: 'Concreto', quantity: 10, unit: 'm3', unitPrice: 500, linkedElements: [1] },
      ],
    });
    const takeoff: TakeoffResult = {
      quantities: [
        { elementId: 1, ifcType: 'IfcSlab', name: 'NetVolume', value: 11, unit: 'm3', source: 'ifc-quantity-volume' },
      ],
      byType: {},
      skippedElementIds: [],
      durationMs: 0,
    };
    const report = new BudgetCalculator().calculate(b, takeoff);
    const csv = new BudgetExporter().reportToCsv(report);
    expect(csv.split('\n')[0]).toContain('budgeted_quantity');
    expect(csv).toContain('i1,Concreto,m3,10,11,1,5000,5500,500,false');
  });
});
