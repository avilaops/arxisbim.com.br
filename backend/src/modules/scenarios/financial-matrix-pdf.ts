import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { FinancialMatrix } from './financial-matrix.service.js';

const h = React.createElement;
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, color: '#1c1917' },
  title: { fontSize: 18, marginBottom: 8 },
  text: { marginBottom: 8, lineHeight: 1.5 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    paddingVertical: 9,
  },
  cell: { width: '15%', paddingRight: 7 },
  name: { width: '25%', paddingRight: 7 },
  note: { fontSize: 8, color: '#57534e', marginTop: 5 },
  heading: { fontSize: 11, marginTop: 16, marginBottom: 8 },
});
const money = (value: string | null) =>
  value === null
    ? 'Pendente'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(value));
export async function generateMatrixPdf(
  matrix: FinancialMatrix,
): Promise<Buffer> {
  const name = (id: string) =>
    matrix.scenarios.find((s) => s.id === id)?.name ?? id;
  const cell = (text: string, wide = false) =>
    h(Text, { style: wide ? styles.name : styles.cell }, text);
  const document = h(
    Document,
    null,
    h(
      Page,
      { size: 'A4', orientation: 'landscape', style: styles.page },
      h(Text, { style: styles.title }, 'Arxis • Matriz de custo e prazo'),
      h(
        Text,
        { style: styles.text },
        `${matrix.projectName} • Referência: ${name(matrix.baselineId)} • ${new Date(matrix.generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      ),
      h(Text, { style: styles.text }, matrix.recommendation.explanation),
      h(
        View,
        { style: styles.row, fixed: true },
        cell('Cenário', true),
        cell('Custo orçado'),
        cell('Duração / conclusão'),
        cell('Delta custo / dias'),
        cell('Cobertura / vínculos'),
        cell('Posição / pontos'),
      ),
      ...matrix.scenarios.map((s) =>
        h(
          View,
          { key: s.id, style: styles.row, wrap: false },
          cell(
            s.name + (s.id === matrix.baselineId ? ' • Referência' : ''),
            true,
          ),
          cell(money(s.totalCost)),
          cell(
            s.durationDays === null
              ? 'Pendente'
              : `${s.durationDays} dias\n${s.completionDate?.split('-').reverse().join('/')}`,
          ),
          cell(
            `${s.deltaCost === null ? 'Pendente' : money(s.deltaCost)}\n${s.deltaDays === null ? 'Prazo pendente' : `${s.deltaDays} dias`}`,
          ),
          cell(
            `${s.pricedElements}/${s.modelElements} elementos\n${s.costLinks} vínculos`,
          ),
          cell(
            s.rank === null
              ? 'Fora do ranking'
              : `${s.rank}º • ${s.score} pontos`,
          ),
        ),
      ),
      h(Text, { style: styles.heading }, 'Pendências e critérios'),
      ...matrix.scenarios
        .filter((s) => s.issues.length)
        .map((s) =>
          h(
            Text,
            { key: s.id, style: styles.note },
            `${s.name}: ${s.issues.join(' ')}`,
          ),
        ),
      ...matrix.warnings.map((warning, i) =>
        h(Text, { key: i, style: styles.note }, '• ' + warning),
      ),
      h(
        Text,
        { style: styles.note },
        'Critério: 60% custo • 40% prazo. Valores correspondem somente aos itens orçados. Dias de calendário inclusivos.',
      ),
    ),
  );
  return renderToBuffer(document);
}
