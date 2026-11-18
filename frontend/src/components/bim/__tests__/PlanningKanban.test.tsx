import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach,afterEach, it, expect, vi } from 'vitest'
import PlanningKanban from '../PlanningKanban'
import { planningBoardApi } from '@/services/planning-board.service'
vi.mock('@/services/planning-board.service', () => ({
  planningBoardApi: { get: vi.fn(), save: vi.fn() },
}))
const columns = [
  { id: 'unassigned', name: 'Sem etapa' },
  { id: 'structure', name: 'Estrutura' },
]
const activities = [
  {
    id: 'a',
    name: 'Paredes',
    plannedStart: '2026-12-01',
    plannedEnd: '2026-12-10',
    elements: [{ globalId: 'GUID' }],
  },
]
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(planningBoardApi.get).mockResolvedValue({
    revision: 0,
    columns,
    assignments: {},
  })
  vi.mocked(planningBoardApi.save).mockResolvedValue({
    revision: 1,
    columns,
    assignments: { a: 'structure' },
  })
})
afterEach(()=>localStorage.clear())
it('permite apenas leitura para viewer',async()=>{
 localStorage.setItem('arxisvr_user',JSON.stringify({role:'viewer'}))
 render(<PlanningKanban scheduleId="s" activities={activities}/>);
 expect(await screen.findByLabelText('Etapa de Paredes')).toBeDisabled()
 expect(screen.getByRole('button',{name:'Nova etapa'})).toBeDisabled()
})
it('distribui a mesma atividade por etapa sem enviar progresso ou datas', async () => {
  render(<PlanningKanban scheduleId="s" activities={activities} />)
  const selector = await screen.findByLabelText('Etapa de Paredes')
  fireEvent.change(selector, { target: { value: 'structure' } })
  await waitFor(() =>
    expect(planningBoardApi.save).toHaveBeenCalledWith('s', {
      revision: 0,
      move: { activityId: 'a', columnId: 'structure' },
    }),
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Etapa atualizada',
  )
  expect(screen.getByLabelText('Etapa de Paredes')).toHaveValue('structure')
})
it('adiciona uma etapa editável com revisão do quadro', async () => {
  render(<PlanningKanban scheduleId="s" activities={activities} />)
  await screen.findByLabelText('Etapa de Paredes')
  fireEvent.click(screen.getByRole('button', { name: 'Nova etapa' }))
  fireEvent.change(screen.getByLabelText('Nome da etapa'), {
    target: { value: 'Cobertura' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar etapa' }))
  await waitFor(() =>
    expect(planningBoardApi.save).toHaveBeenCalledWith('s', {
      revision: 0,
      columns: expect.arrayContaining([
        expect.objectContaining({ name: 'Cobertura' }),
      ]),
    }),
  )
})
it('mantém erro de conflito visível e permite recarregar sem fingir sucesso', async () => {
  vi.mocked(planningBoardApi.save).mockRejectedValue(
    new Error('O quadro mudou. Recarregue.'),
  )
  render(<PlanningKanban scheduleId="s" activities={activities} />)
  fireEvent.change(await screen.findByLabelText('Etapa de Paredes'), {
    target: { value: 'structure' },
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('O quadro mudou')
  expect(screen.getByLabelText('Etapa de Paredes')).toHaveValue('unassigned')
  fireEvent.click(screen.getByRole('button', { name: 'Recarregar quadro' }))
  await waitFor(() => expect(planningBoardApi.get).toHaveBeenCalledTimes(2))
})
