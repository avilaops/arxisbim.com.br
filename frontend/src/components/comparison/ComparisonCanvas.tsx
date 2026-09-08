import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import { CameraSync } from './cameraSync'
import type { Scenario } from '@/services/scenarios.service'

interface ComparisonCanvasProps {
  modelId: string
  modelName: string
  scenarioA: Scenario
  scenarioB: Scenario
  /** Câmeras andam juntas? Controlado pela tela. */
  travado: boolean
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
export default function ComparisonCanvas({
  modelId,
  modelName,
  scenarioA,
  scenarioB,
  travado,
}: ComparisonCanvasProps) {
  const hostA = useRef<HTMLDivElement>(null)
  const hostB = useRef<HTMLDivElement>(null)
  const syncRef = useRef<CameraSync | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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

        // Um lado do split. Devolve o que o cleanup e o sync precisam.
        const montarLado = async (host: HTMLDivElement, cenario: Scenario) => {
          const largura = Math.max(host.clientWidth, 1)
          const altura = Math.max(host.clientHeight, 1)

          const scene = new THREE.Scene()
          scene.background = new THREE.Color(0x121416)
          const camera = new THREE.PerspectiveCamera(45, largura / altura, 0.05, 100000)
          camera.position.set(10, 10, 10)

          const renderer = new THREE.WebGLRenderer({ antialias: true })
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

          const loader = new IFCLoader()
          loader.ifcManager.setWasmPath('/wasm/')
          loader.ifcManager.useWebWorkers(false)
          loader.ifcManager.applyWebIfcConfig({ COORDINATE_TO_ORIGIN: true, USE_FAST_BOOLS: true })

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

          const ocultos = new Set(cenario.metadata?.hidden ?? [])
          if (ocultos.size) {
            model.traverse((filho: any) => {
              if (filho instanceof THREE.Mesh) filho.visible = !ocultos.has(filho.id)
            })
          }

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
              loader.ifcManager.dispose()
              renderer.dispose()
              renderer.domElement.remove()
            },
          }
        }

        const ladoA = await montarLado(a!, scenarioA)
        if (cancelado) {
          ladoA.destruir()
          return
        }
        const ladoB = await montarLado(b!, scenarioB)
        if (cancelado) {
          ladoA.destruir()
          ladoB.destruir()
          return
        }

        const sync = new CameraSync(ladoA.controls, ladoB.controls)
        // `false` no segundo argumento: nao alinhar agora. Cada lado tem de
        // abrir na camera do SEU cenario; alinhar aqui apagaria a de B.
        sync.setLocked(travado, false)
        syncRef.current = sync

        setCarregando(false)
        limpar = () => {
          sync.dispose()
          syncRef.current = null
          ladoA.destruir()
          ladoB.destruir()
        }
      } catch (e) {
        if (!cancelado) {
          setCarregando(false)
          setErro(e instanceof Error ? e.message : 'Falha ao abrir a comparação.')
        }
      }
    }

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
}
