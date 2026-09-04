import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, GitCompare, Layers, Link2, Unlink } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ComparisonCanvas from '@/components/comparison/ComparisonCanvas'
import { scenariosService, type Scenario } from '@/services/scenarios.service'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import '@/styles/viewer.css'

interface ModeloResumo {
  id: string
  originalName: string
}

/**
 * S18 ★ — comparação visual de cenários.
 *
 * A tela tem dois momentos de propósito: primeiro o usuário escolhe A e B,
 * depois abre o split. Cair direto num split vazio ficaria técnico demais e não
 * demonstraria nada para quem não conhece o produto.
 *
 * Escopo travado no visual: nada de custo, prazo ou PDF, que são S26/S30.
 */
export default function ComparePage() {
  const [modelo, setModelo] = useState<ModeloResumo | null>(null)
  const [cenarios, setCenarios] = useState<Scenario[]>([])
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')
  const [comparando, setComparando] = useState(false)
  const [travado, setTravado] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const projectId = localStorage.getItem('arxisvr_project_id') || ''

  const carregar = useCallback(async () => {
    if (!projectId) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    try {
      const token = localStorage.getItem('arxisvr_token')
      const resposta = await fetch(buildApiV1Url(`/ifc/project/${projectId}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const modelos: ModeloResumo[] = resposta.ok ? await resposta.json() : []
      setModelo(modelos[0] ?? null)
      setCenarios(await scenariosService.list(projectId))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar cenários.')
    } finally {
      setCarregando(false)
    }
  }, [projectId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const cenarioA = cenarios.find((c) => c.id === idA)
  const cenarioB = cenarios.find((c) => c.id === idB)
  // A x A não compara nada: o marco é ver a diferença entre dois cenários.
  const podeComparar = Boolean(cenarioA && cenarioB && idA !== idB && modelo)

  if (comparando && cenarioA && cenarioB && modelo) {
    return (
      <AppShell>
        <div className="compare-page">
          <header className="viewer-toolbar">
            <div className="viewer-toolbar__title">
              <GitCompare size={17} strokeWidth={1.45} />
              <div>
                <h1>Comparar cenários</h1>
                <span>
                  {cenarioA.name} · {cenarioB.name}
                </span>
              </div>
            </div>
            <div className="viewer-toolbar__actions">
              <button
                className="viewer-icon-button"
                type="button"
                onClick={() => setTravado((v) => !v)}
                aria-label={travado ? 'Soltar câmeras' : 'Sincronizar câmeras'}
                title={travado ? 'Câmeras sincronizadas' : 'Câmeras independentes'}
              >
                {travado ? (
                  <Link2 size={17} strokeWidth={1.45} />
                ) : (
                  <Unlink size={17} strokeWidth={1.45} />
                )}
              </button>
              <button
                className="viewer-upload-button"
                type="button"
                onClick={() => setComparando(false)}
              >
                <ArrowLeft size={17} strokeWidth={1.45} />
                <span>Trocar cenários</span>
              </button>
            </div>
          </header>

          <ComparisonCanvas
            modelId={modelo.id}
            modelName={modelo.originalName}
            scenarioA={cenarioA}
            scenarioB={cenarioB}
            travado={travado}
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="compare-page">
        <header className="viewer-toolbar">
          <div className="viewer-toolbar__title">
            <GitCompare size={17} strokeWidth={1.45} />
            <div>
              <h1>Comparar cenários</h1>
              <span>Escolha dois cenários para ver lado a lado</span>
            </div>
          </div>
        </header>

        <div className="compare-picker">
          {carregando ? (
            <p className="compare-picker__aviso">Carregando cenários…</p>
          ) : erro ? (
            <p className="compare-picker__aviso">{erro}</p>
          ) : cenarios.length < 2 ? (
            <div className="viewer-empty-state">
              <div className="viewer-empty-state__icon">
                <Layers size={32} strokeWidth={1.45} />
              </div>
              <h2>São necessários dois cenários</h2>
              <p>
                {cenarios.length === 0
                  ? 'Este projeto ainda não tem cenários. Crie dois no Viewer 3D para comparar.'
                  : 'Este projeto tem só um cenário. Crie outro no Viewer 3D para comparar.'}
              </p>
              <a className="viewer-upload-button" href="/app">
                <Layers size={17} strokeWidth={1.45} />
                <span>Ir para o Viewer 3D</span>
              </a>
            </div>
          ) : (
            <>
              <div className="compare-picker__colunas">
                {(
                  [
                    ['A', idA, setIdA, idB],
                    ['B', idB, setIdB, idA],
                  ] as const
                ).map(([lado, valor, definir, oOutro]) => (
                  <div key={lado} className="compare-picker__coluna">
                    <span className="compare-picker__rotulo">Cenário {lado}</span>
                    <div className="viewer-panel__list">
                      {cenarios.map((cenario) => (
                        <button
                          key={cenario.id}
                          type="button"
                          className={`viewer-panel__item ${cenario.id === valor ? 'is-active' : ''}`}
                          disabled={cenario.id === oOutro}
                          title={
                            cenario.id === oOutro
                              ? 'Já escolhido do outro lado'
                              : undefined
                          }
                          onClick={() => definir(cenario.id)}
                        >
                          <Layers size={16} strokeWidth={1.45} />
                          <span>{cenario.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="viewer-upload-button"
                type="button"
                disabled={!podeComparar}
                onClick={() => setComparando(true)}
              >
                <GitCompare size={17} strokeWidth={1.45} />
                <span>Comparar</span>
              </button>
              {!modelo && !carregando && (
                <p className="compare-picker__aviso">
                  Este projeto não tem modelo IFC. Envie um no Viewer 3D.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
