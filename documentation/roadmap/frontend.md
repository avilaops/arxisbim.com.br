# Roadmap Técnico - Arxisvr Frontend

## Visão Geral
Este documento define o roadmap técnico de médio/longo prazo para evolução contínua do frontend Arxisvr, priorizando recursos avançados, integrações e melhorias de arquitetura.

## Q3 2026

### Multiplayer e Colaboração Realtime
- [x] Implementar RealtimeService (WebSocket)
- [x] Integrar presença de usuários no viewer
- [x] Implementar chat colaborativo
- [x] Sincronizar seleções entre usuários
- [x] Adicionar indicadores de cursores remotos

### Documentação Arquitetural
- [x] Criar ADRs para decisões principais
- [x] Atualizar diagramas Mermaid
- [x] Documentar contratos de APIs
- [ ] Criar guia de contribuição

## Q4 2026

### Streaming de Geometria Avançado
- [x] Implementar streaming progressivo de IFC
- [x] Otimizar LOD dinâmico baseado em frustum
- [x] Adicionar pré-carregamento inteligente
- [x] Implementar cache de geometria em IndexedDB

### Performance e Escalabilidade
- [ ] Distribuir workers para parsing paralelo
- [ ] Implementar virtualização de listas grandes
- [ ] Otimizar renderização com instancing
- [x] Adicionar profiling automático

## Q1 2027

### Frameworks Reativos (Avaliação)
- [ ] Avaliar migração incremental para React/Vue
- [ ] Prototipar micro-frontends
- [ ] Testar wrapper progressivo para componentes críticos
- [ ] Documentar critérios de escolha

### Integrações Avançadas
- [x] Integração com BIM 360
- [x] Integração com Procore
- [x] Integração com ERPs (SAP, Oracle)
- [x] Webhooks customizáveis

## Q2 2027

### Automação e Workflows
- [x] Editor visual de automações
- [x] Templates de workflows
- [x] Agendamento avançado (cron-like)
- [x] Condições complexas e triggers

### Analytics Avançado
- [x] Dashboards de analytics
- [x] Heatmaps de interação
- [x] Funis de conversão
