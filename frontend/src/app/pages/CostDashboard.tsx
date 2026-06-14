/**
 * Cost Dashboard - Análise e visualização de custos por projeto/cenário
 * Charts: breakdown por tipo, pavimento, categoria; evolução temporal
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CostService, CostCalculation } from '../../api/v1/services';

export const CostDashboard: React.FC = () => {
  const { projectId, scenarioId } = useParams<{ projectId: string; scenarioId: string }>();
  const [calculation, setCalculation] = useState<CostCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalculation();
  }, [scenarioId]);

  const loadCalculation = async () => {
    if (!scenarioId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await CostService.getCalculation(scenarioId);
      setCalculation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Carregando...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!calculation) return <div className="dashboard-empty">Sem dados</div>;

  const categoryLabels: Record<string, string> = {
    structure: 'Estrutura',
    mep: 'MEP',
    architecture: 'Arquitetura',
    other: 'Outros',
  };

  return (
    <div className="cost-dashboard">
      <div className="dashboard-header">
        <h1>💰 Análise de Custos</h1>
        <div className="dashboard-actions">
          <button onClick={loadCalculation} className="btn-secondary">
            🔄 Atualizar
          </button>
          <button onClick={() => CostService.exportXLSX(scenarioId!)} className="btn-primary">
            📥 Exportar XLSX
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Custo Total</span>
          <span className="kpi-value">R$ {formatCurrency(calculation.total_cost)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Itens de Custo</span>
          <span className="kpi-value">{Object.keys(calculation.breakdown.by_type).length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Pavimentos</span>
          <span className="kpi-value">{Object.keys(calculation.breakdown.by_storey).length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Categorias</span>
          <span className="kpi-value">{Object.keys(calculation.breakdown.by_category).length}</span>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="breakdown-section">
        <h2>Distribuição por Tipo</h2>
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Tipo IFC</th>
              <th>Quantidade</th>
              <th>Unidade</th>
              <th>Total</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(calculation.breakdown.by_type).map(([type, data]) => (
              <tr key={type}>
                <td>{type}</td>
                <td>{parseInt(data.quantity)}</td>
                <td>{data.unit}</td>
                <td>R$ {formatCurrency(data.total_cost)}</td>
                <td>{getPercentage(data.total_cost, calculation.total_cost)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="breakdown-grid">
        <div className="breakdown-section">
          <h2>Distribuição por Pavimento</h2>
          <table className="breakdown-table compact">
            <thead>
              <tr>
                <th>Pavimento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(calculation.breakdown.by_storey).map(([storey, data]) => (
                <tr key={storey}>
                  <td>{storey === 'null' ? 'Sem pavimento' : `Nível ${storey}`}</td>
                  <td>R$ {formatCurrency(data.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-section">
          <h2>Distribuição por Categoria</h2>
          <table className="breakdown-table compact">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(calculation.breakdown.by_category).map(([cat, data]) => (
                <tr key={cat}>
                  <td>{categoryLabels[cat] || cat}</td>
                  <td>R$ {formatCurrency(data.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-footer">
        <small>Atualizado: {new Date(calculation.calculated_at).toLocaleString('pt-BR')}</small>
      </div>
    </div>
  );
};

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPercentage(value: string, total: string): string {
  const num = parseFloat(value);
  const totalNum = parseFloat(total);
  if (totalNum === 0) return '0';
  return ((num / totalNum) * 100).toFixed(1);
}
