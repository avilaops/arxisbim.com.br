import { describe, it, expect, vi } from 'vitest';
import { VisibilityManager, type VisibilityElement } from './VisibilityManager';
import { makeDisciplineResolver } from './DisciplineTaxonomy';
import { defaultVisibilityState, isVisibilityState, type VisibilityState } from './VisibilityState';

const resolver = makeDisciplineResolver();

const elements: VisibilityElement[] = [
  { expressID: 1, type: 'IfcWall', storeyId: 100 },   // architectural, andar 100
  { expressID: 2, type: 'IfcBeam', storeyId: 100 },   // structural, andar 100
  { expressID: 3, type: 'IfcBeam', storeyId: 200 },   // structural, andar 200
  { expressID: 4, type: 'IfcDuctSegment', storeyId: 200 }, // mep, andar 200
  { expressID: 5, type: 'IfcFurniture', storeyId: 100 },   // furniture
  { expressID: 6, type: 'IfcAnnotation', storeyId: null }, // other → sempre visível
];
const mgr = () => new VisibilityManager(elements, resolver);

describe('VisibilityManager', () => {
  it('default: tudo visível', () => {
    const m = mgr();
    expect(elements.every((e) => m.isVisible(e.expressID))).toBe(true);
  });

  it('toggle de grupo oculta só a disciplina (other sempre visível)', () => {
    const m = mgr();
    m.setGroup('structural', false);
    expect(m.isVisible(2)).toBe(false); // beam
    expect(m.isVisible(3)).toBe(false); // beam
    expect(m.isVisible(1)).toBe(true);  // wall (architectural)
    expect(m.isVisible(6)).toBe(true);  // other não tem toggle
  });

  it('filtro de pavimento isola o storey (vazio = todos)', () => {
    const m = mgr();
    m.setFloors([200]);
    expect(m.isVisible(3)).toBe(true);  // andar 200
    expect(m.isVisible(4)).toBe(true);  // andar 200
    expect(m.isVisible(1)).toBe(false); // andar 100
    m.setFloors([]); // todos de novo
    expect(m.isVisible(1)).toBe(true);
  });

  it('hide/show individual sobrepõe os grupos', () => {
    const m = mgr();
    m.hide(1);
    expect(m.isVisible(1)).toBe(false);
    m.show(1);
    expect(m.isVisible(1)).toBe(true);
  });

  it('onApply emite (id,visible) p/ a render layer no toggle de grupo', () => {
    const m = mgr();
    const apply = vi.fn();
    m.onApply(apply);
    m.setGroup('mep', false);
    // emite p/ todos os elementos (recompute); o mep fica invisível.
    expect(apply).toHaveBeenCalledWith(4, false);
    expect(apply).toHaveBeenCalledWith(1, true);
  });

  it('getState serializável + setState restaura exato', () => {
    const m = mgr();
    m.setGroup('architectural', false);
    m.setFloors([100]);
    m.hide(2);
    m.setClippingPlane({ normal: [0, -1, 0], constant: 3 });
    const s = m.getState();
    expect(isVisibilityState(s)).toBe(true);
    expect(JSON.parse(JSON.stringify(s)).hiddenElements).toEqual([2]);

    const m2 = mgr();
    m2.setState(s);
    expect(m2.getState()).toEqual(s);
    // resolução idêntica após restaurar.
    expect(m2.isVisible(1)).toBe(m.isVisible(1));
    expect(m2.isVisible(2)).toBe(false);
  });

  it('default state bate com defaultVisibilityState', () => {
    expect(mgr().getState()).toEqual(defaultVisibilityState());
  });
});
