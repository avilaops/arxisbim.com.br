# 31- PainelPropriedades

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo PainelPropriedades, responsável por exibir, editar e gerenciar propriedades de elementos BIM/IFC no frontend.

## Responsabilidades Detalhadas
- Exibir propriedades de elementos selecionados (IFC properties, psets, quantitativos)
- Suportar edição de propriedades editáveis (custom, user-defined)
- Gerenciar layout e organização de propriedades (grupos, categorias, abas)
- Expor API para consulta, atualização, validação e persistência de propriedades
- Integrar com IFCService, SelectionService, UI, controllers, state manager e plugins
- Suportar múltiplos tipos de propriedade (string, number, boolean, enum, measure, date)
- Emitir eventos de seleção, mudança de propriedade e erros
- Permitir extensões/plugins para novos tipos de propriedade, validações e integrações
- Suportar propriedades federadas (cross-model, multi-projeto)
- Gerenciar histórico, undo/redo e auditoria de alterações

## APIs/Contratos
- Métodos principais:
  - `getProperties(expressId: number): Promise<PropertySet[]>` — Obter propriedades
  - `updateProperty(expressId: number, property: PropertyUpdate): Promise<void>` — Atualizar
  - `validateProperty(property: PropertyUpdate): ValidationResult` — Validação
  - `onPropertiesChange(callback: (expressId: number, properties: PropertySet[]) => void): UnsubscribeFn` — Evento
  - `onSelectionChange(callback: (expressIds: number[]) => void): UnsubscribeFn` — Seleção
  - `setLayout(layout: PropertyLayout): void` — Layout customizado
  - `addGroup(group: PropertyGroup): void` — Adicionar grupo
  - `addTab(tab: PropertyTab): void` — Adicionar aba
  - `registerPropertyType(type: string, handler: PropertyTypeHandler): void` — Extensão
  - `getPropertyHistory(expressId: number): PropertyHistory[]` — Histórico
  - `undoPropertyChange(expressId: number): void` — Undo
  - `redoPropertyChange(expressId: number): void` — Redo
- Suporte a integração com IFCService, SelectionService, UI, state manager, plugins

## Fluxos Detalhados
### Exibição de Propriedades
1. Usuário seleciona elemento no viewer
2. PainelPropriedades recebe evento de seleção
3. Consulta propriedades via IFCService
4. Organiza e exibe propriedades em grupos/abas
5. Suporte a múltiplos elementos selecionados

### Edição de Propriedades
1. Usuário edita propriedade editável
2. Validação de tipo, formato e regras de negócio
3. Atualização via IFCService/API
4. Emissão de evento de mudança
5. Suporte a undo/redo e histórico

### Layout e Organização
1. Configuração de layout customizado (grupos, categorias, abas)
2. Ordenação e filtragem de propriedades
3. Suporte a templates por tipo de elemento
4. Integração com UI para renderização

### Validação e Regras
1. Validação de tipo (string, number, boolean, enum)
2. Validação de formato (email, URL, measure)
3. Aplicação de regras de negócio customizadas
4. Feedback de erro ao usuário

### Histórico e Auditoria
1. Registro de alterações de propriedade
2. Suporte a undo/redo
3. Auditoria de quem alterou, quando e o quê
4. Integração com LoggingService

### Propriedades Federadas
1. Exibição de propriedades cross-model
2. Consolidação e deduplicação
3. Integração com FederationService

## Exemplos de Uso Avançados
```typescript
// Obter propriedades de elemento
const properties = await painelPropriedades.getProperties(1234);

// Atualizar propriedade
await painelPropriedades.updateProperty(1234, {
  name: 'FireRating',
  value: 'EI60',
  type: 'string'
});

// Configurar layout customizado
painelPropriedades.setLayout({
  groups: [
    { name: 'Geral', properties: ['Name', 'Description'] },
    { name: 'Quantitativos', properties: ['Volume', 'Area'] }
  ]
});

// Registrar novo tipo de propriedade
painelPropriedades.registerPropertyType('measure', measureHandler);

// Ouvir mudanças
painelPropriedades.onPropertiesChange((id, props) => updateUI(props));
```

## Pontos de Integração Detalhados
- **IFCService:** Extração e atualização de propriedades IFC
- **SelectionService:** Eventos de seleção, contexto
- **UI:** Renderização do painel, formulários, validação
- **Controllers:** Orquestração de edição, workflows
- **State Manager:** Estado global de propriedades, layout
- **LoggingService:** Auditoria de alterações
- **FederationService:** Propriedades federadas cross-model
- **Plugins/Extensões:** Novos tipos, validações, integrações

## Critérios de Qualidade
- Exibição clara e organizada de propriedades
- Suporte a múltiplos tipos, validações e layouts
- Sincronização robusta entre viewer, UI e state manager
- Testes unitários e de integração para todos os fluxos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos tipos e validações
- Monitoramento de alterações, logs de auditoria e erros

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo PainelPropriedades do frontend, cobrindo exibição avançada de propriedades, edição, validação, layout, histórico, federação e critérios de qualidade.
