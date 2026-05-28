import { describe, it, expect, beforeEach } from 'vitest';
import { BatchSelectionService } from '../BatchSelectionService';

describe('BatchSelectionService', () => {
  let svc: BatchSelectionService;

  beforeEach(() => {
    BatchSelectionService._resetForTests();
    svc = BatchSelectionService.getInstance();
  });

  it('starts empty', () => {
    expect(svc.size()).toBe(0);
    expect(svc.getSelectedUuids()).toEqual([]);
  });

  it('selectMany replaces the set and dedupes', () => {
    svc.selectMany(['a', 'b', 'b', 'c']);
    expect(svc.size()).toBe(3);
    expect(svc.has('a')).toBe(true);
    expect(svc.has('b')).toBe(true);
    expect(svc.has('c')).toBe(true);

    svc.selectMany(['x']);
    expect(svc.getSelectedUuids()).toEqual(['x']);
  });

  it('add merges into the set without losing existing items', () => {
    svc.selectMany(['a']);
    svc.add(['b', 'c']);
    expect(svc.size()).toBe(3);
  });

  it('remove drops listed uuids only', () => {
    svc.selectMany(['a', 'b', 'c']);
    svc.remove(['b']);
    expect(svc.has('b')).toBe(false);
    expect(svc.size()).toBe(2);
  });

  it('toggle flips membership', () => {
    svc.toggle('a');
    expect(svc.has('a')).toBe(true);
    svc.toggle('a');
    expect(svc.has('a')).toBe(false);
  });

  it('clearAll empties the set', () => {
    svc.selectMany(['a', 'b']);
    svc.clearAll();
    expect(svc.size()).toBe(0);
  });

  it('clearAll on empty set does not notify', () => {
    let calls = 0;
    svc.onChanged(() => calls++);
    svc.clearAll();
    expect(calls).toBe(0);
  });

  it('onChanged fires after every mutation and returns a disposer', () => {
    const events: number[] = [];
    const off = svc.onChanged((state) => events.push(state.uuids.size));

    svc.selectMany(['a']);
    svc.add(['b']);
    svc.remove(['b']);
    svc.toggle('c');
    svc.clearAll();
    expect(events).toEqual([1, 2, 1, 2, 0]);

    off();
    svc.selectMany(['x']);
    expect(events).toHaveLength(5);
  });

  it('listener snapshot is independent of internal mutation', () => {
    let captured: ReadonlySet<string> | null = null;
    svc.onChanged((state) => {
      captured = state.uuids;
    });
    svc.selectMany(['a', 'b']);
    const beforeMutation = captured ? new Set(captured) : new Set();
    svc.add(['c']);
    expect(beforeMutation.size).toBe(2);
    expect(beforeMutation.has('c')).toBe(false);
  });

  it('one listener throwing does not stop other listeners', () => {
    const ok: number[] = [];
    svc.onChanged(() => {
      throw new Error('boom');
    });
    svc.onChanged((s) => ok.push(s.uuids.size));
    svc.selectMany(['a']);
    expect(ok).toEqual([1]);
  });

  it('getInstance returns the same singleton until _resetForTests', () => {
    const a = BatchSelectionService.getInstance();
    const b = BatchSelectionService.getInstance();
    expect(a).toBe(b);
    BatchSelectionService._resetForTests();
    const c = BatchSelectionService.getInstance();
    expect(c).not.toBe(a);
  });
});
