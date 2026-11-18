import { bimRequest } from './bim-api';
export interface PlanningImportInput {
  scenarioId: string;
  name: string;
  filename: string;
  content: string;
}
export interface PlanningImportPreview {
  revision: string;
  scheduleId: string | null;
  source: string;
  inserted: number;
  updated: number;
  kept: number;
  total: number;
  activities: Array<{
    externalId: string;
    name: string;
    plannedStart: string;
    plannedEnd: string;
    predecessors: Array<{ predecessorExternalId: string; type: string; lagDays: number }>;
    action: string;
  }>;
}
export const planningImportApi = {
  preview: (projectId: string, input: PlanningImportInput) =>
    bimRequest<PlanningImportPreview>(`/projects/${projectId}/planning-import/preview`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  apply: (projectId: string, input: PlanningImportInput & { revision: string }) =>
    bimRequest<{ scheduleId: string; inserted: number; updated: number; kept: number }>(
      `/projects/${projectId}/planning-import/apply`,
      { method: 'POST', body: JSON.stringify(input) }
    ),
};
