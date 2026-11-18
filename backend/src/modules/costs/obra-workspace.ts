import type { Sql } from 'postgres';
import { CPMService, type CPMActivity, type CPMPredecessor } from '../scheduling/cpm.service.js';
import { obraReport, type ObraEntry, type ObraLine, type ObraSettings } from './obra-report.js';
import { assertUnambiguousCostIdentity, lockCostProject } from './cost-transaction.js';
import { normalizeCostUnit } from './cost-access.js';

export const obraError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
export async function lockObra(sql: Sql, scenarioId: string, tenantId: string) {
  const [scope] =
    await sql`SELECT s.project_id FROM scenarios s JOIN projects p ON s.project_id=p.id
    WHERE s.id=${scenarioId} AND s.tenant_id=${tenantId} AND p.tenant_id=${tenantId} AND s.deleted_at IS NULL AND p.deleted_at IS NULL`;
  if (!scope) throw obraError(404, 'Cenário não encontrado.');
  await lockCostProject(sql, scope.project_id);
  const [scenario] =
    await sql`SELECT project_id,model_version_id FROM scenarios WHERE id=${scenarioId} FOR SHARE`;
  return scenario;
}

export async function getObra(sql: Sql, id: string, projectId: string, version: string | null) {
  const [settings] = await sql<
    ObraSettings[]
  >`SELECT name,area,start_date::text,months,bdi,scope,revision FROM obra_budgets WHERE scenario_id=${id}`;
  if (!settings) return { settings: null };
  const lines = await sql<
    ObraLine[]
  >`SELECT * FROM obra_services WHERE scenario_id=${id} ORDER BY stage,description,source_key`;
  const entries = await sql<
    ObraEntry[]
  >`SELECT m.id,m.service_id,m.measured_on::text,m.quantity,m.paid,m.note FROM obra_measurements m
    JOIN obra_services s ON s.id=m.service_id WHERE s.scenario_id=${id} ORDER BY m.measured_on,m.id`;
  const documents =
    await sql`SELECT id,filename,discipline,pages FROM obra_documents WHERE scenario_id=${id} ORDER BY filename,id`;
  const items =
    await sql`SELECT ci.id,ci.description,ci.unit,ct.name AS table_name FROM cost_items ci JOIN cost_tables ct ON ct.id=ci.cost_table_id
    WHERE ct.project_id=${projectId} AND (ct.scenario_id IS NULL OR ct.scenario_id=${id}) ORDER BY ci.description`;
  const categories =
    await sql`SELECT DISTINCT ifc_type FROM element_properties WHERE model_version_id=${version} AND ifc_type IS NOT NULL ORDER BY ifc_type`;
  const [schedule] =
    await sql`SELECT id,start_date::text FROM schedules WHERE scenario_id=${id} AND project_id=${projectId} ORDER BY created_at DESC,id LIMIT 1`;
  const acts = schedule
    ? await sql<
        CPMActivity[]
      >`SELECT id,name,planned_start::text AS "plannedStart",planned_end::text AS "plannedEnd",duration_days AS "durationDays" FROM activities WHERE schedule_id=${schedule.id}`
    : [];
  const deps = schedule
    ? await sql<
        CPMPredecessor[]
      >`SELECT p.activity_id AS "activityId",p.predecessor_id AS "predecessorId",p.type,p.lag_days AS "lagDays" FROM activity_predecessors p JOIN activities a ON a.id=p.activity_id WHERE a.schedule_id=${schedule.id}`
    : [];
  const activities = schedule
    ? CPMService.calculate(acts, deps, schedule.start_date).activities.map((a) => ({
        id: a.id,
        name: a.name,
        start: a.earlyStart,
        end: a.earlyFinish,
      }))
    : [];
  return {
    settings,
    activities,
    entries,
    documents,
    items,
    categories: categories.map((x) => x.ifc_type as string),
    version,
    report: obraReport(settings, lines, activities, entries, version),
  };
}

export async function diagnoseIfc(
  sql: Sql,
  id: string,
  projectId: string,
  version: string | null,
  input: {
    itemId: string;
    category: string;
    stage: string;
    requirements: string[];
    storey: number | null;
  },
) {
  if (!version) throw obraError(422, 'Prepare o modelo IFC para este cenário.');
  await assertUnambiguousCostIdentity(sql, id);
  const [item] =
    await sql`SELECT ci.*,ct.name AS table_name FROM cost_items ci JOIN cost_tables ct ON ct.id=ci.cost_table_id
    WHERE ci.id=${input.itemId} AND ct.project_id=${projectId} AND (ct.scenario_id IS NULL OR ct.scenario_id=${id})`;
  if (!item) throw obraError(404, 'Preço do serviço não encontrado neste cenário.');
  const unit = normalizeCostUnit(item.unit);
  if (!['un', 'm', 'm2', 'm3'].includes(unit))
    throw obraError(422, 'Para medir no IFC, selecione um serviço em un, m, m² ou m³.');
  const rows =
    await sql`SELECT ep.*,COALESCE(st.name,ep.storey_id::text) AS storey FROM element_properties ep LEFT JOIN element_properties st
    ON st.model_version_id=ep.model_version_id AND st.express_id=ep.storey_id AND lower(st.ifc_type)='ifcbuildingstorey'
    WHERE ep.model_version_id=${version} AND lower(ep.ifc_type)=lower(${input.category}) AND (${input.storey}::int IS NULL OR ep.storey_id=${input.storey})`;
  if (!rows.length)
    throw obraError(422, 'Nenhum elemento encontrado para esta categoria e pavimento.');
  const services = rows.map((row) => {
    const qty =
      unit === 'un'
        ? '1'
        : unit === 'm2'
          ? row.area_m2
          : unit === 'm3'
            ? row.volume_m3
            : row.length_m;
    const missing = input.requirements.filter((requirement) => {
      const [path, expected] = requirement.split('=');
      const [set, field] = path.split('.');
      const value = row.properties?.[set]?.[field];
      if (value == null || String(value).trim() === '') return true;
      return (
        expected !== undefined &&
        String(value).trim().toLocaleLowerCase() !== expected.trim().toLocaleLowerCase()
      );
    });
    if (qty == null) missing.unshift('Quantidade em ' + item.unit);
    return {
      scenario_id: id,
      source_key: [version, item.id, row.global_id].join('/'),
      version_id: version,
      global_id: row.global_id,
      storey: row.storey,
      cost_item_id: item.id,
      stage: input.stage,
      description: item.description,
      unit: item.unit,
      quantity: qty,
      combined: item.unit_price,
      evidence: [
        row.ifc_type,
        row.name,
        row.global_id,
        item.table_name,
        item.code,
        ...input.requirements,
      ]
        .filter(Boolean)
        .join(' • '),
      issue: missing.join(', '),
      status: missing.length ? 'pending' : 'ready',
    };
  });
  let added = 0;
  for (let i = 0; i < services.length; i += 500) {
    const result =
      await sql`INSERT INTO obra_services ${sql(services.slice(i, i + 500))} ON CONFLICT (scenario_id,source_key) DO NOTHING RETURNING id`;
    added += result.length;
  }
  // Reevaluate unreviewed rows when specification requirements change. User decisions and field records survive a repeated diagnosis.
  for (let i = 0; i < services.length; i += 500) {
    const changes = services
      .slice(i, i + 500)
      .map(({ source_key, issue, status, evidence, quantity, combined }) => ({
        source_key,
        issue,
        status,
        evidence,
        quantity,
        combined,
      }));
    await sql`UPDATE obra_services os SET issue=r.issue,status=r.status,evidence=r.evidence,quantity=r.quantity,combined=r.combined,revision=os.revision+1
      FROM jsonb_to_recordset(${JSON.stringify(changes)}::text::jsonb) AS r(source_key text,issue text,status text,evidence text,quantity numeric,combined numeric)
      WHERE os.scenario_id=${id} AND os.source_key=r.source_key AND os.reviewed_by IS NULL
      AND NOT EXISTS (SELECT 1 FROM obra_measurements om WHERE om.service_id=os.id)
      AND (os.issue,os.status,os.evidence,os.quantity,os.combined) IS DISTINCT FROM (r.issue,r.status,r.evidence,r.quantity,r.combined)`;
  }
  return { found: services.length, added };
}
