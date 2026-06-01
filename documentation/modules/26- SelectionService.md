# 26- SelectionService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo SelectionService, responsável por gerenciar seleção, highlight, inspeção e manipulação de elementos no viewer 3D BIM/IFC.

## Responsabilidades Detalhadas
- Gerenciar seleção de elementos (single, multiple, box selection, raycast, por propriedade, por tipo, por query)
- Controlar estado de highlight (cor, opacidade, outline, glow, seleção ativa vs inativa)
- Expor API para selecionar, deselecionar, toggle, filtrar, agrupar e persistir seleções
- Suportar seleção semântica (ex: todas paredes do pavimento 2, elementos com propriedade X)
- Integrar com Viewer 3D, IFCService, UI, controllers, state manager, plugins e StorageService
- Suportar seleção federada (cross-model, multi-projeto, multi-tenant)
- Emitir eventos de seleção, deseleção, highlight, mudança de contexto e erros
- Permitir extensões/plugins para novos modos de seleção, filtros customizados e integrações
- Suportar undo/redo de seleção, histórico e restauração de contexto
- Gerenciar performance de seleção em grandes modelos (spatial indexing, LOD, culling)

## APIs/Contratos
- Métodos principais:
  - `select(expressIds: number[], options?: SelectionOptions): void` — Seleção explícita
  - `deselect(expressIds: number[]): void` — Deseleção
  - `toggleSelection(expressId: number): void` — Toggle
  - `clearSelection(): void` — Limpar seleção
  - `getSelection(): number[]` — Seleção atual
  - `selectByQuery(query: IFCQuery): Promise<number[]>` — Seleção semântica
  - `selectByBox(box: Box3): number[]` — Box selection
  - `highlight(expressIds: number[], style?: HighlightStyle): void` — Highlight customizado
  - `clearHighlight(): void` — Limpar highlight
  - `onSelectionChange(callback: (selection: number[]) => void): UnsubscribeFn` — Evento
  - `onHighlightChange(callback: (highlight: number[]) => void): UnsubscribeFn` — Evento
  - `saveSelection(name: string): string` — Persistir seleção
  - `loadSelection(id: string): void` — Carregar seleção
  - `undoSelection(): void` — Undo
  - `redoSelection(): void` — Redo
- Suporte a integração com Viewer 3D, IFCService, UI, state manager, plugins, storage

## Fluxos Detalhados
### Seleção e Deseleção
1. Usuário clica em elemento (raycast) ou usa seleção por query/box
2. SelectionService atualiza estado, notifica viewer, UI e controllers
3. Highlight aplicado conforme estilo configurado
4. Eventos emitidos para state manager e plugins
5. Suporte a seleção múltipla, toggle e clear

### Seleção Semântica e Query
1. Query enviada para IFCService (ex: todas IFCWALL do pavimento 2)
2. Resultados filtrados e selecionados
3. Suporte a queries complexas (AND, OR, propriedades customizadas)
4. Integração com QueryPanel e BIMQuery

### Highlight e Estilos
1. Aplicação de estilos customizados (cor, opacidade, outline, glow)
2. Suporte a múltiplos estilos simultâneos (ex: seleção ativa vs inativa)
3. Integração com Viewer 3D para renderização

### Persistência e Histórico
1. Salvar seleção com nome e contexto
2. Carregar seleção salva do storage
3. Undo/redo de seleção com histórico
4. Integração com StorageService e state manager

### Seleção Federada
1. Seleção cross-model (ex: elementos de múltiplos IFCs)
2. Sincronização de seleção entre modelos federados
3. Integração com FederationService

## Exemplos de Uso Avançados
```typescript
// Seleção semântica
const walls = await selectionService.selectByQuery({ type: 'IFCWALL', property: { name: 'Level', value: '2' } });

// Box selection
const box = new THREE.Box3(min, max);
selectionService.selectByBox(box);

// Highlight customizado
selectionService.highlight([1234, 5678], { color: 0xff0000, opacity: 0.5, outline: true });

// Persistir e carregar seleção
const id = selectionService.saveSelection('paredes-pavimento-2');
selectionService.loadSelection(id);

// Undo/redo
selectionService.undoSelection();
selectionService.redoSelection();
```

## Pontos de Integração Detalhados
- **Viewer 3D:** Renderização de seleção, highlight, raycast, box selection
- **IFCService:** Queries semânticas, propriedades, filtros avançados
- **UI:** Painéis de propriedades, QueryPanel, seleção visual
- **Controllers:** Orquestração de seleção, contexto, workflows
- **State Manager:** Estado global de seleção, histórico, contexto
- **StorageService:** Persistência de seleções salvas
- **FederationService:** Seleção federada cross-model
- **Plugins/Extensões:** Novos modos de seleção, filtros customizados

## Critérios de Qualidade
- Seleção rápida e responsiva, mesmo em grandes modelos
- Suporte a múltiplos modos, estilos e queries complexas
- Sincronização robusta entre viewer, UI e state manager
- Testes unitários e de integração para todos os fluxos de seleção
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos modos, filtros e integrações
- Performance otimizada com spatial indexing, LOD e culling

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo SelectionService do frontend, cobrindo seleção avançada, highlight, queries semânticas, persistência, histórico, federação e critérios de qualidade.
