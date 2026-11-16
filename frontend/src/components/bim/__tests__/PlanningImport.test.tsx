import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import PlanningImport from '../PlanningImport';
import { planningImportApi } from '@/services/planning-import.service';
vi.mock('@/services/planning-import.service', () => ({
  planningImportApi: { preview: vi.fn(), apply: vi.fn() },
}));
const preview = {
  revision: 'r1',
  scheduleId: 's',
  source: 'csv',
  inserted: 1,
  updated: 1,
  kept: 2,
  total: 2,
  activities: [
    {
      externalId: 'A',
      name: 'Fundação',
      plannedStart: '2026-12-01',
      plannedEnd: '2026-12-02',
      predecessors: [],
      action: 'update',
    },
  ],
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(planningImportApi.preview).mockResolvedValue(preview);
  vi.mocked(planningImportApi.apply).mockResolvedValue({
    scheduleId: 's',
    inserted: 1,
    updated: 1,
    kept: 2,
  });
});
async function openPreview() {
  fireEvent.click(screen.getByText('Importar cronograma • CSV, XML ou XER'));
  fireEvent.change(screen.getByLabelText('Nome do cronograma importado'), {
    target: { value: 'Plano' },
  });
  const file = new File(['id,name,start,end\nA,Fundação,2026-12-01,2026-12-02'], 'obra.csv', {
    type: 'text/csv',
  });
  Object.defineProperty(file, 'text', {
    value: async () => 'id,name,start,end\nA,Fundação,2026-12-01,2026-12-02',
  });
  fireEvent.change(screen.getByLabelText('Arquivo de cronograma'), { target: { files: [file] } });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gerar prévia' })).not.toBeDisabled()
  );
  fireEvent.submit(screen.getByRole('button', { name: 'Gerar prévia' }).closest('form')!);
  await screen.findByText('Fundação');
}
it('requires a preview and confirmation, then applies its revision and refreshes the page', async () => {
  const done = vi.fn();
  render(<PlanningImport projectId="p" scenarioId="c" scheduleName="" onImported={done} />);
  await openPreview();
  const apply = screen.getByRole('button', { name: 'Aplicar importação' });
  expect(apply).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Confirmo as alterações/));
  fireEvent.click(apply);
  await waitFor(() => expect(done).toHaveBeenCalled());
  expect(planningImportApi.apply).toHaveBeenCalledWith(
    'p',
    expect.objectContaining({ scenarioId: 'c', revision: 'r1' })
  );
});
it('invalidates a stale preview and shows validation details without applying', async () => {
  vi.mocked(planningImportApi.apply).mockRejectedValue(
    new Error('O cronograma mudou desde a prévia.')
  );
  render(<PlanningImport projectId="p" scenarioId="c" scheduleName="" onImported={vi.fn()} />);
  await openPreview();
  fireEvent.click(screen.getByLabelText(/Confirmo as alterações/));
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar importação' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('O cronograma mudou');
  expect(screen.queryByRole('button', { name: 'Aplicar importação' })).not.toBeInTheDocument();
});
it('hides import controls for a read-only role', () => {
  localStorage.setItem('arxisvr_user', JSON.stringify({ role: 'viewer' }));
  render(<PlanningImport projectId="p" scenarioId="c" scheduleName="" onImported={vi.fn()} />);
  expect(screen.queryByLabelText('Arquivo de cronograma')).not.toBeInTheDocument();
});
