import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetApiClient } from '../api/BudgetApiClient';

function mkRes(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    status: init.status,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('BudgetApiClient', () => {
  let fetchImpl: ReturnType<typeof vi.fn>;
  let client: BudgetApiClient;

  beforeEach(() => {
    fetchImpl = vi.fn();
    client = new BudgetApiClient({
      baseUrl: '/api/v1/budgets',
      getToken: () => 'tkn-123',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
  });

  it('list() GETs base URL and returns data array', async () => {
    fetchImpl.mockResolvedValueOnce(mkRes({ success: true, data: [{ id: 'b-1', name: 'Foo' }] }));
    const rows = await client.list();
    expect(rows).toEqual([{ id: 'b-1', name: 'Foo' }]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/budgets', expect.any(Object));
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tkn-123');
  });

  it('list(projectId) appends query string', async () => {
    fetchImpl.mockResolvedValueOnce(mkRes({ success: true, data: [] }));
    await client.list('p-1');
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/budgets?projectId=p-1');
  });

  it('create() POSTs name + items mapped to api shape', async () => {
    fetchImpl.mockResolvedValueOnce(mkRes({ success: true, data: { id: 'b-9', name: 'X' } }, { status: 201 }));
    const out = await client.create('p-1', {
      name: 'X',
      items: [{ description: 'A', unit: 'm', quantity: 2, unitPrice: 5 }],
    });
    expect(out.id).toBe('b-9');
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      projectId: 'p-1',
      name: 'X',
      items: [{ description: 'A', unit: 'm', quantity: 2, unitPrice: 5, linkedElements: [] }],
    });
  });

  it('addItem() POSTs to /:id/items and returns server item', async () => {
    fetchImpl.mockResolvedValueOnce(
      mkRes({ success: true, data: { id: 'i-1', position: 0, totalPrice: 50 } }, { status: 201 }),
    );
    const out = await client.addItem('b-1', { description: 'A', unit: 'm', quantity: 5, unitPrice: 10 });
    expect(out.id).toBe('i-1');
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/budgets/b-1/items');
  });

  it('removeItem() DELETEs /:id/items/:itemId and tolerates 204', async () => {
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await client.removeItem('b-1', 'i-1');
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/budgets/b-1/items/i-1');
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('DELETE');
  });

  it('throws on non-2xx with backend error message', async () => {
    fetchImpl.mockResolvedValueOnce(mkRes({ error: 'not found' }, { status: 404 }));
    await expect(client.get('missing')).rejects.toThrow(/HTTP 404.*not found/);
  });
});
