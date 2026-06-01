# ADR 002: Adoção de OAuth2/OIDC com auth.avilaops.com

## Status
Aceito

## Contexto
O aplicativo Arxisvr precisa de autenticação centralizada e segura para múltiplos tenants e usuários. Requisitos incluem:
- Single Sign-On (SSO) cross-app
- Gerenciamento centralizado de usuários e permissões
- Multi-tenancy com troca de contexto
- MFA e políticas de segurança centralizadas
- Compliance LGPD/GDPR

## Decisão
Adotar OAuth2/OIDC padrão com domínio auth.avilaops.com como provedor de identidade, implementado via `AuthService`.

## Consequências
### Positivas
- Desacoplamento completo de lógica de autenticação
- SSO nativo para toda plataforma AvilaOps
- Tokens JWT padronizados com claims e roles
- Renovação automática de tokens
- Suporte a multi-tenant com troca de contexto
- Auditoria e compliance centralizados

### Negativas
- Dependência externa (auth.avilaops.com)
- Necessita conectividade com domínio auth
- Fluxo de callback OAuth requer redirecionamento

## Alternativas Consideradas
1. **Autenticação local**: Maior controle, mas duplicação de lógica e manutenção
2. **Auth0/Firebase**: SaaS maduro, mas dependência de terceiros e custos
3. **SAML**: Enterprise-ready, mas mais complexo e verboso

## Implementação
- `AuthService` gerencia fluxo OAuth2/OIDC
- Endpoints: `/authorize`, `/token`, `/userinfo`, `/logout`
- Storage seguro de tokens (access, refresh, id)
- Auto-refresh antes de expiração
- Integração com UserService para contexto de usuário
- Eventos de login/logout/expiração via EventBus

## Referências
- Documentação Módulo 25: AuthService
- RFC 6749: OAuth 2.0
- RFC 7643: OpenID Connect Core 1.0