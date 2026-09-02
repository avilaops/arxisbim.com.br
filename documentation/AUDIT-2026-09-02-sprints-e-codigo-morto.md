# Auditoria: sprints declarados x código real, e código morto

**Data:** 02/09/2026
**Método:** alcançabilidade a partir do entrypoint (`src/main.tsx`), conferência
de símbolos e strings no bundle de produção (`dist/`), e busca de referências
cruzadas no backend. Nada aqui vem do que o documento do sprint diz de si mesmo.

---

## 1. O status escrito nos sprints não é confiável

O campo `**Status:**` dos 47 arquivos em `documentation/sprints/` se contradiz:
S19–S21 dizem "✅ ENTREGUE" enquanto S22 e S23, que dependem deles e **têm código
funcionando**, dizem "Pendente". Há `RESULT.md` só até S13, e cinco deles usam um
vocabulário próprio ("Núcleo serializável/desacoplado fechado") que não diz se a
feature chega ao usuário.

Conclusão: o status é anotação de quem passou por ali, não estado do produto.
Para saber o que existe, foi preciso olhar o código.

## 2. O que existe de fato no backend

Verificado por presença de módulo, rota registrada em `src/index.ts` e tabela no
schema. O backend é a parte sadia do projeto: 34 módulos, praticamente tudo que os
sprints S13–S30 prometem tem contrapartida real.

| Sprint | Declara | Backend real |
|---|---|---|
| S13 propriedades | Concluído | sim (`ifc-properties-store.service.ts`) |
| S15 busca BIM | Concluído | sim (módulo `bim-query`, parser próprio) |
| S16 comentários | Concluído | sim (`comments`, schema `element_comments`) |
| S17 compartilhamento | Concluído | sim (`sharing` + `SharedPage.tsx`) |
| S19 custos | ENTREGUE | sim (`costs`, 12 arquivos) |
| S20 takeoff | ENTREGUE | sim (`quantity-extractor.ts`) |
| S21 SINAPI | ENTREGUE | sim (módulo `sinapi`) |
| S22 engine 5D | **Pendente** | **existe** (`cost-calculator.service.ts`) |
| S23 cache 5D | **Pendente** | **existe** (`cost-calculation.routes.ts`) |
| S25 atividades 4D | **Pendente** | **existe** (`scheduling/schedule-tasks`) |
| S26 comparação temporal | **Pendente** | **existe** (`scenario-comparison.routes.ts`) |
| S27 animação 4D | **Pendente** | **existe** (`timeline-simulations`) |
| S29 branching | **Pendente** | **existe** (`scenarios-v12.service.ts`) |
| S30 comparação financeira | **Pendente** | **existe** (`scenario-pdf.service.ts`) |

Ou seja: **sete sprints marcados "Pendente" têm backend pronto.** O trabalho feito
é maior do que o roadmap admite.

## 3. O problema: o frontend não consome quase nada disso

Partindo de `src/main.tsx` e seguindo todo import estático e dinâmico:

```
arquivos alcançáveis:      48
arquivos em src/:         867
NÃO alcançados:           819  (191.713 linhas)
```

**819 de 867 arquivos do frontend não são alcançados pelo build.** Confirmado por
três caminhos independentes:

1. A varredura de imports a partir do entrypoint.
2. O bundle: o código próprio da aplicação são **244 KB** (`pages-*.js`); o resto
   dos 3,6 MB é vendor (web-ifc 2,5 MB, three 608 KB, react 180 KB).
3. Strings que sobrevivem à minificação: `/validador` e `/dashboard` aparecem no
   bundle; `heatmap`, `Heatmap`, `SplitView` e `split-view` **não aparecem**.

Nenhuma das pastas grandes é importada pelas páginas React:

| Pasta | Arquivos órfãos | Linhas |
|---|---|---|
| `shared/` | 136 | 47.130 |
| `features/` | 98 | 25.233 |
| `engine/` | 117 | 16.440 |
| `services/` | 76 | 14.919 |
| `viewer/` | 78 | 13.302 |
| `app/` | 52 | 11.719 |
| `systems/` | 35 | 11.395 |
| `core/` | 40 | 9.428 |
| demais | ~187 | ~42.000 |

O app React de verdade são 22 rotas em `App.tsx` sobre `src/pages/` e alguns
`src/services/` (6 arquivos). Existe um segundo frontend inteiro, escrito em `.ts`
puro (`ViewerHost`, `CostHeatmapSystem`, `ComparisonPage`, `TimelineComparison`),
que ninguém executa.

## 4. O que isso significa para os marcos ★

Os marcos do ROADMAP são de **experiência do usuário**, não de backend:

- **S18 ★ comparação visual**: existe `src/comparison/ComparisonPage.ts` e
  `src/viewer/ComparisonExport.ts`, ambos órfãos. Não há `SplitView` no bundle.
  **O marco não está atingido**, apesar do código escrito.
- **S24 painel de custos**: `CostHeatmapSystem.ts` órfão, `heatmap` ausente do
  bundle. Backend calcula; o usuário não vê.
- **S26 ★ comparação temporal**: rota de backend existe; a UI (`src/timeline/`)
  está órfã.
- **S31 presentation studio**: sem implementação em nenhum dos dois lados.

## 5. Código morto no backend (pequeno, e fácil de remover)

Muito menor que no frontend, mas real, e **vai para produção dentro do `dist`**:

- `src/modules/storage/` (6 arquivos): duplicata abandonada. O app usa
  `src/core/storage/` (com drivers local/S3/R2). Ninguém importa
  `modules/storage/` de fora dele mesmo.
- `src/modules/companies/` (3 arquivos): as rotas vivas são
  `src/routes/v1/companies.ts`, registradas em `index.ts:647`. O módulo é órfão.
- Pares suspeitos que **não** são morte, e sim divisão real (verificados):
  `scenario/` (S12, 20 arq) x `scenarios/` (S29–S30, 8 arq); `costs/` x
  `budgets/`; `ifc/` x `ifc-models/` x `federated-models/`.

## 6. Recomendação

1. **Não escrever mais backend.** Sete sprints já têm backend sem tela.
2. **Decidir o destino das 191 mil linhas órfãs.** Ou o frontend `.ts` volta a ser
   ligado, ou vira `arquivados/`. Hoje ele custa build, `npm ci`, tempo de type-check
   e, principalmente, engana quem lê o repo e conclui que a feature existe.
3. **Corrigir o status dos sprints** a partir desta tabela, não da memória.
4. **Apagar `modules/storage` e `modules/companies`** (removível hoje, sem risco).

