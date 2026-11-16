import { useEffect, useState } from 'react'
import { bimCosts, money, type FinancialComparison } from '@/services/bim-costs.service'

interface Props { projectId: string; scenarioId: string; revision: number }
const width = 760
const height = 290
const padding = { top: 22, right: 24, bottom: 48, left: 76 }

export default function BudgetCurve({ projectId, scenarioId, revision }: Props) {
  const [comparison, setComparison] = useState<FinancialComparison | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    bimCosts.compare(projectId, scenarioId, scenarioId)
      .then((result) => { if (active) setComparison(result) })
      .catch((cause) => {
        if (active) {
          setComparison(null)
          setError(cause instanceof Error ? cause.message : 'Não foi possível calcular a curva planejada.')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, scenarioId, revision, attempt])

  const points = comparison?.scenarioA.sCurve || []
  const max = Math.max(0, ...points.map((point) => Number(point.cumulative)))
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const coordinates = points.map((point, index) => {
    const x = padding.left + (points.length < 2 ? innerWidth / 2 : index * innerWidth / (points.length - 1))
    const y = padding.top + innerHeight - (max > 0 ? Number(point.cumulative) / max : 0) * innerHeight
    return { point, x, y }
  })
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const labelStep = Math.max(1, Math.ceil(points.length / 6))

  return (
    <section className="bim-panel" aria-busy={loading}>
      <h2>Curva S • custo planejado acumulado</h2>
      <p>
        Projeção distribuída pelas datas planejadas das atividades vinculadas ao IFC. O custo de um elemento ligado a várias atividades é dividido igualmente; itens sem atividade são distribuídos ao longo do cronograma.
      </p>
      {loading && <p role="status">Calculando distribuição planejada…</p>}
      {error && <div className="bim-alert" role="alert">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></div>}
      {!loading && !error && points.length === 0 && <p role="status">Vincule serviços do orçamento às atividades no Planejamento 4D para visualizar a curva acumulada.</p>}
      {!loading && points.length > 0 && (
        <>
          <p><strong>{money(points[points.length - 1].cumulative)}</strong> distribuídos em {points.length} mês(es) planejado(s) • sem medição de avanço ou custo realizado.</p>
          <div className="bim-table-scroll" role="region" aria-label="Gráfico da curva S planejada" tabIndex={0}>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva S mensal e acumulada do custo planejado" style={{ width: '100%', minWidth: 520, height: 'auto' }}>
              <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="#cbd5e1" />
              <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} stroke="#cbd5e1" />
              <text x={padding.left - 12} y={padding.top + 5} textAnchor="end" fontSize="11" fill="#64748b">{money(max)}</text>
              <text x={padding.left - 12} y={padding.top + innerHeight} textAnchor="end" fontSize="11" fill="#64748b">R$ 0</text>
              {points.length > 1 && <polyline points={polyline} fill="none" stroke="#08789b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
              {coordinates.map(({ point, x, y }, index) => (
                <g key={point.month}>
                  <circle cx={x} cy={y} r="5" fill="#08789b"><title>{`${point.month} • mensal ${money(point.cost)} • acumulado ${money(point.cumulative)}`}</title></circle>
                  {(index % labelStep === 0 || index === points.length - 1) && <text x={x} y={height - 17} textAnchor="middle" fontSize="11" fill="#475569">{point.month}</text>}
                </g>
              ))}
            </svg>
          </div>
          <div className="bim-table-scroll" style={{ marginTop: 12 }}>
            <table className="bim-table">
              <thead><tr><th>Mês planejado</th><th>Custo distribuído no mês</th><th>Custo acumulado</th></tr></thead>
              <tbody>{points.map((point) => <tr key={point.month}><td>{point.month}</td><td>{money(point.cost)}</td><td><strong>{money(point.cumulative)}</strong></td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
