/**
 * dev-s35-demo — harness visual do S35 (NÃO faz parte do build de produção).
 * Monta GanttTimeline + SimulationControls + SimulationEngine com dados de
 * exemplo e um loop de playback local (sem backend/3D), exibindo a contagem de
 * estados por elemento ao vivo enquanto a timeline avança.
 */
import { SimulationEngine, type ConstructionTask, type ScheduleViewMode } from './SimulationEngine';
import { GanttTimeline } from './GanttTimeline';
import { SimulationControls } from './SimulationControls';

const tasks: ConstructionTask[] = [
  { id: 'v3', name: 'Concretagem das vigas do 3º pavimento', plannedStart: '2026-06-01', plannedEnd: '2026-06-10', actualStart: '2026-06-01', percentComplete: 60, elementIds: ['VIGA_1', 'VIGA_2'] },
  { id: 'p0', name: 'Execução dos pilares do térreo', plannedStart: '2026-06-01', plannedEnd: '2026-06-05', actualStart: '2026-06-01', actualEnd: '2026-06-05', percentComplete: 100, elementIds: ['PILAR_1'] },
  { id: 'l2', name: 'Lançamento da laje do 2º pavimento', plannedStart: '2026-06-04', plannedEnd: '2026-06-09', percentComplete: 15, elementIds: ['LAJE_1'] }, // atrasada (sem início real)
  { id: 'al', name: 'Alvenaria do 1º pavimento', plannedStart: '2026-06-08', plannedEnd: '2026-06-16', actualStart: '2026-06-10', percentComplete: 30, elementIds: ['PAREDE_1', 'PAREDE_2'] },
  { id: 'mob', name: 'Mobilização do canteiro', plannedStart: '2026-06-01', plannedEnd: '2026-06-02', actualEnd: '2026-06-02', percentComplete: 100, elementIds: ['CANTEIRO'] },
];

const STATE_COLOR: Record<string, string> = {
  not_started: '#64748b', active: '#eab308', delayed: '#dc2626', complete: '#10b981',
};
const STATE_LABEL: Record<string, string> = {
  not_started: 'Planejado', active: 'Em execução', delayed: 'Atrasado', complete: 'Concluído',
};

function mount(): void {
  const root = document.getElementById('s35-root')!;
  const controlsEl = document.createElement('div');
  const ganttEl = document.createElement('div');
  ganttEl.style.marginTop = '12px';
  const legendEl = document.createElement('div');
  legendEl.className = 's35-legend';
  legendEl.style.marginTop = '12px';
  root.append(controlsEl, ganttEl, legendEl);

  const engine = new SimulationEngine();
  engine.setTasks(tasks);
  const bounds = engine.getBounds()!;

  const gantt = new GanttTimeline(ganttEl, {
    onTaskClick: (id) => { (document.getElementById('s35-clicked')!).textContent = `Câmera focaria a tarefa: ${id}`; },
    onSeek: (date) => seek(date),
  });
  gantt.setTasks(tasks);

  const controls = new SimulationControls(controlsEl, {
    onPlayToggle: (p) => (p ? play() : pause()),
    onSpeedChange: (s) => (speed = s),
    onGoToStart: () => seek(bounds.start),
    onGoToEnd: () => seek(bounds.end),
    onModeChange: (m) => { mode = m; engine.setMode(m); render(); },
  });

  let mode: ScheduleViewMode = 'actual';
  let current = bounds.start.getTime();
  let speed = 7; // dias por segundo
  let playing = false;
  let raf = 0;
  let last = 0;

  function render(): void {
    const date = new Date(current);
    const states = engine.computeAt(date);
    gantt.setCursorDate(date);
    controls.setDateLabel(new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date));

    const counts: Record<string, number> = { not_started: 0, active: 0, delayed: 0, complete: 0 };
    for (const s of Object.values(states)) if (s in counts) counts[s]++;
    legendEl.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">Estado dos elementos (${mode === 'planned' ? 'Planejado' : 'Realizado'}) — ${date.toISOString().slice(0, 10)}</div>` +
      Object.keys(counts).map(k =>
        `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;">
           <span style="width:12px;height:12px;border-radius:3px;background:${STATE_COLOR[k]};display:inline-block;"></span>
           ${STATE_LABEL[k]}: <b>${counts[k]}</b>
         </span>`).join('');
  }

  function seek(d: Date): void { current = Math.max(bounds.start.getTime(), Math.min(bounds.end.getTime(), d.getTime())); render(); }

  function tick(now: number): void {
    if (!playing) return;
    if (!last) last = now;
    const dt = (now - last) / 1000; last = now;
    current += dt * speed * 86_400_000;
    if (current >= bounds.end.getTime()) { current = bounds.end.getTime(); render(); pause(); controls.setPlaying(false); return; }
    render();
    raf = requestAnimationFrame(tick);
  }
  function play(): void { if (playing) return; playing = true; last = 0; raf = requestAnimationFrame(tick); }
  function pause(): void { playing = false; if (raf) cancelAnimationFrame(raf); }

  render();
  (window as any).__s35 = { play, pause, seek, engine };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
