# S05 · Frontend — Onboarding e Dashboard

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01 (auth), S03 (projetos), S04 (billing)  
**Bloqueia:** S09 (viewer precisar de shell de navegação)

---

## Objetivo

Primeiro contato do usuário com o produto. Fluxo de criação de conta → dashboard → upload do primeiro modelo com o menor atrito possível.

> **Nota para o agente:** Este sprint **não deve otimizar para gerenciamento de arquivos.** Deve otimizar para reduzir o tempo entre o cadastro e a percepção de valor do ArxisVR. Toda decisão de UX deve favorecer a chegada do usuário ao primeiro modelo processado com o menor atrito possível.

---

## Fora de Escopo

Pertencem a sprints futuros — **não implementar aqui**:

- Viewer IFC (S09)
- Comparação de cenários (S18, S30)
- Comentários (S16)
- Compartilhamento (S17)
- Dashboard executivo / BI
- Colaboração multiusuário em tempo real
- Notificações em tempo real

---

## Meta de Time-to-Value

Novo usuário deve conseguir:

- criar conta
- criar primeiro projeto
- iniciar primeiro upload

em **menos de 2 minutos, sem documentação e sem suporte.**

(Substitui a métrica vaga de "< 3 cliques" — mensurável e centrada em valor, não em cliques.)

---

## Por que importa a longo prazo

O onboarding define o time-to-value. Cada fricção aqui reduz a conversão de trial para Pro. O shell de navegação criado neste sprint (sidebar, header, rotas) é reutilizado por todos os sprints de frontend até o S32. Mudá-lo depois custa muito.

O empty state deste sprint é o que clientes enterprise veem quando abrem a plataforma pela primeira vez em uma demo. Ele precisa comunicar a tese do produto, não apenas "nenhum projeto encontrado".

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Roteamento | File-based routing via Vite MPA | Já estabelecido no projeto |
| Estado global | Zustand ou Context mínimo | Evitar over-engineering em estado simples |
| Design system | CSS variables + componentes próprios | Sem dependência de Tailwind/MUI |
| Upload UX | Drag-and-drop + botão | Padrão esperado por engenheiros |
| Feedback de erro | Toast global + mensagem inline | Erros críticos inline, informativos em toast |
| Dashboard | Grid de cards com thumbnail gerado no S08 | Placeholder geométrico por enquanto |
| Card de uso do plano | Card lateral: plano, storage, projetos, usuários usados | Reduz suporte; reaproveita `tenant_usage` do S04 |
| Estados de UI | `loading / empty / success / error` obrigatórios em cada tela | Agentes costumam esquecer; sem isso a UX parece quebrada |
| Status do projeto | Componente `ProjectCard` com estados `uploading / processing / ready / failed` | Estado mais comum entre S07 e S11 |
| Recuperação de estado | Após refresh, dashboard recupera estado do upload pelo backend | Zustand sozinho não sobrevive a reload |
| Telemetria de onboarding | Eventos `register_completed`, `project_created`, `upload_started`, `upload_finished` | Sem medição o funil fica cego (pode ser tabela simples, sem PostHog) |

---

## Fluxo de onboarding

```
Landing → Register → (email verify se habilitado) → Dashboard vazio
→ "Crie seu primeiro projeto" → Modal de criação → Dashboard com projeto
→ "Faça upload do seu modelo IFC" → Upload com progresso → Modelo na fila
→ "Modelo processando..." → (S11 processa) → Modelo pronto → Viewer
```

---

## Arquivos principais

```
frontend/src/
  pages/
    dashboard.ts        ← listagem de projetos
    login.ts
    register.ts
    onboarding.ts       ← wizard de primeiro acesso
  components/
    Shell.ts            ← sidebar + header + layout (SÓ layout, ver regra abaixo)
    ProjectCard.ts      ← card com estados uploading/processing/ready/failed
    UsageCard.ts        ← plano + storage/projetos/usuários usados (do tenant_usage)
    UploadZone.ts       ← drag-and-drop com progresso
    EmptyState.ts       ← estado vazio com CTA
    Toast.ts            ← notificações globais
  api/
    projects.ts         ← fetch /projects
    models.ts           ← fetch upload URL
    analytics.ts        ← register_completed, project_created, upload_started/finished
```

### Regra do Shell

`Shell.ts` é **apenas layout**. Não pode importar `projects`, `models`, `billing` nem `scenarios`. Qualquer dado é injetado via children/props — nunca buscado dentro do Shell.

---

## Empty state — copy

```
"Transforme seu modelo BIM em cenários de prazo e custo."
"Faça upload do seu primeiro IFC para começar."
[Botão primário: "Fazer upload de modelo IFC"]
```

O empty state vende **valor (IFC → decisão)**, não a ação de upload. É a primeira coisa que um cliente enterprise vê numa demo — precisa comunicar a tese do produto.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Shell de navegação rígido dificulta mudanças futuras | Componentes atômicos, sem lógica de negócio no Shell |
| Upload progresso desaparece em navegação | Estado de upload global persistido no Zustand |
| Mobile quebra em < 375px | Testar em viewport 360px antes de marcar pronto |

---

## Critérios de aceite

- [ ] Usuário novo cria conta, projeto e inicia upload em < 2 minutos sem instrução
- [ ] Dashboard lista projetos com status (uploading / processing / ready / failed)
- [ ] Cada tela (dashboard, projeto, upload, onboarding) tem estados loading/empty/success/error
- [ ] Card de uso do plano exibe storage/projetos/usuários consumidos
- [ ] Barra de progresso de upload aparece e reflete % real
- [ ] Refresh durante/após upload recupera estado pelo backend (não só Zustand)
- [ ] Empty state comunica valor (IFC → cenários), não apenas "fazer upload"
- [ ] Shell não importa projects/models/billing/scenarios
- [ ] Eventos de funil (register/project/upload) registrados
- [ ] Shell de navegação funciona em mobile (360px) e desktop
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
