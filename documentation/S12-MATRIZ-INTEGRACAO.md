# S12 ★ — Matriz de integração

**Levantado em:** 02/09/2026, antes de escrever qualquer linha.
**Regra:** primeiro achar o que já existe. Só depois decidir o que escrever.

**Meta do marco:** o usuário consegue fazer, na aplicação publicada:

```
Modelo base → Criar Cenário → Alterar estado → Salvar → Alternar A/B → Reabrir e continuar
```

---

## Backend: pronto (não escrever nada aqui)

> **Corrigido em 02/09/2026.** A primeira versão desta matriz mandava usar o
> CRUD plano `/api/v1/scenarios`. **Estava errado**, e o erro só apareceu ao ler
> os schemas antes de escrever a UI. Pelo CRUD plano **não é possível salvar o
> estado do viewer**. O texto abaixo é a versão conferida.

### Há dois CRUDs de cenário, e só um serve

Os dois estão registrados e atendem **a mesma tabela** `scenarios`:

| | CRUD plano | CRUD aninhado |
|---|---|---|
| Módulo | `modules/scenario/` | `modules/scenarios/` |
| Rota | `/api/v1/scenarios` | `/api/v1/projects/:projectId/scenarios` |
| Registro | `src/index.ts:673` | `src/index.ts:686` |
| Aceita câmera? | **não** | **sim** (`camera`, `player`, `metadata`) |
| Serve ao S12? | **não** | **sim** |

**Por que o plano não serve**, apesar do nome `scenarios-v12.service.ts`:

- `PATCH /scenarios/:id` aceita `name`, `description` e `config`, e esse
  `config` é **fechado por zod** (`scenarioConfigSchema`: `movementSpeed`,
  `rotationSpeed`, `crouchMultiplier`, `minimapConfig`...). Não há campo para
  câmera nem para visibilidade.
- `POST /scenarios/:id/update`, apesar do nome, é **tick de game loop**: o body
  é `{ deltaTime }` e o handler é `controller.updatePosition`. Não é "salvar".

**Portanto o S12 usa o CRUD aninhado.** Isso **não** é puxar o S29 para dentro
do sprint: usa-se só `create`, `list`, `get` e `update`. `fork`, `merge`,
`diff`, `financial` e `pdf` continuam fora, e são S29/S30.

| Precisa | Endpoint | Estado |
|---|---|---|
| criar | `POST /api/v1/projects/:projectId/scenarios` | ✅ |
| listar | `GET /api/v1/projects/:projectId/scenarios` | ✅ |
| ler | `GET /api/v1/projects/:projectId/scenarios/:scenarioId` | ✅ |
| salvar estado | `PUT /api/v1/projects/:projectId/scenarios/:scenarioId` | ✅ |
| apagar | `DELETE /api/v1/projects/:projectId/scenarios/:scenarioId` | ✅ |

**Persistência:** tabela `scenarios`. As colunas `camera`, `player` e
`metadata` são **jsonb livres**, então guardamos a câmera em `camera` e a
visibilidade em `metadata.hidden`.

Duas pegadinhas do contrato:

1. `create` **exige** `camera`, `player` e `config` (400 sem eles), mesmo que o
   S12 não use `player` nem `config`. Vão preenchidos com o mínimo.
2. O `update` é `PUT` e **sobrescreve** os campos que recebe: mandar só
   `camera` apagaria o `name`. Manda-se o conjunto.

A coluna `scenarios.scenario_state` existe (jsonb, `not null default {}`) e o
nome engana: é **coluna, não tabela**. Nenhum dos dois CRUDs a expõe por HTTP,
então ela **não** é o caminho do S12.

---

## Frontend órfão: existe, mas não serve como está

Tudo abaixo está fora do build (`AUDIT-2026-09-02`), e é `.ts` puro com DOM
manual (`class`, `HTMLElement`, `innerHTML`), **zero React**. O app vivo é
React com `.tsx`.

| Arquivo | Linhas | Classe | O que fazer |
|---|---|---|---|
| `src/api/v1/services/scenarios.service.ts` | — | **reutilizável** | Client HTTP puro (`create`, `list`, `getById`, `update`, `delete`, `fork`, `merge`, `getDiff`). Não tem DOM. **Aproveitar quase inteiro.** |
| `src/scenarios/ScenarioBranchPanel.ts` | 13.5 KB | adaptável | Lógica de branching aproveitável; UI reescrita em React. É S29, não S12. |
| `src/scenarios/ScenarioDiffView.ts` | 11.3 KB | adaptável | Serve ao S18. |
| `src/comparison/ScenarioPicker.ts` | — | adaptável | Seleção A/B: a lógica interessa ao S12. |
| `src/comparison/ComparisonPage.ts` | — | adaptável | S18. |
| `src/viewer/CameraState.ts` | — | **reutilizável** | Serialização de câmera, que é metade do `scenario_state`. |
| `src/viewer/ElementStateRenderer.ts` | — | adaptável | Aplicar estado (oculto/modificado) ao viewer. |

**Nada aqui deve ser apagado antes do S12/S18 terminarem.** Duas peças
(`scenarios.service.ts` e `CameraState.ts`) entram quase sem alteração.

---

## Frontend vivo: é aqui que falta tudo

App real: 21 rotas em `src/App.tsx` sobre `src/pages/`. O viewer é
`/app` → `Viewer3DPage.tsx` (356 linhas), com `ViewerCanvas`,
`ViewerToolbar`, `ViewerPropertiesPanel` e `ProjectModelsPanel`.
A toolbar tem quatro botões: projetos, redefinir, tela cheia, informações.

| Item | Estado | Onde entra |
|---|---|---|
| service de cenários | ✅ **feito** | `src/services/scenarios.service.ts`, no padrão dos vivos (`fetch` + `buildApiV1Url` + Bearer do `localStorage`). Compila. Ainda **não** provado contra a API. |
| botão "Criar cenário" | ☐ | `ViewerToolbar.tsx` |
| lista/seletor de cenários | ☐ | painel novo, no molde de `ProjectModelsPanel` |
| capturar estado do viewer | ☐ | `ViewerCanvas` precisa expor câmera + visibilidade |
| salvar (`/update`) | ☐ | ação da toolbar |
| alternar A/B | ☐ | seletor + reaplicar estado no canvas |
| reabrir e continuar | ☐ | carregar `scenario_state` ao abrir |

---

## O caminho a provar (Definition of Done do marco)

```
rota/tela → ação do usuário → API → persistência → retorno visual
```

Concretamente: `/app` → botão "Criar cenário" → `POST /api/v1/scenarios` →
linha em `scenarios` → o cenário aparece no seletor; mover a câmera, salvar,
trocar para B, voltar para A e a câmera volta onde estava; recarregar a
página e continuar.

**Prova exigida:** browser real na aplicação publicada, não teste de API.

---

## Estimativa honesta

O backend é 100% do que o S12 pede. O trabalho é de frontend e cabe em
um arquivo de service, um painel, dois botões e a ponte de estado com o
`ViewerCanvas`. O risco não está na API, está em `ViewerCanvas` expor (e
reaplicar) câmera e visibilidade, que é o que hoje não existe no app vivo.

**Confirmado ao abrir o arquivo (02/09):** em `ViewerCanvas.tsx` (303 linhas) a
câmera, os `OrbitControls` e a cena são criados **dentro de um `useEffect`** e
nada sai dele. Não há `ref`, `forwardRef` nem `useImperativeHandle`. A ponte é
o próximo passo, e é a única parte invasiva do sprint.
