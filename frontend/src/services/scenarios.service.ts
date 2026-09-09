import { buildApiV1Url } from '@/config/apiBaseUrl'

/**
 * Cenários (S12).
 *
 * Fala com `/api/v1/projects/:projectId/scenarios`, e **não** com o CRUD plano
 * `/api/v1/scenarios`. A escolha não é estilo, é a única que funciona:
 *
 *   - O CRUD plano (`modules/scenario`) só aceita `name`, `description` e um
 *     `config` fechado por zod (movementSpeed, crouchMultiplier, minimap...).
 *     Não há campo para câmera nem visibilidade, e o `/scenarios/:id/update`
 *     dele é tick de game loop (`deltaTime`), não "salvar".
 *   - Este aqui (`modules/scenarios`) grava `camera`, `player` e `metadata`,
 *     que são jsonb livres na tabela `scenarios`.
 *
 * Guardamos a câmera em `camera` e a visibilidade em
 * `metadata.visibility.hiddenIfcCategories` (nomes de tipo IFC, estáveis).
 * O antigo `metadata.hidden` (ids de objeto three) nunca teve conteúdo em
 * produção e é ignorado.
 * `player` e `config` são obrigatórios na criação, então vão preenchidos com o
 * mínimo que o backend aceita.
 */

export interface CameraState {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
}

export interface Scenario {
  id: string
  name: string
  projectId: string
  camera?: CameraState | null
  metadata?: { hidden?: number[]; visibility?: { hiddenIfcCategories?: string[] } } | null
  createdAt?: string
  updatedAt?: string
}

/** O backend exige `player` e `config` no create; nada disso é usado pelo S12. */
const PLAYER_PADRAO = { position: { x: 0, y: 0, z: 0 }, rotation: { pitch: 0, yaw: 0, roll: 0 } }
const CONFIG_PADRAO = { movementSpeed: 5, rotationSpeed: 90 }

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

export const scenariosService = {
  async list(projectId: string): Promise<Scenario[]> {
    const url = buildApiV1Url(`/projects/${projectId}/scenarios`)
    const body = await parse<any>(await fetch(url, { headers: authHeaders() }), 'Listar cenários')
    // A rota devolve a lista crua; tolera envelope caso isso mude.
    const lista = Array.isArray(body) ? body : (body?.data ?? body?.scenarios ?? [])
    return Array.isArray(lista) ? lista : []
  },

  async create(projectId: string, name: string, camera: CameraState | null): Promise<Scenario> {
    const response = await fetch(buildApiV1Url(`/projects/${projectId}/scenarios`), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        projectId,
        name,
        camera: camera ?? { position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
        player: PLAYER_PADRAO,
        config: CONFIG_PADRAO,
        metadata: {},
      }),
    })
    return parse<Scenario>(response, 'Criar cenário')
  },

  async getById(projectId: string, scenarioId: string): Promise<Scenario> {
    const url = buildApiV1Url(`/projects/${projectId}/scenarios/${scenarioId}`)
    return parse<Scenario>(await fetch(url, { headers: authHeaders() }), 'Abrir cenário')
  },

  /**
   * Salva o estado do viewer. O PUT sobrescreve os campos que recebe, então
   * `name` vai junto para não ser apagado.
   */
  async saveState(
    projectId: string,
    scenarioId: string,
    name: string,
    camera: CameraState,
    hiddenIfcCategories: string[],
  ): Promise<Scenario> {
    const response = await fetch(
      buildApiV1Url(`/projects/${projectId}/scenarios/${scenarioId}`),
      {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          camera,
          player: PLAYER_PADRAO,
          config: CONFIG_PADRAO,
          metadata: { visibility: { hiddenIfcCategories } },
        }),
      },
    )
    return parse<Scenario>(response, 'Salvar cenário')
  },

  async remove(projectId: string, scenarioId: string): Promise<void> {
    const url = buildApiV1Url(`/projects/${projectId}/scenarios/${scenarioId}`)
    const response = await fetch(url, { method: 'DELETE', headers: authHeaders() })
    if (!response.ok) throw new Error(`Apagar cenário falhou (HTTP ${response.status})`)
  },
}
