import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Sql } from 'postgres';
import { createHash } from 'node:crypto';
import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { extractBudgetPdf } from './obra-documents.js';
import { diagnoseIfc, getObra, lockObra, obraError } from './obra-workspace.js';
import { effectiveRate } from './obra-report.js';
import { renderObraPdf } from './obra-pdf.js';

const amount = z.string().regex(/^\d{1,12}(?:\.\d{1,4})?$/);
const label = z.string().trim().min(1).max(500);
const params = z.object({ scenarioId: z.uuid(), resource: z.uuid().optional() });
const settings = z.object({
  name: label,
  area: amount.refine((v) => Number(v) > 0 && Number(v) < 1e10),
  months: z.number().int().min(1).max(600),
  start_date: z.iso.date(),
  bdi: amount.refine((v) => Number(v) < 10000),
  scope: z.enum(['full', 'material', 'labor']),
  revision: z.number().int().nonnegative(),
});
const service = z.object({
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  description: label,
  stage: label,
  unit: label.max(32),
  quantity: amount.nullable(),
  labor: amount.nullable(),
  material: amount.nullable(),
  equipment: amount.nullable(),
  combined: amount.nullable(),
  status: z.enum(['ready', 'estimated', 'pending']),
  assumption: z.string().trim().max(2000),
  evidence: z.string().trim().max(4000),
  activity_id: z.uuid().nullable(),
  global_id: z.string().min(1).max(22).nullable(),
  document_id: z.uuid().nullable(),
  page: z.number().int().positive().nullable(),
});
const measurement = z.object({
  id: z.uuid(),
  service_id: z.uuid(),
  measured_on: z.iso.date(),
  quantity: amount,
  paid: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
  note: z.string().trim().max(1000),
});
const rule = z.object({
  itemId: z.uuid(),
  stage: label,
  category: label,
  storey: z.number().int().nullable(),
  requirements: z.array(z.string().regex(/^[^.\s][^.]{0,150}\.[^.\s][^.]{0,150}$/)).max(16),
});
function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success)
    throw obraError(
      400,
      'Revise os campos • ' + result.error.issues.map((e) => e.path.join('.')).join(', '),
    );
  return result.data;
}
export function registerObraRoutes(app: FastifyInstance, sql: Sql) {
  const path = '/scenarios/:scenarioId/obra';
  const auth = { onRequest: [app.authenticate] };
  async function scoped<T>(
    req: FastifyRequest,
    action: (tx: Sql, id: string, project: string, version: string | null) => Promise<T>,
    requireBudget = true,
  ) {
    const { scenarioId: id } = parse(params, req.params);
    if (!['GET','HEAD'].includes(req.method) && req.user?.role==='viewer')
      throw obraError(403,'O perfil de visualização permite consultar este orçamento.');
    return sql.begin(async (connection) => {
      const tx = connection as unknown as Sql;
      const scope = await lockObra(tx, id, req.user!.tenantId);
      if (requireBudget && !(await tx`SELECT 1 FROM obra_budgets WHERE scenario_id=${id}`).length)
        throw obraError(409, 'Configure primeiro os dados da obra.');
      return action(tx, id, scope.project_id, scope.model_version_id);
    });
  }
  app.get(path, auth, (req) => scoped(req, getObra, false));
  app.get(path + '/curve', auth, (req) =>
    scoped(
      req,
      async (tx, id, project, version) => {
        const data = await getObra(tx, id, project, version);
        if (!data.settings) return {configured:false as const};
        return {
          configured:true as const,
          unallocated: data.report.unallocated,
          points: data.report.periods.map((p) => ({
            month: p.month,
            cost: p.planned,
            cumulative: p.cumulative,
          })),
        };
      },
      false,
    ),
  );
  app.get(path + '/execution', auth, (req) =>
    scoped(req, async (tx, id, project, version) => {
      const { date, model } = parse(z.object({ date: z.iso.date(), model: z.uuid() }), req.query);
      const [origin] = await tx`SELECT 1 FROM model_versions mv JOIN models m ON m.id=mv.model_id
      WHERE mv.id=${version} AND m.project_id=${project} AND mv.metadata->>'ifcModelId'=${model}`;
      if (!origin) throw obraError(409, 'Selecione o modelo preparado para este cenário.');
      const elements = await tx`WITH progress AS (
      SELECT s.global_id,s.status,s.quantity,COALESCE(sum(m.quantity),0) AS done FROM obra_services s
      LEFT JOIN obra_measurements m ON m.service_id=s.id AND m.measured_on<=${date}::date
      WHERE s.scenario_id=${id} AND s.version_id=${version} AND s.global_id IS NOT NULL GROUP BY s.id
    ) SELECT global_id AS "globalId", CASE WHEN bool_and(status<>'pending' AND quantity IS NOT NULL AND done>=quantity) THEN 'concluido'
      WHEN bool_or(done>0) THEN 'ativo' ELSE 'nao_iniciado' END AS state FROM progress GROUP BY global_id`;
      return { elements };
    }),
  );
  app.get(path + '/report.pdf', auth, async (req, reply) => {
    const data = await scoped(req, getObra);
    if (!data.settings) throw obraError(404, 'Orçamento não encontrado.');
    const pdf = await renderObraPdf(data);
    return reply
      .type('application/pdf')
      .header('Content-Disposition', 'attachment; filename="orcamento-da-obra.pdf"')
      .send(pdf);
  });
  app.put(path, auth, (req) =>
    scoped(
      req,
      async (tx, id) => {
        const { revision, ...data } = parse(settings, req.body);
        const result =
          revision === 0
            ? await tx`INSERT INTO obra_budgets ${tx({ ...data, scenario_id: id })} ON CONFLICT DO NOTHING RETURNING revision`
            : await tx`UPDATE obra_budgets SET ${tx(data)},revision=revision+1 WHERE scenario_id=${id} AND revision=${revision} RETURNING revision`;
        if (!result.length)
          throw obraError(409, 'Dados alterados em outra sessão. Atualize a tela.');
        return result[0];
      },
      false,
    ),
  );
  app.post(path + '/documents', auth, async (req) => {
    const part = await req.file({ limits: { files: 1, fileSize: 20 * 1024 * 1024 } });
    if (!part) throw obraError(400, 'Selecione um PDF.');
    const content = await part.toBuffer();
    const digest = createHash('sha256').update(content).digest('hex');
    const filename = part.filename.slice(0, 240);
    const existing = await scoped(
      req,
      async (tx, id) =>
        (await tx`SELECT id FROM obra_documents WHERE scenario_id=${id} AND digest=${digest}`)[0],
    );
    if (existing) return { id: existing.id, duplicate: true };
    const parsed = await extractBudgetPdf(content, filename);
    return scoped(req, async (tx, id) => {
      const [doc] =
        await tx`INSERT INTO obra_documents (scenario_id,digest,filename,discipline,pages,content)
        VALUES (${id},${digest},${filename},${parsed.discipline},${parsed.pages},${content}) ON CONFLICT DO NOTHING RETURNING id`;
      if (!doc) return { duplicate: true };
      const catalog =
        await tx`SELECT ci.id,ci.code,ci.description,ci.unit,ci.unit_price,ct.name FROM cost_items ci JOIN cost_tables ct ON ci.cost_table_id=ct.id JOIN scenarios sc ON sc.project_id=ct.project_id AND sc.id=${id}
        WHERE ct.scenario_id IS NULL OR ct.scenario_id=sc.id`;
      const key = (v: string) => v.trim().normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
      const prices = new Map<string, (typeof catalog)[number][]>();
      for (const candidate of catalog)
        for (const alias of new Set([candidate.code, candidate.description].filter(Boolean))) {
          const name = key(alias) + '/' + key(candidate.unit);
          prices.set(name, [...(prices.get(name) ?? []), candidate]);
        }
      const rows = parsed.services.map((s, index) => {
        const first = s.description.split(/\s/)[0];
        const matches =
          prices.get(key(s.description) + '/' + key(s.unit)) ??
          prices.get(key(first) + '/' + key(s.unit)) ??
          [];
        const price = s.material === null && matches.length === 1 ? matches[0] : null;
        return {
          ...s,
          scenario_id: id,
          document_id: doc.id,
          source_key: digest + '/' + index,
          combined: price?.unit_price ?? null,
          cost_item_id: price?.id ?? null,
          evidence:
            s.evidence + (price ? ' • Preço da tabela ' + price.name + ' • ' + price.code : ''),
          status: 'pending',
          issue: 'Conferir a medição e os preços da página de origem.',
        };
      });
      for (let i = 0; i < rows.length; i += 500)
        await tx`INSERT INTO obra_services ${tx(rows.slice(i, i + 500))}`;
      return { id: doc.id, added: rows.length, discipline: parsed.discipline };
    });
  });
  app.get(path + '/documents/:resource', auth, async (req, reply) => {
    const { resource } = parse(params, req.params);
    const doc = await scoped(
      req,
      async (tx, id) =>
        (
          await tx`SELECT content FROM obra_documents WHERE id=${resource!} AND scenario_id=${id}`
        )[0],
    );
    if (!doc) throw obraError(404, 'Documento não encontrado.');
    return reply
      .type('application/pdf')
      .header('Content-Disposition', 'attachment; filename="prancha.pdf"')
      .send(doc.content);
  });
  app.post(path + '/documents/:resource/review', auth, req=>scoped(req,async(tx,id)=>{
    const {resource}=parse(params,req.params);
    const {assumption}=parse(z.object({assumption:label}),req.body);
    const [doc]=await tx`SELECT id FROM obra_documents WHERE id=${resource!} AND scenario_id=${id}`;
    if(!doc) throw obraError(404,'Documento não encontrado.');
    const result=await tx`UPDATE obra_services s SET
      status='estimated',assumption=${assumption},issue='',reviewed_by=${req.user!.userId},revision=s.revision+1
      FROM obra_budgets b WHERE s.scenario_id=${id} AND b.scenario_id=s.scenario_id AND s.document_id=${doc.id}
        AND s.reviewed_by IS NULL AND s.status='pending' AND s.quantity IS NOT NULL
        AND CASE b.scope WHEN 'material' THEN s.material IS NOT NULL WHEN 'labor' THEN s.labor IS NOT NULL
          ELSE s.combined IS NOT NULL OR (s.material IS NOT NULL AND s.labor IS NOT NULL AND s.equipment IS NOT NULL) END
      RETURNING s.id`;
    return {added:result.length};
  }));
  app.post(path + '/ifc', auth, (req) =>
    scoped(req, (tx, id, project, version) =>
      diagnoseIfc(tx, id, project, version, parse(rule, req.body)),
    ),
  );
  app.post(path + '/stage', auth, (req) =>
    scoped(req, async (tx, id, project) => {
      const data = parse(
        z.object({ stage: label, start: z.iso.date(), end: z.iso.date() }),
        req.body,
      );
      if (data.end < data.start)
        throw obraError(422, 'A conclusão deve ser posterior ou igual ao início.');
      const pending =
        await tx`SELECT id FROM obra_services WHERE scenario_id=${id} AND stage=${data.stage} AND activity_id IS NULL`;
      if (!pending.length) return { added: 0 };
      let [schedule] =
        await tx`SELECT id FROM schedules WHERE scenario_id=${id} AND project_id=${project} ORDER BY created_at DESC,id LIMIT 1`;
      if (!schedule)
        [schedule] = await tx`INSERT INTO schedules(project_id,scenario_id,name,start_date)
      SELECT ${project},scenario_id,name,start_date FROM obra_budgets WHERE scenario_id=${id} RETURNING id`;
      const [activity] =
        await tx`INSERT INTO activities(schedule_id,name,planned_start,planned_end) VALUES
      (${schedule.id},${data.stage},${data.start},${data.end}) RETURNING id`;
      const assigned =
        await tx`UPDATE obra_services SET activity_id=${activity.id},revision=revision+1
      WHERE scenario_id=${id} AND stage=${data.stage} AND activity_id IS NULL RETURNING id`;
      return { added: assigned.length };
    }),
  );
  app.put(path + '/service', auth, (req) =>
    scoped(req, async (tx, id, project, version) => {
      const { id: lineId, revision, ...data } = parse(service, req.body);
      const [previous] =
        await tx`SELECT * FROM obra_services WHERE scenario_id=${id} AND id=${lineId}`;
      if ((previous?.revision ?? 0) !== revision)
        throw obraError(409, 'Serviço alterado em outra sessão. Atualize a tela.');
      if (
        data.activity_id &&
        !(
          await tx`SELECT 1 FROM activities a JOIN schedules s ON s.id=a.schedule_id
      WHERE a.id=${data.activity_id} AND s.scenario_id=${id} AND s.project_id=${project}`
        ).length
      )
        throw obraError(422, 'Atividade de outro cronograma.');
      let storey = previous?.storey ?? null;
      if (data.global_id) {
        const [element] =
          await tx`SELECT COALESCE(st.name,ep.storey_id::text) AS storey FROM element_properties ep LEFT JOIN element_properties st
        ON st.model_version_id=ep.model_version_id AND st.express_id=ep.storey_id AND lower(st.ifc_type)='ifcbuildingstorey'
        WHERE ep.model_version_id=${version} AND ep.global_id=${data.global_id}`;
        if (!element || (previous?.version_id && previous.version_id !== version))
          throw obraError(422, 'Elemento fora da versão atual do cenário.');
        storey = element.storey;
      }
      if (previous?.version_id && previous?.cost_item_id && data.global_id !== previous.global_id)
        throw obraError(422, 'O diagnóstico pertence ao elemento IFC original.');
      if (
        previous?.document_id &&
        (data.document_id !== previous.document_id || data.page !== previous.page)
      )
        throw obraError(422, 'Preserve a prancha e página de origem.');
      if (data.document_id || data.page) {
        const [doc] =
          await tx`SELECT pages FROM obra_documents WHERE id=${data.document_id} AND scenario_id=${id}`;
        if (!doc || !data.page || data.page > doc.pages)
          throw obraError(422, 'Página ou documento inválido.');
      }
      if (data.status !== 'pending') {
        const [config] = await tx`SELECT scope FROM obra_budgets WHERE scenario_id=${id}`;
        if (data.quantity === null || effectiveRate(data, config.scope) === null)
          throw obraError(422, 'Informe quantidade e preço para o escopo.');
        if (!data.evidence) throw obraError(422, 'Informe a fonte da medição.');
        if (data.status === 'estimated' && !data.assumption)
          throw obraError(422, 'Registre a premissa aprovada.');
        if (
          previous?.version_id &&
          previous?.cost_item_id &&
          previous.issue &&
          data.status === 'ready' &&
          !data.assumption
        )
          throw obraError(422, 'Documente a especificação usada para resolver a pendência IFC.');
      }
      const [measured] =
        await tx`SELECT COALESCE(sum(quantity),0) AS qty,count(*)::int AS count FROM obra_measurements WHERE service_id=${lineId}`;
      if (
        measured.count &&
        (data.unit !== previous.unit ||
          data.global_id !== previous.global_id ||
          data.quantity === null ||
          new Decimal(measured.qty).gt(data.quantity))
      )
        throw obraError(
          409,
          'A revisão precisa preservar a unidade, o elemento e a quantidade já medida.',
        );
      const values = {
        ...data,
        storey: data.global_id ? storey : null,
        version_id: data.global_id ? version : null,
        reviewed_by: req.user!.userId,
        issue: data.status === 'pending' ? previous?.issue || 'Aguardando revisão.' : '',
      };
      if (previous)
        await tx`UPDATE obra_services SET ${tx(values)},revision=revision+1 WHERE id=${lineId} AND scenario_id=${id}`;
      else
        await tx`INSERT INTO obra_services ${tx({ ...values, id: lineId, scenario_id: id, source_key: 'manual/' + lineId })}`;
      return { id: lineId };
    }),
  );
  app.post(path + '/services/:resource/correction', auth, (req) =>
    scoped(req, async (tx, id, project) => {
      const { resource } = parse(params, req.params);
      const { message, requestId } = parse(
        z.object({ message: label, requestId: z.uuid() }),
        req.body,
      );
      const [line] =
        await tx`SELECT * FROM obra_services WHERE id=${resource!} AND scenario_id=${id}`;
      if (!line) throw obraError(404, 'Serviço não encontrado.');
      const body = [line.description, line.stage, line.global_id ?? '', message]
        .filter(Boolean)
        .join(' • ');
      const inserted =
        await tx`INSERT INTO element_comments(id,project_id,model_version_id,global_id,body,author_id)
      VALUES(${requestId},${project},${line.version_id},${line.global_id},${body},${req.user!.userId})
      ON CONFLICT DO NOTHING RETURNING id`;
      if (
        !inserted.length &&
        !(
          await tx`SELECT id FROM element_comments WHERE id=${requestId} AND project_id=${project} AND author_id=${req.user!.userId} AND body=${body}`
        ).length
      )
        throw obraError(409, 'Identificador de solicitação já utilizado.');
      return { id: requestId };
    }),
  );
  app.post(path + '/measurements', auth, (req) =>
    scoped(req, async (tx, id, project, version) => {
      const entry = parse(measurement, req.body);
      const [line] =
        await tx`SELECT * FROM obra_services WHERE id=${entry.service_id} AND scenario_id=${id}`;
      if (!line) throw obraError(404, 'Serviço não encontrado.');
      const [same] =
        await tx`SELECT 1 FROM obra_measurements WHERE id=${entry.id} AND service_id=${entry.service_id}
      AND measured_on=${entry.measured_on} AND quantity=${entry.quantity} AND paid=${entry.paid} AND note=${entry.note}`;
      if (same) return { id: entry.id };
      const [budget] = await tx`SELECT scope FROM obra_budgets WHERE scenario_id=${id}`;
      if (
        line.status === 'pending' ||
        !line.quantity ||
        effectiveRate(
          {
            material: line.material,
            equipment: line.equipment,
            labor: line.labor,
            combined: line.combined,
          },
          budget.scope,
        ) === null ||
        (line.version_id && line.version_id !== version)
      )
        throw obraError(409, 'Revise o serviço antes de medir.');
      const [sum] =
        await tx`SELECT COALESCE(sum(quantity),0) AS done FROM obra_measurements WHERE service_id=${line.id}`;
      if (new Decimal(sum.done).plus(entry.quantity).gt(line.quantity))
        throw obraError(422, 'A medição supera a quantidade aprovada.');
      if (!Number(entry.quantity) && !Number(entry.paid))
        throw obraError(422, 'Informe uma quantidade executada ou um pagamento.');
      const added =
        await tx`INSERT INTO obra_measurements ${tx({ ...entry, recorded_by: req.user!.userId })} ON CONFLICT DO NOTHING RETURNING id`;
      if (!added.length) throw obraError(409, 'Identificador de medição já utilizado.');
      return { id: entry.id };
    }),
  );
}
