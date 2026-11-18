import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const options = {
  timeout: 45000,
  maxBuffer: 12 * 1024 * 1024,
  windowsHide: true,
  encoding: 'utf8' as const,
};
const units = 'm[²³23]?|kg|un(?:id)?|pç|peças?|vb|h|mês|mes|l|t|cj|und|ml';
const number = '\\d+(?:\\.\\d{3})*(?:,\\d+)?';
const quotedRow = new RegExp(
  '^\\s*([A-Z][A-Z\\d.-]{0,30})\\s+(.+?)\\s+(' +
    units +
    ')\\s+(' +
    number +
    ')\\s+(' +
    number +
    ')\\s+(' +
    number +
    ')\\s+(' +
    number +
    ')\\s+R\\$',
  'i',
);
const measuredRow = new RegExp(
  '^\\s*(.{3,180}?)\\s{2,}(' + units + ')\\s+(' + number + ')\\s*$',
  'i',
);
const measuredLastUnit = new RegExp(
  '^\\s*(.{3,180}?)\\s{2,}(' + number + ')\\s+(' + units + ')\\s*$',
  'i',
);
const decimal = (value: string) => value.replaceAll('.', '').replace(',', '.');

export interface PdfService {
  page: number;
  stage: string;
  description: string;
  unit: string;
  quantity: string;
  labor: string | null;
  material: string | null;
  equipment: string | null;
  evidence: string;
}

export function classifyDiscipline(text: string) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/orcamento analitico|relatorio completo do orcamento/.test(normalized)) return 'Orçamento';
  const groups: [string, RegExp][] = [
    ['Elétrica', /eletric\w*|eletroduto\w*|tomada\w*|luminaria\w*/g],
    ['Estrutural', /estrutur\w*|armadura\w*|fundac\w*|concreto/g],
    ['Hidrossanitária', /hidrossanit\w*|esgoto\w*|hidraulic\w*|agua fria/g],
    ['Arquitetura', /arquitet\w*|planta baixa|alvenaria\w*|revestimento\w*/g],
    ['Climatização', /climatiz\w*|ar condicionado|refrigerac\w*/g],
  ];
  const scores = groups
    .map(([name, pattern]) => ({ name, score: normalized.match(pattern)?.length ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return scores[0].score > scores[1].score ? scores[0].name : 'A classificar';
}

export function readPdfServices(pages: string[], filename: string) {
  const discipline = classifyDiscipline(filename + ' ' + pages.join('\n'));
  const services: PdfService[] = [];
  let stage = discipline;
  for (const [index, page] of pages.entries()) {
    const analytical = /MO\s+unit\./i.test(page) && /Mat\.\s+unit\./i.test(page);
    // A priced report also has compositions and input catalogs. Counting those again would double the estimate.
    if (discipline === 'Orçamento' && !analytical) continue;
    const lines = page.split(/\r?\n/);
    for (const [offset, line] of lines.entries()) {
      const heading = analytical && line.match(/^\s*\d+\.\s+([^\n]+?)\s*(?:R\$.*)?$/);
      if (heading) {
        stage = heading[1].trim();
        continue;
      }
      const priced = analytical && line.match(quotedRow);
      if (priced) {
        const [, code, description, unit, qty, labor, material, equipment] = priced;
        const next = lines[offset + 1]?.trim();
        services.push({
          page: index + 1,
          stage,
          description: code + ' • ' + description.trim(),
          unit,
          quantity: decimal(qty),
          labor: decimal(labor),
          material: decimal(material),
          equipment: decimal(equipment),
          evidence: [line.trim(), next && !/\s{4,}R\$/.test(next) ? next : '']
            .filter(Boolean)
            .join('\n'),
        });
      } else if (!analytical) {
        const first = line.match(measuredRow);
        const row = first ?? line.match(measuredLastUnit);
        if (row)
          services.push({
            page: index + 1,
            stage,
            description: row[1].trim(),
            unit: first ? row[2] : row[3],
            quantity: decimal(first ? row[3] : row[2]),
            labor: null,
            material: null,
            equipment: null,
            evidence: line.trim(),
          });
      }
    }
  }
  return { discipline, services };
}

export async function extractBudgetPdf(content: Buffer, filename: string) {
  if (!content.subarray(0, 1024).includes(Buffer.from('%PDF-')))
    throw Object.assign(new Error('Envie um arquivo PDF válido.'), { statusCode: 400 });
  const dir = await mkdtemp(join(tmpdir(), 'arxis-obra-'));
  try {
    const file = join(dir, 'source.pdf');
    await writeFile(file, content);
    const { stdout } = await execute(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', '-f', '1', '-l', '301', file, '-'],
      options,
    );
    const pages = stdout.split('\f');
    if (!pages.at(-1)?.trim()) pages.pop();
    if (!pages.length || pages.length > 300)
      throw Object.assign(new Error('Importe PDFs com 1 a 300 páginas.'), { statusCode: 422 });
    const scans = pages.flatMap((page, index) => (page.trim().length < 15 ? [index] : []));
    if (scans.length > 30)
      throw Object.assign(
        new Error('Divida o documento em blocos de até 30 páginas digitalizadas.'),
        { statusCode: 422 },
      );
    for (const index of scans) {
      const page = String(index + 1);
      const base = join(dir, 'scan');
      await execute(
        'pdftoppm',
        ['-f', page, '-l', page, '-scale-to', '2200', '-singlefile', '-png', file, base],
        options,
      );
      const result = await execute(
        'tesseract',
        [base + '.png', 'stdout', '-l', 'por', '-c', 'preserve_interword_spaces=1'],
        options,
      );
      pages[index] = result.stdout;
    }
    const result = readPdfServices(pages, filename);
    if (result.services.length > 5000)
      throw Object.assign(new Error('Divida a importação em lotes de até 5 mil serviços.'), {
        statusCode: 422,
      });
    return { ...result, pages: pages.length };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) throw error;
    const unavailable = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    throw Object.assign(
      new Error(
        unavailable
          ? 'Leitor de PDF ou OCR indisponível no servidor.'
          : 'Não foi possível ler o PDF. Verifique a proteção, o tamanho e a legibilidade.',
      ),
      { statusCode: unavailable ? 503 : 422 },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
