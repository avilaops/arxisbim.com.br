import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parseP6Xer, type ParsedActivity } from './schedule-import.service.js';

export const importFailure = (statusCode: number, message: string, errors: string[] = []) =>
  Object.assign(new Error(message), { statusCode, errors });

export function validPlanningDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '1900-01-01' &&
    value <= '2200-12-31' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

// RFC-style quoted fields, including escaped quotes and line breaks. Never skip a malformed row.
function csvRecords(content: string): string[][] {
  const separator = content.split(/\r?\n/, 1)[0].includes(';') ? ';' : ',';
  const records: string[][] = [];
  let record: string[] = [],
    value = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quoted) {
      if (c === '"' && content[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else value += c;
    } else if (c === '"' && !value && !closed) quoted = true;
    else if (c === separator || c === '\n') {
      record.push(value.trim());
      value = '';
      closed = false;
      if (c === '\n') {
        if (record.some(Boolean)) records.push(record);
        record = [];
      }
    } else if (c === '\r') continue;
    else {
      if (c === '"' || (closed && c.trim())) throw importFailure(422, 'CSV com aspas inválidas.');
      value += c;
    }
  }
  if (quoted) throw importFailure(422, 'CSV com aspas não fechadas.');
  record.push(value.trim());
  if (record.some(Boolean)) records.push(record);
  return records;
}

function csvActivities(content: string): ParsedActivity[] {
  const [header, ...rows] = csvRecords(content);
  const fields = header?.map((v) => v.toLowerCase()) || [];
  if (!['id', 'name', 'start', 'end'].every((f) => fields.includes(f)))
    throw importFailure(
      422,
      'O CSV deve conter id, name, start e end. predecessors e wbs são opcionais.'
    );
  return rows.map((row, index) => {
    if (row.length !== fields.length)
      throw importFailure(422, `Linha ${index + 2} • número de colunas diferente do cabeçalho.`);
    const get = (name: string) => row[fields.indexOf(name)] || '';
    const predecessors = get('predecessors')
      .split(/[;|]/)
      .filter((v) => v.trim())
      .map((value) => {
        const match = value.trim().match(/^([\w.-]+?)(FS|SS|FF|SF)?([+-]\d+(?:d)?)?$/i);
        if (!match)
          throw importFailure(422, `Linha ${index + 2} • predecessora inválida: ${value}.`);
        return {
          predecessorExternalId: match[1],
          type: (match[2]?.toUpperCase() || 'FS') as 'FS' | 'SS' | 'FF' | 'SF',
          lagDays: parseInt(match[3] || '0', 10),
        };
      });
    return {
      externalId: get('id'),
      name: get('name'),
      plannedStart: get('start'),
      plannedEnd: get('end'),
      wbsCode: get('wbs') || undefined,
      percentComplete: 0,
      predecessors,
      _lineNum: index + 2,
    };
  });
}

export function validatePlanningActivities(activities: ParsedActivity[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const [index, a] of activities.entries()) {
    const line = `Linha ${a._lineNum || index + 1} • `;
    if (!a.externalId || a.externalId.length > 100 || ids.has(a.externalId))
      errors.push(line + 'ID ausente, repetido ou maior que 100 caracteres.');
    ids.add(a.externalId);
    if (!a.name.trim() || a.name.length > 500)
      errors.push(line + 'Nome obrigatório, com até 500 caracteres.');
    if ((a.wbsCode?.length || 0) > 100) errors.push(line + 'WBS excede 100 caracteres.');
    if (
      !validPlanningDate(a.plannedStart) ||
      !validPlanningDate(a.plannedEnd) ||
      a.plannedStart > a.plannedEnd
    )
      errors.push(line + 'Datas inválidas • use AAAA-MM-DD, com término a partir do início.');
    const preds = new Set<string>();
    for (const p of a.predecessors) {
      if (
        preds.has(p.predecessorExternalId) ||
        !Number.isInteger(p.lagDays) ||
        Math.abs(p.lagDays) > 365 ||
        !['FS', 'SS', 'FF', 'SF'].includes(p.type)
      )
        errors.push(
          line + 'Predecessora repetida, relação inválida ou defasagem fora de -365 a 365 dias.'
        );
      preds.add(p.predecessorExternalId);
    }
  }
  const indegree = new Map(activities.map((a) => [a.externalId, 0]));
  const next = new Map<string, string[]>();
  for (const a of activities)
    for (const p of a.predecessors) {
      if (!ids.has(p.predecessorExternalId)) {
        errors.push(
          `Atividade ${a.externalId} • predecessora ${p.predecessorExternalId} não encontrada.`
        );
        continue;
      }
      indegree.set(a.externalId, (indegree.get(a.externalId) || 0) + 1);
      const list = next.get(p.predecessorExternalId) || [];
      list.push(a.externalId);
      next.set(p.predecessorExternalId, list);
    }
  const queue = [...indegree].filter(([, v]) => !v).map(([id]) => id);
  for (let i = 0; i < queue.length; i++)
    for (const id of next.get(queue[i]) || []) {
      indegree.set(id, indegree.get(id)! - 1);
      if (indegree.get(id) === 0) queue.push(id);
    }
  if (queue.length < indegree.size)
    errors.push('Dependências circulares • corrija o ciclo antes de importar.');
  if (errors.length)
    throw importFailure(
      422,
      'O cronograma contém erros. Corrija o arquivo e gere outra prévia.',
      errors.slice(0, 50)
    );
}

export function parsePlanningFile(filename: string, raw: string) {
  if (Buffer.byteLength(raw, 'utf8') > 1024 * 1024)
    throw importFailure(413, 'O limite por arquivo é 1 MB.');
  const content = raw.replace(/^\uFEFF/, '');
  const extension = filename.toLowerCase().split('.').pop();
  const source =
    extension === 'xml' ? 'msp' : extension === 'xer' ? 'p6' : extension === 'csv' ? 'csv' : null;
  if (!source) throw importFailure(422, 'Envie CSV, XML do MS Project ou XER do Primavera.');
  if (/<!DOCTYPE|<!ENTITY/i.test(content))
    throw importFailure(422, 'Declarações externas XML não são aceitas.');
  let activities: ParsedActivity[];
  try {
    if (source === 'csv') activities = csvActivities(content);
    else if (source === 'msp') {
      if (XMLValidator.validate(content) !== true)
        throw importFailure(422, 'MS Project • documento XML incompleto ou inválido.');
      const root = new XMLParser({
        removeNSPrefix: true,
        parseTagValue: false,
        ignoreAttributes: true,
      }).parse(content).Project;
      const list = (value: any): any[] =>
        value == null ? [] : Array.isArray(value) ? value : [value];
      const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
      activities = list(root?.Tasks?.Task ?? root?.Task)
        .filter((task) => text(task.UID) !== '0' && text(task.Summary) !== '1')
        .map((task) => {
          const uid = text(task.UID),
            start = text(task.Start),
            end = text(task.Finish);
          if (
            !/^\d+$/.test(uid) ||
            !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(start) ||
            !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(end)
          )
            throw importFailure(422, 'MS Project • tarefa sem UID ou datas planejadas válidas.');
          const predecessors = list(task.PredecessorLink).map((link) => {
            const id = text(link.PredecessorUID),
              type = link.Type === undefined ? '1' : text(link.Type),
              lag = link.LinkLag === undefined ? '0' : text(link.LinkLag);
            if (
              !/^\d+$/.test(id) ||
              !['0', '1', '2', '3'].includes(type) ||
              !/^[-+]?\d+$/.test(lag)
            )
              throw importFailure(422, 'MS Project • relação de predecessora inválida.');
            return {
              predecessorExternalId: id,
              type: ({ '0': 'FF', '1': 'FS', '2': 'SF', '3': 'SS' } as const)[
                type as '0' | '1' | '2' | '3'
              ],
              lagDays: Math.round(Number(lag) / 4800),
            };
          });
          return {
            externalId: uid,
            name: text(task.Name),
            plannedStart: start.slice(0, 10),
            plannedEnd: end.slice(0, 10),
            wbsCode: text(task.OutlineNumber) || undefined,
            percentComplete: 0,
            predecessors,
          };
        });
    } else {
      let table = '',
        fields: string[] = [];
      let tasks = 0;
      const dates = new Map<string, { plannedStart: string; plannedEnd: string }>();
      const edges: Array<{ from: string; to: string }> = [];
      for (const line of content.split(/\r?\n/)) {
        const parts = line.split('\t'),
          marker = parts.shift();
        if (marker === '%T') table = parts[0];
        else if (marker === '%F') fields = parts;
        else if (marker === '%R' && (table === 'TASK' || table === 'TASKPRED')) {
          const get = (key: string) => parts[fields.indexOf(key)]?.trim() || '';
          if (table === 'TASK') {
            tasks++;
            const start = get('target_start_date') || get('early_start_date') || get('start_date');
            const end = get('target_end_date') || get('early_end_date') || get('end_date');
            if (
              !get('task_id') ||
              !validPlanningDate(start.slice(0, 10)) ||
              !validPlanningDate(end.slice(0, 10))
            )
              throw importFailure(
                422,
                'Primavera • atividade sem ID ou com data planejada inválida.'
              );
            dates.set(get('task_id'), {
              plannedStart: start.slice(0, 10),
              plannedEnd: end.slice(0, 10),
            });
          } else if (
            !get('task_id') ||
            !get('pred_task_id') ||
            !['PR_FS', 'PR_SS', 'PR_FF', 'PR_SF', 'FS', 'SS', 'FF', 'SF'].includes(
              get('pred_type')
            ) ||
            !Number.isFinite(Number(get('lag_hr_cnt') || '0'))
          )
            throw importFailure(422, 'Primavera • relação de predecessora inválida.');
          else edges.push({ from: get('pred_task_id'), to: get('task_id') });
        }
      }
      activities = parseP6Xer(content);
      if (edges.some((edge) => !dates.has(edge.from) || !dates.has(edge.to)))
        throw importFailure(
          422,
          'Primavera • predecessora ou atividade de destino não encontrada.'
        );
      activities = activities.map((activity) => ({
        ...activity,
        ...dates.get(activity.externalId)!,
      }));
      if (tasks !== activities.length)
        throw importFailure(422, 'Há atividades Primavera que não puderam ser lidas.');
    }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error;
    throw importFailure(
      422,
      'Não foi possível interpretar o arquivo. Verifique o formato e as datas.'
    );
  }
  if (!activities.length || activities.length > 4000)
    throw importFailure(422, 'O arquivo deve conter de 1 a 4.000 atividades.');
  activities = activities.map((a) => ({ ...a, percentComplete: 0 }));
  validatePlanningActivities(activities);
  return { source, activities };
}
