/**
 * QueryParser — minimal SQL-like dialect → `Query` AST.
 *
 * Grammar (case-insensitive keywords):
 *
 *   query        := 'SELECT' '*' 'FROM' IDENT ('WHERE' expr)? ('LIMIT' INT)?
 *   expr         := orExpr
 *   orExpr       := andExpr ('OR' andExpr)*
 *   andExpr      := notExpr ('AND' notExpr)*
 *   notExpr      := 'NOT' notExpr | primary
 *   primary      := '(' expr ')' | predicate
 *   predicate    := propRef op value
 *                 | propRef 'IN' '(' valueList ')'
 *                 | propRef 'IS' ('NOT')? 'NULL'
 *                 | propRef 'LIKE' STRING
 *   propRef      := IDENT ('.' IDENT)?
 *   op           := '=' | '!=' | '<>' | '>' | '>=' | '<' | '<='
 *   value        := STRING | NUMBER | 'TRUE' | 'FALSE'
 *   valueList    := value (',' value)*
 */

import type { ComparisonOp, PropertyRef, Query, QueryFilter } from './types';

type Primitive = number | string | boolean;

type Token =
  | { kind: 'ident'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'symbol'; value: string }
  | { kind: 'keyword'; value: string };

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'LIMIT', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'TRUE', 'FALSE',
]);

export class QueryParser {
  parse(input: string): Query {
    const tokens = tokenize(input);
    const p = new Parser(tokens);
    return p.parseQuery();
  }
}

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '*' || c === '(' || c === ')' || c === ',') {
      out.push({ kind: 'symbol', value: c });
      i++;
      continue;
    }
    if (c === '=' || c === '<' || c === '>' || c === '!') {
      const next = input[i + 1];
      if ((c === '<' && next === '=') || (c === '>' && next === '=') || (c === '!' && next === '=') || (c === '<' && next === '>')) {
        out.push({ kind: 'symbol', value: c + next });
        i += 2;
      } else if (c === '=') {
        out.push({ kind: 'symbol', value: '=' });
        i++;
      } else if (c === '<' || c === '>') {
        out.push({ kind: 'symbol', value: c });
        i++;
      } else {
        throw new Error(`Unexpected character '${c}' at ${i}`);
      }
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let str = '';
      while (j < n && input[j] !== quote) {
        if (input[j] === '\\' && j + 1 < n) {
          str += input[j + 1];
          j += 2;
        } else {
          str += input[j];
          j++;
        }
      }
      if (j >= n) throw new Error(`Unterminated string starting at ${i}`);
      out.push({ kind: 'string', value: str });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(input[j])) j++;
      const num = Number(input.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`Invalid number at ${i}`);
      out.push({ kind: 'number', value: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(input[j])) j++;
      const word = input.slice(i, j);
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper)) {
        out.push({ kind: 'keyword', value: upper });
      } else {
        out.push({ kind: 'ident', value: word });
      }
      i = j;
      continue;
    }
    throw new Error(`Unexpected character '${c}' at ${i}`);
  }
  return out;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parseQuery(): Query {
    this.expectKeyword('SELECT');
    this.expectSymbol('*');
    this.expectKeyword('FROM');
    const from = this.expectIdent();

    const q: Query = { from };

    if (this.matchKeyword('WHERE')) {
      q.where = this.parseExpr();
    }
    if (this.matchKeyword('LIMIT')) {
      const tok = this.next();
      if (!tok || tok.kind !== 'number') throw new Error('Expected number after LIMIT');
      q.limit = Math.floor(tok.value);
    }
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected trailing token: ${JSON.stringify(this.tokens[this.pos])}`);
    }
    return q;
  }

  private parseExpr(): QueryFilter {
    return this.parseOr();
  }

  private parseOr(): QueryFilter {
    const left = this.parseAnd();
    const ors: QueryFilter[] = [left];
    while (this.matchKeyword('OR')) ors.push(this.parseAnd());
    return ors.length === 1 ? ors[0] : { kind: 'or', filters: ors };
  }

  private parseAnd(): QueryFilter {
    const left = this.parseNot();
    const ands: QueryFilter[] = [left];
    while (this.matchKeyword('AND')) ands.push(this.parseNot());
    return ands.length === 1 ? ands[0] : { kind: 'and', filters: ands };
  }

  private parseNot(): QueryFilter {
    if (this.matchKeyword('NOT')) return { kind: 'not', filter: this.parseNot() };
    return this.parsePrimary();
  }

  private parsePrimary(): QueryFilter {
    if (this.matchSymbol('(')) {
      const inner = this.parseExpr();
      this.expectSymbol(')');
      return inner;
    }
    return this.parsePredicate();
  }

  private parsePredicate(): QueryFilter {
    const ident = this.expectIdent();
    const property = parsePropertyRef(ident);

    // IS [NOT] NULL
    if (this.matchKeyword('IS')) {
      const negated = this.matchKeyword('NOT');
      this.expectKeyword('NULL');
      return {
        kind: 'property',
        property,
        op: negated ? 'IS NOT NULL' : 'IS NULL',
      };
    }
    // IN (...)
    if (this.matchKeyword('IN')) {
      this.expectSymbol('(');
      const values: Primitive[] = [this.parseValue()];
      while (this.matchSymbol(',')) values.push(this.parseValue());
      this.expectSymbol(')');
      return { kind: 'property', property, op: 'IN', value: values };
    }
    // LIKE
    if (this.matchKeyword('LIKE')) {
      const tok = this.next();
      if (!tok || tok.kind !== 'string') throw new Error('LIKE expects a string literal');
      return { kind: 'property', property, op: 'LIKE', value: tok.value };
    }
    // comparison
    const opTok = this.next();
    if (!opTok || opTok.kind !== 'symbol') throw new Error('Expected operator');
    const op = mapOp(opTok.value);
    const value = this.parseValue();
    return { kind: 'property', property, op, value };
  }

  private parseValue(): Primitive {
    const tok = this.next();
    if (!tok) throw new Error('Expected value');
    if (tok.kind === 'string') return tok.value;
    if (tok.kind === 'number') return tok.value;
    if (tok.kind === 'keyword') {
      if (tok.value === 'TRUE') return true;
      if (tok.value === 'FALSE') return false;
    }
    throw new Error(`Expected literal, got ${JSON.stringify(tok)}`);
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }
  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private matchKeyword(kw: string): boolean {
    const t = this.peek();
    if (t && t.kind === 'keyword' && t.value === kw) {
      this.pos++;
      return true;
    }
    return false;
  }
  private matchSymbol(sym: string): boolean {
    const t = this.peek();
    if (t && t.kind === 'symbol' && t.value === sym) {
      this.pos++;
      return true;
    }
    return false;
  }
  private expectKeyword(kw: string): void {
    if (!this.matchKeyword(kw)) throw new Error(`Expected ${kw}`);
  }
  private expectSymbol(sym: string): void {
    if (!this.matchSymbol(sym)) throw new Error(`Expected '${sym}'`);
  }
  private expectIdent(): string {
    const t = this.next();
    if (!t || t.kind !== 'ident') throw new Error('Expected identifier');
    return t.value;
  }
}

function parsePropertyRef(raw: string): PropertyRef {
  const idx = raw.indexOf('.');
  if (idx < 0) return { name: raw };
  return { pset: raw.slice(0, idx), name: raw.slice(idx + 1) };
}

function mapOp(sym: string): ComparisonOp {
  switch (sym) {
    case '=':
      return '=';
    case '!=':
    case '<>':
      return '!=';
    case '>':
      return '>';
    case '>=':
      return '>=';
    case '<':
      return '<';
    case '<=':
      return '<=';
    default:
      throw new Error(`Unsupported operator '${sym}'`);
  }
}
