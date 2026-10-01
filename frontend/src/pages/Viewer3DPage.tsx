import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import ViewerToolbar from '@/components/viewer/ViewerToolbar'
import ProjectModelsPanel from '@/components/viewer/ProjectModelsPanel'
import ViewerCanvas, { type ViewerHandle } from '@/components/viewer/ViewerCanvas'
import ScenariosPanel from '@/components/viewer/ScenariosPanel'
import CronogramaPanel from '@/components/viewer/CronogramaPanel'
import ReguaTempo from '@/components/viewer/ReguaTempo'
import type { Categoria } from '@/components/viewer/visibilidadeIfc'
import { estadosNaData, janelaDoCronograma, resumirEstados } from '@/components/viewer/estado4d'
import { scenariosService, type Scenario } from '@/services/scenarios.service'
import { schedulesService, type Cronograma } from '@/services/schedules.service'
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

  // Aviso de sucesso some sozinho: no celular ele e um toast sobre o canvas e
  // nao pode ficar la roubando area do modelo. Erro fica ate o usuario agir.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4500)
    return () => clearTimeout(t)
  }, [message])
  const [error, setError] = useState<string | null>(null)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  // --- S12: cenários -------------------------------------------------------
  const viewerRef = useRef<ViewerHandle>(null)
  const viewerPageRef = useRef<HTMLDivElement>(null)

  // Tela cheia pela Fullscreen API. `null` = o navegador nao tem a API
  // (Safari no iPhone so a ganhou no iOS 17.2) e o botao nem aparece.
  // Vai para tela cheia a pagina do viewer inteira, para a toolbar (e o botao
  // de sair) continuarem acessiveis.
  const [fullscreen, setFullscreen] = useState<boolean | null>(() =>
    typeof document !== 'undefined' && document.fullscreenEnabled ? document.fullscreenElement !== null : null,
  )
  useEffect(() => {
    if (fullscreen === null) return
    const sync = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [fullscreen === null])
  const toggleFullscreen = () => {
    const el = viewerPageRef.current
    if (!el || fullscreen === null) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void el.requestFullscreen().catch(() => setError('O navegador não permitiu a tela cheia.'))
  }
  const [scenariosOpen, setScenariosOpen] = useState(false)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState('')
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [savingScenario, setSavingScenario] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  // Visibilidade por categoria IFC (fatia do S10 para o S18)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [ocultos, setOcultos] = useState<string[]>([])

  // --- S26: cronograma 4D --------------------------------------------------
  const [cronogramaAberto, setCronogramaAberto] = useState(false)
  const [cronograma, setCronograma] = useState<Cronograma | null>(null)
  const [carregandoCronograma, setCarregandoCronograma] = useState(false)
  const [salvandoCronograma, setSalvandoCronograma] = useState(false)
  const [regua, setRegua] = useState(false)
  const [dataRegua, setDataRegua] = useState('')
  const [tocando, setTocando] = useState(false)
  const [velocidade, setVelocidade] = useState(1)

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
    const ocultosDoCenario = scenario.metadata?.visibility?.hiddenIfcCategories ?? []
    viewer.aplicarOcultos(ocultosDoCenario)
    setOcultos(ocultosDoCenario)
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

  /** Mostra/oculta uma categoria IFC no viewer (o cenario so guarda ao salvar). */
  const alternarCategoria = (categoria: Categoria) => {
    const viewer = viewerRef.current
    if (!viewer?.pronto()) return
    const oculta = categoria.tipos.some((t) => ocultos.includes(t))
    const proximos = oculta
      ? ocultos.filter((t) => !categoria.tipos.includes(t))
      : [...ocultos, ...categoria.tipos]
    viewer.aplicarOcultos(proximos)
    setOcultos(proximos)
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

  // --- S26: cronograma 4D --------------------------------------------------

  const carregarCronograma = useCallback(async (projectId: string, scenarioId: string) => {
    if (!projectId || !scenarioId) {
      setCronograma(null)
      return
    }
    setCarregandoCronograma(true)
    try {
      setCronograma(await schedulesService.doCenario(projectId, scenarioId))
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao carregar cronograma.')
    } finally {
      setCarregandoCronograma(false)
    }
  }, [])

  // Trocar de cenário troca de cronograma: é o cenário que tem prazo, e é isso
  // que faz A e B poderem terminar em datas diferentes.
  useEffect(() => {
    setRegua(false)
    setTocando(false)
    setDataRegua('')
    void carregarCronograma(selectedProjectId, activeScenarioId)
  }, [selectedProjectId, activeScenarioId, carregarCronograma])

  const janela = janelaDoCronograma(cronograma?.activities ?? [])

  /** Traduz categoria IFC para GlobalId e grava o vínculo da atividade. */
  const vincularCategoria = async (activityId: string, tiposIfc: string[]) => {
    const viewer = viewerRef.current
    if (!viewer?.pronto()) {
      setError('Abra o modelo IFC antes de vincular elementos.')
      return
    }
    setSalvandoCronograma(true)
    try {
      const globalIds = await viewer.globalIdsDasCategorias(tiposIfc)
      if (!globalIds.length) {
        setError('Nenhum elemento desta categoria tem GlobalId no modelo.')
        return
      }
      const gravados = await schedulesService.vincularElementos(activityId, globalIds)
      await carregarCronograma(selectedProjectId, activeScenarioId)
      setMessage(`${gravados} elemento(s) vinculados à atividade.`)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao vincular elementos.')
    } finally {
      setSalvandoCronograma(false)
    }
  }

  const criarCronograma = async (nome: string, dataInicio: string) => {
    if (!selectedProjectId || !activeScenarioId) return
    setSalvandoCronograma(true)
    setError(null)
    try {
      const criado = await schedulesService.criar(selectedProjectId, nome, dataInicio, activeScenarioId)
      setCronograma({ ...criado, activities: [] })
      setMessage(`Cronograma "${criado.name}" criado.`)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao criar cronograma.')
    } finally {
      setSalvandoCronograma(false)
    }
  }

  const apagarCronograma = async () => {
    if (!cronograma) return
    setSalvandoCronograma(true)
    try {
      await schedulesService.apagar(cronograma.id)
      setCronograma(null)
      setRegua(false)
      setTocando(false)
      void viewerRef.current?.aplicar4d(null)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao apagar cronograma.')
    } finally {
      setSalvandoCronograma(false)
    }
  }

  const adicionarAtividade = async (dados: { nome: string; inicio: string; fim: string; tiposIfc: string[] }) => {
    if (!cronograma) return
    setSalvandoCronograma(true)
    setError(null)
    try {
      const atividade = await schedulesService.criarAtividade(cronograma.id, {
        name: dados.nome,
        plannedStart: dados.inicio,
        plannedEnd: dados.fim,
        sortOrder: (cronograma.activities?.length ?? 0) + 1,
      })
      // O vínculo entra na mesma ação: atividade sem elemento não muda nada na
      // tela, e pedir dois passos ao usuário só adia o erro.
      if (dados.tiposIfc.length) {
        const viewer = viewerRef.current
        const globalIds = viewer?.pronto() ? await viewer.globalIdsDasCategorias(dados.tiposIfc) : []
        if (globalIds.length) await schedulesService.vincularElementos(atividade.id, globalIds)
      }
      await carregarCronograma(selectedProjectId, activeScenarioId)
      setMessage(`Atividade "${dados.nome}" cadastrada.`)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao cadastrar atividade.')
    } finally {
      setSalvandoCronograma(false)
    }
  }

  const apagarAtividade = async (activityId: string) => {
    try {
      await schedulesService.apagarAtividade(activityId)
      await carregarCronograma(selectedProjectId, activeScenarioId)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao apagar atividade.')
    }
  }

  const alterarDatas = async (activityId: string, datas: { inicio: string; fim: string }) => {
    if (datas.fim < datas.inicio) {
      setError('O fim da atividade não pode ser antes do início.')
      return
    }
    try {
      await schedulesService.atualizarAtividade(activityId, {
        plannedStart: datas.inicio,
        plannedEnd: datas.fim,
      })
      // Relê com CPM: mudar uma data pode empurrar as sucessoras, e a régua
      // precisa refletir isso na mesma ação.
      await carregarCronograma(selectedProjectId, activeScenarioId)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao alterar datas.')
    }
  }

  const vincularPredecessora = async (activityId: string, predecessorId: string) => {
    try {
      await schedulesService.vincularPredecessora(activityId, predecessorId)
      await carregarCronograma(selectedProjectId, activeScenarioId)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao encadear atividades.')
    }
  }

  const desvincularPredecessora = async (activityId: string, predecessorId: string) => {
    try {
      await schedulesService.desvincularPredecessora(activityId, predecessorId)
      await carregarCronograma(selectedProjectId, activeScenarioId)
    } catch (erro) {
      setError(erro instanceof Error ? erro.message : 'Falha ao soltar dependência.')
    }
  }

  const alternarRegua = () => {
    if (regua) {
      setRegua(false)
      setTocando(false)
      return
    }
    if (!janela) {
      setError('Cadastre uma atividade com datas antes de ligar a régua.')
      return
    }
    setDataRegua((atual) => atual || janela.inicio)
    setRegua(true)
  }

  // A data manda na tela: cada mudança repinta o modelo pelo estado de cada
  // elemento (não iniciado some, em obra ganha cor, concluído fica normal).
  //
  // O atraso curto existe porque arrastar a régua dispara um evento por pixel e
  // cada repintura recria subsets de geometria. Sem ele, um modelo grande trava
  // enquanto o dedo está no slider — é o risco que o doc do S26 já previa. O
  // rótulo da data continua instantâneo; só a cena espera o arrasto parar.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer?.pronto()) return
    if (!regua || !dataRegua || !cronograma?.activities?.length) {
      void viewer.aplicar4d(null)
      return
    }
    const atividades = cronograma.activities
    const espera = setTimeout(() => {
      void viewer.aplicar4d(estadosNaData(atividades, dataRegua))
    }, 120)
    return () => clearTimeout(espera)
  }, [regua, dataRegua, cronograma, selectedModelId])

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
      <div className="viewer-page" ref={viewerPageRef}>
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
          onToggleCronograma={() => setCronogramaAberto((open) => !open)}
          hasModel={Boolean(selectedModel)}
          onResetView={() => { viewerRef.current?.redefinirVista() }}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
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
            // No celular o painel e um drawer: escolher o modelo fecha o painel,
            // senao ele continua cobrindo o que o usuario acabou de pedir para
            // ver. No desktop o painel e coluna fixa e projectsOpen nao muda nada.
            onSelectModel={(id) => { setSelectedModelId(id); setProjectsOpen(false) }}
            onCreateProject={() => setCreateProjectOpen(true)}
          />
          <ViewerCanvas
            ref={viewerRef}
            onUpload={openFilePicker}
            uploading={uploading}
            projectName={selectedProject?.name}
            modelId={selectedModel?.id}
            modelName={selectedModel?.originalName}
            onModeloAberto={(lista) => { setCategorias(lista); setOcultos([]); setRegua(false); setTocando(false) }}
          />
          <ViewerPropertiesPanel
            open={propertiesOpen}
            onClose={() => setPropertiesOpen(false)}
          />
          {/* S26: a regua fica sobre o canvas, como a barra de um player. Ela
              so existe com cronograma ligado, para nao roubar area do modelo. */}
          {regua && janela && cronograma?.activities?.length ? (
            <ReguaTempo
              janela={janela}
              data={dataRegua || janela.inicio}
              onChange={setDataRegua}
              tocando={tocando}
              onTocandoChange={setTocando}
              velocidade={velocidade}
              onVelocidadeChange={setVelocidade}
              resumo={(() => {
                const resumo = resumirEstados(estadosNaData(cronograma.activities, dataRegua || janela.inicio))
                return (
                  <>
                    <span className="regua-tempo__estado regua-tempo__estado--ativo">{resumo.ativo} em obra</span>
                    <span className="regua-tempo__estado">{resumo.concluido} concluído(s)</span>
                    <span className="regua-tempo__estado regua-tempo__estado--futuro">{resumo.naoIniciado} a fazer</span>
                  </>
                )
              })()}
            />
          ) : null}
          <CronogramaPanel
            open={cronogramaAberto}
            onClose={() => setCronogramaAberto(false)}
            cenarioNome={scenarios.find((item) => item.id === activeScenarioId)?.name ?? ''}
            temCenarioAtivo={Boolean(activeScenarioId)}
            viewerPronto={Boolean(selectedModel)}
            cronograma={cronograma}
            carregando={carregandoCronograma}
            salvando={salvandoCronograma}
            categorias={categorias}
            onCriarCronograma={(nome, dataInicio) => void criarCronograma(nome, dataInicio)}
            onApagarCronograma={() => void apagarCronograma()}
            onAdicionarAtividade={(dados) => void adicionarAtividade(dados)}
            onApagarAtividade={(id) => void apagarAtividade(id)}
            onAlterarDatas={(id, datas) => void alterarDatas(id, datas)}
            onVincularCategoria={(id, tipos) => void vincularCategoria(id, tipos)}
            onVincularPredecessora={(id, predecessorId) => void vincularPredecessora(id, predecessorId)}
            onDesvincularPredecessora={(id, predecessorId) => void desvincularPredecessora(id, predecessorId)}
            regua={regua}
            onToggleRegua={alternarRegua}
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
            categorias={categorias}
            ocultos={ocultos}
            onToggleCategoria={alternarCategoria}
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
