import React, { useState } from 'react';
import { getAPIClient } from '../../api/v1/client.js';
import '../../styles/pages/takeoff-trigger.css';

interface TakeoffTriggerProps {
  scenarioId: string;
  onSuccess?: () => void;
}

export function TakeoffTrigger({ scenarioId, onSuccess }: TakeoffTriggerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTakeoff() {
    if (!scenarioId) {
      setError('Cenário não selecionado');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const client = getAPIClient();
      const res = await client.post(`/scenarios/${scenarioId}/takeoff`, {});

      setResult({
        linked_count: res.data.linked_count || 0,
        total_quantity: res.data.total_quantity || '0.00',
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Erro ao executar takeoff. Verifique se a tabela de custos foi criada.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="takeoff-trigger">
      <h3>Extração de Quantidades</h3>
      <p className="help-text">
        Extrai automaticamente as quantidades do modelo IFC e associa à tabela de custo.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="alert alert-success">
          ✓ Takeoff concluído: {result.linked_count} elementos vinculados
        </div>
      )}

      <button
        className="btn-primary btn-large"
        onClick={handleTakeoff}
        disabled={loading}
      >
        {loading ? 'Processando...' : '▶ Executar Takeoff'}
      </button>
    </div>
  );
}
