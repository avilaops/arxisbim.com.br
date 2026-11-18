import { describe, it, expect } from 'vitest';
import { parsePlanningFile } from '../../src/modules/scheduling/planning-import-parser.js';

describe('planning import validation', () => {
  it('reads quoted CSV with semicolon, keeps dependency types and never imports actual progress', () => {
    const parsed = parsePlanningFile(
      'obra.csv',
      '\ufeffid;name;start;end;predecessors\nA;"Fundação; setor A";2026-12-01;2026-12-03;\nB;Estrutura;2026-12-04;2026-12-05;AFS+2d'
    );
    expect(parsed.source).toBe('csv');
    expect(parsed.activities[0].name).toBe('Fundação; setor A');
    expect(parsed.activities[1].predecessors).toEqual([
      { predecessorExternalId: 'A', type: 'FS', lagDays: 2 },
    ]);
    expect(parsed.activities.every((a) => a.percentComplete === 0)).toBe(true);
  });
  it.each([
    'id,name,start,end\n1,A,2026-02-30,2026-03-02',
    'id,name,start,end\n1,A,2026-12-01,2026-12-02\n1,B,2026-12-03,2026-12-04',
    'id,name,start,end,predecessors\n1,A,2026-12-01,2026-12-02,2\n2,B,2026-12-03,2026-12-04,1',
    'id,name,start,end,predecessors\n1,A,2026-12-01,2026-12-02,garbage?',
    'id,name,start,end\n1,A,2026-12-01',
  ])('rejects invalid input without silently dropping rows or dependencies', (content) => {
    expect(() => parsePlanningFile('bad.csv', content)).toThrow();
  });
  it('reads MSP XML and P6 XER with dependencies', () => {
    const xml =
      '<Project><Tasks><Task><UID>1</UID><Name>A &amp; B</Name><Start>2026-12-01T08:00:00</Start><Finish>2026-12-02T17:00:00</Finish><PercentComplete>80</PercentComplete></Task><Task><UID>2</UID><Name>C</Name><Start>2026-12-03</Start><Finish>2026-12-04</Finish><PredecessorLink><PredecessorUID>1</PredecessorUID><Type>1</Type></PredecessorLink></Task></Tasks></Project>';
    const msp = parsePlanningFile('obra.xml', xml);
    expect(msp.activities[0]).toMatchObject({ name: 'A & B', percentComplete: 0 });
    expect(msp.activities[1].predecessors[0].predecessorExternalId).toBe('1');
    const p6 = parsePlanningFile(
      'obra.xer',
      'ERMHDR\t1\n%T\tTASK\n%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date\n%R\t1\tA\t2026-12-01 08:00\t2026-12-02 17:00\n%R\t2\tB\t2026-12-03 08:00\t2026-12-04 17:00\n%T\tTASKPRED\n%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n%R\t2\t1\tPR_FS\t8'
    );
    expect(p6.activities[1].predecessors[0]).toEqual({
      predecessorExternalId: '1',
      type: 'FS',
      lagDays: 1,
    });
  });
  it('rejects impossible P6 dates and unsupported dependency types instead of silently normalizing them', () => {
    expect(() =>
      parsePlanningFile(
        'bad.xer',
        '%T\tTASK\n%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date\n%R\t1\tA\t2026-02-30 08:00\t2026-03-04 17:00'
      )
    ).toThrow();
    expect(() =>
      parsePlanningFile(
        'bad.xml',
        '<Project><Task><UID>1</UID><Name>A</Name><Start>2026-12-01</Start><Finish>2026-12-02</Finish></Task><Task><UID>2</UID><Name>B</Name><Start>2026-12-03</Start><Finish>2026-12-04</Finish><PredecessorLink><PredecessorUID>1</PredecessorUID><Type>9</Type></PredecessorLink></Task></Project>'
      )
    ).toThrow();
  });
  it('rejects truncated XML instead of accepting a partial schedule', () => {
    expect(() =>
      parsePlanningFile(
        'bad.xml',
        '<Project><Tasks><Task><UID>1</UID><Name>A</Name><Start>2026-12-01</Start><Finish>2026-12-02</Finish></Task>'
      )
    ).toThrow();
  });
  it('preserves the calendar date in P6 and rejects dangling dependency destinations', () => {
    const task =
      '%T\tTASK\n%F\ttask_id\ttask_name\ttarget_start_date\ttarget_end_date\n%R\t1\tA\t2026-12-01 22:00\t2026-12-02 23:00';
    const previous = process.env.TZ;
    process.env.TZ = 'America/Sao_Paulo';
    try {
      expect(parsePlanningFile('obra.xer', task).activities[0]).toMatchObject({
        plannedStart: '2026-12-01',
        plannedEnd: '2026-12-02',
      });
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
    expect(() =>
      parsePlanningFile(
        'bad.xer',
        task +
          '\n%T\tTASKPRED\n%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n%R\t999\t1\tPR_FS\t0'
      )
    ).toThrow();
  });
});
