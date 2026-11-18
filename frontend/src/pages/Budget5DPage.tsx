import { useCallback, useEffect, useRef, useState } from 'react'
import BimWorkspace, { type BimSelection } from '@/components/bim/BimWorkspace'
import FinancialMatrix from '@/components/bim/FinancialMatrix'
import BudgetReport from '@/components/bim/BudgetReport'
import BudgetCurve from '@/components/bim/BudgetCurve'
import SinapiCatalog from '@/components/bim/SinapiCatalog'
import { schedulesService } from '@/services/schedules.service'
import {
  bimCosts,
  money,
  quantity,
  normalizarPreco,
  type Quantities,
  type CostTable,
  type CostItem,
  type CostCalculation,
  type FinancialComparison,
} from '@/services/bim-costs.service'

const units = ['m²', 'm³', 'm', 'un']
const date = (value: string | null) =>
  value
    ? new Date(value + 'T12:00:00Z').toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
      })
    : 'Sem cronograma'
const ifcLabel = (type: string) =>
  ({
    IFCWALL: 'Paredes',
    IFCWALLSTANDARDCASE: 'Paredes',
    IFCSLAB: 'Lajes e pisos',
    IFCBEAM: 'Vigas',
    IFCCOLUMN: 'Pilares',
    IFCWINDOW: 'Janelas',
    IFCDOOR: 'Portas',
    IFCSTAIR: 'Escadas',
    IFCROOF: 'Coberturas',
  })[type.toUpperCase()] || type

function BudgetContent({ workspace: w }: { workspace: BimSelection }) {
  const [quantities, setQuantities] = useState<Quantities>({
    items: [],
    total: 0,
    categories: [],
  })
  const [tables, setTables] = useState<CostTable[]>([])
  const [tableId, setTableId] = useState('')
  const tableRef = useRef('')
  const [items, setItems] = useState<CostItem[]>([])
  const [calculation, setCalculation] = useState<CostCalculation | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tableName, setTableName] = useState(
    `Orçamento de ${w.scenario?.name || 'cenário'}`,
  )
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('m²')
  const [price, setPrice] = useState('')
  const [selectedItem, setSelectedItem] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({})
  const [otherScenario, setOtherScenario] = useState('')
  const [comparison, setComparison] = useState<FinancialComparison | null>(null)
  const [offset, setOffset] = useState(0)
  const [budgetRevision, setBudgetRevision] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qs, ts, calc] = await Promise.all([
        bimCosts.quantities(w.scenarioId, 0),
        bimCosts.tables(w.projectId),
        bimCosts.calculation(w.scenarioId),
      ])
      const owned = ts.filter(
        (t) => t.scenario_id === w.scenarioId || t.scenario_id === null,
      )
      const selected =
        owned.find((t) => t.id === tableRef.current)?.id || owned[0]?.id || ''
      tableRef.current = selected
      setTableId(selected)
      setTables(owned)
      setQuantities(qs)
      setOffset(0)
      setCalculation(calc)
      const priceItems = selected ? await bimCosts.items(selected) : []
      setItems(priceItems)
      setSelectedItem((current) =>
        priceItems.some((i) => i.id === current)
          ? current
          : priceItems[0]?.id || '',
      )
      setSelectedCategory((current) =>
        qs.categories?.some((c) => c.ifcType === current)
          ? current
          : qs.categories?.[0]?.ifcType || '',
      )
      setError('')
      setBudgetRevision(value=>value+1)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível abrir o orçamento.',
      )
    } finally {
      setLoading(false)
    }
  }, [w.scenarioId, w.projectId])
  useEffect(() => {
    void load()
  }, [load])

  const run = async (action: () => Promise<void>, preserveComparison = false) => {
    setBusy(true)
    setError('')
    setNotice('')
    if (!preserveComparison) setComparison(null)
    try {
      await action()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível concluir a operação.',
      )
    } finally {
      setBusy(false)
    }
  }
  const prepare = () =>
    void run(async () => {
      if (
        calculation?.element_count &&
        !window.confirm(
          'Se você selecionou outro IFC, os vínculos de preços da versão anterior serão removidos. Preparar este modelo para o cenário?',
        )
      )
        return
      const result = await bimCosts.prepare(w.modelId, w.scenarioId)
      await load()
      setNotice(
        `${result.elementCount} elementos preparados • ${result.quantitiesCount} com medições extraídas do IFC.`,
      )
    })
  const createTable = () =>
    void run(async () => {
      if (!tableName.trim()) throw new Error('Dê um nome à tabela de preços.')
      const result = await bimCosts.createTable(
        w.projectId,
        w.scenarioId,
        tableName.trim(),
      )
      tableRef.current = result.id
      await load()
      setNotice('Tabela de preços criada para este cenário.')
    })
  const createItem = () =>
    void run(async () => {
      if (!description.trim())
        throw new Error('Descreva o serviço ou material.')
      await bimCosts.createItem(tableId, {
        code: code.trim(),
        description: description.trim(),
        unit,
        unit_price: normalizarPreco(price),
      })
      setDescription('')
      setCode('')
      setPrice('')
      await load()
      setNotice(
        'Item de custo salvo. Vincule-o a uma categoria do modelo para calcular o orçamento.',
      )
    })
  const applyPrice = () =>
    void run(async () => {
      if (quantities.ifcModelId !== w.modelId)
        throw new Error('Prepare o IFC selecionado antes de aplicar preços.')
      const item = items.find((i) => i.id === selectedItem)
      if (!item || !selectedCategory)
        throw new Error('Escolha uma categoria IFC e um item de custo.')
      const result = await bimCosts.priceCategory(w.scenarioId, {
        costItemId: item.id,
        ifcType: selectedCategory,
        quantityUnit: item.unit,
      })
      await bimCosts.recalculate(w.scenarioId)
      await load()
      setNotice(
        `${result.linkedElements} elemento(s) precificado(s) • ${result.skippedElements} sem medida compatível com ${item.unit}.`,
      )
    })
  const selectTable = async (id: string) => {
    tableRef.current = id
    setTableId(id)
    setBusy(true)
    try {
      const list = await bimCosts.items(id)
      setItems(list)
      setSelectedItem(list[0]?.id || '')
      setError('')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível ler a tabela.',
      )
    } finally {
      setBusy(false)
    }
  }
  const compare = () =>
    void run(async () => {
      if (!otherScenario) throw new Error('Escolha o segundo cenário.')
      const other = await bimCosts.calculation(otherScenario)
      if (!calculation?.element_count || !other.element_count)
        throw new Error(
          'Os dois cenários precisam ter preços vinculados antes da comparação. Prepare e precifique a outra alternativa primeiro.',
        )
      const schedules = await Promise.all([
        schedulesService.doCenario(w.projectId, w.scenarioId),
        schedulesService.doCenario(w.projectId, otherScenario),
      ])
      if (schedules.some((schedule) => !schedule?.activities?.length))
        throw new Error('Os dois cenários precisam de cronograma com atividades para comparar custo e prazo. Complete o Planejamento 4D primeiro.')
      setComparison(
        await bimCosts.compare(w.projectId, w.scenarioId, otherScenario),
      )
    })
  const exportPdf = () =>
    void run(async () => {
      const blob = await bimCosts.pdf(w.projectId, w.scenarioId, otherScenario)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'comparacao-5d.pdf'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Relatório comparativo exportado.')
    }, true)
  const priced = calculation?.element_count || 0
  const modelMismatch = quantities.ifcModelId !== w.modelId
  const sourceName = w.models?.find((model) => model.id === quantities.ifcModelId)?.originalName

  return (
    <>
      <a className="bim-button bim-button--secondary" href={'/orcamento/obra?'+new URLSearchParams({projeto:w.projectId,cenario:w.scenarioId,modelo:w.modelId})}>Orçar por serviço • PDFs, programação e medições</a>
      {!loading && modelMismatch && quantities.total > 0 && (
        <div className="bim-alert" role="status">
          Os quantitativos pertencem a {sourceName || 'outro modelo ou versão ainda não identificada'}. Prepare o IFC selecionado para orçar este modelo no cenário.
        </div>
      )}
      {error && (
        <div className="bim-alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="bim-notice" role="status">
          {notice}
        </div>
      )}
      <div className="bim-kpis">
        <article className="bim-kpi">
          <span>Custo dos itens vinculados</span>
          <strong>{priced ? money(calculation?.total_cost) : '—'}</strong>
          <small>
            {priced
              ? 'Valor calculado a partir de quantidades e preços salvos'
              : 'Sem preços vinculados'}
          </small>
        </article>
        <article className="bim-kpi">
          <span>Vínculos de custo</span>
          <strong>{priced}</strong>
          <small>
            {quantities.total
              ? `${quantities.total} elementos disponíveis no IFC`
              : 'Prepare o IFC para ler seus quantitativos'}
          </small>
        </article>
        <article className="bim-kpi">
          <span>Tabela de preços</span>
          <strong>{items.length}</strong>
          <small>
            {tables.find((t) => t.id === tableId)?.name ||
              'Cadastre os serviços e materiais do cenário'}
          </small>
        </article>
      </div>
      <section className="bim-panel">
        <div className="bim-panel-heading">
          <div>
            <h2>Quantitativos do modelo</h2>
            <p>
              Áreas, volumes e comprimentos são lidos do IFC. Medidas ausentes
              ficam sem valor; a unidade “un” utiliza a contagem de elementos.
            </p>
          </div>
          <button
            className="bim-button"
            disabled={busy || loading}
            onClick={prepare}
          >
            {busy ? 'Processando…' : 'Preparar quantitativos do IFC'}
          </button>
        </div>
        {loading ? (
          <p role="status">Carregando quantitativos e preços…</p>
        ) : quantities.categories?.length ? (
          <div className="bim-table-scroll">
            <table className="bim-table">
              <thead>
                <tr>
                  <th>Categoria IFC</th>
                  <th>Elementos</th>
                  <th>Área (m²)</th>
                  <th>Volume (m³)</th>
                  <th>Comprimento (m)</th>
                </tr>
              </thead>
              <tbody>
                {quantities.categories.map((c) => (
                  <tr key={c.ifcType}>
                    <td>
                      {ifcLabel(c.ifcType)}
                      <small>{c.ifcType}</small>
                    </td>
                    <td>{c.elementCount}</td>
                    <td>{quantity(c.areaM2)}</td>
                    <td>{quantity(c.volumeM3)}</td>
                    <td>{quantity(c.lengthM)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            Ainda não há quantitativos preparados para este cenário. Selecione o
            modelo acima e prepare o IFC para começar.
          </p>
        )}
        {quantities.items.length > 0 && (
          <details style={{ marginTop: 18 }}>
            <summary>Ver elementos e medições do IFC</summary>
            <div className="bim-table-scroll">
              <table className="bim-table">
                <thead>
                  <tr>
                    <th>Elemento</th>
                    <th>Tipo</th>
                    <th>Área (m²)</th>
                    <th>Volume (m³)</th>
                    <th>Comprimento (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {quantities.items.map((q) => (
                    <tr key={q.globalId}>
                      <td>
                        {q.name || q.globalId}
                        <small>{q.globalId}</small>
                      </td>
                      <td>{ifcLabel(q.ifcType)}</td>
                      <td>{quantity(q.areaM2)}</td>
                      <td>{quantity(q.volumeM3)}</td>
                      <td>{quantity(q.lengthM)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bim-actions" style={{ marginTop: 12 }}>
              <span className="bim-muted">
                {offset + 1} a{' '}
                {Math.min(offset + quantities.items.length, quantities.total)}{' '}
                de {quantities.total} elementos
              </span>
              {offset > 0 && (
                <button
                  className="bim-button bim-button--secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const next = Math.max(0, offset - 1000)
                      setQuantities(
                        await bimCosts.quantities(w.scenarioId, next),
                      )
                      setOffset(next)
                    })
                  }
                >
                  Elementos anteriores
                </button>
              )}
              {offset + quantities.items.length < quantities.total && (
                <button
                  className="bim-button bim-button--secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const next = offset + 1000
                      setQuantities(
                        await bimCosts.quantities(w.scenarioId, next),
                      )
                      setOffset(next)
                    })
                  }
                >
                  Próximos elementos
                </button>
              )}
            </div>
          </details>
        )}
      </section>
      <section className="bim-panel">
        <div className="bim-panel-heading">
          <div>
            <h2>Preços do cenário</h2>
            <p>
              Cadastre os preços que serão usados neste orçamento. A base e os
              valores são definidos por você.
            </p>
          </div>
          {tableId && (
            <button
              className="bim-button bim-button--secondary"
              disabled={busy || loading}
              onClick={() =>
                void run(async () => {
                  await bimCosts.recalculate(w.scenarioId)
                  await load()
                  setNotice('Custo recalculado com os preços atuais.')
                })
              }
            >
              Recalcular orçamento
            </button>
          )}
        </div>
        {!tableId ? (
          <form
            className="bim-form"
            onSubmit={(e) => {
              e.preventDefault()
              createTable()
            }}
          >
            <label>
              Nome da tabela
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />
            </label>
            <button className="bim-button" disabled={busy || loading}>
              Criar tabela de preços
            </button>
          </form>
        ) : (
          <>
            {tables.length > 1 && (
              <label className="bim-muted">
                Tabela de preços
                <select
                  value={tableId}
                  disabled={busy}
                  onChange={(e) => void selectTable(e.target.value)}
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <SinapiCatalog
              scenarioId={w.scenarioId}
              tableId={tableId}
              disabled={busy || modelMismatch}
              onAdded={() => run(async () => {
                await bimCosts.recalculate(w.scenarioId)
                await load()
                setNotice('Serviço SINAPI adicionado e orçamento recalculado.')
              })}
            />
            <form
              className="bim-form"
              onSubmit={(e) => {
                e.preventDefault()
                createItem()
              }}
            >
              <label className="bim-form-wide">
                Descrição do serviço
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: execução de alvenaria"
                  required
                />
              </label>
              <label>
                Código de referência
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Opcional"
                  maxLength={50}
                />
              </label>
              <label>
                Unidade do serviço
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label>
                Preço unitário (R$)
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="125,50"
                  required
                />
              </label>
              <button className="bim-button" disabled={busy || loading}>
                Adicionar item de custo
              </button>
            </form>
            {items.length > 0 && (
              <div className="bim-table-scroll" style={{ marginTop: 20 }}>
                <table className="bim-table">
                  <thead>
                    <tr>
                      <th>Serviço ou material</th>
                      <th>Unidade</th>
                      <th>Preço unitário (R$)</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.description}
                          {item.code && <small>{item.code}</small>}
                          {item.sinapi_item_id && <small>{item.notes || 'Referência SINAPI vinculada'}</small>}
                        </td>
                        <td>{item.unit}</td>
                        <td>
                          <input
                            aria-label={`Preço de ${item.description}`}
                            inputMode="decimal"
                            value={
                              priceEdits[item.id] ??
                              item.unit_price.replace('.', ',')
                            }
                            onChange={(e) =>
                              setPriceEdits((current) => ({
                                ...current,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <div className="bim-actions">
                            <button
                              className="bim-button bim-button--secondary"
                              aria-label={`Salvar preço de ${item.description}`}
                              disabled={
                                busy || priceEdits[item.id] === undefined
                              }
                              onClick={() =>
                                void run(async () => {
                                  await bimCosts.updatePrice(
                                    item.id,
                                    normalizarPreco(priceEdits[item.id]),
                                  )
                                  setPriceEdits({})
                                  await bimCosts.recalculate(w.scenarioId)
                                  await load()
                                  setNotice(
                                    'Preço atualizado e orçamento recalculado.',
                                  )
                                })
                              }
                            >
                              Salvar
                            </button>
                            <button
                              className="bim-button bim-button--secondary"
                              aria-label={`Remover ${item.description}`}
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Remover o item “${item.description}” e seus vínculos de custo?`,
                                  )
                                )
                                  void run(async () => {
                                    await bimCosts.deleteItem(item.id)
                                    await bimCosts.recalculate(w.scenarioId)
                                    await load()
                                  })
                              }}
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
      {tableId && items.length > 0 && (
        <section className="bim-panel">
          <h2>Vincular preço ao IFC</h2>
          <p>
            O preço é aplicado aos elementos da categoria. Elementos sem a
            medida exigida pelo serviço são informados e não recebem quantidade
            inventada.
          </p>
          <form
            className="bim-form"
            onSubmit={(e) => {
              e.preventDefault()
              applyPrice()
            }}
          >
            <label>
              Categoria a orçar
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                <option value="">Selecione uma categoria</option>
                {quantities.categories?.map((c) => (
                  <option key={c.ifcType} value={c.ifcType}>
                    {ifcLabel(c.ifcType)} • {c.elementCount} elemento(s)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Item de custo
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                required
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.description} • {money(i.unit_price)}/{i.unit}
                  </option>
                ))}
              </select>
            </label>
            <button className="bim-button" disabled={busy || !selectedCategory || modelMismatch}>
              Aplicar preço à categoria
            </button>
            <span className="bim-muted">
              Unidade utilizada:{' '}
              {items.find((i) => i.id === selectedItem)?.unit || '—'}
            </span>
          </form>
        </section>
      )}
      {priced > 0 && (
        <section className="bim-panel">
          <h2>Composição do orçamento</h2>
          <p>
            Totais dos vínculos já precificados. Elementos ainda sem preço não
            entram no total.
          </p>
          <div className="bim-table-scroll">
            <table className="bim-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Vínculos</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(calculation?.breakdown.by_type || {}).map(
                  ([type, b]) => (
                    <tr key={type}>
                      <td>{ifcLabel(type)}</td>
                      <td>{b.count}</td>
                      <td>
                        <strong>{money(b.total_cost)}</strong>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!loading && <BudgetReport key={`report:${budgetRevision}`} scenarioId={w.scenarioId}/>}
      {!loading && <BudgetCurve projectId={w.projectId} scenarioId={w.scenarioId} revision={budgetRevision}/>}
      {!loading && <FinancialMatrix key={budgetRevision} projectId={w.projectId} scenarioId={w.scenarioId} scenarios={w.scenarios}/>}
      <section className="bim-panel">
        <h2>Comparação financeira de cenários</h2>
        <p>
          Compare os itens orçados de duas alternativas do mesmo projeto,
          considerando custo e prazo disponível.
        </p>
        <div className="bim-form">
          <label>
            Comparar com
            <select
              value={otherScenario}
              onChange={(e) => {
                setOtherScenario(e.target.value)
                setComparison(null)
              }}
            >
              <option value="">Selecione outro cenário</option>
              {w.scenarios
                .filter((s) => s.id !== w.scenarioId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="bim-button"
            disabled={busy || !otherScenario || !priced}
            onClick={compare}
          >
            Comparar custo e prazo
          </button>
        </div>
        {!priced && (
          <p>
            Vincule preços aos elementos deste cenário para habilitar a
            comparação.
          </p>
        )}
        {comparison && (
          <div style={{ marginTop: 22 }}>
            <div className="bim-table-scroll">
              <table className="bim-table">
                <thead>
                  <tr>
                    <th>Cenário</th>
                    <th>Custo orçado</th>
                    <th>Duração</th>
                    <th>Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  {[comparison.scenarioA, comparison.scenarioB].map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.name}
                        {s.id ===
                          comparison.recommendation.winningScenarioId && (
                          <small>Melhor pontuação dos itens orçados</small>
                        )}
                      </td>
                      <td>{money(s.totalCost)}</td>
                      <td>
                        {s.completionDate
                          ? `${s.durationDays} dia(s)`
                          : 'Não informada'}
                      </td>
                      <td>{date(s.completionDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <strong>
                Diferença B − A: {money(comparison.deltaCost)} •{' '}
                {comparison.deltaDays} dia(s)
              </strong>
            </p>
            <p>{comparison.recommendation.explanation.replaceAll('**', '')}</p>
            <p className="bim-muted">
              Critério da comparação: 60% custo • 40% prazo. Considere a
              cobertura dos itens orçados antes de decidir.
            </p>
            <button className="bim-button" disabled={busy} onClick={exportPdf}>
              Exportar comparação em PDF
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default function Budget5DPage() {
  return (
    <BimWorkspace
      title="Orçamento 5D"
      description="Transforme os quantitativos do IFC em um orçamento por cenário. Vincule serviços, acompanhe o custo e compare alternativas."
    >
      {(w) => (
        <BudgetContent
          key={`${w.projectId}:${w.scenarioId}:${w.modelId}`}
          workspace={w}
        />
      )}
    </BimWorkspace>
  )
}
