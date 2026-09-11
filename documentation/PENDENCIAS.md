# ArxisVR — o que falta executar

**Levantado em:** 04/09/2026, conferindo servidor, repo e produção.
**Atualizado em:** 11/09/2026 — migração operacional fechada; S26 levantado (item 3.1).
**Estado:** produção no ar (`/`, `/app`, API, todos 200). S12 ★ atingido.

---

## 1. O que NÃO está mais pendente (conferido hoje)

Três coisas que a documentação antiga ainda listava como abertas, e não são:

- **`MP_WEBHOOK_SECRET`**: está **preenchido** no `/opt/arxisvr/.env`. O
  endpoint responde: `POST /api/v1/billing/webhook` com corpo inválido devolve
  **400** (rejeita a assinatura), não 404 nem 500. A memória e o
  `AUDIT-2026-09-01` dizem que estava vazio; não está mais.
- **Saída do Docker**: medida, recusada e revertida. Infra congelada.
- **Módulos mortos do backend**: removidos.

## 2. Aberto, por ordem de valor

### 2.1 ~~S18 ★ — comparação visual~~ — ATINGIDO 09/09/2026 (estado real de cenário)

> Marco provado em 04/09 (split + câmera sincronizada). Em 08/09 entraram
> exportar imagem e A/B na URL (reload). Falta só "diferenças destacadas", que
> depende de os cenários poderem diferir em visibilidade (fatia do S10): ver
> `S18-PROVA-BROWSER.md`, "O que continua fora". O texto abaixo é o
> levantamento original.


O mais valioso, e o mais barato agora que o S12 caiu: **já existe cenário salvo
de verdade para comparar**.

O que já existe:
- **Backend pronto**: `GET /api/v1/scenarios/:idA/diff/:idB` registrado
  (`scenarios.routes.ts:30`), mais `compare/:idB/financial` e `/pdf` (esses dois
  são S30, não entram aqui).
- **Frontend órfão para aproveitar**: `src/comparison/ComparisonPage.ts` (11 KB)
  e `src/comparison/ScenarioPicker.ts` (3 KB). São `.ts` com DOM manual, então a
  lógica serve e a UI é reescrita em React, como foi no S12.

O que falta: rota/tela de comparação, o `SplitView` com dois viewports e câmera
sincronizada, e a prova em browser real (critério de sprint ★).

**Atenção ao escopo:** o S18 é comparação **visual**. `financial` e `pdf` são
S30 e ficam de fora, como `fork`/`merge` ficaram fora do S12.

### 2.2 As 191 mil linhas órfãs do frontend

819 de 867 arquivos não entram no build. A decisão de classificar antes de
arquivar se provou certa: o S12 aproveitou duas peças, e o S18 vai aproveitar
mais duas. Fazer **depois** do S18, quando se souber o que sobrou.

Classificação combinada: reutilizável / adaptável / duplicado / arquitetura
antiga / morto.

### 2.3 Onze arquivos com alteração não commitada

`git status` mostra 11 arquivos modificados que **não são meus**: trocam
`/app.html`, `/login.html`, `/join.html` e `/billing.html` pelas rotas do SPA
(`/app`, `/login`, `/join`, `/account?tab=billing`). A mudança está **certa** —
são os mesmos `.html` do app antigo que quebravam recuperação de senha e convite
— mas todos os 11 estão em `src/app/` e `src/features/`, que são **órfãos**.

Ou seja: correção correta em código que não roda. Decidir junto com 2.2.

### 2.4 ~~Nove erros de `type-check` no backend~~ — RESOLVIDO 07/09/2026

Zerados em `21bd9f4`, com portão em `a3b1e1b`. **Nenhum era ruído de tipagem:
dois eram defeito real.**

- `StorageError` não aceitava `INVALID_ARGUMENT`, que é o código com que o
  driver local recusa path traversal. O tipo previa só três códigos.
- O pipeline de IFC gravava `status` e `error` **dentro do jsonb `metadata`**,
  que não tem esses campos — enquanto a tabela `ifc_models` tem as colunas
  `status`, `processing_error`, `processing_started_at` e
  `processing_completed_at` desde a migration 053. O estado do processamento ia
  para um lugar que ninguém lê (`grep -rn "metadata.status"` não acha um
  consumidor), e as colunas que o resto do sistema consulta ficavam paradas.
  `started_at` e `completed_at` **nunca** eram preenchidos.

O resto era `.buffer` de `Buffer` do Node (tipado `ArrayBuffer |
SharedArrayBuffer`) indo onde só cabe `ArrayBuffer`.

**O portão, para não voltar:** `npm run conferir` no backend (type-check + build)
e o `deploy.sh` conferindo tipos **antes de empacotar**. Provado com um erro
introduzido de propósito: o deploy parou sem abrir SSH. Válvula de escape para
incidente: `ARXISVR_SEM_CONFERIR=1`.

**Frontend, 08/09/2026:** `tsc` não rodava (`ignoreDeprecations` inválido) e o
`include` cobria os ~800 órfãos (1.890 erros). Agora `npm run typecheck` cobre
o grafo de `src/main.tsx` com **0 erros** e `deploy-aplicacoes.sh web` roda o
type-check antes de empacotar, com a mesma válvula. Detalhe em
`DEBITO-2026-09-08-app-autenticado.md`.

### 2.5 CI não roda

A conta do GitHub está bloqueada por billing, então **nenhum Actions executa** e
o deploy é manual (`./deploy/deploy.sh [api|web]`). Não é problema técnico: é
decisão de negócio (pagar ou migrar). Enquanto durar, todo deploy é manual e
todo teste roda na máquina de quem desenvolve.

### 2.6 Storage no driver `local`

As chaves do R2 se perderam. Os IFCs enviados vivem no volume
`arxisvr_uploads`. Funciona, mas não sobrevive a perder o servidor, e não há
backup do volume (decisão consciente: sem venda, sem backup).

---

## 3. Armadilhas de operação já conhecidas

Estão espalhadas pelos commits; ficam juntas aqui:

- **Deploy de site exige `--force-recreate`**: trocar o `dist` sob um container
  já de pé devolve 404, porque ele mantém a referência antiga do bind mount.
- **O modelo IFC não vem selecionado** ao abrir `/app`: só monta a cena depois
  do clique na lista.
- **PG18 mudou o ponto de montagem**: volume em `/var/lib/postgresql`, não
  `/var/lib/postgresql/data`. Rollback exige desfazer a tag **e** o mount.
- **`docker exec` com "container breakout detected"** é a sessão SSH com o cwd
  apagado, não o container.
- **Conta de teste nova** precisa de `email_verified = true` (a coluna booleana,
  não só `email_verified_at`), e upload de IFC exige o campo `discipline`.

---

## 3.1 S26 ★ (comparação temporal): o que existe de verdade (conferido 11/09/2026)

**Backend:** registrado e vivo. `schedules` (por projeto, opcionalmente por
cenário), `activities` (planned_start/end, duração gerada), `activity_predecessors`
(FS/SS/FF/SF, lag), `activity_elements` (por **GlobalId**), `cpm.service`
(forward pass, data de conclusão) e `GET /scenarios/:a/:b/timeline-comparison`
(carrega os dois cronogramas, roda CPM, devolve atividades com early start/finish
e `deltaDays`). Rotas de criar cronograma e atividade existem (`POST
/projects/:id/schedules`, `POST /schedules/:id/activities`, `.../elements`).

**Frontend órfão:** `src/timeline/` (1.119 linhas, com testes): `TimelineSlider`,
`AnimationController`, `ElementStateResolver` (not_started/active/complete por
data), `TimelineComparison` (lê exatamente a rota acima e usa o `SplitView`
órfão). DOM manual, como o `CameraSync` que o S18 aproveitou.

**Produção:** `schedules`, `activities`, `predecessors`, `activity_elements`:
**0 linhas cada**. Nenhum usuário consegue criar um cronograma: não há tela.

**O buraco, portanto, não é o diff nem o slider: é a entrada de dados.** Sem
cronograma não há o que comparar. E há um descasamento a resolver antes: o 4D
vincula elemento por **GlobalId** (IFC) e o viewer vivo só conhece
**expressID** (subsets do web-ifc-three); o `web-ifc` dá o GlobalId a partir do
expressID (`getItemProperties`), mas isso ainda não é lido em lugar nenhum vivo.

**Caminho mínimo para o ★ (sem backend novo):** (1) tela de cronograma por
cenário com atividades e datas, gravando nas rotas existentes; (2) vínculo
atividade → categoria IFC (o que o viewer já sabe) traduzido para GlobalIds no
salvamento; (3) slider de data no viewer (do órfão), colorindo por estado;
(4) A|B com `deltaDays` e conclusão de cada lado, sobre o `ComparisonCanvas`
do S18; (5) prova em produção: dois cenários com cronogramas diferentes, o
split mostra a diferença de prazo, reload mantém.

## 4. Recomendação

**S18 ★ caiu (04/09) e foi completado (08/09).** O texto original: era o próximo marco, tinha peça órfã para aproveitar
(`comparison/ComparisonPage.ts`, `ScenarioPicker.ts`) e cenário salvo de verdade
para comparar. O resto é dívida sem urgência ou decisão de negócio (2.5).

**Atenção, achado de 07/09:** o `GET /scenarios/:idA/diff/:idB` **não serve ao
S18**. Ele devolve `{ schedule, cost }` — prazo e custo, que são S26 e S30. Não
existe endpoint de diff **visual/geométrico**. Como os cenários já trazem
`camera` e `metadata.hidden`, que é tudo o que o SplitView precisa, a comparação
visual se faz **no cliente**. Escrever backend novo repetiria o erro que a
auditoria apontou.
