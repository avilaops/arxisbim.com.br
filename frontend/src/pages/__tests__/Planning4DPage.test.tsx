import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Planning4DPage from '../Planning4DPage';
import type { Atividade, Cronograma } from '@/services/schedules.service';
import type { BimSelection } from '@/components/bim/BimWorkspace';

type ScheduleFixture = Omit<Cronograma, 'activities'> & { activities: Atividade[] };
type WorkspaceFixture = Pick<
  BimSelection,
  'projectId' | 'scenarioId' | 'modelId' | 'loading' | 'error'
> & { scenarios: Array<{ id: string; name: string }> };
const fixture = vi.hoisted(() => ({
  workspace: {} as WorkspaceFixture,
  schedule: null as ScheduleFixture | null,
}));
vi.mock('@/components/bim/BimWorkspace', () => ({
  default: ({ children }: { children: (workspace: WorkspaceFixture) => ReactNode }) =>
    children(fixture.workspace),
}));
vi.mock('@/services/schedules.service', () => ({
  schedulesService: {
    doCenario: vi.fn(async () => fixture.schedule),
    calcular: vi.fn(async () => fixture.schedule),
    criar: vi.fn(async (_p, name, startDate, scenarioId) => {
      fixture.schedule = { id: 'schedule', name, startDate, scenarioId, activities: [] };
      return fixture.schedule;
    }),
    criarAtividade: vi.fn(async (_id, data) => {
      const activity = {
        id: 'new',
        ...data,
        earlyStart: data.plannedStart,
        earlyFinish: data.plannedEnd,
      };
      fixture.schedule!.activities.push(activity);
      return activity;
    }),
    atualizarAtividade: vi.fn(async (id, data) => {
      Object.assign(
        fixture.schedule!.activities.find((a) => a.id === id)!,
        data
      );
      fixture.schedule!.activities[1].earlyFinish = '2026-11-20';
    }),
    apagarAtividade: vi.fn(async (id) => {
      fixture.schedule!.activities = fixture.schedule!.activities.filter((a) => a.id !== id);
    }),
    vincularPredecessora: vi.fn(async (id, predecessorId, options) => {
      fixture
        .schedule!.activities.find((a) => a.id === id)!
        .predecessors!.push({ predecessorId, ...options });
    }),
    desvincularPredecessora: vi.fn(async (id, predecessorId) => {
      const a = fixture.schedule!.activities.find((a) => a.id === id)!;
      a.predecessors = a.predecessors!.filter((p) => p.predecessorId !== predecessorId);
    }),
    compararPrazo: vi.fn(async () => ({
      scenarioA: { name: 'Base', schedule: { completionDate: '2026-11-10' } },
      scenarioB: { name: 'Alternativa', schedule: { completionDate: '2026-11-13' } },
      deltaDays: 3,
    })),
  },
}));
import { schedulesService } from '@/services/schedules.service';

function withSchedule() {
  fixture.schedule = {
    id: 'schedule',
    name: 'Obra',
    startDate: '2026-11-01',
    activities: [
      {
        id: 'a',
        name: 'Fundação',
        plannedStart: '2026-11-01',
        plannedEnd: '2026-11-05',
        earlyStart: '2026-11-01',
        earlyFinish: '2026-11-05',
        predecessors: [],
        elements: [{ globalId: 'ifc-a' }],
      },
      {
        id: 'b',
        name: 'Estrutura',
        plannedStart: '2026-11-01',
        plannedEnd: '2026-11-06',
        earlyStart: '2026-11-05',
        earlyFinish: '2026-11-10',
        predecessors: [{ predecessorId: 'a', type: 'FS', lagDays: 0 }],
        elements: [],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  fixture.schedule = null;
  fixture.workspace = {
    projectId: 'project',
    scenarioId: 'scenario',
    modelId: 'model',
    loading: false,
    error: null,
    scenarios: [
      { id: 'scenario', name: 'Base' },
      { id: 'other', name: 'Alternativa' },
    ],
  };
});

describe('Planejamento 4D', () => {
  it('orienta um projeto vazio sem consultar cronogramas', async () => {
    fixture.workspace.projectId = '';
    fixture.workspace.scenarioId = '';
    render(<Planning4DPage />);
    expect(screen.getByRole('link', { name: /criar projeto/i })).toHaveAttribute('href', '/app');
    expect(schedulesService.doCenario).not.toHaveBeenCalled();
  });

  it('cria um cronograma associado ao cenário selecionado', async () => {
    render(<Planning4DPage />);
    fireEvent.change(await screen.findByLabelText('Nome do cronograma'), {
      target: { value: 'Plano executivo' },
    });
    fireEvent.change(screen.getByLabelText('Início do cronograma'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar cronograma' }));
    expect(await screen.findByRole('heading', { name: 'Plano executivo' })).toBeInTheDocument();
    expect(schedulesService.criar).toHaveBeenCalledWith(
      'project',
      'Plano executivo',
      '2026-11-01',
      'scenario'
    );
  });

  it('mostra CPM, predecessoras, vínculos IFC e contexto do viewer', async () => {
    withSchedule();
    render(<Planning4DPage />);
    const gantt = await screen.findByRole('table', { name: 'Gantt do cronograma' });
    const row = within(gantt).getByRole('row', { name: /Estrutura/ });
    expect(within(row).getByText('10/11/2026')).toBeInTheDocument();
    expect(within(row).getByText(/Fundação.*FS/)).toBeInTheDocument();
    expect(screen.getByText('Prazo calculado').parentElement).toHaveTextContent('10 dias');
    expect(screen.getByRole('link', { name: /vincular elementos.*simular/i })).toHaveAttribute(
      'href',
      '/app?model=model&scenario=scenario'
    );
    expect(screen.getByText('1 de 2 atividades com elementos IFC')).toBeInTheDocument();
  });

  it('cadastra atividade e recarrega as datas calculadas', async () => {
    withSchedule();
    render(<Planning4DPage />);
    await screen.findByRole('heading', { name: 'Obra' });
    fireEvent.change(screen.getByLabelText('Nome da atividade'), {
      target: { value: 'Cobertura' },
    });
    fireEvent.change(screen.getByLabelText('Início planejado'), {
      target: { value: '2026-11-11' },
    });
    fireEvent.change(screen.getByLabelText('Fim planejado'), { target: { value: '2026-11-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
    expect(await screen.findByRole('row', { name: /Cobertura/ })).toBeInTheDocument();
    expect(schedulesService.calcular).toHaveBeenCalledWith('schedule');
  });

  it('bloqueia datas invertidas antes de gravar', async () => {
    withSchedule();
    render(<Planning4DPage />);
    await screen.findByRole('heading', { name: 'Obra' });
    fireEvent.change(screen.getByLabelText('Nome da atividade'), { target: { value: 'Inválida' } });
    fireEvent.change(screen.getByLabelText('Início planejado'), {
      target: { value: '2026-11-20' },
    });
    fireEvent.change(screen.getByLabelText('Fim planejado'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/fim.*início/i);
    expect(schedulesService.criarAtividade).not.toHaveBeenCalled();
  });

  it('edita datas e atualiza a conclusão CPM da sucessora', async () => {
    withSchedule();
    render(<Planning4DPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Fundação' }));
    fireEvent.change(screen.getByLabelText('Fim planejado'), { target: { value: '2026-11-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar atividade' }));
    const row = await screen.findByRole('row', { name: /Estrutura.*20\/11\/2026/ });
    expect(row).toBeInTheDocument();
    expect(schedulesService.calcular).toHaveBeenCalledWith('schedule');
  });

  it('remove uma atividade após confirmação explícita', async () => {
    withSchedule();
    render(<Planning4DPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Estrutura' }));
    expect(schedulesService.apagarAtividade).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() =>
      expect(screen.queryByRole('row', { name: /Estrutura/ })).not.toBeInTheDocument()
    );
  });

  it('compara prazos dos cenários usando o CPM retornado pelo servidor', async () => {
    withSchedule();
    render(<Planning4DPage />);
    await screen.findByRole('heading', { name: 'Obra' });
    fireEvent.change(screen.getByLabelText('Comparar com cenário'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Comparar prazos' }));
    expect(await screen.findByText(/3 dias depois/)).toBeInTheDocument();
  });

  it('gerencia predecessoras sem oferecer a própria atividade', async () => {
    withSchedule();
    fixture.schedule!.activities[1].predecessors = [];
    render(<Planning4DPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Estrutura' }));
    const select = screen.getByLabelText('Atividade predecessora');
    expect(within(select).queryByRole('option', { name: 'Estrutura' })).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular predecessora' }));
    const remove = await screen.findByRole('button', { name: 'Desvincular Fundação' });
    fireEvent.click(remove);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Desvincular Fundação' })).not.toBeInTheDocument()
    );
    expect(schedulesService.calcular).toHaveBeenCalledTimes(2);
  });

  it('mostra falha de leitura e permite tentar novamente', async () => {
    vi.mocked(schedulesService.doCenario).mockRejectedValueOnce(new Error('Sessão expirada'));
    render(<Planning4DPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sessão expirada');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Nome do cronograma')).toBeInTheDocument();
  });
});
