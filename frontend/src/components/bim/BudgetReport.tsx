import { useEffect, useState } from 'react';
import { budgetReports, type BudgetReportData } from '@/services/budget-report.service';
import { money, quantity } from '@/services/bim-costs.service';

const unitPrice = (value: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value));
export default function BudgetReport({ scenarioId }: { scenarioId: string }) {
  const [report, setReport] = useState<BudgetReportData | null>(null);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    budgetReports
      .get(scenarioId, offset)
      .then((value) => {
        if (current) setReport(value);
      })
      .catch((cause) => {
        if (current) {
          setReport(null);
          setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o relatório.');
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [scenarioId, offset, attempt]);
  async function exportXlsx() {
    setExporting(true);
    setError('');
    try {
      const blob = await budgetReports.xlsx(scenarioId),
        url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `orcamento-${scenarioId}.xlsx`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível exportar.');
    } finally {
      setExporting(false);
    }
  }
  const storey = (id: number | null) =>
    id === null
      ? 'Sem pavimento'
      : report?.storeys.find((s) => s.storeyId === id)?.storeyName || `Pavimento ${id}`;
  return (
    <section className="bim-panel" aria-busy={loading || exporting}>
      <div className="bim-panel-heading">
        <div>
          <h2>Quantitativos por pavimento • memória de custos</h2>
          <p>
            Resumo completo da versão IFC do cenário, independente da página de elementos exibida
            acima.
          </p>
        </div>
        <button
          type="button"
          className="bim-button"
          disabled={loading || exporting || !report?.modelVersionId}
          onClick={() => void exportXlsx()}
        >
          Exportar quantitativos e custos • XLSX
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Carregando relatório…</p>}
      {!loading && !report && (
        <button type="button" onClick={() => setAttempt((v) => v + 1)}>
          Tentar carregar relatório
        </button>
      )}
      {report && (
        <>
          <p>
            {report.totalElements} elementos no modelo • {report.totalLinks} vínculos de custo •{' '}
            {money(report.totalCost)} em itens orçados
          </p>
          <p>
            Um elemento pode possuir vários serviços. Elementos sem preço não entram no total. Cada
            vínculo usa quantidade × preço efetivo, arredondado em duas casas decimais.
          </p>
          {report.storeys.length > 0 ? (
            <div className="bim-table-scroll">
              <table className="bim-table" style={{ minWidth: 680 }}>
                <thead>
                  <tr>
                    <th>Pavimento</th>
                    <th>Tipo IFC</th>
                    <th>Elementos</th>
                    <th>Área (m²)</th>
                    <th>Volume (m³)</th>
                    <th>Comprimento (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.storeys.map((s) => (
                    <tr key={`${s.storeyId}:${s.ifcType}`}>
                      <td>{storey(s.storeyId)}</td>
                      <td>{s.ifcType}</td>
                      <td>{s.elementCount}</td>
                      <td>{quantity(s.areaM2)}</td>
                      <td>{quantity(s.volumeM3)}</td>
                      <td>{quantity(s.lengthM)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Prepare o IFC para consultar os pavimentos e exportar as medições.</p>
          )}
          <details style={{ marginTop: 18 }}>
            <summary>Ver memória dos custos por serviço</summary>
            {!report.totalLinks ? (
              <p>Nenhum serviço foi vinculado aos elementos deste cenário.</p>
            ) : (
              <>
                <div className="bim-table-scroll">
                  <table className="bim-table" style={{ minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th>Elemento • GlobalId</th>
                        <th>Serviço</th>
                        <th>Quantidade</th>
                        <th>Unidade</th>
                        <th>Preço efetivo</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.costs.map((c, i) => (
                        <tr key={`${c.globalId}:${i}`}>
                          <td>
                            {c.globalId}
                            <small>{c.ifcType}</small>
                          </td>
                          <td>
                            {c.description}
                            <small>
                              {c.code || 'Sem código'} • {c.tableName}
                            </small>
                            {c.sinapiItemId && <small>{c.notes || 'Referência SINAPI vinculada'}</small>}
                          </td>
                          <td>{quantity(c.quantity)}</td>
                          <td>{c.unit}</td>
                          <td>{unitPrice(c.unitPrice)}</td>
                          <td>{money(c.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bim-panel-heading">
                  <span>
                    {Math.min(offset + 1, report.totalLinks)} a{' '}
                    {Math.min(offset + report.costs.length, report.totalLinks)} de{' '}
                    {report.totalLinks} vínculos
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={loading || offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - 100))}
                    >
                      Serviços anteriores
                    </button>
                    <button
                      type="button"
                      disabled={loading || offset + 100 >= report.totalLinks}
                      onClick={() => setOffset(offset + 100)}
                    >
                      Próximos serviços
                    </button>
                  </div>
                </div>
              </>
            )}
          </details>
          <small>
            O XLSX inclui todos os elementos e serviços • valores decimais em texto preservam a
            precisão; medições ausentes ficam vazias.
          </small>
        </>
      )}
    </section>
  );
}
