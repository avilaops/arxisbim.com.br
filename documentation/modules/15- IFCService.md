# 15- IFCService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo IFCService, responsável por parsing, extração de propriedades, manipulação e análise de modelos IFC (Industry Foundation Classes) no frontend.

## Responsabilidades Detalhadas
- Parsing eficiente de arquivos IFC (IFC2x3, IFC4, variantes proprietárias), com uso de web workers para não travar a UI
- Extração de propriedades, hierarquia, elementos, relacionamentos e metadados (ex: GUID, expressID, OwnerHistory)
- Suporte a filtros, queries semânticas, navegação por tipo, propriedade, sistema construtivo, etc
- Fornecer API para seleção, inspeção, manipulação e highlight de elementos IFC
- Exportação de submodelos, cortes, snapshots, conversão para GLB, JSON, CSV
- Validação de integridade, consistência, regras de negócio e padrões BIM
- Gerenciamento de cache, otimização de acesso e memória para grandes modelos
- Suporte a múltiplos modelos carregados simultaneamente (federation)
- Integração com BudgetService (quantitativos, takeoff), Viewer 3D, SelectionService, UI e StorageService
- Suporte a extensões/plugins para filtros customizados, validações e exportações

## APIs/Contratos
- Métodos principais:
  - `parseIFC(file: File | ArrayBuffer, options?: { onProgress?: (progress: number) => void }): Promise<IFCModel>`
  - `getProperties(model: IFCModel, expressID: number): Promise<IFCProperties>`
  - `getHierarchy(model: IFCModel): Promise<IFCHierarchy>`
  - `query(model: IFCModel, filter: IFCQuery): Promise<IFCElement[]>`
  - `getRelated(model: IFCModel, expressID: number, relation: string): Promise<IFCElement[]>`
  - `exportSubmodel(model: IFCModel, expressIDs: number[], format?: 'ifc' | 'glb' | 'json'): Promise<Blob>`
  - `convertToGLB(model: IFCModel, options?: object): Promise<Blob>`
  - `validateModel(model: IFCModel, rules?: ValidationRule[]): Promise<IFCValidationResult>`
  - `getStats(model: IFCModel): Promise<IFCStats>`
  - `loadMultiple(files: (File | ArrayBuffer)[], options?: object): Promise<IFCModel[]>`
- Eventos:
  - `onParseProgress(progress: number, file?: File)`
  - `onError(error: Error, context?: object)`
  - `onQueryResult(result: IFCElement[], query: IFCQuery)`
  - `onExportReady(blob: Blob, format: string)`

## Fluxos Detalhados
### Parsing e Carregamento
1. Recebe arquivo IFC (drag&drop, upload, StorageService)
2. Inicia parsing em web worker, reporta progresso
3. Cria estrutura de dados otimizada (índices, cache, lookup por expressID)
4. Emite evento de conclusão e disponibiliza modelo para outros módulos

### Extração e Consulta
1. Consulta propriedades, hierarquia, relacionamentos (ex: paredes de um pavimento)
2. Suporte a queries avançadas (ex: todos elementos com propriedade X, todos IFCWALL)
3. Retorno paginado para queries grandes

### Exportação e Conversão
1. Exportação de submodelos (seleção de elementos, cortes, filtros)
2. Conversão para GLB, JSON, CSV para integração com outros sistemas
3. Download ou envio para StorageService

### Validação e Análise
1. Validação de integridade (ex: elementos sem Owner, GUID duplicado)
2. Aplicação de regras customizadas (ex: padrões BIM, requisitos de projeto)
3. Geração de relatório de validação

### Federation (Múltiplos Modelos)
1. Carregamento e manipulação de múltiplos modelos simultaneamente
2. Queries e operações cruzadas (ex: clash detection, takeoff federado)

## Exemplos de Uso Avançados
```typescript
// Parsing com progresso
const model = await ifcService.parseIFC(file, { onProgress: (p) => updateProgressBar(p) });

// Query avançada
const portas = await ifcService.query(model, { type: 'IFCDOOR', property: { name: 'FireRating', value: 'EI60' } });

// Exportar submodelo para GLB
const glb = await ifcService.exportSubmodel(model, [1234, 5678], 'glb');

// Validação customizada
const validation = await ifcService.validateModel(model, [noDuplicateGUIDs, hasOwnerHistory]);

// Federation
const models = await ifcService.loadMultiple([file1, file2]);
const clashes = await ifcService.query(models[0], { type: 'CLASH', with: models[1] });
```

## Pontos de Integração Detalhados
- **Viewer 3D:** Carregamento, seleção, highlight, cortes, exportação
- **BudgetService:** Quantitativos, takeoff, propriedades customizadas
- **SelectionService:** Seleção semântica, múltipla, propagação de seleção
- **UI:** Painéis de propriedades, consultas BIM, filtros avançados
- **StorageService:** Upload/download de IFC, exportação de submodelos
- **API Integration:** Sincronização, validação backend, relatórios
- **Plugins/Extensões:** Filtros customizados, validações, exportações

## Critérios de Qualidade
- Parsing eficiente, uso de web workers, cache e otimização de memória
- Precisão e integridade dos dados extraídos, suporte a variantes e extensões
- Suporte a queries avançadas, federation e exportação customizada
- Testes unitários e de integração para parsing, queries, exportações e validações
- Documentação clara da API, exemplos de uso e fluxos
- Extensibilidade para novos filtros, formatos, integrações e plugins
- Monitoramento de performance, logs de parsing e queries

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo IFCService do frontend, cobrindo parsing avançado, federation, queries, exportação, validação, integrações e critérios de qualidade.
