import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BudgetPanel } from '../BudgetPanel';
import type { TakeoffResult } from '../../../../../features/bim-4d/bim/5d';

function fakeTakeoff(elementId: string | number, qty: number): TakeoffResult {
  return {
    quantities: [
      {
        elementId,
        ifcType: 'IfcWall',
        name: 'NetVolume',
        value: qty,
        unit: 'm3',
        source: 'qto-pset',
      },
    ],
    byType: { IfcWall: { NetVolume: { sum: qty, unit: 'm3', count: 1 } } },
    skippedElementIds: [],
    durationMs: 0,
  };
}

function setInput(container: HTMLElement, selector: string, value: string): void {
  const el = container.querySelector<HTMLInputElement>(selector);
  if (!el) throw new Error(`input not found: ${selector}`);
  el.value = value;
}

describe('BudgetPanel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders empty state when no budgets exist', () => {
    new BudgetPanel(container, { getTakeoffResult: () => null });
    expect(container.querySelector('.panel__empty')?.textContent).toMatch(/Nenhum/);
  });

  it('creates a budget and shows it in the list', () => {
    const panel = new BudgetPanel(container, { getTakeoffResult: () => null });
    setInput(container, '#budget-name', 'Casa A');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();

    expect(panel.getManager().list()).toHaveLength(1);
    expect(container.querySelector('.budget-panel__list-item')?.textContent).toMatch(/Casa A/);
  });

  it('adds a cost item to the active budget', () => {
    const panel = new BudgetPanel(container, { getTakeoffResult: () => null });
    setInput(container, '#budget-name', 'B');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();

    setInput(container, '#ci-desc', 'Concreto');
    setInput(container, '#ci-unit', 'm3');
    setInput(container, '#ci-qty', '10');
    setInput(container, '#ci-price', '500');
    container.querySelector<HTMLButtonElement>('#ci-add')!.click();

    const b = panel.getManager().list()[0];
    expect(b.items).toHaveLength(1);
    expect(b.items[0].totalPrice).toBe(5000);
    // A linha renderiza inputs de edição inline: a descrição está no `value`,
    // não no texto da célula.
    expect(
      container.querySelector<HTMLInputElement>('.budget-panel__table tbody tr .ci-desc')?.value,
    ).toBe('Concreto');
  });

  it('links selected element ids to the last added item', () => {
    const panel = new BudgetPanel(container, {
      getTakeoffResult: () => null,
      getSelectedElementIds: () => ['e-1', 'e-2'],
    });
    setInput(container, '#budget-name', 'B');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();

    setInput(container, '#ci-desc', 'X');
    setInput(container, '#ci-unit', 'un');
    setInput(container, '#ci-qty', '1');
    setInput(container, '#ci-price', '1');
    container.querySelector<HTMLButtonElement>('#ci-add')!.click();

    container.querySelector<HTMLButtonElement>('#ci-link-selected')!.click();

    const item = panel.getManager().list()[0].items[0];
    expect(item.linkedElements).toEqual(['e-1', 'e-2']);
  });

  it('calculate() produces a BudgetReport against the takeoff', () => {
    const takeoff = fakeTakeoff('e-1', 4);
    const panel = new BudgetPanel(container, {
      getTakeoffResult: () => takeoff,
      getSelectedElementIds: () => ['e-1'],
    });
    setInput(container, '#budget-name', 'B');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();
    setInput(container, '#ci-desc', 'Concreto');
    setInput(container, '#ci-unit', 'm3');
    setInput(container, '#ci-qty', '5');
    setInput(container, '#ci-price', '100');
    container.querySelector<HTMLButtonElement>('#ci-add')!.click();
    container.querySelector<HTMLButtonElement>('#ci-link-selected')!.click();

    const report = panel.calculate();
    expect(report).not.toBeNull();
    expect(report!.totalBudgeted).toBe(500);
    expect(report!.totalActual).toBe(400); // 4 m3 × 100
    expect(report!.totalDelta).toBe(-100);
    expect(container.querySelector('.budget-panel__report')).not.toBeNull();
  });

  it('calculate() sets status when no takeoff is available', () => {
    const panel = new BudgetPanel(container, { getTakeoffResult: () => null });
    setInput(container, '#budget-name', 'B');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();
    panel.calculate();
    expect(container.querySelector('.budget-panel__status')?.textContent).toMatch(
      /Gere os quantitativos antes de calcular/,
    );
  });

  it('exportReport() forwards CSV through the downloader', () => {
    const calls: Array<{ filename: string; csv: string }> = [];
    const takeoff = fakeTakeoff('e-1', 2);
    const panel = new BudgetPanel(container, {
      getTakeoffResult: () => takeoff,
      getSelectedElementIds: () => ['e-1'],
      downloader: (filename, csv) => calls.push({ filename, csv }),
    });
    setInput(container, '#budget-name', 'B');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();
    setInput(container, '#ci-desc', 'X');
    setInput(container, '#ci-unit', 'm3');
    setInput(container, '#ci-qty', '5');
    setInput(container, '#ci-price', '10');
    container.querySelector<HTMLButtonElement>('#ci-add')!.click();
    container.querySelector<HTMLButtonElement>('#ci-link-selected')!.click();
    panel.calculate();
    panel.exportReport();

    expect(calls).toHaveLength(1);
    expect(calls[0].filename).toMatch(/^budget-report-.*\.csv$/);
    expect(calls[0].csv).toMatch(/item_id,description/);
  });

  it('permite editar descrição inline e persiste no manager', async () => {
    const panel = new BudgetPanel(container, { getTakeoffResult: () => null });
    setInput(container, '#budget-name', 'Obra X');
    container.querySelector<HTMLButtonElement>('#budget-create')!.click();
    setInput(container, '#ci-desc', 'Cimento');
    setInput(container, '#ci-unit', 'kg');
    setInput(container, '#ci-qty', '20');
    setInput(container, '#ci-price', '50');
    container.querySelector<HTMLButtonElement>('#ci-add')!.click();
    // Edita descrição inline
    const input = container.querySelector<HTMLInputElement>('.ci-edit.ci-desc');
    expect(input).not.toBeNull();
    input!.value = 'Cimento CPV';
    input!.dispatchEvent(new Event('blur'));
    // Aguarda microtask para update
    await new Promise((r) => setTimeout(r, 10));
    const item = panel.getManager().list()[0].items[0];
    expect(item.description).toBe('Cimento CPV');
  });
});
