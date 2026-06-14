import type { Sql } from 'postgres';
import { read, utils } from 'xlsx';

export interface SINAPIImportResult {
  state_code: string;
  reference_month: string;
  rows_parsed: number;
  rows_inserted: number;
  rows_skipped: number;
  errors: Array<{ row: number; reason: string }>;
  execution_time_ms: number;
}

export interface SINAPIItem {
  code: string;
  description: string;
  unit: string;
  price_with_tax: string; // DECIMAL(12,4) as string
  price_without_tax: string;
  state_code: string;
  reference_month: Date;
}

const REQUIRED_COLUMNS = [
  'Código',
  'Descrição',
  'Unidade',
  'Preço com desoneração',
  'Preço sem desoneração',
  'UF',
  'Mês',
];

export class SINAPIImportService {
  constructor(private sql: Sql) {}

  /**
   * Importa planilha SINAPI (XLSX)
   * Valida formato, parseia, faz batch insert
   */
  async importXLSX(
    fileBuffer: Buffer,
    stateCode: string,
    referenceMonth: Date
  ): Promise<SINAPIImportResult> {
    const startTime = Date.now();
    const errors: Array<{ row: number; reason: string }> = [];

    try {
      // Parsear XLSX
      const workbook = read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        throw new Error('Nenhuma aba encontrada na planilha');
      }

      const worksheet = workbook.Sheets[firstSheet];
      const rows = utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        throw new Error('Planilha vazia');
      }

      // Validar colunas
      const firstRow = rows[0] as Record<string, unknown>;
      const columns = Object.keys(firstRow);
      const missingColumns = REQUIRED_COLUMNS.filter(
        col => !columns.some(c => c.toLowerCase().includes(col.toLowerCase()))
      );

      if (missingColumns.length > 0) {
        throw new Error(
          `Colunas faltantes ou nome incorreto: ${missingColumns.join(', ')}. ` +
            `Esperado: ${REQUIRED_COLUMNS.join(', ')}`
        );
      }

      // Parsear itens
      const items: SINAPIItem[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as Record<string, unknown>;
        try {
          const item = this.parseRow(row, stateCode, referenceMonth);
          if (item) items.push(item);
        } catch (err) {
          errors.push({
            row: i + 2, // +1 para 1-based, +1 para header
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Batch insert (1000 por transação)
      let inserted = 0;
      const batchSize = 1000;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        inserted += await this.insertBatch(batch);
      }

      return {
        state_code: stateCode,
        reference_month: referenceMonth.toISOString().split('T')[0],
        rows_parsed: rows.length,
        rows_inserted: inserted,
        rows_skipped: rows.length - inserted,
        errors,
        execution_time_ms: Date.now() - startTime,
      };
    } catch (err) {
      throw new Error(
        `Falha ao importar SINAPI: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Parseia linha do XLSX → SINAPIItem
   */
  private parseRow(
    row: Record<string, unknown>,
    stateCode: string,
    referenceMonth: Date
  ): SINAPIItem | null {
    // Extrair valores com tolerância a nomes de coluna
    const code = this.getColumnValue(row, ['Código', 'codigo', 'code'], '');
    const description = this.getColumnValue(row, ['Descrição', 'descricao', 'description'], '');
    const unit = this.getColumnValue(row, ['Unidade', 'unidade', 'unit'], '');
    const priceWithTax = this.getColumnValue(
      row,
      ['Preço com desoneração', 'preco_com_desoneração', 'price_with_tax'],
      '0'
    );
    const priceWithoutTax = this.getColumnValue(
      row,
      ['Preço sem desoneração', 'preco_sem_desoneração', 'price_without_tax'],
      '0'
    );

    // Validação
    if (!code || !description) {
      return null; // Linha vazia ou inválida
    }

    return {
      code: String(code).trim(),
      description: String(description).trim().substring(0, 1000),
      unit: String(unit).trim().substring(0, 10),
      price_with_tax: this.normalizePrice(priceWithTax),
      price_without_tax: this.normalizePrice(priceWithoutTax),
      state_code: stateCode,
      reference_month: referenceMonth,
    };
  }

  /**
   * Extrai valor de coluna com múltiplas variações de nome
   */
  private getColumnValue(
    row: Record<string, unknown>,
    columnNames: string[],
    fallback: string
  ): unknown {
    for (const name of columnNames) {
      const value = row[name];
      if (value !== null && value !== undefined) {
        return value;
      }

      // Busca case-insensitive
      const key = Object.keys(row).find(
        k => k.toLowerCase().includes(name.toLowerCase()) ||
             name.toLowerCase().includes(k.toLowerCase())
      );
      if (key) return row[key];
    }
    return fallback;
  }

  /**
   * Normaliza preço para DECIMAL(12,4)
   */
  private normalizePrice(value: unknown): string {
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(',', '.'));
      return isNaN(num) ? '0.0000' : num.toFixed(4);
    }
    if (typeof value === 'number') {
      return value.toFixed(4);
    }
    return '0.0000';
  }

  /**
   * Insere batch de itens
   */
  private async insertBatch(items: SINAPIItem[]): Promise<number> {
    if (items.length === 0) return 0;

    try {
      // Usar ON CONFLICT para skippar duplicatas (código+UF+mês)
      const result = await this.sql`
        INSERT INTO sinapi_items (
          code, description, unit, price_with_tax, price_without_tax,
          state_code, reference_month
        )
        SELECT * FROM (
          VALUES ${this.sql(
            items.map(i => [
              i.code,
              i.description,
              i.unit,
              i.price_with_tax,
              i.price_without_tax,
              i.state_code,
              i.reference_month,
            ])
          )}
        ) AS t(code, description, unit, price_with_tax, price_without_tax, state_code, reference_month)
        ON CONFLICT (code, state_code, reference_month) DO UPDATE
        SET
          description = EXCLUDED.description,
          unit = EXCLUDED.unit,
          price_with_tax = EXCLUDED.price_with_tax,
          price_without_tax = EXCLUDED.price_without_tax
      `;

      return result.count;
    } catch (err) {
      console.error('[SINAPIImport] Batch insert failed:', err);
      return 0;
    }
  }

  /**
   * Busca items SINAPI
   */
  async searchItems(
    query: string,
    stateCode?: string,
    referenceMonth?: string,
    limit: number = 50
  ): Promise<
    Array<{
      id: string;
      code: string;
      description: string;
      unit: string;
      price_without_tax: string;
    }>
  > {
    let sql = this.sql`
      SELECT id, code, description, unit, price_without_tax
      FROM sinapi_items
      WHERE 1=1
    `;

    // Busca por código (exato) ou descrição (full-text)
    if (query) {
      const trimmedQuery = query.trim();
      if (/^\d+\/\d+$/.test(trimmedQuery)) {
        // Código SINAPI
        sql = this.sql`
          ${sql}
          AND code = ${trimmedQuery}
        `;
      } else {
        // Descrição (full-text search em português)
        sql = this.sql`
          ${sql}
          AND to_tsvector('portuguese', description) @@ plainto_tsquery('portuguese', ${trimmedQuery})
        `;
      }
    }

    if (stateCode) {
      sql = this.sql`${sql} AND state_code = ${stateCode}`;
    }

    if (referenceMonth) {
      const monthDate = new Date(referenceMonth);
      sql = this.sql`${sql} AND reference_month = ${monthDate}`;
    }

    sql = this.sql`${sql} ORDER BY code LIMIT ${limit}`;

    return sql;
  }

  /**
   * Obter versões disponíveis (UF + meses)
   */
  async getAvailableVersions(): Promise<
    Array<{ state_code: string; reference_month: string; item_count: number }>
  > {
    return this.sql`
      SELECT
        state_code,
        reference_month,
        COUNT(*) as item_count
      FROM sinapi_items
      GROUP BY state_code, reference_month
      ORDER BY reference_month DESC, state_code
    `;
  }
}
