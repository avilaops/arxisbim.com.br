import { Sql } from 'postgres';
import { schedules, activities, activityPredecessors } from '../../shared/database/schema/scheduling.js';
import { randomUUID } from 'crypto';

export interface ParsedActivity {
  externalId: string;
  name: string;
  plannedStart: string; // 'YYYY-MM-DD'
  plannedEnd: string;   // 'YYYY-MM-DD'
  wbsCode?: string;
  percentComplete: number; // 0-100
  predecessors: ParsedPredecessor[];
  _lineNum?: number;
}

export interface ParsedPredecessor {
  predecessorExternalId: string;
  lagDays: number;
  type: 'FS' | 'SS' | 'FF' | 'SF';
}

export interface ImportError {
  row?: number;
  field?: string;
  value?: string;
  message: string;
}


/**
 * Detects if a directed graph has cycles using DFS with color marking:
 * 0 = WHITE (unvisited), 1 = GRAY (visiting), 2 = BLACK (visited).
 * Traces back-edges and returns the cycle path when detected.
 */
export function detectDependencyCycle(parsedActivities: ParsedActivity[]): { hasCycle: boolean; path?: string[] } {
  const adjList = new Map<string, string[]>();
  const actMap = new Map<string, ParsedActivity>();

  // Initialize maps
  for (const act of parsedActivities) {
    adjList.set(act.externalId, []);
    actMap.set(act.externalId, act);
  }

  // Populate graph edges: predecessorId -> activityId
  for (const act of parsedActivities) {
    for (const pred of act.predecessors) {
      if (adjList.has(pred.predecessorExternalId)) {
        adjList.get(pred.predecessorExternalId)!.push(act.externalId);
      }
    }
  }

  // Node colors: 0 = white, 1 = gray, 2 = black
  const colors = new Map<string, number>();
  for (const act of parsedActivities) {
    colors.set(act.externalId, 0);
  }

  const recursionStack: string[] = [];

  function dfs(node: string): { hasCycle: boolean; path?: string[] } {
    colors.set(node, 1); // gray
    recursionStack.push(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      const color = colors.get(neighbor);
      if (color === 1) {
        // Cycle detected
        const cycleStartIndex = recursionStack.indexOf(neighbor);
        const cyclePath = recursionStack.slice(cycleStartIndex);
        cyclePath.push(neighbor);
        
        const namedPath = cyclePath.map(id => {
          const act = actMap.get(id);
          return act ? `${act.name} (${id})` : id;
        });
        return { hasCycle: true, path: namedPath };
      }
      if (color === 0) {
        const res = dfs(neighbor);
        if (res.hasCycle) {
          return res;
        }
      }
    }

    recursionStack.pop();
    colors.set(node, 2); // black
    return { hasCycle: false };
  }

  for (const act of parsedActivities) {
    if (colors.get(act.externalId) === 0) {
      const res = dfs(act.externalId);
      if (res.hasCycle) {
        return res;
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Legacy wrapper for backward compatibility.
 */
export function hasDependencyCycle(parsedActivities: ParsedActivity[]): boolean {
  return detectDependencyCycle(parsedActivities).hasCycle;
}


/**
 * Parses a CSV string containing schedule activities.
 * Expected header: id, name, start, end, predecessors
 */
export function parseCSV(content: string): ParsedActivity[] {
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return [];

  // Parse header to find column indices
  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  const idIdx = header.indexOf('id');
  const nameIdx = header.indexOf('name');
  const startIdx = header.indexOf('start');
  const endIdx = header.indexOf('end');
  const predIdx = header.indexOf('predecessors');

  if (idIdx === -1 || nameIdx === -1 || startIdx === -1 || endIdx === -1) {
    throw new Error('CSV headers must include: id, name, start, end');
  }

  const parsed: ParsedActivity[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple comma split (ignoring quoted values for simplicity, or basic quotes handler)
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current.trim());

    if (columns.length < 4) continue;

    const rawId = columns[idIdx];
    const name = columns[nameIdx]?.replace(/^"|"$/g, '') || '';
    const startStr = columns[startIdx];
    const endStr = columns[endIdx];

    // Ensure dates are parsed to YYYY-MM-DD
    const plannedStart = new Date(startStr).toISOString().slice(0, 10);
    const plannedEnd = new Date(endStr).toISOString().slice(0, 10);

    const predecessors: ParsedPredecessor[] = [];
    if (predIdx !== -1 && columns[predIdx]) {
      const predField = columns[predIdx].replace(/^"|"$/g, '');
      const parts = predField.split(/[;|]/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Pattern matches: id(type)(+lag) ex: 1FS+3d, 2SS, 3FF-1d, 4
        const match = trimmed.match(/^(\w+?)(FS|SS|FF|SF)?(?:([+-]\d+)(?:d|days)?)?$/i);
        if (match) {
          const predId = match[1];
          const type = (match[2]?.toUpperCase() || 'FS') as 'FS' | 'SS' | 'FF' | 'SF';
          const lag = match[3] ? parseInt(match[3], 10) : 0;
          predecessors.push({
            predecessorExternalId: predId,
            lagDays: lag,
            type,
          });
        }
      }
    }

    parsed.push({
      externalId: rawId,
      name,
      plannedStart,
      plannedEnd,
      percentComplete: 0,
      predecessors,
    });
  }

  return parsed;
}

/**
 * Parses MS Project XML (2003/2019 schema) with line tracking.
 */
export function parseMSPXml(content: string): ParsedActivity[] {
  const parsed: ParsedActivity[] = [];
  const lines = content.split(/\r?\n/);

  const getLineNumberForTaskUid = (uid: string): number => {
    const uidTag = `<UID>${uid}</UID>`;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(uidTag)) {
        for (let j = i; j >= 0; j--) {
          if (lines[j].includes('<Task')) {
            return j + 1;
          }
        }
        return i + 1;
      }
    }
    return 1;
  };

  // Match all <Task>...</Task> blocks
  const taskRegex = /<Task\b[^>]*>([\s\S]*?)<\/Task>/g;
  let taskMatch;

  while ((taskMatch = taskRegex.exec(content)) !== null) {
    const taskContent = taskMatch[1];

    const uidMatch = taskContent.match(/<UID>(\d+)<\/UID>/);
    const nameMatch = taskContent.match(/<Name>([^<]+)<\/Name>/);
    const startMatch = taskContent.match(/<Start>([^<]+)<\/Start>/);
    const finishMatch = taskContent.match(/<Finish>([^<]+)<\/Finish>/);
    const outlineMatch = taskContent.match(/<OutlineNumber>([^<]+)<\/OutlineNumber>/);
    const percentMatch = taskContent.match(/<PercentComplete>([^<]+)<\/PercentComplete>/);

    // Skip summary tasks if required or empty names
    if (!uidMatch || !startMatch || !finishMatch) continue;

    const externalId = uidMatch[1];
    const name = nameMatch ? nameMatch[1].trim() : `Task ${externalId}`;
    const plannedStart = startMatch[1].substring(0, 10);
    const plannedEnd = finishMatch[1].substring(0, 10);
    const wbsCode = outlineMatch ? outlineMatch[1] : undefined;
    const percentComplete = percentMatch ? parseFloat(percentMatch[1]) : 0;

    const predecessors: ParsedPredecessor[] = [];
    const predLinkRegex = /<PredecessorLink>([\s\S]*?)<\/PredecessorLink>/g;
    let predMatch;

    while ((predMatch = predLinkRegex.exec(taskContent)) !== null) {
      const predContent = predMatch[1];
      const predUidMatch = predContent.match(/<PredecessorUID>(\d+)<\/PredecessorUID>/);
      const typeMatch = predContent.match(/<Type>(\d+)<\/Type>/);
      const lagMatch = predContent.match(/<LinkLag>(-?\d+)<\/LinkLag>/);

      if (predUidMatch) {
        const predUid = predUidMatch[1];
        // MS Project XML link types: 0=FF, 1=FS, 2=SF, 3=SS
        const mspType = typeMatch ? parseInt(typeMatch[1], 10) : 1;
        let type: 'FS' | 'SS' | 'FF' | 'SF' = 'FS';
        if (mspType === 0) type = 'FF';
        else if (mspType === 2) type = 'SF';
        else if (mspType === 3) type = 'SS';

        // LinkLag is in tenths of a minute. 1 day = 8 hours working = 480 mins = 4800 tenths.
        const rawLag = lagMatch ? parseInt(lagMatch[1], 10) : 0;
        const lagDays = Math.round(rawLag / 4800);

        predecessors.push({
          predecessorExternalId: predUid,
          lagDays,
          type,
        });
      }
    }

    const lineNum = getLineNumberForTaskUid(externalId);

    parsed.push({
      externalId,
      name,
      plannedStart,
      plannedEnd,
      wbsCode,
      percentComplete,
      predecessors,
      _lineNum: lineNum
    });
  }

  return parsed;
}

/**
 * Parses Primavera P6 .xer tab-delimited file.
 */
export function parseP6Xer(content: string): ParsedActivity[] {
  const lines = content.split(/\r?\n/);
  const tables: Record<string, any[]> = {};
  
  let currentTable = '';
  let currentFields: string[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;

    const type = line.substring(0, 2);
    const dataStr = line.substring(3);

    if (type === '%T') {
      currentTable = dataStr.trim();
      currentFields = [];
    } else if (type === '%F') {
      currentFields = dataStr.split('\t').map(f => f.trim());
    } else if (type === '%R') {
      if (!currentTable || currentFields.length === 0) {
        continue;
      }
      const values = dataStr.split('\t').map(v => v.trim());
      const record: Record<string, string> = {};
      for (let i = 0; i < currentFields.length; i++) {
        record[currentFields[i]] = values[i] || '';
      }
      if (!tables[currentTable]) {
        tables[currentTable] = [];
      }
      record['_lineNum'] = String(lineIdx + 1);
      tables[currentTable].push(record);
    }
  }

  const parsedActivities: ParsedActivity[] = [];

  const taskRows = tables['TASK'] || [];
  const taskPredRows = tables['TASKPRED'] || [];

  const predsMap = new Map<string, ParsedPredecessor[]>();
  for (const pred of taskPredRows) {
    const taskId = pred['task_id'];
    const predTaskId = pred['pred_task_id'];
    if (!taskId || !predTaskId) continue;

    let type: 'FS' | 'SS' | 'FF' | 'SF' = 'FS';
    const predType = pred['pred_type'] || '';
    if (predType.endsWith('SS')) type = 'SS';
    else if (predType.endsWith('FF')) type = 'FF';
    else if (predType.endsWith('SF')) type = 'SF';

    const lagHours = parseFloat(pred['lag_hr_cnt'] || '0');
    const lagDays = Math.round(lagHours / 8);

    if (!predsMap.has(taskId)) {
      predsMap.set(taskId, []);
    }
    predsMap.get(taskId)!.push({
      predecessorExternalId: predTaskId,
      lagDays,
      type
    });
  }

  for (const task of taskRows) {
    const taskId = task['task_id'];
    if (!taskId) continue;

    const name = task['task_name'] || `Task ${taskId}`;
    const rawStart = task['target_start_date'] || task['early_start_date'] || task['start_date'] || '';
    const rawEnd = task['target_end_date'] || task['early_end_date'] || task['end_date'] || '';

    let plannedStart = '';
    let plannedEnd = '';
    if (rawStart) {
      const dateVal = new Date(rawStart);
      if (!isNaN(dateVal.getTime())) {
        plannedStart = dateVal.toISOString().slice(0, 10);
      }
    }
    if (rawEnd) {
      const dateVal = new Date(rawEnd);
      if (!isNaN(dateVal.getTime())) {
        plannedEnd = dateVal.toISOString().slice(0, 10);
      }
    }

    const percentComplete = parseFloat(task['phys_complete_pct'] || task['complete_pct'] || '0');
    const wbsCode = task['wbs_id'] || undefined;

    parsedActivities.push({
      externalId: taskId,
      name,
      plannedStart,
      plannedEnd,
      percentComplete,
      wbsCode,
      predecessors: predsMap.get(taskId) || [],
      _lineNum: parseInt(task['_lineNum'] || '0', 10)
    });
  }

  return parsedActivities;
}

/**
 * Validates parsed schedule activities and detects errors and cycles.
 */
export function validateParsedActivities(activities: ParsedActivity[]): ImportError[] {
  const errors: ImportError[] = [];
  const activityIds = new Set(activities.map(a => a.externalId));

  activities.forEach((act, idx) => {
    const line = act._lineNum || (idx + 1);

    if (!act.externalId) {
      errors.push({
        row: line,
        field: 'id',
        message: 'Activity is missing a unique ID'
      });
    }

    if (!act.name) {
      errors.push({
        row: line,
        field: 'name',
        value: act.name,
        message: 'Activity name is required'
      });
    }

    if (!act.plannedStart || !/^\d{4}-\d{2}-\d{2}$/.test(act.plannedStart)) {
      errors.push({
        row: line,
        field: 'start',
        value: act.plannedStart,
        message: `Invalid start date: "${act.plannedStart}". Expected format: YYYY-MM-DD.`
      });
    }

    if (!act.plannedEnd || !/^\d{4}-\d{2}-\d{2}$/.test(act.plannedEnd)) {
      errors.push({
        row: line,
        field: 'end',
        value: act.plannedEnd,
        message: `Invalid end date: "${act.plannedEnd}". Expected format: YYYY-MM-DD.`
      });
    }

    if (act.plannedStart && act.plannedEnd && act.plannedStart > act.plannedEnd) {
      errors.push({
        row: line,
        field: 'start_end',
        message: `Start date (${act.plannedStart}) cannot be after end date (${act.plannedEnd})`
      });
    }

    act.predecessors.forEach(pred => {
      if (!activityIds.has(pred.predecessorExternalId)) {
        errors.push({
          row: line,
          field: 'predecessors',
          value: pred.predecessorExternalId,
          message: `Predecessor ID "${pred.predecessorExternalId}" does not exist in the schedule`
        });
      }
    });
  });

  const cycleResult = detectDependencyCycle(activities);
  if (cycleResult.hasCycle) {
    errors.push({
      field: 'dependencies',
      message: `Circular dependency detected: ${cycleResult.path?.join(' -> ')}`
    });
  }

  return errors;
}


export async function persistParsedSchedule(
  sql: Sql,
  projectId: string,
  scenarioId: string | null,
  scheduleName: string,
  startDate: string,
  source: string,
  parsedActivities: ParsedActivity[]
): Promise<string> {
  const errors = validateParsedActivities(parsedActivities);
  if (errors.length > 0) {
    const errorMsg = errors.map(e => `[Row ${e.row || '?'}] ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${errorMsg}`);
  }


  const scheduleId = randomUUID();

  await sql.begin(async (tx) => {
    // 1. Create Schedule
    await tx`
      INSERT INTO schedules (id, project_id, scenario_id, name, start_date, source)
      VALUES (${scheduleId}, ${projectId}, ${scenarioId}, ${scheduleName}, ${startDate}, ${source})
    `;

    // 2. Insert Activities and build externalId -> DB UUID map
    const actIdMap = new Map<string, string>();
    const actRowsToInsert: any[] = [];

    for (const act of parsedActivities) {
      const actId = randomUUID();
      actIdMap.set(act.externalId, actId);
      
      actRowsToInsert.push({
        id: actId,
        schedule_id: scheduleId,
        external_id: act.externalId,
        name: act.name,
        planned_start: act.plannedStart,
        planned_end: act.plannedEnd,
        percent_complete: act.percentComplete.toString(),
        wbs_code: act.wbsCode || null,
        sort_order: 0,
      });
    }

    // Batch insert activities
    if (actRowsToInsert.length > 0) {
      // Chunk inserts in batches of 1000
      const chunkSize = 1000;
      for (let i = 0; i < actRowsToInsert.length; i += chunkSize) {
        const chunk = actRowsToInsert.slice(i, i + chunkSize);
        await tx`
          INSERT INTO activities ${(tx as any)(chunk, 'id', 'schedule_id', 'external_id', 'name', 'planned_start', 'planned_end', 'percent_complete', 'wbs_code', 'sort_order')}
        `;
      }
    }

    // 3. Insert Predecessors
    const predRowsToInsert: any[] = [];
    for (const act of parsedActivities) {
      const activityId = actIdMap.get(act.externalId)!;
      for (const pred of act.predecessors) {
        const predecessorId = actIdMap.get(pred.predecessorExternalId);
        // Predecessor must exist in the imported list
        if (predecessorId) {
          predRowsToInsert.push({
            activity_id: activityId,
            predecessor_id: predecessorId,
            lag_days: pred.lagDays,
            type: pred.type,
          });
        }
      }
    }

    // Batch insert predecessors
    if (predRowsToInsert.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < predRowsToInsert.length; i += chunkSize) {
        const chunk = predRowsToInsert.slice(i, i + chunkSize);
        await tx`
          INSERT INTO activity_predecessors ${(tx as any)(chunk, 'activity_id', 'predecessor_id', 'lag_days', 'type')}
        `;
      }
    }
  });

  return scheduleId;
}
