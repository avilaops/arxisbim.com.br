# ADR 001: Adoção de WebSocket para Colaboração Realtime

## Status
Aceito

## Contexto
O aplicativo Arxisvr precisa suportar colaboração em tempo real entre múltiplos usuários trabalhando no mesmo modelo BIM/IFC. Cenários incluem:
- Presença de usuários (quem está online)
- Chat entre colaboradores
- Sincronização de cursores
- Notificação de seleções compartilhadas
- Edição colaborativa futura

## Decisão
Adotar WebSocket nativo para comunicação realtime, implementado via `RealtimeService`.

## Consequências
### Positivas
- Baixa latência para comunicação bidirecional
- Conexão persistente reduz overhead
- Suporte nativo em navegadores modernos
- Fácil integração com arquitetura existente (EventBus, serviços)

### Negativas
- Requer gerenciamento de reconexão
- Necessita backend WebSocket compatível
- Pode ter problemas com firewalls corporativos

## Alternativas Consideradas
1. **Socket.IO**: Maior overhead, mas com fallbacks automáticos
2. **SignalR**: Forte integração com .NET, mas específico para Microsoft
3. **WebRTC**: Baixa latência P2P, mas complexo para multiplexação

## Implementação
- `RealtimeService` gerencia conexão WebSocket
- Auto-reconexão com exponential backoff
- Eventos emitidos via EventBus para integração com UI
- Armazenamento local de mensagens e presença

## Referências
- Documentação Etapa 8: Evolução e Futuro
- RFC 6455: The WebSocket Protocol