# S15 · Busca BIM

**Fase:** Metadados BIM  
**Status:** Pendente  
**Depende de:** S13 (propriedades no banco com índice GIN)  
**Bloqueia:** S20 (takeoff precisa de filtro por tipo), S28 (mapeamento de atividades por código WBS)

---

## Objetivo

Busca por GUID, nome, tipo IFC e valor de PropertySet em < 500ms em modelos de 50.000 elementos.

> **Nota para o agente:** Esta busca **não é só uma feature de UI** — é o motor de seleção que o mapeamento automático de atividades 4D (S28) usa para resolver "todos os `IfcBeam` do 3º pavimento" em conjuntos de elementos. Precisão e determinismo da query importam tanto quanto a velocidade.

---

## Fora de Escopo

Pertencem a sprints futuros ou não fazem parte deste sprint — **não implementar aqui**:

- Elasticsearch / engine de busca externa (Postgres basta agora)
- Busca semântica / linguagem natural
- Mapeamento automático de atividades (S28 consome esta busca)
- Salvamento de buscas como conjuntos nomeados (saved selection sets)
- Busca cross-model / federada (S18+)

---

## Por que importa a longo prazo

Sem busca, o viewer só funciona bem em modelos pequenos onde o usuário encontra elementos manualmente. Em modelos grandes de obras reais (30.000–100.000 elementos), busca é funcionalidade de sobrevivência.

A engine de busca escolhida aqui também alimenta o mapeamento automático de atividades 4D no S28 (mapear "Concretagem de vigas do 3° pavimento" para todos `IfcBeam` no `IfcStorey[2]`). Se a busca for lenta ou imprecisa, o mapeamento automático falha.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Engine | Postgres full-text + GIN index em JSONB | Sem dependência de Elasticsearch no início |
| Busca por GUID | Exact match em `global_id` | Determinístico |
| Busca por nome | `ILIKE '%term%'` + índice trigram | Aceita busca parcial |
| Busca por PropertySet | `properties @> '{"Pset_WallCommon": {"IsExternal": true}}'` | Usa GIN index do S13 |
| Resultado | Máximo 200 elementos por query | Evita OOM no cliente |
| Highlight no viewer | Selecionar resultado destaca elemento | Feedback visual imediato |

---

## Arquivos principais

```
backend/src/modules/search/
  bim-search.service.ts   ← query Postgres com múltiplos critérios
  bim-search.routes.ts    ← GET /models/:id/search?q=...&type=...&pset=...

frontend/src/viewer/
  SearchPanel.ts          ← input + resultados + highlight
```

---

## Query de referência

```sql
SELECT express_id, global_id, ifc_type, name, properties
FROM element_properties
WHERE model_version_id = $1
  AND (
    global_id = $2                                    -- exact GUID
    OR name ILIKE $3                                  -- partial name
    OR ifc_type = $4                                  -- type filter
    OR properties @> $5::jsonb                        -- pset value
  )
LIMIT 200;
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Busca lenta em modelo com 100k elementos | Benchmark com índices antes de habilitar em produção |
| Busca retorna 200 resultados mas cliente renderiza todos de uma vez | Paginação de resultados no painel (25 por página) |
| Busca por JSONB aninhado complexo | Documentar sintaxe suportada, rejeitar queries complexas demais |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Busca por GUID retorna elemento correto em < 100ms
- [ ] Busca por nome parcial (ex.: "pilar") retorna todos os `IfcColumn` com esse nome
- [ ] Busca por PropertySet `IsExternal=true` filtra corretamente
- [ ] Query é determinística (mesma entrada → mesma ordem de resultados) — pré-requisito do S28
- [ ] Resultado destaca elemento no viewer ao clicar
- [ ] Paginação de resultados (25/página), nunca renderiza 200 de uma vez
- [ ] Performance < 500ms em modelo de 50.000 elementos
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
