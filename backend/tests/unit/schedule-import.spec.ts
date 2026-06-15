import { describe, it, expect } from 'vitest';
import { parseCSV, parseMSPXml, parseP6Xer, validateParsedActivities, detectDependencyCycle } from '../../src/modules/scheduling/schedule-import.service.js';

describe('Schedule Import Unit Tests', () => {
  describe('detectDependencyCycle (DFS white/gray/black)', () => {
    it('returns no cycle for linear dependencies', () => {
      const activities = [
        { externalId: '1', name: 'Task 1', plannedStart: '2026-06-15', plannedEnd: '2026-06-20', percentComplete: 0, predecessors: [] },
        { externalId: '2', name: 'Task 2', plannedStart: '2026-06-20', plannedEnd: '2026-06-25', percentComplete: 0, predecessors: [{ predecessorExternalId: '1', lagDays: 0, type: 'FS' as const }] },
        { externalId: '3', name: 'Task 3', plannedStart: '2026-06-25', plannedEnd: '2026-06-30', percentComplete: 0, predecessors: [{ predecessorExternalId: '2', lagDays: 0, type: 'FS' as const }] }
      ];

      const res = detectDependencyCycle(activities);
      expect(res.hasCycle).toBe(false);
    });

    it('detects a cycle and reports the path of activities', () => {
      const activities = [
        { externalId: 'A', name: 'Task A', plannedStart: '2026-06-15', plannedEnd: '2026-06-20', percentComplete: 0, predecessors: [{ predecessorExternalId: 'C', lagDays: 0, type: 'FS' as const }] },
        { externalId: 'B', name: 'Task B', plannedStart: '2026-06-20', plannedEnd: '2026-06-25', percentComplete: 0, predecessors: [{ predecessorExternalId: 'A', lagDays: 0, type: 'FS' as const }] },
        { externalId: 'C', name: 'Task C', plannedStart: '2026-06-25', plannedEnd: '2026-06-30', percentComplete: 0, predecessors: [{ predecessorExternalId: 'B', lagDays: 0, type: 'FS' as const }] }
      ];

      const res = detectDependencyCycle(activities);
      expect(res.hasCycle).toBe(true);
      expect(res.path).toBeDefined();
      expect(res.path).toContain('Task A (A)');
      expect(res.path).toContain('Task B (B)');
      expect(res.path).toContain('Task C (C)');
    });
  });

  describe('parseP6Xer (Primavera P6)', () => {
    it('correctly tokenizes and parses tables and tasks from XER format', () => {
      const xerContent = [
        'ERPMEXPORT',
        '%T\tPROJECT',
        '%F\tproj_id\tproj_short_name',
        '%R\t123\tProjTest',
        '%T\tTASK',
        '%F\ttask_id\ttask_code\ttask_name\tphys_complete_pct\ttarget_start_date\ttarget_end_date\twbs_id',
        '%R\t1001\tA10\tFundacao\t50.00\t2026-06-15 08:00\t2026-06-20 17:00\t501',
        '%R\t1002\tA20\tEstrutura\t0.00\t2026-06-20 08:00\t2026-06-25 17:00\t501',
        '%T\tTASKPRED',
        '%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt',
        '%R\t1002\t1001\tPR_FS\t16.0'
      ].join('\n');

      const parsed = parseP6Xer(xerContent);
      expect(parsed).toHaveLength(2);

      const f = parsed.find(a => a.externalId === '1001')!;
      expect(f).toBeDefined();
      expect(f.name).toBe('Fundacao');
      expect(f.plannedStart).toBe('2026-06-15');
      expect(f.plannedEnd).toBe('2026-06-20');
      expect(f.percentComplete).toBe(50);

      const e = parsed.find(a => a.externalId === '1002')!;
      expect(e).toBeDefined();
      expect(e.predecessors).toHaveLength(1);
      expect(e.predecessors[0].predecessorExternalId).toBe('1001');
      expect(e.predecessors[0].type).toBe('FS');
      expect(e.predecessors[0].lagDays).toBe(2); // 16h / 8 = 2d
    });
  });

  describe('parseMSPXml (MS Project with Line Numbers)', () => {
    it('extracts task lines and parses fields from MS Project XML schema', () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>
    <Task>
      <UID>10</UID>
      <Name>Escavacao</Name>
      <Start>2026-06-15T08:00:00</Start>
      <Finish>2026-06-18T17:00:00</Finish>
      <PercentComplete>100</PercentComplete>
    </Task>
    <Task>
      <UID>20</UID>
      <Name>Concretagem</Name>
      <Start>2026-06-18T08:00:00</Start>
      <Finish>2026-06-22T17:00:00</Finish>
      <PredecessorLink>
        <PredecessorUID>10</PredecessorUID>
        <Type>1</Type>
        <LinkLag>4800</LinkLag>
      </PredecessorLink>
    </Task>
  </Tasks>
</Project>`;

      const parsed = parseMSPXml(xmlContent);
      expect(parsed).toHaveLength(2);

      const task1 = parsed.find(t => t.externalId === '10')!;
      expect(task1).toBeDefined();
      expect(task1.name).toBe('Escavacao');
      expect(task1._lineNum).toBe(4);

      const task2 = parsed.find(t => t.externalId === '20')!;
      expect(task2).toBeDefined();
      expect(task2._lineNum).toBe(11);
      expect(task2.predecessors[0].predecessorExternalId).toBe('10');
      expect(task2.predecessors[0].lagDays).toBe(1); // 4800 / 4800 = 1d
    });
  });

  describe('validateParsedActivities (Row-level errors)', () => {
    it('returns empty errors for a fully valid schedule', () => {
      const activities = [
        { externalId: '1', name: 'Task 1', plannedStart: '2026-06-15', plannedEnd: '2026-06-20', percentComplete: 0, predecessors: [] }
      ];

      const errors = validateParsedActivities(activities);
      expect(errors).toHaveLength(0);
    });

    it('identifies missing and invalid fields with row references', () => {
      const activities = [
        { externalId: '', name: '', plannedStart: 'invalid-date', plannedEnd: '2026-06-20', percentComplete: 0, predecessors: [], _lineNum: 15 },
        { externalId: '2', name: 'Task 2', plannedStart: '2026-06-25', plannedEnd: '2026-06-20', percentComplete: 0, predecessors: [{ predecessorExternalId: '99', lagDays: 0, type: 'FS' as const }] }
      ];

      const errors = validateParsedActivities(activities);
      expect(errors.length).toBeGreaterThan(0);

      // Row 15 (activity index 0)
      const errId = errors.find(e => e.row === 15 && e.field === 'id')!;
      expect(errId).toBeDefined();

      const errName = errors.find(e => e.row === 15 && e.field === 'name')!;
      expect(errName).toBeDefined();

      const errStart = errors.find(e => e.row === 15 && e.field === 'start')!;
      expect(errStart).toBeDefined();

      // Row 2 (activity index 1 fallback line)
      const errStartEnd = errors.find(e => e.row === 2 && e.field === 'start_end')!;
      expect(errStartEnd).toBeDefined();

      const errPred = errors.find(e => e.row === 2 && e.field === 'predecessors')!;
      expect(errPred).toBeDefined();
      expect(errPred.value).toBe('99');
    });
  });
});
