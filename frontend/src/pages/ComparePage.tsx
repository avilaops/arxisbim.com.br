import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Download, GitCompare, Layers, Link2, Unlink } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ComparisonCanvas, { type ComparisonHandle } from '@/components/comparison/ComparisonCanvas'
import ReguaTempo from '@/components/viewer/ReguaTempo'
import { dataLegivel, janelaDoCronograma, janelaUnida } from '@/components/viewer/estado4d'
import { scenariosService, type Scenario } from '@/services/scenarios.service'
import { schedulesService, type ComparacaoTemporal } from '@/services/schedules.service'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import '@/styles/viewer.css'

interface ModeloResumo {
  id: string
  originalName: string
}

/**
 * S18 ★ — comparação visual de cenários, e S26 ★ — comparação temporal.
 *
 * A tela tem dois momentos de propósito: primeiro o usuário escolhe A e B,
 * depois abre o split. Cair direto num split vazio ficaria técnico demais e não
 * demonstraria nada para quem não conhece o produto.
 *
 * O S18 respondia "os dois cenários mostram a mesma coisa?". O S26 acrescenta
 * a outra metade da decisão: "e qual termina antes?". A régua de prazo é um
 * modo do mesmo split — mesma tela, mesmo par A|B, mesma câmera sincronizada —
 * porque quem compara alternativas de obra olha geometria e data na mesma
 * conversa. Custo e PDF continuam fora: são S30.
 */
export default function ComparePage() {
  const [modelo, setModelo] = useState<ModeloResumo | null>(null)
  const [cenarios, setCenarios] = useState<Scenario[]>([])
  // A e B vivem na URL (?a=&b=): reload, voltar e link compartilhado reabrem a
  // mesma comparacao. O split so abre com os dois presentes e diferentes.
  const [params, setParams] = useSearchParams()
  const idA = params.get('a') ?? ''
  const idB = params.get('b') ?? ''
  const comparando = params.get('split') === '1'
  const setIdA = (id: string) => setParams((p) => { p.set('a', id); p.delete('split'); return p }, { replace: true })
  const setIdB = (id: string) => setParams((p) => { p.set('b', id); p.delete('split'); return p }, { replace: true })
  const setComparando = (v: boolean) => setParams((p) => { if (v) p.set('split', '1'); else p.delete('split'); return p })
  const [travado, setTravado] = useState(true)
  // S26: prazo e data também vivem na URL, pela mesma razão do A|B — um link
  // de comparação tem de reabrir na MESMA data, senão a prova não sobrevive ao
  // reload nem à pessoa para quem você mandou o link.
  const compararPrazo = params.get('prazo') === '1'
  const dataRegua = params.get('data') ?? ''
  const setCompararPrazo = (v: boolean) => setParams((p) => {
    if (v) p.set('prazo', '1')
    else { p.delete('prazo'); p.delete('data') }
    return p
  })
  const setDataRegua = (data: string) => setParams((p) => { p.set('data', data); return p }, { replace: true })
  const [comparacao, setComparacao] = useState<ComparacaoTemporal | null>(null)
  const [carregandoPrazo, setCarregandoPrazo] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [velocidade, setVelocidade] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const comparacaoRef = useRef<ComparisonHandle>(null)

  const exportarImagem = async () => {
    setExportando(true)
    try {
      const blob = await comparacaoRef.current?.exportarImagem()
      if (!blob) {
        setErro('A comparação ainda não terminou de abrir.')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const nome = (s: string) => s.normalize('NFD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
      a.href = url
      a.download = `comparacao-${nome(cenarioA?.name ?? 'a')}-x-${nome(cenarioB?.name ?? 'b')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } finally {
      setExportando(false)
    }
  }

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

  // S26: o prazo vem pronto do backend — os dois cronogramas passam pelo CPM e
  // voltam com early start/finish e o `deltaDays` entre as conclusões. Não se
  // recalcula caminho crítico no cliente.
  useEffect(() => {
    if (!comparando || !compararPrazo || !idA || !idB) {
      setComparacao(null)
      return
    }
    let cancelado = false
    setCarregandoPrazo(true)
    schedulesService
      .compararPrazo(idA, idB)
      .then((resposta) => { if (!cancelado) setComparacao(resposta) })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : 'Falha ao comparar prazos.') })
      .finally(() => { if (!cancelado) setCarregandoPrazo(false) })
    return () => { cancelado = true }
  }, [comparando, compararPrazo, idA, idB])

  // Memoizadas porque descem como prop para o canvas: um array novo a cada
  // render remontaria a pintura 4D sem que nada tivesse mudado.
  const atividadesA = useMemo(() => comparacao?.scenarioA.schedule?.activities ?? [], [comparacao])
  const atividadesB = useMemo(() => comparacao?.scenarioB.schedule?.activities ?? [], [comparacao])
  const temCronograma = atividadesA.length > 0 || atividadesB.length > 0
  // Uma régua só para os dois lados: a janela cobre do primeiro começo à última
  // conclusão dos dois cronogramas, senão um lado terminaria fora da régua.
  const janela4d = useMemo(
    () => janelaUnida(janelaDoCronograma(atividadesA), janelaDoCronograma(atividadesB)),
    [atividadesA, atividadesB],
  )
  const atividades4d = useMemo(
    () => (compararPrazo && temCronograma ? { A: atividadesA, B: atividadesB } : null),
    [compararPrazo, temCronograma, atividadesA, atividadesB],
  )
  const dataValida = dataRegua || janela4d?.inicio || ''

  // Link sem data (o primeiro clique em "Comparar prazo") abre no início da obra.
  useEffect(() => {
    if (compararPrazo && !dataRegua && janela4d) setDataRegua(janela4d.inicio)
    // setDataRegua vem de useSearchParams e muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compararPrazo, dataRegua, janela4d?.inicio])

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
                className="viewer-upload-button"
                type="button"
                onClick={() => void exportarImagem()}
                disabled={exportando}
                aria-label="Exportar imagem da comparação"
                title="Baixa um PNG com os dois lados como estão na tela"
              >
                <Download size={17} strokeWidth={1.45} />
                <span>{exportando ? 'Gerando…' : 'Exportar imagem'}</span>
              </button>
              <button
                className={`viewer-upload-button ${compararPrazo ? 'is-active' : ''}`}
                type="button"
                onClick={() => { setCompararPrazo(!compararPrazo); setTocando(false) }}
                aria-pressed={compararPrazo}
                title="Mostra os dois cenários na mesma data e a diferença de prazo"
              >
                <CalendarClock size={17} strokeWidth={1.45} />
                <span>{compararPrazo ? 'Sair do prazo' : 'Comparar prazo'}</span>
              </button>
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

          {erro && (
            <p className="compare-picker__aviso" role="alert">{erro}</p>
          )}
          <ComparisonCanvas
            ref={comparacaoRef}
            modelId={modelo.id}
            modelName={modelo.originalName}
            scenarioA={cenarioA}
            scenarioB={cenarioB}
            travado={travado}
            atividades4d={atividades4d}
            data4d={atividades4d ? dataValida : ''}
          />

          {compararPrazo && (
            <aside className="compare-prazo" aria-label="Comparação de prazo">
              {carregandoPrazo ? (
                <p className="compare-prazo__vazio">Calculando prazos…</p>
              ) : !temCronograma ? (
                <p className="compare-prazo__vazio">
                  Nenhum dos dois cenários tem cronograma. Monte um em <b>Cronograma 4D</b>, no
                  Viewer 3D, para comparar prazos.
                </p>
              ) : (
                <>
                  <h3>Prazo</h3>
                  <dl>
                    <div>
                      <dt>A · {cenarioA.name}</dt>
                      <dd>
                        {comparacao?.scenarioA.schedule
                          ? dataLegivel(comparacao.scenarioA.schedule.completionDate)
                          : 'sem cronograma'}
                      </dd>
                    </div>
                    <div>
                      <dt>B · {cenarioB.name}</dt>
                      <dd>
                        {comparacao?.scenarioB.schedule
                          ? dataLegivel(comparacao.scenarioB.schedule.completionDate)
                          : 'sem cronograma'}
                      </dd>
                    </div>
                  </dl>
                  {/* O sinal é o que decide: positivo = B termina depois de A. */}
                  {comparacao?.deltaDays === null || comparacao?.deltaDays === undefined ? (
                    <p className="compare-prazo__vazio">
                      Falta cronograma de um dos lados para medir a diferença.
                    </p>
                  ) : comparacao.deltaDays === 0 ? (
                    <p className="compare-prazo__delta">Os dois terminam no mesmo dia.</p>
                  ) : (
                    <p className="compare-prazo__delta">
                      <b>{Math.abs(comparacao.deltaDays)} dia(s)</b>{' '}
                      {comparacao.deltaDays > 0 ? 'a mais em B' : 'a mais em A'}
                    </p>
                  )}
                </>
              )}
            </aside>
          )}

          {compararPrazo && janela4d && temCronograma && (
            <ReguaTempo
              janela={janela4d}
              data={dataValida}
              onChange={setDataRegua}
              tocando={tocando}
              onTocandoChange={setTocando}
              velocidade={velocidade}
              onVelocidadeChange={setVelocidade}
              resumo={<span className="regua-tempo__estado regua-tempo__estado--ativo">amarelo = em obra</span>}
            />
          )}
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
              <Link className="viewer-upload-button" to="/app">
                <Layers size={17} strokeWidth={1.45} />
                <span>Ir para o Viewer 3D</span>
              </Link>
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
