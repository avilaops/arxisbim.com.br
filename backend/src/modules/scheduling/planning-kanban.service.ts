import type { Sql } from 'postgres';
export interface PlanningColumn {
  id: string;
  name: string;
}
export interface PlanningBoard {
  revision: number;
  columns: PlanningColumn[];
  assignments: Record<string, string>;
}
export interface BoardChange {
  revision: number;
  columns?: PlanningColumn[];
  move?: { activityId: string; columnId: string };
}
const fail = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
const object = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
export function defaultBoard(): PlanningBoard {
  return {
    revision: 0,
    columns: [
      { id: 'unassigned', name: 'Sem etapa' },
      { id: 'preparation', name: 'Preparação' },
      { id: 'foundations', name: 'Fundações' },
      { id: 'structure', name: 'Estrutura' },
      { id: 'finishes', name: 'Acabamentos' },
    ],
    assignments: {},
  };
}
function validateColumns(columns: PlanningColumn[]): PlanningColumn[] {
  if (
    columns.length < 1 ||
    columns.length > 12 ||
    columns[0]?.id !== 'unassigned'
  )
    throw fail(400, 'Mantenha Sem etapa na primeira posição e até12 etapas.');
  const ids = new Set<string>(),
    names = new Set<string>();
  return columns.map((column) => {
    const name = column.name.normalize('NFC').trim(),
      key = name.toLocaleLowerCase('pt-BR');
    if (
      !/^[a-zA-Z0-9_-]{1,64}$/.test(column.id) ||
      !name ||
      name.length > 60 ||
      ids.has(column.id) ||
      names.has(key)
    )
      throw fail(
        400,
        'Use identificadores e nomes de etapas distintos, com até60 caracteres.',
      );
    if (column.id === 'unassigned' && name !== 'Sem etapa')
      throw fail(400, 'A etapa Sem etapa é fixa.');
    ids.add(column.id);
    names.add(key);
    return { id: column.id, name };
  });
}
function clean(board: PlanningBoard, activityIds: string[]): PlanningBoard {
  const allowed = new Set(activityIds),
    columns = new Set(board.columns.map((c) => c.id));
  return {
    ...board,
    assignments: Object.fromEntries(
      Object.entries(board.assignments).filter(
        ([id, column]) =>
          allowed.has(id) && columns.has(column) && column !== 'unassigned',
      ),
    ),
  };
}
export function readBoard(
  metadata: unknown,
  scheduleId: string,
  activityIds: string[],
): PlanningBoard {
  const saved = object(object(metadata).planningKanban)[scheduleId];
  if (!saved) return defaultBoard();
  const board = object(saved);
  if (
    !Number.isSafeInteger(board.revision) ||
    board.revision < 0 ||
    !Array.isArray(board.columns)
  )
    throw fail(409, 'Quadro inválido. Recarregue o planejamento.');
  return clean(
    {
      revision: board.revision,
      columns: validateColumns(board.columns),
      assignments: object(board.assignments),
    },
    activityIds,
  );
}
export function changeBoard(
  board: PlanningBoard,
  change: BoardChange,
  activityIds: string[],
): PlanningBoard {
  if (change.revision !== board.revision)
    throw fail(
      409,
      'O quadro mudou em outra sessão. Recarregue antes de alterar.',
    );
  const next = clean(
    {
      ...board,
      columns: change.columns ? validateColumns(change.columns) : board.columns,
      assignments: { ...board.assignments },
    },
    activityIds,
  );
  if (change.move) {
    const { activityId, columnId } = change.move;
    if (!activityIds.includes(activityId))
      throw fail(404, 'Atividade não encontrada neste cronograma.');
    if (!next.columns.some((c) => c.id === columnId))
      throw fail(400, 'Etapa não encontrada neste quadro.');
    if (columnId === 'unassigned') delete next.assignments[activityId];
    else next.assignments[activityId] = columnId;
  }
  return { ...next, revision: board.revision + 1 };
}
export class PlanningKanbanService {
  constructor(private sql: Sql) {}
  private async context(
    sql: Sql,
    tenantId: string,
    scheduleId: string,
    lock = false,
  ) {
    const rows = lock
      ? await sql`
    SELECT sc.id,sc.metadata FROM schedules sch JOIN projects p ON p.id=sch.project_id
    JOIN scenarios sc ON sc.id=sch.scenario_id AND sc.project_id=sch.project_id
    WHERE sch.id=${scheduleId} AND p.tenant_id=${tenantId} AND sc.tenant_id=${tenantId}
      AND p.deleted_at IS NULL AND sc.deleted_at IS NULL FOR UPDATE OF sc
  `
      : await sql`
    SELECT sc.id,sc.metadata FROM schedules sch JOIN projects p ON p.id=sch.project_id
    JOIN scenarios sc ON sc.id=sch.scenario_id AND sc.project_id=sch.project_id
    WHERE sch.id=${scheduleId} AND p.tenant_id=${tenantId} AND sc.tenant_id=${tenantId}
      AND p.deleted_at IS NULL AND sc.deleted_at IS NULL
  `;
    if (!rows[0]) throw fail(404, 'Cronograma do cenário não encontrado.');
    const activities =
      await sql`SELECT id FROM activities WHERE schedule_id=${scheduleId}`;
    return { scenario: rows[0], ids: activities.map((a) => String(a.id)) };
  }
  async get(tenantId: string, scheduleId: string): Promise<PlanningBoard> {
    const { scenario, ids } = await this.context(
      this.sql,
      tenantId,
      scheduleId,
    );
    return readBoard(scenario.metadata, scheduleId, ids);
  }
  async save(
    tenantId: string,
    scheduleId: string,
    change: BoardChange,
  ): Promise<PlanningBoard> {
    return this.sql.begin(async (transaction) => {
      const tx = transaction as unknown as Sql;
      const { scenario, ids } = await this.context(
        tx,
        tenantId,
        scheduleId,
        true,
      );
      const board = changeBoard(
        readBoard(scenario.metadata, scheduleId, ids),
        change,
        ids,
      );
      // The scenario row lock makes this merge safe with other JSONB editors.
      const metadata = object(scenario.metadata);
      const next = {
        ...metadata,
        planningKanban: {
          ...object(metadata.planningKanban),
          [scheduleId]: board,
        },
      };
      await tx`UPDATE scenarios SET metadata=${JSON.stringify(next)}::text::jsonb,updated_at=NOW() WHERE id=${scenario.id} AND tenant_id=${tenantId}`;
      return board;
    }) as Promise<PlanningBoard>;
  }
}
