import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import ArxisIcon from '@/components/ui/ArxisIcon'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import type { CameraState } from '@/services/scenarios.service'
import {
  aplicarDestaque,
  aplicarVisibilidade as aplicarVisibilidadeIfc,
  expressIdsDe,
  globalIdsDe,
  idsDosTipos,
  idsOcultos,
  listarCategorias,
  mapearGlobalIds,
  todosExpressIds,
  type Categoria,
  type MapaIfc,
} from './visibilidadeIfc'
import type { Estado4d } from './estado4d'

interface ViewerCanvasProps {
  onUpload: () => void
  uploading: boolean
  projectName?: string
  modelId?: string
  modelName?: string
  /** Modelo carregado: as categorias IFC presentes (para o painel de visibilidade). */
  onModeloAberto?: (categorias: Categoria[]) => void
}

/**
 * A ponte do S12 (ver `documentation/S12-MATRIZ-INTEGRACAO.md`).
 *
 * A cena, a câmera e os OrbitControls nascem e morrem dentro do `useEffect` que
 * carrega o IFC, e é assim de propósito: o cleanup precisa alcançar tudo. Para
 * que a tela consiga ler e reaplicar o estado sem quebrar esse ciclo de vida, o
 * efeito publica os objetos vivos numa ref (`sceneRef`) e este handle apenas os
 * consulta. Quando não há modelo aberto, a ref está vazia e os métodos avisam
 * em vez de estourar.
 */
export interface ViewerHandle {
  /** Câmera atual, ou null se ainda não há modelo aberto. */
  capturarCamera: () => CameraState | null
  /** Tipos IFC ocultos no momento (ex.: IFCROOF). */
  capturarOcultos: () => string[]
  /** Reaplica a câmera. Devolve false se não havia cena. */
  aplicarCamera: (camera: CameraState) => boolean
  /** Reaplica a visibilidade: tudo visível, menos estes tipos IFC. */
  aplicarOcultos: (tiposIfc: string[]) => boolean
  /** Categorias presentes no modelo aberto (vazio sem modelo). */
  categorias: () => Categoria[]
  /**
   * GlobalIds dos elementos de uma ou mais categorias IFC (S26).
   *
   * É a tradução que o vínculo 4D exige: o painel escolhe categoria, que é o
   * que o viewer sabe, e o que se grava é GlobalId, que é o que o cronograma
   * entende. A primeira chamada lê as propriedades do modelo e guarda o mapa.
   */
  globalIdsDasCategorias: (tiposIfc: string[]) => Promise<string[]>
  /**
   * Pinta o modelo pelo estado 4D na data escolhida: não iniciado some, em
   * andamento ganha cor, concluído fica normal. `null` desliga e devolve o
   * modelo à visibilidade do cenário.
   */
  aplicar4d: (estados: Map<string, Estado4d> | null) => Promise<boolean>
  /** Há uma cena carregada agora? */
  pronto: () => boolean
  /** Volta ao enquadramento calculado quando o modelo abriu. */
  redefinirVista: () => boolean
}

/**
 * O que o `useEffect` publica para o handle consultar.
 *
 * A visibilidade é por **categoria IFC** (tipos como IFCROOF), aplicada por
 * subsets de expressID do web-ifc-three. Ver `visibilidadeIfc.ts`.
 */
interface CenaViva {
  camera: any
  controls: any
  model: any
  /** Enquadramento inicial (o mesmo que o efeito calcula ao abrir o modelo). */
  vistaInicial: CameraState
  categorias: Categoria[]
  /** Tipos IFC ocultos agora. */
  ocultos: Set<string>
  /** Estado 4D em vigor (S26), ou null com a régua de tempo desligada. */
  estados4d: Map<string, Estado4d> | null
  /** GlobalId × expressID, lido sob demanda: só o 4D precisa dele. */
  garantirMapa: () => Promise<MapaIfc>
  /** Redesenha a visibilidade a partir de `ocultos` + `estados4d`. */
  renderizar: () => void
}

const ViewerCanvas = forwardRef<ViewerHandle, ViewerCanvasProps>(function ViewerCanvas({
  onUpload,
  uploading,
  projectName,
  modelId,
  modelName,
  onModeloAberto,
}: ViewerCanvasProps, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CenaViva | null>(null)
  const [touchHelpDismissed, setTouchHelpDismissed] = useState(() => {
    try { return localStorage.getItem('arxisvr_viewer_touch_help') === 'ok' } catch { return false }
  })
  const dismissTouchHelp = () => {
    setTouchHelpDismissed(true)
    try { localStorage.setItem('arxisvr_viewer_touch_help', 'ok') } catch { /* ignora: falha aqui não impede o fluxo */ }
  }
  const [loadingModel, setLoadingModel] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !modelId || !modelName) return

    let cancelled = false
    let cleanup = () => {}

    const renderIfc = async () => {
      setLoadingModel(true)
      setLoadProgress(5)
      setLoadError(null)
      host.replaceChildren()

      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
        const { IFCLoader } = await import('web-ifc-three')

        if (cancelled) return

        const width = Math.max(host.clientWidth, 1)
        const height = Math.max(host.clientHeight, 1)
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x121416)

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100000)
        camera.position.set(10, 10, 10)

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(width, height)
        renderer.shadowMap.enabled = true
        host.appendChild(renderer.domElement)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.08

        scene.add(new THREE.HemisphereLight(0xffffff, 0x263238, 2.2))
        const directional = new THREE.DirectionalLight(0xffffff, 2.6)
        directional.position.set(20, 30, 15)
        directional.castShadow = true
        scene.add(directional)

        const grid = new THREE.GridHelper(100, 100, 0x3a4651, 0x222a31)
        scene.add(grid)

        const token = localStorage.getItem('arxisvr_token')
        if (!token) throw new Error('Sessão expirada. Entre novamente para abrir o modelo.')

        setLoadProgress(15)
        const response = await fetch(buildApiV1Url(`/ifc/${modelId}/download`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || data?.message || `Falha ao baixar IFC (${response.status}).`)
        }

        const blob = await response.blob()
        const fileUrl = URL.createObjectURL(blob)
        setLoadProgress(30)

        const loader = new IFCLoader()
        loader.ifcManager.setWasmPath('/wasm/')
        loader.ifcManager.useWebWorkers(false)
        loader.ifcManager.applyWebIfcConfig({
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: true,
        })

        const model = await new Promise<THREE.Object3D>((resolve, reject) => {
          loader.load(
            fileUrl,
            resolve,
            (event: ProgressEvent) => {
              if (event.total > 0) {
                setLoadProgress(30 + Math.round((event.loaded / event.total) * 60))
              }
            },
            reject,
          )
        })
        URL.revokeObjectURL(fileUrl)

        if (cancelled) {
          loader.ifcManager.dispose()
          return
        }

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        scene.add(model)

        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDimension = Math.max(size.x, size.y, size.z, 1)
        const distance = maxDimension / (2 * Math.tan((camera.fov * Math.PI) / 360))
        const direction = new THREE.Vector3(1, 0.75, 1).normalize()

        camera.near = Math.max(maxDimension / 10000, 0.01)
        camera.far = Math.max(maxDimension * 100, 1000)
        camera.position.copy(center).add(direction.multiplyScalar(distance * 1.35))
        camera.updateProjectionMatrix()
        controls.target.copy(center)
        controls.update()
        // O OrbitControls guarda este enquadramento; "Redefinir visualizacao"
        // chama controls.reset() e volta exatamente para ca.
        controls.saveState()

        grid.position.y = box.min.y
        grid.scale.setScalar(Math.max(maxDimension / 100, 0.25))

        // Publica a cena para o handle imperativo (S12). A partir daqui a tela
        // consegue ler e reaplicar camera/visibilidade sem tocar no ciclo de
        // vida do efeito.
        // Categorias IFC presentes: e o que o painel lista e o que o cenario
        // persiste (tipos IFC). Os expressIDs ficam aqui para os subsets.
        const categorias = await listarCategorias(loader.ifcManager as any, (model as any).modelID)
        if (cancelled) {
          loader.ifcManager.dispose()
          return
        }
        const todos = todosExpressIds(model)
        const ocultosAtuais = new Set<string>()
        const manager = loader.ifcManager as any
        // Cor do que esta em obra na data da regua (S26). Laranja e magenta ja
        // sao do split A|B do S18; o amarelo nao colide com nenhum dos dois.
        const material4d = new THREE.MeshLambertMaterial({
          color: 0xfacc15,
          emissive: 0x854d0e,
          emissiveIntensity: 0.5,
        })
        // O mapa GlobalId x expressID custa uma leitura de propriedades do
        // modelo inteiro. So o 4D precisa dele, entao so nasce quando alguem
        // abre o cronograma: quem nunca usa nao paga.
        let mapa: MapaIfc | null = null
        let mapaEmCurso: Promise<MapaIfc> | null = null
        const garantirMapa = () => {
          if (mapa) return Promise.resolve(mapa)
          if (!mapaEmCurso) {
            mapaEmCurso = mapearGlobalIds(manager, (model as any).modelID).then((lido) => {
              mapa = lido
              return lido
            })
          }
          return mapaEmCurso
        }
        // Um so caminho de desenho: visibilidade do cenario e estado 4D se
        // somam. Sem isso, ocultar uma categoria com a regua ligada apagaria o
        // 4D, e mudar a data traria de volta o que o cenario escondeu.
        const renderizar = () => {
          const cena = sceneRef.current
          const estados = cena?.estados4d ?? null
          const ocultosPorCategoria = idsOcultos(categorias, cena?.ocultos ?? ocultosAtuais)
          if (!estados || !mapa) {
            aplicarDestaque(manager, model, scene, [], material4d)
            aplicarVisibilidadeIfc(manager, model, scene, todos, ocultosPorCategoria)
            return
          }
          const naoIniciados: string[] = []
          const ativos: string[] = []
          for (const [globalId, estado] of estados) {
            if (estado === 'nao_iniciado') naoIniciados.push(globalId)
            else if (estado === 'ativo') ativos.push(globalId)
          }
          const ocultos = new Set(ocultosPorCategoria)
          for (const id of expressIdsDe(mapa, naoIniciados)) ocultos.add(id)
          // O que esta em obra sai do subset normal e entra colorido: a mesma
          // geometria desenhada duas vezes brigaria no z-buffer.
          const idsAtivos = [...expressIdsDe(mapa, ativos)].filter((id) => !ocultos.has(id))
          aplicarVisibilidadeIfc(manager, model, scene, todos, ocultos, new Set(idsAtivos))
          aplicarDestaque(manager, model, scene, idsAtivos, material4d)
        }
        sceneRef.current = {
          camera,
          controls,
          model,
          vistaInicial: {
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
          },
          categorias,
          ocultos: ocultosAtuais,
          estados4d: null,
          garantirMapa,
          renderizar,
        }
        onModeloAberto?.(categorias)

        const pressedKeys = new Set<string>()
        const movementClock = new THREE.Clock()
        const movementSpeed = Math.max(maxDimension * 0.35, 2)
        const isTyping = () => {
          const active = document.activeElement
          return (
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            active instanceof HTMLSelectElement ||
            (active instanceof HTMLElement && active.isContentEditable)
          )
        }
        const onKeyDown = (event: KeyboardEvent) => {
          if (isTyping()) return
          const key = event.key.toLowerCase()
          if (['w', 'a', 's', 'd', 'q', 'e', 'shift'].includes(key)) {
            pressedKeys.add(key)
            event.preventDefault()
          }
        }
        const onKeyUp = (event: KeyboardEvent) => {
          pressedKeys.delete(event.key.toLowerCase())
        }
        const onWindowBlur = () => pressedKeys.clear()
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        window.addEventListener('blur', onWindowBlur)

        const resizeObserver = new ResizeObserver(() => {
          const nextWidth = Math.max(host.clientWidth, 1)
          const nextHeight = Math.max(host.clientHeight, 1)
          camera.aspect = nextWidth / nextHeight
          camera.updateProjectionMatrix()
          renderer.setSize(nextWidth, nextHeight)
        })
        resizeObserver.observe(host)

        let frameId = 0
        const animate = () => {
          const delta = Math.min(movementClock.getDelta(), 0.05)
          if (pressedKeys.size) {
            const forward = new THREE.Vector3()
              .subVectors(controls.target, camera.position)
              .setY(0)
              .normalize()
            const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
            const movement = new THREE.Vector3()

            if (pressedKeys.has('w')) movement.add(forward)
            if (pressedKeys.has('s')) movement.sub(forward)
            if (pressedKeys.has('d')) movement.add(right)
            if (pressedKeys.has('a')) movement.sub(right)
            if (pressedKeys.has('e')) movement.y += 1
            if (pressedKeys.has('q')) movement.y -= 1

            if (movement.lengthSq() > 0) {
              const multiplier = pressedKeys.has('shift') ? 3 : 1
              movement.normalize().multiplyScalar(movementSpeed * multiplier * delta)
              camera.position.add(movement)
              controls.target.add(movement)
            }
          }
          controls.update()
          renderer.render(scene, camera)
          frameId = requestAnimationFrame(animate)
        }
        animate()
        setLoadProgress(100)
        setLoadingModel(false)

        cleanup = () => {
          // Primeiro solta a ref: o handle nao pode alcancar uma cena que esta
          // sendo desmontada.
          sceneRef.current = null
          cancelAnimationFrame(frameId)
          resizeObserver.disconnect()
          window.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('keyup', onKeyUp)
          window.removeEventListener('blur', onWindowBlur)
          controls.dispose()
          material4d.dispose()
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return
            object.geometry?.dispose()
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            materials.forEach((material) => material?.dispose())
          })
          loader.ifcManager.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingModel(false)
          setLoadProgress(0)
          setLoadError(error instanceof Error ? error.message : 'Falha ao abrir modelo IFC.')
        }
      }
    }

    void renderIfc()
    return () => {
      cancelled = true
      cleanup()
    }
  }, [modelId, modelName])

  useImperativeHandle(ref, (): ViewerHandle => ({
    pronto: () => sceneRef.current !== null,

    capturarCamera: () => {
      const cena = sceneRef.current
      if (!cena) return null
      const p = cena.camera.position
      const t = cena.controls.target
      // Arredonda: seis casas bastam para reposicionar a camera e evitam que o
      // jsonb do cenario guarde ruido de ponto flutuante.
      const n = (v: number) => Math.round(v * 1e6) / 1e6
      return {
        position: { x: n(p.x), y: n(p.y), z: n(p.z) },
        target: { x: n(t.x), y: n(t.y), z: n(t.z) },
      }
    },

    capturarOcultos: () => {
      const cena = sceneRef.current
      return cena ? Array.from(cena.ocultos) : []
    },

    aplicarCamera: (camera) => {
      const cena = sceneRef.current
      if (!cena || !camera?.position || !camera?.target) return false
      cena.camera.position.set(camera.position.x, camera.position.y, camera.position.z)
      cena.controls.target.set(camera.target.x, camera.target.y, camera.target.z)
      cena.camera.updateProjectionMatrix()
      cena.controls.update()
      return true
    },

    redefinirVista: () => {
      const cena = sceneRef.current
      if (!cena) return false
      // Com damping ligado, o OrbitControls guarda um resto de inercia do
      // arrasto anterior e o aplicaria nos frames seguintes ao reset. Um
      // update() sem damping consome esse resto (ele zera os deltas), e so
      // entao reset() volta ao enquadramento salvo com saveState() ao abrir.
      const { controls } = cena
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.reset()
      controls.enableDamping = damping
      return true
    },

    aplicarOcultos: (tiposIfc) => {
      const cena = sceneRef.current
      if (!cena) return false
      cena.ocultos.clear()
      for (const t of tiposIfc ?? []) cena.ocultos.add(t)
      cena.renderizar()
      return true
    },

    categorias: () => sceneRef.current?.categorias ?? [],

    globalIdsDasCategorias: async (tiposIfc) => {
      const cena = sceneRef.current
      if (!cena) return []
      const mapa = await cena.garantirMapa()
      // A categoria ja conhece seus expressIDs; o mapa so troca a moeda.
      return globalIdsDe(mapa, idsDosTipos(cena.categorias, tiposIfc ?? []))
    },

    aplicar4d: async (estados) => {
      const cena = sceneRef.current
      if (!cena) return false
      // Garante o mapa ANTES de guardar o estado: sem ele o renderizar cairia
      // no caminho sem 4D e a data escolhida nao apareceria na tela.
      if (estados) await cena.garantirMapa()
      const atual = sceneRef.current
      if (!atual) return false
      atual.estados4d = estados
      atual.renderizar()
      return true
    },
  }), [])

  return (
    <main className="viewer-canvas">
      <div ref={hostRef} className="viewer-canvas__host" />

      {!modelId && (
        <>
          <div className="viewer-canvas__grid" aria-hidden="true" />
          <div className="viewer-empty-state">
            <div className="viewer-empty-state__icon">
              <ArxisIcon name="viewer" size={32} />
            </div>
            <h2>Nenhum modelo selecionado</h2>
            <p>
              {projectName
                ? `Envie um modelo IFC para começar a visualizar ${projectName}.`
                : 'Selecione ou crie um projeto para enviar um modelo IFC.'}
            </p>
            <button
              className="viewer-upload-button"
              type="button"
              onClick={onUpload}
              disabled={uploading}
              aria-label={uploading ? 'Enviando modelo IFC' : 'Enviar modelo IFC'}
            >
              <ArxisIcon name="upload" size={18} />
              <span>{uploading ? 'Enviando…' : 'Enviar modelo IFC'}</span>
            </button>
          </div>
        </>
      )}

      {loadingModel && (
        <div className="viewer-loading-state" role="status">
          <Loader2 className="spin" size={28} strokeWidth={1.45} />
          <h2>Abrindo modelo IFC</h2>
          <p>{modelName}</p>
          <div className="viewer-loading-state__bar">
            <span style={{ width: `${loadProgress}%` }} />
          </div>
        </div>
      )}

      {loadError && (
        <div className="viewer-loading-state viewer-loading-state--error" role="alert">
          <AlertTriangle size={28} strokeWidth={1.45} />
          <h2>Não foi possível abrir o IFC</h2>
          <p>{loadError}</p>
        </div>
      )}

      {modelId && !loadingModel && !loadError && (
        <>
          {/* Teclado/mouse: o CSS so mostra em ponteiro fino. */}
          <div className="viewer-navigation-help viewer-navigation-help--keyboard" aria-hidden="true">
            <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover</span>
            <span><kbd>Q</kbd><kbd>E</kbd> altura</span>
            <span><kbd>Shift</kbd> acelerar</span>
            <span>Mouse orbitar e zoom</span>
          </div>
          {/* Touch: so os gestos que o OrbitControls de fato faz (1 dedo
              orbita, pinca da zoom, 2 dedos move). Nao ha toque duplo. Fecha
              no X e fica fechada nas proximas visitas. */}
          {!touchHelpDismissed && (
            <div className="viewer-navigation-help viewer-navigation-help--touch" role="note" aria-label="Como navegar no modelo">
              <span className="viewer-help-gesto"><b>1 dedo</b> orbita</span>
              <span className="viewer-help-gesto"><b>Pinça</b> zoom</span>
              <span className="viewer-help-gesto"><b>2 dedos</b> move</span>
              <button type="button" className="viewer-help-close" onClick={dismissTouchHelp} aria-label="Fechar dica">
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
})

export default ViewerCanvas
