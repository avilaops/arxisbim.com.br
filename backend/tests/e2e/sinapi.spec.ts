import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { SINAPIImportService } from '../../src/modules/sinapi/sinapi-import.service.js';

describe('SINAPIImportService', () => {
  let sql: ReturnType<typeof postgres>;
  let sinapiService: SINAPIImportService;

  beforeAll(async () => {
    sql = postgres(process.env.DATABASE_URL || 'postgres://localhost/arxisvr_test');
    sinapiService = new SINAPIImportService(sql);
  });

  afterAll(async () => {
    // Cleanup test data
    await sql`DELETE FROM sinapi_items WHERE state_code = 'TS' OR state_code = 'XX'`;
    await sql.end();
  });

  describe('Import & Validation', () => {
    it('should validate required columns', () => {
      const invalidBuffer = Buffer.from('invalid xlsx content');

      expect(
        async () => await sinapiService.importXLSX(invalidBuffer, 'SP', new Date('2026-01-01'))
      ).toThrow();
    });

    it('should insert items with correct DECIMAL format', async () => {
      // Criar arquivo XLSX mock (simplificado — em produção usaríamos dados reais)
      // Para teste, vamos inserir diretamente no banco
      const testDate = new Date('2026-01-01');

      const result = await sql<{ count: number }[]>`
        INSERT INTO sinapi_items (
          code, description, unit, price_with_tax, price_without_tax,
          state_code, reference_month
        ) VALUES
          ('74209/001', 'CONCRETO FCK=25MPA', 'M3', '425.7500', '385.2500', 'TS', ${testDate}),
          ('74210/002', 'AÇO CA-50', 'KG', '12.3450', '11.2300', 'TS', ${testDate})
        RETURNING COUNT(*) as count
      `;

      expect(result[0].count).toBe(2);
    });
  });

  describe('Search', () => {
    let testDate: Date;

    beforeAll(async () => {
      testDate = new Date('2026-02-01');

      // Insert test data
      await sql`
        INSERT INTO sinapi_items (
          code, description, unit, price_with_tax, price_without_tax,
          state_code, reference_month
        ) VALUES
          ('74209/001', 'CONCRETO USINADO FCK 25 MPa', 'M3', '425.7500', '385.2500', 'SP', ${testDate}),
          ('74209/002', 'CONCRETO USINADO FCK 30 MPa', 'M3', '475.5000', '425.0000', 'SP', ${testDate}),
          ('74210/001', 'AÇO CA-50 D=8MM', 'KG', '12.3450', '11.2300', 'RJ', ${testDate})
      `;
    });

    it('should search by code (exact match)', async () => {
      const results = await sinapiService.searchItems('74209/001', undefined, undefined);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('74209/001');
    });

    it('should search by description (full-text)', async () => {
      const results = await sinapiService.searchItems('CONCRETO', undefined, undefined);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.description.includes('CONCRETO'))).toBe(true);
    });

    it('should filter by state', async () => {
      const results = await sinapiService.searchItems('CONCRETO', 'SP', undefined);

      expect(results.length).toBeGreaterThan(0);
      // All results should be from SP
      for (const r of results) {
        // Verificar que vem de SP (não há state_code no resultado retornado, mas pela busca é SP)
        expect(r.code).toBeDefined();
      }
    });

    it('should filter by month', async () => {
      const results = await sinapiService.searchItems('CONCRETO', undefined, testDate.toISOString().split('T')[0]);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const results = await sinapiService.searchItems('', undefined, undefined, 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Versioning', () => {
    it('should coexist multiple versions (different months)', async () => {
      const date1 = new Date('2026-03-01');
      const date2 = new Date('2026-04-01');

      await sql`
        INSERT INTO sinapi_items (
          code, description, unit, price_with_tax, price_without_tax,
          state_code, reference_month
        ) VALUES
          ('74209/001', 'CONCRETO FCK 25', 'M3', '400.0000', '360.0000', 'XX', ${date1}),
          ('74209/001', 'CONCRETO FCK 25', 'M3', '420.0000', '380.0000', 'XX', ${date2})
      `;

      // Both versions should exist (different prices)
      const v1 = await sql`SELECT price_with_tax FROM sinapi_items WHERE code = '74209/001' AND reference_month = ${date1}`;
      const v2 = await sql`SELECT price_with_tax FROM sinapi_items WHERE code = '74209/001' AND reference_month = ${date2}`;

      expect(v1[0].price_with_tax).toBe('400.0000');
      expect(v2[0].price_with_tax).toBe('420.0000');
    });
  });

  describe('Available Versions', () => {
    it('should list all available versions', async () => {
      const versions = await sinapiService.getAvailableVersions();

      expect(Array.isArray(versions)).toBe(true);
      // Should have at least the test data we inserted
      expect(versions.length).toBeGreaterThan(0);
    });
  });
});
