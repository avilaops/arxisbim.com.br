import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import FinancialMatrix from '../FinancialMatrix'
import { financialMatrixApi } from '@/services/financial-matrix.service'
vi.mock('@/services/financial-matrix.service', () => ({
  financialMatrixApi: { compare: vi.fn(), pdf: vi.fn() },
}))
const scenarios = [
  { id: 'a', name: 'Base' },
  { id: 'b', name: 'Alternativa' },
  { id: 'c', name: 'Sem orçamento' },
]
const row = (id: string) => ({
  id,
  name: id,
  totalCost: '100.00',
  durationDays: 10,
  completionDate: '2026-12-10',
  modelElements: 10,
  pricedElements: 5,
  costLinks: 6,
  issues: [],
  score: 10,
  rank: 1,
  deltaCost: '0.00',
  deltaDays: 0,
})
const result = {
  projectName: 'Obra',
  baselineId: 'a',
  generatedAt: '2026-11-16T12:00:00Z',
  revision: 'a'.repeat(64),
  weights: { cost: 0.6, time: 0.4 },
  scenarios: [
    row('a'),
    row('b'),
    {
      ...row('c'),
      totalCost: null,
      durationDays: null,
      score: null,
      rank: null,
      issues: ['Vincule preços.'],
    },
  ],
  warnings: ['A cobertura não comprova todos os serviços.'],
  recommendation: { winningScenarioIds: ['a', 'b'], explanation: 'Há empate.' },
}
function Location() {
  return <output aria-label="Endereço">{useLocation().search}</output>
}
function mount(url = '/orcamento?projeto=p&matriz=a,b,c&referencia=b') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <FinancialMatrix projectId="p" scenarioId="a" scenarios={scenarios} />
      <Location />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(financialMatrixApi.compare).mockResolvedValue(result)
})
describe('matriz financeira', () => {
  it('restaura seleção e referência e envia o conjunto completo ao servidor', async () => {
    mount()
    expect(screen.getByLabelText('Incluir Sem orçamento')).toBeChecked()
    expect(screen.getByLabelText('Cenário de referência')).toHaveValue('b')
    fireEvent.click(screen.getByRole('button', { name: 'Comparar matriz' }))
    await waitFor(() =>
      expect(financialMatrixApi.compare).toHaveBeenCalledWith(
        'p',
        ['a', 'b', 'c'],
        'b',
      ),
    )
    expect(await screen.findByText('Há empate.')).toBeInTheDocument()
    expect(screen.getByText('Vincule preços.')).toBeInTheDocument()
    expect(screen.getByText('Fora do ranking')).toBeInTheDocument()
  })
  it('limpa resultados e PDF ao mudar seleção e preserva contexto na URL', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Comparar matriz' }))
    await screen.findByText('Há empate.')
    fireEvent.click(screen.getByLabelText('Incluir Sem orçamento'))
    expect(
      screen.queryByRole('button', { name: 'Exportar matriz em PDF' }),
    ).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText('Endereço').textContent).toContain(
        'projeto=p',
      ),
    )
    expect(screen.getByLabelText('Endereço').textContent).toContain(
      'matriz=a%2Cb',
    )
  })
  it('impede comparar só um cenário', () => {
    mount()
    fireEvent.click(screen.getByLabelText('Incluir Sem orçamento'))
    fireEvent.click(screen.getByLabelText('Incluir Alternativa'))
    expect(
      screen.getByRole('button', { name: 'Comparar matriz' }),
    ).toBeDisabled()
  })
  it('mostra falha sem manter resultado ou exportação anterior', async () => {
    vi.mocked(financialMatrixApi.compare).mockRejectedValue(
      new Error('Cenários não encontrados.'),
    )
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Comparar matriz' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cenários não encontrados.',
    )
    expect(
      screen.queryByRole('button', { name: 'Exportar matriz em PDF' }),
    ).not.toBeInTheDocument()
  })
})
