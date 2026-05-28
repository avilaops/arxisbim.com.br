/**
 * BIM4DTimelineStrip tests
 *
 * Validates the UI bridge against ScheduleManager + TimelineController.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BIM4DTimelineStrip } from './BIM4DTimelineStrip';
import { cloneControlledBIM4DSchedule } from '../bim/4d';

describe('BIM4DTimelineStrip', () => {
  let container: HTMLElement;
  let timeline: BIM4DTimelineStrip | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    timeline?.destroy();
    timeline = undefined;
    container.remove();
  });

  it('shows professional fallback when no schedule is loaded', () => {
    timeline = new BIM4DTimelineStrip(container, { autoLoadFixture: false });

    expect(container.textContent).toContain('Nenhum cronograma 4D carregado');
    expect(container.textContent).toContain('Importação 4D em breve');
    expect(timeline.getState().hasSchedule).toBe(false);

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every(button => button.disabled)).toBe(true);
  });

  it('loads controlled schedule and exposes real timeline state', async () => {
    timeline = new BIM4DTimelineStrip(container, { autoLoadFixture: false });
    await timeline.loadSchedule(cloneControlledBIM4DSchedule());

    const state = timeline.getState();

    expect(state.hasSchedule).toBe(true);
    expect(state.projectName).toContain('Cronograma 4D Controlado');
    expect(state.progress).toBe(0);
    expect(state.counts.planned).toBe(6);
    expect(state.counts.notStarted).toBe(5);
    expect(state.counts.inProgress).toBe(1);
    expect(container.textContent).toContain('6 planejadas');
  });

  it('executes start, previous, next and end through TimelineController', async () => {
    timeline = new BIM4DTimelineStrip(container, { autoLoadFixture: false });
    await timeline.loadSchedule(cloneControlledBIM4DSchedule());

    container.querySelector<HTMLButtonElement>('[data-action="next"]')?.click();
    expect(timeline.getState().progress).toBeCloseTo(5, 1);

    container.querySelector<HTMLButtonElement>('[data-action="prev"]')?.click();
    expect(timeline.getState().progress).toBeCloseTo(0, 1);

    container.querySelector<HTMLButtonElement>('[data-action="end"]')?.click();
    expect(timeline.getState().progress).toBe(100);

    container.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    expect(timeline.getState().progress).toBe(0);
  });

  it('supports seek by clicking the timeline track', async () => {
    timeline = new BIM4DTimelineStrip(container, { autoLoadFixture: false });
    await timeline.loadSchedule(cloneControlledBIM4DSchedule());

    const track = container.querySelector<HTMLElement>('.bim4d-timeline-strip__track');
    expect(track).toBeTruthy();

    track!.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 32,
      width: 200,
      height: 32,
      toJSON: () => ({})
    });

    track!.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: 100
    }));

    expect(timeline.getState().progress).toBeCloseTo(50, 1);
  });

  it('toggles play and pause using real controller events', async () => {
    timeline = new BIM4DTimelineStrip(container, { autoLoadFixture: false });
    await timeline.loadSchedule(cloneControlledBIM4DSchedule());

    const playButton = container.querySelector<HTMLButtonElement>('[data-action="play"]');
    expect(playButton).toBeTruthy();

    playButton!.click();
    expect(timeline.getState().isPlaying).toBe(true);
    expect(playButton!.textContent).toBe('⏸');

    playButton!.click();
    expect(timeline.getState().isPlaying).toBe(false);
    expect(playButton!.textContent).toBe('▶');
  });

  it('prepares visual state mapping for future model coloring', async () => {
    timeline = new BIM4DTimelineStrip(container, { autoLoadFixture: false });
    await timeline.loadSchedule(cloneControlledBIM4DSchedule());

    timeline.seekToProgress(60);
    const visualStates = timeline.getElementVisualStates();

    expect(visualStates.get('fixture-site-001')).toBe('executed');
    expect(visualStates.get('fixture-wall-001')).toBe('delayed');
    expect(visualStates.get('fixture-mep-001')).toBe('not-started');
  });
});
