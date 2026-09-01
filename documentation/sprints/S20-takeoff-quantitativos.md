# S20 · Takeoff Automático de Quantitativos

**Fase:** 5D BIM  
**Status:** ✅ ENTREGUE  
**Depende de:** S13 (propriedades no banco), S14 (tipos mapeados), S19 (schema de costs)  
**Bloqueia:** S22 (engine usa quantitativos para calcular custo)

---

## Objetivo

Extrair automaticamente área, volume, comprimento e contagem de cada elemento IFC e vincular ao schema de custos do S19.

> **Nota para o agente:** A **precisão do takeoff é a confiança no produto**, engenheiros validarão contra planilhas manuais. Cada quantidade deve carregar sua **fonte** (Qto_ Pset / Pset proprietário / cálculo geométrico) e um indicador de confiança, para que o cliente saiba o que é medido e o que é estimado. Nunca zerar silenciosamente um elemento sem quantidade.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Cálculo de custo (S22 multiplica quantidade × preço)
- Importação SINAPI (S21)
- Painel/heatmap de custo (S24)
- Comparação financeira (S30)
- Curva S / distribuição temporal de custo (S25+)

---

## Por que importa a longo prazo

A precisão do takeoff determina a confiança do cliente no produto. Um desvio de 5% num orçamento de R$ 10M é R$ 500k. Engenheiros de custos experientes validarão o takeoff do ArxisVR contra planilhas manuais antes de confiar.

O desafio técnico está na normalização: diferentes ferramentas BIM exportam unidades e nomes de PropertySets de forma inconsistente. Um pilar exportado do Revit tem `BaseQuantities.GrossVolume`, do ArchiCAD tem `Qto_ColumnBaseQuantities.GrossVolume`, e de algumas ferramentas apenas como vértices sem propriedade explícita. A engine de takeoff precisa entender todas essas variações.

---

## Hierarquia de fonte de quantidade

```
1. Qto_*BaseQuantities (IFC standard), mais confiável
2. BaseQuantities Pset proprietário (Revit, ArchiCAD)
3. Cálculo geométrico direto (fallback, calcular de vértices)
```

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Fonte | Qto_* Psets primeiro, geometria como fallback | IFC Psets são mais precisos que cálculo de mesh |
| Unidades | Normalizar para m, m², m³ | SINAPI usa SI |
| Agrupamento | Por `ifc_type` + `storey_id` | Quantitativo por pavimento |
| Persistência | Preencher `element_cost_links.quantity` automaticamente | Vincula diretamente ao schema do S19 |
| Revisão manual | Usuário pode editar quantidade de qualquer elemento | Override rastreado |
| Fonte da quantidade | Cada `element_cost_link` registra `quantity_source` + `confidence` | Cliente distingue medido de estimado |
| Execução | Em background, reusa pipeline S11 (não bloqueia request) | Modelos de 50k elementos |
| Export | XLSX com colunas: elemento, tipo, pavimento, qtd, unidade, fonte | Formato padrão de orçamento, auditável |

---

## Mapeamento IFC Type → quantidade principal

```typescript
const QUANTITY_MAP: Record<string, { pset: string; field: string; unit: string }> = {
  IfcWall:       { pset: 'Qto_WallBaseQuantities',    field: 'GrossArea',   unit: 'm²' },
  IfcSlab:       { pset: 'Qto_SlabBaseQuantities',    field: 'GrossArea',   unit: 'm²' },
  IfcColumn:     { pset: 'Qto_ColumnBaseQuantities',  field: 'GrossVolume', unit: 'm³' },
  IfcBeam:       { pset: 'Qto_BeamBaseQuantities',    field: 'GrossVolume', unit: 'm³' },
  IfcDoor:       { pset: 'Qto_DoorBaseQuantities',    field: 'Count',       unit: 'un' },
  IfcWindow:     { pset: 'Qto_WindowBaseQuantities',  field: 'Count',       unit: 'un' },
  IfcPipeFitting:{ pset: 'Qto_PipeFittingBaseQuantities', field: 'Length',  unit: 'm'  },
}
```

---

## Arquivos principais

```
backend/src/modules/costs/
  takeoff.service.ts      ← extrai quantitativos, popula element_cost_links
  takeoff.routes.ts       ← POST /scenarios/:id/takeoff (trigger manual)
  quantity-extractor.ts   ← lógica de Pset lookup + fallback geométrico

frontend/src/
  costs/TakeoffTable.ts   ← tabela de quantitativos com export XLSX
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Modelo sem Qto_* Psets (BIM de baixa qualidade) | Fallback para cálculo geométrico + aviso de confiança |
| Unidades inconsistentes entre elementos do mesmo modelo | Normalizar no extrator, logar inconsistências |
| Takeoff demorado em modelo de 50k elementos | Processar em background (reusa pipeline S11) |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [x] Tabela de quantitativos gerada em < 30s para modelo de 10k elementos
- [x] Agrupamento por tipo e pavimento correto
- [x] `area_m2` de uma parede corresponde ao valor do Revit com desvio < 2%
- [x] Cada quantidade registra fonte (Qto_ / Pset proprietário / geométrico) e confiança
- [x] Elementos sem Psets geométricos recebem cálculo de fallback (não ficam zerados)
- [x] Export JSON preparado para Excel com unidades e coluna de fonte
- [x] Build e lint passam
- [x] E2E tests cobrindo extração, fallback, summary grouping
