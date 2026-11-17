import type { Sql } from 'postgres';
import { createHash } from 'node:crypto';
import { Decimal as BaseDecimal } from 'decimal.js';
import { CostCalculatorService } from '../costs/cost-calculator.service.js';
import { lockCostProject } from '../costs/cost-transaction.js';
import {
  CPMService,
  diffDays,
  parseUTCDate,
} from '../scheduling/cpm.service.js';

const Decimal = BaseDecimal.clone({
  precision: 40,
  rounding: BaseDecimal.ROUND_HALF_UP,
});
export interface MatrixDetail {
  id: string;
  name: string;
  totalCost: string | null;
  durationDays: number | null;
  completionDate: string | null;
  modelElements: number;
  pricedElements: number;
  costLinks: number;
  issues: string[];
}
export interface MatrixRow extends MatrixDetail {
  deltaCost: string | null;
  deltaDays: number | null;
  score: number | null;
  rank: number | null;
}
export interface FinancialMatrix {
  projectName: string;
  baselineId: string;
  generatedAt: string;
  revision: string;
  weights: { cost: number; time: number };
  scenarios: MatrixRow[];
  warnings: string[];
  recommendation: { winningScenarioIds: string[]; explanation: string };
}
export const matrixError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });

/** Score only comparable records; unknown data is never substituted with zero. */
export function buildFinancialMatrix(
  details: MatrixDetail[],
  baselineId: string,
): FinancialMatrix {
  const baseline = details.find((s) => s.id === baselineId);
  if (!baseline)
    throw matrixError(
      400,
      'A referência precisa estar entre os cenários selecionados.',
    );
  const eligible = details.filter(
    (s) => s.totalCost !== null && s.durationDays !== null && !s.issues.length,
  );
  const maxCost = Decimal.max(
    0,
    ...eligible.map((s) => new Decimal(s.totalCost!)),
  );
  const maxDays = Math.max(1, ...eligible.map((s) => s.durationDays!));
  const scores = new Map<string, number>();
  if (eligible.length >= 2)
    for (const s of eligible) {
      const cost = maxCost.isZero()
        ? new Decimal(100)
        : new Decimal(1)
            .minus(new Decimal(s.totalCost!).div(maxCost))
            .times(100);
      const time = new Decimal(1)
        .minus(new Decimal(s.durationDays!).div(maxDays))
        .times(100);
      scores.set(
        s.id,
        cost.times('0.6').plus(time.times('0.4')).toDecimalPlaces(2).toNumber(),
      );
    }
  const orderedScores = [...scores.values()].sort((a, b) => b - a);
  const rows = details.map((s) => ({
    ...s,
    deltaCost:
      s.totalCost === null || baseline.totalCost === null
        ? null
        : new Decimal(s.totalCost).minus(baseline.totalCost).toFixed(2),
    deltaDays:
      s.durationDays === null || baseline.durationDays === null
        ? null
        : s.durationDays - baseline.durationDays,
    score: scores.get(s.id) ?? null,
    rank: scores.has(s.id)
      ? orderedScores.indexOf(scores.get(s.id)!) + 1
      : null,
  }));
  const winning = rows.filter((s) => s.rank === 1);
  const warnings = [
    'A cobertura conta elementos com preço; não comprova que todos os serviços e materiais da obra foram orçados.',
  ];
  if (details.some((s) => s.issues.length))
    warnings.push('Cenários com pendências ficam fora do ranking.');
  if (details.some((s) => s.pricedElements < s.modelElements))
    warnings.push('Há orçamento com cobertura física parcial.');
  if (
    eligible.some(
      (s) =>
        s.pricedElements * eligible[0].modelElements !==
        eligible[0].pricedElements * s.modelElements,
    )
  )
    warnings.push(
      'Os cenários possuem cobertura física diferente; compare o escopo antes de decidir.',
    );
  return {
    projectName: '',
    baselineId,
    generatedAt: new Date().toISOString(),
    revision: createHash('sha256')
      .update(JSON.stringify({ baselineId, details }))
      .digest('hex'),
    weights: { cost: 0.6, time: 0.4 },
    scenarios: rows,
    warnings,
    recommendation: {
      winningScenarioIds: winning.map((s) => s.id),
      explanation:
        winning.length === 0
          ? 'São necessários pelo menos dois cenários com orçamento e cronograma válidos para recomendar uma alternativa.'
          : winning.length > 1
            ? 'Há empate na melhor pontuação. Revise cobertura e escopo para decidir.'
            : `Melhor pontuação dos itens orçados: ${winning[0].name}. O critério utiliza 60% custo e 40% prazo.`,
    },
  };
}

export class FinancialMatrixService {
  constructor(private sql: Sql) {}

  async compare(
    tenantId: string,
    projectId: string,
    scenarioIds: string[],
    baselineId: string,
  ): Promise<FinancialMatrix> {
    projectId=projectId.toLowerCase();
    scenarioIds=scenarioIds.map(id=>id.toLowerCase());
    baselineId=baselineId.toLowerCase();
    if (
      scenarioIds.length < 2 ||
      scenarioIds.length > 20 ||
      new Set(scenarioIds).size !== scenarioIds.length ||
      !scenarioIds.includes(baselineId)
    )
      throw matrixError(
        400,
        'Selecione de 2 a 20 cenários distintos e inclua a referência.',
      );
    const [project] = await this
      .sql`SELECT name FROM projects WHERE id=${projectId} AND tenant_id=${tenantId} AND deleted_at IS NULL`;
    if (!project)
      throw matrixError(404, 'Projeto ou cenários não encontrados.');
    // A snapshot includes schedules as well as costs. Retry a concurrent-write conflict once.
    for (let attempt = 0; ; attempt++) {
      try {
        return (await this.sql.begin(
          'isolation level repeatable read',
          async (transaction) => {
            const tx = transaction as unknown as Sql;
            await lockCostProject(tx, projectId);
            const rows = await tx`
            SELECT s.id, s.name, s.model_version_id, p.name AS project_name FROM scenarios s
            JOIN projects p ON p.id=s.project_id
            WHERE s.id=ANY(${scenarioIds}::uuid[]) AND s.project_id=${projectId}
              AND s.tenant_id=${tenantId} AND p.tenant_id=${tenantId}
              AND s.deleted_at IS NULL AND p.deleted_at IS NULL
            ORDER BY s.id FOR SHARE OF s,p
          `;
            if (rows.length !== scenarioIds.length)
              throw matrixError(404, 'Projeto ou cenários não encontrados.');
            const calculator = new CostCalculatorService(tx, true);
            const details: MatrixDetail[] = [];
            for (const id of scenarioIds) {
              const scenario = rows.find((s) => s.id === id)!;
              const detail: MatrixDetail = {
                id,
                name: scenario.name,
                totalCost: null,
                durationDays: null,
                completionDate: null,
                modelElements: 0,
                pricedElements: 0,
                costLinks: 0,
                issues: [],
              };
              const [model] = await tx`
              SELECT COUNT(ep.id)::integer AS total FROM model_versions mv
              JOIN models m ON m.id=mv.model_id LEFT JOIN element_properties ep ON ep.model_version_id=mv.id
              WHERE mv.id=${scenario.model_version_id} AND m.project_id=${projectId}
                AND m.deleted_at IS NULL AND mv.status='ready' GROUP BY mv.id
            `;
              detail.modelElements = Number(model?.total ?? 0);
              if (!detail.modelElements)
                detail.issues.push('Prepare os quantitativos IFC.');
              else {
                try {
                  const calculation =
                    await calculator.calculateScenarioCost(id);
                  detail.costLinks = calculation.element_count;
                  detail.pricedElements = new Set(
                    calculation.elements.map((e) => e.global_id),
                  ).size;
                  if (detail.costLinks)
                    detail.totalCost = calculation.total_cost;
                  else detail.issues.push('Vincule preços aos elementos.');
                } catch (error) {
                  if ((error as { statusCode?: number }).statusCode !== 409)
                    throw error;
                  detail.issues.push(
                    'O IFC possui identificações de elementos ambíguas.',
                  );
                }
              }
              const [schedule] =
                await tx`SELECT id,start_date FROM schedules WHERE scenario_id=${id} AND project_id=${projectId} ORDER BY created_at DESC,id DESC LIMIT 1`;
              const activities = schedule
                ? await tx`SELECT id,name,planned_start,planned_end,duration_days FROM activities WHERE schedule_id=${schedule.id} ORDER BY id`
                : [];
              if (!schedule || !activities.length)
                detail.issues.push('Cadastre um cronograma com atividades.');
              else {
                const predecessors =
                  await tx`SELECT ap.* FROM activity_predecessors ap JOIN activities a ON a.id=ap.activity_id WHERE a.schedule_id=${schedule.id}`;
                try {
                  const result = CPMService.calculate(
                    activities.map((a) => ({
                      id: a.id,
                      name: a.name,
                      plannedStart: a.planned_start,
                      plannedEnd: a.planned_end,
                      durationDays: a.duration_days,
                    })),
                    predecessors.map((p) => ({
                      activityId: p.activity_id,
                      predecessorId: p.predecessor_id,
                      lagDays: p.lag_days ?? 0,
                      type: p.type ?? 'FS',
                    })),
                    schedule.start_date,
                  );
                  detail.completionDate = result.completionDate;
                  detail.durationDays =
                    diffDays(
                      parseUTCDate(result.completionDate),
                      parseUTCDate(schedule.start_date),
                    ) + 1;
                } catch {
                  detail.issues.push(
                    'Revise as datas e dependências do cronograma.',
                  );
                }
              }
              details.push(detail);
            }
            return {
              ...buildFinancialMatrix(details, baselineId),
              projectName: rows[0].project_name,
            };
          },
        )) as FinancialMatrix;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (attempt === 0 && (code === '40001' || code === '40P01')) continue;
        if (code === '40001' || code === '40P01')
          throw matrixError(
            409,
            'Os dados mudaram durante a comparação. Compare novamente.',
          );
        throw error;
      }
    }
  }
}
