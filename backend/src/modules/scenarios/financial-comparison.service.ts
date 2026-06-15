import type { Sql } from 'postgres';
import Decimal from 'decimal.js';
import { CPMService, parseUTCDate, diffDays } from '../scheduling/cpm.service.js';
import { CostCalculatorService } from '../costs/cost-calculator.service.js';

function formatDate(date: any): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  return date;
}

export interface SCurvePoint {
  month: string; // YYYY-MM
  cost: string;  // monthly cost
  cumulative: string; // cumulative cost up to this month
}

export interface ScenarioFinancialDetail {
  id: string;
  name: string;
  totalCost: string;
  durationDays: number;
  completionDate: string | null;
  categoryBreakdown: Record<string, string>;
  sCurve: SCurvePoint[];
}

export interface FinancialComparisonResult {
  scenarioA: ScenarioFinancialDetail;
  scenarioB: ScenarioFinancialDetail;
  deltaCost: string;
  deltaDays: number;
  recommendation: {
    winningScenarioId: string;
    explanation: string;
    scores: Array<{
      scenarioId: string;
      costScore: number;
      timeScore: number;
      composite: number;
    }>;
  };
}

export class FinancialComparisonService {
  private costCalculator: CostCalculatorService;

  constructor(private sql: Sql) {
    this.costCalculator = new CostCalculatorService(sql);
  }

  async compareScenarios(
    tenantId: string,
    projectId: string,
    scenarioIdA: string,
    scenarioIdB: string,
    weights = { cost: 0.6, time: 0.4 }
  ): Promise<FinancialComparisonResult> {
    // 1. Access validation
    const scRows = await this.sql`
      SELECT id, name FROM scenarios
      WHERE id IN (${scenarioIdA}, ${scenarioIdB})
        AND tenant_id = ${tenantId}
        AND project_id = ${projectId}
    `;
    if (scRows.length < 2 && scenarioIdA !== scenarioIdB) {
      throw new Error('One or both scenarios not found or access denied');
    }

    const scA = scRows.find(r => r.id === scenarioIdA) || scRows[0];
    const scB = scRows.find(r => r.id === scenarioIdB) || scRows[0];

    // 2. Fetch costs & schedules
    const [detailA, detailB] = await Promise.all([
      this.getScenarioDetails(scenarioIdA, scA.name),
      this.getScenarioDetails(scenarioIdB, scB.name)
    ]);

    const costA = new Decimal(detailA.totalCost);
    const costB = new Decimal(detailB.totalCost);
    const deltaCost = costB.minus(costA).toFixed(2);
    const deltaDays = detailB.durationDays - detailA.durationDays;

    // 3. Score calculation
    const maxCostVal = Math.max(Number(detailA.totalCost), Number(detailB.totalCost), 1);
    const maxDaysVal = Math.max(detailA.durationDays, detailB.durationDays, 1);

    const getScores = (detail: ScenarioFinancialDetail) => {
      const cVal = Number(detail.totalCost);
      const dVal = detail.durationDays;
      
      const costScore = 100 * (1 - cVal / maxCostVal);
      const timeScore = 100 * (1 - dVal / maxDaysVal);
      const composite = weights.cost * costScore + weights.time * timeScore;

      return {
        scenarioId: detail.id,
        costScore: Math.round(costScore * 10) / 10,
        timeScore: Math.round(timeScore * 10) / 10,
        composite: Math.round(composite * 10) / 10
      };
    };

    const scoreA = getScores(detailA);
    const scoreB = getScores(detailB);

    let winningId = scenarioIdA;
    let explanation = '';

    if (scoreA.composite === scoreB.composite) {
      winningId = scenarioIdA;
      explanation = `Ambos os cenários possuem a mesma pontuação composto de ${scoreA.composite.toFixed(1)}. O Cenário A foi selecionado por padrão.`;
    } else if (scoreA.composite > scoreB.composite) {
      winningId = scenarioIdA;
      const pct = costB.gt(0) ? costB.minus(costA).div(costB).times(100).toFixed(1) : '0';
      explanation = `Recomendamos o **${detailA.name}** (Score: ${scoreA.composite.toFixed(1)}/100). `;
      if (costA.lt(costB)) {
        explanation += `Apresenta menor custo (economia de R$ ${costB.minus(costA).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ou ~${pct}%) `;
      } else {
        explanation += `Apresenta maior custo, porém compensado pelo prazo reduzido. `;
      }
      if (detailA.durationDays < detailB.durationDays) {
        explanation += `e prazo mais curto por ${detailB.durationDays - detailA.durationDays} dias.`;
      } else {
        explanation += `com prazo adicional de ${detailA.durationDays - detailB.durationDays} dias.`;
      }
    } else {
      winningId = scenarioIdB;
      const pct = costA.gt(0) ? costA.minus(costB).div(costA).times(100).toFixed(1) : '0';
      explanation = `Recomendamos o **${detailB.name}** (Score: ${scoreB.composite.toFixed(1)}/100). `;
      if (costB.lt(costA)) {
        explanation += `Apresenta menor custo (economia de R$ ${costA.minus(costB).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ou ~${pct}%) `;
      } else {
        explanation += `Apresenta maior custo, porém compensado pelo prazo reduzido. `;
      }
      if (detailB.durationDays < detailA.durationDays) {
        explanation += `e prazo mais curto por ${detailA.durationDays - detailB.durationDays} dias.`;
      } else {
        explanation += `com prazo adicional de ${detailB.durationDays - detailA.durationDays} dias.`;
      }
    }

    return {
      scenarioA: detailA,
      scenarioB: detailB,
      deltaCost,
      deltaDays,
      recommendation: {
        winningScenarioId: winningId,
        explanation,
        scores: [scoreA, scoreB]
      }
    };
  }

  private async getScenarioDetails(scenarioId: string, name: string): Promise<ScenarioFinancialDetail> {
    // 1. Cost Calculations & Breakdown
    const costCalc = await this.costCalculator.calculateScenarioCost(scenarioId);

    // 2. Schedule details & CPM
    const scheduleData = await this.getScheduleAndCpm(scenarioId);

    const completionDate = scheduleData?.completionDate ? formatDate(scheduleData.completionDate) : null;
    const startDate = scheduleData?.startDate ? formatDate(scheduleData.startDate) : null;

    let durationDays = 0;
    if (startDate && completionDate) {
      durationDays = diffDays(parseUTCDate(completionDate), parseUTCDate(startDate)) + 1;
    }

    // 3. Compute S-Curve
    const sCurve = await this.calculateSCurve(scenarioId, scheduleData, costCalc.elements);

    return {
      id: scenarioId,
      name,
      totalCost: costCalc.total_cost || '0.00',
      durationDays,
      completionDate,
      categoryBreakdown: costCalc.breakdown.by_category,
      sCurve
    };
  }

  private async getScheduleAndCpm(scenarioId: string) {
    const [sched] = await this.sql`
      SELECT * FROM schedules
      WHERE scenario_id = ${scenarioId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!sched) return null;

    const activities = await this.sql`
      SELECT * FROM activities
      WHERE schedule_id = ${sched.id}
      ORDER BY planned_start ASC
    `;
    if (activities.length === 0) {
      return {
        id: sched.id,
        startDate: sched.start_date,
        completionDate: sched.start_date,
        activities: []
      };
    }

    const predecessors = await this.sql`
      SELECT ap.* FROM activity_predecessors ap
      JOIN activities a ON ap.activity_id = a.id
      WHERE a.schedule_id = ${sched.id}
    `;

    const cpmPredecessors = predecessors.map(p => ({
      activityId: p.activity_id,
      predecessorId: p.predecessor_id,
      lagDays: p.lag_days || 0,
      type: (p.type || 'FS') as 'FS' | 'SS' | 'FF' | 'SF'
    }));

    const cpmInputActivities = activities.map(act => ({
      id: act.id,
      name: act.name,
      plannedStart: act.planned_start,
      plannedEnd: act.planned_end,
      durationDays: act.duration_days
    }));

    const { activities: cpmActivities, completionDate } = CPMService.calculate(
      cpmInputActivities,
      cpmPredecessors,
      sched.start_date
    );

    const finalActivities = activities.map(act => {
      const cpmAct = cpmActivities.find(c => c.id === act.id);
      return {
        ...act,
        earlyStart: cpmAct ? cpmAct.earlyStart : act.planned_start,
        earlyFinish: cpmAct ? cpmAct.earlyFinish : act.planned_end
      };
    });

    return {
      id: sched.id,
      startDate: sched.start_date,
      completionDate,
      activities: finalActivities
    };
  }

  private async calculateSCurve(
    scenarioId: string,
    scheduleData: any,
    elements: any[]
  ): Promise<SCurvePoint[]> {
    if (!scheduleData || scheduleData.activities.length === 0 || elements.length === 0) {
      return [];
    }

    // 1. Load activity_elements links
    const actElements = await this.sql`
      SELECT ae.activity_id, ae.global_id
      FROM activity_elements ae
      JOIN activities a ON ae.activity_id = a.id
      WHERE a.schedule_id = ${scheduleData.id}
    `;

    // Map global_id to activity_ids
    const elementToActivities = new Map<string, string[]>();
    for (const ae of actElements) {
      if (!elementToActivities.has(ae.global_id)) {
        elementToActivities.set(ae.global_id, []);
      }
      elementToActivities.get(ae.global_id)!.push(ae.activity_id);
    }

    // 2. Map activities by ID for easy lookup of duration and dates
    const activityMap = new Map<string, any>();
    for (const act of scheduleData.activities) {
      activityMap.set(act.id, act);
    }

    // 3. Distribute elements' costs to activities
    const activityCosts = new Map<string, Decimal>();
    let unlinkedCostTotal = new Decimal(0);

    for (const elem of elements) {
      const elemCost = new Decimal(elem.total_cost || 0);
      const linkedActs = elementToActivities.get(elem.global_id) || [];

      if (linkedActs.length === 0) {
        unlinkedCostTotal = unlinkedCostTotal.plus(elemCost);
      } else {
        const costPerAct = elemCost.div(linkedActs.length);
        for (const actId of linkedActs) {
          if (!activityCosts.has(actId)) {
            activityCosts.set(actId, new Decimal(0));
          }
          activityCosts.set(actId, activityCosts.get(actId)!.plus(costPerAct));
        }
      }
    }

    // 4. Distribute activity costs day-by-day
    const dailyCosts = new Map<string, Decimal>(); // Key: YYYY-MM-DD
    const addToDay = (dateStr: string, cost: Decimal) => {
      if (!dailyCosts.has(dateStr)) {
        dailyCosts.set(dateStr, new Decimal(0));
      }
      dailyCosts.set(dateStr, dailyCosts.get(dateStr)!.plus(cost));
    };

    for (const [actId, totalCost] of activityCosts.entries()) {
      const act = activityMap.get(actId);
      if (!act) {
        unlinkedCostTotal = unlinkedCostTotal.plus(totalCost);
        continue;
      }

      const start = parseUTCDate(act.earlyStart);
      const end = parseUTCDate(act.earlyFinish);
      const duration = diffDays(end, start) + 1;

      const dailyCost = totalCost.div(duration);
      let curr = new Date(start);
      for (let i = 0; i < duration; i++) {
        const dayStr = formatDate(curr)!;
        addToDay(dayStr, dailyCost);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    // 5. Distribute unlinked costs over the entire project schedule duration
    if (unlinkedCostTotal.gt(0)) {
      const projStart = parseUTCDate(scheduleData.startDate);
      const projEnd = parseUTCDate(scheduleData.completionDate);
      const projDuration = diffDays(projEnd, projStart) + 1;

      const dailyUnlinked = unlinkedCostTotal.div(projDuration);
      let curr = new Date(projStart);
      for (let i = 0; i < projDuration; i++) {
        const dayStr = formatDate(curr)!;
        addToDay(dayStr, dailyUnlinked);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    // 6. Aggregate day-by-day costs by month (YYYY-MM)
    const monthlyCosts = new Map<string, Decimal>();
    for (const [dayStr, cost] of dailyCosts.entries()) {
      const monthStr = dayStr.slice(0, 7); // "YYYY-MM"
      if (!monthlyCosts.has(monthStr)) {
        monthlyCosts.set(monthStr, new Decimal(0));
      }
      monthlyCosts.set(monthStr, monthlyCosts.get(monthStr)!.plus(cost));
    }

    // 7. Sort months and build cumulative S-curve points
    const sortedMonths = Array.from(monthlyCosts.keys()).sort();
    const sCurvePoints: SCurvePoint[] = [];
    let cumulative = new Decimal(0);

    for (const month of sortedMonths) {
      const cost = monthlyCosts.get(month)!;
      cumulative = cumulative.plus(cost);
      sCurvePoints.push({
        month,
        cost: cost.toFixed(2),
        cumulative: cumulative.toFixed(2)
      });
    }

    return sCurvePoints;
  }
}
