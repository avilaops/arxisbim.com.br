import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Box, Loader2, Upload } from 'lucide-react'

interface ViewerCanvasProps {
  onUpload: () => void
  uploading: boolean
  projectName?: string
  modelId?: string
  modelName?: string
}

export default function ViewerCanvas({
  onUpload,
  uploading,
  projectName,
  modelId,
  modelName,
}: ViewerCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loadingModel, setLoadingModel] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !modelId || !modelName) return

    let cancelled = false
    let cleanup = () => {}

    async function renderIfc() {
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
        renderer.outputColorSpace = THREE.SRGBColorSpace
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

        const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(
          /\/api\/v1\/?$/,
          '',
        )
        setLoadProgress(15)
        const response = await fetch(`${apiOrigin}/api/v1/ifc/${modelId}/download`, {
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

        grid.position.y = box.min.y
        grid.scale.setScalar(Math.max(maxDimension / 100, 0.25))

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
          cancelAnimationFrame(frameId)
          resizeObserver.disconnect()
          window.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('keyup', onKeyUp)
          window.removeEventListener('blur', onWindowBlur)
          controls.dispose()
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

  return (
    <main className="viewer-canvas">
      <div ref={hostRef} className="viewer-canvas__host" />

      {!modelId && (
        <>
          <div className="viewer-canvas__grid" aria-hidden="true" />
          <div className="viewer-empty-state">
            <div className="viewer-empty-state__icon">
              <Box size={32} strokeWidth={1.45} />
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
            >
              <Upload size={17} strokeWidth={1.45} />
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
        <div className="viewer-navigation-help">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover</span>
          <span><kbd>Q</kbd><kbd>E</kbd> altura</span>
          <span><kbd>Shift</kbd> acelerar</span>
          <span>Mouse orbitar e zoom</span>
        </div>
      )}
    </main>
  )
}
