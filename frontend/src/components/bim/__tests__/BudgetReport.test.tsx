import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import BudgetReport from '../BudgetReport';
import { budgetReports } from '@/services/budget-report.service';
vi.mock('@/services/budget-report.service', () => ({
  budgetReports: { get: vi.fn(), xlsx: vi.fn() },
}));
const report = {
  scenarioId: 's',
  scenarioName: 'A',
  modelVersionId: 'v',
  generatedAt: '2026-11-16T13:00:00Z',
  offset: 0,
  totalElements: 1002,
  totalLinks: 2,
  totalCost: '4.51',
  quantities: [],
  storeys: [
    {
      storeyId: 0,
      storeyName: null,
      ifcType: 'IfcWall',
      elementCount: 500,
      areaM2: '1250',
      volumeM3: null,
      lengthM: null,
    },
  ],
  costs: [
    {
      globalId: 'gid',
      ifcType: 'IfcWall',
      storeyId: 0,
      description: 'Serviço da parede',
      code: '1',
      tableName: 'Preços',
      quantity: '2.5',
      unit: 'm²',
      unitPrice: '1.005',
      totalCost: '2.51',
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(budgetReports.get).mockResolvedValue(report);
});
it('shows complete storey totals and distinguishes per-service calculation from element count', async () => {
  render(<BudgetReport scenarioId="s" />);
  expect(await screen.findByText('Pavimento 0')).toBeInTheDocument();
  expect(screen.getByText('1.250')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Ver memória dos custos por serviço'));
  expect(screen.getByText('Serviço da parede')).toBeInTheDocument();
  expect(screen.getByText('gid')).toBeInTheDocument();
});
it('exports the full workbook and allows retry after a failed report', async () => {
  vi.mocked(budgetReports.get).mockRejectedValueOnce(new Error('Falha temporária'));
  render(<BudgetReport scenarioId="s" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar relatório' }));
  await screen.findByText('Pavimento 0');
  vi.mocked(budgetReports.xlsx).mockRejectedValue(new Error('Exportação indisponível'));
  fireEvent.click(screen.getByRole('button', { name: 'Exportar quantitativos e custos • XLSX' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Exportação indisponível')
  );
  expect(budgetReports.xlsx).toHaveBeenCalledWith('s');
});
