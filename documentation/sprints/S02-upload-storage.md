# S02 · Upload e Storage de Arquivos

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01 (tenant isolado para segregar arquivos)  
**Bloqueia:** S03, S07 (modelos IFC precisam de storage antes de serem processados)

---

## Objetivo

Pipeline de upload seguro com storage abstrato. O app não deve saber se o storage é R2, S3 ou local.

O módulo nasce **genérico**: serve IFC, SINAPI, MS Project, PDFs e exports. IFC é apenas o primeiro caso de teste, não o escopo do módulo.

---

## Fora de Escopo

Pertencem a sprints futuros — **não implementar neste sprint**:

- Versionamento de arquivos (S03 modela `model_version`)
- Antivírus / scanning de conteúdo
- OCR
- Compressão automática
- CDN pública
- Compartilhamento externo (S17)
- Upload resumable customizado (multipart S3 nativo basta)
- Deduplicação de arquivos (o SHA-256 só é armazenado, não desduplica ainda)

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
| Multipart | Acima de `MULTIPART_THRESHOLD_MB` (default 100) via multipart S3 | Limite configurável; threshold muda com o tempo |
| Segregação | Chave `{tenantId}/{projectId}/{modelId}/{filename}` | Isolamento sem RLS no storage; `tenantId` é obrigatório na chave |
| Integridade | SHA-256 calculado e armazenado após upload | Detecta corrupção, upload duplicado, valida processamento, habilita cache futuro |
| Expiração de URL | Download: 1h · Upload: 15 min | Upload curto reduz janela de abuso |
| Validação | Tipo MIME + extensão no backend antes de gerar URL | Não confiar no browser |
| Ciclo de vida | Registro nasce `pending`, vira `uploaded` ao confirmar | Uploads não confirmados expiram e são limpos |

---

## Arquivos principais

```
backend/src/shared/storage/
  storage.driver.ts     ← interface StorageDriver
  local.driver.ts       ← salva em /tmp para dev e testes
  r2.driver.ts          ← Cloudflare R2 via AWS SDK v3
  storage.service.ts    ← fachada: getDriver() por env

backend/src/modules/models/
  models.routes.ts      ← POST /projects/:id/models/upload-url, POST .../confirm
  models.service.ts     ← gera presigned URL, registra no banco, confirma upload

backend/db/schema/
  files.ts              ← tabela de metadados de arquivos (ver abaixo)

backend/tests/e2e/
  storage.spec.ts       ← upload local + validação de tipo + isolamento de chave
```

---

## Schema de metadados (`files`)

Toda gravação no storage tem registro persistido — necessário para o S11 (processamento assíncrono) saber o estado de cada arquivo:

```sql
files (
  id          UUID PK,
  tenant_id   UUID FK tenants NOT NULL,   -- obrigatório, parte da chave física
  project_id  UUID FK projects,
  storage_key VARCHAR(512) NOT NULL,      -- {tenantId}/{projectId}/{modelId}/{filename}
  mime_type   VARCHAR(127),
  size_bytes  BIGINT,
  sha256      CHAR(64),                   -- preenchido após upload confirmado
  status      VARCHAR(20) DEFAULT 'pending', -- pending | uploaded | processing | processed | failed
  created_at  TIMESTAMP,
  uploaded_at TIMESTAMP
)
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| CORS no R2 bloqueando upload do browser | Configurar CORS no bucket antes do primeiro teste |
| Arquivo grande esgota memória se passar pelo backend | Forçar presigned URL — nunca pipe pelo servidor |
| URL assinada vazada em log | Mascarar URLs com `***` em todos os loggers |
| Uploads órfãos acumulam custo no storage (browser fechado, multipart abandonado) | Registro nasce `pending`; job de limpeza posterior remove `pending` expirados e aborta multipart inacabado. Reconhecido aqui, implementado depois |

---

## Critérios de aceite

- [ ] Upload de arquivo suportado < 500 MB via presigned URL completa sem erro (IFC como caso de teste)
- [ ] Upload acima de `MULTIPART_THRESHOLD_MB` usa multipart
- [ ] SHA-256 calculado e persistido em `files.sha256` após confirmação do upload
- [ ] Registro nasce `pending` e só vira `uploaded` na confirmação
- [ ] Chave física do storage contém `tenantId` obrigatoriamente
- [ ] URL de download expira após 1h (teste com sleep ou mock de data)
- [ ] Arquivo de outro tenant não acessível mesmo com URL construída manualmente
- [ ] Tipo inválido (ex.: `.exe`) retorna 400 com mensagem clara
- [ ] Driver `local` funciona sem credenciais de nuvem (para testes)
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
