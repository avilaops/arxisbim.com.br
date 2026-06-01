# 28- Quantitativos5D

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo Quantitativos5D, responsável por calcular, gerenciar e reportar quantitativos (takeoff) e custos 5D a partir de modelos BIM/IFC.

## Responsabilidades Detalhadas
- Calcular quantitativos 5D (volume, área, comprimento, peso, contagem) a partir de modelos IFC
- Extrair propriedades de elementos (materiais, dimensões, propriedades customizadas)
- Suportar múltiplos tipos de quantitativo (estrutura, arquitetura, MEP, pavimentação, etc)
- Integrar com IFCService, BudgetService, UI, controllers, plugins e StorageService
- Expor API para cálculo, filtro, agrupamento, exportação e relatórios de quantitativos
- Suportar regras de negócio customizadas (fórmulas, fatores, conversões)
- Emitir eventos de cálculo, mudança de quantitativo e erros
- Permitir extensões/plugins para novos tipos de quantitativo, regras e integrações
- Suportar quantitativos federados (cross-model, multi-projeto)
- Gerenciar cache, performance e cálculo incremental
- Suportar exportação (Excel, PDF, CSV, JSON) e templates customizados

## APIs/Contratos
- Métodos principais:
  - `calculateTakeoff(modelId: string, params?: TakeoffParams): Promise<TakeoffResult>` — Cálculo principal
  - `calculateByType(modelId: string, type: string): Promise<TakeoffItem[]>` — Por tipo de elemento
  - `calculateByProperty(modelId: string, property: string): Promise<TakeoffItem[]>` — Por propriedade
  - `calculateByFilter(modelId: string, filter: IFCQuery): Promise<TakeoffItem[]>` — Por filtro customizado
  - `groupTakeoff(items: TakeoffItem[], groupBy: string[]): GroupedTakeoff` — Agrupamento
  - `applyRules(items: TakeoffItem[], rules: TakeoffRule[]): TakeoffItem[]` — Regras de negócio
  - `exportTakeoff(result: TakeoffResult, format: 'excel' | 'pdf' | 'csv' | 'json'): Promise<Blob>` — Exportação
  - `onTakeoffCalculated(callback: (result: TakeoffResult) => void): UnsubscribeFn` — Evento
  - `cacheTakeoff(modelId: string, result: TakeoffResult): void` — Cache
  - `getCachedTakeoff(modelId: string): TakeoffResult | null` — Cache
  - `registerTakeoffType(type: string, handler: TakeoffTypeHandler): void` — Extensão
- Suporte a integração com IFCService, BudgetService, UI, plugins, storage

## Fluxos Detalhados
### Cálculo de Quantitativos
1. Recebe modelo IFC e parâmetros (filtros, tipos, propriedades)
2. Extrai elementos e propriedades via IFCService
3. Calcula quantitativos (volume, área, comprimento, etc)
4. Aplica regras de negócio customizadas
5. Agrupa e formata resultados
6. Emite evento para UI e BudgetService

### Filtros e Queries
1. Suporte a filtros por tipo (IFCWALL, IFCBEAM, etc)
2. Filtros por propriedade (ex: Level = "2", Material = "Concreto")
3. Queries semânticas complexas (AND, OR, comparações)
4. Integração com QueryPanel e BIMQuery

### Regras de Negócio
1. Aplicação de fórmulas customizadas (ex: volume * fator de desperdício)
2. Conversões de unidades (m² para ft², kg para lb)
3. Fatores de produtividade e custos
4. Integração com BudgetService

### Agrupamento e Relatórios
1. Agrupamento por categoria, pavimento, disciplina, etc
2. Geração de relatórios em múltiplos formatos
3. Templates customizados e branding
4. Integração com StorageService

### Cache e Performance
1. Cache de resultados por modelo e parâmetros
2. Cálculo incremental (apenas elementos alterados)
3. Otimização para grandes modelos
4. Monitoramento de performance

### Quantitativos Federados
1. Cálculo cross-model (ex: estrutura + arquitetura)
2. Deduplicação e consolidação
3. Integração com FederationService

## Exemplos de Uso Avançados
```typescript
// Cálculo completo com filtros
const takeoff = await quantitativos5D.calculateTakeoff(modelId, {
  filters: { type: 'IFCWALL', property: { name: 'Level', value: '2' } },
  rules: [{ type: 'waste_factor', value: 1.1 }]
});

// Cálculo por tipo
const walls = await quantitativos5D.calculateByType(modelId, 'IFCWALL');

// Agrupamento por pavimento
const grouped = quantitativos5D.groupTakeoff(takeoff.items, ['Level', 'Type']);

// Exportação para Excel
const excel = await quantitativos5D.exportTakeoff(takeoff, 'excel');

// Registro de novo tipo de quantitativo
quantitativos5D.registerTakeoffType('mep_piping', mepHandler);
```

## Pontos de Integração Detalhados
- **IFCService:** Extração de elementos, propriedades, filtros
- **BudgetService:** Integração com orçamentos, custos 5D
- **UI:** Painéis de quantitativos, TakeoffPanel, relatórios
- **Controllers:** Orquestração de cálculos, workflows
- **State Manager:** Estado global de quantitativos, cache
- **StorageService:** Persistência de relatórios, exportações
- **FederationService:** Quantitativos federados cross-model
- **Plugins/Extensões:** Novos tipos, regras, integrações

## Critérios de Qualidade
- Precisão e confiabilidade nos cálculos de quantitativos
- Suporte a múltiplos tipos, filtros, regras e agrupamentos
- Performance otimizada com cache e cálculo incremental
- Testes unitários e de integração para todos os fluxos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos tipos, regras e integrações
- Monitoramento de performance, logs de cálculo e erros

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo Quantitativos5D do frontend, cobrindo cálculo avançado de quantitativos, regras de negócio, filtros, agrupamento, exportação, federação e critérios de qualidade.
