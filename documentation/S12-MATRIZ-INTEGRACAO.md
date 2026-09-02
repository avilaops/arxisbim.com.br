# S12 ★ — Matriz de integração

**Levantado em:** 02/09/2026, antes de escrever qualquer linha.
**Regra:** primeiro achar o que já existe. Só depois decidir o que escrever.

**Meta do marco:** o usuário consegue fazer, na aplicação publicada:

```
Modelo base → Criar Cenário → Alterar estado → Salvar → Alternar A/B → Reabrir e continuar
```

---

## Backend: pronto (não escrever nada aqui)

Registrado em `src/index.ts:673` (`scenarioRoutes`, prefixo `/api/v1`).
Módulo `src/modules/scenario/` (20 arquivos), serviço `scenarios-v12.service.ts`.

| Precisa | Endpoint | Estado |
|---|---|---|
| criar | `POST /api/v1/scenarios` (body: `projectId`, `name`) | ✅ |
| listar | `GET /api/v1/scenarios?projectId&limit&offset` | ✅ |
| ler | `GET /api/v1/scenarios/:id` | ✅ |
| salvar estado | `POST /api/v1/scenarios/:id/update` | ✅ |
| renomear | `PATCH /api/v1/scenarios/:id` | ✅ |
| apagar | `DELETE /api/v1/scenarios/:id` | ✅ |

**Persistência:** tabela `scenarios`. O estado do viewer vai na **coluna**
`scenarios.scenario_state` (jsonb), com `camera`, `player`, `config` e
`state_version` ao lado. Atenção: `scenario_state` é coluna, **não** tabela.

### Cuidado: há dois CRUDs de cenário

`modules/scenario/` (S12) e `modules/scenarios/` (S29–S30) estão os dois
registrados e atendem **a mesma tabela** por caminhos diferentes:

- S12: `/api/v1/scenarios` — plano, sem projeto na URL.
- S29: `/api/v1/projects/:projectId/scenarios` — aninhado, mais `fork`,
  `merge`, `diff`, `financial`, `pdf`.

**Para o S12, usar o plano** (`/api/v1/scenarios`). O aninhado é do S29/S30.
Não são duplicata a remover: são camadas distintas, mas a coexistência
confunde. Unificar é assunto do S29, não deste sprint.

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
| service de cenários | ☐ | `src/services/scenarios.service.ts`, no padrão dos vivos (`dashboard.service.ts`, 33 linhas: `fetch` + `buildApiV1Url` + Bearer do `localStorage`) |
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
