# 20- AnalyticsService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo AnalyticsService, responsável por coletar, processar, analisar e reportar métricas de uso, eventos, performance e comportamento do usuário no frontend BIM/IFC.

## Responsabilidades Detalhadas
- Coletar métricas de uso (pageviews, cliques, navegação, sessões, retenção, funis, heatmaps)
- Registrar eventos customizados (ações, fluxos, erros, milestones, funis, conversões, onboarding)
- Medir performance (tempo de carregamento, FPS, parsing, interações, TTI, LCP, Web Vitals)
- Integrar com LoggingService, UI, controllers, API, event bus, state manager, plugins e ferramentas externas (GA, Matomo, custom)
- Suportar múltiplos destinos: API, storage local, analytics externos, plugins
- Emitir eventos de analytics para dashboards, relatórios, automações e alertas
- Suportar anonimização, privacidade, consentimento e compliance (LGPD/GDPR)
- Permitir extensões/plugins para novos tipos de métrica, eventos, integrações e automações
- Suportar exportação, busca, filtros, limpeza e retenção de dados analíticos
- Gerenciar políticas de consentimento, granularidade e retenção
- Suportar coleta offline e sincronização posterior
- Correlacionar analytics com logs, erros, sessões, usuários e contexto

## APIs/Contratos
- Métodos principais:
  - `trackEvent(event: string, data?: object): void` — Evento customizado
  - `trackPageView(page: string, data?: object): void` — Pageview
  - `trackMetric(name: string, value: number, data?: object): void` — Métrica customizada
  - `trackFunnelStep(funnel: string, step: string, data?: object): void` — Funil de conversão
  - `trackHeatmap(area: string, data: HeatmapData): void` — Heatmap de interação
  - `getAnalytics(filter?: AnalyticsFilter): AnalyticsEntry[]` — Consulta
  - `exportAnalytics(format: 'json' | 'csv', filter?: AnalyticsFilter): string` — Exportação
  - `clearAnalytics(filter?: AnalyticsFilter): void` — Limpeza
  - `onAnalytics(callback: (entry: AnalyticsEntry) => void): UnsubscribeFn` — Evento
  - `registerDestination(dest: AnalyticsDestination): void` — Extensão
  - `setConsent(consent: boolean): void` — Consentimento
  - `setRetentionPolicy(policy: RetentionPolicy): void` — Política de retenção
- Suporte a integração com API, storage local, analytics externos, plugins, automações

## Fluxos Detalhados
### Coleta de Métricas e Eventos
1. UI/controllers/services disparam eventos e métricas via métodos do AnalyticsService
2. Dados são enriquecidos com contexto (userId, sessionId, tenant, device, consentimento)
3. Persistência local e/ou envio para API, analytics externo ou plugin
4. Suporte a coleta offline e sincronização posterior

### Medição e Registro de Performance
1. Coleta automática/manual de Web Vitals, FPS, parsing, TTI, LCP
2. Registro de milestones de performance e fluxos críticos
3. Emissão de alertas para performance abaixo do esperado

### Funis, Heatmaps e Onboarding
1. Registro de passos de funil (ex: importação IFC, aprovação orçamento)
2. Coleta de heatmaps de interação (cliques, áreas, tempo)
3. Análise de onboarding, conversão e abandono

### Consulta, Exportação e Limpeza
1. Consulta de analytics por evento, métrica, usuário, sessão, período
2. Filtros avançados (ex: funil, heatmap, performance, conversão)
3. Exportação em múltiplos formatos (json, csv) para BI externo
4. Limpeza manual ou automática conforme política de retenção

### Consentimento, Privacidade e Compliance
1. Gerenciamento de consentimento granular (analytics, performance, marketing)
2. Anonimização de dados sensíveis, opt-out, compliance LGPD/GDPR
3. Políticas de retenção, granularidade e privacidade

### Extensibilidade e Integração
1. Plugins para novos destinos (ex: GA, Matomo, custom)
2. Integração com automações, dashboards, alertas e workflows externos
3. Correlação com logs, erros, sessões, usuários

## Exemplos de Uso Avançados
```typescript
// Evento de funil de conversão
analyticsService.trackFunnelStep('ifc_import', 'parse_complete', { file: 'modelo.ifc', duration: 1200 });

// Heatmap de interação
analyticsService.trackHeatmap('viewer', { x: 120, y: 80, action: 'click' });

// Métrica de Web Vitals
analyticsService.trackMetric('lcp', 2.1, { page: '/models/123' });

// Consentimento granular
analyticsService.setConsent({ analytics: true, performance: false, marketing: false });

// Exportação e limpeza
const json = analyticsService.exportAnalytics('json', { event: 'onboarding' });
analyticsService.clearAnalytics({ olderThan: '90d' });

// Registro de destino customizado
analyticsService.registerDestination({ type: 'matomo', config: { url: '...', siteId: '...' } });
```

## Pontos de Integração Detalhados
- **UI:** Gatilhos de eventos, dashboards, consentimento, heatmaps, onboarding
- **LoggingService:** Correlação de eventos, erros, métricas, sessões
- **Event Bus:** Eventos globais de analytics, automações, alertas
- **State Manager:** Estado global, filtros, contexto, consentimento
- **API:** Persistência, exportação, relatórios, compliance
- **Plugins/Extensões:** Novos destinos, integrações externas, automações
- **Storage local:** Persistência offline, histórico, sincronização
- **Ferramentas externas:** Google Analytics, Matomo, custom, BI
- **Compliance:** Consentimento, anonimização, privacidade, LGPD/GDPR

## Critérios de Qualidade
- Coleta confiável, performática e segura de métricas, eventos e performance
- Suporte a múltiplos destinos, filtros, busca, exportação, consentimento e retenção
- Testes unitários e de integração para todos os fluxos, destinos e formatos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos tipos de métrica, eventos, integrações e automações
- Privacidade, anonimização, granularidade e compliance (LGPD/GDPR)
- Monitoramento de coleta, alertas, dashboards e rastreabilidade

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo AnalyticsService do frontend, cobrindo analytics avançado, performance, funis, heatmaps, consentimento, integrações, automações e critérios de qualidade.
