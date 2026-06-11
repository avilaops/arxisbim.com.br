# S13 · Extração de Propriedades IFC

**Fase:** Metadados BIM  
**Status:** Pendente  
**Depende de:** S07 (parser estrutura), S11 (pipeline assíncrono)  
**Bloqueia:** S15 (busca BIM), S20 (quantitativos dependem de propriedades)

---

## Objetivo

Extrair e persistir todos os PropertySets de cada elemento IFC. Painel lateral mostra propriedades ao clicar.

---

## Por que importa a longo prazo

As propriedades IFC são a fonte dos quantitativos do S20 (área, volume, comprimento). Se a extração for imprecisa ou incompleta aqui, o cálculo 5D do S22 será incorreto — e erros de orçamento são os mais visíveis para o cliente.

O schema de armazenamento de propriedades precisa suportar busca eficiente (S15) sem exigir JOIN em N tabelas para cada query. Armazenar como JSONB indexado é a escolha correta para escalar.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Armazenamento | `element_properties` tabela com `JSONB properties` | Flexível + indexável |
| Índice | GIN index em `properties` JSONB | Busca por chave/valor eficiente |
| Extração | Durante pipeline S11 (nova etapa `extract_properties`) | Evitar re-parse |
| Normalização de unidades | Detectar e converter mm → m, in → m | IFC exportados de diferentes países têm unidades diferentes |
| PropertySets customizados | Incluídos sem filtro | Psets proprietários (Revit, ArchiCAD) têm valor para cliente |
| Dados geométricos | `area`, `volume`, `length` extraídos como campos indexados separados | Queries de quantitativo rápidas |

---

## Schema

```sql
element_properties (
  id               UUID PK,
  model_version_id UUID FK model_versions NOT NULL,
  express_id       INT NOT NULL,
  global_id        VARCHAR(22) NOT NULL,
  ifc_type         VARCHAR(100),
  name             VARCHAR(500),
  storey_id        INT,

  -- Quantidades indexadas (extraídas de Qto_* Psets)
  area_m2          DECIMAL(12,4),
  volume_m3        DECIMAL(12,4),
  length_m         DECIMAL(12,4),

  -- Todos os psets como JSONB
  properties       JSONB NOT NULL,  -- { "Pset_WallCommon": { "IsExternal": true, ... } }

  created_at       TIMESTAMP
)

CREATE INDEX ON element_properties USING GIN (properties);
CREATE INDEX ON element_properties (model_version_id, ifc_type);
CREATE INDEX ON element_properties (model_version_id, storey_id);
```

---

## Arquivos principais

```
backend/src/modules/ifc/
  ifc-properties.extractor.ts   ← web-ifc getAllPropertiesOfType
  ifc-properties.service.ts     ← persiste no banco em batch

backend/src/modules/models/
  element-properties.routes.ts  ← GET /elements/:expressId/properties

frontend/src/viewer/
  PropertiesPanel.ts            ← painel lateral com PropertySets
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Modelo com 50k elementos → 50k rows em batch insert | Inserir em batches de 1000 com transaction |
| PropertySet com valor `null` ou tipo inesperado | Normalizar para string no JSONB, nunca throw |
| Unidade não reconhecida | Logar e manter valor bruto sem conversão |

---

## Critérios de aceite

- [ ] Clique em qualquer elemento abre painel com todos seus PropertySets
- [ ] `Pset_WallCommon`, `Qto_WallBaseQuantities` e Psets customizados aparecem
- [ ] `area_m2`, `volume_m3`, `length_m` preenchidos quando disponíveis
- [ ] Props exportáveis como CSV por elemento ou por tipo
- [ ] Extração de 50k elementos completa em < 60s no pipeline S11
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
