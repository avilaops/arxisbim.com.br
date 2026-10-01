/**
 * Visibilidade por categoria IFC: a fatia minima do S10 que o S18 precisava.
 *
 * Ate 08/09/2026 o estado de visibilidade dos cenarios era sempre vazio (o
 * viewer nao tinha nenhuma acao que ocultasse algo) e o que ele guardaria era
 * o `id` de objeto three, um contador de runtime que muda a cada carga. Agora
 * o que se persiste sao **nomes de tipo IFC** (`IFCROOF`, `IFCWINDOW`...), em
 * `metadata.visibility.hiddenIfcCategories`: estavel, pequeno e legivel.
 *
 * O `web-ifc-three` entrega o modelo como UM mesh; esconder elementos e feito
 * com subsets por expressID: o mesh original sai de cena e entra um subset so
 * com o que esta visivel. Sem backend: `metadata` ja era jsonb livre.
 */
import * as WEBIFC from 'web-ifc'

/** Uma linha do painel: um nome em portugues que agrupa um ou mais tipos IFC. */
export interface Categoria {
  nome: string
  /** Nomes de tipo IFC (ex.: IFCWALL, IFCWALLSTANDARDCASE). E isto que se persiste. */
  tipos: string[]
  /** expressIDs com geometria nesses tipos. */
  ids: number[]
}

export interface VisibilidadeCenario {
  hiddenIfcCategories?: string[]
}

/** Tipos IFC com geometria que valem uma linha no painel, ja em portugues. */
const TIPOS: { tipo: number; nomeIfc: string; nome: string }[] = [
  { tipo: WEBIFC.IFCWALL, nomeIfc: 'IFCWALL', nome: 'Paredes' },
  { tipo: WEBIFC.IFCWALLSTANDARDCASE, nomeIfc: 'IFCWALLSTANDARDCASE', nome: 'Paredes' },
  { tipo: WEBIFC.IFCCURTAINWALL, nomeIfc: 'IFCCURTAINWALL', nome: 'Fachada cortina' },
  { tipo: WEBIFC.IFCSLAB, nomeIfc: 'IFCSLAB', nome: 'Lajes e pisos' },
  { tipo: WEBIFC.IFCROOF, nomeIfc: 'IFCROOF', nome: 'Cobertura' },
  { tipo: WEBIFC.IFCWINDOW, nomeIfc: 'IFCWINDOW', nome: 'Janelas' },
  { tipo: WEBIFC.IFCDOOR, nomeIfc: 'IFCDOOR', nome: 'Portas' },
  { tipo: WEBIFC.IFCCOLUMN, nomeIfc: 'IFCCOLUMN', nome: 'Pilares' },
  { tipo: WEBIFC.IFCBEAM, nomeIfc: 'IFCBEAM', nome: 'Vigas' },
  { tipo: WEBIFC.IFCMEMBER, nomeIfc: 'IFCMEMBER', nome: 'Barras e montantes' },
  { tipo: WEBIFC.IFCPLATE, nomeIfc: 'IFCPLATE', nome: 'Chapas' },
  { tipo: WEBIFC.IFCSTAIR, nomeIfc: 'IFCSTAIR', nome: 'Escadas' },
  { tipo: WEBIFC.IFCSTAIRFLIGHT, nomeIfc: 'IFCSTAIRFLIGHT', nome: 'Escadas' },
  { tipo: WEBIFC.IFCRAMP, nomeIfc: 'IFCRAMP', nome: 'Rampas' },
  { tipo: WEBIFC.IFCRAILING, nomeIfc: 'IFCRAILING', nome: 'Guarda-corpos' },
  { tipo: WEBIFC.IFCCOVERING, nomeIfc: 'IFCCOVERING', nome: 'Revestimentos' },
  { tipo: WEBIFC.IFCFOOTING, nomeIfc: 'IFCFOOTING', nome: 'Fundações' },
  { tipo: WEBIFC.IFCPILE, nomeIfc: 'IFCPILE', nome: 'Estacas' },
  { tipo: WEBIFC.IFCFURNISHINGELEMENT, nomeIfc: 'IFCFURNISHINGELEMENT', nome: 'Mobiliário' },
  { tipo: WEBIFC.IFCFLOWTERMINAL, nomeIfc: 'IFCFLOWTERMINAL', nome: 'Instalações' },
  { tipo: WEBIFC.IFCFLOWSEGMENT, nomeIfc: 'IFCFLOWSEGMENT', nome: 'Instalações' },
  { tipo: WEBIFC.IFCFLOWFITTING, nomeIfc: 'IFCFLOWFITTING', nome: 'Instalações' },
  { tipo: WEBIFC.IFCSITE, nomeIfc: 'IFCSITE', nome: 'Terreno' },
  { tipo: WEBIFC.IFCBUILDINGELEMENTPROXY, nomeIfc: 'IFCBUILDINGELEMENTPROXY', nome: 'Outros elementos' },
]

/** Nome em portugues de um tipo IFC persistido (para o painel de diferencas). */
export function nomeDaCategoria(nomeIfc: string): string {
  return TIPOS.find((t) => t.nomeIfc === nomeIfc)?.nome ?? nomeIfc
}

/** Interface minima do `loader.ifcManager` que usamos (evita depender dos tipos internos). */
export interface GerenteIfc {
  getAllItemsOfType: (modelID: number, type: number, verbose: boolean) => Promise<any[]>
  createSubset: (config: {
    modelID: number
    ids: number[]
    removePrevious: boolean
    scene?: any
    material?: any
    customID?: string
  }) => any
  removeSubset: (modelID: number, material?: any, customID?: string) => void
}

/** Categorias presentes no modelo (so as que tem geometria), maiores primeiro. */
export async function listarCategorias(manager: GerenteIfc, modelID: number): Promise<Categoria[]> {
  const porNome = new Map<string, { tipos: Set<string>; ids: Set<number> }>()
  for (const { tipo, nomeIfc, nome } of TIPOS) {
    let ids: number[] = []
    try {
      ids = (await manager.getAllItemsOfType(modelID, tipo, false)) as number[]
    } catch {
      continue
    }
    if (!ids.length) continue
    const grupo = porNome.get(nome) ?? { tipos: new Set<string>(), ids: new Set<number>() }
    grupo.tipos.add(nomeIfc)
    ids.forEach((id) => grupo.ids.add(id))
    porNome.set(nome, grupo)
  }
  return [...porNome.entries()]
    .map(([nome, g]) => ({ nome, tipos: [...g.tipos], ids: [...g.ids].sort((a, b) => a - b) }))
    .sort((a, b) => b.ids.length - a.ids.length)
}

/** Todos os expressIDs com geometria no mesh (atributo `expressID` da geometria). */
export function todosExpressIds(model: any): number[] {
  const attr = model?.geometry?.attributes?.expressID
  if (!attr) return []
  const arr = attr.array as ArrayLike<number>
  const vistos = new Set<number>()
  for (let i = 0; i < arr.length; i++) vistos.add(arr[i])
  return [...vistos]
}

/** expressIDs das categorias que tem algum destes tipos IFC. */
export function idsDosTipos(categorias: Categoria[], tipos: Iterable<string>): Set<number> {
  const procurados = new Set(tipos)
  const ids = new Set<number>()
  for (const c of categorias) {
    if (c.tipos.some((t) => procurados.has(t))) c.ids.forEach((id) => ids.add(id))
  }
  return ids
}

/** expressIDs das categorias cujo tipo IFC esta em `tiposOcultos`. */
export function idsOcultos(categorias: Categoria[], tiposOcultos: Iterable<string>): Set<number> {
  return idsDosTipos(categorias, tiposOcultos)
}

export const SUBSET_VISIVEL = 'arxis-visivel'
export const SUBSET_DESTAQUE = 'arxis-destaque'

/**
 * Deixa visivel tudo menos `ocultos` (e menos `excluir`, usado pela comparacao
 * para tirar do subset normal o que vai ganhar material de destaque).
 * Com nada oculto, o mesh original volta e o subset some: e o caminho mais
 * barato e o que o viewer sempre teve.
 */
export function aplicarVisibilidade(
  manager: GerenteIfc,
  model: any,
  scene: any,
  todos: number[],
  ocultos: Set<number>,
  excluir: Set<number> = new Set(),
): void {
  const modelID = model.modelID as number
  if (!ocultos.size && !excluir.size) {
    try { manager.removeSubset(modelID, undefined, SUBSET_VISIVEL) } catch { /* nao havia */ }
    model.visible = true
    return
  }
  const ids = todos.filter((id) => !ocultos.has(id) && !excluir.has(id))
  model.visible = false
  if (!ids.length) {
    try { manager.removeSubset(modelID, undefined, SUBSET_VISIVEL) } catch { /* nao havia */ }
    return
  }
  manager.createSubset({ modelID, ids, scene, removePrevious: true, customID: SUBSET_VISIVEL })
}

/** Subset colorido com `ids` (o destaque da comparacao). `material` e um Material do three. */
export function aplicarDestaque(manager: GerenteIfc, model: any, scene: any, ids: number[], material: any): void {
  const modelID = model.modelID as number
  try { manager.removeSubset(modelID, material, SUBSET_DESTAQUE) } catch { /* nao havia */ }
  if (!ids.length) return
  manager.createSubset({ modelID, ids, scene, removePrevious: true, material, customID: SUBSET_DESTAQUE })
}

export interface DiferencaCategoria {
  nome: string
  tipos: string[]
  /** 'A' = visivel so em A (oculta em B); 'B' = visivel so em B (oculta em A). */
  visivelEm: 'A' | 'B'
}

/**
 * Diferenca de visibilidade entre dois cenarios, por categoria. O estado e a
 * fonte da verdade: nao se compara pixel, compara-se o que cada cenario
 * declarou oculto. Uma linha por categoria presente no modelo.
 */
export function diferencaVisibilidade(
  categorias: Categoria[],
  hiddenA: string[] | undefined,
  hiddenB: string[] | undefined,
): DiferencaCategoria[] {
  const a = new Set(hiddenA ?? [])
  const b = new Set(hiddenB ?? [])
  const saida: DiferencaCategoria[] = []
  for (const c of categorias) {
    const ocultaEmA = c.tipos.some((t) => a.has(t))
    const ocultaEmB = c.tipos.some((t) => b.has(t))
    if (ocultaEmA === ocultaEmB) continue
    saida.push({ nome: c.nome, tipos: c.tipos, visivelEm: ocultaEmA ? 'B' : 'A' })
  }
  return saida
}

/**
 * GlobalId × expressID (S26).
 *
 * O 4D vincula elemento por **GlobalId** (identidade IFC, estável entre
 * reexportações do modelo) e o viewer só conhece **expressID** (índice de
 * arquivo, usado pelos subsets do web-ifc-three). Este é o descasamento que
 * travava o S26: a ponte não existia em lugar nenhum vivo.
 *
 * A tradução vem de `getAllItemsOfType(..., verbose = true)`: uma chamada por
 * tipo IFC devolve as propriedades de todos os elementos daquele tipo, com
 * `GlobalId`. É ~24 chamadas contra uma por elemento, que em modelo real seriam
 * milhares.
 */
export interface MapaIfc {
  /** expressID → GlobalId. */
  porExpress: Map<number, string>
  /** GlobalId → expressIDs (um GlobalId pode repetir se o IFC estiver sujo). */
  porGlobal: Map<string, number[]>
}

export async function mapearGlobalIds(manager: GerenteIfc, modelID: number): Promise<MapaIfc> {
  const porExpress = new Map<number, string>()
  const porGlobal = new Map<string, number[]>()

  for (const { tipo } of TIPOS) {
    let itens: any[] = []
    try {
      itens = (await manager.getAllItemsOfType(modelID, tipo, true)) as any[]
    } catch {
      continue
    }
    for (const item of itens ?? []) {
      const expressId = Number(item?.expressID)
      const globalId = String(item?.GlobalId?.value ?? item?.GlobalId ?? '').trim()
      if (!Number.isFinite(expressId) || !globalId) continue
      porExpress.set(expressId, globalId)
      const lista = porGlobal.get(globalId)
      if (lista) lista.push(expressId)
      else porGlobal.set(globalId, [expressId])
    }
  }

  return { porExpress, porGlobal }
}

/** expressIDs de um conjunto de GlobalIds (o que os subsets precisam). */
export function expressIdsDe(mapa: MapaIfc, globalIds: Iterable<string>): Set<number> {
  const ids = new Set<number>()
  for (const globalId of globalIds) {
    for (const expressId of mapa.porGlobal.get(globalId) ?? []) ids.add(expressId)
  }
  return ids
}

/** GlobalIds de um conjunto de expressIDs (o que o vínculo persiste). */
export function globalIdsDe(mapa: MapaIfc, expressIds: Iterable<number>): string[] {
  const globalIds = new Set<string>()
  for (const expressId of expressIds) {
    const globalId = mapa.porExpress.get(expressId)
    if (globalId) globalIds.add(globalId)
  }
  return [...globalIds]
}
