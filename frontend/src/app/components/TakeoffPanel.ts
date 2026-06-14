import { getAPIClient } from '../../api/v1/client.js';

export class TakeoffPanel {
  constructor() {
    this.scenarioId = null;
    this.loading = false;
    this.result = null;
    this.error = null;
  }

  async executeTakeoff(scenarioId) {
    if (!scenarioId) {
      this.error = 'Cenário não selecionado';
      return;
    }

    this.scenarioId = scenarioId;
    this.loading = true;
    this.error = null;
    this.result = null;

    try {
      const client = getAPIClient();
      const res = await client.post(`/scenarios/${scenarioId}/takeoff`, {});
      this.result = {
        linked_count: res.data.linked_count || 0,
        total_quantity: res.data.total_quantity || '0.00',
      };
    } catch (err) {
      this.error = err.response?.data?.error ||
        'Erro ao executar takeoff. Crie uma tabela de custos primeiro.';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  getStatus() {
    if (this.loading) return { status: 'loading', message: 'Processando...' };
    if (this.error) return { status: 'error', message: this.error };
    if (this.result) return {
      status: 'success',
      message: `✓ ${this.result.linked_count} elementos vinculados`,
    };
    return { status: 'idle', message: 'Pronto para extrair quantidades' };
  }
}

if (typeof window !== 'undefined') {
  (window as any).__takeoffPanel = new TakeoffPanel();
}
