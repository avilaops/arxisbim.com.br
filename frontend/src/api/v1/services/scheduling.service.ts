import { getAPIClient } from '../client';
import type { ConstructionTask } from '../../../viewer/scheduling/SimulationEngine';

/** Atividade como retornada por GET /api/v1/schedules/:id. */
export interface ScheduleActivityDTO {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  percentComplete?: number | string | null;
  wbsCode?: string | null;
  elements?: Array<{ globalId: string; stateDuring?: string }>;
}

export interface ScheduleDTO {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  isLegacy?: boolean;
  activities: ScheduleActivityDTO[];
}

export interface AutoMatchOptions {
  threshold?: number;
  maxElementsPerActivity?: number;
  persist?: boolean;
}

export interface AutoMatchResult {
  mappings: Array<{
    activityId: string;
    matchedElements: Array<{ globalId: string; confidence: number }>;
    topConfidence: number;
  }>;
  orphanElementIds: string[];
  unmatchedActivityIds: string[];
  stats: { totalActivities: number; totalElements: number; matchedActivities: number; matchRate: number };
  persisted: number;
}

/**
 * Converte atividades da API para ConstructionTask do SimulationEngine. Puro.
 * percentComplete pode vir como string decimal (DECIMAL no banco).
 */
export function activitiesToConstructionTasks(activities: ScheduleActivityDTO[]): ConstructionTask[] {
  return activities.map((a) => ({
    id: a.id,
    name: a.name,
    plannedStart: a.plannedStart,
    plannedEnd: a.plannedEnd,
    actualStart: a.actualStart ?? null,
    actualEnd: a.actualEnd ?? null,
    percentComplete: a.percentComplete != null ? Number(a.percentComplete) : 0,
    elementIds: (a.elements ?? []).map((e) => e.globalId),
  }));
}

export class SchedulingService {
  private readonly base = '/api/v1';

  async getSchedule(scheduleId: string): Promise<ScheduleDTO> {
    const client = getAPIClient();
    const res = await client.get<ScheduleDTO>(`${this.base}/schedules/${scheduleId}`);
    return res.data;
  }

  /** Carrega um cronograma já mapeado em ConstructionTask[] (pronto p/ simulação). */
  async getConstructionTasks(scheduleId: string): Promise<ConstructionTask[]> {
    const schedule = await this.getSchedule(scheduleId);
    return activitiesToConstructionTasks(schedule.activities ?? []);
  }

  /** Dispara o auto-mapeamento elemento↔tarefa (S35). */
  async autoMatch(scheduleId: string, options: AutoMatchOptions = {}): Promise<AutoMatchResult> {
    const client = getAPIClient();
    const res = await client.post<AutoMatchResult>(`${this.base}/schedules/${scheduleId}/auto-match`, options);
    return res.data;
  }
}

let instance: SchedulingService | null = null;
export function getSchedulingService(): SchedulingService {
  if (!instance) instance = new SchedulingService();
  return instance;
}
