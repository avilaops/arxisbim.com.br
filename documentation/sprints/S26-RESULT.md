# S26-RESULT · Primeira Comparação Temporal de Cenários

> Artefato de memória pós-execução. Cada afirmação aqui é checável (diff, build, teste).

**Sprint:** S26 · comparação temporal (4D)
**Status:** Parcial — código entregue e no bundle; **marco ★ ainda não caiu**, falta a prova em browser na aplicação publicada.
**Data:** 2026-09-19
**Branch:** `claude/stoic-heisenberg-vjdtw4`

---

## Objetivo (entregue?)

O sprint pedia régua de data animando a obra, split A|B com dois cronogramas e
delta de prazo. Tudo isso existe agora e é alcançável por um fluxo de usuário.
O que **não** está feito é o critério que fecha um sprint ★: abrir a aplicação
publicada, montar dois cronogramas diferentes e provar a diferença de prazo na
tela, com recarga de página. Sem essa prova o marco continua zerado — foi
exatamente o erro que a auditoria de 02/09 apontou, e repeti-lo aqui seria
mentir para o próximo agente.

O diagnóstico de `PENDENCIAS.md` §3.1 estava certo: **o buraco não era o diff
nem o slider, era a entrada de dados.** O backend 4D estava inteiro desde o S25
e as quatro tabelas tinham 0 linhas em produção porque não havia tela para criar
cronograma. É essa tela que abre a cadeia.

## Arquivos alterados

**Backend** (o mínimo: o resto já existia)

- `backend/src/modules/scheduling/activities.routes.ts` — `POST /activities/:id/predecessors`
  e `DELETE /activities/:id/predecessors/:predecessorId`. Até aqui
  `activity_predecessors` só era escrita pelo importador de MSP/P6: quem montava
  cronograma na tela não conseguia encadear nada, e o CPM ficava sem relação para
  propagar. Recusa auto-referência (400), predecessora de outro cronograma (404)
  e ciclo (409, por busca em profundidade nas predecessoras).
- `backend/src/modules/scheduling/schedule-cpm.service.ts` (novo) — carrega um
  cronograma e devolve as atividades com as datas do forward pass. O código saiu
  de dentro de `scenario-comparison.routes.ts`, onde só a comparação A×B
  alcançava.
- `backend/src/modules/scheduling/scenario-comparison.routes.ts` — passa a usar o
  serviço acima (menos 90 linhas de leitura duplicada) e ganha
  `GET /schedules/:scheduleId/cpm`, que é o que a régua do viewer consome.

**Frontend**

- `frontend/src/services/schedules.service.ts` (novo) — cliente do módulo
  `scheduling`: cronogramas por cenário, atividades, vínculo de elementos em
  lote, predecessoras e comparação temporal.
- `frontend/src/components/viewer/estado4d.ts` (novo) — a fatia pura: janela do
  cronograma, estado de cada GlobalId numa data (`nao_iniciado` / `ativo` /
  `concluido`), resumo e datas em UTC. Sem three, sem DOM, sem rede.
- `frontend/src/components/viewer/visibilidadeIfc.ts` — `mapearGlobalIds`,
  `expressIdsDe`, `globalIdsDe`, `idsDosTipos`. É a ponte que faltava: o 4D
  vincula por **GlobalId** e o viewer só conhecia **expressID**.
- `frontend/src/components/viewer/CronogramaPanel.tsx` (novo) — a tela que não
  existia: cria cronograma do cenário, lança atividades com datas editáveis,
  vincula categoria IFC e encadeia predecessoras.
- `frontend/src/components/viewer/ReguaTempo.tsx` (novo) — slider de data com
  play/pausa e velocidade, em React. A lógica veio do órfão
  `src/timeline/TimelineSlider.ts` (DOM manual), como o `CameraSync` no S18.
- `frontend/src/components/viewer/ViewerCanvas.tsx` — handle ganha
  `globalIdsDasCategorias` e `aplicar4d`; a visibilidade passou a ter um caminho
  único de desenho (`renderizar`), que soma o que o cenário esconde ao que a data
  ainda não construiu.
- `frontend/src/components/viewer/ViewerToolbar.tsx`, `frontend/src/pages/Viewer3DPage.tsx` — botão e fiação.
- `frontend/src/components/comparison/ComparisonCanvas.tsx` — cada lado do split
  publica como se repintar; uma data pinta os dois ao mesmo tempo, cada um pelo
  **seu** cronograma.
- `frontend/src/pages/ComparePage.tsx` — modo "Comparar prazo": datas de conclusão
  dos dois lados, `deltaDays` e a régua. `?prazo=1&data=YYYY-MM-DD` na URL.
- `frontend/src/styles/viewer.css` — gaveta do cronograma, régua e painel de prazo.
- `frontend/src/components/viewer/__tests__/estado4d.test.ts` (novo) — 16 testes.

## Migrations adicionadas

Nenhuma. As tabelas (`schedules`, `activities`, `activity_predecessors`,
`activity_elements`) existem desde o S25.

## Critérios de aceite: passou?

| Critério (do doc de sprint) | Resultado | Evidência |
|---|---|---|
| Slider de data muda estado visual dos elementos | ✅ código | `ReguaTempo` + `ViewerHandle.aplicar4d`; não iniciado sai de cena, em obra ganha amarelo, concluído fica normal |
| Split A|B mostra dois cronogramas com datas diferentes | ✅ código | `ComparisonCanvas` repinta cada lado com `estadosNaData(atividades do lado, data)` |
| Data de conclusão por cenário | ✅ código | `completionDate` do CPM, exibida no painel de prazo |
| Atraso propaga para sucessoras (forward pass) | ✅ código | `CPMService` já existia; o que faltava era criar a predecessora — agora há rota e seletor na tela |
| Delta de prazo em dias | ✅ código | `deltaDays` no painel, com o sinal explicado ("a mais em B") |
| Build e lint passam | ✅ | ver abaixo |
| **Prova em browser na aplicação publicada** | ❌ **pendente** | exige deploy (`./deploy/deploy.sh api && ./deploy/deploy.sh web`) e sessão real; não foi feito nesta execução |

## Testes executados

```
npm run typecheck (frontend)   → exit 0
npm run type-check (backend)   → exit 0
npm run build (frontend)       → exit 0 (código do S26 presente em dist/assets/pages-*.js)
npx vitest run src/components/viewer/__tests__/estado4d.test.ts
  → Test Files 1 passed (1) · Tests 16 passed (16)
```

Suíte completa do frontend continua com as mesmas 3 falhas de antes desta
entrega (`@testing-library/react` não instalado, em testes de componentes
órfãos). Nenhuma é do S26.

## Limitações conhecidas

- **O marco não caiu.** Falta a prova em browser, e sem ela o S26 ★ segue zerado
  no ROADMAP.
- **Vínculo é por categoria IFC inteira.** Escolher "Paredes" vincula todas as
  paredes do modelo. Seleção elemento a elemento exigiria estado de seleção no
  viewer, que ainda não existe.
- **Um cronograma por cenário.** A tela usa o mais recente, igual à rota de
  comparação. Dois cronogramas no mesmo cenário tornariam a comparação ambígua.
- **Com a régua ligada, o destaque do split deixa de mostrar a diferença de
  categoria do S18** e passa a mostrar o que está em obra. É um destaque só por
  modelo; são duas perguntas distintas e a legenda diz qual está na tela.
- **`mapearGlobalIds` lê as propriedades do modelo** (uma chamada por tipo IFC,
  ~24). Só roda quando o 4D é usado, mas em modelo muito grande a primeira
  ligada da régua tem espera.
- **Sem backward pass, sem folga, sem caminho crítico destacado** — são S27+, e
  ficaram fora de propósito.

## Decisões arquiteturais alteradas

- O doc previa o CPM apenas dentro da comparação. Na prática a régua do viewer
  precisa do mesmo cálculo, senão encadear atividades não moveria nada na tela.
  Daí `schedule-cpm.service.ts` e `GET /schedules/:id/cpm` — extração, não
  duplicação.
- O doc citava `elementStateAtDate(expressID, date)`. O estado é resolvido por
  **GlobalId** e traduzido para expressID só na hora de desenhar: expressID é
  índice de arquivo e muda quando o IFC é reexportado.
- A régua repinta com 120 ms de atraso. É a mitigação do risco "slider recalcula
  a cada pixel" que o próprio doc do sprint listava.

## Riscos para o próximo sprint

- O S27 (animação 4D completa) herda `ReguaTempo` e `estado4d`; o que falta lá é
  caminho crítico e câmera que acompanha.
- O S30 (comparação financeira) usa duração por cenário: `completionDate` e
  `deltaDays` já vêm prontos de `calcularCronogramaDoCenario`.

## Passos de rollback

Reverter o commit. Não há migration nem dado migrado; cronogramas criados por
usuários permanecem no banco e voltam a ficar inalcançáveis pela interface, que
é o estado anterior.

## Notas de demo

1. `/app`: abrir modelo IFC, criar cenário **A** em *Cenários*.
2. *Cronograma 4D* → criar cronograma → lançar "Fundação" (10 dias, categoria
   Fundações) e "Estrutura" (20 dias, categoria Pilares), com *Depende de:
   Fundação*.
3. Ligar a régua e arrastar: a fundação some antes de começar, fica amarela em
   obra e volta ao normal concluída; a estrutura só entra depois.
4. Criar o cenário **B**, repetir com a fundação 15 dias mais longa.
5. `/app/compare` → escolher A e B → *Comparar prazo*: as duas conclusões e o
   delta em dias aparecem; a régua move os dois lados juntos; recarregar a
   página mantém data e par (`?a=&b=&split=1&prazo=1&data=`).
