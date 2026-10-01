import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import { CameraSync } from './cameraSync'
import type { Scenario } from '@/services/scenarios.service'
import {
  aplicarDestaque,
  aplicarVisibilidade,
  diferencaVisibilidade,
  expressIdsDe,
  idsOcultos,
  listarCategorias,
  mapearGlobalIds,
  todosExpressIds,
  type DiferencaCategoria,
  type MapaIfc,
} from '@/components/viewer/visibilidadeIfc'
import { estadosNaData, type Estado4d } from '@/components/viewer/estado4d'
import type { Atividade } from '@/services/schedules.service'

interface ComparisonCanvasProps {
  modelId: string
  modelName: string
  scenarioA: Scenario
  scenarioB: Scenario
  /** Câmeras andam juntas? Controlado pela tela. */
  travado: boolean
  /**
   * Comparação temporal ligada (S26): as atividades de cada lado e a data que
   * a régua marca. Com `null` o split é o do S18, puramente visual.
   */
  atividades4d?: { A: Atividade[]; B: Atividade[] } | null
  data4d?: string
}

/** O que cada lado do split publica para a tela repintar por data. */
interface LadoVivo {
  controls: any
  destruir: () => void
  /** `null` volta ao split visual do S18; com estados, pinta o 4D. */
  renderizar: (estados: Map<string, Estado4d> | null) => Promise<void>
}

export interface ComparisonHandle {
  /**
   * PNG com os dois lados como estão na tela, rotulados. Devolve null se ainda
   * não há canvas (carregando ou erro). Sem backend: é `drawImage` dos dois
   * canvas WebGL num canvas 2D e `toBlob`.
   */
  exportarImagem: () => Promise<Blob | null>
}

/**
 * Split-view A|B do S18.
 *
 * Duas cenas independentes, cada uma com sua câmera e seus OrbitControls, e um
 * `CameraSync` ligando as duas. O IFC é baixado UMA vez e o mesmo blob alimenta
 * os dois lados: são 2,5 MB e a rede não precisa pagar duas vezes.
 *
 * Cada lado aplica o estado do seu cenário (câmera e visibilidade), então a
 * diferença entre os dois viewports é exatamente a diferença entre os cenários.
 */
const ComparisonCanvas = forwardRef<ComparisonHandle, ComparisonCanvasProps>(function ComparisonCanvas({
  modelId,
  modelName,
  scenarioA,
  scenarioB,
  travado,
  atividades4d = null,
  data4d = '',
}: ComparisonCanvasProps, ref) {
  const hostA = useRef<HTMLDivElement>(null)
  const hostB = useRef<HTMLDivElement>(null)
  const syncRef = useRef<CameraSync | null>(null)
  // Cada lado publica como se repintar (S26): a data da regua muda a cena sem
  // remontar nada, como o cadeado da camera ja fazia no S18.
  const ladosRef = useRef<{ A: LadoVivo; B: LadoVivo } | null>(null)
  const [montagem, setMontagem] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Diferencas por categoria, calculadas do estado dos cenarios (nao de pixel).
  // null = modelo ainda nao lido; [] = os dois cenarios mostram o mesmo.
  const [diferencas, setDiferencas] = useState<DiferencaCategoria[] | null>(null)

  useImperativeHandle(ref, (): ComparisonHandle => ({
    exportarImagem: async () => {
      const ca = hostA.current?.querySelector('canvas')
      const cb = hostB.current?.querySelector('canvas')
      if (!ca || !cb) return null
      const rotulo = 36
      const vao = 8
      const rodape = (atividades4d && data4d) || (diferencas && diferencas.length) ? 30 : 0
      const w = ca.width + vao + cb.width
      const h = Math.max(ca.height, cb.height) + rotulo + rodape
      const saida = document.createElement('canvas')
      saida.width = w
      saida.height = h
      const ctx = saida.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, w, h)
      // Os renderers foram criados com preserveDrawingBuffer para este drawImage
      // nao vir preto (sem isso o buffer WebGL e descartado apos cada frame).
      ctx.drawImage(ca, 0, rotulo)
      ctx.drawImage(cb, ca.width + vao, rotulo)
      ctx.fillStyle = '#f4f4f5'
      ctx.font = `600 ${Math.round(rotulo * 0.42)}px Inter, system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillText(`A · ${scenarioA.name}`, 12, rotulo / 2)
      ctx.fillText(`B · ${scenarioB.name}`, ca.width + vao + 12, rotulo / 2)
      ctx.fillStyle = '#a1a1aa'
      ctx.font = `${Math.round(rotulo * 0.32)}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(`${modelName} · Arxis · ${new Date().toLocaleDateString('pt-BR')}`, w - 12, rotulo / 2)
      if (rodape && atividades4d && data4d) {
        // Com a regua ligada o que a imagem precisa dizer e a data: sem ela o
        // PNG vira "duas obras pela metade" sem explicacao.
        const y = h - rodape / 2
        ctx.textAlign = 'left'
        ctx.font = `${Math.round(rotulo * 0.34)}px Inter, system-ui, sans-serif`
        ctx.fillStyle = '#facc15'
        ctx.fillRect(12, y - 5, 10, 10)
        ctx.fillStyle = '#f4f4f5'
        ctx.fillText(
          `Em obra em ${new Date(`${data4d}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
          28,
          y,
        )
      } else if (rodape && diferencas) {
        // A diferenca vai escrita no PNG: quem recebe a imagem nao ve a legenda da tela.
        const y = h - rodape / 2
        ctx.textAlign = 'left'
        ctx.font = `${Math.round(rotulo * 0.34)}px Inter, system-ui, sans-serif`
        let x = 12
        ctx.fillStyle = '#a1a1aa'
        ctx.fillText('Diferenças:', x, y)
        x += ctx.measureText('Diferenças:').width + 12
        for (const d of diferencas) {
          ctx.fillStyle = d.visivelEm === 'A' ? '#f97316' : '#d946ef'
          ctx.fillRect(x, y - 5, 10, 10)
          x += 16
          ctx.fillStyle = '#f4f4f5'
          const texto = `${d.nome} (só em ${d.visivelEm})`
          ctx.fillText(texto, x, y)
          x += ctx.measureText(texto).width + 18
        }
      }
      return new Promise((ok) => saida.toBlob((b) => ok(b), 'image/png'))
    },
  }), [scenarioA.name, scenarioB.name, modelName, diferencas, atividades4d, data4d])

  // O cadeado muda sem remontar a cena: só avisa o sync que já existe.
  // A primeira execução é pulada de propósito: ela roda antes das cenas
  // existirem e, quando elas chegam, alinharia B com A, apagando a câmera do
  // cenário B. Quem define o estado inicial é o `setLocked(travado, false)`
  // lá embaixo, na montagem.
  const primeiraVez = useRef(true)
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false
      return
    }
    syncRef.current?.setLocked(travado)
  }, [travado])

  // A data manda nos dois lados ao mesmo tempo: e o que torna a comparacao
  // temporal, e nao duas animacoes soltas. Cada lado usa o SEU cronograma.
  useEffect(() => {
    const lados = ladosRef.current
    if (!lados) return
    if (!atividades4d || !data4d) {
      void lados.A.renderizar(null)
      void lados.B.renderizar(null)
      return
    }
    // Mesmo atraso do viewer: aqui sao DUAS cenas por repintura, entao arrastar
    // a regua sem folga custaria o dobro.
    const espera = setTimeout(() => {
      void lados.A.renderizar(estadosNaData(atividades4d.A, data4d))
      void lados.B.renderizar(estadosNaData(atividades4d.B, data4d))
    }, 120)
    return () => clearTimeout(espera)
  }, [atividades4d, data4d, montagem])

  useEffect(() => {
    const a = hostA.current
    const b = hostB.current
    if (!a || !b || !modelId) return

    let cancelado = false
    let limpar = () => {}

    async function montar() {
      setCarregando(true)
      setErro(null)
      a!.replaceChildren()
      b!.replaceChildren()

      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
        const { IFCLoader } = await import('web-ifc-three')

        const token = localStorage.getItem('arxisvr_token')
        if (!token) throw new Error('Sessão expirada. Entre novamente.')

        const resposta = await fetch(buildApiV1Url(`/ifc/${modelId}/download`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resposta.ok) throw new Error(`Falha ao baixar IFC (${resposta.status}).`)
        const blob = await resposta.blob()
        if (cancelado) return

        const ocultosA = scenarioA.metadata?.visibility?.hiddenIfcCategories ?? []
        const ocultosB = scenarioB.metadata?.visibility?.hiddenIfcCategories ?? []
        // Cores do destaque: laranja = visivel so em A; magenta = visivel so em B.
        // Nenhuma das duas aparece em material de IFC comum (verde confundia
        // com o terreno do modelo de teste).
        const materialSoEmA = new THREE.MeshLambertMaterial({ color: 0xf97316, emissive: 0x9a3412, emissiveIntensity: 0.45 })
        const materialSoEmB = new THREE.MeshLambertMaterial({ color: 0xd946ef, emissive: 0x86198f, emissiveIntensity: 0.45 })
        // Amarelo = em obra na data da regua (S26). O destaque e um so por
        // modelo, entao com a comparacao temporal ligada ele passa a mostrar o
        // que esta em obra, e nao mais a diferenca de categoria do S18: sao
        // duas perguntas distintas e a legenda diz qual esta na tela.
        const material4dA = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e, emissiveIntensity: 0.5 })
        const material4dB = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e, emissiveIntensity: 0.5 })

        // UM loader para os dois lados. Com dois IFCLoader o web-ifc-three
        // partilha a API wasm por baixo: o segundo modelo nascia com modelID 1
        // num manager que so conhecia o 0, e getAllItemsOfType devolvia nada
        // (o lado B ficava sem categorias e sem destaque).
        const loader = new IFCLoader()
        loader.ifcManager.setWasmPath('/wasm/')
        loader.ifcManager.useWebWorkers(false)
        loader.ifcManager.applyWebIfcConfig({ COORDINATE_TO_ORIGIN: true, USE_FAST_BOOLS: true })

        // Um lado do split. Devolve o que o cleanup e o sync precisam.
        const montarLado = async (host: HTMLDivElement, cenario: Scenario, lado: 'A' | 'B') => {
          const largura = Math.max(host.clientWidth, 1)
          const altura = Math.max(host.clientHeight, 1)

          const scene = new THREE.Scene()
          scene.background = new THREE.Color(0x121416)
          const camera = new THREE.PerspectiveCamera(45, largura / altura, 0.05, 100000)
          camera.position.set(10, 10, 10)

          const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          renderer.setSize(largura, altura)
          host.appendChild(renderer.domElement)

          const controls = new OrbitControls(camera, renderer.domElement)
          controls.enableDamping = true
          controls.dampingFactor = 0.08

          scene.add(new THREE.HemisphereLight(0xffffff, 0x263238, 2.2))
          const luz = new THREE.DirectionalLight(0xffffff, 2.6)
          luz.position.set(20, 30, 15)
          scene.add(luz)
          const grid = new THREE.GridHelper(100, 100, 0x3a4651, 0x222a31)
          scene.add(grid)

          const url = URL.createObjectURL(blob)
          const model = await new Promise<any>((ok, falha) => loader.load(url, ok, undefined, falha))
          URL.revokeObjectURL(url)
          scene.add(model)

          const caixa = new THREE.Box3().setFromObject(model)
          const centro = caixa.getCenter(new THREE.Vector3())
          const tamanho = caixa.getSize(new THREE.Vector3())
          const maior = Math.max(tamanho.x, tamanho.y, tamanho.z, 1)
          camera.near = Math.max(maior / 10000, 0.01)
          camera.far = Math.max(maior * 100, 1000)
          grid.position.y = caixa.min.y
          grid.scale.setScalar(Math.max(maior / 100, 0.25))

          // O estado do cenário: é isto que faz um lado diferir do outro.
          if (cenario.camera?.position && cenario.camera?.target) {
            camera.position.set(
              cenario.camera.position.x,
              cenario.camera.position.y,
              cenario.camera.position.z,
            )
            controls.target.set(
              cenario.camera.target.x,
              cenario.camera.target.y,
              cenario.camera.target.z,
            )
          } else {
            const distancia = maior / (2 * Math.tan((camera.fov * Math.PI) / 360))
            const direcao = new THREE.Vector3(1, 0.75, 1).normalize()
            camera.position.copy(centro).add(direcao.multiplyScalar(distancia * 1.35))
            controls.target.copy(centro)
          }
          camera.updateProjectionMatrix()
          controls.update()

          // Visibilidade do cenario por categoria IFC, e o destaque do que so
          // este lado mostra. O destaque sai do subset normal (senao a mesma
          // geometria seria desenhada duas vezes e tremeria) e entra com cor.
          const manager = loader.ifcManager as any
          const categorias = await listarCategorias(manager, model.modelID)
          const todos = todosExpressIds(model)
          const ocultosDesteLado = new Set(lado === 'A' ? ocultosA : ocultosB)
          const ocultosDoOutro = new Set(lado === 'A' ? ocultosB : ocultosA)
          // visivel aqui e oculto la = "so em <lado>"
          const soAqui = [...ocultosDoOutro].filter((t) => !ocultosDesteLado.has(t))
          const idsSoAqui = idsOcultos(categorias, soAqui)
          const idsOcultosDesteLado = idsOcultos(categorias, ocultosDesteLado)
          const materialDoLado = lado === 'A' ? materialSoEmA : materialSoEmB
          const material4d = lado === 'A' ? material4dA : material4dB

          // GlobalId x expressID so e lido quando a comparacao temporal entra:
          // quem abre o split para ver geometria nao paga por isso.
          let mapa: MapaIfc | null = null
          let mapaEmCurso: Promise<MapaIfc> | null = null
          const garantirMapa = () => {
            if (mapa) return Promise.resolve(mapa)
            if (!mapaEmCurso) {
              mapaEmCurso = mapearGlobalIds(manager, model.modelID).then((lido) => {
                mapa = lido
                return lido
              })
            }
            return mapaEmCurso
          }

          const renderizar = async (estados: Map<string, Estado4d> | null) => {
            if (!estados) {
              // Volta ao split do S18. O destaque 4D sai primeiro: subset e
              // indexado por material, e trocar sem remover deixaria o antigo
              // desenhado por baixo.
              aplicarDestaque(manager, model, scene, [], material4d)
              aplicarVisibilidade(manager, model, scene, todos, idsOcultosDesteLado, idsSoAqui)
              aplicarDestaque(manager, model, scene, [...idsSoAqui], materialDoLado)
              return
            }
            const mapaLido = await garantirMapa()
            const naoIniciados: string[] = []
            const ativos: string[] = []
            for (const [globalId, estado] of estados) {
              if (estado === 'nao_iniciado') naoIniciados.push(globalId)
              else if (estado === 'ativo') ativos.push(globalId)
            }
            const ocultos = new Set(idsOcultosDesteLado)
            for (const id of expressIdsDe(mapaLido, naoIniciados)) ocultos.add(id)
            const idsAtivos = [...expressIdsDe(mapaLido, ativos)].filter((id) => !ocultos.has(id))
            aplicarDestaque(manager, model, scene, [], materialDoLado)
            aplicarVisibilidade(manager, model, scene, todos, ocultos, new Set(idsAtivos))
            aplicarDestaque(manager, model, scene, idsAtivos, material4d)
          }

          await renderizar(null)
          if (lado === 'A') setDiferencas(diferencaVisibilidade(categorias, ocultosA, ocultosB))

          const observer = new ResizeObserver(() => {
            const l = Math.max(host.clientWidth, 1)
            const h = Math.max(host.clientHeight, 1)
            camera.aspect = l / h
            camera.updateProjectionMatrix()
            renderer.setSize(l, h)
          })
          observer.observe(host)

          let frame = 0
          const animar = () => {
            controls.update()
            renderer.render(scene, camera)
            frame = requestAnimationFrame(animar)
          }
          animar()

          return {
            controls,
            renderizar,
            destruir: () => {
              cancelAnimationFrame(frame)
              observer.disconnect()
              controls.dispose()
              scene.traverse((o: any) => {
                if (!(o instanceof THREE.Mesh)) return
                o.geometry?.dispose()
                const mats = Array.isArray(o.material) ? o.material : [o.material]
                mats.forEach((m: any) => m?.dispose())
              })
              renderer.dispose()
              renderer.domElement.remove()
            },
          }
        }

        const ladoA = await montarLado(a!, scenarioA, 'A')
        if (cancelado) {
          ladoA.destruir()
          loader.ifcManager.dispose()
          return
        }
        const ladoB = await montarLado(b!, scenarioB, 'B')
        if (cancelado) {
          ladoA.destruir()
          ladoB.destruir()
          loader.ifcManager.dispose()
          return
        }

        const sync = new CameraSync(ladoA.controls, ladoB.controls)
        // `false` no segundo argumento: nao alinhar agora. Cada lado tem de
        // abrir na camera do SEU cenario; alinhar aqui apagaria a de B.
        sync.setLocked(travado, false)
        syncRef.current = sync

        ladosRef.current = { A: ladoA, B: ladoB }
        setCarregando(false)
        // Avisa o efeito da data: a cena so existe agora, e se a regua ja
        // estava ligada (ex.: link com ?data= na URL) ela precisa pintar.
        setMontagem((n) => n + 1)
        limpar = () => {
          sync.dispose()
          syncRef.current = null
          ladosRef.current = null
          ladoA.destruir()
          ladoB.destruir()
          materialSoEmA.dispose()
          materialSoEmB.dispose()
          material4dA.dispose()
          material4dB.dispose()
          loader.ifcManager.dispose()
        }
      } catch (e) {
        if (!cancelado) {
          setCarregando(false)
          setErro(e instanceof Error ? e.message : 'Falha ao abrir a comparação.')
        }
      }
    }

    setDiferencas(null)
    void montar()
    return () => {
      cancelado = true
      limpar()
    }
    // `travado` fica fora de propósito: mudar o cadeado não remonta as cenas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, scenarioA.id, scenarioB.id])

  return (
    <div className="comparison-canvas">
      <div className="comparison-canvas__lado">
        <span className="comparison-canvas__rotulo">A · {scenarioA.name}</span>
        <div ref={hostA} className="comparison-canvas__host" />
      </div>
      <div className="comparison-canvas__divisor" aria-hidden="true" />
      <div className="comparison-canvas__lado">
        <span className="comparison-canvas__rotulo">B · {scenarioB.name}</span>
        <div ref={hostB} className="comparison-canvas__host" />
      </div>

      {!carregando && !erro && diferencas && !atividades4d && (
        <aside className="compare-diff" aria-label="Diferenças entre os cenários">
          <h3>Diferenças</h3>
          {diferencas.length === 0 ? (
            <p className="compare-diff__vazio">Os dois cenários mostram as mesmas categorias. A diferença é só o ponto de vista.</p>
          ) : (
            <ul>
              {diferencas.map((d) => (
                <li key={d.nome}>
                  <span className={`compare-diff__cor compare-diff__cor--${d.visivelEm.toLowerCase()}`} aria-hidden="true" />
                  <b>{d.nome}</b>
                  <span className="compare-diff__onde">
                    {d.visivelEm === 'A' ? 'visível em A · oculta em B' : 'oculta em A · visível em B'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
      {carregando && (
        <div className="viewer-loading-state" role="status">
          <Loader2 className="spin" size={28} strokeWidth={1.45} />
          <h2>Abrindo comparação</h2>
          <p>{modelName}</p>
        </div>
      )}
      {erro && (
        <div className="viewer-loading-state viewer-loading-state--error" role="alert">
          <AlertTriangle size={28} strokeWidth={1.45} />
          <h2>Não foi possível comparar</h2>
          <p>{erro}</p>
        </div>
      )}
    </div>
  )
})

export default ComparisonCanvas
