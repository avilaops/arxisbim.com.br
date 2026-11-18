import { useCallback, useEffect, useRef, useState } from 'react'
import BimWorkspace, { type BimSelection } from '@/components/bim/BimWorkspace'
import {
  IfcForm,
  MeasurementForm,
  ObraSettingsForm,
  ServiceForm,
  type Save,
} from '@/components/bim/ObraForms'
import {
  downloadReport,
  loadObra,
  openDocument,
  scopeName,
  statusName,
  writeObra,
  type Service,
  type Workspace,
} from '@/services/obra.service'
import { money } from '@/services/bim-costs.service'
import '@/styles/obra.css'

export default function ObraPage() {
  return (
    <BimWorkspace
      allowDocumentOnly
      title="Orçamento da obra"
      description="Orce serviços a partir de pranchas e modelos IFC e acompanhe a execução por etapa."
    >
      {(w) => <Obra key={w.scenarioId} w={w} />}
    </BimWorkspace>
  )
}
function Obra({ w }: { w: BimSelection }) {
  const [data, setData] = useState<Workspace | null>(),
    [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const [editor, setEditor] = useState<Service | 'new' | null>(null),
    [filter, setFilter] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false),
    [page, setPage] = useState(0)
  const [tab, setTab] = useState('Serviços')
  const mutation = useRef(false)
  const refresh = useCallback(async () => {
    const result = await loadObra(w.scenarioId)
    setData(result.settings ? result : null)
  }, [w.scenarioId])
  useEffect(() => {
    refresh().catch((c) => setError(c.message))
  }, [refresh])
  async function execute(action: () => Promise<string>) {
    if (mutation.current) return false
    mutation.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await action()
      await refresh()
      setMessage(result)
      return true
    } catch (c) {
      setError(c instanceof Error ? c.message : 'Falha ao concluir a operação.')
      return false
    } finally {
      mutation.current = false
      setBusy(false)
    }
  }
  const save: Save = (path, method, body, success) =>
    execute(async () => {
      const result = await writeObra(w.scenarioId, path, method, body)
      return (
        success +
        (result.added === undefined ? '' : ' Serviços incluídos ou programados • ' + result.added)
      )
    })
  const context = new URLSearchParams({
    projeto: w.projectId,
    cenario: w.scenarioId,
    ...(w.modelId ? { modelo: w.modelId } : {}),
  })
  const lines = data?.report.lines ?? []
  const filtered = lines.filter(
    (l) =>
      (!pendingOnly || l.status === 'pending') &&
      [l.description, l.stage, l.global_id, l.storey, l.issue]
        .join(' ')
        .toLocaleLowerCase()
        .includes(filter.toLocaleLowerCase()),
  )
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 40) - 1))
  return (
    <div className="obra">
      {error && (
        <div role="alert" className="bim-alert">
          {error}{' '}
          <button
            onClick={() => {
              setError('')
              void refresh().catch((c) => setError(c.message))
            }}
          >
            Atualizar dados
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {data === undefined ? (
        !error && <p role="status">Carregando orçamento…</p>
      ) : (
        <fieldset disabled={busy} className="obra-work">
          {!data ? (
            <section className="bim-panel">
              <h2>Dados da obra</h2>
              <ObraSettingsForm name={w.project?.name ?? ''} save={save} />
            </section>
          ) : (
            <>
              <header className="bim-panel">
                <h2>{data.settings.name}</h2>
                <p>
                  {data.settings.area} m² • {data.settings.months} meses •{' '}
                  {scopeName[data.settings.scope]}
                </p>
                {lines.some((l) => l.status === 'pending') && (
                  <p>
                    Orçamento parcial • {lines.filter((l) => l.status === 'pending').length}{' '}
                    serviços pendentes de revisão.
                  </p>
                )}
                <div className="obra-stats">
                  {[
                    ['Orçamento com BDI', data.report.total],
                    ['Estimado com premissa', data.report.estimated],
                    ['A programar', data.report.unallocated],
                    ['Pago', data.report.paid],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong>{money(value)}</strong>
                    </div>
                  ))}
                </div>
              </header>
              <nav className="obra-actions" aria-label="Orçamento da obra">
                {[
                  'Serviços',
                  'Documentos e IFC',
                  'Planejamento',
                  'Canteiro',
                  'Relatório',
                  'Parâmetros',
                ].map((t) => (
                  <button type="button" aria-pressed={t === tab} key={t} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </nav>
              {tab === 'Parâmetros' && (
                <section className="bim-panel">
                  <h2>Parâmetros da obra</h2>
                  <ObraSettingsForm
                    key={data.settings.revision}
                    name={data.settings.name}
                    settings={data.settings}
                    save={save}
                  />
                </section>
              )}
              {tab === 'Documentos e IFC' && (
                <>
                  <section className="bim-panel">
                    <h2>Pranchas e relatórios PDF</h2>
                    <p>
                      Envie plantas com listas de materiais ou um orçamento analítico. Confira as
                      linhas reconhecidas em Serviços. Quantidades desenhadas sem legenda ou escala
                      conferida exigem medição.
                    </p>
                    <label>
                      Importar PDFs
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? [])
                          event.target.value = ''
                          if (files.length)
                            void execute(async () => {
                              let added = 0,
                                duplicates = 0
                              for (const file of files) {
                                const form = new FormData()
                                form.append('file', file)
                                try {
                                  const result = await writeObra(
                                    w.scenarioId,
                                    '/documents',
                                    'POST',
                                    form,
                                  )
                                  added += result.added ?? 0
                                  if (result.duplicate) duplicates++
                                } catch (c) {
                                  await refresh()
                                  throw new Error(
                                    file.name +
                                      ' • ' +
                                      (c instanceof Error ? c.message : 'Falha ao importar.'),
                                  )
                                }
                              }
                              return (
                                'Importação concluída • ' +
                                added +
                                ' serviços para revisar • ' +
                                duplicates +
                                ' arquivos já cadastrados.'
                              )
                            })
                        }}
                      />
                    </label>
                    <ul>
                      {data.documents.map((d) => (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() =>
                              openDocument(w.scenarioId, d.id, d.filename).catch((c) =>
                                setError(c.message),
                              )
                            }
                          >
                            {d.filename}
                          </button>{' '}
                          • {d.discipline} • {d.pages} pág.
                          {lines.some(l=>l.document_id===d.id && l.status==='pending') && <details>
                            <summary>Revisar estimativa do documento</summary>
                            <form className="obra-form" onSubmit={e=>{
                              e.preventDefault()
                              const assumption=String(new FormData(e.currentTarget).get('assumption')??'')
                              void save('/documents/'+d.id+'/review','POST',{assumption},'Estimativa documental aprovada.')
                            }}>
                              <label>Premissa para os itens com quantidade e preço conferidos<input name="assumption" maxLength={500} required/></label>
                              <button>Aprovar estimativas deste documento</button>
                            </form>
                          </details>}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="bim-panel">
                    <h2>Diagnóstico IFC por serviço</h2>
                    <a href={'/orcamento?' + context}>
                      Preparar o IFC e cadastrar preços próprios ou SINAPI
                    </a>
                    <p>
                      Escolha a medição e as propriedades necessárias. Cada elemento recebe um
                      serviço com sua quantidade, preço de referência e pendências.
                    </p>
                    <IfcForm data={data} save={save} />
                  </section>
                </>
              )}
              {tab === 'Serviços' && (
                <section className="bim-panel">
                  <h2>Serviços e pendências</h2>
                  <div className="obra-actions">
                    <button className="bim-button" onClick={() => setEditor('new')}>
                      Adicionar serviço
                    </button>
                    <label>
                      Buscar serviço, pavimento ou elemento
                      <input
                        value={filter}
                        onChange={(e) => {
                          setFilter(e.target.value)
                          setPage(0)
                        }}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={pendingOnly}
                        onChange={(e) => {
                          setPendingOnly(e.target.checked)
                          setPage(0)
                        }}
                      />
                      Somente pendentes
                    </label>
                  </div>
                  {editor && (
                    <ServiceForm
                      key={editor === 'new' ? 'new' : editor.id}
                      data={data}
                      line={editor === 'new' ? undefined : editor}
                      save={save}
                      close={() => setEditor(null)}
                    />
                  )}
                  {!lines.length && (
                    <p>Importe pranchas, diagnostique o IFC ou adicione o primeiro serviço.</p>
                  )}
                  <div className="bim-table-scroll">
                    <table className="bim-table">
                      <thead>
                        <tr>
                          <th>Serviço</th>
                          <th>Etapa</th>
                          <th>Situação</th>
                          <th>Quantidade</th>
                          <th>Valor com BDI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(currentPage * 40, (currentPage + 1) * 40).map((l) => (
                          <tr key={l.id}>
                            <td>
                              <button
                                onClick={() => {
                                  setEditor(l)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                              >
                                {l.description}
                              </button>
                              <small>{[l.storey, l.global_id].filter(Boolean).join(' • ')}</small>
                            </td>
                            <td>{l.stage}</td>
                            <td>
                              {statusName[l.status]}
                              <small>{l.issue}</small>
                            </td>
                            <td>
                              {l.quantity ?? 'Pendente'} {l.unit}
                            </td>
                            <td>{l.total === null ? 'Pendente' : money(l.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length > 40 && (
                    <div className="obra-actions">
                      <button disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>
                        Anterior
                      </button>
                      <span>
                        Página {currentPage + 1} de {Math.ceil(filtered.length / 40)}
                      </span>
                      <button
                        disabled={(currentPage + 1) * 40 >= filtered.length}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </section>
              )}
              {tab === 'Planejamento' && (
                <section className="bim-panel">
                  <h2>Programar serviços por etapa</h2>
                  <p>
                    As datas criam uma atividade no cronograma do cenário e vinculam os serviços da
                    etapa que aguardam programação. Para uma atividade específica, edite o serviço.
                  </p>
                  <form
                    className="obra-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const f = new FormData(event.currentTarget)
                      void save('/stage', 'POST', Object.fromEntries(f), 'Etapa programada.')
                    }}
                  >
                    <label>
                      Etapa a programar
                      <select name="stage" required>
                        {[...new Set(lines.filter((l) => !l.activity_id).map((l) => l.stage))].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Início da atividade
                      <input name="start" type="date" required />
                    </label>
                    <label>
                      Fim da atividade
                      <input name="end" type="date" required />
                    </label>
                    <button className="bim-button" disabled={!lines.some((l) => !l.activity_id)}>
                      Programar etapa
                    </button>
                  </form>
                  <a href={'/planejamento?' + context}>Abrir o cronograma 4D</a>
                  <ul>
                    {data.activities.map((a) => (
                      <li key={a.id}>
                        {a.name} • {a.start} a {a.end}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {tab === 'Canteiro' && (
                <section className="bim-panel">
                  <h2>Medições e pagamentos</h2>
                  <MeasurementForm data={data} save={save} />
                  {w.modelId && (
                    <a
                      href={
                        '/app?' +
                        new URLSearchParams({
                          model: w.modelId,
                          scenario: w.scenarioId,
                          execucao: '1',
                        })
                      }
                    >
                      Ver execução no modelo 3D
                    </a>
                  )}
                  <h3>Avanço físico em {data.report.asOf}</h3>
                  <div className="bim-table-scroll">
                    <table className="bim-table">
                      <thead>
                        <tr>
                          <th>Serviço e pavimento</th>
                          <th>Previsto até a data</th>
                          <th>Medido até a data</th>
                          <th>Saldo do serviço</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines
                          .filter((l) => l.status !== 'pending')
                          .map((l) => (
                            <tr key={l.id}>
                              <td>
                                {l.description} • {l.storey ?? l.stage}
                              </td>
                              <td>
                                {l.plannedToDate === null
                                  ? 'A programar'
                                  : l.plannedToDate + ' ' + l.unit}
                              </td>
                              <td>
                                {l.observed} {l.unit}
                              </td>
                              <td>
                                {l.remaining} {l.unit}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <h3>Histórico de apontamentos</h3>
                  <div className="bim-table-scroll">
                    <table className="bim-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Serviço</th>
                          <th>Quantidade executada</th>
                          <th>Pago</th>
                          <th>Observação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.entries.map((e) => {
                          const line = lines.find((l) => l.id === e.service_id)
                          return (
                            <tr key={e.id}>
                              <td>{e.measured_on}</td>
                              <td>{line?.description}</td>
                              <td>
                                {e.quantity} {line?.unit}
                              </td>
                              <td>{money(e.paid)}</td>
                              <td>{e.note}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {tab === 'Relatório' && (
                <ObraSummary data={data} scenarioId={w.scenarioId} onError={setError} />
              )}
            </>
          )}
        </fieldset>
      )}
    </div>
  )
}

function ObraSummary({
  data,
  scenarioId,
  onError,
}: {
  data: Workspace
  scenarioId: string
  onError: (s: string) => void
}) {
  const { report } = data
  return (
    <section className="bim-panel">
      <h2>Relatório físico-financeiro</h2>
      <p>
        Custo direto {money(report.direct)} • BDI {data.settings.bdi}% ({money(report.bdi)}) • Custo
        por m² {money(report.perM2)}
      </p>
      <button
        className="bim-button"
        onClick={() => downloadReport(scenarioId).catch((e) => onError(e.message))}
      >
        Baixar relatório em PDF
      </button>
      <h3>Desembolso e curva acumulada</h3>
      <div className="bim-table-scroll">
        <table className="bim-table">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Planejado</th>
              <th>Acumulado</th>
              <th>Pago</th>
              <th>Pago acumulado</th>
            </tr>
          </thead>
          <tbody>
            {report.periods.map((p) => (
              <tr key={p.month}>
                <td>{p.month}</td>
                <td>{money(p.planned)}</td>
                <td>
                  {money(p.cumulative)}{' '}
                  <progress
                    aria-label={'Planejado acumulado em ' + p.month}
                    value={Number(p.cumulative)}
                    max={Number(report.total) || 1}
                  />
                </td>
                <td>{money(p.paid)}</td>
                <td>{money(p.cumulativePaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Desembolso planejado por etapa e mês</h3>
      <div className="bim-table-scroll">
        <table className="bim-table">
          <thead>
            <tr>
              <th>Etapa</th>
              {report.periods.map((p) => (
                <th key={p.month}>{p.month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.stages.map((s) => (
              <tr key={s.stage}>
                <th>{s.stage}</th>
                {report.periods.map((p) => (
                  <td key={p.month}>{money(s.months[p.month] ?? '0')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
