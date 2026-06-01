# 17- UserService

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo UserService, responsável por gerenciar usuários, perfis, permissões, preferências e contexto de sessão no frontend BIM/IFC.

## Responsabilidades Detalhadas
- Gerenciar autenticação e sessão do usuário (login, logout, refresh, troca de usuário, múltiplas sessões)
- Armazenar e expor dados do usuário logado (id, nome, email, avatar, perfil, permissões, tenant, grupos)
- Gerenciar perfis e papéis (admin, editor, viewer, convidado, auditor, integrador, custom)
- Expor e persistir preferências do usuário (tema, idioma, atalhos, layout, acessibilidade, notificações, favoritos)
- Sincronizar contexto de usuário com state manager, API, UI e controllers
- Emitir eventos de mudança de usuário, perfil, permissões, preferências e contexto
- Suportar múltiplas sessões, troca rápida de usuário e contexto multi-tenant
- Integrar com AuthService, API, controllers, UI, storage seguro/local e logs de auditoria
- Permitir extensões/plugins para novos perfis, preferências e integrações externas
- Suportar onboarding, recuperação de senha, MFA e políticas de segurança

## APIs/Contratos
- Métodos principais:
  - `login(credentials: LoginCredentials): Promise<UserSession>` — Autentica usuário e inicia sessão
  - `logout(): Promise<void>` — Encerra sessão
  - `refreshSession(): Promise<UserSession>` — Atualiza tokens e sessão
  - `getCurrentUser(): User` — Retorna usuário logado
  - `getUserPreferences(): UserPreferences` — Retorna preferências
  - `setUserPreferences(prefs: Partial<UserPreferences>): void` — Atualiza preferências
  - `onUserChange(callback: (user: User) => void): UnsubscribeFn` — Evento de mudança de usuário
  - `onPreferencesChange(callback: (prefs: UserPreferences) => void): UnsubscribeFn` — Evento de mudança de preferências
  - `hasPermission(permission: string): boolean` — Verifica permissão
  - `switchUser(userId: string): Promise<UserSession>` — Troca de usuário
  - `getUserProfile(): UserProfile` — Retorna perfil/papel
  - `setUserProfile(profile: UserProfile): void` — Atualiza perfil/papel
  - `getSessionContext(): SessionContext` — Retorna contexto de sessão (tenant, grupos, tokens)
  - `onSessionContextChange(callback: (ctx: SessionContext) => void): UnsubscribeFn`
- Suporte a integração com tokens JWT, refresh tokens, OAuth, MFA, storage seguro/local, políticas de senha

## Fluxos Detalhados
### Login, Logout e Sessão
1. Usuário faz login (senha, OAuth, MFA)
2. UserService autentica, armazena tokens, carrega dados e preferências
3. Emite eventos para UI, state manager e controllers
4. Suporte a refresh automático e expiração de sessão
5. Logout limpa tokens, contexto e preferências locais

### Perfis, Papéis e Permissões
1. Carrega perfil/papel do usuário (admin, editor, etc.)
2. Permite atualização de perfil (ex: promoção, downgrade, troca de tenant)
3. Verifica permissões para ações (ex: editar modelo, aprovar orçamento)
4. Suporte a perfis customizados e múltiplos papéis

### Preferências e Personalização
1. Carrega e persiste preferências (tema, idioma, atalhos, layout, favoritos)
2. Permite atualização granular e eventos de mudança
3. Suporte a onboarding, dicas, notificações e acessibilidade

### Multi-Sessão e Troca de Usuário
1. Suporte a múltiplas sessões (ex: admin testando outro perfil)
2. Troca rápida de usuário/contexto sem recarregar app
3. Sincronização de contexto multi-tenant e grupos

### Segurança e Políticas
1. Integração com MFA, políticas de senha, expiração, bloqueio
2. Suporte a recuperação de senha, onboarding seguro
3. Logs de auditoria de login, troca de perfil, preferências

## Exemplos de Uso Avançados
```typescript
// Login com MFA
await userService.login({ email, password, mfaCode });

// Troca de perfil
userService.setUserProfile('auditor');

// Atualizar preferências de acessibilidade
userService.setUserPreferences({ highContrast: true, fontSize: 'large' });

// Verificar múltiplas permissões
if (userService.hasPermission('edit_model') && userService.hasPermission('approve_budget')) { /* ... */ }

// Troca rápida de usuário
await userService.switchUser('user-456');

// Ouvir mudanças de contexto de sessão
userService.onSessionContextChange((ctx) => syncTenant(ctx.tenant));
```

## Pontos de Integração Detalhados
- **AuthService:** Autenticação, tokens, MFA, refresh, políticas
- **API:** Dados do usuário, perfis, permissões, preferências, logs
- **UI:** Menus, avatar, preferências, onboarding, notificações, acessibilidade
- **State Manager:** Contexto global de usuário, perfis, preferências
- **Controllers:** Sincronização de contexto, permissões
- **Storage seguro/local:** Persistência de preferências, tokens, onboarding
- **Plugins/Extensões:** Novos perfis, integrações externas, customizações
- **Logs/Auditoria:** Login, troca de perfil, preferências, segurança

## Critérios de Qualidade
- Segurança máxima no armazenamento e transmissão de dados do usuário (criptografia, storage seguro)
- Sincronização robusta de sessão, perfil, permissões e preferências
- Persistência confiável e granular de preferências
- Suporte a múltiplas sessões, troca rápida e contexto multi-tenant
- Testes unitários e de integração para todos os fluxos de usuário
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos perfis, preferências, integrações e plugins
- Monitoramento de segurança, logs de auditoria e rastreabilidade

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo UserService do frontend, cobrindo autenticação avançada, perfis, permissões, preferências, multi-sessão, integrações e critérios de qualidade.
