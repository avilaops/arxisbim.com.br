# 25- AuthService

## Objetivo
Descrever a integração, responsabilidades e fluxos do AuthService, responsável por consumir e orquestrar autenticação, autorização e contexto de usuário via domínio auth.avilaops.com, sem duplicar lógica de autenticação.

## Responsabilidades Detalhadas
- Integrar com auth.avilaops.com via OAuth2/OIDC (SSO), endpoints padrão (`/authorize`, `/token`, `/userinfo`, `/logout`, JWKS)
- Gerenciar tokens de acesso, refresh, ID e contexto de sessão (armazenamento seguro, expiração, renovação automática, revogação)
- Expor API para login, logout, verificação de sessão, refresh, obtenção de claims, roles, permissões e tenant
- Sincronizar contexto de usuário (id, nome, email, roles, permissões, tenant, MFA, status, avatar, políticas)
- Propagar eventos de login/logout, expiração, troca de usuário, atualização de perfil, consentimento e troca de tenant
- Integrar com UserService, UI, controllers, state manager, API, LoggingService e NotificationService
- Suportar RBAC, MFA, auditoria, consentimento, políticas de segurança e privacidade centralizadas
- Garantir privacidade, consentimento, rastreabilidade e compliance (LGPD/GDPR)
- Não implementar fluxos de cadastro, redefinição de senha, verificação de email ou painel de perfil (delegar ao domínio auth)
- Suportar multi-tenant, multi-usuário, contextos paralelos e SSO cross-app

## APIs/Contratos
- Métodos principais:
  - `login(redirectUri?: string): void` — Redireciona para SSO
  - `logout(): void` — Logout global
  - `getSession(): Promise<AuthSession | null>` — Sessão atual
  - `refreshToken(): Promise<void>` — Renova tokens
  - `getUser(): AuthUser | null` — Claims do usuário
  - `hasPermission(permission: string): boolean` — RBAC
  - `onAuthEvent(callback: (event: AuthEvent) => void): UnsubscribeFn` — Eventos
  - `switchTenant(tenantId: string): Promise<void>` — Troca de tenant
  - `getAccessToken(): string | null` — Token JWT
- Integração com OAuth2/OIDC endpoints: `/authorize`, `/token`, `/userinfo`, `/logout`, JWKS
- Suporte a storage seguro/local para tokens (expiração, renovação, revogação, consentimento)
- Propagação de claims, roles, tenant e políticas para UserService e state manager
- Suporte a múltiplos contextos/sessões (ex: admin, impersonation, multi-tenant)

## Fluxos Detalhados
### Login/Logout/SSO
1. Redireciona para auth.avilaops.com/oauth/authorize com scopes, redirectUri, state, nonce
2. Recebe callback com código/token, valida, armazena tokens (access, id, refresh) e contexto
3. Logout redireciona para /logout do domínio auth, limpa tokens/contexto local e global
4. Suporte a SSO cross-app (login/logout único para toda a plataforma)

### Sessão, Tokens e Contexto
1. Consulta e renova tokens conforme expiração (silent refresh, refresh token rotation)
2. Sincroniza claims, roles, permissões, tenant, MFA, status e políticas com UserService
3. Propaga eventos de login/logout/expiração/troca de tenant para UI, controllers e state manager
4. Suporte a múltiplos contextos/sessões (ex: admin, impersonation, multi-tenant)

### Segurança, RBAC, MFA e Compliance
1. Delegação total de autenticação, MFA, políticas, consentimento e auditoria ao domínio auth
2. Garantia de privacidade, consentimento, rastreabilidade e compliance (LGPD/GDPR)
3. Propagação de roles, permissões e políticas para proteção de rotas, UI e API
4. Suporte a logs de login/logout, troca de tenant, consentimento e eventos críticos

### Integração e Extensibilidade
1. Integração transparente com UserService, LoggingService, NotificationService, controllers, API e state manager
2. Suporte a hooks/eventos customizados para login/logout/expiração/troca de tenant
3. Facilidade de extensão para novos fluxos de consentimento, MFA, políticas e integrações externas

## Exemplos de Uso Avançados
```typescript
// Iniciar login SSO
authService.login('/dashboard');

// Obter usuário autenticado e claims
const user = authService.getUser();
const session = await authService.getSession();

// Verificar permissão e tenant
if (authService.hasPermission('edit_project') && user.tenant === 'empresa-x') { ... }

// Trocar tenant
await authService.switchTenant('empresa-y');

// Ouvir eventos de autenticação
authService.onAuthEvent((event) => handleAuthEvent(event));
```

## Pontos de Integração Detalhados
- **UI:** Menus, login/logout, avatar, permissões, troca de tenant, consentimento
- **UserService:** Contexto, claims, roles, tenant, políticas
- **State Manager:** Sessão global/contextual, tenant, permissões
- **API:** Envio de tokens em requests, proteção de endpoints
- **Controllers:** Proteção de rotas, permissões, tenant, MFA
- **LoggingService:** Logs de login/logout, troca de tenant, consentimento, auditoria
- **NotificationService:** Notificações de login/logout, expiração, troca de tenant
- **Compliance:** Consentimento, privacidade, rastreabilidade, LGPD/GDPR

## Critérios de Qualidade
- Integração robusta, segura, transparente e auditável com auth.avilaops.com
- Não duplicar fluxos já existentes no domínio auth
- Suporte a SSO, RBAC, MFA, multi-tenant, consentimento, auditoria e compliance
- Testes de integração para todos os fluxos de login/logout/refresh/troca de tenant
- Documentação clara de integração, exemplos de uso e extensibilidade
- Facilidade de extensão para novos fluxos, políticas, MFA, consentimento e integrações

---
> Este documento serve como guia aprofundado para integração e uso seguro do AuthService, centralizando autenticação no domínio auth.avilaops.com e promovendo desacoplamento, segurança, governança, privacidade e extensibilidade.
