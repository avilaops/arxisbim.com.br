# Changelog: ArxisVR

Registro de decisões relevantes e mudanças de direção.
Uma entrada por decisão. Atualizar este arquivo quando uma decisão anterior for substituída.

---

## 2026-09-17

### Domínio próprio: `arxisbim.com.br` passa a ser o canônico
**Decisão:** o produto sai de `arxisvr.avilaops.com` para `arxisbim.com.br`
(API em `api.arxisbim.com.br`), com o domínio antigo respondendo durante uma
janela de transição: o site redireciona 308, a API continua servindo sem
redirecionar.
**Motivo:** subdomínio de `avilaops.com` faz o produto parecer módulo interno da
casa. O nome comercial já é Arxis (`@arxis.bim` no Instagram), e domínio próprio
é pré-requisito para verificar domínio na Meta, no Search Console e no remetente
de e-mail. A API antiga não redireciona porque 3xx quebra preflight de CORS e os
`POST` do plugin do Revit já instalado.
**Impacto:** endereço público deixou de ser literal no código —
`frontend/src/config/site.config.ts` e `backend/src/core/config/domains.ts` são
os dois pontos de verdade, e os scripts de deploy leem `ARXISVR_SITE_URL` /
`ARXISVR_API_URL`. O default de CORS deixou de ser `*` (incompatível com
`credentials: true`) e passou a ser a allowlist dos domínios do produto.
Execução em `documentation/MIGRACAO-2026-09-17-dominio-arxisbim.md`; nada muda
em produção antes do DNS e do Caddyfile.

---

## 2026-06-11

### Roadmap expandido para 32 sprints atômicos
**Decisão:** Expandir de 15 para 32 sprints, cada um com objetivo único e critérios de aceite verificáveis.  
**Motivo:** Sprints grandes causam regressões, perda de contexto e PRs gigantes quando executados por agentes (Claude Code, Copilot, Cursor). Sprints menores aumentam taxa de sucesso e permitem rollback simples.  
**Impacto:** `documentation/roadmap/ROADMAP.md` substituído. Versões anteriores não mantidas.

### Motor de Cenários antecipado para S12
**Decisão:** Primeiro cenário salvo no S12 (antes do 5D e 4D), com evoluções em S18, S26 e S30.  
**Motivo:** Cenário é hipótese central do produto. Validar no S12 evita construir meses de plataforma antes de confirmar que usuários querem comparar alternativas.  
**Impacto:** Sequência anterior (cenários no final) substituída.

### Sprint de Busca BIM adicionado (S15)
**Decisão:** Sprint dedicado a busca por GUID, nome e PropertySet entre S14 e S16.  
**Motivo:** Sem busca, metadados extraídos no S13/S14 ficam inacessíveis em modelos grandes. Custo de não ter: todos os sprints de 5D/4D sofrem com navegação lenta.

### Sprint de Performance e Cache 5D adicionado (S23)
**Decisão:** Sprint dedicado a performance entre Engine 5D (S22) e Painel de Custos (S24).  
**Motivo:** Cálculo de custo em modelos com 50.000+ elementos explode memória e trava o viewer. Resolver antes de construir o painel evita reescrever a UI inteira.

### Observabilidade IFC expandida no S11
**Decisão:** S11 inclui logs estruturados por etapa de parsing, métricas de tempo e rastreamento de falhas por modelo.  
**Motivo:** Quando começarem uploads IFC reais, logs granulares economizam horas de debugging.

### Criados documentos canônicos de visão e negócio
**Decisão:** `documentation/vision.md` e `documentation/business.md` criados como fonte única de verdade.  
**Regra:** Atualizar esses arquivos quando decisões mudarem. Não criar versões paralelas (vision_v2.md, business_final.md, etc.).

---

## 2026-06-08

### Deploy Render restaurado após wipe de variáveis
**Decisão:** Processo de atualização de env vars no Render agora sempre envia lista completa (PUT substitui tudo).  
**Motivo:** `PUT /v1/services/{id}/env-vars` apagou DATABASE_URL e outras 29 variáveis ao enviar apenas 7 vars de R2.

### Backend migrado para `.env.production` da raiz
**Decisão:** `backend/src/index.ts` carrega `.env.production` da raiz do monorepo primeiro, `.env` local como fallback.  
**Motivo:** Centralizar configuração de produção em arquivo único na raiz.

### Pool de testes migrado para `forks`
**Decisão:** `vitest.config.ts` usa `pool: 'forks'` em vez de `threads`.  
**Motivo:** Threads não propagam `process.env` do processo pai para workers, causando falhas de JWT_SECRET em testes isolados.
