import { createElement as h } from 'react';
import { Document, Page, Text, View, Svg, Line, Polyline, renderToBuffer } from '@react-pdf/renderer';
import type { getObra } from './obra-workspace.js';

type Budget = Extract<Awaited<ReturnType<typeof getObra>>, { report: unknown }>;
const money = (v: string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const scope = {
  full: 'Materiais, mão de obra e equipamentos',
  material: 'Materiais',
  labor: 'Mão de obra',
};
const status = {
  ready: 'Pronto para orçar',
  estimated: 'Estimado com premissa aprovada',
  pending: 'Pendente',
};
export function renderObraPdf(data: Budget) {
  const { settings, report } = data;
  const heading = (s: string) =>
    h(Text, { style: { fontSize: 14, marginTop: 14, marginBottom: 6, color: '#234759' } }, s);
  const row = (key: string, title: string, detail: string) =>
    h(
      View,
      {
        key,
        wrap: false,
        style: { paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#d7e1e4' },
      },
      h(Text, { style: { fontFamily: 'Helvetica-Bold' } }, title),
      h(Text, null, detail),
    );
  const docs = new Map(data.documents.map((d) => [d.id, d.filename]));
  const acts = new Map(data.activities.map((a) => [a.id, a.name]));
  const top = Math.max(1,...report.periods.map(p=>Math.max(Number(p.cumulative),Number(p.cumulativePaid))));
  const coordinates = (field:'cumulative'|'cumulativePaid') => report.periods.map((p,i)=>{
    const x=4+472*i/Math.max(1,report.periods.length-1);
    const y=76-70*Number(p[field])/top;
    return x+','+y;
  }).join(' ');
  return renderToBuffer(
    h(
      Document,
      { title: settings.name + ' • Orçamento da obra' },
      h(
        Page,
        {
          size: 'A4',
          style: {
            padding: 36,
            paddingBottom: 46,
            fontFamily: 'Helvetica',
            fontSize: 9,
            lineHeight: 1.4,
          },
        },
        h(Text, { style: { fontSize: 21 } }, settings.name),
        h(Text, null, 'Orçamento físico-financeiro • ' + scope[settings.scope]),
        h(
          Text,
          null,
          settings.area +
            ' m² • Início ' +
            settings.start_date +
            ' • Prazo ' +
            settings.months +
            ' meses',
        ),
        heading('Investimento'),
        h(
          Text,
          null,
          'Custo direto ' +
            money(report.direct) +
            ' • BDI ' +
            settings.bdi +
            '% • ' +
            money(report.bdi),
        ),
        h(Text, null, 'Total com BDI ' + money(report.total) + ' • ' + money(report.perM2) + '/m²'),
        h(
          Text,
          null,
          'Parcela estimada ' +
            money(report.estimated) +
            ' • A programar ' +
            money(report.unallocated) +
            ' • Pago ' +
            money(report.paid),
        ),
        heading('Desembolso e fluxo de caixa'),
        h(Text,null,'Curva acumulada • azul: planejado • verde: pago'),
        h(Svg,{width:480,height:80,viewBox:'0 0 480 80'},
          h(Line,{x1:4,x2:476,y1:76,y2:76,stroke:'#bccdd2'}),
          h(Polyline,{points:coordinates('cumulative'),stroke:'#186584',fill:'none',strokeWidth:2}),
          h(Polyline,{points:coordinates('cumulativePaid'),stroke:'#218659',fill:'none',strokeWidth:2})),
        ...report.periods.map((p) =>
          row(
            p.month,
            p.month + ' • Planejado ' + money(p.planned) + ' • Pago ' + money(p.paid),
            'Planejado acumulado ' +
              money(p.cumulative) +
              ' • Pago acumulado ' +
              money(p.cumulativePaid),
          ),
        ),
        heading('Desembolso por etapa'),
        ...report.stages.flatMap((s) =>
          Object.entries(s.months).map(([month, value]) =>
            row(s.stage + month, s.stage, month + ' • ' + money(value)),
          ),
        ),
        heading('Orçamento analítico, premissas e pendências'),
        ...report.lines.map((l) =>
          row(
            l.id,
            l.description + ' • ' + status[l.status],
            [
              [l.stage, acts.get(l.activity_id ?? '') ?? 'A programar', l.storey, l.global_id]
                .filter(Boolean)
                .join(' • '),
              'Quantidade ' +
                (l.quantity ?? 'pendente') +
                ' ' +
                l.unit +
                ' • Executado ' +
                l.executed +
                ' ' +
                l.unit +
                ' • Total ' +
                (l.total === null ? 'pendente' : money(l.total)),
              [
                ['Mão de obra', l.labor],
                ['Materiais', l.material],
                ['Equipamentos', l.equipment],
                ['Preço único', l.combined],
              ]
                .filter(([, v]) => v != null)
                .map(([k, v]) => k + ' ' + money(v!))
                .join(' • '),
              l.document_id ? docs.get(l.document_id) + ' • pág. ' + l.page : '',
              l.evidence,
              l.assumption,
              l.issue,
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ),
        heading('Medições de campo'),
        ...data.entries.map((m) =>
          row(
            m.id,
            m.measured_on +
              ' • ' +
              (report.lines.find((l) => l.id === m.service_id)?.description ?? ''),
            'Quantidade executada ' + m.quantity + ' • Pago ' + money(m.paid) + ' • ' + m.note,
          ),
        ),
        h(Text, {
          fixed: true,
          style: { position: 'absolute', bottom: 18, right: 36, fontSize: 8 },
          render: ({ pageNumber, totalPages }) => 'Arxis • ' + pageNumber + ' / ' + totalPages,
        }),
      ),
    ),
  );
}
