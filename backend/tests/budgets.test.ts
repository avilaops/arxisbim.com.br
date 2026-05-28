import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsService } from '../src/modules/budgets/budgets.service.js';

/**
 * Lightweight chainable mock for Drizzle that supports the
 * select/from/where/orderBy/limit/offset, insert/values/returning,
 * update/set/where[/returning] and delete/where/returning chains
 * used by BudgetsService.
 *
 * Each chain step calls the next via vi.fn().mockReturnThis() except
 * the terminal awaited step (limit/offset/returning) which is configured
 * per-test with mockResolvedValueOnce.
 */
function createDb() {
  const db: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
  return db;
}

const ctx = { tenantId: 't-1', userId: 'u-1' };

describe('BudgetsService', () => {
  let db: any;
  let svc: BudgetsService;

  beforeEach(() => {
    db = createDb();
    svc = new BudgetsService(db);
  });

  it('create() inserts budget with tenantId/userId and returns row with empty items', async () => {
    const inserted = {
      id: 'b-1',
      tenantId: 't-1',
      projectId: 'p-1',
      createdBy: 'u-1',
      name: 'Orçamento',
      description: null,
      totalCost: 0,
      metadata: {},
    };
    db.returning.mockResolvedValueOnce([inserted]);

    const out = await svc.create(
      { projectId: 'p-1', name: 'Orçamento' },
      ctx,
    );

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't-1',
        projectId: 'p-1',
        createdBy: 'u-1',
        name: 'Orçamento',
      }),
    );
    expect(out.items).toEqual([]);
    expect(out.totalCost).toBe(0);
  });

  it('create() with items inserts each with sequential position and updates totalCost', async () => {
    const budgetRow = {
      id: 'b-2',
      tenantId: 't-1',
      projectId: 'p-1',
      createdBy: 'u-1',
      name: 'O',
      description: null,
      totalCost: 0,
      metadata: {},
    };
    const item0 = { id: 'i-0', budgetId: 'b-2', position: 0, quantity: 2, unitPrice: 50, totalPrice: 100 };
    const item1 = { id: 'i-1', budgetId: 'b-2', position: 1, quantity: 3, unitPrice: 10, totalPrice: 30 };

    db.returning
      .mockResolvedValueOnce([budgetRow]) // budget insert
      .mockResolvedValueOnce([item0])     // first item insert
      .mockResolvedValueOnce([item1]);    // second item insert

    const out = await svc.create(
      {
        projectId: 'p-1',
        name: 'O',
        items: [
          { description: 'A', unit: 'm', quantity: 2, unitPrice: 50 },
          { description: 'B', unit: 'm', quantity: 3, unitPrice: 10 },
        ],
      },
      ctx,
    );

    expect(out.items).toHaveLength(2);
    // sequential positions
    const positions = db.values.mock.calls.slice(1).map((c: any[]) => c[0].position);
    expect(positions).toEqual([0, 1]);
    // budget total updated
    expect(db.update).toHaveBeenCalled();
    expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ totalCost: 130 }));
    expect(out.totalCost).toBe(130);
  });

  it('list() scopes by tenantId and applies limit/offset', async () => {
    const rows = [{ id: 'b-1' }, { id: 'b-2' }];
    db.offset.mockResolvedValueOnce(rows);

    const out = await svc.list(ctx, { limit: 10, offset: 5 });

    expect(db.select).toHaveBeenCalled();
    expect(db.where).toHaveBeenCalled();
    expect(db.orderBy).toHaveBeenCalled();
    expect(db.limit).toHaveBeenCalledWith(10);
    expect(db.offset).toHaveBeenCalledWith(5);
    expect(out).toBe(rows);
  });

  it('get() returns null when budget not found', async () => {
    db.limit.mockResolvedValueOnce([]);
    const out = await svc.get('missing', ctx);
    expect(out).toBeNull();
  });

  it('get() returns budget with items ordered by position', async () => {
    const budget = { id: 'b-1', tenantId: 't-1', name: 'X' };
    const items = [{ id: 'i-0', position: 0 }, { id: 'i-1', position: 1 }];
    db.limit.mockResolvedValueOnce([budget]);
    db.orderBy.mockResolvedValueOnce(items);

    const out = await svc.get('b-1', ctx);
    expect(out).not.toBeNull();
    expect(out!.items).toEqual(items);
  });

  it('remove() returns false when no row deleted', async () => {
    db.returning.mockResolvedValueOnce([]);
    const ok = await svc.remove('b-1', ctx);
    expect(ok).toBe(false);
  });

  it('remove() returns true when row deleted', async () => {
    db.returning.mockResolvedValueOnce([{ id: 'b-1' }]);
    const ok = await svc.remove('b-1', ctx);
    expect(ok).toBe(true);
  });

  it('addItem() returns null when budget not found', async () => {
    db.limit.mockResolvedValueOnce([]); // get() -> budget lookup empty
    const out = await svc.addItem('missing', { description: 'A', unit: 'm', quantity: 1, unitPrice: 5 }, ctx);
    expect(out).toBeNull();
  });
});
