export interface CPMActivity {
  id: string;
  name: string;
  plannedStart: string | Date;
  plannedEnd: string | Date;
  durationDays?: number | null;
  [key: string]: any;
}

export interface CPMPredecessor {
  activityId: string;
  predecessorId: string;
  lagDays: number;
  type: 'FS' | 'SS' | 'FF' | 'SF';
}

export interface CPMResultActivity extends CPMActivity {
  earlyStart: string;
  earlyFinish: string;
}

export function parseUTCDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatUTCDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function diffDays(d1: Date, d2: Date): number {
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export class CPMService {
  /**
   * Propagates dates using standard forward-pass CPM
   */
  public static calculate(
    activities: CPMActivity[],
    predecessors: CPMPredecessor[],
    scheduleStartDateStr: string | Date
  ): { activities: CPMResultActivity[]; completionDate: string } {
    if (activities.length === 0) {
      const defaultDateStr = typeof scheduleStartDateStr === 'string'
        ? scheduleStartDateStr
        : formatUTCDate(scheduleStartDateStr);
      return { activities: [], completionDate: defaultDateStr };
    }

    const scheduleStartDate = parseUTCDate(scheduleStartDateStr);

    // 1. Map activities and compute durations
    const activityMap = new Map<string, {
      activity: CPMActivity;
      parsedStart: Date;
      parsedEnd: Date;
      duration: number;
      earlyStart?: Date;
      earlyFinish?: Date;
    }>();

    for (const act of activities) {
      const start = parseUTCDate(act.plannedStart);
      const end = parseUTCDate(act.plannedEnd);
      let duration = act.durationDays;
      if (duration === undefined || duration === null) {
        duration = diffDays(end, start);
      }
      if (duration < 0) duration = 0;

      activityMap.set(act.id, {
        activity: act,
        parsedStart: start,
        parsedEnd: end,
        duration
      });
    }

    // 2. Build adjacency list and calculate in-degree for topological sort
    const adj = new Map<string, CPMPredecessor[]>();
    const inDegree = new Map<string, number>();

    for (const id of activityMap.keys()) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }

    for (const pred of predecessors) {
      // Ignore relationships referencing non-existent activities
      if (!activityMap.has(pred.activityId) || !activityMap.has(pred.predecessorId)) {
        continue;
      }
      
      const list = adj.get(pred.predecessorId) || [];
      list.push(pred);
      adj.set(pred.predecessorId, list);

      inDegree.set(pred.activityId, (inDegree.get(pred.activityId) || 0) + 1);
    }

    // 3. Topological sort (Kahn's Algorithm)
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const sortedIds: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedIds.push(u);

      const edges = adj.get(u) || [];
      for (const edge of edges) {
        const v = edge.activityId;
        const currentDeg = inDegree.get(v) || 0;
        if (currentDeg > 0) {
          inDegree.set(v, currentDeg - 1);
          if (currentDeg - 1 === 0) {
            queue.push(v);
          }
        }
      }
    }

    // If a cycle is detected, fall back to sorting by original plannedStart to prevent hang
    if (sortedIds.length < activities.length) {
      console.warn('CPMService: Cycle detected in schedule. Fallback to plannedStart order.');
      const allIds = Array.from(activityMap.keys());
      const remainingIds = allIds.filter(id => !sortedIds.includes(id));
      remainingIds.sort((a, b) => {
        const startA = activityMap.get(a)!.parsedStart.getTime();
        const startB = activityMap.get(b)!.parsedStart.getTime();
        return startA - startB;
      });
      sortedIds.push(...remainingIds);
    }

    // 4. Group predecessors by activityId for quick constraint lookups
    const predecessorMap = new Map<string, CPMPredecessor[]>();
    for (const pred of predecessors) {
      if (!predecessorMap.has(pred.activityId)) {
        predecessorMap.set(pred.activityId, []);
      }
      predecessorMap.get(pred.activityId)!.push(pred);
    }

    // 5. Forward Pass
    for (const id of sortedIds) {
      const data = activityMap.get(id)!;
      let earlyStart = new Date(Math.max(data.parsedStart.getTime(), scheduleStartDate.getTime()));
      
      const preds = predecessorMap.get(id) || [];
      for (const pred of preds) {
        const parent = activityMap.get(pred.predecessorId);
        if (!parent || parent.earlyStart === undefined || parent.earlyFinish === undefined) {
          continue;
        }

        const lag = pred.lagDays || 0;
        let candidateStart: Date;

        switch (pred.type) {
          case 'SS':
            // Successor start is constrained by Predecessor start
            candidateStart = addDays(parent.earlyStart, lag);
            break;
          case 'FF':
            // Successor finish is constrained by Predecessor finish
            // EF_succ >= EF_pred + lag => ES_succ >= EF_pred + lag - Dur_succ
            candidateStart = addDays(parent.earlyFinish, lag - data.duration);
            break;
          case 'SF':
            // Successor finish is constrained by Predecessor start
            // EF_succ >= ES_pred + lag => ES_succ >= ES_pred + lag - Dur_succ
            candidateStart = addDays(parent.earlyStart, lag - data.duration);
            break;
          case 'FS':
          default:
            // Successor start is constrained by Predecessor finish
            candidateStart = addDays(parent.earlyFinish, lag);
            break;
        }

        if (candidateStart.getTime() > earlyStart.getTime()) {
          earlyStart = candidateStart;
        }
      }

      // Ensure start doesn't precede schedule start date
      if (earlyStart.getTime() < scheduleStartDate.getTime()) {
        earlyStart = new Date(scheduleStartDate.getTime());
      }

      data.earlyStart = earlyStart;
      data.earlyFinish = addDays(earlyStart, data.duration);
    }

    // 6. Map results and find completion date
    const resultActivities: CPMResultActivity[] = [];
    let maxFinishTime = scheduleStartDate.getTime();

    // Identify which activities have successors to calculate completion date correctly
    const activitiesWithSuccessors = new Set<string>();
    for (const pred of predecessors) {
      activitiesWithSuccessors.add(pred.predecessorId);
    }

    for (const act of activities) {
      const data = activityMap.get(act.id)!;
      const esStr = formatUTCDate(data.earlyStart || data.parsedStart);
      const efStr = formatUTCDate(data.earlyFinish || data.parsedEnd);

      resultActivities.push({
        ...act,
        earlyStart: esStr,
        earlyFinish: efStr
      });

      // Completion date is the maximum end date of activities with NO successors
      if (!activitiesWithSuccessors.has(act.id)) {
        const finishTime = (data.earlyFinish || data.parsedEnd).getTime();
        if (finishTime > maxFinishTime) {
          maxFinishTime = finishTime;
        }
      }
    }

    // Fallback in case every activity has a successor (e.g. cycle or chain): take absolute max earlyFinish
    if (maxFinishTime === scheduleStartDate.getTime() && resultActivities.length > 0) {
      for (const act of resultActivities) {
        const finishTime = parseUTCDate(act.earlyFinish).getTime();
        if (finishTime > maxFinishTime) {
          maxFinishTime = finishTime;
        }
      }
    }

    return {
      activities: resultActivities,
      completionDate: formatUTCDate(new Date(maxFinishTime))
    };
  }
}
