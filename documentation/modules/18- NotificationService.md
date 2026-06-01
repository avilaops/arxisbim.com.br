# 18- NotificationService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo NotificationService, responsável por gerenciar notificações, alertas, mensagens e fluxos de comunicação assíncrona no frontend BIM/IFC.

## Responsabilidades Detalhadas
- Gerenciar fila de notificações (push, toast, banners, modais, e-mails, web push, badges, sons)
- Expor API para criar, exibir, atualizar, remover e persistir notificações
- Suportar múltiplos tipos: info, sucesso, erro, alerta, warning, custom, integração externa, workflow
- Integrar com event bus, state manager, UI, controllers, API, WebSocket, SSE, plugins e storage
- Suportar notificações em tempo real (WebSocket, SSE, polling, integração externa)
- Persistir notificações relevantes (logs, histórico, não lidas, ações do usuário)
- Emitir eventos de mudança de estado (nova, lida, removida, ação, erro, expirada)
- Suportar preferências do usuário (sons, prioridade, agrupamento, silenciar, canal preferido, idioma)
- Permitir extensões/plugins para novos canais, tipos, integrações externas e automações
- Suportar agrupamento, deduplicação, expiração e ações customizadas (ex: abrir painel, navegar, executar callback)
- Gerenciar badges e contadores globais (ex: não lidas, alertas críticos)

## APIs/Contratos
- Métodos principais:
  - `notify(notification: Notification): string` — Cria/exibe notificação, retorna id
  - `updateNotification(id: string, updates: Partial<Notification>): void` — Atualiza notificação
  - `removeNotification(id: string): void` — Remove notificação
  - `getNotifications(filter?: NotificationFilter): Notification[]` — Lista notificações
  - `markAsRead(id: string): void` — Marca como lida
  - `markAllAsRead(filter?: NotificationFilter): void` — Marca todas como lidas
  - `onNotification(callback: (notification: Notification) => void): UnsubscribeFn` — Evento de nova notificação
  - `onBadgeChange(callback: (count: number) => void): UnsubscribeFn` — Evento de mudança de badge
  - `subscribeChannel(channel: string): void` — WebSocket/SSE
  - `unsubscribeChannel(channel: string): void`
  - `setUserPreferences(prefs: NotificationPreferences): void` — Preferências de notificação
  - `getUserPreferences(): NotificationPreferences`
- Suporte a integração com WebSocket, SSE, REST, e-mail, web push, plugins, storage local

## Fluxos Detalhados
### Criação e Exibição de Notificações
1. Controller/UI/serviço chama `notify` com dados (tipo, mensagem, ações, canal)
2. NotificationService adiciona à fila, exibe na UI (toast, banner, modal, badge)
3. Persistência local/histórico se relevante
4. Emissão de eventos para UI, state manager, event bus

### Notificações em Tempo Real
1. Subscribe em canais (WebSocket/SSE) conforme contexto do usuário
2. Recebe notificações push, processa e exibe conforme preferências
3. Suporte a deduplicação, agrupamento e ações customizadas

### Atualização, Remoção e Marcação
1. Atualização de status (lida, removida, expirada, erro)
2. Remoção manual ou automática (expiração, ação do usuário)
3. Marcação em lote (ex: markAllAsRead)
4. Atualização de badges e contadores globais

### Persistência e Histórico
1. Persistência local (IndexedDB, localStorage) e/ou via API
2. Carregamento de histórico, busca, filtros e agrupamento
3. Suporte a logs/auditoria de notificações críticas

### Preferências do Usuário
1. Carregamento e atualização de preferências (sons, prioridade, agrupamento, canal, idioma)
2. Suporte a silenciar, não perturbe, horários, canais preferidos
3. Integração com UserService para sincronização

### Integração com Plugins e Canais Externos
1. Suporte a plugins para novos canais (ex: Slack, Teams, SMS)
2. Integração com automações e workflows externos

## Exemplos de Uso Avançados
```typescript
// Notificação workflow com ação customizada
notificationService.notify({
  type: 'workflow',
  message: 'Nova revisão pendente',
  actions: [
    { label: 'Abrir', callback: () => openPanel('review') },
    { label: 'Ignorar', callback: () => dismissReview() }
  ],
  priority: 'high',
  channel: 'workflow',
  group: 'reviews'
});

// Badge de não lidas
notificationService.onBadgeChange((count) => updateBadge(count));

// Preferências do usuário
notificationService.setUserPreferences({ sound: false, channel: 'webpush', language: 'pt-BR' });

// Marcar todas como lidas
notificationService.markAllAsRead({ type: 'alert' });

// Integração com canal externo
notificationService.subscribeChannel('slack');
```

## Pontos de Integração Detalhados
- **UI:** Toasts, banners, modais, badges, sons, agrupamento, ações customizadas
- **Event Bus:** Eventos globais de notificação, workflow, integração
- **State Manager:** Estado global, persistência, histórico, filtros
- **API:** Notificações, logs, histórico, preferências, canais externos
- **Controllers:** Gatilhos de notificação, workflow, automações
- **WebSocket/SSE:** Notificações em tempo real, canais dinâmicos
- **Plugins/Extensões:** Novos canais, integrações externas, automações
- **Storage local:** Persistência offline, histórico, preferências
- **UserService:** Preferências, contexto do usuário, idioma

## Critérios de Qualidade
- Entrega confiável, em tempo real e sem duplicidade de notificações
- Sincronização robusta entre UI, state manager, canais externos e storage
- Persistência e histórico confiáveis, com busca, filtros e agrupamento
- Testes unitários e de integração para todos os fluxos e canais
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos tipos, canais, integrações e automações
- Monitoramento de entrega, logs de auditoria, rastreabilidade e UX acessível

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo NotificationService do frontend, cobrindo notificações avançadas, tempo real, preferências, integrações, automações e critérios de qualidade.
