import { buildApiV1Url } from '@/config/apiBaseUrl'

/**
 * Cronogramas 4D (S26).
 *
 * Fala com o módulo `scheduling` do backend, que já existia inteiro e nunca
 * teve tela: `schedules` (opcionalmente por cenário), `activities`,
 * `activity_predecessors` e `activity_elements` (vínculo por **GlobalId** IFC).
 * Em 11/09/2026 as quatro tabelas tinham 0 linhas em produção — não porque o
 * backend falhasse, mas porque não havia por onde um usuário criar cronograma.
 *
 * Duas escolhas que não são estilo:
 *
 *   - O cronograma é **por cenário** (`scenarioId`). É o que faz A e B terem
 *     prazos diferentes e, portanto, o que faz a comparação temporal existir.
 *     `GET /scenarios/:a/:b/timeline-comparison` pega o cronograma mais recente
 *     de cada cenário, roda CPM nos dois e devolve `deltaDays`.
 *   - O vínculo com o modelo é por **GlobalId**, não por expressID. O expressID
 *     é índice de arquivo: muda quando o IFC é reexportado. O viewer só conhece
 *     expressID, então a tradução acontece na hora de salvar (ver
 *     `visibilidadeIfc.mapearGlobalIds`).
 */

export interface ElementoVinculado {
  globalId: string
  stateDuring?: string | null
}

export interface PredecessoraVinculada {
  predecessorId: string
  lagDays?: number | null
  type?: string | null
}

export interface Atividade {
  id: string
  scheduleId?: string
  name: string
  plannedStart: string
  plannedEnd: string
  durationDays?: number | null
  wbsCode?: string | null
  sortOrder?: number | null
  /** Data do forward pass. Divergem da planejada quando há predecessora. */
  earlyStart?: string
  earlyFinish?: string
  predecessors?: PredecessoraVinculada[]
  elements?: ElementoVinculado[]
}

export interface Cronograma {
  id: string
  projectId: string
  scenarioId?: string | null
  name: string
  startDate: string
  source?: string
  isLegacy?: boolean
  activities?: Atividade[]
}

export interface LadoComparacao {
  id: string
  name: string
  schedule: {
    id: string
    name: string
    startDate: string
    completionDate: string
    activities: Atividade[]
  } | null
}

export interface ComparacaoTemporal {
  scenarioA: LadoComparacao
  scenarioB: LadoComparacao
  /** Positivo: B termina depois de A. Null quando falta cronograma de um lado. */
  deltaDays: number | null
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
  }
}

async function parse<T>(response: Response, acao: string): Promise<T> {
  if (!response.ok) {
    const detalhe = await response.json().catch(() => null)
    throw new Error(detalhe?.error || `${acao} falhou (HTTP ${response.status})`)
  }
  return response.json() as Promise<T>
}

export const schedulesService = {
  /** Cronogramas do projeto. A rota mistura os legados (`isLegacy`), que o S26 ignora. */
  async listarDoProjeto(projectId: string): Promise<Cronograma[]> {
    const url = buildApiV1Url(`/projects/${projectId}/schedules`)
    const lista = await parse<Cronograma[]>(await fetch(url, { headers: authHeaders() }), 'Listar cronogramas')
    return Array.isArray(lista) ? lista.filter((c) => !c.isLegacy) : []
  },

  /**
   * Cronograma do cenário já calculado, ou null. Mais recente primeiro, como
   * faz a comparação A×B — dois cronogramas no mesmo cenário seriam ambíguos.
   */
  async doCenario(projectId: string, scenarioId: string): Promise<Cronograma | null> {
    const lista = await this.listarDoProjeto(projectId)
    const doCenario = lista.filter((c) => c.scenarioId === scenarioId)
    if (!doCenario.length) return null
    const calculado = await this.calcular(doCenario[0].id)
    return { ...doCenario[0], ...calculado }
  },

  /**
   * Cronograma completo com as datas do CPM. É esta rota, e não o `GET
   * /schedules/:id` cru, porque a régua de tempo precisa da data que o forward
   * pass produziu: com predecessoras, a planejada e a calculada divergem, e
   * mostrar a planejada faria o encadeamento parecer sem efeito.
   */
  async calcular(scheduleId: string): Promise<Cronograma> {
    const url = buildApiV1Url(`/schedules/${scheduleId}/cpm`)
    return parse<Cronograma>(await fetch(url, { headers: authHeaders() }), 'Abrir cronograma')
  },

  async criar(projectId: string, nome: string, dataInicio: string, scenarioId: string): Promise<Cronograma> {
    const response = await fetch(buildApiV1Url(`/projects/${projectId}/schedules`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: nome, startDate: dataInicio, scenarioId, source: 'manual' }),
    })
    return parse<Cronograma>(response, 'Criar cronograma')
  },

  async apagar(scheduleId: string): Promise<void> {
    const response = await fetch(buildApiV1Url(`/schedules/${scheduleId}`), {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!response.ok) throw new Error(`Apagar cronograma falhou (HTTP ${response.status})`)
  },

  async criarAtividade(
    scheduleId: string,
    dados: { name: string; plannedStart: string; plannedEnd: string; sortOrder?: number },
  ): Promise<Atividade> {
    const response = await fetch(buildApiV1Url(`/schedules/${scheduleId}/activities`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(dados),
    })
    return parse<Atividade>(response, 'Criar atividade')
  },

  async atualizarAtividade(
    activityId: string,
    dados: Partial<{ name: string; plannedStart: string; plannedEnd: string; sortOrder: number }>,
  ): Promise<Atividade> {
    const response = await fetch(buildApiV1Url(`/activities/${activityId}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(dados),
    })
    return parse<Atividade>(response, 'Atualizar atividade')
  },

  async apagarAtividade(activityId: string): Promise<void> {
    const response = await fetch(buildApiV1Url(`/activities/${activityId}`), {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!response.ok) throw new Error(`Apagar atividade falhou (HTTP ${response.status})`)
  },

  /**
   * Vincula elementos do modelo à atividade. Recebe GlobalIds — a tradução a
   * partir dos expressIDs da categoria acontece na tela, com o modelo aberto.
   * Em lote porque uma categoria IFC costuma trazer centenas de elementos.
   */
  async vincularElementos(activityId: string, globalIds: string[]): Promise<number> {
    if (!globalIds.length) return 0
    const response = await fetch(buildApiV1Url(`/activities/${activityId}/elements/bulk`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ elements: globalIds.map((globalId) => ({ globalId, stateDuring: 'active' })) }),
    })
    const inseridos = await parse<unknown[]>(response, 'Vincular elementos')
    return Array.isArray(inseridos) ? inseridos.length : globalIds.length
  },


  /** Encadeia atividades (padrão FS, sem folga): é o que dá trabalho ao CPM. */
  async vincularPredecessora(
    activityId: string,
    predecessorId: string,
    opcoes: { lagDays?: number; type?: 'FS' | 'SS' | 'FF' | 'SF' } = {},
  ): Promise<PredecessoraVinculada> {
    const response = await fetch(buildApiV1Url(`/activities/${activityId}/predecessors`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        predecessorId,
        lagDays: opcoes.lagDays ?? 0,
        type: opcoes.type ?? 'FS',
      }),
    })
    return parse<PredecessoraVinculada>(response, 'Vincular predecessora')
  },

  async desvincularPredecessora(activityId: string, predecessorId: string): Promise<void> {
    const url = buildApiV1Url(`/activities/${activityId}/predecessors/${predecessorId}`)
    const response = await fetch(url, { method: 'DELETE', headers: authHeaders() })
    if (!response.ok) throw new Error(`Desvincular predecessora falhou (HTTP ${response.status})`)
  },

  /** Comparação temporal A×B: CPM dos dois lados e a diferença de prazo. */
  async compararPrazo(idA: string, idB: string): Promise<ComparacaoTemporal> {
    const url = buildApiV1Url(`/scenarios/${idA}/${idB}/timeline-comparison`)
    return parse<ComparacaoTemporal>(await fetch(url, { headers: authHeaders() }), 'Comparar prazos')
  },
}
