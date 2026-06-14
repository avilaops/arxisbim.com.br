# S21 · Importação de Tabela SINAPI

**Fase:** 5D BIM  
**Status:** ✅ ENTREGUE  
**Depende de:** S19 (schema de cost_tables e cost_items)  
**Bloqueia:** S22 (engine usa preços SINAPI para calcular custo total)

---

## Objetivo

Ingestão da base SINAPI (planilha mensal da CEF) por estado e mês, com busca por código ou descrição em < 500ms.

> **Nota para o agente:** SINAPI é o **maior diferencial competitivo no Brasil** (referência obrigatória em obra pública). O ponto não-negociável é o **versionamento por (UF, mês)**: um projeto licitado em jan/2026 deve continuar usando a tabela de jan/2026 para sempre. SINAPI é dado de referência imutável — nunca editável pelo usuário.

---

## Fora de Escopo

Pertencem a sprints futuros — **não implementar aqui**:

- Cálculo de custo (S22)
- BDI / encargos sociais detalhados
- Composição de preços unitários (subitens da composição SINAPI)
- Outras bases (SICRO, ORSE) — schema deve permitir, mas não importar agora
- Atualização automática via scraping da CEF

---

## Por que importa a longo prazo

SINAPI é o maior diferencial competitivo do ArxisVR no Brasil. É o sistema de referência obrigatório para todas as obras públicas federais (Decreto 10.306/2020) e amplamente usado em obras privadas como referência de preço.

A base SINAPI é atualizada mensalmente pela CEF. O sistema precisa suportar múltiplas versões simultâneas (projetos licitados em jan/2026 usam a tabela de jan/2026 mesmo que hoje seja jun/2026). Vincular um projeto a uma versão específica e manter histórico é crítico.

---

## Estrutura da base SINAPI

A CEF distribui SINAPI em planilhas XLSX com:
- Código (ex.: `74209/001`)
- Descrição (ex.: "CONCRETO FCK=25MPA, TRAÇO 1:2,5:3 (CIMENTO/ AREIA MEDIA/ BRITA 1)")
- Unidade (`M3`, `M2`, `UN`, `KG`)
- Preço sem desoneração
- Preço com desoneração
- UF (estado)
- Mês de referência

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Armazenamento | `sinapi_items` tabela separada de `cost_items` | SINAPI é referência, não é editável |
| Versioning | `(state_code, reference_month)` como chave de versão | Múltiplas versões coexistem |
| Import | Upload de XLSX pelo admin + parser no backend | CEF não tem API pública |
| Vínculo | `cost_items.sinapi_item_id` como FK opcional | Permite rastrear qual item SINAPI foi usado |
| Busca | Full-text search em `description` + exact em `code` | Trigram index para busca parcial |
| Preço | Manter ambos (com e sem desoneração), usuário escolhe | Obras públicas usam com desoneração |

---

## Schema

```sql
sinapi_items (
  id              UUID PK,
  code            VARCHAR(20) NOT NULL,
  description     TEXT NOT NULL,
  unit            VARCHAR(10) NOT NULL,
  price_with_tax  DECIMAL(12,4),
  price_without_tax DECIMAL(12,4),
  state_code      VARCHAR(2) NOT NULL,
  reference_month DATE NOT NULL,
  created_at      TIMESTAMP,
  UNIQUE(code, state_code, reference_month)
)

CREATE INDEX ON sinapi_items USING GIN (to_tsvector('portuguese', description));
CREATE INDEX ON sinapi_items (state_code, reference_month);
```

---

## Arquivos principais

```
backend/src/modules/sinapi/
  sinapi-import.service.ts  ← parser XLSX → batch insert
  sinapi-import.routes.ts   ← POST /admin/sinapi/import
  sinapi-search.routes.ts   ← GET /sinapi/search?q=...&state=SP&month=2026-01

frontend/src/
  costs/SINAPISearch.ts     ← busca e seleção de item SINAPI
  admin/SINAPIImport.ts     ← tela de import para admin
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| CEF muda formato do XLSX sem aviso | Parser com validação de colunas + alerta se formato inesperado |
| Import de 50k linhas lento | Batch insert de 1000 linhas por transaction |
| Código SINAPI não encontrado | Permitir item customizado sem código SINAPI |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [x] Upload de planilha SINAPI (XLSX) importa sem erro
- [x] Parser valida colunas e alerta se o formato da CEF mudou (não importa lixo silenciosamente)
- [x] Busca por código exato retorna item correto em < 100ms
- [x] Busca por descrição parcial (full-text português) retorna relevantes em < 500ms
- [x] Duas versões do mesmo código (meses diferentes) coexistem sem conflito
- [x] Preço com e sem desoneração ambos preservados em DECIMAL(12,4)
- [x] Vínculo de item SINAPI a `cost_item` (FK opcional) pronto para S22
- [x] Build e lint passam
- [x] E2E tests cobrindo import, busca, versionamento
