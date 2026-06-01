# 16- NavigationService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo NavigationService, responsável por gerenciar modos de navegação, rotas, transições e estados de navegação no frontend BIM/IFC.

## Responsabilidades Detalhadas
- Gerenciar modos de navegação 3D: FPS, drone, orbit, XR, corte, inspeção, split view, multi-model
- Controlar rotas e estados de navegação da aplicação (ex: projeto, modelo, orçamento, painel ativo, contexto de colaboração)
- Sincronizar estado de navegação entre UI, Viewer 3D, controllers e state manager
- Expor API para alternar modos, rotas, transições de tela e contexto
- Suportar deep linking, histórico, navegação programática e restauração de contexto
- Emitir eventos de mudança de modo, rota, contexto e histórico
- Suportar múltiplos contextos de navegação (ex: split view, multi-model, colaboração)
- Integrar com event bus, state manager, UI, API e logs de auditoria
- Permitir extensões/plugins para novos modos e rotas customizadas

## APIs/Contratos
- Métodos principais:
  - `setMode(mode: NavigationMode, options?: object): void` — Alterna modo de navegação 3D
  - `getMode(): NavigationMode` — Retorna modo atual
  - `goTo(route: string, params?: object): void` — Navega para rota/tela
  - `getCurrentRoute(): string` — Retorna rota atual
  - `onModeChange(callback: (mode: NavigationMode, options?: object) => void): UnsubscribeFn`
  - `onRouteChange(callback: (route: string, params?: object) => void): UnsubscribeFn`
  - `pushState(state: object): void` — Salva estado customizado na pilha
  - `popState(): object` — Restaura estado anterior
  - `getHistory(): Array<{ route: string, params?: object }>` — Histórico de navegação
  - `registerMode(mode: string, handler: (options?: object) => void): void` — Extensão de modos customizados
- Suporte a integração com browser history, deep linking, query params e hash

## Fluxos Detalhados
### Alternância de Modos de Navegação 3D
1. Usuário seleciona modo (FPS, drone, orbit, XR, corte, split view)
2. NavigationService atualiza modo, notifica viewer, UI e controllers
3. Sincroniza estado global e histórico
4. Permite extensão para novos modos (ex: modo colaboração, walkthrough)

### Mudança de Rota/Tela
1. Controller/UI chama `goTo` com rota e parâmetros
2. NavigationService atualiza rota, browser history e contexto
3. Emite evento para UI, controllers e state manager
4. Suporte a deep linking e restauração de contexto via URL

### Sincronização e Contexto
1. Sincroniza estado de navegação entre múltiplos módulos (ex: split view, multi-model)
2. Permite navegação programática (ex: após login, upload, seleção)
3. Suporte a múltiplos contextos simultâneos (ex: colaboração, revisão)

### Histórico e Restauração
1. Armazena histórico de rotas, modos e contextos
2. Permite navegação backward/forward, undo/redo de navegação
3. Restauração de contexto completo (ex: painel, seleção, modo)

## Exemplos de Uso Avançados
```typescript
// Alternar para modo XR com opções
navigationService.setMode('xr', { device: 'hololens', anchors: true });

// Navegar para orçamento do projeto com parâmetros
navigationService.goTo('/projects/123/budget', { tab: 'summary' });

// Registrar modo customizado
navigationService.registerMode('walkthrough', (opts) => startWalkthrough(opts));

// Deep linking/restauração
const route = navigationService.getCurrentRoute();
const history = navigationService.getHistory();

// Undo/redo de navegação
navigationService.popState();
navigationService.pushState({ route: '/models/456', mode: 'orbit' });
```

## Pontos de Integração Detalhados
- **Viewer 3D:** Modos de navegação, cortes, inspeção, split view, XR
- **UI:** Menus, toolbars, breadcrumbs, painéis, deep linking
- **Controllers:** Sincronização de contexto, navegação programática
- **State Manager:** Estado global de navegação, múltiplos contextos
- **Event Bus:** Eventos globais de navegação, colaboração
- **API Integration:** Logs de navegação, auditoria, sincronização de contexto
- **Plugins/Extensões:** Novos modos, rotas customizadas, integrações externas

## Critérios de Qualidade
- Transições suaves, previsíveis e rápidas entre modos, rotas e contextos
- Sincronização robusta entre UI, viewer, controllers e estado global
- Suporte a deep linking, histórico, múltiplos contextos e undo/redo
- Testes unitários e de integração para todos os fluxos de navegação
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos modos, rotas, integrações e plugins
- Monitoramento de navegação, logs de auditoria e rastreabilidade

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo NavigationService do frontend, cobrindo modos avançados, histórico, deep linking, extensibilidade, integrações e critérios de qualidade.
