# S35 · Immersive 4D: Advanced Construction Simulation & Gantt Synchronization

**Fase:** Planejamento e Simulação (Utopia 4D)  
**Status:** Entregue (2026-06-15)  
**Depende de:** S34 (Processamento de Geometria)  
**Bloqueia:** S36 (Inteligência 5D & Estimativa IA)

---

## Objetivo

Criar um motor de simulação temporal 4D de alto nível. Permitir o mapeamento avançado e automático entre tarefas de cronograma (MS Project/Primavera) e elementos geométricos BIM. Construir uma interface de controle de simulação interativa (Gantt interativo + Timeline de reprodução 3D) com visualização em tempo real de status da obra (planejado vs. realizado), coloração automática de elementos por estado físico, e relatórios dinâmicos de curva S vinculados à seleção visual de blocos de obra.

---

## Fora de Escopo

- Ferramentas completas de edição/criação manual de tarefas de cronograma (foco em importação, mapeamento e simulação).
- Integração com sensores de IoT em tempo real para atualização automatizada de status físico de execução.

---

## Por que importa a longo prazo

Um dos maiores problemas em construções de grande escala é o desalinhamento entre o cronograma do escritório e o progresso real no canteiro de obras. O motor 4D definitivo permite simular visualmente a evolução da obra semana a semana, identificar gargalos de logística (ex: conflitos de espaço no canteiro) e apontar visualmente quais andares ou blocos estão com a execução física em atraso através de códigos de cor intuitivos (Planejado: Translúcido; Em Execução: Amarelo; Atrasado: Vermelho; Concluído: Sólido).

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Motor de Simulação | Motor de interpolação temporal rodando em Web Worker | Evita gargalos na Main Thread do visualizador enquanto calcula estados de milhares de elementos |
| Vinculo Elemento-Tarefa | Auto-matching baseado em heurísticas textuais de descrição (Regex + Similaridade de String) | Associa automaticamente elementos (ex: vigas do 3º pavimento) às tarefas do Project com > 80% de precisão |
| Modos de Visualização | Planejado vs. Realizado lado a lado (Viewports divididas) | Permite comparação imediata do desvio de tempo da obra |
| Cores de Estado | Shader customizado no WebGL/WebGPU | Colore elementos dinamicamente sem recarregar geometrias ou alocar novas texturas |
| Controle de Timeline | Play/Pause/Speed Slider + Sincronização de cursor bidirecional Gantt-Visualizador | UX intuitiva semelhante a players de vídeo |

---

## Estrutura de dados

```typescript
type TaskStatusType = 'not_started' | 'in_progress' | 'completed' | 'delayed';

interface ConstructionTask {
  id: string;
  wbs_code: string;           // Estrutura Analítica do Projeto (EAP)
  name: string;
  start_date_planned: string;
  end_date_planned: string;
  start_date_actual?: string;
  end_date_actual?: string;
  percent_complete: number;
  linked_element_ids: number[]; // IDs IFC associados a esta tarefa
}

interface TimelineState {
  current_time: string;       // Data simulada atual
  play_speed: number;         // Multiplicador (ex: 1 dia por segundo)
  is_playing: boolean;
}
```

---

## Arquivos principais

```
backend/src/modules/scheduling/
  schedule-matcher.service.ts  ← Algoritmos de associação inteligente entre tarefas e elementos BIM
  schedule.routes.ts           ← GET/POST para cronogramas e importadores MSP/Primavera

frontend/src/viewer/scheduling/
  SimulationEngine.ts          ← Calcula o estado de cada elemento 3D baseado no tempo simulado
  GanttTimeline.tsx            ← Gráfico de Gantt interativo sincronizado com o visualizador 3D
  SimulationControls.tsx       ← Painel com Play/Pause/Timeline slider/Speed
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Mapeamento manual de milhares de elementos BIM exaustivo para o usuário | Algoritmo inteligente de auto-mapeamento com feedback visual de validação (elementos mapeados vs. órfãos) |
| Performance lenta ao atualizar o estado de milhares de elementos a cada frame da simulação | Usar buffers de estado na GPU e alterar cores via instanciamento ou atributos de vértice em lote |
| Inconsistências de datas em importadores externos (fusos horários distintos) | Normalizar todas as datas para formato UTC ISO8601 direto no backend durante a importação |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [x] Importação de arquivos MPP (MS Project XML) e XER (Primavera) com hierarquia de tarefas completa — `schedule-import.service.ts` (parseMSPXml/parseP6Xer)
- [x] Auto-mapeamento de elementos BIM vinculando pelo menos 75% das tarefas estruturais básicas automaticamente — `schedule-matcher.service.ts` + `POST /schedules/:id/auto-match` (tipo IFC + pavimento + similaridade de nome)
- [x] Simulação visual alterando cores/transparências dos elementos com base na timeline — `SimulationEngine` + `ElementStateRenderer` (troca de material em lote sobre malhas em cache; estados not_started/active/delayed/complete)
- [x] Visualização "Planejado vs. Realizado" lado a lado — `mountSchedule4DSplit` reusa `SplitView` (scissor + stateRendererA/B + camera sync): viewport esquerdo = modo `planned`, direito = `actual` (desvio em vermelho via `delayed`); legendas Planejado/Realizado
- [x] Clique em uma tarefa do Gantt foca a câmera nos elementos vinculados — `GanttTimeline.onTaskClick` → `Schedule4DController.focusOnElements` (esfera envolvente combinada via ElementIndex)

## Implementação

**Backend** (`backend/src/modules/scheduling/`)
- `schedule-matcher.service.ts` — motor puro de auto-mapeamento (dicionário PT→IFC, extração de pavimento, Jaccard+Levenshtein). 16 testes (`tests/unit/schedule-matcher.spec.ts`).
- `scheduling.routes.ts` — rota `POST /api/v1/schedules/:scheduleId/auto-match` (threshold/maxElementsPerActivity/persist).

**Frontend** (`frontend/src/viewer/scheduling/`)
- `SimulationEngine.ts` — estado físico por elemento na data simulada, modos planejado×realizado, detecção de atraso.
- `GanttTimeline.ts` — Gantt interativo (barras planejada/realizada, cursor, clique→câmera/seek).
- `SimulationControls.ts` — play/pause/velocidade/início/fim + toggle Planejado×Realizado.
- `Schedule4DController.ts` — orquestrador timeline→engine→renderer+gantt; foco de câmera por esfera combinada.
- `mountSchedule4D.ts` — wiring ponta-a-ponta (busca tarefas via API, liga TimelineController + componentes + cena).
- `mountSchedule4DSplit.ts` — comparação Planejado×Realizado lado a lado sobre o `SplitView` (computeSplitFrames puro injeta os 2 mapas a cada data).
- `viewer4dBridge.ts` — cola com a UI: lookup globalId→esfera a partir da cena, foco de câmera, overlay (controles+Gantt), legendas split e hooks globais `window.__startSchedule4D` / `__startSchedule4DSplit`.
- `ElementStateRenderer.ts` — estado/cor `delayed` (vermelho) adicionado.
- `api/v1/services/scheduling.service.ts` — `getConstructionTasks` / `autoMatch`.
- CSS em `styles/app.css` (`.gantt-timeline`, `.sim-controls`, `.schedule-4d-overlay`).

**Integração na UI:** botões por cronograma no `SchedulingPanel.js` → "🎬 Simular 4D" (`window.__startSchedule4D`) e "⇆ Planejado×Realizado" (`window.__startSchedule4DSplit`), registrados em `app-main.ts`. Rodam auto-match, abrem overlay com Gantt+controles sobre o viewer e aplicam as cores na cena (modo único ou split lado a lado).

**Verificação ao vivo (Render, autenticado):** login → criar projeto → criar cronograma → importar CSV (4 atividades persistidas) → `GET /schedules/:id` → `POST /schedules/:id/auto-match` (HTTP 200, MatchResult íntegro) → limpeza. O matching real com elementos (≥75%) é coberto pelo e2e `schedule-automatch-routes.spec.ts`, que semeia `models`/`model_versions`/`element_properties`/atividades em Postgres e valida pela rota real: globalIds corretos, órfãos/não-mapeados, `matchRate ≥ 0.75`, `persist` gravando `activity_elements` de forma idempotente.

Total S35: **67 testes** (16 unit backend + 3 e2e backend + 48 frontend), type-check limpo nos arquivos do sprint.
