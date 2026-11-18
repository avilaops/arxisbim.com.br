import { bimRequest } from './bim-api'
import { sessionFetch } from '@/core/auth/session-redirect'
import { buildApiV1Url } from '@/config/apiBaseUrl'

export interface Settings {
  name: string
  area: string
  months: number
  start_date: string
  bdi: string
  scope: 'full' | 'material' | 'labor'
  revision: number
}
export interface Service {
  id: string
  revision: number
  stage: string
  description: string
  unit: string
  quantity: string | null
  material: string | null
  labor: string | null
  equipment: string | null
  combined: string | null
  evidence: string
  assumption: string
  issue: string
  status: 'ready' | 'estimated' | 'pending'
  activity_id: string | null
  document_id: string | null
  page: number | null
  global_id: string | null
  storey: string | null
  version_id: string | null
  executed: string
  total: string | null
  observed: string
  plannedToDate: string | null
  remaining: string | null
}
export interface Period {
  month: string
  planned: string
  cumulative: string
  paid: string
  cumulativePaid: string
}
export interface Workspace {
  settings: Settings
  version: string | null
  activities: { id: string; name: string; start: string; end: string }[]
  entries: {
    id: string
    service_id: string
    measured_on: string
    quantity: string
    paid: string
    note: string
  }[]
  documents: { id: string; filename: string; discipline: string; pages: number }[]
  categories: string[]
  items: { id: string; description: string; unit: string; table_name: string }[]
  report: {
    asOf: string
    lines: Service[]
    periods: Period[]
    stages: { stage: string; months: Record<string, string> }[]
    total: string
    direct: string
    bdi: string
    estimated: string
    paid: string
    unallocated: string
    perM2: string
  }
}
export const statusName = {
  ready: 'Pronto para orçar',
  estimated: 'Estimado com premissa',
  pending: 'Pendente',
}
export const scopeName = {
  full: 'Materiais, mão de obra e equipamentos',
  material: 'Somente materiais',
  labor: 'Somente mão de obra',
}
export const obraPath = (scenario: string) => '/scenarios/' + encodeURIComponent(scenario) + '/obra'
export const loadObra = (scenario: string) =>
  bimRequest<Workspace | { settings: null }>(obraPath(scenario))
export function writeObra(scenario: string, path: string, method: string, body: unknown) {
  return bimRequest<{ id?: string; added?: number; duplicate?: boolean }>(
    obraPath(scenario) + path,
    { method, body: body instanceof FormData ? body : JSON.stringify(body) },
  )
}
async function download(path: string, filename: string) {
  const response = await sessionFetch(buildApiV1Url(path), {
    headers: { Authorization: 'Bearer ' + localStorage.getItem('arxisvr_token') },
  })
  if (!response.ok) throw new Error('Falha ao baixar o documento.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export const openDocument = (scenario: string, id: string, filename: string) =>
  download(obraPath(scenario) + '/documents/' + id, filename)
export const downloadReport = (scenario: string) =>
  download(obraPath(scenario) + '/report.pdf', 'orcamento-da-obra.pdf')
