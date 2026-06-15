# S35 · Immersive 4D: Advanced Construction Simulation & Gantt Synchronization

**Fase:** Planejamento e Simulação (Utopia 4D)  
**Status:** Pendente  
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

- [ ] Importação de arquivos MPP (MS Project) e XER (Primavera) com hierarquia de tarefas completa
- [ ] Auto-mapeamento de elementos BIM vinculando pelo menos 75% das tarefas estruturais básicas automaticamente
- [ ] Simulação visual rodando suave a > 45 FPS alterando as cores e transparências dos elementos com base na timeline
- [ ] Visualização "Planejado vs. Realizado" lado a lado exibindo o desvio físico em vermelho
- [ ] Clique em uma tarefa do Gantt foca a câmera automaticamente nos elementos vinculados no visualizador 3D
