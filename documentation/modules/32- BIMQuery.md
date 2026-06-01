# 32- BIMQuery

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo BIMQuery, responsável por executar queries semânticas avançadas em modelos BIM/IFC para busca, filtro e análise de elementos.

## Responsabilidades Detalhadas
- Executar queries semânticas em modelos IFC (por tipo, propriedade, relacionamento, espaço)
- Suportar linguagem de query avançada (SQL-like, filters, aggregations, joins)
- Expor API para consulta, filtro, agrupamento, agregação e exportação de resultados
- Integrar com IFCService, SelectionService, UI, controllers, plugins e StorageService
- Suportar múltiplos tipos de query (spatial, temporal, semântica, federada)
- Emitir eventos de query, resultado, erro e progresso
- Permitir extensões/plugins para novos operadores, funções e integrações
- Suportar queries federadas (cross-model, multi-projeto, multi-tenant)
- Gerenciar cache, performance e query otimizada
- Suportar保存 e compartilhamento de queries (templates, favoritos)

## APIs/Contratos
- Métodos principais:
  - `executeQuery(query: BIMQuery): Promise<BIMQueryResult>` — Execução principal
  - `queryByType(type: string): Promise<BIMElement[]>` — Por tipo
  - `queryByProperty(property: string, value: any): Promise<BIMElement[]>` — Por propriedade
  - `querySpatial(spatialQuery: SpatialQuery): Promise<BIMElement[]>` — Query espacial
  - `queryRelational(relation: string, expressId: number): Promise<BIMElement[]>` — Por relacionamento
  - `aggregate(query: BIMQuery, aggregation: Aggregation): Promise<AggregationResult>` — Agregação
  - `saveQuery(name: string, query: BIMQuery): string` — Salvar query
  - `loadQuery(id: string): BIMQuery` — Carregar query
  - `listQueries(filter?: QueryFilter): SavedQuery[]` — Listar queries salvas
  - `onQueryResult(callback: (result: BIMQueryResult) => void): UnsubscribeFn` — Evento
  - `registerOperator(operator: string, handler: OperatorHandler): void` — Extensão
- Suporte a integração com IFCService, SelectionService, UI, plugins, storage

## Fluxos Detalhados
### Execução de Query
1. Recebe query (tipo, propriedade, filtro, agregação)
2. Processa e otimiza query
3. Executa via IFCService (parsing, extração)
4. Aplica filtros e agregações
5. Retorna resultados
6. Emite evento para UI e SelectionService

### Queries por Tipo e Propriedade
1. Query simples por tipo (ex: todas IFCWALL)
2. Query por propriedade (ex: Level = "2")
3. Queries compostas (AND, OR, NOT)
4. Suporte a comparações (>, <, =, !=, contains)

### Queries Espaciais
1. Query por localização (dentro de box, sphere, polígono)
2. Query por proximidade (distância de ponto/elemento)
3. Query por pavimento, zona, espaço
4. Integração com sistema de coordenadas

### Queries Relacionais
1. Query por relacionamento (ex: connected to, contained in)
2. Navegação por hierarquia (parent, child, siblings)
3. Queries transitive (ex: todos elementos conectados indiretamente)
4. Suporte a grafo de relacionamentos

### Agregações e Grouping
1. Agregações (count, sum, avg, min, max)
2. Grouping por categoria, tipo, propriedade
3. Suporte a having e sorting
4. Exportação de resultados

### Queries Federadas
1. Execução cross-model (ex: paredes de múltiplos IFCs)
2. Consolidação e deduplicação
3. Integração com FederationService

### Cache e Performance
1. Cache de resultados por query
2. Query otimizada (índices, spatial indexing)
3. Suporte a queries assíncronas e streaming
4. Monitoramento de performance

## Exemplos de Uso Avançados
```typescript
// Query por tipo e propriedade
const walls = await bimQuery.executeQuery({
  type: 'IFCWALL',
  filters: [
    { property: 'Level', operator: '=', value: '2' },
    { property: 'FireRating', operator: 'contains', value: 'EI' }
  ]
});

// Query espacial
const inBox = await bimQuery.querySpatial({
  type: 'box',
  min: [0, 0, 0],
  max: [10, 5, 10]
});

// Agregação
const countByType = await bimQuery.aggregate(
  { type: 'IFCWALL' },
  { operation: 'count', groupBy: 'Level' }
);

// Salvar e carregar query
const id = bimQuery.saveQuery('paredes-pavimento-2', query);
const saved = bimQuery.loadQuery(id);
```

## Pontos de Integração Detalhados
- **IFCService:** Extração de elementos, propriedades, relacionamentos
- **SelectionService:** Seleção de resultados de query
- **UI:** Painel de query, resultados, filtros
- **Controllers:** Orquestração de queries, workflows
- **State Manager:** Estado global de queries, cache
- **StorageService:** Persistência de queries salvas
- **FederationService:** Queries federadas cross-model
- **Plugins/Extensões:** Novos operadores, funções, integrações

## Critérios de Qualidade
- Execução rápida e precisa de queries
- Suporte a múltiplos tipos, operadores e agregações
- Performance otimizada com cache e índices
- Testes unitários e de integração para todos os fluxos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos operadores e funções
- Monitoramento de performance, logs de query e erros

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo BIMQuery do frontend, cobrindo queries semânticas avançadas, filtros, agregações, queries espaciais, relacionais, federação e critérios de qualidade.
