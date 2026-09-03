import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import ViewerToolbar from '@/components/viewer/ViewerToolbar'
import ProjectModelsPanel from '@/components/viewer/ProjectModelsPanel'
import ViewerCanvas, { type ViewerHandle } from '@/components/viewer/ViewerCanvas'
import ScenariosPanel from '@/components/viewer/ScenariosPanel'
import { scenariosService, type Scenario } from '@/services/scenarios.service'
import ViewerPropertiesPanel from '@/components/viewer/ViewerPropertiesPanel'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import '@/styles/viewer.css'

export interface ViewerProject {
  id: string
  name: string
}

export interface ViewerModel {
  id: string
  projectId: string
  originalName: string
  fileSize?: number | null
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('arxisvr_token')
  if (!token) throw new Error('Sessão expirada. Entre novamente para enviar modelos.')

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(buildApiV1Url(path), { ...init, headers })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const planMessage =
      data?.code === 'PLAN_LIMIT_REACHED'
        ? data.resource === 'file_size'
          ? `Arquivo excede limite do plano: ${data.current} MB enviados; máximo ${data.limit} MB.`
          : data.resource === 'storage'
            ? `Armazenamento do plano esgotado: limite ${data.limit} GB.`
            : `Limite do plano atingido para ${data.resource || 'este recurso'}.`
        : data?.code === 'SUBSCRIPTION_INACTIVE'
          ? 'Assinatura inativa. Regularize pagamento para enviar novos modelos.'
          : null
    throw new Error(
      data?.error ||
        data?.message ||
        planMessage ||
        (response.status === 413
          ? 'Arquivo excede o limite permitido.'
          : response.status === 403
            ? 'Upload não autorizado para este projeto ou plano.'
          : `Falha na requisição (${response.status}).`),
    )
  }

  return response.json()
}

export default function Viewer3DPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [propertiesOpen, setPropertiesOpen] = useState(false)
  const [projects, setProjects] = useState<ViewerProject[]>([])
  const [models, setModels] = useState<ViewerModel[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  // --- S12: cenários -------------------------------------------------------
  const viewerRef = useRef<ViewerHandle>(null)
  const [scenariosOpen, setScenariosOpen] = useState(false)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState('')
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [savingScenario, setSavingScenario] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const selectedModel = models.find((model) => model.id === selectedModelId)

  const carregarCenarios = useCallback(async (projectId: string) => {
    if (!projectId) {
      setScenarios([])
      return
    }
    setLoadingScenarios(true)
    try {
      setScenarios(await scenariosService.list(projectId))
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao carregar cenários.')
    } finally {
      setLoadingScenarios(false)
    }
  }, [])

  const loadModels = useCallback(async (projectId: string) => {
    if (!projectId) {
      setModels([])
      setSelectedModelId('')
      return
    }

    try {
      const result = await apiRequest<ViewerModel[]>(`/ifc/project/${projectId}`)
      setModels(result)
      setSelectedModelId((current) =>
        result.some((model) => model.id === current) ? current : '',
      )
    } catch (loadError) {
      setModels([])
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar modelos.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      setLoadingProjects(true)
      setError(null)
      try {
        const result = await apiRequest<{
          items: ViewerProject[]
          total: number
        }>('/projects?pageSize=100')
        if (cancelled) return

        const availableProjects = result.items || []
        setProjects(availableProjects)

        const storedProjectId = localStorage.getItem('arxisvr_project_id')
        const initialProject =
          availableProjects.find((project) => project.id === storedProjectId) ||
          availableProjects[0]

        if (initialProject) {
          setSelectedProjectId(initialProject.id)
          localStorage.setItem('arxisvr_project_id', initialProject.id)
          await loadModels(initialProject.id)
          // S12: os cenários do projeto restaurado vêm junto, senão o painel
          // abre vazio depois de um F5 e parece que nada foi salvo.
          await carregarCenarios(initialProject.id)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar projetos.')
        }
      } finally {
        if (!cancelled) setLoadingProjects(false)
      }
    }

    void loadProjects()
    return () => {
      cancelled = true
    }
  }, [loadModels, carregarCenarios])

  // --- S12: cenários -------------------------------------------------------

  /** Põe o viewer no estado guardado no cenário. */
  const aplicarCenario = (scenario: Scenario) => {
    const viewer = viewerRef.current
    if (!viewer?.pronto()) {
      setError('Abra um modelo IFC antes de trocar de cenário.')
      return
    }
    if (scenario.camera) viewer.aplicarCamera(scenario.camera)
    viewer.aplicarOcultos(scenario.metadata?.hidden ?? [])
    setActiveScenarioId(scenario.id)
    setMessage(`Cenário "${scenario.name}" aplicado.`)
  }

  const selecionarCenario = async (scenarioId: string) => {
    const local = scenarios.find((item) => item.id === scenarioId)
    // Relê do servidor: a lista pode estar defasada se outra aba salvou.
    try {
      const atual = await scenariosService.getById(selectedProjectId, scenarioId)
      aplicarCenario(atual)
    } catch {
      if (local) aplicarCenario(local)
    }
  }

  const criarCenario = async (name: string) => {
    if (!selectedProjectId) return
    const viewer = viewerRef.current
    setSavingScenario(true)
    setError(null)
    try {
      const criado = await scenariosService.create(
        selectedProjectId,
        name,
        viewer?.capturarCamera() ?? null,
      )
      setScenarios((atuais) => [...atuais, criado])
      setActiveScenarioId(criado.id)
      setMessage(`Cenário "${name}" criado com a posição atual.`)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao criar cenário.')
    } finally {
      setSavingScenario(false)
    }
  }

  const salvarCenario = async () => {
    const viewer = viewerRef.current
    const ativo = scenarios.find((item) => item.id === activeScenarioId)
    if (!ativo || !viewer?.pronto()) return

    const camera = viewer.capturarCamera()
    if (!camera) return

    setSavingScenario(true)
    setError(null)
    try {
      const salvo = await scenariosService.saveState(
        selectedProjectId,
        ativo.id,
        ativo.name,
        camera,
        viewer.capturarOcultos(),
      )
      setScenarios((atuais) => atuais.map((item) => (item.id === salvo.id ? salvo : item)))
      setMessage(`Cenário "${ativo.name}" salvo.`)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao salvar cenário.')
    } finally {
      setSavingScenario(false)
    }
  }

  const apagarCenario = async (scenarioId: string) => {
    try {
      await scenariosService.remove(selectedProjectId, scenarioId)
      setScenarios((atuais) => atuais.filter((item) => item.id !== scenarioId))
      if (activeScenarioId === scenarioId) setActiveScenarioId('')
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao apagar cenário.')
    }
  }

  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setSelectedModelId('')
    setMessage(null)
    setError(null)
    localStorage.setItem('arxisvr_project_id', projectId)
    setActiveScenarioId('')
    void loadModels(projectId)
    void carregarCenarios(projectId)
  }

  const openFilePicker = () => {
    setMessage(null)
    setError(null)

    if (!selectedProjectId) {
      setError('Selecione ou crie um projeto antes de enviar um modelo IFC.')
      setProjectsOpen(true)
      return
    }

    fileInputRef.current?.click()
  }

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedProjectId) return

    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setError('Formato inválido. Selecione um arquivo .ifc.')
      return
    }

    setUploading(true)
    setUploadProgress(10)
    setMessage(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('projectId', selectedProjectId)
      formData.append('discipline', 'other')
      formData.append('file', file)

      setUploadProgress(35)
      const uploadedModel = await apiRequest<ViewerModel>('/ifc/upload', {
        method: 'POST',
        body: formData,
      })
      setUploadProgress(100)
      setModels((current) => [
        uploadedModel,
        ...current.filter((model) => model.id !== uploadedModel.id),
      ])
      setSelectedModelId(uploadedModel.id)
      setMessage(`Modelo “${uploadedModel.originalName}” enviado com sucesso.`)
    } catch (uploadError) {
      setUploadProgress(0)
      setError(uploadError instanceof Error ? uploadError.message : 'Falha ao enviar modelo IFC.')
    } finally {
      setUploading(false)
    }
  }

  const createProject = async () => {
    const name = projectName.trim()
    if (name.length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres.')
      return
    }

    setCreatingProject(true)
    setError(null)
    setMessage(null)

    try {
      const createdProject = await apiRequest<ViewerProject>('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setProjects((current) => [createdProject, ...current])
      setSelectedProjectId(createdProject.id)
      setModels([])
      setSelectedModelId('')
      localStorage.setItem('arxisvr_project_id', createdProject.id)
      setProjectName('')
      setCreateProjectOpen(false)
      setMessage(`Projeto “${createdProject.name}” criado com sucesso.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Falha ao criar projeto.')
    } finally {
      setCreatingProject(false)
    }
  }

  return (
    <AppShell>
      <div className="viewer-page">
        <input
          ref={fileInputRef}
          className="viewer-file-input"
          type="file"
          accept=".ifc"
          aria-label="Selecionar modelo IFC"
          onChange={uploadFile}
        />

        <ViewerToolbar
          onUpload={openFilePicker}
          uploading={uploading}
          onToggleProjects={() => setProjectsOpen((open) => !open)}
          onToggleProperties={() => setPropertiesOpen((open) => !open)}
          onToggleScenarios={() => setScenariosOpen((open) => !open)}
        />

        {(message || error || uploading) && (
          <div
            className={`viewer-notice ${error ? 'viewer-notice--error' : ''}`}
            role={error ? 'alert' : 'status'}
          >
            <span>
              {error ||
                (uploading
                  ? `Enviando modelo IFC… ${uploadProgress}%`
                  : message)}
            </span>
            {uploading && (
              <span className="viewer-notice__progress">
                <span style={{ width: `${uploadProgress}%` }} />
              </span>
            )}
          </div>
        )}

        <div className="viewer-workspace">
          <ProjectModelsPanel
            open={projectsOpen}
            onClose={() => setProjectsOpen(false)}
            projects={projects}
            models={models}
            selectedProjectId={selectedProjectId}
            selectedModelId={selectedModelId}
            loading={loadingProjects}
            onSelectProject={selectProject}
            onSelectModel={setSelectedModelId}
            onCreateProject={() => setCreateProjectOpen(true)}
          />
          <ViewerCanvas
            ref={viewerRef}
            onUpload={openFilePicker}
            uploading={uploading}
            projectName={selectedProject?.name}
            modelId={selectedModel?.id}
            modelName={selectedModel?.originalName}
          />
          <ViewerPropertiesPanel
            open={propertiesOpen}
            onClose={() => setPropertiesOpen(false)}
          />
          <ScenariosPanel
            open={scenariosOpen}
            onClose={() => setScenariosOpen(false)}
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            loading={loadingScenarios}
            saving={savingScenario}
            viewerPronto={Boolean(selectedModel)}
            onCreate={(name) => void criarCenario(name)}
            onSelect={(id) => void selecionarCenario(id)}
            onSave={() => void salvarCenario()}
            onDelete={(id) => void apagarCenario(id)}
          />
        </div>

        {createProjectOpen && (
          <div className="viewer-modal-backdrop" role="presentation">
            <section
              className="viewer-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-project-title"
            >
              <div className="viewer-modal__header">
                <div>
                  <span className="viewer-panel__eyebrow">Workspace</span>
                  <h2 id="create-project-title">Novo projeto</h2>
                </div>
                <button
                  className="viewer-panel__close viewer-modal__close"
                  type="button"
                  onClick={() => setCreateProjectOpen(false)}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
              <div className="viewer-modal__body">
                <label htmlFor="viewer-project-name">Nome do projeto</label>
                <input
                  id="viewer-project-name"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void createProject()
                  }}
                  placeholder="Ex.: Edifício comercial"
                  autoFocus
                />
              </div>
              <div className="viewer-modal__footer">
                <button
                  className="viewer-secondary-button"
                  type="button"
                  onClick={() => setCreateProjectOpen(false)}
                  disabled={creatingProject}
                >
                  Cancelar
                </button>
                <button
                  className="viewer-upload-button"
                  type="button"
                  onClick={() => void createProject()}
                  disabled={creatingProject}
                >
                  {creatingProject ? 'Criando…' : 'Criar projeto'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}
