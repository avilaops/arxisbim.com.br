# S02 · Upload e Storage de Arquivos

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01 (tenant isolado para segregar arquivos)  
**Bloqueia:** S03, S07 (modelos IFC precisam de storage antes de serem processados)

---

## Objetivo

Pipeline de upload seguro com storage abstrato. O app não deve saber se o storage é R2, S3 ou local.

---

## Por que importa a longo prazo

A abstração de driver escolhida aqui determina se você consegue trocar R2 por S3 ou usar storage local em testes sem reescrever código. Sem essa abstração, cada sprint que faz upload (IFC, SINAPI, cronograma) acopla diretamente ao provedor.

Arquivos IFC podem chegar a 2 GB (modelos federados de grandes obras). O design de URL assinada precisa suportar uploads multipart desde o início, ou o S11 (processamento assíncrono) vai exigir reescrita completa.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Abstração | `StorageDriver` interface com `local` e `r2` | Troca sem alterar business logic |
| Upload direto | Presigned URL para upload direto do browser ao R2 | Backend não recebe o arquivo em memória |
| Multipart | Suporte a arquivos > 100 MB via multipart S3 | IFC grandes são comuns |
| Segregação | Chave `{tenantId}/{projectId}/{modelId}/{filename}` | Isolamento sem RLS no storage |
| Expiração de URL | Download: 1h · Upload: 15 min | Upload curto reduz janela de abuso |
| Validação | Tipo MIME + extensão no backend antes de gerar URL | Não confiar no browser |

---

## Arquivos principais

```
backend/src/shared/storage/
  storage.driver.ts     ← interface StorageDriver
  local.driver.ts       ← salva em /tmp para dev e testes
  r2.driver.ts          ← Cloudflare R2 via AWS SDK v3
  storage.service.ts    ← fachada: getDriver() por env

backend/src/modules/models/
  models.routes.ts      ← POST /projects/:id/models/upload-url
  models.service.ts     ← gera presigned URL, registra no banco

backend/tests/e2e/
  storage.spec.ts       ← upload local + validação de tipo
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| CORS no R2 bloqueando upload do browser | Configurar CORS no bucket antes do primeiro teste |
| Arquivo grande esgota memória se passar pelo backend | Forçar presigned URL — nunca pipe pelo servidor |
| URL assinada vazada em log | Mascarar URLs com `***` em todos os loggers |

---

## Critérios de aceite

- [ ] Upload de IFC < 500 MB via presigned URL completa sem erro
- [ ] Upload de IFC > 100 MB usa multipart
- [ ] URL de download expira após 1h (teste com sleep ou mock de data)
- [ ] Arquivo de outro tenant não acessível mesmo com URL construída manualmente
- [ ] Tipo inválido (ex.: `.exe`) retorna 400 com mensagem clara
- [ ] Driver `local` funciona sem credenciais de nuvem (para testes)
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
