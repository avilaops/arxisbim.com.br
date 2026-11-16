import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { bimCosts, type SINAPIItem, type SINAPIVersion } from '@/services/bim-costs.service'

const referencePrice = (value: string) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4,
}).format(Number(value))

interface Props {
  scenarioId: string
  tableId: string
  disabled?: boolean
  onAdded: () => Promise<void>
}

export default function SinapiCatalog({ scenarioId, tableId, disabled = false, onAdded }: Props) {
  const [versions, setVersions] = useState<SINAPIVersion[]>([])
  const [state, setState] = useState('')
  const [month, setMonth] = useState('')
  const [query, setQuery] = useState('')
  const [priceBasis, setPriceBasis] = useState<'with_tax' | 'without_tax'>('without_tax')
  const [items, setItems] = useState<SINAPIItem[]>([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [addingId, setAddingId] = useState('')
  const [error, setError] = useState('')
  const months = useMemo(
    () => versions.filter((version) => !state || version.state_code === state),
    [state, versions],
  )

  useEffect(() => {
    let active = true
    bimCosts.sinapiVersions().then((data) => {
      if (active) setVersions(data)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o catálogo SINAPI.')
    })
    return () => { active = false }
  }, [])

  async function search(event: FormEvent) {
    event.preventDefault()
    if (query.trim().length < 2) {
      setError('Digite ao menos dois caracteres para pesquisar.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await bimCosts.searchSinapi(query.trim(), state, month)
      setItems(result.items)
      setSearched(true)
    } catch (cause) {
      setItems([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível pesquisar o SINAPI.')
    } finally {
      setBusy(false)
    }
  }

  async function add(item: SINAPIItem) {
    setAddingId(item.id)
    setError('')
    try {
      await bimCosts.addSinapiItem(scenarioId, tableId, item.id, priceBasis)
      await onAdded()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar o serviço.')
    } finally {
      setAddingId('')
    }
  }

  return (
    <section className="bim-panel" aria-label="Catálogo SINAPI" style={{ marginBlock: 18 }}>
      <div className="bim-panel-heading">
        <div>
          <h3>Adicionar serviço do SINAPI</h3>
          <p>Pesquise no catálogo de referências carregado pela administração e copie o preço escolhido para esta tabela.</p>
        </div>
        <label>
          Base do preço
          <select value={priceBasis} onChange={(event) => setPriceBasis(event.target.value as typeof priceBasis)} disabled={disabled || busy || !!addingId}>
            <option value="without_tax">Sem desoneração</option>
            <option value="with_tax">Com desoneração</option>
          </select>
        </label>
      </div>
      <form className="bim-form" onSubmit={(event) => void search(event)}>
        <label>
          Serviço ou código
          <input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={120} placeholder="Ex.: alvenaria ou 87519" required />
        </label>
        <label>
          UF
          <select value={state} onChange={(event) => { setState(event.target.value); setMonth('') }} disabled={disabled || busy}>
            <option value="">Todas as UFs</option>
            {[...new Set(versions.map((version) => version.state_code))].sort().map((uf) => <option key={uf}>{uf}</option>)}
          </select>
        </label>
        <label>
          Referência
          <select value={month} onChange={(event) => setMonth(event.target.value)} disabled={disabled || busy}>
            <option value="">Todos os meses</option>
            {months.map((version) => <option key={`${version.state_code}:${version.reference_month}`} value={version.reference_month}>{version.reference_month.slice(0, 7)} • {version.state_code} • {version.item_count} itens</option>)}
          </select>
        </label>
        <button className="bim-button bim-button--secondary" disabled={disabled || busy || !!addingId || query.trim().length < 2}>
          {busy ? 'Pesquisando…' : 'Pesquisar SINAPI'}
        </button>
      </form>
      {error && <p className="bim-alert" role="alert">{error}</p>}
      {searched && !items.length && !busy && <p role="status">Nenhum serviço encontrado para esses filtros.</p>}
      {items.length > 0 && (
        <div className="bim-table-scroll" style={{ marginTop: 14 }}>
          <table className="bim-table" style={{ minWidth: 760 }}>
            <thead><tr><th>Código</th><th>Serviço</th><th>Unidade</th><th>UF • referência</th><th>Preço selecionado</th><th>Ação</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{item.description}</td>
                <td>{item.unit}</td>
                <td>{item.state_code} • {item.reference_month.slice(0, 7)}</td>
                <td>{referencePrice(priceBasis === 'with_tax' ? item.price_with_tax : item.price_without_tax)}</td>
                <td><button type="button" className="bim-button bim-button--secondary" disabled={disabled || !!addingId} onClick={() => void add(item)}>{addingId === item.id ? 'Adicionando…' : 'Adicionar ao orçamento'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <small>O orçamento salva uma cópia do preço e mantém o vínculo à referência SINAPI • mudanças futuras no catálogo não alteram este cenário.</small>
    </section>
  )
}
