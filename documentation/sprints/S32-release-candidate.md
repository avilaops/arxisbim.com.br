# S32 · Release Candidate — Hardening

**Fase:** Apresentação e Entrega  
**Status:** Pendente  
**Depende de:** S31 (feature completa), todos os sprints anteriores  
**Bloqueia:** —

---

## Objetivo

Cobertura de testes e2e do fluxo completo (S01→S30). Auditoria de segurança. Load test com 50 usuários simultâneos. Documentação pública do produto. Sem regressões no build.

---

## Por que importa a longo prazo

Um produto que não pode ser entregue com confiança não existe comercialmente. O S32 não adiciona features — é o sprint que garante que as features dos 31 sprints anteriores funcionam juntas, sob carga, sem vulnerabilidades óbvias.

O risco sistêmico mais alto do ArxisVR é vazamento de dados entre tenants (RLS falhando sob condição específica). A auditoria de segurança deste sprint foca nesse vetor antes de qualquer outro.

---

## Checklist de hardening

### Segurança
- [ ] Auditoria de RLS: cada tabela com dados de tenant tem política `WHERE tenant_id = auth.uid()`
- [ ] Revisão de todas as rotas: autenticação e autorização aplicadas, sem rotas abertas acidentais
- [ ] Rate limiting em todas as rotas públicas (register, login, forgot-password)
- [ ] Validação de input em todos os endpoints (Zod schemas, sem bypass por tipo)
- [ ] Headers de segurança: CSP, HSTS, X-Frame-Options configurados
- [ ] Dependências: `npm audit` sem vulnerabilidades críticas ou altas

### Performance
- [ ] Load test: 50 usuários simultâneos fazendo upload e parse de IFC sem erro 5xx
- [ ] P95 de resposta das rotas mais usadas < 500ms sob carga
- [ ] Memory leak: backend rodando 1h sem crescimento de heap > 50MB
- [ ] Frontend: Lighthouse score > 80 na página de viewer

### Qualidade
- [ ] Cobertura e2e: fluxo completo (register → upload IFC → criar cenário → comparar → exportar PDF) passa
- [ ] Todos os testes existentes passam no CI
- [ ] Build de frontend e backend sem warnings de tipo
- [ ] Bundle size do frontend < 2MB gzipped

### Documentação
- [ ] README público descreve o produto para engenheiro novo
- [ ] Variáveis de ambiente documentadas com exemplos em `.env.example`
- [ ] Guia de deploy atualizado (Render backend + Cloudflare Pages frontend)
- [ ] Changelog atualizado até S32

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Ferramenta de load test | `k6` (Grafana) | Script em JS, CI-friendly, sem servidor de teste |
| Auditoria de segurança | Manual + OWASP ZAP scan | Sem budget para Pentest profissional neste estágio |
| Cobertura de testes | E2E de fluxo principal, não 100% de linhas | Fluxo funcional > cobertura sintética |
| Estratégia de release | Tag semver `v1.0.0` + deploy manual para produção | Actions bloqueado por billing; deploy via Render dashboard |

---

## Arquivos principais

```
backend/tests/
  e2e/
    full-flow.spec.ts            ← fluxo completo register→compare→pdf
    security-audit.spec.ts       ← testa RLS, auth bypass, rate limit

load-tests/
  k6-load.js                    ← script k6 com 50 VUs por 5 minutos

documentation/
  DEPLOY.md                     ← guia de deploy atualizado
  changelog.md                  ← atualizado até S32
```

---

## Critérios de aceite

- [ ] Fluxo completo (register → upload → cenário → comparação → PDF) passa em e2e sem intervenção manual
- [ ] Zero falhas 5xx em load test de 50 usuários por 5 minutos
- [ ] `npm audit` sem vulnerabilidades críticas ou altas
- [ ] Nenhum vazamento de dados entre tenants verificado em teste automatizado
- [ ] Bundle frontend < 2MB gzipped
- [ ] Lighthouse score > 80 no viewer
- [ ] Tag `v1.0.0` criada no git
- [ ] Deploy de produção realizado com sucesso
- [ ] Rollback testado: versão anterior restaurada em < 5 minutos
