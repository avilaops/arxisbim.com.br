import { useState } from 'react'
import { CalendarClock, CalendarPlus, Check, Link2, Plus, Trash2, Unlink, X } from 'lucide-react'
import type { Atividade, Cronograma } from '@/services/schedules.service'
import type { Categoria } from './visibilidadeIfc'
import { dataLegivel, janelaDoCronograma } from './estado4d'

interface CronogramaPanelProps {
  open: boolean
  onClose: () => void
  /** Cenário ativo: o cronograma é dele, não do projeto. Sem cenário não há o que montar. */
  cenarioNome: string
  temCenarioAtivo: boolean
  viewerPronto: boolean
  cronograma: Cronograma | null
  carregando: boolean
  salvando: boolean
  categorias: Categoria[]
  onCriarCronograma: (nome: string, dataInicio: string) => void
  onApagarCronograma: () => void
  onAdicionarAtividade: (dados: { nome: string; inicio: string; fim: string; tiposIfc: string[] }) => void
  onApagarAtividade: (activityId: string) => void
  onAlterarDatas: (activityId: string, datas: { inicio: string; fim: string }) => void
  onVincularCategoria: (activityId: string, tiposIfc: string[]) => void
  onVincularPredecessora: (activityId: string, predecessorId: string) => void
  onDesvincularPredecessora: (activityId: string, predecessorId: string) => void
  /** Régua de tempo ligada: o modelo passa a ser pintado pela data. */
  regua: boolean
  onToggleRegua: () => void
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

function emDias(inicio: string, dias: number): string {
  const data = new Date(`${inicio}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

/**
 * Painel de cronograma (S26). Segue o desenho do ScenariosPanel: gaveta com
 * backdrop, seções e lista.
 *
 * O que esta tela resolve não é diff nem animação — é **entrada de dados**. Em
 * 11/09/2026 o backend 4D estava inteiro (schedules, activities, predecessores,
 * CPM, comparação temporal) e as tabelas tinham 0 linhas em produção, porque
 * não havia por onde criar um cronograma. Sem cronograma não há prazo, e sem
 * prazo não há comparação temporal.
 *
 * O vínculo com o modelo é por **categoria IFC** (paredes, lajes...), que é o
 * que o viewer sabe mostrar. A tradução para GlobalId, que é o que o cronograma
 * grava, acontece no salvamento (`ViewerHandle.globalIdsDasCategorias`).
 */
export default function CronogramaPanel({
  open,
  onClose,
  cenarioNome,
  temCenarioAtivo,
  viewerPronto,
  cronograma,
  carregando,
  salvando,
  categorias,
  onCriarCronograma,
  onApagarCronograma,
  onAdicionarAtividade,
  onApagarAtividade,
  onAlterarDatas,
  onVincularCategoria,
  onVincularPredecessora,
  onDesvincularPredecessora,
  regua,
  onToggleRegua,
}: CronogramaPanelProps) {
  const [nomeCronograma, setNomeCronograma] = useState('')
  const [inicioCronograma, setInicioCronograma] = useState(hoje())

  const [criandoAtividade, setCriandoAtividade] = useState(false)
  const [nomeAtividade, setNomeAtividade] = useState('')
  const [inicioAtividade, setInicioAtividade] = useState(hoje())
  const [fimAtividade, setFimAtividade] = useState(emDias(hoje(), 7))
  const [categoriaAtividade, setCategoriaAtividade] = useState('')
  const [erroForm, setErroForm] = useState<string | null>(null)

  const atividades = cronograma?.activities ?? []
  const janela = janelaDoCronograma(atividades)

  const tiposDaCategoria = (nome: string) => categorias.find((c) => c.nome === nome)?.tipos ?? []

  const confirmarAtividade = () => {
    const nome = nomeAtividade.trim()
    if (!nome) {
      setErroForm('Dê um nome à atividade.')
      return
    }
    if (fimAtividade < inicioAtividade) {
      setErroForm('O fim não pode ser antes do início.')
      return
    }
    setErroForm(null)
    onAdicionarAtividade({
      nome,
      inicio: inicioAtividade,
      fim: fimAtividade,
      tiposIfc: tiposDaCategoria(categoriaAtividade),
    })
    setNomeAtividade('')
    setCategoriaAtividade('')
    setCriandoAtividade(false)
  }

  const nomeDaAtividade = (id: string) => atividades.find((a) => a.id === id)?.name ?? 'atividade removida'

  return (
    <>
      <button
        className={`viewer-drawer-backdrop ${open ? 'is-open' : ''}`}
        type="button"
        onClick={onClose}
        aria-label="Fechar painel de cronograma"
      />
      <aside className={`viewer-panel viewer-projects-panel viewer-cronograma-panel ${open ? 'is-open' : ''}`}>
        <div className="viewer-panel__header">
          <div>
            <span className="viewer-panel__eyebrow">Prazo do cenário</span>
            <h2>Cronograma 4D</h2>
          </div>
          <button className="viewer-panel__close" type="button" onClick={onClose} aria-label="Fechar painel">
            <X size={17} strokeWidth={1.45} />
          </button>
        </div>

        {!viewerPronto ? (
          <div className="viewer-panel__empty">
            <p>Abra um modelo IFC para montar o cronograma.</p>
          </div>
        ) : !temCenarioAtivo ? (
          <div className="viewer-panel__empty">
            <p>
              O cronograma é de um cenário. Escolha ou crie um em <b>Cenários</b> antes de
              cadastrar atividades.
            </p>
          </div>
        ) : carregando ? (
          <div className="viewer-panel__empty">
            <p>Carregando cronograma…</p>
          </div>
        ) : !cronograma ? (
          <div className="viewer-panel__section">
            <div className="viewer-panel__section-heading">
              <div className="viewer-panel__section-title">
                <CalendarPlus size={17} strokeWidth={1.45} />
                <span>Novo cronograma</span>
              </div>
            </div>
            <p className="viewer-panel__hint">
              O cenário <b>{cenarioNome}</b> ainda não tem prazo. Crie um para começar a lançar
              atividades.
            </p>
            <div className="viewer-panel__form viewer-panel__form--coluna">
              <label>
                <span>Nome</span>
                <input
                  type="text"
                  value={nomeCronograma}
                  placeholder={`Cronograma de ${cenarioNome}`}
                  onChange={(evento) => setNomeCronograma(evento.target.value)}
                />
              </label>
              <label>
                <span>Início da obra</span>
                <input
                  type="date"
                  value={inicioCronograma}
                  onChange={(evento) => setInicioCronograma(evento.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  onCriarCronograma(nomeCronograma.trim() || `Cronograma de ${cenarioNome}`, inicioCronograma)
                }
                disabled={salvando || !inicioCronograma}
              >
                <Check size={16} strokeWidth={1.6} />
                <span>{salvando ? 'Criando…' : 'Criar cronograma'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="viewer-panel__section">
              <div className="viewer-panel__section-heading">
                <div className="viewer-panel__section-title">
                  <CalendarClock size={17} strokeWidth={1.45} />
                  <span>{cronograma.name}</span>
                </div>
                <button
                  className="viewer-panel__item-action"
                  type="button"
                  onClick={onApagarCronograma}
                  aria-label="Apagar cronograma"
                  title="Apagar cronograma"
                >
                  <Trash2 size={15} strokeWidth={1.45} />
                </button>
              </div>

              <dl className="cronograma-resumo">
                <div>
                  <dt>Início</dt>
                  <dd>{dataLegivel(cronograma.startDate)}</dd>
                </div>
                <div>
                  <dt>Conclusão</dt>
                  <dd>{janela ? dataLegivel(janela.fim) : '—'}</dd>
                </div>
                <div>
                  <dt>Atividades</dt>
                  <dd>{atividades.length}</dd>
                </div>
              </dl>

              <button
                className={`viewer-upload-button ${regua ? 'is-active' : ''}`}
                type="button"
                onClick={onToggleRegua}
                disabled={!atividades.length}
                aria-pressed={regua}
                title={
                  atividades.length
                    ? 'Mostra o modelo como estará em cada data'
                    : 'Cadastre uma atividade para usar a régua'
                }
              >
                <CalendarClock size={17} strokeWidth={1.45} />
                <span>{regua ? 'Desligar régua de tempo' : 'Ligar régua de tempo'}</span>
              </button>
            </div>

            <div className="viewer-panel__section">
              <div className="viewer-panel__section-heading">
                <div className="viewer-panel__section-title">
                  <CalendarPlus size={17} strokeWidth={1.45} />
                  <span>Atividades</span>
                </div>
                <button
                  className="viewer-panel__add"
                  type="button"
                  onClick={() => setCriandoAtividade((v) => !v)}
                  aria-label="Adicionar atividade"
                  title="Adicionar atividade"
                >
                  <Plus size={17} strokeWidth={1.45} />
                </button>
              </div>

              {criandoAtividade && (
                <div className="viewer-panel__form viewer-panel__form--coluna">
                  <label>
                    <span>Atividade</span>
                    <input
                      autoFocus
                      type="text"
                      value={nomeAtividade}
                      placeholder="Ex.: Alvenaria do pavimento tipo"
                      onChange={(evento) => setNomeAtividade(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter') confirmarAtividade()
                        if (evento.key === 'Escape') setCriandoAtividade(false)
                      }}
                    />
                  </label>
                  <div className="viewer-panel__form-linha">
                    <label>
                      <span>Início</span>
                      <input
                        type="date"
                        value={inicioAtividade}
                        onChange={(evento) => setInicioAtividade(evento.target.value)}
                      />
                    </label>
                    <label>
                      <span>Fim</span>
                      <input
                        type="date"
                        value={fimAtividade}
                        onChange={(evento) => setFimAtividade(evento.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Elementos do modelo</span>
                    <select
                      value={categoriaAtividade}
                      onChange={(evento) => setCategoriaAtividade(evento.target.value)}
                    >
                      <option value="">Sem vínculo por enquanto</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.nome} value={categoria.nome}>
                          {categoria.nome} ({categoria.ids.length})
                        </option>
                      ))}
                    </select>
                  </label>
                  {erroForm && <p className="viewer-panel__hint viewer-panel__hint--erro">{erroForm}</p>}
                  <button type="button" onClick={confirmarAtividade} disabled={salvando}>
                    <Check size={16} strokeWidth={1.6} />
                    <span>{salvando ? 'Salvando…' : 'Adicionar'}</span>
                  </button>
                </div>
              )}

              {atividades.length ? (
                <ul className="cronograma-lista">
                  {atividades.map((atividade: Atividade) => (
                    <li key={atividade.id} className="cronograma-item">
                      <div className="cronograma-item__topo">
                        <strong>{atividade.name}</strong>
                        <button
                          className="viewer-panel__item-action"
                          type="button"
                          onClick={() => onApagarAtividade(atividade.id)}
                          aria-label={`Apagar ${atividade.name}`}
                          title="Apagar atividade"
                        >
                          <Trash2 size={15} strokeWidth={1.45} />
                        </button>
                      </div>
                      {/* Datas editáveis no lugar: é assim que se responde "e se
                          a fundação atrasar dez dias?" sem apagar e recriar a
                          atividade. Mudou uma data, o CPM reempurra as
                          sucessoras e a régua mostra o efeito. */}
                      <div className="cronograma-item__datas">
                        <label>
                          <span>Início</span>
                          <input
                            type="date"
                            value={String(atividade.plannedStart).slice(0, 10)}
                            onChange={(evento) =>
                              onAlterarDatas(atividade.id, {
                                inicio: evento.target.value,
                                fim: String(atividade.plannedEnd).slice(0, 10),
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Fim</span>
                          <input
                            type="date"
                            value={String(atividade.plannedEnd).slice(0, 10)}
                            onChange={(evento) =>
                              onAlterarDatas(atividade.id, {
                                inicio: String(atividade.plannedStart).slice(0, 10),
                                fim: evento.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <span className="cronograma-item__vinculo">
                        {atividade.elements?.length ?? 0} elemento(s) vinculado(s)
                        {atividade.earlyStart && atividade.earlyStart !== String(atividade.plannedStart).slice(0, 10)
                          ? ` · CPM empurra para ${dataLegivel(atividade.earlyStart)}`
                          : ''}
                      </span>

                      <div className="cronograma-item__acoes">
                        <select
                          aria-label={`Vincular elementos a ${atividade.name}`}
                          defaultValue=""
                          onChange={(evento) => {
                            const tipos = tiposDaCategoria(evento.target.value)
                            if (tipos.length) onVincularCategoria(atividade.id, tipos)
                            evento.target.value = ''
                          }}
                        >
                          <option value="">Vincular categoria…</option>
                          {categorias.map((categoria) => (
                            <option key={categoria.nome} value={categoria.nome}>
                              {categoria.nome} ({categoria.ids.length})
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label={`Predecessora de ${atividade.name}`}
                          defaultValue=""
                          onChange={(evento) => {
                            if (evento.target.value) onVincularPredecessora(atividade.id, evento.target.value)
                            evento.target.value = ''
                          }}
                        >
                          <option value="">Depende de…</option>
                          {atividades
                            .filter((outra) => outra.id !== atividade.id)
                            .map((outra) => (
                              <option key={outra.id} value={outra.id}>
                                {outra.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {(atividade.predecessors ?? []).length > 0 && (
                        <ul className="cronograma-item__predecessoras">
                          {(atividade.predecessors ?? []).map((predecessora) => (
                            <li key={predecessora.predecessorId}>
                              <Link2 size={13} strokeWidth={1.6} />
                              <span>depois de {nomeDaAtividade(predecessora.predecessorId)}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onDesvincularPredecessora(atividade.id, predecessora.predecessorId)
                                }
                                aria-label={`Soltar dependência de ${nomeDaAtividade(predecessora.predecessorId)}`}
                                title="Soltar dependência"
                              >
                                <Unlink size={13} strokeWidth={1.6} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="viewer-panel__empty">
                  <p>Nenhuma atividade ainda. Lance a primeira etapa da obra.</p>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
