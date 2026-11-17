import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  financialMatrixApi,
  type FinancialMatrixResult,
} from '@/services/financial-matrix.service'
import { money } from '@/services/bim-costs.service'
import '@/styles/financial-matrix.css'

interface Props {
  projectId: string
  scenarioId: string
  scenarios: Array<{ id: string; name: string }>
}
export default function FinancialMatrix({
  projectId,
  scenarioId,
  scenarios,
}: Props) {
  const [query, setQuery] = useSearchParams()
  const [selected, setSelected] = useState<string[]>(() => {
    const available = new Set(scenarios.map((s) => s.id))
    const requested = query
      .get('matriz')
      ?.split(',')
      .filter((id) => available.has(id))
    return [
      ...new Set(
        requested?.length
          ? requested
          : [
              scenarioId,
              ...scenarios
                .filter((s) => s.id !== scenarioId)
                .slice(0, 1)
                .map((s) => s.id),
            ],
      ),
    ].slice(0, 20)
  })
  const [baseline, setBaseline] = useState(() =>
    selected.includes(query.get('referencia') || '')
      ? query.get('referencia')!
      : selected.includes(scenarioId)
        ? scenarioId
        : selected[0] || '',
  )
  const [result, setResult] = useState<FinancialMatrixResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(
    () => () => {
      generation.current++
    },
    [],
  )
  useEffect(() => {
    const next = new URLSearchParams(query)
    next.set('matriz', selected.join(','))
    next.set('referencia', baseline)
    if (next.toString() !== query.toString()) setQuery(next, { replace: true })
  }, [selected, baseline, query, setQuery])
  function change(ids: string[], reference = baseline) {
    generation.current++
    setResult(null)
    setError('')
    setSelected(ids)
    setBaseline(ids.includes(reference) ? reference : ids[0] || '')
  }
  async function compare() {
    const request = ++generation.current
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const matrix = await financialMatrixApi.compare(
        projectId,
        selected,
        baseline,
      )
      if (generation.current === request) setResult(matrix)
    } catch (e) {
      if (generation.current === request)
        setError(e instanceof Error ? e.message : 'Não foi possível comparar.')
    } finally {
      if (generation.current === request) setBusy(false)
    }
  }
  async function pdf() {
    if (!result) return
    const request = ++generation.current
    setBusy(true)
    setError('')
    try {
      const blob = await financialMatrixApi.pdf(
        projectId,
        selected,
        baseline,
        result.revision,
      )
      if (generation.current !== request) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'matriz-5d.pdf'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      if (generation.current === request) {
        setResult(null)
        setError(e instanceof Error ? e.message : 'Não foi possível exportar.')
      }
    } finally {
      if (generation.current === request) setBusy(false)
    }
  }
  return (
    <section
      className="bim-panel financial-matrix"
      aria-label="Matriz de custo e prazo"
    >
      <div className="bim-panel-heading">
        <div>
          <h2>Matriz de custo e prazo</h2>
          <p>
            Compare de 2 a 20 alternativas. Escolha a referência para calcular
            as diferenças.
          </p>
        </div>
        <span className="bim-muted">{selected.length} selecionados</span>
      </div>
      <fieldset className="financial-matrix-selection" disabled={busy}>
        <legend>Cenários do projeto</legend>
        {scenarios.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              aria-label={`Incluir ${s.name}`}
              checked={selected.includes(s.id)}
              disabled={!selected.includes(s.id) && selected.length >= 20}
              onChange={(e) =>
                change(
                  e.target.checked
                    ? [...selected, s.id]
                    : selected.filter((id) => id !== s.id),
                )
              }
            />
            <span>{s.name}</span>
          </label>
        ))}
      </fieldset>
      <div className="bim-form">
        <label>
          Cenário de referência
          <select
            value={baseline}
            disabled={busy || !selected.length}
            onChange={(e) => change(selected, e.target.value)}
          >
            {!selected.length && (
              <option value="">Selecione os cenários</option>
            )}
            {selected.map((id) => (
              <option key={id} value={id}>
                {scenarios.find((s) => s.id === id)?.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="bim-button"
          disabled={busy || selected.length < 2 || !baseline}
          onClick={() => void compare()}
        >
          {busy ? 'Processando matriz…' : 'Comparar matriz'}
        </button>
      </div>
      {scenarios.length < 2 && (
        <p>Salve outra alternativa do projeto para comparar.</p>
      )}
      {error && (
        <div className="bim-alert" role="alert">
          {error}
        </div>
      )}
      {result && (
        <>
          <p role="status">
            <strong>{result.recommendation.explanation}</strong>
          </p>
          <div
            className="bim-table-scroll"
            tabIndex={0}
            aria-label="Matriz com rolagem horizontal"
          >
            <table className="bim-table">
              <caption>
                Diferenças em relação a{' '}
                {scenarios.find((s) => s.id === result.baselineId)?.name}
              </caption>
              <thead>
                <tr>
                  <th>Cenário</th>
                  <th>Custo orçado</th>
                  <th>Duração</th>
                  <th>Conclusão</th>
                  <th>Diferença de custo</th>
                  <th>Diferença de dias</th>
                  <th>Cobertura física</th>
                  <th>Posição</th>
                </tr>
              </thead>
              <tbody>
                {result.scenarios.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">
                      {s.name}
                      {s.id === result.baselineId && <small>Referência</small>}
                      {result.recommendation.winningScenarioIds.includes(
                        s.id,
                      ) && <small>Melhor pontuação</small>}
                      {s.issues.map((issue) => (
                        <small className="financial-matrix-issue" key={issue}>
                          {issue}
                        </small>
                      ))}
                    </th>
                    <td>
                      {s.totalCost === null ? 'Pendente' : money(s.totalCost)}
                    </td>
                    <td>
                      {s.durationDays === null
                        ? 'Pendente'
                        : `${s.durationDays} dias`}
                    </td>
                    <td>
                      {s.completionDate
                        ? s.completionDate.split('-').reverse().join('/')
                        : 'Pendente'}
                    </td>
                    <td>
                      {s.deltaCost === null ? 'Pendente' : money(s.deltaCost)}
                    </td>
                    <td>
                      {s.deltaDays === null
                        ? 'Pendente'
                        : `${s.deltaDays} dias`}
                    </td>
                    <td>
                      {s.pricedElements}/{s.modelElements} elementos
                      <small>{s.costLinks} vínculos</small>
                    </td>
                    <td>
                      {s.rank === null ? 'Fora do ranking' : `${s.rank}º`}{' '}
                      {s.score !== null && (
                        <small>{s.score.toLocaleString('pt-BR')} pontos</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="financial-matrix-warnings">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <div className="bim-actions">
            <button
              className="bim-button"
              disabled={busy}
              onClick={() => void pdf()}
            >
              Exportar matriz em PDF
            </button>
            <small className="bim-muted">
              60% custo • 40% prazo •{' '}
              {new Date(result.generatedAt).toLocaleString('pt-BR')}
            </small>
          </div>
        </>
      )}
    </section>
  )
}
