import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import { bimRequest } from '@/services/bim-api'
import type { Scenario } from '@/services/scenarios.service'
import { scenariosService } from '@/services/scenarios.service'
import '@/styles/bim-workspace.css'

export interface BimProject {
  id: string
  name: string
}
export interface BimModel {
  id: string
  originalName: string
  metadata?: Record<string, unknown>
}
export interface BimSelection {
  projects: BimProject[]
  scenarios: Scenario[]
  models: BimModel[]
  projectId: string
  scenarioId: string
  modelId: string
  project: BimProject | null
  scenario: Scenario | null
  model: BimModel | null
  loading: boolean
  error: string | null
  setProjectId: (id: string) => void
  setScenarioId: (id: string) => void
  setModelId: (id: string) => void
  reload: () => Promise<void>
}

export default function BimWorkspace({
  title,
  description,
  allowDocumentOnly = false,
  children,
}: {
  title: string
  description: string
  allowDocumentOnly?: boolean
  children: (selection: BimSelection) => ReactNode
}) {
  const [query, setQuery] = useSearchParams()
  const requested = useRef({
    project:
      query.get('projeto') || localStorage.getItem('arxisvr_project_id') || '',
    scenario: query.get('cenario') || '',
    model: query.get('modelo') || '',
  })
  const [projects, setProjects] = useState<BimProject[]>([])
  const [models, setModels] = useState<BimModel[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [projectId, selectProject] = useState(requested.current.project)
  const [scenarioId, selectScenario] = useState('')
  const [modelId, selectModel] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingContext, setLoadingContext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [creating,setCreating] = useState(false)
  const [createError,setCreateError] = useState('')

  useEffect(() => {
    let cancelled = false
    bimRequest<{ items: BimProject[] }>('/projects?pageSize=100')
      .then((result) => {
        if (cancelled) return
        const list = result.items || []
        setProjects(list)
        selectProject((current) =>
          list.some((p) => p.id === current) ? current : list[0]?.id || '',
        )
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      loadingProjects ||
      !projects.some((project) => project.id === projectId)
    )
      return
    let cancelled = false
    setLoadingContext(true)
    setError(null)
    Promise.all([
      bimRequest<BimModel[]>(`/ifc/project/${projectId}`),
      bimRequest<Scenario[]>(`/projects/${projectId}/scenarios`),
    ])
      .then(([modelList, scenarioList]) => {
        if (cancelled) return
        if (!Array.isArray(modelList) || !Array.isArray(scenarioList))
          throw new Error(
            'Não foi possível ler os modelos e cenários deste projeto.',
          )
        setModels(modelList)
        setScenarios(scenarioList)
        selectModel((current) =>
          modelList.some((m) => m.id === current)
            ? current
            : modelList.find((m) => m.id === requested.current.model)?.id ||
              modelList[0]?.id ||
              '',
        )
        selectScenario((current) =>
          scenarioList.some((s) => s.id === current)
            ? current
            : scenarioList.find((s) => s.id === requested.current.scenario)
                ?.id ||
              scenarioList[0]?.id ||
              '',
        )
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, revision, loadingProjects, projects])

  useEffect(() => {
    if (!projectId) return
    localStorage.setItem('arxisvr_project_id', projectId)
    const next = new URLSearchParams(query)
    next.set('projeto', projectId)
    if (scenarioId) next.set('cenario', scenarioId)
    else next.delete('cenario')
    if (modelId) next.set('modelo', modelId)
    else next.delete('modelo')
    if (query.toString() !== next.toString()) setQuery(next, { replace: true })
  }, [projectId, scenarioId, modelId, query, setQuery])

  const setProjectId = (id: string) => {
    selectProject(id)
    selectScenario('')
    selectModel('')
    setScenarios([])
    setModels([])
    requested.current = { project: id, scenario: '', model: '' }
  }
  const selection: BimSelection = {
    projects,
    scenarios,
    models,
    projectId,
    scenarioId,
    modelId,
    project: projects.find((p) => p.id === projectId) || null,
    scenario: scenarios.find((s) => s.id === scenarioId) || null,
    model: models.find((m) => m.id === modelId) || null,
    loading: loadingProjects || loadingContext,
    error,
    setProjectId,
    setScenarioId: selectScenario,
    setModelId: selectModel,
    reload: async () => {
      setRevision((v) => v + 1)
    },
  }

  return (
    <AppShell title={title}>
      <div className="bim-page">
        <header className="bim-heading">
          <div>
            <span className="bim-eyebrow">Gestão do projeto BIM</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <Link
            className="bim-button bim-button--secondary"
            to={`/app${modelId ? `?model=${modelId}&scenario=${scenarioId}` : ''}`}
          >
            Abrir visualizador 3D
          </Link>
        </header>
        {error && (
          <div className="bim-alert" role="alert">
            {error}
          </div>
        )}
        {!loadingProjects && projects.length > 0 && (
          <section className="bim-context" aria-label="Contexto do projeto">
            <label>
              Projeto
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cenário
              <select
                value={scenarioId}
                disabled={selection.loading || !scenarios.length}
                onChange={(e) => selectScenario(e.target.value)}
              >
                {!scenarios.length && (
                  <option value="">Nenhum cenário salvo</option>
                )}
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modelo IFC
              <select
                value={modelId}
                disabled={selection.loading || !models.length}
                onChange={(e) => selectModel(e.target.value)}
              >
                {!models.length && (
                  <option value="">Nenhum modelo enviado</option>
                )}
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.originalName}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
        {selection.loading ? (
          <p className="bim-loading" role="status">
            Carregando seu projeto…
          </p>
        ) : !error && allowDocumentOnly && !projectId ? (
          <form className="bim-panel" onSubmit={async event=>{
            event.preventDefault()
            const name=String(new FormData(event.currentTarget).get('name')??'').trim()
            if(creating||name.length<2)return
            setCreating(true);setCreateError('')
            try{
              const project=await bimRequest<BimProject>('/projects',{method:'POST',body:JSON.stringify({name})})
              setProjects(list=>[project,...list]); setProjectId(project.id)
            }catch(c){setCreateError(c instanceof Error?c.message:'Falha ao criar a obra.')}
            finally{setCreating(false)}
          }}><h2>Criar obra</h2><label>Nome do projeto <input name="name" minLength={2} maxLength={200} required/></label>
            <button className="bim-button" disabled={creating}>Criar projeto</button>{createError&&<p role="alert">{createError}</p>}</form>
        ) : !error && !projectId ? (
          <section className="bim-empty">
            <h2>Comece pelo seu projeto BIM</h2>
            <p>
              Crie um projeto, envie o modelo IFC e salve um cenário para
              trabalhar com prazo e custo.
            </p>
            <Link className="bim-button" to="/app">
              Criar projeto e enviar IFC
            </Link>
          </section>
        ) : !error && allowDocumentOnly && !scenarioId ? (
          <form className="bim-panel" onSubmit={async event=>{
            event.preventDefault()
            if (creating) return
            const name=String(new FormData(event.currentTarget).get('name') || '').trim()
            if (!name) return
            setCreating(true); setCreateError('')
            try {
              const scenario=await scenariosService.create(projectId,name,null)
              requested.current.scenario=scenario.id
              setRevision(value=>value+1)
            } catch(e) { setCreateError(e instanceof Error?e.message:'Falha ao criar o cenário.') }
            finally { setCreating(false) }
          }}>
            <h2>Primeiro cenário da obra</h2>
            <label>Nome do cenário <input name="name" required maxLength={200} defaultValue="Orçamento base"/></label>
            <button className="bim-button" disabled={creating}>Criar cenário</button>
            {createError && <p role="alert">{createError}</p>}
          </form>
        ) : !error && ((!modelId && !allowDocumentOnly) || !scenarioId) ? (
          <section className="bim-empty">
            <h2>
              {!modelId
                ? 'Envie o modelo do projeto'
                : 'Salve o primeiro cenário'}
            </h2>
            <p>
              O planejamento e o orçamento ficam associados a uma alternativa do
              projeto. Abra o IFC no visualizador e salve um cenário para
              começar.
            </p>
            <Link className="bim-button" to="/app">
              Preparar projeto no visualizador
            </Link>
            {title==='Orçamento 5D' && <Link className="bim-button bim-button--secondary" to={'/orcamento/obra?projeto='+encodeURIComponent(projectId)}>Iniciar orçamento com PDFs</Link>}
          </section>
        ) : !error ? (
          children(selection)
        ) : null}
      </div>
    </AppShell>
  )
}
