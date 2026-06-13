# Runbook · Rollback de Deploy (S06)

**Meta:** reverter um deploy quebrado em **< 2 minutos**.
**Escopo:** backend (Render) e frontend (Cloudflare Pages).
**Critério de aceite S06:** rollback executado com sucesso em staging em < 2 min.

> ⚠️ **Status: PROCEDIMENTO DOCUMENTADO, EXECUÇÃO EM STAGING PENDENTE.**
> O ensaio real está bloqueado pelo deploy manual no Render (billing). Rollback
> só é confiável **depois de executado** — agendar ensaio assim que o billing
> destravar. Até lá, este runbook é hipótese, não garantia.

---

## Quando fazer rollback (gatilhos)

Reverter imediatamente, sem investigar primeiro, se após um deploy:

- `/health/ready` retorna 503 por > 60s (Postgres **ou** storage down)
- Taxa de 5xx > 1% (meta error budget S06)
- `auth_failures` dispara em massa (token/secret quebrado no deploy)
- Tempo médio de API > 500ms sustentado

Investigar **depois** de restaurar o serviço. Rollback primeiro.

---

## Backend (Render)

1. [Render Dashboard](https://dashboard.render.com) → service `arxisvr-backend` → aba **Events** (ou **Deploys**).
2. Localizar o último deploy **healthy** (verde, anterior ao que quebrou).
3. **Rollback** → confirmar. Render reusa a imagem já buildada → ~30–60s.
4. Validar: `curl https://<backend>/health/ready` → `200 { ready: true }`.

### Armadilhas (verificar ANTES de assumir que reverteu)

| Risco | Checagem |
|---|---|
| **Migration irreversível** | Rollback do código **não** desfaz migration já aplicada. Se o deploy rodou uma migration destrutiva, o código antigo pode quebrar contra o schema novo. Ver `runMigrations()` — migrations são forward-only. Mitigar: migration aditiva, nunca destrutiva no mesmo deploy. |
| **Env vars mudaram** | Se o deploy quebrado alterou env vars, o rollback do código **não** reverte env. Conferir/reverter manualmente em Environment. |
| **Build cache inválido** | Se o rollback re-buildar, cache pode estar sujo. Preferir rollback que reusa imagem, não rebuild. |
| **Frontend incompatível** | Backend antigo + frontend novo = contrato de API divergente. Reverter **os dois** (ver abaixo). |

---

## Frontend (Cloudflare Pages)

1. Cloudflare Dashboard → Pages → projeto → **Deployments**.
2. Deploy healthy anterior → **⋯ → Rollback to this deployment**. Instantâneo (CDN swap).
3. Validar carregamento + chamada autenticada real ao backend.

---

## Ordem em incompatibilidade backend↔frontend

Reverter **backend primeiro**, depois frontend — o frontend tolera backend mais
novo melhor do que o contrário. Se o quebrado foi só frontend, reverter só ele.

---

## Ensaio em staging (pendente — fechar critério de aceite)

Quando o billing destravar:

1. Deploy proposital quebrado em staging (ex.: throw no boot).
2. Cronometrar do gatilho até `/health/ready` 200 de novo.
3. Registrar tempo real aqui. **Alvo < 2 min.**
4. Confirmar que as armadilhas acima foram observadas, não só o caminho feliz.

| Data | Quem | Tempo | Resultado |
|---|---|---|---|
| _pendente_ | | | |
