/**
 * Controlled BIM 4D schedule fixture.
 *
 * Used by the bottom timeline while project-specific schedule import is not yet
 * connected to the shell. It intentionally exercises all relevant visual states:
 * planned/not-started, in progress, completed/executed, and delayed.
 */

import type { ScheduleData } from '../types';

export const CONTROLLED_BIM4D_SCHEDULE: ScheduleData = {
  projectName: 'Cronograma 4D Controlado — Residencial Heitor',
  startDate: new Date('2026-01-05T00:00:00'),
  endDate: new Date('2026-07-31T23:59:59'),
  metadata: {
    source: 'fixture-controlada',
    version: '2026.05',
    author: 'ArxisVR'
  },
  tasks: [
    {
      id: '4D-001',
      name: 'Mobilização e locação de obra',
      startDate: new Date('2026-01-05T00:00:00'),
      endDate: new Date('2026-01-18T23:59:59'),
      duration: 14,
      predecessors: [],
      ifcGuids: ['fixture-site-001', 'fixture-site-002'],
      status: 'completed'
    },
    {
      id: '4D-002',
      name: 'Fundações e blocos',
      startDate: new Date('2026-01-19T00:00:00'),
      endDate: new Date('2026-02-28T23:59:59'),
      duration: 41,
      predecessors: ['4D-001'],
      ifcGuids: ['fixture-foundation-001', 'fixture-foundation-002', 'fixture-foundation-003'],
      status: 'completed'
    },
    {
      id: '4D-003',
      name: 'Pilares do térreo',
      startDate: new Date('2026-03-01T00:00:00'),
      endDate: new Date('2026-03-31T23:59:59'),
      duration: 31,
      predecessors: ['4D-002'],
      ifcGuids: ['fixture-column-001', 'fixture-column-002'],
      status: 'completed'
    },
    {
      id: '4D-004',
      name: 'Laje do primeiro pavimento',
      startDate: new Date('2026-04-01T00:00:00'),
      endDate: new Date('2026-04-30T23:59:59'),
      duration: 30,
      predecessors: ['4D-003'],
      ifcGuids: ['fixture-slab-001', 'fixture-slab-002'],
      status: 'in-progress'
    },
    {
      id: '4D-005',
      name: 'Vedações e alvenarias',
      startDate: new Date('2026-05-01T00:00:00'),
      endDate: new Date('2026-06-15T23:59:59'),
      duration: 46,
      predecessors: ['4D-004'],
      ifcGuids: ['fixture-wall-001', 'fixture-wall-002', 'fixture-wall-003'],
      status: 'delayed'
    },
    {
      id: '4D-006',
      name: 'Instalações e acabamentos iniciais',
      startDate: new Date('2026-06-16T00:00:00'),
      endDate: new Date('2026-07-31T23:59:59'),
      duration: 46,
      predecessors: ['4D-005'],
      ifcGuids: ['fixture-mep-001', 'fixture-finish-001'],
      status: 'not-started'
    }
  ]
};

export function cloneControlledBIM4DSchedule(): ScheduleData {
  return {
    ...CONTROLLED_BIM4D_SCHEDULE,
    startDate: new Date(CONTROLLED_BIM4D_SCHEDULE.startDate),
    endDate: new Date(CONTROLLED_BIM4D_SCHEDULE.endDate),
    metadata: { ...CONTROLLED_BIM4D_SCHEDULE.metadata },
    tasks: CONTROLLED_BIM4D_SCHEDULE.tasks.map(task => ({
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      predecessors: [...task.predecessors],
      ifcGuids: [...task.ifcGuids],
      metadata: task.metadata ? { ...task.metadata } : undefined
    }))
  };
}
