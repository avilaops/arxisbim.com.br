import { bimRequest } from './bim-api'
export interface PlanningColumn {
  id: string
  name: string
}
export interface PlanningBoard {
  revision: number
  columns: PlanningColumn[]
  assignments: Record<string, string>
}
export interface BoardChange {
  revision: number
  columns?: PlanningColumn[]
  move?: { activityId: string; columnId: string }
}
export const planningBoardApi = {
  get: (id: string) =>
    bimRequest<PlanningBoard>(`/schedules/${id}/planning-board`),
  save: (id: string, data: BoardChange) =>
    bimRequest<PlanningBoard>(`/schedules/${id}/planning-board`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
