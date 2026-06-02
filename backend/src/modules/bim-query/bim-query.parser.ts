// =====================================
// BIM Query Parser (SQL-like)
// =====================================

import type { BIMQuery, BIMFilter, PropertyFilter, LogicalFilter } from './bim-query.types.js';

/**
 * Parser de queries SQL-like para BIMQuery
 * 
 * Exemplos:
 * - SELECT * FROM IfcWall WHERE Level = '2'
 * - SELECT * FROM IfcWall WHERE Level = '2' AND FireRating LIKE 'EI%'
 * - SELECT COUNT(*) FROM IfcWall GROUP BY Level
 * - SELECT * FROM IfcWall WHERE LoadBearing = true LIMIT 50
 */
export class BIMQueryParser {
  /**
   * Parse query string SQL-like para BIMQuery
   */
  static parse(queryString: string): BIMQuery {
    const normalized = queryString.trim();

    // Extrai cláusulas
    const selectMatch = normalized.match(/SELECT\s+(.*?)\s+FROM/i);
    const fromMatch = normalized.match(/FROM\s+(\w+)/i);
    const whereMatch = normalized.match(/WHERE\s+(.*?)(?:\s+ORDER BY|\s+GROUP BY|\s+LIMIT|$)/i);
    const orderByMatch = normalized.match(/ORDER BY\s+(.*?)(?:\s+LIMIT|$)/i);
    const groupByMatch = normalized.match(/GROUP BY\s+(.*?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
    const limitMatch = normalized.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);

    const query: BIMQuery = {};

    // SELECT (projeção)
    if (selectMatch) {
      const selectClause = selectMatch[1].trim();
      if (selectClause !== '*') {
        // Agregação?
        const aggMatch = selectClause.match(/(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(.*?)\s*\)/i);
        if (aggMatch) {
          query.aggregation = {
            operation: aggMatch[1].toUpperCase() as any,
            field: aggMatch[2] === '*' ? undefined : aggMatch[2],
          };
        } else {
          query.select = selectClause.split(',').map((s) => s.trim());
        }
      }
    }

    // FROM (tipo IFC)
    if (fromMatch) {
      query.type = fromMatch[1];
    }

    // WHERE (filtros)
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      query.filters = this.parseWhereClause(whereClause);
    }

    // GROUP BY
    if (groupByMatch && query.aggregation) {
      const groupByClause = groupByMatch[1].trim();
      query.aggregation.groupBy = groupByClause.split(',').map((s) => s.trim());
    }

    // ORDER BY
    if (orderByMatch) {
      const orderByClause = orderByMatch[1].trim();
      query.orderBy = orderByClause.split(',').map((clause) => {
        const [field, direction] = clause.trim().split(/\s+/);
        return {
          field,
          direction: (direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
        };
      });
    }

    // LIMIT / OFFSET
    if (limitMatch) {
      query.limit = parseInt(limitMatch[1], 10);
      if (limitMatch[2]) {
        query.offset = parseInt(limitMatch[2], 10);
      }
    }

    return query;
  }

  /**
   * Parse cláusula WHERE
   */
  private static parseWhereClause(whereClause: string): BIMFilter[] {
    // Split por AND/OR (simplificado - não trata parênteses ainda)
    const tokens = this.tokenizeWhere(whereClause);
    return this.parseTokens(tokens);
  }

  /**
   * Tokeniza cláusula WHERE
   */
  private static tokenizeWhere(whereClause: string): string[] {
    // Regex para detectar operadores lógicos
    const logicalOps = /\b(AND|OR)\b/gi;
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = logicalOps.exec(whereClause)) !== null) {
      const condition = whereClause.slice(lastIndex, match.index).trim();
      if (condition) parts.push(condition);
      parts.push(match[0].toUpperCase());
      lastIndex = logicalOps.lastIndex;
    }

    const lastCondition = whereClause.slice(lastIndex).trim();
    if (lastCondition) parts.push(lastCondition);

    return parts;
  }

  /**
   * Parse tokens em BIMFilter[]
   */
  private static parseTokens(tokens: string[]): BIMFilter[] {
    const filters: BIMFilter[] = [];
    let currentLogicalOp: 'AND' | 'OR' | null = null;
    let pendingFilters: PropertyFilter[] = [];

    for (const token of tokens) {
      if (token === 'AND' || token === 'OR') {
        currentLogicalOp = token as 'AND' | 'OR';
      } else {
        const filter = this.parseCondition(token);
        if (filter) {
          pendingFilters.push(filter);
        }
      }
    }

    // Se houver múltiplos filtros com operador lógico, criar LogicalFilter
    if (pendingFilters.length > 1 && currentLogicalOp) {
      filters.push({
        operator: currentLogicalOp,
        filters: pendingFilters,
      } as LogicalFilter);
    } else {
      filters.push(...pendingFilters);
    }

    return filters;
  }

  /**
   * Parse condição individual (property operator value)
   */
  private static parseCondition(condition: string): PropertyFilter | null {
    // Regex para operadores
    const opRegex = /(!=|>=|<=|=|>|<|LIKE|IN|NOT IN|CONTAINS|STARTS_WITH|ENDS_WITH)/i;
    const match = condition.match(opRegex);

    if (!match) return null;

    const operator = match[1].toUpperCase();
    const [property, valueStr] = condition.split(opRegex).map((s) => s.trim());

    // Parse value (remove quotes, converte tipos)
    let value: any = valueStr;
    if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
      value = valueStr.slice(1, -1); // Remove aspas
    } else if (valueStr === 'true') {
      value = true;
    } else if (valueStr === 'false') {
      value = false;
    } else if (!isNaN(Number(valueStr))) {
      value = Number(valueStr);
    }

    return {
      property,
      operator: operator as any,
      value,
    };
  }

  /**
   * Converte BIMQuery de volta para SQL-like string
   */
  static toSQL(query: BIMQuery): string {
    let sql = 'SELECT ';

    // SELECT
    if (query.aggregation) {
      const op = query.aggregation.operation;
      const field = query.aggregation.field || '*';
      sql += `${op}(${field})`;
    } else if (query.select && query.select.length > 0) {
      sql += query.select.join(', ');
    } else {
      sql += '*';
    }

    // FROM
    sql += ` FROM ${query.type || 'IfcElement'}`;

    // WHERE
    if (query.filters && query.filters.length > 0) {
      sql += ' WHERE ' + this.filtersToSQL(query.filters);
    }

    // GROUP BY
    if (query.aggregation?.groupBy) {
      sql += ' GROUP BY ' + query.aggregation.groupBy.join(', ');
    }

    // ORDER BY
    if (query.orderBy && query.orderBy.length > 0) {
      sql += ' ORDER BY ' + query.orderBy.map((o) => `${o.field} ${o.direction}`).join(', ');
    }

    // LIMIT
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
      if (query.offset) {
        sql += ` OFFSET ${query.offset}`;
      }
    }

    return sql;
  }

  /**
   * Converte array de filtros para SQL WHERE clause
   */
  private static filtersToSQL(filters: BIMFilter[]): string {
    return filters
      .map((filter) => {
        if ('operator' in filter && ['AND', 'OR', 'NOT'].includes(filter.operator)) {
          // LogicalFilter
          const logical = filter as LogicalFilter;
          const inner = this.filtersToSQL(logical.filters);
          return logical.operator === 'NOT' ? `NOT (${inner})` : `(${inner})`;
        } else if ('property' in filter) {
          // PropertyFilter
          const prop = filter as PropertyFilter;
          const value = typeof prop.value === 'string' ? `'${prop.value}'` : prop.value;
          return `${prop.property} ${prop.operator} ${value}`;
        }
        return '';
      })
      .filter(Boolean)
      .join(' AND ');
  }
}
