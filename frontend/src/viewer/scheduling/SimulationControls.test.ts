import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimulationControls } from './SimulationControls';

describe('SimulationControls', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renderiza botões, speed e toggle de modo', () => {
    new SimulationControls(container);
    expect(container.querySelectorAll('.sim-controls__btn').length).toBe(3);
    expect(container.querySelector('.sim-controls__speed')).not.toBeNull();
    expect(container.querySelector('.sim-controls__mode')!.textContent).toBe('Realizado');
  });

  it('play alterna estado e dispara callback', () => {
    const onPlayToggle = vi.fn();
    const ctrl = new SimulationControls(container, { onPlayToggle });
    const play = container.querySelectorAll('.sim-controls__btn')[1] as HTMLButtonElement;
    play.click();
    expect(onPlayToggle).toHaveBeenLastCalledWith(true);
    expect(play.textContent).toBe('⏸');
    play.click();
    expect(onPlayToggle).toHaveBeenLastCalledWith(false);
    expect(play.textContent).toBe('▶');
    ctrl.destroy();
  });

  it('toggle de modo alterna realizado↔planejado e emite', () => {
    const onModeChange = vi.fn();
    const ctrl = new SimulationControls(container, { onModeChange });
    const modeBtn = container.querySelector('.sim-controls__mode') as HTMLButtonElement;
    modeBtn.click();
    expect(onModeChange).toHaveBeenLastCalledWith('planned');
    expect(modeBtn.textContent).toBe('Planejado');
    expect(ctrl.getMode()).toBe('planned');
    modeBtn.click();
    expect(onModeChange).toHaveBeenLastCalledWith('actual');
  });

  it('mudança de velocidade emite o número', () => {
    const onSpeedChange = vi.fn();
    new SimulationControls(container, { onSpeedChange });
    const select = container.querySelector('.sim-controls__speed') as HTMLSelectElement;
    select.value = '30';
    select.dispatchEvent(new Event('change'));
    expect(onSpeedChange).toHaveBeenCalledWith(30);
  });

  it('início/fim disparam callbacks', () => {
    const onGoToStart = vi.fn();
    const onGoToEnd = vi.fn();
    new SimulationControls(container, { onGoToStart, onGoToEnd });
    const btns = container.querySelectorAll('.sim-controls__btn');
    (btns[0] as HTMLButtonElement).click();
    (btns[2] as HTMLButtonElement).click();
    expect(onGoToStart).toHaveBeenCalled();
    expect(onGoToEnd).toHaveBeenCalled();
  });

  it('setDateLabel atualiza o texto', () => {
    const ctrl = new SimulationControls(container);
    ctrl.setDateLabel('15/06/2026');
    expect(container.querySelector('.sim-controls__date')!.textContent).toBe('15/06/2026');
  });
});
