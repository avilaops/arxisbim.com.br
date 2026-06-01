# 14- BudgetService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo BudgetService, responsável por gerenciar orçamentos, quantitativos 5D e integrações financeiras no contexto BIM.

## Responsabilidades Detalhadas
- Gerenciar CRUD de orçamentos vinculados a projetos/modelos, com suporte a múltiplos tipos de orçamento (direto, indireto, comparativo)
- Calcular quantitativos 5D a partir de modelos IFC, filtros, propriedades customizadas e regras de negócio
- Integrar com APIs de orçamento, bancos de preços (ex: SINAPI, TCPO) e sistemas financeiros externos (ERP, BI)
- Validar regras de negócio: limites de valores, consistência de itens, permissões por perfil, dependências entre etapas
- Expor API clara para controllers, UI, relatórios e automações
- Suportar versionamento, histórico, auditoria de alterações e rastreabilidade
- Gerar relatórios e exportações (PDF, Excel, CSV, JSON), com templates customizáveis
- Permitir simulações, cenários alternativos e comparativos de orçamento
- Suportar anexos e documentos complementares (ex: memoriais, notas fiscais)

## APIs/Contratos
- Métodos principais:
  - `createBudget(data: BudgetInput): Promise<Budget>`
  - `getBudget(id: string): Promise<Budget>`
  - `updateBudget(id: string, data: Partial<BudgetInput>): Promise<Budget>`
  - `deleteBudget(id: string): Promise<void>`
  - `listBudgets(params?: { projectId?: string, filter?: object, type?: string }): Promise<Budget[]>`
  - `calculateTakeoff(modelId: string, params?: object): Promise<TakeoffResult>`
  - `exportBudget(id: string, format: 'pdf' | 'excel' | 'csv' | 'json'): Promise<Blob>`
  - `getBudgetHistory(id: string): Promise<BudgetHistory[]>`
  - `simulateScenario(id: string, changes: Partial<BudgetInput>): Promise<BudgetSimulationResult>`
  - `attachDocument(budgetId: string, file: File): Promise<string>`
  - `listAttachments(budgetId: string): Promise<Array<{ name: string, url: string }>>`
- Eventos:
  - `onBudgetChanged(budget: Budget)`
  - `onError(error: Error)`
  - `onTakeoffCalculated(result: TakeoffResult)`
  - `onExportReady(blob: Blob, format: string)`

## Fluxos Detalhados
### CRUD de Orçamentos
1. Criação/edição/exclusão de orçamentos, validação de dados e permissões
2. Atualização em tempo real na UI e histórico de alterações
3. Suporte a múltiplos tipos e cenários de orçamento

### Cálculo de Quantitativos 5D
1. Recebe modelo IFC, filtros e parâmetros
2. Executa parsing e extração de propriedades
3. Aplica regras de negócio e fórmulas customizadas
4. Retorna quantitativos detalhados, agrupados por categoria, elemento, etapa
5. Emite evento para UI e relatórios

### Exportação e Relatórios
1. Geração de relatórios em múltiplos formatos (PDF, Excel, CSV, JSON)
2. Suporte a templates customizáveis e branding
3. Armazenamento de relatórios via StorageService
4. Download e visualização na UI

### Versionamento e Histórico
1. Registro de cada alteração (quem, quando, o que mudou)
2. Listagem e restauração de versões anteriores
3. Auditoria e rastreabilidade completa

### Simulações e Cenários
1. Permite simular alterações sem afetar orçamento principal
2. Geração de cenários alternativos e comparativos
3. Exportação e análise de resultados

### Anexos e Documentos
1. Upload de documentos complementares (PDF, imagens, planilhas)
2. Listagem e download de anexos
3. Integração com StorageService

## Exemplos de Uso Avançados
```typescript
// Criar orçamento com anexos
const budget = await budgetService.createBudget({ projectId, name: 'Novo Orçamento', items: [...] });
await budgetService.attachDocument(budget.id, file);

// Calcular quantitativos 5D com filtros
const takeoff = await budgetService.calculateTakeoff(modelId, { filters: { type: 'estrutura' } });

// Simular cenário alternativo
const simulation = await budgetService.simulateScenario(budget.id, { items: [...alteredItems] });

// Exportar orçamento em Excel
const excel = await budgetService.exportBudget(budget.id, 'excel');

// Obter histórico e restaurar versão
const history = await budgetService.getBudgetHistory(budget.id);
// ...restaurar versão se necessário
```

## Pontos de Integração Detalhados
- **IFCService:** Extração de quantitativos, propriedades, filtros avançados
- **API Integration:** Chamadas REST/GraphQL para backend, bancos de preços, ERPs
- **Controllers:** Orquestração de fluxos, simulações, exportações
- **UI:** Painéis de orçamento, gráficos, relatórios, uploads de anexos
- **StorageService:** Armazenamento de relatórios, anexos, exportações
- **AuthService:** Permissões, auditoria, rastreabilidade
- **State Manager:** Atualização de estado global, sincronização de cenários

## Critérios de Qualidade
- Precisão e rastreabilidade nos cálculos e alterações
- Segurança: controle de permissões, auditoria, logs de alterações
- Performance: cálculos eficientes, exportações rápidas, suporte a grandes volumes
- Testes unitários e de integração para regras de negócio, simulações e exportações
- Documentação clara da API, exemplos de uso e fluxos
- Extensibilidade para novos tipos de orçamento, integrações e relatórios
- Suporte a múltiplos idiomas, moedas e formatos regionais

## Guia de Uso e Integração

### Importando o Serviço

```typescript
import { budgetService } from '@/services/BudgetService/BudgetService';
import type { Budget, BudgetInput } from '@/services/BudgetService/types';
```

### Criando um Orçamento

```typescript
const newBudget: BudgetInput = {
  projectId: 'project-123',
  name: 'Orçamento Principal',
  description: 'Orçamento para o projeto de construção',
  type: 'direct',
  currency: 'BRL',
  items: [
    {
      code: '01.01',
      name: 'Concreto',
      category: 'Estrutura',
      unit: 'm³',
      quantity: 100,
      unitPrice: 350,
      source: 'manual',
    },
  ],
};

const budget = await budgetService.createBudget(newBudget);
```

### Lendo Orçamentos

```typescript
// Get by ID
const budget = await budgetService.getBudget('budget-123');

// List budgets with filters
const budgets = await budgetService.listBudgets({
  projectId: 'project-123',
  type: 'direct',
});
```

### Atualizando Orçamentos

```typescript
const updatedBudget = await budgetService.updateBudget('budget-123', {
  name: 'Orçamento Atualizado',
  items: [...newItems],
});
```

### Deletando Orçamentos

```typescript
await budgetService.deleteBudget('budget-123');
```

### Cálculo de Quantitativos 5D

```typescript
const takeoffResult = await budgetService.calculateTakeoff('model-123', {
  filters: {
    type: 'IfcWall',
    property: 'Volume',
  },
});

console.log('Total volume:', takeoffResult.totalQuantity);
console.log('Items:', takeoffResult.items);
```

### Exportação de Orçamentos

```typescript
// Export to Excel
const excelBlob = await budgetService.exportBudget('budget-123', 'excel');

// Export to PDF
const pdfBlob = await budgetService.exportBudget('budget-123', 'pdf');

// Export to CSV
const csvBlob = await budgetService.exportBudget('budget-123', 'csv');

// Export to JSON
const jsonBlob = await budgetService.exportBudget('budget-123', 'json');
```

### Histórico e Versionamento

```typescript
// Get budget history
const history = await budgetService.getBudgetHistory('budget-123');

history.forEach(change => {
  console.log(`${change.timestamp}: ${change.action} by ${change.userId}`);
  console.log('Changes:', change.changes);
});
```

### Simulação de Cenários

```typescript
const simulation = await budgetService.simulateScenario('budget-123', {
  items: [
    {
      code: '01.01',
      unitPrice: 400, // Alterar preço
    },
  ],
});

console.log('Original total:', simulation.originalTotal);
console.log('New total:', simulation.newTotal);
console.log('Difference:', simulation.difference);
console.log('Changes:', simulation.changes);
```

### Anexos e Documentos

```typescript
// Attach document
const attachmentUrl = await budgetService.attachDocument('budget-123', file);

// List attachments
const attachments = await budgetService.listAttachments('budget-123');

attachments.forEach(att => {
  console.log(`${att.name}: ${att.url}`);
});
```

### Eventos

```typescript
// Listen to budget changes
budgetService.onBudgetChanged = (budget) => {
  console.log('Budget changed:', budget);
  updateUI(budget);
};

// Listen to takeoff calculations
budgetService.onTakeoffCalculated = (result) => {
  console.log('Takeoff calculated:', result);
  displayResults(result);
};

// Listen to errors
budgetService.onError = (error) => {
  console.error('Budget service error:', error);
  showError(error.message);
};

// Listen to export ready
budgetService.onExportReady = (blob, format) => {
  console.log(`Export ready: ${format}`);
  downloadFile(blob, `budget.${format}`);
};
```

### Integração com React

```typescript
import { useState, useEffect } from 'react';
import { budgetService } from '@/services/BudgetService/BudgetService';

function BudgetManager() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const data = await budgetService.listBudgets();
      setBudgets(data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (data: BudgetInput) => {
    const newBudget = await budgetService.createBudget(data);
    setBudgets([...budgets, newBudget]);
  };

  return (
    <div>
      {loading ? <div>Loading...</div> : <BudgetList budgets={budgets} />}
      <BudgetForm onSubmit={handleCreateBudget} />
    </div>
  );
}
```

### Integração com IFCService

```typescript
// Calculate takeoff from IFC model
const ifcModel = await ifcService.loadModel(file);
const takeoff = await budgetService.calculateTakeoff(ifcModel.id, {
  filters: {
    type: 'IfcWall',
  },
});

// Create budget from takeoff
const budgetItems = takeoff.items.map(item => ({
  code: item.code,
  name: item.name,
  quantity: item.quantity,
  unitPrice: getPriceFromDatabase(item.name),
}));

const budget = await budgetService.createBudget({
  projectId: ifcModel.projectId,
  name: 'Orçamento do Modelo',
  items: budgetItems,
});
```

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo BudgetService do frontend, cobrindo fluxos avançados, integrações, simulações, versionamento, anexos e critérios de qualidade.
