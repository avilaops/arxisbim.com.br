import { vi } from 'vitest';

/**
 * Cria um mock de database Drizzle com métodos encadeáveis
 * 
 * IMPORTANTE: Os métodos retornam o próprio mockDb para permitir encadeamento.
 * Para chamar métodos que terminam a cadeia (limit, returning, etc), use:
 * - mockDb.limit.mockResolvedValueOnce([...]) para retornar um array
 * - mockDb.returning.mockResolvedValueOnce([...]) para retornar resultado de insert/update
 * 
 * Para encadear where().limit():
 * ```ts
 * const whereChain = { limit: vi.fn().mockResolvedValue([...]) };
 * mockDb.where.mockReturnValueOnce(whereChain);
 * ```
 */
export function createMockDb() {
  const mockDb: any = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    orderBy: vi.fn(),
    groupBy: vi.fn(),
    having: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
  };

  // Make all methods return mockDb for chaining by default
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.limit.mockResolvedValue([]);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.returning.mockResolvedValue([]);
  mockDb.update.mockReturnValue(mockDb);
  mockDb.set.mockReturnValue(mockDb);
  mockDb.delete.mockReturnValue(mockDb);
  mockDb.orderBy.mockReturnValue(mockDb);
  mockDb.groupBy.mockReturnValue(mockDb);
  mockDb.having.mockReturnValue(mockDb);
  mockDb.leftJoin.mockReturnValue(mockDb);
  mockDb.innerJoin.mockReturnValue(mockDb);

  return mockDb;
}

/**
 * Cria uma cadeia mock para where().limit()
 * 
 * Exemplo de uso:
 * ```ts
 * const mockDb = createMockDb();
 * mockDb.where.mockReturnValueOnce(createWhereChain([user]));
 * ```
 */
export function createWhereChain(result: any[]) {
  return {
    limit: vi.fn().mockResolvedValue(result),
  };
}

/**
 * Cria uma cadeia mock para set().where()
 * 
 * Exemplo de uso:
 * ```ts
 * const mockDb = createMockDb();
 * mockDb.set.mockReturnValueOnce(createSetChain());
 * ```
 */
export function createSetChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Cria uma cadeia mock para values().returning()
 * 
 * Exemplo de uso:
 * ```ts
 * const mockDb = createMockDb();
 * mockDb.values.mockReturnValueOnce(createValuesChain([newUser]));
 * ```
 */
export function createValuesChain(result: any[]) {
  return {
    returning: vi.fn().mockResolvedValue(result),
  };
}
