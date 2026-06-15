import type { Sql } from 'postgres';
import { CPMService, parseUTCDate, diffDays } from '../scheduling/cpm.service.js';
import { CostCalculatorService } from '../costs/cost-calculator.service.js';
import { Decimal } from 'decimal.js';

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

export interface ActivityChange {
  id: string;
  externalId: string | null;
  name: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface CostItemChange {
  id: string;
  code: string | null;
  description: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface ScenarioDiffResult {
  schedule: {
    completionDateA: string | null;
    completionDateB: string | null;
    deltaDays: number | null;
    activities: {
      added: any[];
      removed: any[];
      changed: ActivityChange[];
    };
  };
  cost: {
    totalCostA: string;
    totalCostB: string;
    deltaCost: string;
    items: {
      added: any[];
      removed: any[];
      changed: CostItemChange[];
    };
  };
}

export class ScenarioDiffService {
  private costCalculator: CostCalculatorService;

  constructor(private sql: Sql) {
    this.costCalculator = new CostCalculatorService(sql);
  }

  async diffScenarios(
    tenantId: string,
    projectId: string,
    scenarioIdA: string,
    scenarioIdB: string
  ): Promise<ScenarioDiffResult> {
    // 1. Verify access to both scenarios
    const scenarios = await this.sql`
      SELECT id FROM scenarios
      WHERE id IN (${scenarioIdA}, ${scenarioIdB})
        AND tenant_id = ${tenantId}
        AND project_id = ${projectId}
    `;
    if (scenarios.length < 2 && scenarioIdA !== scenarioIdB) {
      throw new Error('One or both scenarios not found or access denied');
    }

    // 2. Schedule & CPM comparison
    const scheduleDataA = await this.getScheduleAndCpm(scenarioIdA);
    const scheduleDataB = await this.getScheduleAndCpm(scenarioIdB);

    let deltaDays: number | null = null;
    if (scheduleDataA?.completionDate && scheduleDataB?.completionDate) {
      const dateA = parseUTCDate(scheduleDataA.completionDate);
      const dateB = parseUTCDate(scheduleDataB.completionDate);
      deltaDays = diffDays(dateB, dateA);
    }

    const activityDiff = this.diffActivities(
      scheduleDataA?.activities || [],
      scheduleDataB?.activities || []
    );

    // 3. Cost comparison
    const costA = await this.costCalculator.calculateScenarioCost(scenarioIdA);
    const costB = await this.costCalculator.calculateScenarioCost(scenarioIdB);

    const totalCostDecA = new Decimal(costA.total_cost || '0.00');
    const totalCostDecB = new Decimal(costB.total_cost || '0.00');
    const deltaCost = totalCostDecB.minus(totalCostDecA).toFixed(2);

    const itemsA = await this.getCostItems(scenarioIdA);
    const itemsB = await this.getCostItems(scenarioIdB);

    const costItemDiff = this.diffCostItems(itemsA, itemsB);

    return {
      schedule: {
        completionDateA: scheduleDataA?.completionDate ? formatDate(scheduleDataA.completionDate) : null,
        completionDateB: scheduleDataB?.completionDate ? formatDate(scheduleDataB.completionDate) : null,
        deltaDays,
        activities: activityDiff
      },
      cost: {
        totalCostA: totalCostDecA.toFixed(2),
        totalCostB: totalCostDecB.toFixed(2),
        deltaCost,
        items: costItemDiff
      }
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
      completionDate,
      activities: finalActivities
    };
  }

  private async getCostItems(scenarioId: string) {
    return this.sql`
      SELECT ci.* FROM cost_items ci
      JOIN cost_tables ct ON ci.cost_table_id = ct.id
      WHERE ct.scenario_id = ${scenarioId}
    `;
  }

  private diffActivities(actsA: any[], actsB: any[]) {
    const added: any[] = [];
    const removed: any[] = [];
    const changed: ActivityChange[] = [];

    const mapA = new Map<string, any>();
    for (const act of actsA) {
      const key = act.external_id || act.name;
      mapA.set(key, act);
    }

    for (const actB of actsB) {
      const key = actB.external_id || actB.name;
      const actA = mapA.get(key);

      if (!actA) {
        added.push({
          ...actB,
          planned_start: formatDate(actB.planned_start),
          planned_end: formatDate(actB.planned_end)
        });
      } else {
        mapA.delete(key);
        // Compare fields
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
        if (actA.name !== actB.name) {
          changes.push({ field: 'name', oldValue: actA.name, newValue: actB.name });
        }
        
        const startA = formatDate(actA.planned_start);
        const startB = formatDate(actB.planned_start);
        if (startA !== startB) {
          changes.push({ field: 'planned_start', oldValue: startA, newValue: startB });
        }
        
        const endA = formatDate(actA.planned_end);
        const endB = formatDate(actB.planned_end);
        if (endA !== endB) {
          changes.push({ field: 'planned_end', oldValue: endA, newValue: endB });
        }

        if (Number(actA.percent_complete) !== Number(actB.percent_complete)) {
          changes.push({ field: 'percent_complete', oldValue: Number(actA.percent_complete), newValue: Number(actB.percent_complete) });
        }
        if (actA.wbs_code !== actB.wbs_code) {
          changes.push({ field: 'wbs_code', oldValue: actA.wbs_code, newValue: actB.wbs_code });
        }

        if (changes.length > 0) {
          changed.push({
            id: actB.id,
            externalId: actB.external_id,
            name: actB.name,
            changes
          });
        }
      }
    }

    for (const actA of mapA.values()) {
      removed.push({
        ...actA,
        planned_start: formatDate(actA.planned_start),
        planned_end: formatDate(actA.planned_end)
      });
    }

    return { added, removed, changed };
  }

  private diffCostItems(itemsA: any[], itemsB: any[]) {
    const added: any[] = [];
    const removed: any[] = [];
    const changed: CostItemChange[] = [];

    const mapA = new Map<string, any>();
    for (const item of itemsA) {
      const key = item.code || item.description;
      mapA.set(key, item);
    }

    for (const itemB of itemsB) {
      const key = itemB.code || itemB.description;
      const itemA = mapA.get(key);

      if (!itemA) {
        added.push(itemB);
      } else {
        mapA.delete(key);
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
        if (itemA.description !== itemB.description) {
          changes.push({ field: 'description', oldValue: itemA.description, newValue: itemB.description });
        }
        if (itemA.unit !== itemB.unit) {
          changes.push({ field: 'unit', oldValue: itemA.unit, newValue: itemB.unit });
        }
        if (Number(itemA.unit_price) !== Number(itemB.unit_price)) {
          changes.push({ field: 'unit_price', oldValue: Number(itemA.unit_price), newValue: Number(itemB.unit_price) });
        }

        if (changes.length > 0) {
          changed.push({
            id: itemB.id,
            code: itemB.code,
            description: itemB.description,
            changes
          });
        }
      }
    }

    for (const itemA of mapA.values()) {
      removed.push(itemA);
    }

    return { added, removed, changed };
  }
}
